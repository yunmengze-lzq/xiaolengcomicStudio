# 双角色漫画一致性：可选路线

核查日期：2026-10-26。仅查阅项目官方仓库、模型卡和框架官方文档；未安装、下载权重或运行生成，以下不是 MacBook Air M5 / 16GB 的实测结果。

## 补充：Qwen-Image-2.1 应列入本地研究候选

**修正范围：下面将 Qwen 归为外部算力的结论仅针对旧版 2509/2511，不适用于新架构 2.1。** 2.1 可列为 M5/16GB 本地第二研究候选；但其官方 **Qwen Research License 第 2 条仅允许非商业用途，商业用途需另行授权**。本项目涉及小红书商店/广告，因此在取得适用授权前，不应将 2.1 作为默认商业主力；klein 4B 的 Apache-2.0 许可更适合作为当前默认候选。来源：[2.1 官方 LICENSE](https://huggingface.co/Qwen/Qwen-Image-2.1/raw/main/LICENSE)、[klein 4B 模型卡](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)。

| 比较点 | FLUX.2 klein 4B | Qwen-Image-2.1 |
| --- | --- | --- |
| 参考编辑 | 4B，MFLUX 支持多参考编辑，蒸馏版通常 4 步 | 视觉生成部分约 7B，另有文本/视觉编码器；最多 10 参考，原版默认 40 步 |
| 漫画一致性 | 可作为双角色设定图条件；未找到官方双角色跨格漫画保证 | 有人物身份保持、多参考与卡通透明素材展示；未找到二次元双角色跨格对照证明，不能因版本更新断言更佳 |
| RGBA / 局部修改 | 所核查 klein 文档主要描述多参考编辑，未确认同等原生 RGBA / 遮罩能力 | 原生 RGBA；MFLUX 编辑入口支持遮罩、强度与自动遮罩，可用于局部服装/配饰修正；遮罩不会保证被重画区域的身份 |

来源：[2.1 官方模型卡](https://huggingface.co/Qwen/Qwen-Image-2.1)、[MFLUX 2.1 参考编辑 README](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/qwen21/reference/README.md)、[MFLUX klein README](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/flux2/README.md)。

内存证据需限定：约 8GB 峰值的说明实际位于 **MFLUX 0.22.0** 发布记录（0.23.0 已包含该改动），针对 **8bit、512×512、`--low-ram`、多数运行**；不是 M5 Air/16GB 双参考实测，更不是十参考或高分辨率保证。MFLUX README 明确峰值随分辨率、参考图和量化变化；原始权重下载约 33.1GB，即使加载时量化也需下载，磁盘大小不等于同时驻留内存。默认 BF16 路径不能按此 8GB 数字估算；研究验证应先用原版小尺寸、两参考、batch 1，记录系统内存压力与耗时。Turbo README 建议至少 1024px，不能用其低分辨率速度替代原版 512px 内存证据。来源：[MFLUX 发布记录](https://github.com/mflux-community/mflux/releases)、[2.1 总 README](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/qwen21/README.md)、[参考编辑 README](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/qwen21/reference/README.md)。

建议顺序更新为：**商业默认候选 klein 4B；非商业研究对照 Qwen-Image-2.1（商业前另授权）；旧版 2511 外部算力质量对照。** 两个本地候选均未在本机推理验证，多图能力也都不等于身份保证。

## 建议先后顺序

1. **本地优先验证：MFLUX + FLUX.2 klein 4B 量化参考编辑。** MFLUX 的 MLX 实现支持 4B，并有接受一张或多张参考图的编辑入口 `mflux-generate-flux2-edit` / `image_paths`。可将角色 A、B 的固定设定图按稳定顺序输入，每格明确描述 A/B 的位置、服装和动作。这是相对现有 MFLUX 工作流最直接的升级候选，但需要另行下载模型、先验证本机版本与内存峰值，不能把它当作现有 Z-Image 权重的参数开关。来源：[MFLUX FLUX.2 文档](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/flux2/README.md)。

   BFL 模型卡列出 4B 的多参考编辑能力，并写消费级硬件可低至约 13GB VRAM；这是该模型的官方硬件描述，**不是 16GB Mac 可用内存的保证**。16GB 统一内存同时供系统、CPU、GPU 使用，不能按独显的 16GB VRAM 对照。4bit 权重文件大小也不等于运行峰值。应先以低分辨率、batch 1、两张参考的短验证集评估。来源：[BFL 4B 模型卡](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)。

2. **质量优先、外部算力候选：Qwen-Image-Edit-2511。** 2509 官方代码已接受图像列表，展示 person+person、三图、卡通角色和姿态条件；2511 进一步明确改善多人一致性与两张人物图融合，因此在此系列中先选 2511，2509 作为比较基线。官方展示不等于二次元双角色跨多格的身份保证，尤其仍要检查发型、瞳色、配饰、左右角色互换及遮挡后的恢复。来源：[2509 模型卡](https://huggingface.co/Qwen/Qwen-Image-Edit-2509)、[2511 模型卡](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)。

   在所核查的 Qwen 两张模型卡和官方 README 中，**未找到适用于 2509/2511 的固定最低 VRAM 规格**。官方快速开始是 BF16 CUDA 示例；仓库提到的“4GB VRAM”属于社区支持区的特定逐层卸载方案，不能推导成 16GB 统一内存 Mac 可顺畅运行 2511。因此先视为另有足够资源的 GPU/服务路线，不为本机承诺性能，也不在此指定未经授权的服务。来源：[Qwen 官方仓库](https://github.com/QwenLM/Qwen-Image)。

3. **控制力备选：SDXL 系兼容底模 + IP-Adapter 分区遮罩。** Diffusers 官方文档有两张人像配两块遮罩的示例，可让两个参考各自作用于画面区域；适合构图区域清楚、愿意维护遮罩的双人镜头。它需要单独的兼容生成管线，不能直接把 SDXL adapter 权重插到当前 Z-Image 管线。遮罩限制作用区域，并不锁定完整身份；镜头交叉、拥抱和遮挡时仍需检查。来源：[Diffusers IP-Adapter 文档](https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter)。

## IP-Adapter / InstantID 的边界

- 普通 IP-Adapter 是图像条件适配器；Face / FaceID 是不同变体，不能混作同一种能力。官方仓库说明权重强度影响参考一致性，默认 CLIP 图像处理会中心裁剪，非方形参考可能丢失边缘特征。对二次元应保留发型、饰物、服装的完整设定图，并使用合适裁剪；官方资料没有证明它能保证二次元双角色跨格身份。来源：[IP-Adapter 官方仓库](https://github.com/tencent-ailab/IP-Adapter)。
- InstantID 官方代码依赖 InsightFace 的人脸检测/嵌入，并选最大的人脸；Usage Tips 明确写尚不支持多人。它能输出非写实风格，不代表高度风格化二次元输入一定可提取可靠身份。由此推断，不应将它列为双角色二次元漫画的首选。来源：[InstantID 官方仓库](https://github.com/instantX-research/InstantID)。

## 共同验收方式

多图输入只说明能接收多个图像条件，不等于把两个身份可靠分离。建议同一对设定图测试：单人近景各一格、双人并排、左右换位、远景、侧脸、互相遮挡；逐项核对发型/发色、瞳色、服装和专属配饰。每格从固定设定图出发，已批准的上一格可作为附加参考，避免仅以前一格串行编辑而逐格积累漂移。此段是工作流建议，未声称已验证任何模型能达到生产要求。

## 补充：开源故事流程的实际做法

以下三项是已公开代码/论文的研究实现，不代表可直接用于生产的成熟软件。共同证据表明：一致性需要跨格或按主体传递视觉条件，双角色同框还需要身份与区域的绑定；仅固定 seed、重复角色名字不具备同样机制。

| 项目 | 实际机制和证据 | 二次元/多角色及本机边界 |
| --- | --- | --- |
| StoryDiffusion | 用 Consistent Self-Attention 共享序列中的人物特征；官方实现至少输入 3 条分镜提示，推荐 5–6 条。项目页展示卡通、多角色与漫画序列。[官方仓库](https://github.com/HVision-NKU/StoryDiffusion)、[项目页](https://storydiffusion.github.io/) | 多角色展示不等于所有参考图模式都支持双人：官方更新说明双人支持同时指出 PhotoMaker 模式单图只能出现一人。[更新说明](https://github.com/HVision-NKU/StoryDiffusion/blob/main/update.md)。官方低显存版在 A10 24GB VRAM + 30GB RAM 测试，并预期需大于 20GB VRAM；不能据此承诺 16GB 统一内存 Mac 可运行。 |
| StoryMaker | 结合人脸身份与完整人物裁剪，覆盖头发/服装/身体；用分割掩码约束不同人物和背景的注意力区域，并用姿态条件减弱姿态与身份耦合；官方有双人肖像合成。[作者论文](https://arxiv.org/abs/2409.12576)、[官方仓库](https://github.com/FireRedTeam/StoryMaker) | 核心证据偏真人肖像；官方示例使用 InsightFace `buffalo_l`、人物图和掩码、SDXL CUDA 管线，不能把真人双人结果直接外推为二次元可靠性。所查官方说明没有 Mac/16GB 验证或最低内存承诺。 |
| MS-Diffusion | 每个主体输入参考图，并按同一顺序提供 `phrases` 和布局 `boxes`；官方建议去背景/遮罩后的参考图，可单独设置各主体条件强度。注意力使每个主体条件作用在指定区域；基准含双/三主体组合。[官方仓库](https://github.com/MS-Diffusion/MS-Diffusion) | 是多主体同框个性化方法，并非完整跨格漫画系统；二次元双角色长序列没有同等官方验证。官方推理代码使用 SDXL、CLIP 图像编码器和 `device="cuda"`，未提供 Apple 16GB 运行证据。[推理源码](https://github.com/MS-Diffusion/MS-Diffusion/blob/main/inference.py) |

**对本项目的推论：先更换一致性流程，再比较模型。** 先让每格实际收到固定 A/B 设定图，维持稳定角色 ID、参考顺序和外观描述；双人同框记录各自位置/区域，漂移时优先只重画对应角色区域。若当前本地适配器仍传 `references=[]`，换提示词或 seed 无法补上视觉条件。接着以同一套困难分镜比较 klein 4B 与获许可的其他参考编辑器。StoryDiffusion 的跨格注意力、StoryMaker/MS-Diffusion 的区域绑定不能作为普通提示词“移植”到 Z-Image/MFLUX，接入这些研究实现意味着更换推理管线；现阶段不建议为此直接迁移到未获 Apple 16GB 验证的 CUDA 栈。上述流程建议是基于主源机制的推论，未进行本机生成测试。
