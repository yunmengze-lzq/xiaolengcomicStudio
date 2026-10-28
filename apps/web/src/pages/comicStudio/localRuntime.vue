<template>
  <div class="runtimeSettings"><section><h3>如何选择本地或在线生图</h3><ol><li>本机模型：固定角色选 FLUX.2 klein 多参考；草稿可选 Z-Image。</li><li>本机 ComfyUI：先启动服务并准备工作流 → 检测 → 去生图模型添加「本地 ComfyUI」。</li><li>在线图片 API：在生图模型添加「在线图片 API」，填写地址、密钥和图片模型ID。</li><li>最后在默认任务选择生图模型。角色、画风和漫画共用该选择，随时可以切换。</li></ol><p>Codex 生图需要联网并使用账号额度；它不属于离线本机模型。图片分析需要支持识图的文本模型，Z-Image本身不负责分析。</p></section><p>这里连接已在本机运行的服务。软件不会自动下载大模型或启动 GPU 任务；检测可用后再用于创作。</p><section><h3>ChatGPT / Codex 内置生图</h3><p>复用本机 Codex CLI 的 ChatGPT 登录和账号额度，不需要单独的 OpenAI API Key。适合已有会员、想直接生成角色图或分格的场景。</p><button :disabled="!!working" @click="probeCodex">检测 Codex 登录与生图能力</button><p role="status">{{ codexMessage }}</p><button :disabled="!codexReady || !!working" @click="emit('imageConnected', 'codex/imagegen')">设为默认生图模型</button><p class="helperText">注意：Codex CLI 在部分 Windows 版本上会出现 image_generation 开关为 true、但会话内没有 image_gen 工具的问题；检测通过不等于实际出图成功，建议先做单格测试。</p><a href="https://platform.openai.com/docs/guides/image-generation" target="_blank" rel="noopener noreferrer">或配置 OpenAI Images API（按张计费）↗</a></section><section><h3>Z-Image Turbo · 本机 MLX 生图</h3><p>Apple Silicon 专用，4-bit 量化；默认768×1024、9步，分格出图可切换草稿或细节优先；保留低内存加载。文生图与单张图生图，不支持多角色参考图锁定。不调用云端 API。</p><button :disabled="!!working" @click="probeZImage">检测本地 Z-Image</button><p role="status">{{ zImageMessage }}</p><p v-if="zImageRoot">本地环境与模型目录：<code>{{ zImageRoot }}</code></p><button :disabled="!zImageReady || !!working" @click="emit('imageConnected', 'zImage/turbo4bit')">设为默认生图模型</button></section><section><h3>FLUX.2 klein · 本机多角色参考</h3><p>4-bit量化、4步，复用MLX环境。每格实际读取正式角色图，保留各自外形与服装，改变场景和动作；最多4张参考。人物一致性需要生成后审核。</p><button :disabled="!!working" @click="probeZImage">检测本地多参考模型</button><p role="status">{{ kleinMessage }}</p><p v-if="kleinRoot">权重目录：<code>{{ kleinRoot }}</code></p><button :disabled="!kleinReady || !!working" @click="emit('imageConnected', 'fluxKlein/klein4bit')">设为默认生图模型</button></section><section v-for="service in services" :key="service.id"><h3>{{ service.label }}</h3><p>{{ service.description }}</p><label :for="`port${service.id}`">本机端口</label><input :id="`port${service.id}`" v-model.number="ports[service.id]" type="number" min="1024" max="65535" /><button :disabled="!!working" @click="probe(service.id)">检测服务与模型</button><p role="status">{{ statuses[service.id]?.message || '尚未检测' }}</p><button v-if="service.id !== 'comfy'" :disabled="!!working || !statuses[service.id]?.models.length" @click="connect(service.id)">添加到文本模型</button><button v-else @click="emit('images')">去生图模型配置 ComfyUI 工作流</button><a :href="service.docs" target="_blank" rel="noopener noreferrer">官方文档 ↗</a></section><p v-if="error" role="alert">{{ error }}</p></div>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import axios from "axios";
import { settings, saveSettings } from "@/stores/settings";
const emit = defineEmits<{ connected: [model: string]; images: []; imageConnected: [model: string] }>();
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
    kleinMessage.value = kleinReady.value ? "多参考编辑已就绪 · 本机运行，无API费用" : "模型未下载完整或缺少MLX编辑环境";
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
.runtimeSettings { line-height: 1.7; section { border: 1px solid var(--el-border-color); border-radius: 10px; padding: 18px; margin-bottom: 16px; } input { width: 120px; padding: 9px; margin: 8px; } button { padding: 9px 12px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-fill-color-light); color: var(--el-text-color-primary); font: inherit; cursor: pointer; margin: 6px 10px 6px 0; } button:disabled { opacity: .5; cursor: not-allowed; } a { display: inline-block; margin: 8px; } }
</style>
