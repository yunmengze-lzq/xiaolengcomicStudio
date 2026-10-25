import puppeteer, { type Browser } from "puppeteer-core";
import { existsSync, mkdir, chmod } from "@toonflow/file";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

type Platform = "douyin" | "bilibili" | "tieba" | "douban";
const sessions = new Map<Platform, Promise<Browser>>();
const opening = new Map<Platform, Promise<void>>();
const platforms = {
  douyin: { url: "https://www.douyin.com/", label: "抖音", cookies: ["sessionid", "sessionid_ss"] },
  tieba: { url: "https://tieba.baidu.com/f?kw=%E5%BC%B1%E6%99%BA&ie=utf-8", label: "弱智吧", cookies: ["BDUSS"] },
  douban: { url: "https://www.douban.com/group/explore", label: "豆瓣", cookies: ["dbcl2"] },
  bilibili: { url: "https://www.bilibili.com/", label: "B站", cookies: ["SESSDATA"] },
};
function allowed(value: string, platform: Platform) {
  try {
    const url = new URL(value);
    const host = new URL(platforms[platform].url).hostname.replace(/^www\./, "");
    return url.protocol === "https:" && !url.username && !url.password && !url.port && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}
async function openBrowser(platform: Platform) {
  let pending = sessions.get(platform);
  if (!pending) {
    pending = (async () => {
      const paths = process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")]
        : process.platform === "win32"
          ? [join(process.env.PROGRAMFILES || "C:\\Program Files", "Google/Chrome/Application/chrome.exe")]
          : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
      const executablePath = paths.find((path) => existsSync(path));
      if (!executablePath) throw Object.assign(new Error("请先安装Google Chrome，再打开平台登录浏览器"), { status: 503 });
      const root = resolve(process.env.TOONFLOW_DATA_DIR || "data", "platformSessions");
      const profile = join(root, platform);
      await mkdir(profile, { recursive: true, mode: 0o700 });
      if (process.platform !== "win32") { await chmod(root, 0o700); await chmod(profile, 0o700); }
      // Use a separate persistent profile and a pipe; never expose a remote debugging TCP port or copy the user's browser profile.
      const browser = await puppeteer.launch({ executablePath, headless: false, pipe: true, userDataDir: profile, defaultViewport: null, timeout: 15000 });
      browser.once("disconnected", () => sessions.delete(platform));
      return browser;
    })();
    sessions.set(platform, pending);
    void pending.catch(() => sessions.delete(platform));
  }
  return pending;
}
export async function platformSession(platform: Platform, action: "open" | "status" | "capture" | "close" | "search" | "preview", keyword = "") {
  if (action === "open") {
    let pending = opening.get(platform);
    if (!pending) {
      pending = (async () => {
        const browser = await openBrowser(platform);
        const pages = await browser.pages();
        const existing = [...pages].reverse().find((page) => allowed(page.url(), platform));
        if (existing) { await existing.bringToFront(); return; }
        const page = pages.find((item) => item.url() === "about:blank") || await browser.newPage();
        await page.goto(platforms[platform].url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.bringToFront();
      })().finally(() => opening.delete(platform));
      opening.set(platform, pending);
    }
    await pending;
  }
  const pending = sessions.get(platform);
  if (!pending) {
    if (action === "capture" || action === "search") throw Object.assign(new Error("请先打开平台浏览器，在官方网页本人登录并浏览内容"), { status: 409 });
    return { running: false, hasSession: false, message: "尚未打开专用浏览器；保存过的会话会在下次打开时恢复", items: [] };
  }
  const browser = await pending;
  if (action === "close") {
    await browser.close();
    return { running: false, hasSession: false, message: "浏览器已关闭，本机登录资料保留；退出账号请在平台官网操作", items: [] };
  }
  if (action === "preview") {
    const page = [...await browser.pages()].reverse().find((item) => allowed(item.url(), platform));
    if (!page) throw Object.assign(new Error("没有对应平台的页面可预览"), { status: 409 });
    const diagnostics = await page.evaluate(`(() => {
      const roots = [document]; for (const root of roots) for (const el of root.querySelectorAll("*")) if (el.shadowRoot && roots.length < 30) roots.push(el.shadowRoot);
      const deepLinks = roots.flatMap(root => Array.from(root.querySelectorAll("a[href]")));
      return ({
      shadowRoots: roots.length - 1,
      deepVideoLinks: deepLinks.filter(a => /video|modal_id/.test(a.href)).length,
      title: document.title,
      viewport: [innerWidth, innerHeight],
      anchors: document.querySelectorAll("a[href]").length,
      videoLinks: Array.from(document.querySelectorAll("a[href]")).filter(a => /video|modal_id|group\\/topic|\\/p\\//.test(a.href)).slice(0, 5).map(a => ({ path: new URL(a.href).pathname, title: a.innerText.slice(0, 80), rect: [a.getBoundingClientRect().width, a.getBoundingClientRect().height] })),
      e2eNames: Array.from(new Set(Array.from(document.querySelectorAll("[data-e2e]")).map(e => e.getAttribute("data-e2e")))).slice(0, 50),
      frames: Array.from(document.querySelectorAll("iframe")).map(f => { try { const u = new URL(f.src); return u.origin + u.pathname; } catch { return "unknown"; } }),
    }); })()`);
    const image = await page.screenshot({ type: "jpeg", quality: 65 });
    if (image.byteLength > 3 * 1024 * 1024) throw Object.assign(new Error("窗口画面过大，请缩小专用浏览器后再预览"), { status: 413 });
    return { running: true, hasSession: false, message: `窗口预览：${new URL(page.url()).hostname}${new URL(page.url()).pathname}`, items: [], diagnostics, previewImage: `data:image/jpeg;base64,${Buffer.from(image).toString("base64")}` };
  }
  const hasSession = (await browser.cookies()).some((cookie) => platforms[platform].cookies.includes(cookie.name) && !!cookie.value && (cookie.domain.replace(/^\./, "") === (platform === "tieba" ? "baidu.com" : `${platform}.com`) || cookie.domain.endsWith(`.${platform === "tieba" ? "baidu.com" : platform + ".com"}`)) && (cookie.expires === -1 || cookie.expires > Date.now() / 1000));
  const message = hasSession ? "检测到本机登录会话；是否有效以平台当前页面为准" : "浏览器已打开，请在平台官网本人登录，完成后检查会话";
  if (action !== "capture" && action !== "search") return { running: true, hasSession, message, items: [] };
  if (!hasSession && ["douyin", "bilibili"].includes(platform)) throw Object.assign(new Error("尚未检测到登录会话，请先在专用浏览器完成本人登录"), { status: 409 });
  const pages = await browser.pages();
  const page = [...pages].reverse().find((item) => allowed(item.url(), platform));
  if (!page) throw Object.assign(new Error("请在专用浏览器打开对应平台的推荐、搜索或视频页面"), { status: 409 });
  if (action === "search") {
    const url = platform === "douyin" ? `https://www.douyin.com/search/${encodeURIComponent(keyword)}` : platform === "bilibili" ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}` : platform === "tieba" ? `https://tieba.baidu.com/f/search/res?ie=utf-8&kw=%E5%BC%B1%E6%99%BA&qw=${encodeURIComponent(keyword)}` : `https://www.douban.com/group/search?cat=1013&q=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector('a[href*="/video/"], a[href*="/group/topic/"], a[href*="/p/"]', { timeout: 12000 }).catch(() => {});
  }
  const pageUrl = page.url();
  const readings = await Promise.allSettled(page.frames().filter((frame) => allowed(frame.url(), platform) && !/\/(im|chat|message|passport|login|sso)(\/|$)/i.test(new URL(frame.url()).pathname)).map((frame) => frame.evaluate(`(() => {
    const roots = [document];
    for (const root of roots) { for (const element of root.querySelectorAll("*")) { if (element.shadowRoot && roots.length < 30) roots.push(element.shadowRoot); } }
    const queryAll = selector => roots.flatMap(root => Array.from(root.querySelectorAll(selector)));
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth) return true;
      const child = element.querySelector("img, video, [title], span");
      if (!child) return false; const box = child.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
    };
    const links = queryAll("a[href]").filter(link => visible(link) && !link.closest('[data-e2e=im-dialog], [data-e2e=conversation-item]')).map((link) => ({
      url: link.href,
      title: (link.getAttribute("title") || link.querySelector("[title]")?.getAttribute("title") || link.querySelector("img")?.alt || link.innerText || link.closest("li, [data-e2e=search-result]")?.innerText || "").trim().slice(0, 1000),
    }));
    const description = queryAll('[data-e2e="video-desc"], [data-e2e="video-card-desc"], h3').filter(visible).map((item) => item.innerText.trim().slice(0, 1000));
    const fragments = [];
    const mainRoots = queryAll('main, [role="main"], #douyin-right-container');
    const contentRoots = mainRoots.length ? mainRoots : roots.length > 1 ? roots.slice(1) : [document.body];
    for (const contentRoot of contentRoots) {
    const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && fragments.length < 80) {
      const node = walker.currentNode; const parent = node.parentElement;
      const text = node.textContent.trim();
      if (!parent || text.length < 8 || parent.closest("script, style, noscript, nav, header, aside, button, [role=navigation], [role=dialog], [data-e2e*=chat], [data-e2e=im-dialog], [data-e2e=conversation-item], [data-e2e=douyin-navigation]")) continue;
      const range = document.createRange(); range.selectNodeContents(node); const box = range.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth) fragments.push(text.slice(0, 1500));
    }
    }
    return { links, description, fragments, challenge: /安全验证|访问过于频繁|操作太频繁/.test(document.body.innerText.slice(0, 2000)) };
  })()`)));
  const snapshots = readings.filter((item) => item.status === "fulfilled").map((item) => item.value as { links: { url: string; title: string }[]; description: string[]; fragments: string[]; challenge: boolean });
  const raw = { links: snapshots.flatMap((item) => item.links), description: snapshots.flatMap((item) => item.description), fragments: snapshots.flatMap((item) => item.fragments), challenge: snapshots.some((item) => item.challenge) };
  if (raw.challenge) throw Object.assign(new Error("平台要求安全验证或限制访问，请在官网登录窗口本人处理后重试"), { status: 409 });
  const observedAt = new Date().toISOString();
  const normalizedLinks = raw.links.map((item) => { try { const url = new URL(item.url); const modal = url.searchParams.get("modal_id"); return platform === "douyin" && modal && /^\d+$/.test(modal) ? { ...item, url: `https://www.douyin.com/video/${modal}` } : item; } catch { return item; } });
  const pathPattern = platform === "tieba" ? /^\/p\/\d+$/ : platform === "douban" ? /^\/group\/topic\/\d+\/?$/ : /\/video\/(?:BV[a-zA-Z0-9]{10}|\d+)/;
  const candidates = normalizedLinks.filter((item) => allowed(item.url, platform) && pathPattern.test(new URL(item.url).pathname) && item.title.length > 3 && !(platform === "bilibili" && /^[\d\s.,:：万亿]+$/.test(item.title)));
  if (platform === "douyin" && /\/video\/\d+/.test(new URL(pageUrl).pathname) && raw.description[0]) candidates.unshift({ url: pageUrl, title: raw.description[0] });
  const unique = [...new Map(candidates.map((item) => {
    const url = new URL(item.url); url.search = ""; url.hash = "";
    return [url.href, { title: item.title, url: url.href }];
  })).values()].slice(0, 20);
  if (!unique.length && platform === "douyin" && raw.fragments.join("\n").length >= 180) {
    const title = action === "search" ? `“${keyword}”搜索页可见摘录` : "抖音当前页可见摘录";
    return { running: true, hasSession, observation: true, message: "未识别单条视频链接，保存了当前页可见文字供人工核对", items: [{ title, url: pageUrl, source: "抖音 · 页面摘录（非单条剧本）", summary: `只读当前屏幕可见文字；包含页面界面信息，未识别单条视频链接，不代表原剧本或字幕。\n${[...new Set(raw.fragments)].join("\n").slice(0, 16000)}`, collectedAt: observedAt, publishedAt: "", metric: "", kind: "search", collectorUrl: platforms[platform].url }] };
  }
  if (!unique.length) throw Object.assign(new Error("当前可见页面没有可读取的作品标题与标准链接。请手动打开搜索结果或具体作品后再收集；不会绕过验证码或平台限制"), { status: 422 });
  const summary = platform === "tieba" || platform === "douban"
    ? "专用浏览器当前可见的公开帖子线索；可能包含昵称与页面信息，不代表完整正文或热度榜，请打开来源核对。"
    : "本人登录网页当前可见的视频线索。推荐可能受账号和网页端影响，不等于手机推荐流或完整剧情；请核对原视频。";
  return { running: true, hasSession, message: `读取当前网页可见内容 ${unique.length} 条`, items: unique.map((item, index) => ({ ...item, source: `${platforms[platform].label} · 本人浏览器可见内容`, summary, collectedAt: observedAt, publishedAt: "", rank: index + 1, metric: "", kind: "search", collectorUrl: platforms[platform].url })) };
}
