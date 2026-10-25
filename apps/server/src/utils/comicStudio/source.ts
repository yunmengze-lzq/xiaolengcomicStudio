export async function readSource(url: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(url.startsWith("http://127.0.0.1:18060/") ? 90000 : 15000), redirect: "error" });
  } catch {
    throw Object.assign(
      new Error(url.startsWith("http://127.0.0.1:18060/") ? "小红书本地搜索服务未启动，请运行 startXhs.command" : "热点服务连接失败，请稍后重试"),
      { status: 502 },
    );
  }
  if (!response.ok) throw Object.assign(new Error(`热点服务暂不可用（${response.status}），可切换来源或使用本人登录搜索`), { status: 502 });
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
