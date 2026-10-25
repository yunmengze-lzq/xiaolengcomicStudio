# 小冷漫画 · xiaolengcomicStudio

从生活热点或原创灵感，到脚本、固定角色、分镜、生图、气泡排版、审稿和发布包的本地漫画工作台。

当前为个人测试版，先由作者测试，再安排朋友试用。不是已经验收的公网多人服务。

## 当前功能

- 抖音、B站、小红书、贴吧、豆瓣的热点或素材线索收集；平台登录和正文获取能力因来源而异。
- 原创故事、固定角色与连续集；角色、美术风格和参考素材可保存复用。
- 文本和图片模型分别配置；支持已接入的第三方服务、本机 Codex，以及本机 Z-Image Turbo。
- 逐格出图、候选版本对比、历史保留、可移动漫画气泡、审稿及 PNG 发布包。
- 可编辑发布文案，提供简单有梗、emo、误会有梗、温柔治愈、轻松科普风格的文案候选；创作说明与来源默认仅在自审区和内部记录保留。
- 创作修改记录、作品反馈与分析页。

功能界面不等于所有服务都已实际验收；详见[验证记录](docs/comicStudioVerification.md)和[后续计划](docs/friendTrialPlan.md)。

## 本地启动

安装 Bun（项目使用 `bun@1.3.14`），在仓库根目录执行：

```sh
bun install
bun run --cwd apps/web build
bun run --cwd apps/server build
TOONFLOW_SERVER_HOST=127.0.0.1 TOONFLOW_SERVER_PORT=3187 bun build/server/index.js
```

浏览器打开 `http://127.0.0.1:3187/#/comicStudio`。macOS 构建完成后也可双击 `startComic.command`。当前说明针对源码本地运行，未提供已验收的安装包。

模型密钥在软件设置中自行填写。Codex 需要单独安装及登录；Z-Image 需要另行安装本地 Python/MLX 环境和模型。平台登录需要在自己的设备上完成。这些运行环境不随 Git 仓库分发，也不会自动沿用作者的账号。

## 数据与文档

- `data/`：本机设置、作品、平台登录状态、本地模型，已被 Git 忽略，请自行备份。
- `build/`、`node_modules/`：本机构建与依赖，不入库。
- [使用与接入说明](docs/comicStudioGuide.md)：部分早期记录具有日期边界，以最新验证记录为准。
- [朋友试用与迭代计划](docs/friendTrialPlan.md)：上线前条件、优先级、验收范围和反馈方式。

服务默认仅监听本机。朋友试用先采用各自本地运行、各自配置模型的方式；公网部署与共享账号需要另行设计和验收。

## 来源与许可

本项目基于 [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) 改造，底座版本 `30139c9`。保留上游 [MIT License](LICENSE) 与归属；第三方字体许可见 `apps/web/public/fonts/wenKaiLicense.txt`。第三方模型、平台工具及素材遵循各自条款。
