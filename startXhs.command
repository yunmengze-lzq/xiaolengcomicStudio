#!/bin/zsh
set -e
cd "${0:A:h}/data/localServices/xhs"
if [[ ! -x ./xhsServer ]]; then
  print "请按 docs/comicStudioGuide.md 安装本人登录搜索服务。"
  exit 1
fi
umask 077
exec ./xhsServer -port 127.0.0.1:18060
