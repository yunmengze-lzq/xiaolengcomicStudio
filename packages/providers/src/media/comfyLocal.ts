const rules = [
    { type: "inputNumber", field: "port", title: "本机端口", value: 8188, props: { min: 1024, max: 65535 } },
    { type: "input", field: "workflow", title: "API 格式工作流 JSON", value: "", props: { type: "textarea", rows: 10 } },
    { type: "input", field: "promptNodeId", title: "正向提示词节点 ID", value: "6" },
    { type: "input", field: "sizeNodeId", title: "宽高尺寸节点 ID（输出768×1024）", value: "5" },
    { type: "input", field: "imageNodeIds", title: "参考图 LoadImage 节点 ID（按顺序，逗号分隔）", value: "" },
  ];
const comfyLocal = {
  id: "comfyLocal",
  label: "本地 ComfyUI",
  icon: "",
  version: "1.0.0",
  readme: "连接本机已启动的 ComfyUI，不使用云端 API Key。先在 ComfyUI 完成并验证工作流，再导出 API 格式 JSON。填写正向提示词节点 ID；如漫画包含角色与上一格参考图，必须按顺序配置足够的 LoadImage 节点 ID，软件不会静默忽略参考图。模型、显存与自定义节点由本机 ComfyUI 管理。",
  rules,
  models: [{ id: "workflow", label: "ComfyUI 已配置工作流", type: "image" as const, mode: ["text", "multiReference"] as ImageMode[], imageRatios: ["3:4"] }],
  async generateImage(this: ProviderContext<Record<string, unknown>>, request: ImageRequest): Promise<MediaAsset[]> {
    const port = Number(this.config.port || 8188);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("本地 ComfyUI 端口无效");
    const root = `http://127.0.0.1:${port}`;
    const workflow = JSON.parse(String(this.config.workflow || "{}")) as Record<string, { inputs: Record<string, unknown> }>;
    const promptId = String(this.config.promptNodeId || "6");
    if (!workflow[promptId]?.inputs || typeof workflow[promptId].inputs.text !== "string") throw new Error("工作流缺少指定的正向文本节点，请使用 API 格式 JSON 并检查节点 ID");
    const nodeIds = String(this.config.imageNodeIds || "").split(",").map((item) => item.trim()).filter(Boolean);
    const images = request.images || [];
    if (images.length > nodeIds.length) throw new Error(`本次有 ${images.length} 张参考图，但工作流只配置 ${nodeIds.length} 个参考节点；请补齐，或选择支持多参考的模型`);
    for (let index = 0; index < images.length; index++) {
      const node = workflow[nodeIds[index]!];
      if (!node?.inputs || typeof node.inputs.image !== "string") throw new Error("参考节点必须是带 image 输入的 LoadImage 节点");
      const input = images[index]!;
      if (input.type === "url") throw new Error("本地工作流只接受项目内图片参考");
      const bytes = input.type === "binary" ? input.data : Uint8Array.from(atob(input.data), (value) => value.charCodeAt(0));
      if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("参考图超过15MB");
      const form = new FormData();
      form.append("image", new Blob([bytes as Uint8Array<ArrayBuffer>], { type: input.mimeType }), `comic${crypto.randomUUID()}.png`);
      const response = await this.tool.fetch(`${root}/upload/image`, { method: "POST", body: form, signal: this.signal, redirect: "error" });
      if (!response.ok) throw new Error("向本地 ComfyUI 上传参考图失败");
      const uploaded = await response.json() as { name?: string; subfolder?: string };
      if (!uploaded.name) throw new Error("ComfyUI 未返回参考图名称");
      node.inputs.image = [uploaded.subfolder, uploaded.name].filter(Boolean).join("/");
    }
    const sizeNode = workflow[String(this.config.sizeNodeId || "5")];
    if (!sizeNode?.inputs || typeof sizeNode.inputs.width !== "number" || typeof sizeNode.inputs.height !== "number") throw new Error("尺寸节点必须包含 width 和 height 数值输入，请检查工作流节点ID");
    sizeNode.inputs.width = 768;
    sizeNode.inputs.height = 1024;
    workflow[promptId]!.inputs.text = request.prompt;
    const submitted = await this.tool.fetch(`${root}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: crypto.randomUUID() }), signal: this.signal, redirect: "error" });
    const job = await submitted.json() as { prompt_id?: string };
    if (!submitted.ok || !job.prompt_id || !/^[a-zA-Z0-9-]+$/.test(job.prompt_id)) throw new Error("ComfyUI 拒绝工作流，请先在本机检查模型和节点");
    const started = Date.now();
    while (Date.now() - started < 240000) {
      this.signal?.throwIfAborted();
      const response = await this.tool.fetch(`${root}/history/${job.prompt_id}`, { signal: this.signal, redirect: "error" });
      if (!response.ok) throw new Error("ComfyUI 任务状态读取失败");
      const history = await response.json() as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }> }>;
      const item = history[job.prompt_id];
      if (item?.status?.status_str === "error") throw new Error("本地 ComfyUI 工作流执行失败，请查看本机控制台");
      const output = Object.values(item?.outputs || {}).flatMap((value) => value.images || [])[0];
      if (output) {
        if (/[\\/]/.test(output.filename) || !["output", "temp"].includes(output.type)) throw new Error("ComfyUI 返回的图片位置无效");
        const image = await this.tool.fetch(`${root}/view?${new URLSearchParams(output)}`, { signal: this.signal, redirect: "error" });
        if (!image.ok) throw new Error("ComfyUI 输出图片读取失败");
        const mimeType = image.headers.get("content-type")?.split(";")[0] || "";
        if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) throw new Error("ComfyUI 返回的不是支持的图片格式");
        const bytes = new Uint8Array(await image.arrayBuffer());
        if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("本地输出图片超过15MB，请降低工作流分辨率");
        return [{ type: "binary", data: bytes, mimeType, mediaType: "image" }];
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("本地工作流等待超时；任务可能仍在 ComfyUI 队列中，请在本机检查后再重试");
  },
} satisfies ProviderDefinition;
export default comfyLocal;
