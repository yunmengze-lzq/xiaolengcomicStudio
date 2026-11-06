export async function readSource(url: string, init: RequestInit = {}) {
  const localXhs = url.startsWith("http://127.0.0.1:18060/");
  if (localXhs && url.includes("/api/v1/feeds/")) {
    const login = JSON.parse(await readSource("http://127.0.0.1:18060/api/v1/login/status"));
    if (login?.data?.is_logged_in === false) throw Object.assign(new Error("小红书登录已失效或尚未登录，请在设置 → 平台与采集 → 小红书重新扫码，再重试搜索"), { status: 409 });
    if (login?.success !== true || login?.data?.is_logged_in !== true) throw Object.assign(new Error("小红书登录状态无法确认，请在设置检查连接后重试"), { status: 503 });
  }
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(url.startsWith("http://127.0.0.1:18060/") ? 90000 : 15000), redirect: "error" });
  } catch {
    throw Object.assign(
      new Error(url.startsWith("http://127.0.0.1:18060/") ? "小红书本地服务未连接或响应超时，请在设置 → 平台与采集检查连接" : "热点服务连接失败，请稍后重试"),
      { status: 502 },
    );
  }
  if (!response.ok) throw Object.assign(new Error(localXhs
    ? `小红书服务返回 ${response.status}：请在设置检查登录；若已登录，可能是平台验证、访问限制或搜索服务异常，请稍后重试`
    : `公开来源暂不可用（${response.status}），请尝试平台浏览器搜索`), { status: localXhs && response.status === 401 ? 409 : 502 });
  const reader = response.body?.getReader();
  if (!reader) throw Object.assign(new Error("热点服务返回空内容"), { status: 502 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4 * 1024 * 1024) throw Object.assign(new Error("热点响应过大"), { status: 502 });
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}
