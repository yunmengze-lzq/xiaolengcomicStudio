# 小冷漫画图片工作流与本地安装调研

核查日期：2026-11-05。范围：官方文档、官方仓库与当前源码；未安装软件、下载模型、运行推理或测量性能。网上文档为滚动版本，尤其 InvokeAI 的 v7 文档不应直接视为用户已安装版本的能力。以下把事实、设计建议和待验证项分开。

## 结论

建议保留小冷漫画的角色、分镜和排版入口，借鉴 InvokeAI 的画布操作方式，继续复用现有 ComfyUI 接口执行经过验证的模板。普通用户先走官方桌面安装器；只有需要多个生成软件共享模型时才引导 Stability Matrix。第一阶段不自建 Python/GPU 环境管理器，也不让普通用户填写节点 ID。

固定角色需要“正式参考资产 → 本格人物与区域绑定 → 候选审核 → 遮罩局部修复”。参考图、区域条件、ControlNet 和 seed 都不能单独保证身份、衣服、数量和动作归属完全正确。若产品承诺未修改区域像素不变，需要在输出端将原图与局部结果按明确遮罩合成，而不是只相信生成提示词。

## 当前项目可复用的部分

- [model.ts](../apps/web/src/pages/comicStudio/model.ts) 已有角色快照、角色引用顺序、表演信息、正式参考校验与历史图；无需重建角色管理。[useStudio.ts](../apps/web/src/pages/comicStudio/useStudio.ts) 已记录部分素材的 prompt、model、seed 和生成时间，也已有分格历史。
- [comfyLocal.ts](../packages/providers/src/media/comfyLocal.ts) 已上传多张参考图、提交 `/prompt`、查询指定任务历史并取回图片；参考节点不足会报错。当前仍需手填 API JSON 和节点 ID，固定 768×1024，返回第一个图片输出，最长等待四分钟；没有在此适配器中建立角色区域、修复遮罩或完整生成记录。断开等待也不等于后端任务已停止。
- [localRuntime.vue](../apps/web/src/pages/comicStudio/localRuntime.vue) 目前负责探测已安装环境，不负责安装。已有 MLX Z-Image 和 klein 路径应保留为独立能力，不能因引入 ComfyUI 就重复下载同一批模型。
- 旧报告中的硬件与质量判断不是本次实测结论。特别是“某显存一定不能跑”“在线上限明显更高”“LoRA 一定最有效”，不作为无条件事实沿用。

## 成熟方案比较

| 维度 | ComfyUI | InvokeAI | Stability Matrix |
| --- | --- | --- | --- |
| 定位 | 可编排的执行引擎，适合由小冷漫画隐藏节点复杂度 | 可直接操作画布的创作工具，适合借鉴交互 | 环境、软件与模型管理入口 |
| 多角色参考 | 需要模型及工作流实际消费各参考；IPAdapter Plus 有 attention masking 示例，但属于自定义节点 | 区域可以附独立 prompt 与参考图；区域参考支持范围随模型而异 | 安装管理器本身不提供人物身份保证，具体能力取决于所启动软件 |
| 区域与局修 | 官方提供 mask editor、inpaint 工作流 | 区域引导、控制图、重绘遮罩为不同图层；生成候选经接受后才进入画布 | 可管理 ComfyUI、InvokeAI，不能替代各自的编辑工作流 |
| seed、历史与队列 | 服务有任务 ID、历史、队列、WebSocket 进度 | 有固定/随机 seed、图库参数复用、队列及候选选择 | Inference 项目与图片 metadata 可保存/载入状态 |
| 模板与安装 | 内置模板关联所需模型，能提示缺失项；有官方桌面版 | Launcher 管环境，Model Manager 管模型 | 内嵌 Git/Python，共享模型目录，下载可暂停续传 |

