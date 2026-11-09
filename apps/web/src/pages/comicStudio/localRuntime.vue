<template>
  <div class="runtimeSettings"><div class="runtimeNavigation"><button :aria-pressed="runtimeView === 'connect'" @click="runtimeView = 'connect'">已有模型：检测与连接</button><button :aria-pressed="runtimeView === 'install'" @click="runtimeView = 'install'">还没有模型：安装指引</button><button :aria-pressed="runtimeView === 'moss'" @click="runtimeView = 'moss'">MOSS-Image</button></div><runtimeSetup v-if="runtimeView === 'install'" @images="emit('images')" /><section v-else-if="runtimeView === 'moss'" class="mossGuide"><h3>MOSS-Image · 通过 ComfyUI 接入</h3><p>这是生图模型，可与任意编剧和图片分析服务搭配。现有 ComfyUI 连接可运行兼容工作流；本应用尚未内置 MOSS 权重下载器。</p><ol><li>查看官方模型与设备要求。Mac 使用 MPS 路线，不能直接复用当前 MLX 安装器。</li><li>在支持 MOSS-Image 的 ComfyUI 中安装权重，确认工作流可运行。</li><li>导出 API 格式工作流，在本应用配置提示词、尺寸和输出节点，保存后选择为生图服务。</li></ol><div class="mossLinks"><a href="https://github.com/OpenMOSS/MOSS-Image" target="_blank" rel="noopener noreferrer">官方模型与安装说明 ↗</a><a href="https://github.com/OpenMOSS/MOSS-Image/blob/main/docs/macos_zh.md" target="_blank" rel="noopener noreferrer">Mac 安装与限制 ↗</a><a href="https://github.com/OpenMOSS/MOSS-Image/blob/main/comfyui/README_ZH.md" target="_blank" rel="noopener noreferrer">ComfyUI 工作流指南 ↗</a></div><p>官方当前提供 Base / SFT；未核实独立 CharRef 版本，不能把普通文生图当作多角色身份锁定。下载体积与显存需求以具体权重和运行方式为准。</p><button @click="emit('images')">配置 ComfyUI 生图服务</button></section><div v-else class="existingServices"><label>选择已有服务<select v-model="runtimeService"><option value="codex">Codex CLI</option><option value="zImage">Z-Image · Mac MLX</option><option value="klein">FLUX.2 klein · Mac MLX</option><option v-for="service in services" :key="service.id" :value="service.id">{{ service.label }}</option></select></label><section v-if="runtimeService === 'codex'"><h3>ChatGPT / Codex 内置生图</h3><p>复用本机 Codex CLI 的 ChatGPT 登录和账号额度，不需要单独的 OpenAI API Key。适合已有会员、想直接生成角色图或分格的场景。</p><button :disabled="!!working" @click="probeCodex">检测 Codex 登录与生图能力</button><p role="status">{{ codexMessage }}</p><button :disabled="!codexReady || !!working" @click="emit('imageConnected', 'codex/imagegen')">设为默认生图模型</button><p class="helperText">注意：Codex CLI 在部分 Windows 版本上会出现 image_generation 开关为 true、但会话内没有 image_gen 工具的问题；检测通过不等于实际出图成功，建议先做单格测试。</p><a href="https://platform.openai.com/docs/guides/image-generation" target="_blank" rel="noopener noreferrer">或配置 OpenAI Images API（按张计费）↗</a></section><section v-if="runtimeService === 'zImage'"><h3>Z-Image Turbo · 本机 MLX 生图</h3><p>Apple Silicon 专用，4-bit 量化；默认768×1024、9步，分格出图可切换草稿或细节优先；保留低内存加载。文生图与单张图生图，不支持多角色参考图锁定。不调用云端 API。</p><button :disabled="!!working" @click="probeZImage">检测本地 Z-Image</button><p role="status">{{ zImageMessage }}</p><p v-if="zImageRoot">本地环境与模型目录：<code>{{ zImageRoot }}</code></p><button :disabled="!zImageReady || !!working" @click="emit('imageConnected', 'zImage/turbo4bit')">设为默认生图模型</button></section><section v-if="runtimeService === 'klein'"><h3>FLUX.2 klein · 本机多角色参考</h3><p>4-bit量化、4步，复用MLX环境。每格实际读取正式角色图，保留各自外形与服装，改变场景和动作；最多4张参考。人物一致性需要生成后审核。</p><button :disabled="!!working" @click="probeZImage">检测本地多参考模型</button><p role="status">{{ kleinMessage }}</p><p v-if="kleinRoot">权重目录：<code>{{ kleinRoot }}</code></p><button :disabled="!kleinReady || !!working" @click="emit('imageConnected', 'fluxKlein/klein4bit')">设为默认生图模型</button></section><section v-for="service in services.filter(item => item.id === runtimeService)" :key="service.id"><h3>{{ service.label }}</h3><p>{{ service.description }}</p><label :for="`port${service.id}`">本机端口</label><input :id="`port${service.id}`" v-model.number="ports[service.id]" type="number" min="1024" max="65535" /><button :disabled="!!working" @click="probe(service.id)">检测服务与模型</button><p role="status">{{ statuses[service.id]?.message || '尚未检测' }}</p><button v-if="service.id !== 'comfy'" :disabled="!!working || !statuses[service.id]?.models.length" @click="connect(service.id)">添加到文本模型</button><button v-else @click="emit('images')">去生图模型配置 ComfyUI 工作流</button><a :href="service.docs" target="_blank" rel="noopener noreferrer">官方文档 ↗</a></section><p v-if="error" role="alert">{{ error }}</p></div></div>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import runtimeSetup from "./runtimeSetup.vue";
