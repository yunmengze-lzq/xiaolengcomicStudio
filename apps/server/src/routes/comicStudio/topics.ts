import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { readSource } from "@/utils/comicStudio/source";

const sources = {
  bilibili: "https://s.search.bilibili.com/main/hotword",
  douyin: "https://60s.viki.moe/v2/douyin",
  rednote: "https://60s.viki.moe/v2/rednote",
  xhsLocal: "http://127.0.0.1:18060/api/v1/feeds/search",
  ithome: "https://www.ithome.com/rss/",
  solidot: "https://www.solidot.org/index.rss",
};
const inputSchema = z.object({
  source: z.enum(["douyin", "bilibili", "rednote", "xhsLocal", "ithome", "solidot"]),
  keyword: z.string().trim().min(1).max(80).optional(),
});
const hotSchema = z.object({
  code: z.literal(200),
  data: z
    .array(z.object({ title: z.string().min(1).max(1000), link: z.url(), hot_value: z.number().optional(), score: z.string().optional() }))
    .max(200),
});
const searchSchema = z.object({
  success: z.literal(true),
  data: z.object({
    feeds: z
      .array(
        z.object({
          id: z.string().regex(/^[a-f0-9]{24}$/),
          xsecToken: z.string().max(2000).optional(),
          noteCard: z
            .object({ displayTitle: z.string().max(1000), interactInfo: z.object({ likedCount: z.string().max(50) }).optional() })
            .optional(),
        }),
      )
      .max(200),
  }),
});

export default Router().get("/", validateFields(inputSchema.shape, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("话题采集仅允许本机工作台调用"), { status: 403 });
  const { source, keyword } = inputSchema.parse(req.query);
  const url = sources[source];
  const fetchedAt = new Date().toISOString();
  if (source === "bilibili") {
    const result = z.object({ code: z.literal(0), list: z.array(z.object({ keyword: z.string().min(1).max(1000), heat_score: z.number().optional() })).max(200) }).safeParse(JSON.parse(await readSource(url)));
    if (!result.success) throw Object.assign(new Error("B站公开热搜格式变化，请稍后重试"), { status: 502 });
    const items = result.data.list.map((item, index) => ({ title: item.keyword, url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword)}`, summary: "B站公开热搜词，仅作创作线索；不是视频原剧情或事实证据。", source: "B站 · 公开热搜词", publishedAt: "", collectedAt: fetchedAt, rank: index + 1, heat: item.heat_score, metric: item.heat_score === undefined ? "" : `热度 ${item.heat_score}`, kind: "hotSearch", collectorUrl: url }));
    res.set("Cache-Control", "no-store").json(success({ source, url, fetchedAt, items }));
    return;
  }
  if (source === "ithome" || source === "solidot") {
    res.set("Cache-Control", "no-store").json(success({ source, url, fetchedAt, xml: await readSource(url) }));
    return;
  }
  if (source === "xhsLocal") {
    if (!keyword) throw Object.assign(new Error("小红书搜索需要关键词，如科普、综艺、电影"), { status: 400 });
    const raw = JSON.parse(
      await readSource(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, filters: { sort_by: "最多点赞", publish_time: "一天内", note_type: "不限" } }),
      }),
    );
    const result = searchSchema.safeParse(raw);
    if (!result.success) throw Object.assign(new Error("小红书搜索尚未返回笔记，请确认本人扫码登录，或稍后重试"), { status: 502 });
    const items = result.data.data.feeds
      .filter((item) => item.noteCard?.displayTitle)
      .map((item, index) => ({
        title: item.noteCard!.displayTitle,
        url: `https://www.xiaohongshu.com/explore/${item.id}${item.xsecToken ? `?xsec_token=${encodeURIComponent(item.xsecToken)}&xsec_source=pc_search` : ""}`,
        summary: `关键词：${keyword}；一天内、最多点赞排序。搜索候选不是全站热榜；请打开笔记核对内容。`,
        source: "小红书 · 本人登录搜索",
        publishedAt: "",
        collectedAt: fetchedAt,
        rank: index + 1,
        metric: item.noteCard?.interactInfo ? `点赞 ${item.noteCard.interactInfo.likedCount}` : "",
        kind: "search",
        collectorUrl: "https://github.com/xpzouying/xiaohongshu-mcp",
      }));
    res.set("Cache-Control", "no-store").json(success({ source, url, fetchedAt, items }));
    return;
  }
  const result = hotSchema.safeParse(JSON.parse(await readSource(url)));
  if (!result.success) throw Object.assign(new Error("聚合热榜格式已变化，请切换本人登录搜索或稍后重试"), { status: 502 });
  const platform = source === "douyin" ? "抖音" : "小红书";
  const items = result.data.data.map((item, index) => ({
    title: item.title,
    url: item.link,
    summary: `${platform}热搜线索，链接为关键词搜索页，不是事实原文。请补充并核对可靠来源。`,
    source: `${platform} · 60s聚合`,
    publishedAt: "",
    collectedAt: fetchedAt,
    rank: index + 1,
    heat: item.hot_value,
    metric: item.hot_value === undefined ? (item.score ? `热度 ${item.score}` : "") : `热度 ${item.hot_value.toLocaleString("zh-CN")}`,
    kind: "hotSearch",
    collectorUrl: url,
  }));
  res.set("Cache-Control", "no-store").json(success({ source, url, fetchedAt, items }));
});
