import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { mkdir, appendFile } from "@toonflow/file";
import { zImageRoot, zImageStatus, localImageRuntime } from "./zImage";

const execute = promisify(execFile);
let job = { running: false, model: "", stage: "idle", message: "尚未启动安装", updatedAt: "" };
let controller: AbortController | undefined;
export const modelSetupStatus = () => ({ ...job, supported: process.platform === "darwin" && process.arch === "arm64", root: zImageRoot() });

async function record(stage: string, message: string) {
  job = { ...job, stage, message, updatedAt: new Date().toISOString() };
  await mkdir(zImageRoot(), { recursive: true });
  // 仅保存阶段日志，不记录环境变量、密钥或下载器原始输出。
  await appendFile(resolve(zImageRoot(), "installation.log"), `${job.updatedAt} ${job.model} ${stage} ${message}\n`);
}
async function pythonBinary() {
  for (const binary of [resolve(zImageRoot(), "env/bin/python"), "/opt/homebrew/bin/python3.12", "/usr/local/bin/python3.12", "python3.12", "python3.11", "python3"]) {
    try {
      const { stdout } = await execute(binary, ["-c", "import sys; print(int(sys.version_info >= (3,10) and sys.version_info < (3,14)))"], { timeout: 4000 });
      if (stdout.trim() === "1") return binary;
    } catch { /* 尝试下一个已安装的 Python，不安装或修改系统 Python。 */ }
  }
  throw new Error("未找到 Python 3.10–3.13。请先从 python.org 安装 Apple Silicon Python 3.12，再重试。");
}
async function run(binary: string, args: string[], signal: AbortSignal, timeout: number) {
  signal.throwIfAborted();
  await new Promise<void>((done, fail) => {
    const child = spawn(binary, args, { detached: true, stdio: "ignore", env: { ...process.env, HF_HUB_DISABLE_IMPLICIT_TOKEN: "1", PIP_DISABLE_PIP_VERSION_CHECK: "1" } });
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    const terminate = () => {
      if (!child.pid) return;
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* 子进程已结束。 */ }
      forceTimer = setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* 子进程已结束。 */ } }, 5000);
    };
    const timer = setTimeout(terminate, timeout);
    const cleanup = () => { clearTimeout(timer); clearTimeout(forceTimer); signal.removeEventListener("abort", terminate); };
    signal.addEventListener("abort", terminate, { once: true });
    child.once("error", (error) => { cleanup(); fail(error); });
    child.once("close", (code) => { cleanup(); code === 0 ? done() : fail(new Error("安装步骤未完成。请检查网络和剩余磁盘后重试；已下载缓存会保留。")); });
    if (signal.aborted) terminate();
  });
  signal.throwIfAborted();
}
async function install(model: "zImage" | "fluxKlein", signal: AbortSignal) {
  try {
    await record("checking", "检查已安装环境与模型");
    const existing = await zImageStatus(model);
    if (existing.installed && existing.modelReady) { await record("ready", "环境与模型已经就绪，无需重复下载"); return; }
    const python = await pythonBinary();
    const environment = resolve(zImageRoot(), "env");
    const localPython = resolve(environment, "bin/python");
    if (!existing.installed) {
      await record("environment", "准备独立 Python 环境与 mflux 0.23.0；不会修改系统依赖");
      if (python !== localPython) await run(python, ["-m", "venv", environment], signal, 120000);
      await run(localPython, ["-m", "pip", "install", "--index-url", "https://pypi.org/simple", "mflux==0.23.0"], signal, 1800000);
    }
    if (!existing.modelReady) {
      await record("downloading", "从 Hugging Face 下载所选模型，可能需要数 GB；关闭应用会中断，重试可复用缓存");
      await run(localPython, ["-c", "from huggingface_hub import snapshot_download; import sys; snapshot_download(repo_id=sys.argv[1], cache_dir=sys.argv[2], token=False)", existing.model, resolve(existing.root, "cache/hub")], signal, 14400000);
    }
    const result = await zImageStatus(model);
    if (!result.installed || !result.modelReady) throw new Error("下载结束但环境或模型文件不完整，请重试或检查安装目录。");
    await record("ready", "环境与模型已就绪；可以检测并设为默认模型，尚未执行生图");
  } catch (error) {
    await record(signal.aborted ? "cancelled" : "failed", signal.aborted ? "已停止安装，保留已下载缓存，可重试" : error instanceof Error ? error.message : "安装失败").catch(() => {});
  } finally { job.running = false; controller = undefined; }
}
export function startModelSetup(model: "zImage" | "fluxKlein") {
  if (!modelSetupStatus().supported) throw Object.assign(new Error("自动 MLX 安装仅支持 Apple Silicon Mac；其他电脑请选择 Comfy Desktop 安装引导"), { status: 400 });
  if (job.running || localImageRuntime.generating) throw Object.assign(new Error("已有安装或生图任务进行中，请等待完成后重试"), { status: 409 });
  controller = new AbortController();
  job = { running: true, model, stage: "checking", message: "准备检查环境", updatedAt: new Date().toISOString() };
  void install(model, controller.signal);
  return modelSetupStatus();
}
export function cancelModelSetup() { controller?.abort(); return modelSetupStatus(); }
