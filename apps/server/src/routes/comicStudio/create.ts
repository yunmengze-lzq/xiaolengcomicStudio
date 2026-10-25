import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdir, writeFile } from "@toonflow/file";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({ title: z.string().trim().min(1).max(100) }), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("漫画项目创建仅允许本机工作台调用"), { status: 403 });
  const directory = resolve(dirname(u.conf.path), "workspaces", `comic${randomUUID().replaceAll("-", "")}`);
  await mkdir(resolve(directory, "assets"), { recursive: true });
  const project = {
    comicStudio: 1,
    title: req.body.title.trim(),
    topics: [],
    styles: [],
    activeStyleId: "",
    characters: [],
    episodes: [],
    activeEpisodeId: "",
  };
  await writeFile(resolve(directory, "comicProject.json"), JSON.stringify(project, null, 2), { flag: "wx", mode: 0o600 });
  res.status(201).json(success({ directory }));
});
