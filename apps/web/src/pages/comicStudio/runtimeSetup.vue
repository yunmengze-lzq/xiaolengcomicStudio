<template>
  <section class="setupGuide">
    <header><div><h3>第一次使用 · 准备创作环境</h3><p>先选一种方式，再完成连接。已有环境可以直接检测，不用重复安装。</p></div><button :disabled="checking" @click="detect">{{ checking ? '检测中…' : '检测本机环境' }}</button></header>
    <p role="status">{{ machine || '检测只读取环境状态，不下载模型、不生成图片。' }}</p>
    <div class="setupChoices" role="group" aria-label="选择运行方式">
      <button v-for="item in choices" :key="item.id" :aria-pressed="choice === item.id" :class="{ selected: choice === item.id }" @click="choice = item.id"><strong>{{ item.title }}</strong><span>{{ item.description }}</span></button>
    </div>
    <template v-if="choice === 'api'">
      <ol><li>准备自己的图片服务地址、模型名称和密钥。</li><li>到「生图模型」添加在线图片 API，保存后设置默认模型。</li><li>在文本模型中另选支持识图的模型，用于分析参考图。</li></ol>
      <button @click="emit('images')">配置生图模型</button><p>无需安装 Python 或下载本地权重；费用由所选服务商收取。</p>
    </template>
    <template v-else-if="choice === 'comfy'">
      <ol><li><strong>安装运行环境</strong><p><a :href="comfyDocs" target="_blank" rel="noopener noreferrer">打开 Comfy Desktop 官方安装指南 ↗</a>。由官方安装器准备运行环境，本软件不会执行网页中的安装命令。</p></li><li><strong>准备模型与工作流</strong><p>在 ComfyUI 中选择模板，按模板提示下载缺失模型。先确认模板能运行，再导出 API 格式工作流用于连接。</p><a href="https://docs.comfy.org/interface/features/template" target="_blank" rel="noopener noreferrer">查看官方模板与模型下载说明 ↗</a></li><li><strong>连接小冷漫画</strong><p>保持 ComfyUI 运行，输入实际端口后检测。参考图节点和输出节点需与工作流匹配。</p><label>服务端口 <input v-model.number="port" type="number" min="1024" max="65535" /></label><button :disabled="checking" @click="detectComfy">检测 ComfyUI</button><p role="status">{{ comfyMessage }}</p><button :disabled="!comfyReady" @click="emit('images')">连接生图工作流</button></li></ol>
      <p>服务连通 ≠ 模型齐全 ≠ 已验证出图。多角色需要工作流实际使用多张参考；普通文生图模板不能锁定人物。</p>
    </template>
    <template v-else>
      <p>{{ mlxMessage }}</p><p v-if="modelRoot">模型目录：<code>{{ modelRoot }}</code></p>
      <ol><li>已有 MLX 环境：展开下方「已有服务与模型」检测 Z-Image / FLUX.2 klein，并设置默认模型。</li><li>全新电脑：先安装 Python 3.12，再选择下面的模型安装。其他系统请选择 Comfy Desktop 路线。</li></ol>
      <a href="https://www.python.org/downloads/macos/" target="_blank" rel="noopener noreferrer">Python 官方安装页 ↗</a>
      <div class="installControls">
        <label>要安装的模型 <select v-model="installModel" :disabled="installStatus.running"><option value="fluxKlein">FLUX.2 klein · 多角色参考</option><option value="zImage">Z-Image · 草稿文生图</option></select></label>
        <p><a :href="installModel === 'fluxKlein' ? 'https://huggingface.co/mlx-community/flux2-klein-4b-4bit' : 'https://huggingface.co/filipstrand/Z-Image-Turbo-mflux-4bit'" target="_blank" rel="noopener noreferrer">查看模型来源、文件体积与许可 ↗</a></p>
        <label><input v-model="downloadConfirmed" type="checkbox" :disabled="installStatus.running" />我已查看模型要求，允许下载所选模型和独立运行环境</label>
        <div><button :disabled="!installStatus.supported || !downloadConfirmed || installStatus.running || checking" @click="install('install')">安装 / 续传所选模型</button><button v-if="installStatus.running" :disabled="checking" @click="install('cancel')">停止安装</button></div>
        <progress v-if="installStatus.running" aria-label="正在准备模型环境"></progress>
        <p role="status">{{ installStatus.message }}</p><p v-if="installStatus.root">安装日志：<code>{{ installStatus.root }}/installation.log</code></p>
      </div>
      <p>软件安装包不含模型权重。草稿用 Z-Image；多人物参考用 klein，仍需检查人物与动作是否正确。</p>
    </template>
    <details><summary>下载前需要知道什么？</summary><p>模型可能占用数 GB 至数十 GB，请先确认磁盘、设备要求和模型许可。模型由原作者提供；不会把你的 API 密钥、平台登录或项目随安装包分发。</p><p>安装器完成后还需要选择模型与工作流。首次分享建议先用在线 API，或复用已经能运行的本机服务。</p></details>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import axios from "axios";
