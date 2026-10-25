import { Router } from "express";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { mkdir, mkdtemp, writeFile, readFile } from "@toonflow/file";
import { z } from "zod";
import u from "@/utils";
import conf from "@/utils/conf";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { resolveWorkspacePath } from "@/utils/workspace/files";
import { zImageStatus } from "@/utils/comicStudio/zImage";

const inputSchema = z.object({ directory: z.string().min(1).max(4096), prompt: z.string().min(1).max(30000), images: z.array(z.object({ path: z.string().min(1).max(4096) })).max(12).default([]), quality: z.enum(["draft", "standard", "detail"]).default("standard") });
let running = false;
export default Router().post("/", validateFields(inputSchema.shape), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机运行本地生图"), { status: 403 });
  const input = inputSchema.parse(req.body);
  const size = { draft: { width: 384, height: 512 }, standard: { width: 768, height: 1024 }, detail: { width: 896, height: 1152 } }[input.quality];
  const directory = await u.workspace.resolveWorkspace(req, input.directory);
  if (running) throw Object.assign(new Error("本地模型正在生成，请等待当前任务完成"), { status: 409 });
  const runtime = await zImageStatus();
  if (!runtime.installed || !runtime.modelReady) throw new Error("请先在本地模型设置检查 Z-Image 环境与模型下载状态");
  if (input.images.length > 1) throw new Error("本地 Z-Image 当前仅支持单张图生图参考，不支持多角色参考图锁定。请改用支持多参考图的服务，或减少参考图。");
  running = true;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  res.once("close", cancel);
  req.once("aborted", cancel);
  try {
    const jobs = resolve(dirname(conf.path), "comicJobs");
    await mkdir(jobs, { recursive: true });
    const job = await mkdtemp(resolve(jobs, "localImage"));
    const promptFile = resolve(job, "prompt.txt");
    const output = resolve(job, "image.png");
    await writeFile(promptFile, input.prompt, { mode: 0o600, flag: "wx" });
    const reference = input.images[0] ? (await resolveWorkspacePath(directory, input.images[0].path)).path : "";
    const started = Date.now();
    await new Promise<void>((done, reject) => {
      const child = spawn(runtime.binary, ["--model", "filipstrand/Z-Image-Turbo-mflux-4bit", "--prompt-file", promptFile, "--width", String(size.width), "--height", String(size.height), "--steps", "9", "--seed", "42", "--low-ram", "--mlx-cache-limit-gb", "2", "--output", output, "--no-exif", ...(reference ? ["--image-path", reference, "--image-strength", "0.65"] : [])], {
        shell: false, signal: controller.signal, timeout: 900000, stdio: ["ignore", "ignore", "pipe"],
        env: { ...process.env, HF_HOME: resolve(runtime.root, "cache"), HF_HUB_OFFLINE: "1", HF_HUB_DISABLE_IMPLICIT_TOKEN: "1", MPLCONFIGDIR: resolve(runtime.root, "matplotlib"), TOKENIZERS_PARALLELISM: "false" },
      });
      let memoryFailure = false;
      child.stderr.on("data", (chunk: Buffer) => { if (/out of memory|allocation|memory limit/i.test(chunk.toString("utf8"))) memoryFailure = true; });
      child.on("error", () => reject(new Error("本地 Z-Image 无法启动或任务已取消")));
      child.on("close", (code) => code === 0 ? done() : reject(new Error(memoryFailure ? "本机可用内存不足，请关闭占用内存的应用后重试" : "本地 Z-Image 运行失败，已有作品保留，请检查本地模型环境")));
    });
    const bytes = await readFile(output);
    if (bytes.length > 15 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("本地模型未输出可用 PNG 图片");
    const assets = await resolveWorkspacePath(directory, "assets");
    await mkdir(assets.path, { recursive: true });
    const path = `assets/zImage${crypto.randomUUID().replaceAll("-", "")}.png`;
    await writeFile((await resolveWorkspacePath(directory, path)).path, bytes, { mode: 0o600, flag: "wx" });
    console.info("[comicLocalImage]", { model: "z-image-turbo-4bit", quality: input.quality, ...size, steps: 9, elapsedMs: Date.now() - started });
    res.json(success([{ path, mimeType: "image/png" }]));
  } finally { running = false; res.off("close", cancel); req.off("aborted", cancel); }
});
