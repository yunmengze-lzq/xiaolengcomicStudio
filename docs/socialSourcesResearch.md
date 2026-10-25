# 社交热点来源研究

研究日期：2026-10-22。仅查询公开资料与公开聚合接口；未读取账号凭据，未访问发布、点赞、评论或私信接口。

## 建议接入顺序

1. 抖音：先接 60s 的公开聚合接口，保留热度和关键词搜索链接，结合科普/娱乐关键词筛选。它提供综合热搜，不是科普专榜；筛选结果应标为「科普/娱乐候选」。
2. 小红书：60s 的 rednote 路由存在，但本次运行返回 HTTP 500，不能展示为已成功采集。可显示来源故障，并提供本人登录后的本地 xiaohongshu-mcp 关键词搜索。
3. 聚合热榜仅是选题线索。进入脚本前还要由用户补充、核对事实出处，尤其不能把平台关键词搜索页当作证实事实的原始报道。

以上建议基于下方源码与现场请求结果。

## 60s：抖音与小红书公开聚合

仓库约 5.8k stars（仅本次查询快照），采用 MIT；授权文件名为小写 `license`。README 说明公共主域名限额严格，适合开发调试，持续使用宜自部署。来源：[仓库](https://github.com/vikiboss/60s)、[MIT 授权](https://github.com/vikiboss/60s/blob/main/license)、[README](https://github.com/vikiboss/60s/blob/main/readme.md)。

### 抖音

请求：`GET https://60s.viki.moe/v2/douyin`。主代理在实际 Bun 运行时收到 HTTP 200；本研究进程一次 Python 请求为 403，说明公开实例存在客户端/网络与限流差异，不能保证每次成功。

成功响应中 `data` 为数组，每项：

```json
{
  "title": "热点词",
  "hot_value": 123456,
  "link": "https://www.douyin.com/search/关键词",
  "event_time": "来源格式的时间文本",
  "event_time_at": 0,
  "active_time": "来源更新时间",
  "active_time_at": 0
}
```

这段只表示结构，不是采集到的热点数据。代码链接是关键词搜索页，不是某条视频链接。`event_time_at` 在所查源码中把秒级原始值直接传给 `new Date`，不宜直接用于判断新闻发布时间；建议保留来源时间文本，并单独记录应用采集时间。来源：[douyin.module.ts](https://github.com/vikiboss/60s/blob/main/src/modules/douyin.module.ts)。

### 小红书

请求：`GET https://60s.viki.moe/v2/rednote`。2026-10-22 本机 Bun 请求实际结果：

```json
{"code":500,"message":"服务器出错了... Cannot read properties of undefined (reading 'map')","data":null}
```

预期成功项字段为 `rank, title, score, word_type, work_type_icon, link`，其中链接仍是关键词搜索页。源码上游依赖固定的旧 App 请求字段；本次不复制或重建这些字段。该接口可作为带故障提示的公开来源，不能作为已验证可用的唯一小红书渠道。来源：[rednote.module.ts](https://github.com/vikiboss/60s/blob/main/src/modules/rednote.module.ts)、[路由注册](https://github.com/vikiboss/60s/blob/main/src/router.ts)。

## NewsNow：抖音备选

项目 MIT。`GET https://newsnow.busiyi.world/api/s?id=douyin&latest` 在本研究的 Python、Node、Bun 请求均成功返回 200（Node/Bun 显式普通 User-Agent），但主代理的请求遇到 403，故只列为不稳定备选。来源：[MIT](https://github.com/ourongxing/newsnow/blob/main/LICENSE)、[项目 README](https://github.com/ourongxing/newsnow/blob/main/README.md)、[抖音源码](https://github.com/ourongxing/newsnow/blob/main/server/sources/douyin.ts)。

本次真实返回示例节选：

```json
{
  "status": "cache",
  "id": "douyin",
  "updatedTime": 1792673312532,
  "items": [
    {"id":"2708373","title":"台风蔷琵实时路径","url":"https://www.douyin.com/hot/2708373"},
    {"id":"2707429","title":"上海浙江福建等地有大到暴雨","url":"https://www.douyin.com/hot/2707429"}
  ]
}
```

这些标题仅证明热榜返回了对应词条，不等于我们证实了事件内容。该源保留热点详情页 URL，但映射未保留 `hot_value`。不要虚构热度数值。

## 小红书 MCP：本人登录后的只读搜索

[xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) 约 16.3k stars（查询快照），Apache-2.0。仓库明确要求首次手动登录。它提供关键词搜索和互动指标，可用于科普/娱乐热点发现，但不代表全站统一热榜。来源：[README](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/README.md)、[许可证](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/LICENSE)。

本次 GitHub latest release 为 `v2.5.5`，提供 macOS Apple Silicon 二进制，当前机器为 arm64，Docker 命令存在但 daemon 未运行。二进制方案无须 Docker：

- [服务端 darwin-arm64，约 16.4 MB](https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-mcp-darwin-arm64)
- [独立登录工具 darwin-arm64，约 11.7 MB](https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-login-darwin-arm64)

服务默认端口参数为 `:18060`；本机软件应显式使用 `-port 127.0.0.1:18060`。可通过 `AUTH_TOKEN` 启用本地服务鉴权，应用只代理下述只读/登录接口。该 release 启动时准备其浏览器运行时，下载和初始化是否成功还需要部署时验证。来源：[发行页](https://github.com/xpzouying/xiaohongshu-mcp/releases/tag/v2.5.5)、[入口参数](https://github.com/xpzouying/xiaohongshu-mcp/blob/v2.5.5/main.go)、[服务监听](https://github.com/xpzouying/xiaohongshu-mcp/blob/v2.5.5/app_server.go)。

### HTTP 请求和结构

接口来源：[routes.go](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/routes.go)、[handlers_api.go](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/handlers_api.go)、[service.go](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/service.go)、[types.go](https://github.com/xpzouying/xiaohongshu-mcp/blob/main/xiaohongshu/types.go)。以下是源码结构说明，尚不是已登录现场响应。

`GET /api/v1/login/status`

```json
{"success":true,"data":{"is_logged_in":false,"username":"可选昵称","user_id":"可选ID"},"message":"..."}
```

`GET /api/v1/login/qrcode`

```json
{"success":true,"data":{"timeout":"有效时间","is_logged_in":false,"img":"二维码图片数据"},"message":"..."}
```

二维码必须由用户本人扫码；不要访问或导出既有浏览器 Cookie。

`POST /api/v1/feeds/search`

```json
{"keyword":"科普","filters":{"sort_by":"最多点赞","publish_time":"一天内","note_type":"不限"}}
```

排序可选 `综合 / 最新 / 最多点赞 / 最多评论 / 最多收藏`，时间可选 `不限 / 一天内 / 一周内 / 半年内`。建议分别查「科普」和「娱乐」，保留查询词、排序与时间范围，避免把查询结果包装成全站热榜。

结果结构：

```json
{
  "success":true,
  "data":{
    "count":1,
    "feeds":[{
      "id":"笔记ID",
      "xsecToken":"该笔记访问参数",
      "modelType":"note",
      "noteCard":{
        "displayTitle":"标题",
        "type":"normal 或 video",
        "user":{"userId":"作者ID","nickname":"昵称"},
        "interactInfo":{"likedCount":"点赞量文本","commentCount":"评论量文本","collectedCount":"收藏量文本","sharedCount":"转发量文本"}
      }
    }]
  }
}
```

构建来源链接时使用 `https://www.xiaohongshu.com/explore/<id>?xsec_token=<编码后的xsecToken>&xsec_source=pc_search`。令牌是每条笔记公开访问所带参数，保留在本机来源链接，不应打印为调试日志。列表不提供可靠发布时间时，只记录采集时间；需要事实正文可进一步调用 `POST /api/v1/feeds/detail`，由真实详情补充，不能从标题生成伪事实摘要。

## 其他候选

- DailyHotApi：MIT，支持抖音热榜，但本次公共示例域名 TLS 失败；其源码保留热度和热点页链接。没有核到小红书源，故不以它满足小红书需求。[抖音实现](https://github.com/imsyy/DailyHotApi/blob/master/src/routes/douyin.ts)、[MIT](https://github.com/imsyy/DailyHotApi/blob/master/LICENSE)。
- TrendRadar：聚合和关键词过滤思路可参考，但当前 GPL-3.0，README 说明其平台数据使用 NewsNow，不能因此增加一个独立可靠的抖音上游。[README](https://github.com/sansan0/TrendRadar/blob/master/README-EN.md)、[GPL-3.0](https://github.com/sansan0/TrendRadar/blob/master/LICENSE)。
- RSSHub：当前 AGPL-3.0。小红书现有路由主要是用户笔记、收藏、专辑，并非全站热榜；存在浏览器依赖和反爬限制，不适合作为本需求第一入口。[小红书目录](https://github.com/DIYgod/RSSHub/tree/master/lib/routes/xiaohongshu)、[用户路由](https://github.com/DIYgod/RSSHub/blob/master/lib/routes/xiaohongshu/user.ts)、[许可证](https://github.com/DIYgod/RSSHub/blob/master/LICENSE)。

## 最小接入数据规范

应用候选至少保存 `platform`、`sourceName`、`sourceUrl`、`title`、`fetchedAt`、`category`，可选 `rank` 与来源原样热度文本。分类只能叫关键词筛选/候选分类；保持来源榜单顺序，筛选后不要重新编号冒充原始排名。来源失败应显示失败原因，不能静默把 RSS 内容换标签充当抖音或小红书热点。
