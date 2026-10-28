import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { success } from "@/lib/responseFormat";

export default Router().get("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const keyword = z.string().trim().min(1).max(200).parse(req.query.keyword);
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `${keyword} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo", iiprop: "url|mime", iiurlwidth: "640" }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(18000), redirect: "error", headers: { "User-Agent": "XiaolengComicStudio/1.0" } });
  if (!response.ok) throw new Error("网络案例搜索暂不可用，请稍后再试或上传本地参考图");
  const result = await response.json() as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; descriptionurl?: string; mime?: string }[] }> } };
  const items = Object.values(result.query?.pages || {}).flatMap((page) => {
    const image = page.imageinfo?.[0];
    if (!image?.thumburl || !image.descriptionurl || !["image/png", "image/jpeg", "image/webp"].includes(image.mime || "")) return [];
    const thumbnail = new URL(image.thumburl);
    if (thumbnail.protocol !== "https:" || !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(thumbnail.hostname)) return [];
    return [{ title: page.title.replace(/^File:/, ""), thumbnail: thumbnail.href, source: image.descriptionurl }];
  });
  res.json(success(items));
});
