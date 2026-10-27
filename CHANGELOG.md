# Changelog

## 2026-10-27 · 漫画流稳定化与漫画质感

### 修复

- **角色设计直接生成报“参数错误”**
  前端把 `codexModel`、`quality` 也发给了 `/api/ai/media/generate`，被严格 schema 拒绝。现按供应商分别组装请求：ComfyUI / 在线图片 API 只发基础字段，Codex 才发 `codexModel`，Z-Image / Flux 才发 `quality`。
- **ComfyUI 自定义供应商在 VM 中缺少 Web API**
  在 `apps/server/src/utils/media/provider.ts` 的供应商 VM 上下文中补齐 `atob`、`btoa`、`crypto`、`FormData`、`File`、`Headers`、`Request`、`Response`、`structuredClone`、`performance`。
- **气泡文字没有垂直居中**
  改用 `textBaseline = "middle"`，按文字块整体高度居中；旁白条也做垂直居中。
- **拟声字可能被分格裁切**
  按文字宽度计算安全中心点，限制字号与水平范围。
- **角色页“先分析再生成”的硬门槛**
  参考图分析改为可选辅助；有参考图即可直接生成，文字只补充身份、动作和画风。

### 新增 / 调整

- **图像为主的角色与美术页**：参考图区块前置、默认展开；`generateCharacter` / `generateStylePreview` 不再要求 `referenceAnalysis` 才能生成。
- **ComfyUI 双角色区域 mask 工作流**：两个 `IPAdapterAdvanced` 分支，分别接角色 A / 角色 B，并通过 `ImageToMask` 做左右区域约束；第三张参考图保留占位节点。避免把猫参考图融合成“猫娘”。
- **漫画质感**：纸张纹理、暗角、分格阴影/黑边、气泡阴影/粗描边、感叹句爆炸气泡、旁白条、拟声词、页码和页脚作品名。
- **新增排版字段**：`layout.comicFlavor`、`panel.sfx`；分镜页和排版页可填写拟声词。
- **本地模型检测**：补“ChatGPT / Codex 内置生图”卡片，显示登录与 feature flag 状态，并提示 Windows CLI 的 `image_gen` 工具限制。

### 新生成示例

- 第一话《两分钟与一只袜子》：4/4 审稿通过。
- 新示例《年糕塞进包里的晴天》：4 格、4/4 审稿通过，使用双角色 mask 工作流和新排版效果。
- 两话都保留独立项目，不覆盖旧图。

### 验证

- Web `vue-tsc` 通过。
- Web 生产构建通过。
- Server 生产构建通过。
- 角色设计生成接口实测 HTTP 200。
- ComfyUI 双参考 mask 实测：女角色 + 橘猫同格，未融合成猫娘。
- 旧项目、新项目均为 4/4 审稿通过并成功导出 1080×1440 PNG + ZIP。

### 已知边界

- 双角色 mask 是固定左右区域；角色换边、三人以上或复杂交叠时仍需调整 mask。
- Codex CLI 在部分 Windows 版本上 `image_generation` 为 true，但会话内没有 `image_gen` 工具；当前默认仍使用本地 ComfyUI。要稳定调用 GPT-Image-2 需单独配置 OpenAI Images API。
- 自动化漫画任务目前完成了接口/状态机设计，尚未接入创作档案 UI 与定时 runner。设计见 [automationApi.md](docs/automationApi.md)。

### 跨电脑调试

- 部署说明：[deployment.md](docs/deployment.md)
- 工作流：[comfyWorkflow.json](docs/comfyWorkflow.json)
- Mask 与角色参考：[comfyMasks](docs/comfyMasks)
- 参考方案调研：[comicWorkflowReferences.md](docs/comicWorkflowReferences.md)
- 成本测算：[costModel.md](docs/costModel.md)
- 自动化任务设计：[automationApi.md](docs/automationApi.md)
- 漫剧流水线设计：[comicDramaPipeline.md](docs/comicDramaPipeline.md)

复制到新电脑时，需要按本机路径调整 `deploy/README.md` 中的 Bun、ComfyUI、Codex 路径；不要把 `data/`、`node_modules/`、`build/`、模型权重或账号状态提交到 Git。
