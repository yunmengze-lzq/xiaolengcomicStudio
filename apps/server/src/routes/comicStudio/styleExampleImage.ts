import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";

const schema = z.object({ url: z.string().url().max(4096) });
export default Router().post("/", validateFields(schema.shape), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("仅允许本机导入参考图"), { status: 403 });
  const url = new URL(schema.parse(req.body).url);
  if (url.protocol !== "https:" || !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) || url.port || url.username || url.password) throw new Error("仅支持搜索结果中的 Wikimedia 图片");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(18000), headers: { "User-Agent": "XiaolengComicStudio/1.0" } });
  const mime = response.headers.get("content-type")?.split(";")[0] || "";
  if (!response.ok || !["image/png", "image/jpeg", "image/webp"].includes(mime) || !response.body) throw new Error("参考图无法下载，请打开来源页或上传本地图片");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 15 * 1024 * 1024) throw new Error("参考图超过15MB");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  res.type(mime).send(Buffer.concat(chunks));
});
