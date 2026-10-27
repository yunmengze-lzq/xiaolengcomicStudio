# 漫画稳定流工作流参考调研

调研日期：2026-10-27
目标：为“角色圣经 + 角色 LoRA + 双人分区 + OpenPose/Depth + 候选审稿 + 在线关键帧”寻找可借鉴的开源方案。
原则：不直接照搬单一仓库；把“可复用的设计”与“必须自己做的业务层”分开。

---

## 0. 结论先行

当前不建议把某一个 GitHub 工作流直接当成最终方案。更合理的组合是：

```text
角色设计/角色圣经
  → 角色 LoRA 或身份适配器（InstantID / PuLID / IPAdapter FaceID）
  → 双人分区（Saya Couple 思路 / IPAdapter attention mask / RegionalSampler）
  → OpenPose + Depth 控制构图
  → 每格 4 张候选 + 自动 QA + 人工审稿
  → 软件内排版、气泡、导出
  → 封面/关键格用在线多参考模型重做
```

原因：

- 角色一致性不是单一节点能解决的，至少需要“身份特征 + 服装/发型约束 + 构图控制 + 候选筛选”四层。
- 双人同格时，两个角色的参考图会互相污染，必须做区域分离或分区提示。
- 8GB 显存无法同时稳定跑“SDXL + 双人分区 + OpenPose + 高分辨率 + 批量候选”，需要分阶段或把关键帧交给在线模型。
- 在线模型在多人、手部、复杂道具和指令跟随上的上限明显更高，适合做最终关键帧，不适合做全部草稿。

---

## 1. 角色一致性：可参考的方案

### 1.1 ComfyUI IPAdapter Plus

- 仓库：<https://github.com/cubiq/ComfyUI_IPAdapter_plus>
- 许可：GPL-3.0
- 状态：作者 2025-04-14 起标记为 maintenance only
- 关键能力：IPAdapter、FaceID、Style/Composition、Attention Masking、示例工作流
- 适合借鉴：参考图如何按“身份/画风/构图”分工；attention mask 如何限定参考图作用区域
- 注意：README 自己把它类比为“1-image LoRA”，它擅长迁移主体/风格，不是精确锁脸。当前项目只接了第一张参考图，所以“角色一致性”实际上没有真正建立。

**结论：继续作为基础参考实现，但不要把它当成身份锁定方案。**

### 1.2 InstantID（SDXL）

- 仓库：<https://github.com/cubiq/ComfyUI_InstantID>
- 许可：Apache-2.0
- 关键能力：InsightFace + 人脸关键点 + ControlNet，SDXL 原生支持
- 适合借鉴：单角色脸部身份锁定；用一张清晰正脸图做 ID 参考
- 限制：只支持 SDXL；需要 antelopev2；对侧脸、遮挡、多人同格不稳
- 8GB 判断：比 IPAdapter Plus 更值得优先测试，但和 ControlNet、双人分区叠加会吃显存

### 1.3 PuLID

- 仓库：<https://github.com/cubiq/PuLID_ComfyUI>
- 许可：Apache-2.0
- 关键能力：身份保真与风格自由度之间可调；`fidelity` 参数控制“像参考”还是“像模型”
- 适合借鉴：角色脸不像时，用低 fidelity 拉回身份；想保留画风时提高风格自由度
- 限制：参考图质量非常关键；依赖 InsightFace + EVA CLIP；仍然是单角色为主

### 1.4 InfiniteYou（FLUX）

- 仓库：<https://github.com/bytedance/InfiniteYou>
- 许可：Apache-2.0
- 关键能力：FLUX 上的身份保持，InfuseNet 注入身份特征；有量化和 offload
- 适合借鉴：如果以后升级到 FLUX 系，这是比“硬贴脸”更自然的方向
- 限制：8GB 笔记本显存非常紧；FLUX 生态的 LoRA/ControlNet 与 SDXL 不通用

### 1.5 角色 LoRA：一致性提升最大的一步

- kohya_ss：<https://github.com/bmaltais/kohya_ss>（Apache-2.0）
- ai-toolkit：<https://github.com/ostris/ai-toolkit>（MIT）
- CharForge：<https://github.com/RishiDesai/CharForge>（MIT）

CharForge 的思路很值得抄：

