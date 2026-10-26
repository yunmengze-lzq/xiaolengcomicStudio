# 固定多角色漫画：模型与流程决策

核查日期：2026-10-26。目标设备为已核查的 MacBook Air M5 / 16GB 统一内存。仅研究官方资料和现有实现，未下载权重、运行推理或修改生成逻辑。

## 决策

流程必须改，固定角色主生成路径也应换成真正支持多图参考的编辑管线。两者不能互相替代。当前 Z-Image 默认分格路径没有传入正式角色参考图，普通单图 img2img 又容易继承设定图排布；这不是仅增加提示词、步数或内存能够解决的问题。本地代码证据见 [identityAssessment.md](identityAssessment.md)。

先建立模型无关的角色、场景和镜头数据，再接入 MFLUX + FLUX.2 klein 4B 量化多参考编辑，作为第一验证候选。这里的“第一”依据部署衔接、体量和许可，不表示已证明漫画质量最佳。原有 Z-Image 可用于草稿/背景，不再把其默认文生图视作固定角色成品能力。

## 别人的实际做法

| 方案 | 实际控制方式 | 本项目借鉴与限制 |
| --- | --- | --- |
| StoryDiffusion | 在图像序列间共享一致性自注意力，而非每格独立抽样 | 借鉴跨格角色信息复用。官方更新区分双人支持与 PhotoMaker 单图仅一人的限制；低显存版在 24GB GPU 上测试，不能据此当作本机现成方案 |
| StoryMaker | 人脸身份结合完整人物图与分割，兼顾衣服、头发和身体 | 借鉴“全身身份”，不能只锁脸。示例依赖 InsightFace/CUDA，主要证据偏真人，不代表能直接处理本项目的高度风格化角色 |
| MS-Diffusion | 每个参考主体和短语、布局框按相同顺序绑定，限制条件作用区域 | 最值得借鉴角色与区域绑定。官方建议去除无关背景的参考，支持布局和 ControlNet；它不是开箱即用的跨格漫画成品系统 |

一手来源：[StoryDiffusion](https://github.com/HVision-NKU/StoryDiffusion)、[双人/PhotoMaker 限制](https://github.com/HVision-NKU/StoryDiffusion/blob/main/update.md)、[StoryMaker](https://github.com/RedAIGC/StoryMaker)、[MS-Diffusion](https://github.com/MS-Diffusion/MS-Diffusion)。这些是可核查的开源技术实例，不应泛化为整个商业漫画行业的生产方法。

## 推荐制作链路

1. **角色资产确认**：稳定角色 ID；干净的正面/侧面/全身单视图；固定服装与配饰；表情参考；不可变外形与可变情绪分开保存。带名字、多角度拼图的设定板保留展示，但不直接当成普通 img2img 底图。
2. **场景确认**：背景、道具、光照、人物身高关系单独保存。选用两位角色建立并批准一张同框场景基准图；固定的是身份与空间关系，后续仍允许换位、改镜头和动作。
3. **镜头计划**：每格显式绑定角色 ID、实际参考图、画面位置、表情、动作及互动对象。先出简易构图草稿，复杂交互再增加姿态或区域控制。自然语言写“左边”不等于底层已有遮罩约束。
4. **多参考生成**：每格输入原始正式角色 A、B，按需要补场景基准图。使用真正的参考编辑入口；只描述本格变化及必须保留的内容。上一格仅作附加参考，不能取代原始设定，避免串行漂移。
5. **核对和局部修复**：核对人数、身份、脸/发型、服装、物种特征、配饰、动作归属。只修出错人物或局部，保留合格区域及上一版本。支持遮罩的模型才执行对应局部编辑，不虚构能力。
6. **字幕排版**：对白、心理描写、气泡单独叠加，保持可编辑，模型只生成无文字画面。

上述为流程设计推论，尚未在应用落地。分区参考已有官方实现例证：[Diffusers IP-Adapter masking](https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter#masking)。区域约束能减少串脸/串服装，但不保证每次成功；姿态控制本身也不锁身份。

## 模型顺序与退出条件

- **首选验证 FLUX.2 klein 4B 蒸馏版多参考编辑**：MFLUX 有 Apple MLX 原生入口、量化和一/多图编辑；4B 官方许可 Apache-2.0。先用标准文本编码器，避免为省内存采用文档已提示可能损伤动漫效果的实验小编码器。官方独显 VRAM 数字不可换算为本机统一内存保证。[MFLUX 文档](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/flux2/README.md)、[模型卡](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)。
- **画风不达标时再比较动漫 SDXL + 分区图像参考/角色 LoRA**：增加控制成本，不能只换动漫底模就宣称固定角色。先验证所选底模与适配器兼容性；本轮未验证这套组合在本机的峰值与速度。[IP-Adapter 官方文档](https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter)。
- **Qwen 对照区分版本**：2511 官方有双参考合成与多人一致性改进，可作足够资源环境中的质量对照，本机未验证；2.1 已有 MFLUX 本地编辑实现，值得研究，但其 Research License 明确限定非商业研究/评估，商业需另授权，不作为当前副业默认主力。[2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)、[2.1 MFLUX](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/qwen21/reference/README.md)、[2.1 许可](https://huggingface.co/Qwen/Qwen-Image-2.1/raw/main/LICENSE)。

不先安装所有候选，也不先训练 LoRA。第一轮只比较同一对正式角色的两格：并排同框；左右换位并改变表情。使用同一套原始参考，记录模型、参数、输入顺序、耗时和峰值内存，并核对画风与角色特征。失败时先判断是参考没传入、角色归属混淆、画风偏离还是资源不足，再决定流程修正或模型淘汰，不反复盲抽。两格通过只代表首轮筛选通过，不代表遮挡等复杂镜头已验收。

若要求外形像素层面严格不变，应考虑预制角色/背景分层合成，接受动作自由度下降；开放式整图生成不能提供这种保证。对当前需求，建议优先采用“多参考编辑 + 角色与场景资产 + 审核局部修复”，而不是先升级电脑或堆模型。
