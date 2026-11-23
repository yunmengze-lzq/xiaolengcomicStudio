# 小冷漫画版本发布

以根目录 `appConfig.ts` 为版本来源。每次公开发布使用新的 `X.Y.Z`，在同一提交上打 `vX.Y.Z` 标签，并在 GitHub Release 保留安装包、变更说明和 SHA-256 清单。修订已经发布的程序时提升版本号。

1. 更新版本并提交源码，检查提交范围后把提交和标签推送到小冷漫画仓库。
2. 在 GitHub Actions 手动以标签运行 **Build Xiaoleng Comic release**。工作流校验标签与源码版本，构建 Windows x64、Apple 芯片 Mac 和 Intel Mac。已有 Developer ID 和公证凭据时可开启 Apple 芯片签名。可下载每个平台的安装包、更新清单和完整更新包。
3. 在同一标签的源码上设置 `androidRelease=1`，用之前发布的 Android 签名执行 `bun run --cwd apps/mobile build`。签名配置见 [Android 构建说明](../apps/mobile/readme.md)。将签名私钥单独保管。
4. 创建对应标签的 Release 草稿，上传桌面安装包、各平台的 `stable-*-update.json` 和其引用的更新包，以及签名 APK。保留更新清单和更新包的原始文件名；桌面更新地址使用本仓库的最新 Release。
   可用 **Stage Xiaoleng desktop release** 将单个平台的 Actions 产物直接复制到对应的 Release 草稿。
5. 核对安装包版本、平台、APK 签名和文件 SHA-256。补充系统签名状态与测试环境，确认上传完成后发布草稿。

安装包文件名建议使用 `xiaolengComic-X.Y.Z-windows-x64.exe`、`xiaolengComic-X.Y.Z-macos-arm64.dmg`、`xiaolengComic-X.Y.Z-macos-x64.dmg` 和 `xiaolengComic-X.Y.Z-android-arm64.apk`。
