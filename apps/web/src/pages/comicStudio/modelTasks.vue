<template>
  <section class="modelTasks">
    <header><div><h3>三种任务，独立选择模型</h3><p>编剧、看图、画图可以使用不同供应商，也可以复用同一个支持相应能力的服务。</p></div><button :disabled="refreshing" @click="refresh">{{ refreshing ? '刷新中…' : '刷新可用服务' }}</button></header>
    <div class="taskCards">
      <article v-for="task in tasks" :key="task.id">
        <div class="taskHeading"><span>{{ task.number }}</span><div><h4>{{ task.title }}</h4><p>{{ task.description }}</p></div></div>
        <label :for="`task${task.id}`">使用的服务</label>
        <select :id="`task${task.id}`" :title="choiceLabel(task.id)" :value="selection(task.id)" @change="choose(task.id, ($event.target as HTMLSelectElement).value)">
          <option value="">请选择模型</option><option v-if="task.id !== 'image'" value="codex">本机 Codex CLI · 需登录与联网</option><option v-if="task.id === 'vision'" value="inherit">沿用编剧 · {{ textLabel }}</option>
          <option v-for="model in task.id === 'image' ? imageModels : textModels" :key="key(model)" :value="key(model)">{{ modelLabel(model) }}</option>
        </select>
        <p class="selectionState">{{ state(task.id) }}</p>
        <div class="taskActions"><button class="configure" @click="emit('configure', task.id === 'image' ? 'mediaModel' : 'languageModel')">{{ (task.id === 'image' ? imageModels : textModels).length ? '管理服务' : '添加服务' }}</button><button :disabled="!!checking || !selection(task.id)" @click="check(task.id)">{{ checking === task.id ? '检测中…' : '检测连接' }}</button></div>
        <p v-if="messages[task.id]" class="checkResult" role="status">{{ messages[task.id] }}</p>
      </article>
    </div>
    <div class="nextSteps"><strong>不知道怎么选？</strong><p>已有 API：添加供应商，填写地址和密钥，获取模型列表，再回这里分配任务。想离线运行：先检测电脑环境，再安装或连接本地服务。</p><button @click="emit('configure', 'languageModel')">配置在线 / 兼容 API</button><button @click="emit('configure', 'comicLocal')">检测或安装本地模型 · 含 MOSS 指引</button></div>
    <details class="advanced"><summary>高级与诊断 · Codex 参数、真实文本试运行</summary><label>Codex 模型 ID<input v-model="codexModel" maxlength="101" /></label><label>推理强度<select v-model="textEffort"><option value="low">快速</option><option value="medium">均衡</option><option value="high">细致</option><option value="xhigh">深入</option></select></label><p>连接检测只读取模型列表或本机状态，不生成内容。下面的试运行会调用编剧模型，可能产生费用。</p><button :disabled="modelChecking || !selection('text')" @click="emit('probe')">{{ modelChecking ? '正在试运行…' : '真实文本试运行 · 可能计费' }}</button><p role="status">{{ modelProbeMessage }}</p></details>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { customProviders, settings } from '@/stores/settings';
