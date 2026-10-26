import { Router } from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { zImageStatus } from "@/utils/comicStudio/zImage";

export default Router().get("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机查看本地模型状态"), { status: 403 });
  const { installed, modelReady, root, binary } = await zImageStatus();
  res.json(success({ installed, modelReady, root, binary, message: !installed ? "尚未安装本地 MLX 环境" : !modelReady ? "MLX 环境已安装，模型尚在下载或未下载完整" : "Z-Image Turbo 4-bit 已就绪 · 本机运行，无 API 费用" }));
});