1. 一张参考图
2. 自动生成角色设定图（character sheet）
3. 自动 caption
4. 训练角色 LoRA
5. 在不同场景中推理

但 CharForge README 写明至少 48GB 显存、60GB 内存、100GB 磁盘，不适合直接在这台 4060 Laptop 上跑。
**可借鉴流程，不建议本地硬装。** 8GB 机器更现实的是：

- SDXL LoRA，低 rank、低分辨率、gradient checkpointing，先做小规模试验
- 或把 LoRA 训练放到云 GPU
- 或先用 InstantID/PuLID + 固定 seed/候选筛选，暂不训练 LoRA

**优先级：角色 LoRA > 换更多 IPAdapter 节点 > 继续堆提示词。**

---

## 2. 双人同格：目前最值得参考的方案

### 2.1 Saya Couple Plus

- 仓库：<https://github.com/alphaziod/saya-comfy-couple-plus>
- 许可：GPL-3.0
- 状态：2026-10 仍在更新，但项目很新、star 少，属于“作者自用工作流公开”
- 核心设计：把提示词拆成四段
  - `MAIN`：世界、背景、光线、色彩
  - `ACTION`：两个人一起做什么
  - `P1`：角色 1 的身份和属性
  - `P2`：角色 2 的身份和属性
- 关键机制：区域条件 + 动态所有权 + crop-aware couple attention；2.0 不再修改 ComfyUI 核心文件
- 适合借鉴：**这是目前最贴近“双人漫画分格”的开源思路**，尤其是 MAIN/ACTION/P1/P2 的提示词分层
- 风险：GPL-3.0；测试环境是 16GB AMD，8GB 需要实测；项目新，稳定性未知

**建议：不直接装进生产，先单独拉一个实验环境跑 10 组双人图，验证 8GB 是否可行。**

### 2.2 IPAdapter attention masking / regional conditioning

IPAdapter Plus 自带 attention masking 示例，可以把参考图限制在 mask 区域。
适合：

- 左半区放角色 A，右半区放角色 B
- 背景不参考角色图
- 只让服装/发型参考生效，不让构图被参考图带跑

限制：需要手动画 mask；角色移动、交叠、遮挡时容易失效。

### 2.3 ComfyUI-Impact-Pack 的 RegionalSampler

- 仓库：<https://github.com/ltdrdata/ComfyUI-Impact-Pack>
- 许可：GPL-3.0
- 适合：把画面分成多个区域分别采样，再做融合
- 限制：区域接缝、光照统一、角色交叠需要调；不是“自动双人理解”

**结论：Saya Couple 的提示词分层 + IPAdapter mask 是最值得先试的组合；RegionalSampler 作为备选。**

---

## 3. 角色设计与“角色圣经”

### 3.1 VNCCS（Visual Novel Character Creation Suite）

- 仓库：<https://github.com/AHEKOT/ComfyUI_VNCCS>
- 定位：不是单个工作流，而是完整的角色资产生成与管理管线
- 能力：角色创建、风格库、表情/服装/姿势管理、角色卡、批量 sprite
- 可借鉴：
  - 角色不是一段提示词，而是一个可管理的数据对象
  - 角色、风格、姿势、服装分离
  - 先生成角色卡并确认，再进入剧情图
- 风险：节点包很大，依赖多；8GB 需要裁剪；主要是视觉小说 sprite，不是漫画分格

**建议：借鉴它的“角色资产管理”设计，不必整套安装。**

### 3.2 角色设计规范（建议写进项目数据）

每个固定角色至少包含：

- 角色 ID、名字、别名
- 年龄/体型/身高比例
- 脸型、眼睛、眉毛、鼻子、嘴
- 发型、发色、长度、分缝
- 服装：外套、内搭、裤子/裙子、鞋、配饰
- 标志物：耳钉、项圈、铃铛、包、纹身
- 色板：主色、辅色、强调色（ hex ）
- 三视图：正面/侧面/背面
- 表情表：平静/开心/惊讶/担心/生气/困倦
- 禁止项：不要出现的颜色、发型、配饰
- LoRA/embedding ID（如果有）
- 参考图顺序与用途（identity/style/previous）

这比“角色描述一段话”稳定得多。

### 3.3 设计锁定闸门

建议在生成分格前加一个硬闸门：

