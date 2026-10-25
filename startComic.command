#!/bin/zsh
set -eu
comicRoot="$(cd "$(dirname "$0")" && pwd)"
comicBun="$(command -v bun || true)"
if [[ -z "$comicBun" ]]; then
  for comicCandidate in "$HOME"/.npm/_npx/*/node_modules/.bin/bun(N); do
    if [[ -x "$comicCandidate" ]]; then comicBun="$comicCandidate"; break; fi
  done
fi
if [[ -z "$comicBun" || ! -f "$comicRoot/build/server/index.js" || ! -f "$comicRoot/build/web/index.html" ]]; then
  echo "请先按 docs/comicStudioGuide.md 安装 Bun 并构建软件。"
  exit 1
fi
export TOONFLOW_SERVER_PORT="${TOONFLOW_SERVER_PORT:-3187}"
export TOONFLOW_SERVER_HOST="127.0.0.1"
export PATH="$(dirname "$comicBun"):$PATH"
if ! command -v codex >/dev/null 2>&1; then
  comicCodex="/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex"
  if [[ -x "$comicCodex" ]]; then export COMIC_CODEX_BIN="$comicCodex"; fi
fi
if curl --silent --fail --max-time 2 "http://127.0.0.1:$TOONFLOW_SERVER_PORT/api/comicStudio/health" >/dev/null; then
  open "http://127.0.0.1:$TOONFLOW_SERVER_PORT/#/comicStudio"
  exit 0
fi
echo "漫画工作台：http://127.0.0.1:$TOONFLOW_SERVER_PORT/#/comicStudio"
echo "关闭此终端会停止服务。"
cd "$comicRoot"
(sleep 2; open "http://127.0.0.1:$TOONFLOW_SERVER_PORT/#/comicStudio") &
exec "$comicBun" build/server/index.js