type Model = { providerId: string; modelId: string; label: string; configured?: boolean };
type Task = 'text' | 'vision' | 'image';
const props = defineProps<{ textModels: Model[]; imageModels: Model[]; modelChecking: boolean; modelProbeMessage: string; refreshModels: () => Promise<void> }>();
const emit = defineEmits<{ configure: [panel: string]; probe: [] }>();
const textMode = defineModel<'api' | 'codex'>('textMode', { required: true });
const textModel = defineModel<string>('textModel', { required: true });
const imageModel = defineModel<string>('imageModel', { required: true });
const referenceAnalysisMode = defineModel<'selected' | 'codex' | 'api'>('referenceAnalysisMode', { required: true });
const referenceModel = defineModel<string>('referenceModel', { required: true });
const codexModel = defineModel<string>('codexModel', { required: true });
const textEffort = defineModel<'low' | 'medium' | 'high' | 'xhigh'>('textEffort', { required: true });
const tasks: {id: Task; number: string; title: string; description: string}[] = [{id:'text',number:'01',title:'编剧与分镜',description:'整理素材、创作故事、生成分镜和文案。'},{id:'vision',number:'02',title:'图片分析',description:'理解参考图，提取角色外形与画风。需要视觉输入能力。'},{id:'image',number:'03',title:'图像生成',description:'绘制角色、画风样张和漫画。与图片分析独立。'}];
const key = (model: Model) => `${model.providerId}/${model.modelId}`;
function modelLabel(model: Model) { const provider=customProviders.value.find(item=>item.id===model.providerId); return provider ? `${provider.label} · ${model.label}` : model.label; }
const textLabel = computed(() => textMode.value === 'codex' ? 'Codex CLI' : props.textModels.find(model => key(model) === textModel.value) ? modelLabel(props.textModels.find(model => key(model) === textModel.value)!) : '尚未选择');
function selection(task: Task) { return task === 'text' ? textMode.value === 'codex' ? 'codex' : textModel.value : task === 'image' ? imageModel.value : referenceAnalysisMode.value === 'selected' ? 'inherit' : referenceAnalysisMode.value === 'codex' ? 'codex' : referenceModel.value; }
function choose(task: Task, value: string) { if (task === 'image') imageModel.value = value; else if (task === 'text') { textMode.value = value === 'codex' ? 'codex' : 'api'; if (value !== 'codex') textModel.value = value; } else { referenceAnalysisMode.value = value === 'inherit' ? 'selected' : value === 'codex' ? 'codex' : 'api'; if (!['inherit','codex'].includes(value)) referenceModel.value = value; } }
function choiceLabel(task: Task) { const value=selection(task); if(value==='inherit')return `沿用编剧：${textLabel.value}`; if(value==='codex')return `Codex CLI · ${codexModel.value}`; const model=(task==='image'?props.imageModels:props.textModels).find(item=>key(item)===value); return model ? modelLabel(model) : '未选择'; }
function state(task: Task) { if (!selection(task)) return '未选择 · 点击添加服务开始配置'; if (task === 'vision') return '识图能力须查供应商说明；模型列表连通不代表支持图片。'; if (task === 'image') return props.imageModels.find(model => key(model) === imageModel.value)?.configured ? '已配置 · 生成效果尚需在作品中确认' : '配置未就绪 · 请管理服务或检测本地环境'; return '自动保存 · 不影响图片分析和生图的独立选择'; }
const messages = reactive<Record<string, string>>({});
const checking = ref('');
const refreshing = ref(false);
let checkVersion = 0;
watch(() => [textMode.value,textModel.value,imageModel.value,referenceAnalysisMode.value,referenceModel.value,settings.value.customProviders,settings.value.mediaProviderConfigs], () => { checkVersion++; for (const id of Object.keys(messages)) delete messages[id]; }, {deep:true});
async function refresh() { refreshing.value=true; try { await props.refreshModels(); } finally { refreshing.value=false; } }
async function check(task: Task) {
  checking.value=task; const version=++checkVersion;
  try {
    let value=selection(task); if (value === 'inherit') value=selection('text');
    let message='';
    if (task === 'image') {
      const providerId=value.slice(0,value.indexOf('/'));
      const configs=settings.value.mediaProviderConfigs as Record<string,Record<string,unknown>> | undefined;
      const config=configs?.[providerId];
      if(providerId.startsWith('imageApi')) {
        if(!config?.baseUrl || !config.apiKey || !config.modelId) throw new Error('请先填写图片 API 地址、密钥和模型 ID。');
        const {data}=await axios.post('/api/providers/models',{apiUrl:String(config.baseUrl),apiKey:String(config.apiKey),protocol:'openai-completions'},{timeout:20000});
        if(data.code!==200 || !Array.isArray(data.data)) throw new Error(data.message || '未取得模型列表');
        message=data.data.some((model:{id:string})=>model.id===config.modelId) ? '连接成功，列表包含图片模型。未调用生图；参考图接口和实际生成仍需在作品中确认。' : '服务已响应，但未列出此图片模型。请核对模型 ID；未执行生图。';
      } else if(providerId==='comfyLocal') {
        const {data}=await axios.get('/api/comicStudio/runtime',{params:{service:'comfy',port:Number(config?.port || 8188)},headers:{'x-toonflow-workspace':'1'},timeout:8000});
        message=`${data.data.message}；${config?.workflow ? '工作流已保存，节点与权重尚未经过实际生成验证。' : '还需要导入 API 工作流。'}`;
      } else { await props.refreshModels(); message=props.imageModels.find(model => key(model) === value)?.configured ? '已检查配置或本机安装状态。未发起生图，不代表已验证实际生成。' : '配置不完整或本机服务未就绪，请打开本地安装与连接。'; }
    }
    else if (value === 'codex') { const {data}=await axios.get('/api/comicStudio/cliStatus',{headers:{'x-toonflow-workspace':'1'},timeout:25000}); message=data.data.available && data.data.loggedIn ? '已检测到 Codex 登录。未执行文本或图片生成。' : data.data.message || '请先安装并登录 Codex CLI。'; }
    else { const slash=value.indexOf('/'); const provider=customProviders.value.find(item=>item.id===value.slice(0,slash)); if (!provider) throw new Error('服务已不存在，请重新选择或添加。'); const {data}=await axios.post('/api/providers/models',{apiUrl:provider.apiUrl,protocol:provider.protocol,apiKey:provider.apiKey || ''},{timeout:20000}); if(data.code!==200 || !Array.isArray(data.data)) throw new Error(data.message || '未取得模型列表'); message=data.data.some((model:{id:string})=>model.id===value.slice(slash+1)) ? '连接成功，模型列表包含所选模型。未验证实际生成或视觉能力。' : '服务已响应，但未列出所选模型。部分供应商不提供完整列表，请核对模型 ID。'; }
    if(version===checkVersion) messages[task]=message;
  } catch(error) { if(version===checkVersion) messages[task]=axios.isAxiosError(error) ? error.response?.data?.message || '检测失败：请检查地址、凭证或服务是否启动。也可能是供应商未开放模型列表接口。' : (error as Error).message; }
  finally { checking.value=''; }
}
</script>
<style scoped>
.modelTasks { display:grid; gap:22px; color:var(--el-text-color-primary); }.modelTasks header { display:flex; justify-content:space-between; align-items:start; gap:20px; } h3,h4,p { margin:0; } p { color:var(--el-text-color-secondary); line-height:1.65; font-size:13px; margin-top:8px; } .taskCards { display:grid; gap:14px; }.taskCards article { padding:20px; border:1px solid var(--el-border-color); border-radius:12px; display:grid; grid-template-columns:minmax(180px,1fr) minmax(220px,1.4fr); gap:10px 24px; } .taskHeading { grid-column:1; grid-row:1 / span 4; display:flex; gap:12px; }.taskHeading > span { font-size:12px; padding:7px; background:var(--el-fill-color); border-radius:6px; height:fit-content; }.taskCards label,.selectionState,.taskActions,.checkResult { grid-column:2; }.taskCards select { grid-column:2; } select,input { padding:11px; width:100%; box-sizing:border-box; border:1px solid var(--el-border-color); background:var(--el-bg-color); color:inherit; border-radius:7px; font:inherit; } button { padding:9px 12px; border:1px solid var(--el-border-color); border-radius:7px; background:var(--el-bg-color); color:inherit; cursor:pointer; font:inherit; font-size:13px; } button:disabled { opacity:.5; cursor:default; } button:focus-visible,select:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:2px; }.taskActions { display:flex; gap:8px; flex-wrap:wrap; }.configure { color:var(--el-color-primary); }.nextSteps { padding:18px; background:var(--el-fill-color-light); border-radius:10px; }.nextSteps button { margin:12px 8px 0 0; }.advanced summary { cursor:pointer; padding:12px 0; }.advanced label { display:block; margin:12px 0; }.checkResult { background:var(--el-fill-color-light); padding:12px; border-radius:6px; } @media(max-width:700px) { .taskCards article { grid-template-columns:1fr; }.taskCards article > * { grid-column:1; grid-row:auto; }.modelTasks header { flex-direction:column; } }
.taskCards { grid-template-columns:repeat(3,minmax(0,1fr)); }.taskCards article { display:flex; flex-direction:column; padding:16px; gap:10px; min-width:0; }.taskHeading { min-height:92px; }.taskCards select { min-width:0; max-width:100%; }.selectionState { min-height:44px; margin:0; }.taskActions { margin-top:auto; }.taskActions button { flex:1; }.taskCards label { font-size:12px; }.taskHeading > span { flex-shrink:0; }@media(max-width:900px){.taskCards { grid-template-columns:1fr; }.taskHeading { min-height:0; }.selectionState { min-height:0; }}
</style>