```text
角色卡未确认 → 不允许生成分格
角色三视图缺失 → 不允许生成分格
角色 LoRA/ID 参考未绑定 → 只能出草稿
```

现在软件有角色快照，但没有“设计锁定”的状态机；这是可以补的产品层能力。

---

## 4. 分镜、宫格与排版

### 4.1 StoryDiffusion

- 仓库：<https://github.com/HVision-NKU/StoryDiffusion>
- 许可：Apache-2.0
- 论文：<https://arxiv.org/abs/2405.01434>
- 关键能力：Consistent Self-Attention，在长序列图像之间共享注意力，提升角色一致性；官方带 Comic Generation demo
- 适合借鉴：**“一次生成一组图，而不是一张一张独立生成”** 的思路
- 限制：2024 年后更新少；不是 ComfyUI 原生节点；需要多提示词一起跑；对分镜布局控制有限

**建议：作为“序列一致性”的研究参考，不作为第一版生产依赖。**

### 4.2 DiffSensei

- 仓库：<https://github.com/jianzongwu/DiffSensei>
- 论文：CVPR 2025
- 关键能力：多模态 LLM + 扩散模型生成漫画分格；一张角色图适配多种 appearance；支持 64–2048 边长
- 适合借鉴：角色图 + 文本指令 + 分格生成的架构；角色 bank 的概念
- 限制：偏黑白漫画；需要 24GB 4090（无 MLLM 版本）；许可证未明确标注，商用需谨慎

### 4.3 DreamingComics（CVPR 2026）

- 论文：<https://www.openaccess.thecvf.com/content/CVPR2026/html/Kwon_DreamingComics_A_Story_Visualization_Pipeline_via_Subject_and_Layout_Customized_CVPR_2026_paper.html>
- 关键点：
  - 用视频 DiT 的时空先验做故事可视化
  - RegionalRoPE：按目标布局重新索引位置编码
  - masked condition loss：把每个主体约束在指定区域
  - LLM layout generator：从自然语言脚本生成漫画布局
- 论文报告：角色一致性 +29.2%，风格相似度 +36.2%
- 适合借鉴：**布局感知 + 区域约束 + 视频模型时序一致性**，这是未来“漫画→动画”统一管线的方向
- 限制：研究代码/模型，不是即插即用工作流

### 4.4 ComfyUI-MOSS-Storyboard

- 仓库：<https://github.com/ZenHG/ComfyUI-MOSS-Storyboard>
- 许可：MIT
- 能力：3/4/6/8/9 格故事板，一次生成整张或逐格生成后拼版；每格独立描述；自动裁切
- 适合借鉴：**“整张画布 + 每格坐标 + 自动裁切”** 的数据结构；逐格模式可提高跨格一致性
- 限制：依赖 MOSS-Image；项目很新；布局遵循度官方标 experimental

### 4.5 PanelForge / AI Comic Factory / Comic Studio AI

- PanelForge：<https://github.com/lisaks/comfyui-panelforge>
  Page → Row → Frame 的层级布局，适合借鉴“页面结构”数据模型；许可证未标注，谨慎。
- AI Comic Factory：<https://github.com/jbilcke-hf/ai-comic-factory>
  LLM + SDXL 生成漫画，已归档；Apache-2.0；适合看“故事→分镜→气泡”的编排。
- Comic Studio AI：<https://github.com/RobinaMirbahar/Comic-Studio-Ai>
  多 Agent 故事、自动气泡、7 语言；Apache-2.0；适合看“对话式修改 + 气泡排版”的产品交互。

**结论：排版层不必重造。现有软件已经有气泡/字体/导出；优先补“分格布局数据结构”和“逐格裁切”，而不是换一套排版引擎。**

---

## 5. 姿态与构图控制

### 5.1 OpenPose Editor

- 仓库：<https://github.com/huchenlei/ComfyUI-OpenPose-Editor>
- 许可：GPL-3.0
- 能力：加载/编辑 OpenPose JSON，再送回 ControlNet
- 适合：双人互动、指定谁举手、谁拿包、谁指向哪里
- 限制：2024 年后更新少；需要 ControlNet Aux

### 5.2 ControlNet Aux

