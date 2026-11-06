import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { readSource } from "@/utils/comicStudio/source";

let pendingQr: Promise<string> | undefined;
let qrExpiresAt = 0;
async function loginResponse(action: string) {
  if (action !== "qrcode") {
    const raw = await readSource("http://127.0.0.1:18060/api/v1/login/status");
    if (JSON.parse(raw)?.data?.is_logged_in) { pendingQr = undefined; qrExpiresAt = 0; }
    return raw;
  }
  // Repeated clicks/windows must reuse the active QR; upstream replaces the previous login session on every request.
  if (!pendingQr || Date.now() >= qrExpiresAt) {
    qrExpiresAt = Date.now() + 240000;
    pendingQr = readSource("http://127.0.0.1:18060/api/v1/login/qrcode").then(raw => {
      const duration = JSON.parse(raw)?.data?.timeout;
      const seconds = typeof duration === "string" && /^\d+(?:\.\d+)?s$/.test(duration) ? parseFloat(duration) : 240;
      qrExpiresAt = Date.now() + Math.min(240, Math.max(1, seconds)) * 1000;
      return raw;
    }).catch(error => { pendingQr = undefined; qrExpiresAt = 0; throw error; });
  }
  return pendingQr;
}

export default Router().get("/", validateFields({ action: z.enum(["status", "qrcode"]) }, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("登录仅允许本机调用"), { status: 403 });
  try {
    const health = await fetch("http://127.0.0.1:18060/health", { signal: AbortSignal.timeout(1500), redirect: "error" });
    const result = z.object({ data: z.object({ service: z.literal("xiaohongshu-mcp") }) }).safeParse(await health.json());
    if (!health.ok || !result.success) throw new Error();
  } catch {
    if (req.query.action === "status") {
      res.set("Cache-Control", "no-store").json(success({ available: false, loggedIn: false, image: "", timeout: "" }));
      return;
    }
    throw Object.assign(new Error("搜索服务未就绪，请点击“连接小红书”启动"), { status: 503 });
  }
  const raw = JSON.parse(await loginResponse(String(req.query.action)));
  const parsed = z
    .object({
      success: z.literal(true),
      data: z.object({ is_logged_in: z.boolean(), img: z.string().max(3000000).optional(), timeout: z.string().optional() }),
    })
    .safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("小红书登录服务响应异常"), { status: 502 });
  const data = parsed.data.data;
  if (data.img && !/^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(data.img))
    throw Object.assign(new Error("登录二维码格式异常"), { status: 502 });
  res.set("Cache-Control", "no-store").json(success({ available: true, loggedIn: data.is_logged_in, image: data.img || "", timeout: data.img ? `${Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000))}s` : data.timeout || "" }));
});
