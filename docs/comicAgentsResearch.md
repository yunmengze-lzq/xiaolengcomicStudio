# 漫画脚本与美术工作流借鉴

核查日期：2026-10-22。只读取项目维护方的 README、源码、许可证及 GitHub 仓库元数据；没有安装新技能、模型或依赖。下列“建议”是针对本工作台的设计判断，不代表上游已经替本项目实现了相关能力。

## 选择结论

保留现有 Toonflow 与静态漫画工作台，借鉴三种成熟做法：Toonflow 的导演、编剧、审稿职责；AI Comic Factory 的逐格结构化脚本与独立文字层；StoryDiffusion 的角色身份、场景动作、统一风格分离。现有 `styleSnapshot`、`castSnapshot`、`action/dialogue/caption` 已适合承载这些做法，无需更换框架。

| 项目 | 当日 GitHub stars | 源码许可 | 本项目用途 |
| --- | ---: | --- | --- |
| [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app) | 18,948 | [MIT](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/LICENSE) | 复用现有文字分镜职责与连续性审稿 |
| [StoryDiffusion](https://github.com/HVision-NKU/StoryDiffusion) | 6,485 | [Apache-2.0](https://github.com/HVision-NKU/StoryDiffusion/blob/main/LICENSE) | 借鉴角色、场景、风格的输入组织方式 |
| [AI Comic Factory](https://github.com/jbilcke-hf/ai-comic-factory) | 1,366 | [Apache-2.0](https://github.com/jbilcke-hf/ai-comic-factory/blob/main/LICENCE.md) | 借鉴分格 JSON 与风格模板；仓库已归档，适合作为参考 |

星数及归档状态来自当日读取的第一方仓库 API：[Toonflow](https://api.github.com/repos/HBAI-Ltd/Toonflow-app)、[StoryDiffusion](https://api.github.com/repos/HVision-NKU/StoryDiffusion)、[AI Comic Factory](https://api.github.com/repos/jbilcke-hf/ai-comic-factory)。星数不是质量保证。

这些源码许可允许商业使用，复制实质源码时仍需保留相应版权、许可及通知，并遵守修改标注等条件。源码许可证不自动覆盖另行下载的模型、参考素材或生成服务。当前建议仅移植工作流思想、编写本项目自己的提示词，不复制上游品牌或角色风格预设。

## 脚本：优先复用 Toonflow 自带团队

上游已经提供 [director.md](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/packages/teams/storyboardTeam/members/director.md)、[writer.md](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/packages/teams/storyboardTeam/members/writer.md)、[reviewer.md](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/packages/teams/storyboardTeam/members/reviewer.md) 和 [continuity.md](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/packages/teams/storyboardTeam/knowledge/continuity.md)。导演负责范围与整合，编剧把剧情转成可见镜头，审稿检查遗漏和衔接；连续性明确涵盖衣着、持物手、道具数量、视线和光线。这些是文字分镜职责，不是图像已经生成的证明。

建议先将这些职责压缩进现有一次 Codex/API 脚本调用，内部依序思考并纠错，最终只返回当前 Zod JSON。这样不增加三次请求的延迟，也不把单次调用宣传成三个独立运行的 agent。未来确需独立审稿模型时，再增加第二次真实调用及其审稿记录。

可移植到当前 `plan.ts` 的提示词要求：

1. 编剧：提取材料可支持的事实、未核实内容和原创角色演绎。科普按“疑问—可视化解释—适用边界—结论”组织；娱乐按“铺垫—误会或冲突—反转—收束”组织。后两种结构是本项目建议，并非上游原文。
2. 导演：每格只表现一个主要可见动作；用景别和动作表达，不把抽象结论写成无法画出的画面。相邻格保持角色服装、道具、位置和时间可理解；变化需要交代。
3. 审稿：返回前检查事实与虚构是否分开、是否虚构引语、因果是否成立、角色 ID 是否存在、每格是否可画、对白是否过长，以及图中文字是否已转移至独立 `dialogue/caption`。修正后只输出合法 JSON。

现有 schema 无需扩展即可实现第一版：`title/story/panels[].shot/action/dialogue/caption/characters`。不要为了模仿多 agent 先增加复杂状态机。

## 分格与文字：借鉴 AI Comic Factory 的边界

上游 [getSystemPrompt.ts](https://github.com/jbilcke-hf/ai-comic-factory/blob/main/src/app/queries/getSystemPrompt.ts) 将每格的绘图指令、对白、旁白分为独立 JSON 字段，并要求交代衣着、颜色、地点和光线。现有 `action/dialogue/caption` 与其对应，继续让 Canvas 负责中文文字，图像服务负责无字画面。

其 [presets.ts](https://github.com/jbilcke-hf/ai-comic-factory/blob/main/src/app/engine/presets.ts) 将故事写作取向、图像正向提示与负向提示分开，是可借鉴的数据组织方式。不要照搬其中艺术家或作品名称；使用原创的线条、色板、阴影和比例描述即可。

不借鉴 [getStoryContinuation.ts](https://github.com/jbilcke-hf/ai-comic-factory/blob/main/src/app/queries/getStoryContinuation.ts) 在 LLM 失败后返回相似分镜的降级方式。本工作台应显示真实错误，保留用户脚本，让用户重试。

## 美术：借鉴 StoryDiffusion 的输入结构

[style_template.py](https://github.com/HVision-NKU/StoryDiffusion/blob/main/utils/style_template.py) 将固定风格模板、每帧正向内容和负向要求分开。[gradio_app_sdxl_specific_id_low_vram.py](https://github.com/HVision-NKU/StoryDiffusion/blob/main/gradio_app_sdxl_specific_id_low_vram.py) 分别处理角色描述、逐帧场景、引用角色和风格，并提供参考图路径。这支持本项目采用“固定身份 + 固定风格 + 每格变化”的输入结构。

建议现有风格库至少保存以下内容，直接写入已有 `description/avoid/refs`，无需新增字段：

- 视觉约束：线条粗细、限定色板、平涂或渐变、阴影层次、人物头身比、背景细节密度。
- 角色约束：固定发型、脸型、眼镜、服装颜色和显著配件；优先用同一角色设定图，并明确参考图顺序与用途。
- 禁止项：与风格冲突的写实质感、额外角色、错误服饰、画中文字和水印。负向文字是生成要求，不能保证模型完全遵守。
- 更新：发布新风格版本，旧作品继续使用原快照；重绑定新版本后将已有图标为待重生成。保留参考图来源和说明。

原创科普风格示例（本项目建议）：暖白纸底、深墨绿清晰轮廓、珊瑚橙重点色、薄荷绿辅助色、二维平涂、单层柔和阴影、三头身原创角色、简化背景、上方留白排字；避免写实照片、三维材质、密集背景和画内文字。

重要实现边界：[README](https://github.com/HVision-NKU/StoryDiffusion/blob/main/README.md) 描述的是专门的 consistent self-attention 推理，当前实现至少需要 3 条提示、建议 5–6 条，其低显存版本是在 24GB GPU 上测试并预计需要超过 20GB GPU 显存。现有工作台给通用图像服务传参考图，并不等于已经接入这套 attention 算法。本次不引入这套 GPU 推理栈；用固定参考图生成并逐格目视审阅，才是当前可验证的一致性路径。

## 当前应验证的结果

用真实热点来源生成一篇结构化脚本，建立原创风格与角色设定图，至少生成两格实际新图；检查角色服装、配色、画风和主要动作，再使用程序排字并导出。记录实际调用方式、参考图、提示词和生成结果。模型输出通过 JSON 校验并不代表新闻事实或美术一致性已经通过审稿。
