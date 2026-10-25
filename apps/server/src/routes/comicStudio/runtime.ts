import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
const inputSchema = z.object({ service: z.enum(["ollama", "lmStudio", "comfy"]), port: z.coerce.number().int().min(1024).max(65535) });
export default Router().get("/", validateFields(inputSchema.shape, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机检测模型服务"), { status: 403 });
  const input = inputSchema.parse(req.query);
  const paths = { ollama: "/api/tags", lmStudio: "/v1/models", comfy: "/system_stats" };
  try {
    const response = await fetch(`http://127.0.0.1:${input.port}${paths[input.service]}`, { signal: AbortSignal.timeout(3000), redirect: "error" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    const models = input.service === "ollama" ? z.object({ models: z.array(z.object({ name: z.string().max(500) })).max(500) }).parse(data).models.map((item) => item.name) : input.service === "lmStudio" ? z.object({ data: z.array(z.object({ id: z.string().max(500) })).max(500) }).parse(data).data.map((item) => item.id) : [];
    if (input.service === "comfy") z.object({ system: z.object({}).passthrough() }).parse(data);
    res.json(success({ available: true, models, message: input.service === "comfy" ? "ComfyUI 服务可访问；生成还需在生图模型中配置工作流" : models.length ? `已发现 ${models.length} 个本地模型` : "服务可访问，但尚未加载模型" }));
  } catch {
    res.json(success({ available: false, models: [], message: `未在本机端口 ${input.port} 检测到可用的 ${input.service} 服务` }));
  }
});
