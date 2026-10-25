import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { readSource } from "@/utils/comicStudio/source";
const input = z.object({ source: z.enum(["douban", "tieba"]), keyword: z.string().trim().max(80).default("") });
export default Router().get("/", validateFields(input.shape, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalWorkspaceRequest(req)) throw Object.assign(new Error("论坛采集仅允许本机调用"), { status: 403 });
  const { source, keyword } = input.parse(req.query);
  const root = source === "douban" ? keyword ? `https://www.douban.com/group/search?cat=1013&q=${encodeURIComponent(keyword)}` : "https://www.douban.com/group/explore" : "https://tieba.baidu.com/f?kw=%E5%BC%B1%E6%99%BA&ie=utf-8";
  const html = await readSource(root);
  if (/<title[^>]*>[^<]*(安全验证|验证码|禁止访问)/i.test(html)) throw Object.assign(new Error("平台要求安全验证，请在平台设置打开专用浏览器，本人完成后收集可见帖子；没有绕过验证"), { status: 409 });
  const links: { title: string; url: string; hasTitle?: boolean }[] = [];
  let current: { title: string; url: string; hasTitle?: boolean } | undefined;
  await new HTMLRewriter().on("a[href]", {
    element(element) {
      current = undefined;
      const href = element.getAttribute("href");
      if (!href) return;
      let url: URL;
      try { url = new URL(href, root); } catch { return; }
      const valid = source === "douban" ? url.hostname === "www.douban.com" && /^\/group\/topic\/\d+\/?$/.test(url.pathname) : url.hostname === "tieba.baidu.com" && /^\/p\/\d+$/.test(url.pathname);
      if (!valid || url.protocol !== "https:") return;
      url.search = ""; url.hash = "";
      const item = { title: element.getAttribute("title") || "", url: url.href, hasTitle: !!element.getAttribute("title") };
      current = item; links.push(item);
      element.onEndTag(() => { if (current === item) current = undefined; });
    },
    text(chunk) { if (current && !current.hasTitle) current.title += chunk.text; },
  }).transform(new Response(html)).text();
  const at = new Date().toISOString();
  const terms = keyword.replace(/热梗|热门|梗|吧$/g, "").trim().split(/\s+/).filter(Boolean);
  const rows = [...new Map(links.filter((item) => item.title.trim().length > 2).map((item) => [item.url, item])).values()];
  const items = rows.filter((item) => source === "douban" || !terms.length || terms.some((term) => item.title.includes(term))).slice(0, 30).map((item, index) => ({ title: item.title.replace(/\s+/g, " ").trim().slice(0, 1000), url: item.url, summary: `${source === "douban" ? keyword ? "豆瓣公开讨论搜索" : "豆瓣讨论精选" : "弱智吧帖子列表"}标题${keyword ? `，关键词“${keyword}”` : ""}；不代表热度排名或已获取完整正文，请打开来源核对。`, source: source === "douban" ? "豆瓣 · 讨论精选" : "贴吧 · 弱智吧", collectedAt: at, publishedAt: "", rank: index + 1, metric: "", kind: "search", collectorUrl: root }));
  if (!rows.length && !keyword) throw Object.assign(new Error("当前页面未返回可识别帖子，可能需要本人登录或平台页面已变化"), { status: 422 });
  res.set("Cache-Control", "no-store").json(success({ items, fetchedAt: at, source, url: root, message: keyword ? `公开列表关键词筛选 ${items.length} 条，不代表全站检索` : `公开列表 ${items.length} 条，不代表热度排行` }));
});
