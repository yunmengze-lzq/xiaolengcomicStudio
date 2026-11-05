import { Router } from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { modelSetupStatus } from "@/utils/comicStudio/modelSetup";
export default Router().get("/", (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机查看安装状态"), { status: 403 });
  res.json(success(modelSetupStatus()));
});
