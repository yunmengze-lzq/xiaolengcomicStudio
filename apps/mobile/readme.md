# 小冷漫画 Android

优先使用系统 Android WebView；系统内核缺少所需能力时，切换到 APK 内置的 ARM64 GeckoView，无需联网下载备用内核。两种内核均加载同一 APK 内 Bun 启动的真实 Toonflow 前端和后端。页面复用 `apps/web`，后端通过 `@toonflow/server/app` 接入，内置节点、工具、扩展、供应商和技能沿用现有构建产物。

## 手机创作

APK 内置手机工作台和本地项目服务。窄屏用底部导航切换创作、数据、档案和设置；顶部切换空间与创作步骤。手动写剧本、编排画格、导入图片和导出可以离线完成。使用 AI 编剧、识图或生图时，在「设置 → 模型与生成」中管理服务并分别分配任务。手机独立模式提供公开来源和手动添加素材；依赖电脑浏览器的账号采集、Codex CLI 和桌面模型安装由桌面版运行。

「角色与美术」提供 12 张角色设定稿和 2 套带示例的画风，首次进入时登记到公共库，之后可直接选用、编辑和复用。图片按可见范围读取，手机预览一次生成当前页；批量导出逐页处理。超过 100 MB 时可选择分别导出单页。

## 设备互联与手动连接

桌面「设置 → 设备互联」中的「允许其他设备连接」默认关闭。开启后直接显示二维码，局域网地址优先选择 `192.168.*`。手机和电脑都可以在 Home 页「设置」右侧或首次配置 hello 页点击「设备互联」，使用摄像头或读取二维码图片。也可以选择「手动输入」，填写对方「手动连接信息」中的地址和 12 位数字配对码。二维码与数字码不设时间限制，共用一次配对机会；刷新、修改互联配置、关闭互联或重启服务端会使旧码失效。数字码每分钟最多尝试 10 次，二维码不受此限制。端口、共享工作目录、其他局域网地址和公网 HTTPS 配置均放在「高级选项」中，首次开启默认使用已有项目的工作目录。

电脑也能连接另一台电脑。连接远程设备后，本机共享监听和 MCP 服务停止，当前设备只作为客户端；设置中显示连接状态和「断开并独立运行」。断开恢复独立运行后可重新开启共享，不会自动重新开放端口。桌面切换时更换本地网关端口并重新加载窗口，保留本机剪贴板和文件导出能力；工作目录来自对方服务器。

手机连接电脑后，首页入口显示实际连接状态，点击可查看电脑名称、切回本机或连接其他电脑。扫码、确认连接和当前连接分别展示，横屏下也保留完整操作区。电脑面板自动更新手机列表和在线状态；手机网关每五秒检查连接，电脑超过十五秒未收到设备活动后显示离线。在线表示最近可以通信，不代表手机处于前台。关闭共享或撤销设备会使手机下次检查显示连接已断开。

连接后重启手机本地入口，页面、项目、模型配置和计算任务来自所选后端，手机原有项目仍留在本机。再次点首页的连接状态按钮可换服务器或切回手机；服务器离线时也提供重试和切回本机入口。切换不会自动迁移、合并项目或同步两端配置；已有流式任务遵循原有断开取消行为。

手机仍运行轻量 Bun 网关以保留 localhost 安全上下文和 Android 导出能力；远程模式不初始化手机业务后端。网关转发完整页面、插件和 API，支持上传、Range、SSE/Agent 响应流及取消。设备凭据仅保存到手机应用私有目录，不交给网页；关闭共享或撤销设备会断开现有连接。

共享监听默认端口为 `43123`，复用桌面同一个后端进程。首次连接需允许该端口通过电脑防火墙，电脑不能关机或休眠。HTTP 适用于可信局域网，传输未加密；公网使用 HTTPS 反向代理指向**设备互联端口**，在面板填写 HTTPS 根地址后生成二维码。代理需保留 `X-Toonflow-Device-Token`、`Authorization` 和原始 Host，关闭响应缓冲并允许长连接。不要将已有未鉴权的 standalone 主端口直接公开。

