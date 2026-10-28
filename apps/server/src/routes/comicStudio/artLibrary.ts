import { Router } from "express";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdir, readFile, readdir, stat, writeAtomic } from "@toonflow/file";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { resolveWorkspacePath } from "@/utils/workspace/files";

let initializing: Promise<void> | undefined;

export default Router().post("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("公共美术库仅允许本机访问"), { status: 403 });
  const directory = resolve(dirname(u.conf.path), "workspaces", "artLibrary");
  initializing ??= (async () => {
    await mkdir(resolve(directory, "assets"), { recursive: true });
    try { await readFile(resolve(directory, "library.json")); return; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const library = { characters: [] as Record<string, unknown>[], styles: [] as Record<string, unknown>[], deleted: [] as string[], warnings: [] as string[] };
    const root = resolve(dirname(u.conf.path), "workspaces");
    const entries = await readdir(root, { withFileTypes: true });
    const projects = await Promise.all(entries.filter((item) => item.isDirectory() && /^comic[a-f0-9]{32}$/.test(item.name)).map(async (entry) => ({ entry, modified: (await stat(resolve(root, entry.name, "comicProject.json")).catch(() => null))?.mtimeMs || 0 })));
    for (const { entry } of projects.sort((a, b) => b.modified - a.modified)) {
      const source = resolve(root, entry.name);
      let project;
      try { project = JSON.parse(await readFile(resolve(source, "comicProject.json"), "utf8")); }
      catch { library.warnings.push(`${entry.name} 无法读取，原项目保留`); continue; }
      for (const kind of ["characters", "styles"] as const) for (const original of Array.isArray(project[kind]) ? project[kind] : []) {
        if (!original || typeof original.id !== "string" || typeof original.name !== "string") continue;
        const existing = library[kind].find((item) => item.id === original.id);
        if (existing) continue;
        const item = structuredClone(original);
        const imagePaths = new Set<string>([item.image, ...(item.refs || []).map((ref: { path: string }) => ref.path), ...(item.designImages || []).map((ref: { path: string }) => ref.path)].filter(Boolean));
        const mappings = new Map<string, string>();
        try {
          for (const path of imagePaths) {
            if (!/^assets\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(path)) throw new Error("素材路径无效");
            const checked = await resolveWorkspacePath(source, path);
            const bytes = await readFile(checked.path);
            if (bytes.length > 20 * 1024 * 1024) throw new Error("素材超过20MB");
            const target = `assets/${createHash("sha256").update(bytes).digest("hex")}.${path.split(".").at(-1)}`;
            await writeAtomic(resolve(directory, target), bytes);
            mappings.set(path, target);
          }
          if (item.image) item.image = mappings.get(item.image);
          for (const ref of [...(item.refs || []), ...(item.designImages || [])]) ref.path = mappings.get(ref.path);
          library[kind].push(item);
        } catch { library.warnings.push(`${original.name} 的素材迁移未完成，原项目保留`); }
      }
    }
    for (const style of library.styles) {
      const characterId = style.name === "模型娘 · Q版精致萌系" ? "modelGirlsDeepseekChibi" : style.name === "模型娘 · 成人版精致日漫" ? "modelGirlsDeepseekAdult" : "";
      const sample = library.characters.find((item) => item.id === characterId)?.image;
      if (sample && Array.isArray(style.refs) && !style.refs.length) style.refs.push({ id: `${characterId}StyleSample`, path: sample, source: "已保存的模型娘画风实例", note: "只参考线条、配色和比例，不复制角色身份", license: "沿用原素材授权" });
    }
    await writeAtomic(resolve(directory, "library.json"), JSON.stringify(library, null, 2), { exclusive: true });
  })().catch((error) => { initializing = undefined; throw error; });
  await initializing;
  res.json(success({ directory }));
});
