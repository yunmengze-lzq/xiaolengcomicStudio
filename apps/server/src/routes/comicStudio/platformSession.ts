import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { platformSession } from "@/utils/comicStudio/platformBrowser";
const input = z.object({ platform: z.enum(["douyin", "bilibili", "tieba", "douban"]), action: z.enum(["open", "status", "capture", "close", "search", "preview"]), keyword: z.string().trim().max(80).default("") });
export default Router().post("/", validateFields(input.shape), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("平台会话仅允许本机使用"), { status: 403 });
  const value = input.parse(req.body);
  if (value.action === "search" && !value.keyword) throw Object.assign(new Error("请输入搜索关键词"), { status: 400 });
  res.set("Cache-Control", "no-store").json(success(await platformSession(value.platform, value.action, value.keyword)));
});
