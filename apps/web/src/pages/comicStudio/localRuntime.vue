<template>
  <div class="runtimeSettings"><p>这里连接已在本机运行的服务。软件不会自动下载大模型或启动 GPU 任务；检测可用后再用于创作。</p><section><h3>Z-Image Turbo · 本机 MLX 生图</h3><p>Apple Silicon 专用，4-bit 量化；默认768×1024、9步，分格出图可切换草稿或细节优先；保留低内存加载。文生图与单张图生图，不支持多角色参考图锁定。不调用云端 API。</p><button :disabled="!!working" @click="probeZImage">检测本地 Z-Image</button><p role="status">{{ zImageMessage }}</p><button :disabled="!zImageReady || !!working" @click="emit('imageConnected', 'zImage/turbo4bit')">设为默认生图模型</button></section><section v-for="service in services" :key="service.id"><h3>{{ service.label }}</h3><p>{{ service.description }}</p><label :for="`port${service.id}`">本机端口</label><input :id="`port${service.id}`" v-model.number="ports[service.id]" type="number" min="1024" max="65535" /><button :disabled="!!working" @click="probe(service.id)">检测服务与模型</button><p role="status">{{ statuses[service.id]?.message || '尚未检测' }}</p><button v-if="service.id !== 'comfy'" :disabled="!!working || !statuses[service.id]?.models.length" @click="connect(service.id)">添加到文本模型</button><button v-else @click="emit('images')">去生图模型配置 ComfyUI 工作流</button><a :href="service.docs" target="_blank" rel="noopener noreferrer">官方文档 ↗</a></section><p v-if="error" role="alert">{{ error }}</p></div>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import axios from "axios";
import { settings, saveSettings } from "@/stores/settings";
const emit = defineEmits<{ connected: [model: string]; images: []; imageConnected: [model: string] }>();
const zImageMessage = ref("点击检测环境与模型下载状态");
const zImageReady = ref(false);
async function probeZImage() {
  working.value = "zImage";
  try {
    const { data } = await axios.get("/api/comicStudio/zImageStatus", { headers: { "x-toonflow-workspace": "1" } });
    zImageMessage.value = data.data.message;
    zImageReady.value = data.data.installed && data.data.modelReady;
  } catch { zImageMessage.value = "本地模型状态读取失败，请重试"; }
  finally { working.value = ""; }
}
const services = [{ id: "ollama", label: "Ollama · 本地文本模型", description: "使用本机已下载的模型写剧本、提取关键词和分析反馈。", docs: "https://docs.ollama.com/api/openai-compatibility" }, { id: "lmStudio", label: "LM Studio · 本地文本模型", description: "先在 LM Studio 开启本地 OpenAI 兼容服务器。", docs: "https://lmstudio.ai/docs/developer/openai-compat" }, { id: "comfy", label: "ComfyUI · 本地生图", description: "生图供应商已接入本地工作流。需要本机安装模型并配置 API 格式工作流及参考图节点。", docs: "https://docs.comfy.org/development/comfyui-server/comms_routes" }];
const stored = settings.value.comicLocalServices as Record<string, number> | undefined;
const ports = reactive<Record<string, number>>({ ollama: stored?.ollama || 11434, lmStudio: stored?.lmStudio || 1234, comfy: stored?.comfy || 8188 });
watch(ports, () => { if (Object.values(ports).every((value) => Number.isInteger(value) && value >= 1024 && value <= 65535)) settings.value.comicLocalServices = { ...ports }; });
const statuses = reactive<Record<string, { available: boolean; models: string[]; message: string }>>({});
const working = ref("");
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