配对设备可使用该后端的模型配置和业务功能，仅应授权自己的可信设备。共享目录是工作区接口的范围，服务器自带 `data/workspaces` 也可访问；这不是第三方插件或 Agent 代码执行的沙箱。不要让电脑和手机同时编辑同一画布：本次互联不提供多人实时协作或冲突合并。

应用支持设备旋转；窄屏优先单栏、分步操作和单页编辑。漫画工作台使用正常屏幕比例，Android 状态栏、导航栏和输入法由系统管理。旧画布界面的缩放仍在原设置中调整。

使用官方 **Bun 1.4.2 Android** 运行时，仅构建 `arm64-v8a`。打包参考社区 [minapk](https://github.com/jjtseng93/minapk) 的原生库目录启动方式；通过 Gradle 与 Android SDK 构建，不依赖其终端环境。Bun 运行时随 APK 安装到原生库目录，JS、WASM 和页面复制到应用程序目录，设置与工作区保存在独立的数据目录。来源和许可证见 [thirdParty.md](thirdParty.md)。

启动时先用系统 WebView 加载独立的本地能力预检页面，通过后直接进入 Toonflow，不初始化 GeckoView。检测项与网页入口共用 `@toonflow/web/browserCapabilities`，检查 12 项 JavaScript 与 CSS 能力，避免旧内核在加载业务依赖时先白屏。

系统 WebView 缺少能力时，初始化 APK 内置的 `org.mozilla.geckoview:geckoview-arm64-v8a:157.0.20261005135250`，对 GeckoView 执行同样的 12 项预检，通过后进入 Toonflow。备用内核随 APK 更新，不依赖腾讯服务、`config.tbs` 或首次启动联网下载；本机页面和后端可在离线时启动，在线供应商仍需网络。GeckoView 初始化或预检失败时显示启动错误，不继续进入业务页面。不添加旧内核 polyfill；安装了新版 Chrome 或另一份 WebView APK，也不代表系统已切换到该版本。

## 构建

构建需要 Bun、JDK 17 或更新版本，以及已接受许可的 Android SDK 目录。Windows 使用固定 Gradle 版本，macOS 使用 PATH 中的 Gradle（本次验证用 9.8.2）。`setup` 自动安装 Platform 37.1 和 Build Tools 36.0.0。在仓库根目录执行：

```powershell
# 本机已有的 SDK / JDK；其他机器按实际安装路径调整。
$env:ANDROID_HOME = 'D:\SDK'
$env:JAVA_HOME = 'D:\Android Studio\jbr'

# 首次配置时，在同一 SDK 目录接受许可。
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses

bun install
bun run --cwd apps/mobile setup
bun run --cwd apps/mobile typecheck
$env:androidRelease = '1'
bun run --cwd apps/mobile build
```

`setup` 显式下载固定版本 ARM64 Android Bun 和 Gradle 9.6.0，校验 SHA256 后分别缓存到 `build/mobile/runtime`、`build/mobile/gradle`；随后由 AGP 9.4.0 自动安装所需 SDK，并准备 GeckoView 及其构建依赖，Gradle 缓存位于 `build/mobile/gradleHome`。SDK 自动安装要求该目录已接受许可。`build` 使用 `--offline` 并禁止 SDK 下载；缺少 SDK 或缓存时先重新执行 `setup`。GeckoView 的 Java、资源与 ARM64 原生内核由 Android 构建工具合并进 APK。

`build` 先调用根目录的 `build:server`，构建节点、工具、扩展、前端、后端及 MCP，再将移动端服务与 MCP stdio 入口一起构建，共享重复依赖。APK 的 payload 包含 `server.js`、`stdio.js`、共享代码块、`web`、`nodes`、`tools`、`ext`、`providers`、`skills` 和 Photon 的 JS/WASM 包；团队保持当前仓库未内置打包的状态。payload 内容生成 `revision.txt`，用于随构建更新内置插件。发行包启用 R8 代码优化与资源裁剪，保留 Gecko 官方消费者规则及完整 ARM64 内核。

输出为 `build/mobile/toonflowMobile.apk`。应用 ID 为 `com.xiaoleng.comicstudio`，最低 Android 8 / API 26，目标 API 34，支持 ARM64。

分享版使用环境变量 `xiaolengAndroidKeystore`（PKCS#12 文件路径）与 `xiaolengAndroidPassword`，签名别名为 `xiaolengComic`。后续更新应复用这份签名私钥并提高版本号，才能覆盖安装。未配置私钥的内部构建使用仓库公开的默认签名。

版本默认读取 `appConfig.ts`，可通过 `appVersion` 指定 `X.Y.Z`。Android `versionCode` 按 `X × 1000000 + Y × 1000 + Z` 生成，Y、Z 不超过 999，结果须在 1–2100000000 内；更新时使用更高版本号。

## GitHub 发布

公开 APK 通过 [小冷漫画 Releases](https://github.com/yunmengze-lzq/xiaolengcomicStudio/releases) 分发。用版本标签对应的代码在本机生成签名包，与 GitHub Actions 构建的同版桌面包一起发布。私钥由维护者保管。详见[发布流程](../../docs/releaseManagement.md)。

开发者可在 Actions 的 **Debug build** 中选择 `androidArm64` 生成内部测试包。内部包使用公开调试签名，应用 ID 与分享版相同，Android 会阻止不同签名的覆盖安装。

## 安装到 ARM64 设备

```powershell
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
& $adb devices -l
& $adb -s <设备序列号> install --no-incremental -r build/mobile/toonflowMobile.apk
& $adb -s <设备序列号> shell am start -W -n com.xiaoleng.comicstudio/com.toonflow.mobile.mobileActivity
```

设备序列号以 `adb devices` 输出为准；仅支持运行 ARM64 原生库的设备，不再提供 x86_64 APK。

打开后进入 Toonflow 首页。创建或打开项目后，可检查工作区文件、画布、节点、Agent 和设置是否正常加载；编辑并保存后退出应用，再次打开应保留内容。覆盖安装保留应用数据，卸载会清除。

## 手机工作区与文件

项目使用应用私有目录，文件接口仍复用 Toonflow 的工作区路径校验与原子保存。通过 Android 系统文件选择器导入文件，通过系统保存对话框导出文件；系统选择器返回的 `content://` 地址不作为后端普通文件路径使用。

保存对话框默认请求打开内部存储的 `Download` 目录，用户仍可选择其他位置；系统不支持该初始目录时会使用自身默认位置。本机 MuMu 的「下载」快捷入口存在写入授权异常，测试时请使用「内部存储 → Download」。该位置已完成导出并核对文件一致。

程序资源与用户数据分开存放：更新 APK 可以替换页面和插件，不能覆盖设置、项目或生成素材。需要迁移或卸载前，应先导出需要保留的文件。

```powershell
& $adb -s <设备序列号> logcat -s ToonflowMobile AndroidRuntime
& $adb -s <设备序列号> shell am force-stop com.toonflow.mobile
```

本机开发先执行 `bun run build:server` 准备真实前端和插件，再运行 `bun run --cwd apps/mobile dev`，打开终端打印的完整 URL。开发数据单独保存在 `build/mobile/data`。

## 当前范围

- 复用真实 Toonflow 前后端与插件；Bun 仅监听本机随机端口，应用会话鉴权覆盖页面、接口和流式请求。
- 在线模型和媒体供应商仍需要联网及有效配置；本地安装不等于离线运行云端模型。
- FFmpeg 当前没有 Android 发行包，转码、抽帧等依赖 FFmpeg 的功能暂不可用；不能将 Linux 二进制直接用于 Android。
- Activity 退出时停止 Bun；没有后台长任务或前台服务。
- Bun Android 仍为实验性支持。MuMu 的验证不能代替 ARM64 真机验证；真实手机上的系统 WebView / GeckoView 切换、离线启动、相机、文件导入导出、内存、媒体编解码及后台行为仍需单独确认。
- 支持 Windows 本地构建和 GitHub Actions APK 构建与签名，不包含应用商店上架流程。
