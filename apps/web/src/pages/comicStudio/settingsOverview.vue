<template>
  <section class="settingsOverview"><header><div><h3>先连接能力，再分配给创作任务。</h3><p>统一管理模型、账号与采集任务；配置状态和实际连接状态分别展示。</p></div><button :disabled="checking" @click="inspect">{{ checking ? '正在检测…' : '重新检测状态' }}</button></header><div class="capabilityGrid"><article><span class="capabilityIcon">文</span><h4>文本模型</h4><strong>{{ textMode === 'codex' ? (cli.loggedIn ? 'Codex 已登录' : checking ? '检查本机登录…' : cli.available ? 'Codex 待登录' : '未检测到 Codex') : textLabel || '尚未选择文本模型' }}</strong><p>用于选梗、故事脚本、分镜结构和数据复盘。</p><small>{{ textMode === 'codex' ? `本机CLI ${cli.version || '未检测'} · ${codexModel || '默认模型'}。登录状态不代表调用成功，请到默认任务测试文本生成。` : 'API 模型配置不会自动替换漫画任务的默认选择。' }}</small><button @click="emit('navigate', 'languageModel')">配置文本模型</button><button class="quietButton" @click="emit('navigate', 'comicDefaults')">分配默认任务</button></article><article><span class="capabilityIcon">图</span><h4>生图模型</h4><strong>{{ imageLabel || '尚未选择生图模型' }}</strong><p>用于角色设定图、画风样张和逐格出图。</p><small>API供应商与本地ComfyUI工作流均在此管理。未配置图片服务时，使用任务包生成后导入。</small><button @click="emit('navigate', 'mediaModel')">配置生图模型</button><button class="quietButton" @click="emit('navigate', 'comicLocal')">本地生图服务</button></article><article><span class="capabilityIcon">连</span><h4>平台账号与数据</h4><strong>{{ xhs.loggedIn ? '小红书本人会话已登录' : xhs.available ? '小红书服务就绪 · 待登录' : '小红书服务尚未就绪' }}</strong><p>小红书扫码搜索；抖音和B站可打开专用浏览器本人登录，按需收集可见内容。</p><small>账号登录不等于已取得创作者后台指标权限。每个平台列出实际可采集范围。</small><button @click="emit('navigate', 'comicPlatforms')">管理平台连接</button></article><article><span class="capabilityIcon">采</span><h4>自动采集</h4><strong>{{ automatic ? `已开启 · ${intervalMinutes}分钟间隔` : '尚未开启' }}</strong><p>分析页自动保存热点和已登记作品的指标快照。</p><small>同步失败保留旧数据。关闭应用后不继续运行，不自动发布作品。</small><button @click="emit('navigate', 'comicCollection')">配置采集计划</button></article></div><section class="settingsSteps"><h4>推荐配置顺序</h4><ol><li>文本模型：使用本机Codex，或添加API / 本地文本服务。</li><li>生图模型：配置图片供应商，或连接本机ComfyUI工作流。</li><li>任务分配：分别选择漫画使用的文本模型和生图模型。</li><li>平台与采集：连接所需账号，在分析页登记作品链接。</li></ol></section><p v-if="error" role="alert">{{ error }}</p></section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import axios from "axios";
defineProps<{ textMode: string; textLabel: string; imageLabel: string; codexModel: string; automatic: boolean; intervalMinutes: number }>();
const emit = defineEmits<{ navigate: [panel: string] }>();
const cli = reactive({ available: false, loggedIn: false, version: "" });
const xhs = reactive({ available: false, loggedIn: false });
const checking = ref(false);
const error = ref("");
async function inspect() {
  checking.value = true; error.value = "";
  const headers = { "x-toonflow-workspace": "1" };
  const results = await Promise.allSettled([axios.get("/api/comicStudio/cliStatus", { headers, timeout: 7000 }), axios.get("/api/comicStudio/xhsLogin", { headers, params: { action: "status" }, timeout: 7000 })]);
  if (results[0].status === "fulfilled") Object.assign(cli, results[0].value.data.data); else error.value = "本机文字服务检测失败，可重试或选择API。";
  if (results[1].status === "fulfilled") Object.assign(xhs, results[1].value.data.data); else error.value += " 小红书状态暂不可读，请到平台连接页检查。";
  checking.value = false;
}
onMounted(inspect);
</script>
<style scoped lang="scss">
.settingsOverview { header { display: flex; align-items: start; justify-content: space-between; gap: 20px; h3 { margin: 0 0 8px; font-size: 20px; } p { margin: 0 0 20px; } } p, small { color: var(--el-text-color-secondary); line-height: 1.7; } button { padding: 10px 13px; min-height: 40px; border-radius: 7px; border: 1px solid var(--el-border-color); background: var(--el-fill-color-light); color: var(--el-text-color-primary); cursor: pointer; font: inherit; } .capabilityGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; article { border: 1px solid var(--el-border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: start; } h4 { font-size: 17px; margin: 12px 0; } strong { font-size: 14px; } p { margin: 12px 0; } small { display: block; margin-bottom: 16px; } button { margin-top: auto; } .quietButton { margin-top: 8px; background: transparent; } } .capabilityIcon { background: var(--el-color-primary-light-9); color: var(--el-color-primary); padding: 8px 11px; border-radius: 8px; font-weight: 650; } .settingsSteps { border-top: 1px solid var(--el-border-color); margin-top: 24px; padding-top: 8px; li { padding: 5px 0; } } @media(max-width: 700px) { .capabilityGrid { grid-template-columns: 1fr; } header { display: block; } } }
</style>