表格事实来源：[ComfyUI 服务接口](https://docs.comfy.org/development/comfyui-server/comms_routes)、[官方局部重绘](https://docs.comfy.org/tutorials/basic/inpaint)、[模板](https://docs.comfy.org/interface/features/template)、[IPAdapter Plus 作者仓库](https://github.com/cubiq/ComfyUI_IPAdapter_plus)、[InvokeAI 画布](https://invoke-ai.github.io/InvokeAI-7/users-guide/canvas/introduction/)、[生成参数](https://v7.invoke.ai/users-guide/image-generation/generate-panel/)、[图库](https://v7.invoke.ai/users-guide/gallery/gallery-reference/)、[生成与队列](https://v7.invoke.ai/users-guide/image-generation/introduction/)、[模型管理](https://v7.invoke.ai/users-guide/models/introduction/)、[Stability Matrix README](https://github.com/LykosAI/StabilityMatrix)。这里的“适合”是面向当前代码的设计判断。

### 真正可复用的画面流程

1. **确认参考**：一位角色一个稳定 ID，保存正式单人物图及版本；风格图、场景图与身份图分别标注用途。不要将多人的设定拼图不加区分地送入一个身份参考槽。
2. **先构图**：本格显示人物清单和位置；双人先提供左右区域，允许手工修改区域。姿态/深度图负责空间结构，人物参考负责外观；两者不互相替代。
3. **生成候选**：主提示描述镜头、环境与共同动作；每个区域关联具体角色及该角色动作。默认单张执行以控制峰值资源，候选可以串行积累。为每次结果保存实际输入和参数。
4. **审核后采用**：沿用历史版本，新增结果先作为候选，用户选择后替换正式图。检查人数、身份、服装、动作主体与遮挡关系。
5. **局部修复**：在错误区域画遮罩，保留原图并生成新版本；无 mask 能力的模型只能显示“重新生成/参考编辑”，不能标成精确局部重绘。

这是基于上述产品能力的建议，不是已落地功能。InvokeAI 文档明确把区域指导、控制层和 inpaint mask 分开，并提供接受/丢弃候选流程；其区域参考并非所有模型通用，例如 SDXL 使用 IP-Adapter，而某些模型会跳过不支持的区域层。[画布能力与限制](https://invoke-ai.github.io/InvokeAI-7/users-guide/canvas/introduction/)

### 能保证与只能提高概率的部分

| 目标 | 应承诺到什么程度 |
| --- | --- |
| 正确发送 A/B 参考、区域、seed | 可由应用记录并验证输入绑定；不意味着生成内容正确 |
| 不串脸、不串衣、人物动作正确 | 概率性；必须审核。IP-Adapter 是图像条件，不是角色识别的硬约束 |
| 相同 seed 重现 | 应同时保留模型版本/哈希、采样器、步数、尺寸、参考、遮罩、工作流和运行环境；跨设备/版本不承诺像素一致 |
| 未编辑区域不变 | 可在最终合成时保证明确遮罩外像素沿用原图；羽化边界属于允许变化区 |
| 超时后不重复生成 | 依靠持久任务 ID 查询与恢复，而非重新提交整张图 |

PyTorch 官方说明不同发行版、平台和 CPU/GPU 之间不保证完全可复现。因此产品中的“固定 seed”应表达为便于对照和复用参数，不应叫“锁定角色”。[PyTorch 可复现性](https://docs.pytorch.org/docs/2.15/notes/randomness.html) IPAdapter Plus 作者已于 2025-04-14 标明 maintenance only，若采用它，应固定已验证版本并限制模板依赖数量。[维护状态](https://github.com/cubiq/ComfyUI_IPAdapter_plus)

## 最小可行改造顺序

1. **先补能力和模板**：在现有 `comfyLocal` 旁提供少量受控模板，明确 text、multiReference、regionalReference、inpaint、seed 的实际支持状态。由模板维护节点映射，普通用户选择用途，不输入 ID。只有节点、模型和参考槽全部满足才显示就绪；任意 JSON 工作流不能一概标为支持多参考。
2. **补生成记录**：扩展现有历史记录，保存 jobId、原始参考版本、完整请求、模板版本与状态。先支持查回超时任务、采用旧版本；不另建通用任务平台。当前适配器应指定正式输出节点，避免取到预览节点的首张图。
3. **先交付双人模板**：只做一套底模兼容的两位角色区域绑定，不先做任意人数。将身份 A/B、区域 A/B 与参考槽顺序明确对应。通过左右换位样例再扩大范围。
4. **再做局部修复**：基于已有原图与遮罩入口接一个确实支持 inpaint 的模板，结果经审核后采用。参数面板按能力显示，避免供应商接收不了的假设置。
5. **安装引导最后接通**：检测 → 打开官方安装页 → 安装器完成环境 → 选择小冷漫画模板 → 补齐模型 → 检查就绪。安装成功、模型齐全与实际出图成功应是三个独立状态。

服务接口已有 `/object_info`、`/system_stats`、`/models`、`/queue`、`/history/{prompt_id}` 和 `/interrupt` 可用。但 `/interrupt` 面向当前执行任务，不能不核对任务归属就当作本应用某一个任务的取消按钮。[ComfyUI API](https://docs.comfy.org/development/comfyui-server/comms_routes)

## 普通用户安装路径

### Apple Silicon

推荐默认提供官方 Comfy Desktop 安装入口：官方当前要求 macOS 13+、M1+，每个安装建议至少 4.85 GB 磁盘。这个数字是运行环境要求，不能写成含模型的总下载体积，也不是所有工作流的内存保证。[macOS 安装](https://docs.comfy.org/installation/desktop/macos)

已有 MLX 环境且当前流程能工作的用户继续复用现有入口；MPS、MLX 与 CUDA 的量化文件、节点和精度支持不能视为可互换。新模板必须单独标记 Apple Silicon 验证状态。对于仓库旧记录中的 16GB 统一内存设备，本轮没有负载测试，不给出双人 SDXL 或多参考大模型“流畅可用”的保证。先单任务、单候选，避免默认堆叠多个控制模型。

### Windows NVIDIA

同样首选 Comfy Desktop 官方安装器；当前文档要求 Windows 10+，支持 x64/ARM64，并建议独显，已不能照旧资料写成“仅支持 NVIDIA”。用户的具体 GPU、驱动、可用显存与选定模型仍需检查。[Windows 安装](https://docs.comfy.org/installation/desktop/windows)

需要同时使用多个生成软件时可选 Stability Matrix：它可按检测硬件选择 PyTorch 后端，NVIDIA 走 CUDA；后端和驱动要求随版本变化，应显示安装器实际检测结果。[硬件支持说明](https://github.com/LykosAI/StabilityMatrix/blob/main/docs/advanced/hardware-support.md) 不在未测试前承诺“8GB 能跑所有双人模板”或要求用户统一装某个 CUDA Toolkit。

### 另外两条可选入口

- 喜欢直接画遮罩、调图层的用户：Invoke Launcher + InvokeAI；官方 Launcher 负责 Python，用户不必先手工配置 Python。作为独立创作工具可先导出/导入图片，暂不同时新增第二套后端集成。[Launcher](https://github.com/invoke-ai/launcher)、[环境要求](https://invoke.ai/start-here/system-requirements/)
- 需要共享模型与管理多软件的用户：Stability Matrix；共享目录、模型浏览器和可恢复下载减少重复下载，但不能保证任何扩展与任何模型都兼容。[官方说明](https://github.com/LykosAI/StabilityMatrix)

建议安装界面显示模型来源、用途、版本、下载字节数、目标目录、所需磁盘和许可链接；网络受限或模型需要登录时给出明确状态。不要静默更换为第三方镜像或自动安装未知自定义节点。此处是产品实现建议，本轮没有实现下载器。

## 许可与交付风险

- ComfyUI 核心为 GPL-3.0；InvokeAI 根 LICENSE 为 Apache-2.0。直接复制代码、打包运行时、仅打开官方安装器是不同交付方式，发版前应针对实际方式核对 LICENSE/NOTICE 与依赖许可。[ComfyUI LICENSE](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE)、[InvokeAI LICENSE](https://github.com/invoke-ai/InvokeAI/blob/main/LICENSE)
- Stability Matrix README 明确：源代码 AGPL，二进制/可执行发行版适用 EULA。不能从 GitHub 标签直接推断允许随小冷漫画任意重新分发安装包。[README 许可段](https://github.com/LykosAI/StabilityMatrix#license)
- 软件许可与模型权重许可分开。SDXL base 官方模型卡标记 OpenRAIL++；衍生动漫模型、LoRA、身份适配器和视觉编码器要逐项确认，不能沿用底层软件的 Apache/GPL 标签。[SDXL 官方模型卡](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- 工作流更新可能破坏节点与参数兼容，模板应绑定已验证版本和依赖清单。不得把可安装当作已验证。实际模型组合、推理耗时、峰值内存、画风与双人成功率仍待按目标电脑实测。

后续人工验收建议只从同一对正式角色开始：单人、双人同框、左右换位、一个人执行动作、遮挡、只修改其中一人六种场景；核对输入绑定、身份服装、动作、历史恢复及遮罩外像素。先确认这一条完整链路，再增加模型或训练 LoRA。本次只形成研究文档，不新增测试代码，也未执行上述生成验收。
