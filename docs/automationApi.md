# 自动化漫画任务 API 设计

日期：2026-10-27
状态：接口与状态机设计稿；CRUD/调度器/runner 尚未接入应用。
目标：把“漫画生产”做成可创建、可定时、可重试的任务，而不是漫剧/视频流水线。

---

## 1. 产品语义

一个自动化任务 = 一个**长期连载漫画项目**的每日/每周生产任务。

```text
任务
  → 新建一期
  → 生成选题/脚本/分镜
  → 生成角色与分格图
  → 排版
  → 停在“待审稿”
  → 人工审稿通过
  → 导出发布包
```

默认**不自动发布**。
自动任务可以自动推进到 `review_ready`，但审稿和发布保留人工闸门；用户可以在任务里自行选择：

- `autoApprove: false`：停在待审稿（默认）
- `autoApprove: true`：自动通过审稿
- `autoExport: true`：通过后自动导出 ZIP
- `autoPublish: false`：仍不自动发平台

入口位置：**创作档案 → 自动化任务**，与“创作偏好 / 修改记录 / 素材库”并列。

---

## 2. 任务状态机

```text
scheduled
  → queued
  → planning        （Codex / 文本 API 生成脚本与分镜）
  → drawing         （逐格出图）
  → lettering       （排版/气泡）
  → review_ready    （等待人工审稿）
  → approved        （人工通过）
  → exported        （导出 ZIP）
  → failed          （记录失败步骤与原因）
```

规则：

- 同一任务同一时间只允许一个 run。
- 失败从失败步骤继续，不整集重跑。
- 每次 run 写 `runId`、开始/结束时间、模型、seed、成本、错误。
- `review_ready` 不是完成；必须人工 `approve` 后才允许导出。
- 定时任务只创建/推进到 `review_ready`，不自动发布。

---

## 3. HTTP API

建议独立本地服务，端口 `3190`，与应用 `3187` 分开，避免把调度器塞进 Web 请求进程。

### 创建任务

```http
POST /api/automation/tasks
Content-Type: application/json

{
  "name": "周一生活漫画",
  "projectDirectory": "C:\\xiaoleng\\data\\workspaces\\comic...",
  "schedule": { "kind": "daily", "time": "08:00", "timezone": "Asia/Shanghai" },
  "topic": {
    "mode": "original",
    "prompt": "原创生活轻喜剧，猫咪与上班族的早晨",
    "direction": "温柔治愈，四格，反转收束"
  },
  "styleId": "styleMorning",
  "characterIds": ["character1", "character2"],
  "panelCount": 4,
  "autoApprove": false
}
```

返回：

```json
{ "id": "task_xxx", "status": "scheduled", "nextRunAt": "2026-10-28T00:00:00.000Z" }
```

### 任务列表

```http
GET /api/automation/tasks
GET /api/automation/tasks/:id
```

### 立即运行

```http
POST /api/automation/tasks/:id/run
```

用于测试，不改变定时计划。

### 暂停/恢复

```http
PATCH /api/automation/tasks/:id
{ "enabled": false }
```

### 审稿通过 / 导出

```http
POST /api/automation/tasks/:id/approve
POST /api/automation/tasks/:id/export
```

### 运行记录

```http
GET /api/automation/tasks/:id/runs
```

---

## 4. 调度器

- 服务启动时加载 `data/automation/tasks.json`
- 每 30 秒检查一次 `nextRunAt`
- 到点后：
  1. 抢任务锁（文件锁 / 内存锁）
  2. 创建 `runId`
  3. 调应用 API 推进
  4. 写运行记录
  5. 计算下一次 `nextRunAt`
- 应用未启动时任务进入 `failed`，记录“应用未启动”，不丢任务
- 任务可配置 `retry`: 最多 2 次，指数退避
- 时区使用 `Asia/Shanghai`，避免 UTC 偏移

---

## 5. Runner 步骤

Runner 是一个独立 Bun/Node 进程，调用现有应用 API：

```text
1. GET  /api/comicStudio/health
2. POST /api/comicStudio/create                创建新一期项目
3. POST /api/comicStudio/plan                  生成脚本/分镜
4. POST /api/ai/media/generate                 逐格出图（角色图 + 上一格）
5. 写 comicProject.json                        生成 episode / panels / fingerprints
6. （可选）调用排版页/导出脚本                  生成 PNG/ZIP
7. 更新任务状态为 review_ready
```

关键点：

- 复用现有 `episode.json` 数据结构和 `generationFingerprint` / `approvalFingerprint`。
- 出图参考顺序固定：角色 A、角色 B、上一格、风格图。
- 图像为主：角色图直接作为条件，文字只补充动作/场景。
- 每格生成 2–4 候选；Runner 只保存候选，不自动采用。
- 失败只重跑当前格，保留已成功图片。
- 成本记录到 `run.cost`，方便按天核算。

---

## 6. 数据模型

```ts
type AutomationTask = {
  id: string;
  name: string;
  enabled: boolean;
  projectDirectory: string;
  schedule: { kind: "daily"; time: string; timezone: string };
  topic: { mode: "original" | "source"; prompt: string; direction: string; sourceUrl?: string };
  styleId: string;
  characterIds: string[];
  panelCount: number;
  autoApprove: boolean;
  autoExport: boolean;
  autoPublish: boolean;
  status: "scheduled" | "queued" | "planning" | "drawing" | "lettering" | "review_ready" | "approved" | "exported" | "failed";
  lastRunAt?: string;
  nextRunAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

type AutomationRun = {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string;
  status: string;
  steps: { name: string; status: string; startedAt: string; finishedAt?: string; error?: string }[];
  cost?: { textTokens?: number; images?: number; videos?: number; usd?: number };
};
```

---

## 7. 安全与边界

- 只监听 `127.0.0.1`
- 要求 `x-toonflow-workspace: 1` + 本机 Origin，复用现有 workspace 校验
- 任务只能操作允许的 `data/workspaces/**` 目录
- 不把 API Key 写进任务 JSON；用环境变量或现有 settings
- 定时任务默认不自动发布
- 失败重试要幂等，避免重复生成同一格

---

## 8. 与“漫剧”的区别

| | 自动化漫画 | 漫剧 |
| --- | --- | --- |
| 产出 | PNG 漫画页 + ZIP | MP4 动态视频 |
| 调度 | 每天/每周任务 | 每条视频任务 |
| 核心 | 剧本、角色、分格、排版 | 时间轴、TTS、镜头运动、合成 |
| 成本 | 低 | 高（视频按秒计费） |
| 建议 | 先做 | 后续再做 |

---

## 9. 建议实现顺序

1. 任务 CRUD + 本地调度器（端口 3190）
2. Runner 先推进到 `planning`，验证定时创建一期
3. 接 `drawing`：复用现有出图 API
4. 接 `review_ready`：项目出现在工作台，人工审稿
5. 最后接 `export`：Playwright/服务端渲染导出
6. 再考虑 `autoApprove` / `autoPublish`（默认关闭）

---

## 10. 需要确认的产品决策

- 自动任务停在 `review_ready`，还是允许 `autoApprove` 后自动导出？
- 任务每天新建一期，还是在同一期上继续推进未完成步骤？
- 选题是固定 prompt、RSS/热榜，还是由 Codex 每天自拟？
- 角色和画风是复用现有项目，还是允许任务自动新建角色？

默认建议：

- 复用现有项目的角色/画风
- 每天新建一期
- 停在 `review_ready`
- 选题由任务 prompt + 可选热榜提供
