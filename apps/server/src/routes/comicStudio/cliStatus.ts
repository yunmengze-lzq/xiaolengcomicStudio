import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { codexCommand } from "@/utils/comicStudio/codexCommand";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
export default Router().get("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机查看文字服务状态"), { status: 403 });
  try {
    const { binary, environment: env } = await codexCommand();
    const version = await promisify(execFile)(binary, ["--version"], { env, timeout: 6000, maxBuffer: 8192, windowsHide: true });
    let loggedIn = false;
    try { const status = await promisify(execFile)(binary, ["login", "status"], { env, timeout: 6000, maxBuffer: 8192, windowsHide: true }); loggedIn = /logged in/i.test(status.stdout + status.stderr); } catch { /* No credential material is returned to the client. */ }
    let imageGeneration = false;
    try { const features = await promisify(execFile)(binary, ["features", "list"], { env, timeout: 6000, maxBuffer: 32768 }); imageGeneration = /^image_generation\s+\S+\s+true\s*$/m.test(features.stdout); } catch { /* Older CLIs may not expose built-in image generation. */ }
    res.set("Cache-Control", "no-store").json(success({ available: true, loggedIn, imageGeneration, binary, message: loggedIn ? "已找到 CLI 并登录" : "已找到 CLI，请在终端运行 codex login", version: (version.stdout + version.stderr).match(/\d+\.\d+\.\d+/)?.[0] || "已安装" }));
  } catch (error) { res.json(success({ available: false, loggedIn: false, version: "", message: error instanceof Error ? error.message : "Codex 检测失败" })); }
});
