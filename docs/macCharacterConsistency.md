# Mac 本地动漫角色一致性方案

调研日期：2026-10-28。目标机器：M5、16GB 统一内存。此次仅核对官方资料，没有安装新模型、训练或生成图片。

## 判断

六位角色、两种比例的十二张定稿图值得接入：它们能把模糊描述变为可复用的身份基准。但素材入库不等于模型学会角色；角色参考、人物位置、姿态、局部修复各自解决不同问题。现有多参考模型仍可能串服装、多肢体，不能把这些失败简单归因于内存。

同一位角色的 Q 版与正常比例版应作为两个明确的形象版本，创作时选其中一个，不同时送入作为同一身份的参考。每个版本保留固定发型、眼色、服装、配饰；性格目前素材清单为空，需要另行填写，画风单独选择。每位每种比例是一张包含正侧背等视角的设定表，已经提供多视角信息，但尚未覆盖充分的剧情动作和表情。整表输入还有复制多人物排布的风险，不能据此承诺训练后就能稳定泛化。

## 推荐组合与边界

| 路线 | 作用 | 本机状态与限制 |
| --- | --- | --- |
| 现有 MFLUX + FLUX.2 klein 4B 量化 + 两位独立角色参考 | 最少改动，保留本机多参考出图通路 | 已有项目历史试用，但身份、动作、解剖尚未通过。继续作为基线，不宣称已解决一致性 |
| ComfyUI Apple Silicon + 动漫 SDXL + IP-Adapter 图像参考/区域遮罩 + SDXL 姿态 ControlNet + 局部重绘 | 让角色 A/B 分别影响指定区域，骨架约束动作，错误只修局部 | 推荐作为下一条针对性验证路线。组件存在不代表组合已在本机 16GB 跑通；需验证 MPS、节点版本、内存和耗时 |
| 同底模角色 LoRA + 上述区域/姿态控制 | 经审核、多角度的角色素材积累后，再增强长期身份记忆 | 当前十二张不能视为成熟训练集。不要直接在 16GB Mac 启动重型训练；推理支持与训练可行性不同 |

MFLUX 官方支持 klein 的多图编辑、量化与 LoRA；4B 蒸馏模型通常采用 4 步。增加几十步或只放大分辨率不能作为解决三条腿的依据。官方原模型约 13GB VRAM 的描述，也不能直接换算为 16GB Mac 统一内存的保证。[MFLUX 模型说明](https://github.com/mflux-community/mflux/blob/main/src/mflux/models/flux2/README.md)、[BFL 模型卡](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)

ComfyUI 官方支持 Apple Silicon。IP-Adapter 文档提供多图与空间遮罩控制，可和其他条件控制结合；ComfyUI 的区域节点可局部绑定图像/文本。应使用通用图像特征路线，不能把写真人脸 FaceID 的效果直接外推到动漫眼睛、发型、衣服、兽耳或尾巴。[ComfyUI macOS](https://docs.comfy.org/installation/desktop/macos)、[Diffusers IP-Adapter 文档](https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter)、[ComfyUI IPAdapter](https://github.com/comfyorg/comfyui-ipadapter)

姿态 ControlNet 提供骨架位置约束，不负责记住角色身份，也不保证完全消除解剖错误。与 SDXL 匹配的控制权重应和 SDXL 工作流配套，不能直接装进 FLUX.2/Z-Image 通路。动漫底模需在具体选定版本后检查许可证与控制权重兼容性，不能仅凭“热门”决定。[作者发布的 SDXL OpenPose 控制模型](https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0)

## 暂不作为默认替换

- 更大模型：未验证 16GB 内存与速度，不先下载一批比较。MFLUX 新版发布说明虽列出更多参考编辑能力，也不构成这些模型在本机漫画任务有效的证据。
- 本机 klein 编辑 LoRA 训练：MFLUX 发布说明给出的梯度检查点案例为 32–36GB Mac，不能据此承诺 16GB 可训练。[MFLUX 发布说明](https://github.com/mflux-community/mflux/releases)
- Qwen-Image 2.1：官方代码与权重采用 Research License，不能沿用早期 Qwen-Image 的 Apache 假设作为商业漫画默认方案；本机质量和内存亦未验证。[官方仓库](https://github.com/QwenLM/Qwen-Image-2.1)

klein 4B 为 Apache 2.0；其他底模、LoRA、控制模型、插件代码各有许可，不能用工作流软件的许可替代权重许可。

## 最小验收，不连续烧图

先选正常比例的两位角色，同一画风，定一个明确双人动作和道具归属。先检查提交给模型的两个参考是否确为当前所选形象，角色名与脚本演员是否逐一绑定。随后只验证一张双人图：身份配饰未交换、人数和肢体正确、动作和道具归属符合脚本、无多余文字。保留输入、参数、耗时和图片。

只有这一张通过才验证第二个不同动作/机位；两张通过仅说明初步有效，不代表连续剧全部稳定。如果失败，先记录是身份、姿态还是服装问题，针对对应控制或局部修复改进，不通过盲目增加参考图、模型或生成次数掩盖问题。
