const rules = [
  { type: "input", field: "baseUrl", title: "API 地址（例如 https://服务地址/v1）", value: "" },
  { type: "input", field: "apiKey", title: "API 密钥", value: "", props: { type: "password", showPassword: true } },
  { type: "input", field: "modelId", title: "图片模型 ID（由供应商提供）", value: "" },
  { type: "input", field: "size", title: "输出尺寸（须为模型支持的值）", value: "1024x1536" },
];
export default {
  id: "imageApi", label: "在线图片 API · 兼容 Images 接口", icon: "", version: "1.0.0",
  readme: "填写你已有服务的地址、密钥和图片模型ID。接口须支持 /images/generations；使用参考图还需支持 multipart /images/edits。不是聊天补全接口；不含免费额度，也不会自动购买或调用。",
  rules,
  models: [{ id: "configured", label: "在线 API · 已配置图片模型", type: "image" as const, mode: ["text", "multiReference"] as ImageMode[] }],
  async generateImage(this: ProviderContext<Record<string, unknown>>, request: ImageRequest): Promise<MediaAsset[]> {
    const root = new URL(String(this.config.baseUrl || ""));
    if (root.username || root.password || root.search || root.hash || (root.protocol !== "https:" && !(root.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(root.hostname)))) throw new Error("请使用不含账号或查询参数的 HTTPS API 地址；HTTP 仅限本机服务");
    const key = String(this.config.apiKey || "").trim();
    const model = String(this.config.modelId || "").trim();
    if (!key || !model) throw new Error("请先填写图片 API 密钥和图片模型 ID");
    const images = request.images || [];
    if (images.length > 12) throw new Error("本次参考图超过12张，请减少后重试");
    const base = root.href.replace(/\/+$/, "");
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    let body: string | FormData;
    if (images.length) {
      const form = new FormData();
      form.set("model", model); form.set("prompt", request.prompt); form.set("n", "1"); form.set("size", String(this.config.size || "1024x1536"));
      for (const [index, image] of images.entries()) {
        if (image.type === "url") throw new Error("参考图请先导入本机素材库");
        const bytes = image.type === "binary" ? image.data : Uint8Array.from(atob(image.data), (value) => value.charCodeAt(0));
        if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("参考图超过15MB");
        form.append("image[]", new Blob([bytes as Uint8Array<ArrayBuffer>], { type: image.mimeType }), `reference${index}.${image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/webp" ? "webp" : "png"}`);
      }
      body = form;
    } else { headers["Content-Type"] = "application/json"; body = JSON.stringify({ model, prompt: request.prompt, n: 1, size: this.config.size || "1024x1536" }); }
    const response = await this.tool.fetch(`${base}/images/${images.length ? "edits" : "generations"}`, { method: "POST", headers, body, signal: this.signal, redirect: "error" });
    if (!response.ok) throw new Error(`图片 API 返回 HTTP ${response.status}；请检查余额、密钥、图片模型ID、尺寸及参考图接口支持情况`);
    const result = await response.json() as { data?: { b64_json?: string; url?: string }[] };
    const image = result.data?.[0];
    if (image?.b64_json && image.b64_json.length <= 22 * 1024 * 1024) return [{ type: "base64", data: image.b64_json, mimeType: "image/png", mediaType: "image" }];
    if (image?.url && new URL(image.url).protocol === "https:") return [{ type: "url", url: image.url, mediaType: "image" }];
    throw new Error("图片 API 没有返回受支持的图片；已保留原作品");
  },
} satisfies ProviderDefinition;