- 仓库：<https://github.com/Fannovel16/comfyui_controlnet_aux>
- 许可：Apache-2.0
- 能力：OpenPose、Depth、Canny、Lineart、Normal 等预处理器
- 适合：从参考图提取姿态/深度，或从 3D/草图生成控制图

### 5.3 Advanced ControlNet

- 仓库：<https://github.com/Kosinkadink/ComfyUI-Advanced-ControlNet>
- 许可：GPL-3.0
- 能力：按 timestep/latent 调度 ControlNet 强度、attention mask、soft weights
- 适合：前期强姿态约束、后期放松让模型补细节

**建议工作流：OpenPose 锁动作 → Depth 锁空间/前后景 → IPAdapter/InstantID 锁身份 → KSampler 出图 → FaceDetailer/手部修复。**

---

## 6. 修脸、修手与自动 QA

- ComfyUI-Impact-Pack：<https://github.com/ltdrdata/ComfyUI-Impact-Pack>（GPL-3.0）
  - FaceDetailer、手部/人物检测、SAM2、SEGS、RegionalSampler
- ComfyUI-Impact-Subpack：<https://github.com/ltdrdata/ComfyUI-Impact-Subpack>
  - Ultralytics 检测模型，face/person/clothing detector
- InsightFace：<https://github.com/deepinsight/insightface>
  - ArcFace embedding，可做人脸相似度自动评分
- PaddleOCR / MangaOCR
  - 检查生成图里是否出现文字/气泡，避免和后期排版冲突

建议的自动 QA 指标：

| 指标 | 方法 | 阈值建议 |
| --- | --- | --- |
| 角色数量 | 人物检测 + 分割 | 与分镜设定一致 |
| 人脸相似度 | ArcFace cosine | 先测基线，再定阈值 |
| 服装颜色 | 主色聚类/区域采样 | 与角色卡色板比对 |
| 手部/肢体 | 姿态估计 + 规则 | 人工复核优先 |
| 文字/气泡 | OCR + 视觉检测 | 必须为 0 |
| 连续性 | 与上一格 CLIP/SSIM + 人工 | 场景/道具/服装一致 |
| 构图 | OpenPose/Depth 与目标对比 | 关键点距离阈值 |

注意：自动 QA 只能筛掉明显废图，不能替代人工审稿。

---

## 7. 在线关键帧：适合“封面、双人互动、复杂道具”

官方入口（能力、价格、可用地区以文档为准）：

- Nano Banana Pro / Gemini 3 Pro Image
  <https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/>
- Seedream 5.0 Pro / BytePlus ModelArk
  <https://docs.byteplus.com/en/docs/Byteplus_LAS/seedream-image-generation>
- Qwen Image 3.0 / 阿里云 Model Studio
  <https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference>
- GPT-image-2 / OpenAI
  <https://platform.openai.com/docs/models/gpt-image-2>

适合交给在线的格：

- 封面/首图
- 双人互动、三人以上同格
- 手、道具、复杂动作
- 需要画面内文字的封面（如果模型支持）
- 最终发布的关键格

不适合交给在线的格：

- 大量草稿/构图探索（成本高）
- 需要严格复现的批量变体（在线模型 seed/版本不可控）
- 含敏感/未公开角色资产的图（隐私与条款）

---

## 8. 推荐的参考架构

```text
┌─────────────────────────────────────────────┐
│ 1. 角色圣经 / 视觉圣经                       │
│    角色卡、三视图、表情、色板、道具、禁用项    │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 2. 身份层                                    │
│    InstantID / PuLID / IPAdapter FaceID       │
│    + 角色 LoRA（固定角色）                    │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 3. 构图层                                    │
│    OpenPose + Depth + ControlNet             │
│    双人分区：Saya Couple 思路 / IPAdapter mask│
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 4. 生成层                                    │
│    SDXL/Illustrious 本地草稿                  │
│    每格 4 候选 + 固定 seed + 参数记录          │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 5. 修复与 QA                                 │
│    FaceDetailer、手部 inpaint、ArcFace、OCR   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 6. 关键格在线重做                             │
│    Nano Banana Pro / Seedream 5 / Qwen Edit  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 7. 排版/审稿/导出                             │
│    气泡、旁白、字体、版本、发布包              │
└─────────────────────────────────────────────┘
```

---

## 9. 8GB 显存的落地顺序

