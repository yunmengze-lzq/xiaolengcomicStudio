import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { startModelSetup, cancelModelSetup } from "@/utils/comicStudio/modelSetup";
const schema = z.object({ action: z.enum(["install", "cancel"]), model: z.enum(["zImage", "fluxKlein"]).default("fluxKlein") });
export default Router().post("/", validateFields(schema.shape), (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机安装模型"), { status: 403 });
  const input = schema.parse(req.body);
  res.json(success(input.action === "cancel" ? cancelModelSetup() : startModelSetup(input.model)));
});
