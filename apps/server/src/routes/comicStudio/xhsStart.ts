import { Router } from "express";
import { z } from "zod";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { access } from "@toonflow/file";
import u from "@/utils";
import { success } from "@/lib/responseFormat";

let starting: Promise<void> | undefined;

async function serviceReady() {
  try {
    const response = await fetch("http://127.0.0.1:18060/health", { signal: AbortSignal.timeout(1500), redirect: "error" });
    const result = z.object({ data: z.object({ service: z.literal("xiaohongshu-mcp") }) }).safeParse(await response.json());
    return response.ok && result.success;
  } catch {
    return false;
  }
}

async function startService() {
  if (await serviceReady()) return;
  const directory = resolve(dirname(u.conf.path), "localServices", "xhs");
  const binary = resolve(directory, "xhsServer");
  try {
    await access(binary, 1);
  } catch {
    throw Object.assign(new Error("本机尚未安装小红书搜索服务，请按使用指南安装后重试；抖音公开热榜可直接使用。"), { status: 503 });
  }
  // Only launch the locally installed helper, with a fixed loopback address and no shell or user-supplied arguments.
  await new Promise<void>((done, reject) => {
    const child = spawn(binary, ["-port", "127.0.0.1:18060"], { cwd: directory, shell: false, detached: true, stdio: "ignore" });
    child.once("error", () => reject(Object.assign(new Error("小红书搜索服务启动失败，请检查本机安装"), { status: 503 })));
    child.once("spawn", () => { child.unref(); done(); });
  });
  for (let attempt = 0; attempt < 10; attempt++) {
    if (await serviceReady()) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw Object.assign(new Error("搜索服务尚未就绪，请稍后重试连接"), { status: 503 });
}

export default Router().post("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("平台接入仅允许本机调用"), { status: 403 });
  starting ??= startService().finally(() => { starting = undefined; });
  await starting;
  res.set("Cache-Control", "no-store").json(success({ available: true }));
});