### Phase 0：先量化现状（1 天）

- 用 6 个固定测试分镜，覆盖：单人、双人、动作、近景、道具、复杂背景
- 记录：身份相似度、服装一致、姿态遵循、道具出现率、手部、耗时、峰值显存
- 当前 DreamShaperXL + IPAdapter 作为 baseline

### Phase 1：本地一致性（3–5 天）

1. 补角色三视图/表情图
2. 接 InstantID 或 PuLID（先单人）
3. 接 OpenPose/Depth（先单人动作）
4. 每格 4 候选 + 人工选图
5. 先不做双人分区，避免显存爆炸

### Phase 2：双人分区（3–5 天）

1. 试 Saya Couple 的 MAIN/P1/P2 提示词分层
2. 或 IPAdapter attention mask 左右分区
3. 对比：身份、服装、交叠、背景、手部
4. 如果 8GB 跑不动，双人关键格转在线

### Phase 3：角色 LoRA（1–2 周，含素材）

1. 每个固定角色 20–30 张多角度图
2. 云端或本地低 rank 训练
3. 用固定测试集对比 LoRA 前后
4. 只对“ recurring 角色”训练，不要给每个路人训练

### Phase 4：在线关键帧（按需）

1. 封面、双人互动、复杂道具
2. 统一角色卡和提示词模板
3. 在线结果回流到项目 assets，保留 provenance

### Phase 5：动态漫画/动画（后续）

1. 先做 2.5D 动态漫画（推拉、视差、气泡动效、配音）
2. 再对 1–2 个 hero shot 做图生视频
3. 不要整集直接上视频模型

---

## 10. 许可证与风险

| 组件 | 许可 | 风险 |
| --- | --- | --- |
| ComfyUI_IPAdapter_plus | GPL-3.0 | 闭源分发需注意；维护模式 |
| ComfyUI_InstantID | Apache-2.0 | 较安全；SDXL only |
| PuLID_ComfyUI | Apache-2.0 | 较安全；参考图质量敏感 |
| InfiniteYou | Apache-2.0 | 较安全；8GB 紧张 |
| Saya Couple Plus | GPL-3.0 | 新项目；GPL 分发风险 |
| StoryDiffusion | Apache-2.0 | 研究代码；更新少 |
| DiffSensei | 未标注 | 商用需联系作者/确认许可 |
| ComfyUI-Impact-Pack | GPL-3.0 | 闭源分发需注意 |
| ControlNet Aux | Apache-2.0 | 较安全 |
| Advanced ControlNet | GPL-3.0 | 闭源分发需注意 |
| kohya_ss | Apache-2.0 | 较安全 |
| ai-toolkit | MIT | 较安全 |
| MOSS-Storyboard | MIT | 较安全；项目新 |
| PanelForge | 未标注 | 谨慎 |
| AI Comic Factory | Apache-2.0 | 已归档，参考为主 |
| Comic Studio AI | Apache-2.0 | 参考为主 |

另外还要看：

- 基础模型许可证（DreamShaperXL、Illustrious、FLUX.1/2、Qwen-Image 等各自不同）
- IP-Adapter/InstantID/PuLID 模型权重许可
- 在线模型的服务条款、数据留存、商用授权
- 角色参考图的版权/肖像权

---

## 11. 建议的下一步 benchmark

不要先“装一堆节点”。先做一个 6 格固定测试集：

1. 单人正面半身
2. 单人全身动作
3. 双人对话
4. 双人肢体互动
5. 手拿道具特写
6. 复杂背景+连续上一格

每个方案跑同样 6 格，记录：

- 人脸相似度（ArcFace）
- 服装颜色一致率
- 角色数量正确率
- 姿态关键点误差
- 道具出现率
- 文字/气泡误生成率
- 单格耗时、峰值显存
- 人工评分（1–5）

候选方案：

- A：当前 DreamShaperXL + IPAdapter（baseline）
- B：SDXL + InstantID/PuLID + OpenPose/Depth + 4 候选
- C：Saya Couple / regional IPAdapter 双人方案
- D：Nano Banana Pro / Seedream 5 在线关键帧
- E：B + 角色 LoRA

只有 benchmark 通过，才把方案写进正式工作流。不要用“某一两张好看”代替稳定性验证。
