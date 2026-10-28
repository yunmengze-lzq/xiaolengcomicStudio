import { access, readdir } from "@toonflow/file";
import { delimiter, dirname, join, isAbsolute } from "node:path";
import { homedir } from "node:os";

// Detection and execution must resolve the same executable, including desktop launches without a shell PATH.
export async function codexCommand() {
  const home = homedir();
  const directories = [...(process.env.PATH || "").split(delimiter).filter((path) => isAbsolute(path)), "/opt/homebrew/bin", "/usr/local/bin", join(home, ".local/bin"), join(home, ".npm-global/bin"), join(home, "AppData/Roaming/npm")];
  for (const root of [join(home, ".nvm/versions/node"), join(home, ".local/share/fnm/node-versions")]) {
    try { for (const entry of await readdir(root)) directories.push(join(root, entry, "bin"), join(root, entry, "installation/bin")); } catch { /* Optional installation locations. */ }
  }
  const explicit = process.env.COMIC_CODEX_BIN;
  const candidates = explicit ? [explicit] : [
    ...directories.map((path) => join(path, process.platform === "win32" ? "codex.exe" : "codex")),
    "/Applications/Codex.app/Contents/Resources/codex",
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
    ...directories.flatMap((path) => ["x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc"].flatMap((target) => {
      const platform = target.startsWith("aarch64") ? "codex-win32-arm64" : "codex-win32-x64";
      return [join(path, "node_modules/@openai/codex/vendor", target, "codex/codex.exe"), join(path, "node_modules/@openai/codex/node_modules/@openai", platform, "vendor", target, "codex/codex.exe"), join(path, "node_modules/@openai", platform, "vendor", target, "codex/codex.exe")];
    })),
  ];
  for (const candidate of candidates) {
    if (!isAbsolute(candidate)) continue;
    try { await access(candidate); return { binary: candidate, environment: { ...process.env, PATH: [...new Set([dirname(candidate), ...directories])].join(delimiter) } }; } catch { /* Try next known installation. */ }
  }
  if (explicit) throw new Error("COMIC_CODEX_BIN 指定的程序不存在，请填写本机 Codex 可执行文件的绝对路径");
  throw new Error("未找到 Codex CLI。请安装并登录，或设置 COMIC_CODEX_BIN 为本机 codex / codex.exe 的绝对路径后重启服务。安装桌面 App 不代表 CLI 已在 PATH 中。");
}