import axios from "axios";
import { settings, saveSettings } from "@/stores/settings";
const emit = defineEmits<{ connected: [model: string]; images: []; imageConnected: [model: string] }>();
const runtimeView = ref("connect");
const runtimeService = ref("comfy");
const zImageMessage = ref("点击检测环境与模型下载状态");
const zImageReady = ref(false);
const zImageRoot = ref("");
const kleinMessage = ref("点击检测多参考模型下载状态");
const kleinReady = ref(false);
const kleinRoot = ref("");
const codexMessage = ref("点击检测 Codex 登录与内置生图能力");
const codexReady = ref(false);
const working = ref("");
async function probeCodex() {
  working.value = "codex";
  try {
    const { data } = await axios.get("/api/comicStudio/cliStatus", { headers: { "x-toonflow-workspace": "1" }, timeout: 25000 });
    const status = data.data;
    codexReady.value = !!(status.available && status.loggedIn && status.imageGeneration);
    codexMessage.value = !status.available ? status.message || "未检测到 Codex CLI" : !status.loggedIn ? "Codex CLI 已安装但未登录" : status.imageGeneration ? `Codex ${status.version || ""} 已登录；feature flag 已开启。请先做单格测试，Windows 上可能仍缺 image_gen 工具。` : "Codex 已登录，但当前 CLI 没有开启 image_generation。";
  } catch { codexMessage.value = "Codex 状态读取失败，请确认本机 CLI 可用"; }
  finally { working.value = ""; }
}
async function probeZImage() {
  working.value = "zImage";
  try {
    const { data } = await axios.get("/api/comicStudio/zImageStatus", { headers: { "x-toonflow-workspace": "1" } });
    zImageMessage.value = data.data.message;
    zImageRoot.value = data.data.root || "";
    zImageReady.value = data.data.installed && data.data.modelReady;
    const klein = data.data.fluxKlein;
    kleinReady.value = !!klein?.installed && !!klein.modelReady;
    kleinRoot.value = klein?.root || "";
    kleinMessage.value = kleinReady.value ? "已检测到环境和权重 · 尚未验证实际生成" : "模型未下载完整或缺少MLX编辑环境";
  } catch { zImageMessage.value = "本地模型状态读取失败，请重试"; }
  finally { working.value = ""; }
}
const services = [{ id: "ollama", label: "Ollama · 本地文本模型", description: "使用本机已下载的模型写剧本、提取关键词和分析反馈。", docs: "https://docs.ollama.com/api/openai-compatibility" }, { id: "lmStudio", label: "LM Studio · 本地文本模型", description: "先在 LM Studio 开启本地 OpenAI 兼容服务器。", docs: "https://lmstudio.ai/docs/developer/openai-compat" }, { id: "comfy", label: "ComfyUI · 本地生图", description: "生图供应商已接入本地工作流。需要本机安装模型并配置 API 格式工作流及参考图节点。", docs: "https://docs.comfy.org/development/comfyui-server/comms_routes" }];
const stored = settings.value.comicLocalServices as Record<string, number> | undefined;
const ports = reactive<Record<string, number>>({ ollama: stored?.ollama || 11434, lmStudio: stored?.lmStudio || 1234, comfy: stored?.comfy || 8188 });
watch(ports, () => { if (Object.values(ports).every((value) => Number.isInteger(value) && value >= 1024 && value <= 65535)) settings.value.comicLocalServices = { ...ports }; });
const statuses = reactive<Record<string, { available: boolean; models: string[]; message: string }>>({});
const error = ref("");
async function probe(service: string) {
  working.value = service; error.value = "";
  try { const { data } = await axios.get("/api/comicStudio/runtime", { params: { service, port: ports[service] }, headers: { "x-toonflow-workspace": "1" }, timeout: 6000 }); statuses[service] = data.data; }
  catch { error.value = "检测失败，请检查端口或服务是否启动。"; }
  finally { working.value = ""; }
}
async function connect(service: string) {
  working.value = service; error.value = "";
  try {
    const status = statuses[service];
    if (!status?.available || !status.models.length) throw new Error("请先检测到本地模型");
    const id = service === "ollama" ? "localOllama" : "localLmStudio";
    await saveSettings((current) => {
      const providers = Array.isArray(current.customProviders) ? current.customProviders : [];
      if (providers.some((item) => (item as { id?: string }).id === id)) throw new Error("该本地供应商已存在，请在文本模型里编辑，避免覆盖已有配置");
      return { customProviders: [...providers, { id, label: services.find((item) => item.id === service)!.label, protocol: "openai-completions", apiUrl: `http://127.0.0.1:${ports[service]}/v1`, apiKey: "", models: status.models.map((model) => ({ id: model, label: model })) }] };
    });
    emit("connected", `${id}/${status.models[0]}`);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "本地模型添加失败"; }
  finally { working.value = ""; }
}
</script>
<style scoped lang="scss">
.runtimeSettings { .existingServices { margin-top: 18px; summary { cursor: pointer; padding: 14px 0; font-weight: 600; } } line-height: 1.7; section { border: 1px solid var(--el-border-color); border-radius: 10px; padding: 18px; margin-bottom: 16px; } input { width: 120px; padding: 9px; margin: 8px; } button { padding: 9px 12px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-fill-color-light); color: var(--el-text-color-primary); font: inherit; cursor: pointer; margin: 6px 10px 6px 0; } button:disabled { opacity: .5; cursor: not-allowed; } a { display: inline-block; margin: 8px; } }
</style>

<style scoped>
.runtimeNavigation { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; } .runtimeNavigation button { padding:10px 14px; border:1px solid var(--el-border-color); border-radius:8px; background:var(--el-bg-color); color:var(--el-text-color-primary); cursor:pointer; } .runtimeNavigation button[aria-pressed="true"] { color:var(--el-color-primary); border-color:var(--el-color-primary); } .mossGuide { padding:20px; border:1px solid var(--el-border-color); border-radius:12px; line-height:1.8; } .mossLinks { display:grid; gap:8px; } .existingServices > label { display:grid; gap:8px; } .existingServices > label select { padding:12px; font:inherit; color:inherit; background:var(--el-bg-color); border:1px solid var(--el-border-color); border-radius:8px; }
</style>
