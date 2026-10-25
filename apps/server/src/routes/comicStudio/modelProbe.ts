import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { createStructured } from "@/utils/comicStudio/plan";

const inputSchema = z.object({
  mode: z.enum(["codex", "api"]),
  providerId: z.string().max(200).optional(),
  modelId: z.string().max(500).optional(),
  codexModel: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/).optional(),
});

export default Router().post("/", validateFields(inputSchema.shape), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机检测模型连接"), { status: 403 });
  const input = inputSchema.parse(req.body);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  res.once("close", cancel);
  req.once("aborted", cancel);
  const started = Date.now();
  try {
    const output = await createStructured(
      z.strictObject({ message: z.string().min(1).max(100) }),
      '这是用户发起的连接检测。只返回 JSON：{"message":"文本生成连接成功"}。',
      input.mode, input.providerId, input.modelId,
      AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]), input.codexModel, "low",
    );
    res.json(success({ message: output.message, elapsedMs: Date.now() - started, checkedAt: new Date().toISOString() }));
  } finally {
    res.off("close", cancel);
    req.off("aborted", cancel);
  }
});
