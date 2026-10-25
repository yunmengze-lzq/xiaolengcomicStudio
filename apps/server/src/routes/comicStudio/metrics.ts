import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { readSource } from "@/utils/comicStudio/source";
const inputSchema = z.object({ platform: z.enum(["B站", "小红书", "抖音"]), url: z.url().max(2000) });
function count(value: string | undefined) {
  if (value === undefined || !value.trim()) return null;
  const parsed = value.trim().replaceAll(",", "").match(/^(\d+(?:\.\d+)?)(万|亿|w|k)?\+?$/i);
  if (!parsed) return null;
  const multiplier: Record<string, number> = { 万: 10000, 亿: 100000000, w: 10000, k: 1000 };
  return Math.round(Number(parsed[1]) * (multiplier[parsed[2]?.toLowerCase() || ""] || 1));
}
export default Router().post("/", validateFields(inputSchema.shape), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("作品同步仅允许本机工作台调用"), { status: 403 });
  const input = inputSchema.parse(req.body);
  const url = new URL(input.url);
  if (url.username || url.password || url.port) throw Object.assign(new Error("请使用平台标准作品链接"), { status: 400 });
  if (input.platform === "抖音") throw Object.assign(new Error("抖音作品后台尚未取得授权，当前不能自动同步本人后台数据"), { status: 501 });
  const at = new Date().toISOString();
  if (input.platform === "B站") {
    const bvid = url.pathname.match(/^\/video\/(BV[a-zA-Z0-9]{10})(?:\/|$)/)?.[1];
    if (url.protocol !== "https:" || !["www.bilibili.com", "bilibili.com"].includes(url.hostname) || !bvid) throw Object.assign(new Error("请填写 https://www.bilibili.com/video/BV… 标准作品链接，暂不解析短链接"), { status: 400 });
    const result = z.object({ code: z.literal(0), data: z.object({ bvid: z.string(), title: z.string().max(1000), pubdate: z.number(), stat: z.object({ view: z.number().nonnegative(), like: z.number().nonnegative(), reply: z.number().nonnegative(), favorite: z.number().nonnegative(), share: z.number().nonnegative() }) }) }).safeParse(JSON.parse(await readSource(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)));
    if (!result.success) throw Object.assign(new Error("B站作品不可读取或接口格式变化，旧记录已保留"), { status: 502 });
    const data = result.data.data;
    res.json(success({ at, title: data.title, publishedAt: new Date(data.pubdate * 1000).toISOString(), views: data.stat.view, likes: data.stat.like, comments: data.stat.reply, saves: data.stat.favorite, shares: data.stat.share, source: "B站公开作品累计指标", approximate: false }));
    return;
  }
  const noteId = url.pathname.match(/^\/(?:explore|discovery\/item)\/([a-f0-9]{24})(?:\/|$)/)?.[1];
  const token = url.searchParams.get("xsec_token");
  if (url.protocol !== "https:" || !["www.xiaohongshu.com", "xiaohongshu.com"].includes(url.hostname) || !noteId || !token || token.length > 2000) throw Object.assign(new Error("请填写含 xsec_token 的小红书标准笔记链接；需先在设置中本人登录"), { status: 400 });
  const raw = JSON.parse(await readSource("http://127.0.0.1:18060/api/v1/feeds/detail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feed_id: noteId, xsec_token: token, load_all_comments: false }) }));
  const parsed = z.object({ success: z.literal(true), data: z.object({ data: z.object({ note: z.object({ title: z.string().max(1000), time: z.number().optional(), interactInfo: z.object({ likedCount: z.string().optional(), sharedCount: z.string().optional(), commentCount: z.string().optional(), collectedCount: z.string().optional() }) }) }) }) }).safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("小红书笔记尚不可读，请检查本人会话和作品链接；旧记录已保留"), { status: 502 });
  const note = parsed.data.data.data.note;
  const info = note.interactInfo;
  res.json(success({ at, title: note.title, publishedAt: note.time ? new Date(note.time > 1e12 ? note.time : note.time * 1000).toISOString() : "", views: null, likes: count(info.likedCount), comments: count(info.commentCount), saves: count(info.collectedCount), shares: count(info.sharedCount), source: "小红书本人会话读取的公开互动数（无阅读量）", approximate: Object.values(info).some((value) => /[万亿wk+]/i.test(value || "")) }));
});