import { settings } from "@/stores/settings";
const emit = defineEmits<{ images: [] }>();
const choices = [{ id: "api", title: "在线 API · 最快开始", description: "无需本地显卡或模型安装" }, { id: "comfy", title: "ComfyUI · 本地工作流", description: "由官方安装器准备环境" }, { id: "mlx", title: "已有 Mac MLX 环境", description: "复用 Z-Image / klein 权重" }];
const choice = ref("api");
const installModel = ref("fluxKlein");
const downloadConfirmed = ref(false);
const installStatus = ref({ supported: false, running: false, message: "读取安装状态中…", root: "" });
let statusTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
watch(installModel, () => { downloadConfirmed.value = false; });
onMounted(refreshInstall);
onUnmounted(() => { disposed = true; clearTimeout(statusTimer); });
async function refreshInstall() {
  clearTimeout(statusTimer);
  try {
    const { data } = await axios.get("/api/comicStudio/modelSetupStatus", { headers, timeout: 6000 });
    if (!disposed) installStatus.value = data.data;
  } catch { if (!disposed) installStatus.value.message = "安装状态读取失败，请检测环境或稍后重试。"; }
  if (!disposed && installStatus.value.running) statusTimer = setTimeout(refreshInstall, 2000);
}
async function install(action: string) {
  checking.value = true; error.value = "";
  try {
    await axios.post("/api/comicStudio/modelSetup", { action, model: installModel.value }, { headers, timeout: 10000 });
    await refreshInstall();
  } catch (reason) { error.value = axios.isAxiosError(reason) ? reason.response?.data?.message || "无法启动安装，请稍后重试。" : "安装失败"; }
  finally { checking.value = false; }
}
const checking = ref(false);
const machine = ref("");
const platform = ref("");
const modelRoot = ref("");
const mlxMessage = ref("请先检测本机环境。");
const error = ref("");
const port = ref(Number((settings.value.comicLocalServices as Record<string, number> | undefined)?.comfy) || 8188);
const comfyReady = ref(false);
const comfyMessage = ref("尚未检测服务。");
watch(port, () => { comfyReady.value = false; comfyMessage.value = "端口已修改，请重新检测。"; });
const comfyDocs = computed(() => !platform.value ? "https://www.comfy.org/download" : platform.value === "darwin" ? "https://docs.comfy.org/installation/desktop/macos" : "https://docs.comfy.org/installation/desktop/windows");
const headers = { "x-toonflow-workspace": "1" };
async function detect() {
  checking.value = true; error.value = "";
  try {
    const { data } = await axios.get("/api/comicStudio/zImageStatus", { headers, timeout: 10000 });
    const status = data.data;
    await refreshInstall();
    platform.value = status.system?.platform || "";
    machine.value = status.system ? `${status.system.platform} · ${status.system.arch} · ${status.system.memoryGb} GB 内存（不是显存）` : "环境信息暂不可用，请更新服务后重试。";
    modelRoot.value = status.root || "";
    mlxMessage.value = status.system?.platform !== "darwin" || status.system?.arch !== "arm64" ? "此电脑不支持本项目的 Apple Silicon MLX 路线，请选 ComfyUI 或在线 API。" : `Z-Image：${status.installed && status.modelReady ? '环境与模型已就绪' : '缺少环境或权重'}；klein：${status.fluxKlein?.installed && status.fluxKlein?.modelReady ? '环境与模型已就绪' : '缺少环境或权重'}。`;
  } catch { error.value = "读取环境失败，请确认小冷漫画本机服务正在运行。"; }
  finally { checking.value = false; }
}
async function detectComfy() {
  comfyReady.value = false; error.value = "";
  if (!Number.isInteger(port.value) || port.value < 1024 || port.value > 65535) { error.value = "请输入 1024–65535 范围内的端口。"; return; }
  checking.value = true;
  try {
    const { data } = await axios.get("/api/comicStudio/runtime", { params: { service: "comfy", port: port.value }, headers, timeout: 6000 });
    comfyReady.value = !!data.data.available;
    comfyMessage.value = data.data.message;
    if (comfyReady.value) settings.value.comicLocalServices = { ...(settings.value.comicLocalServices as Record<string, number> || {}), comfy: port.value };
  } catch { comfyMessage.value = "检测失败，请确认 ComfyUI 正在运行，并核对端口。"; }
  finally { checking.value = false; }
}
</script>
<style scoped lang="scss">
.setupGuide { padding: 18px; border: 1px solid var(--el-border-color); border-radius: 10px; button { padding: 10px 14px; margin: 6px 10px 6px 0; border: 1px solid var(--el-border-color); border-radius: 8px; background: var(--el-fill-color-light); color: var(--el-text-color-primary); font: inherit; cursor: pointer; &:disabled { opacity: .5; cursor: not-allowed; } } a { color: var(--el-color-primary); } input[type="number"], select { padding: 8px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-bg-color); color: var(--el-text-color-primary); max-width: 100%; } input[type="number"] { width: 100px; } header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; } h3 { margin-top: 0; } p { color: var(--el-text-color-secondary); } .setupChoices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; button { text-align: left; margin: 0; padding: 14px; span { display: block; margin-top: 6px; font-size: 12px; } &.selected { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); } } } ol { padding-left: 22px; li { margin: 12px 0; } } code { overflow-wrap: anywhere; } details { margin-top: 14px; summary { cursor: pointer; } } @media (max-width: 760px) { header { flex-direction: column; } .setupChoices { grid-template-columns: 1fr; } } }
</style>
