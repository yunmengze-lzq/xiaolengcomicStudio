# Windows 源码部署与调试

本文用于换电脑后复现本次漫画工作流。路径按实际安装位置调整。

## 1. 依赖

- Git
- Bun `1.3.14`
- ComfyUI（Windows 便携版/桌面版均可）
- Python 环境（ComfyUI 自带即可）
- 可选：Codex CLI + ChatGPT 登录（编剧；Windows 生图有已知限制）

```powershell
git clone https://github.com/yunmengze-lzq/xiaolengcomicStudio.git
cd xiaolengcomicStudio
bun install --frozen-lockfile
bun run --cwd apps/web build
bun run --cwd apps/server build
```

## 2. ComfyUI

### 模型与节点

- Checkpoint：`dreamshaperXL_v21TurboDPMSDE.safetensors`
- 自定义节点：`comfyui_ipadapter_plus`、`ComfyUI-GGUF`（按需）
- IP-Adapter：`ip-adapter-plus_sdxl_vit-h.safetensors`
- CLIP Vision：`CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`

### 工作流

导入 [comfyWorkflow.json](comfyWorkflow.json)。节点含义：

- `10`：角色 A 参考图
- `11`：角色 B 参考图
- `12`：第三张参考图占位（不参与计算）
- `20/21/22/23`：左右区域 mask
- `8/9`：两个 IP-Adapter 分支
- `6`：正向提示词节点
- `5`：尺寸节点

把 [comfyMasks](comfyMasks) 中的图片复制到 ComfyUI 的 `input/` 目录：

```text
awarm.png
niangao.png
mask-woman.png
mask-cat.png
comic-default-1.png
```

在软件中添加「本地 ComfyUI」生图供应商，填写：

```text
端口：8188
工作流：comfyWorkflow.json 的内容
正向提示词节点 ID：6
宽高尺寸节点 ID：5
参考图 LoadImage 节点 ID：10,11,12
```

启动 ComfyUI：

```powershell
python C:\path\to\ComfyUI\main.py --base-directory C:\path\to\ComfyUI-data --listen 127.0.0.1 --port 8188
```

## 3. Codex

Codex 用于编剧、分镜和文案：

```powershell
npm install -g @openai/codex
codex login
codex features list   # image_generation 可能显示 true
```

启动漫画服务前设置：

```powershell
$env:COMIC_CODEX_BIN = "C:\path\to\codex.exe"
$env:CODEX_HOME = "C:\path\to\data\codexHome"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
```

Windows 上 Codex CLI 的 `image_gen` 工具可能不暴露，实际表现是模型改走 `canva.generate-image` 或提示无工具。此问题不是本项目配置造成；要稳定调用 GPT-Image-2，使用 OpenAI Images API，或在客户端手动生成后导入。

## 4. 启动

```powershell
$env:TOONFLOW_SERVER_HOST = "127.0.0.1"
$env:TOONFLOW_SERVER_PORT = "3187"
bun build/server/index.js
```

打开：

```text
http://127.0.0.1:3187/#/comicStudio
```

## 5. 数据

- 设置与作品：`data/`
- 项目：`data/workspaces/comic.../`
- 导出 ZIP：项目目录
- 不要把 `data/`、`node_modules/`、`build/`、模型权重、API Key、平台登录状态提交到 Git。

## 6. 本次验证范围

- 旧项目《两分钟与一只袜子》：4/4 审稿通过。
- 新项目《年糕塞进包里的晴天》：4/4 审稿通过。
- 角色设计直接生成：修复参数错误后 HTTP 200。
- 双角色 mask：女角色 + 橘猫同格，未融合成猫娘。
- Web 类型检查、Web/Server 生产构建通过。

详见根目录 [CHANGELOG.md](../CHANGELOG.md)。
