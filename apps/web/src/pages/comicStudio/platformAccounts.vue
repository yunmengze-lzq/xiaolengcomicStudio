<template>
  <section class="platformAccounts">
    <p>抖音、B站与论坛使用独立的专用浏览器。仅在点击收集时读取可见内容，登录资料保存在本机，不读取你日常浏览器的账号。</p>
    <details v-for="platform in platforms" :key="platform.id" :open="platform.id === 'douyin'">
      <summary><icon-chevron-right :size="16" /><h3>{{ platform.label }}</h3><span>{{ states[platform.id].hasSession ? '检测到登录会话' : states[platform.id].running ? (['douyin', 'bilibili'].includes(platform.id) ? '等待本人登录' : '浏览器已打开') : '未打开登录浏览器' }}</span></summary>
      <p>{{ platform.description }}</p>
      <ol><li>{{ ["douyin", "bilibili"].includes(platform.id) ? "在平台官网本人登录；扫码、短信和验证码在官网完成。" : "先浏览公开帖子；如平台要求登录或验证，在官网本人完成。" }}</li><li>手动浏览推荐、搜索结果或具体作品，返回这里按需收集可见标题与链接。</li></ol>
      <div class="accountActions"><button :disabled="disabled || !!pending" @click="perform(platform.id, 'open')">打开{{ platform.label }}登录浏览器</button><button :disabled="disabled || !!pending" @click="perform(platform.id, 'status')">检查{{ platform.label }}会话</button><button :disabled="disabled || !!pending || (!states[platform.id].running || (['douyin', 'bilibili'].includes(platform.id) && !states[platform.id].hasSession))" @click="perform(platform.id, 'capture')">收集{{ platform.label }}当前可见内容</button><button v-if="states[platform.id].running" :disabled="disabled || !!pending" @click="perform(platform.id, 'close')">关闭浏览器</button></div>
      <button v-if="states[platform.id].running" :disabled="!!pending" @click="perform(platform.id, 'preview')">预览当前窗口</button><figure v-if="previewPlatform === platform.id && previewImage"><img :src="previewImage" :alt="`${platform.label}专用浏览器当前画面`" /><figcaption>只读预览；请在专用浏览器中完成登录或验证。</figcaption><details><summary>采集诊断</summary><pre>{{ diagnostics }}</pre></details></figure>
      <p role="status">{{ pending?.startsWith(platform.id) ? '正在处理，请稍候…' : states[platform.id].message }}</p>
      <small>{{ ["douyin", "bilibili"].includes(platform.id) ? "公开热词可免登录收集；网页登录推荐不保证与手机端相同，这里不读取创作者后台指标。" : "公开帖子不是热度榜；受限内容需要本人在官网处理，不绕过平台验证。" }}</small>
    </details>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import axios from "axios";
import { IconChevronRight } from "@tabler/icons-vue";
defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ collected: [items: unknown[]] }>();
const platforms = [
  { id: "douyin" as const, label: "抖音", description: "保留这个账号的网页登录态，按需读取你正在浏览的视频线索。不会用公开热榜冒充账号推荐。" },
  { id: "tieba" as const, label: "弱智吧", description: "浏览百度贴吧弱智吧的公开帖子。若平台要求登录或验证，请在官网本人完成后按需收集。" },
  { id: "douban" as const, label: "豆瓣", description: "浏览讨论精选或小组帖子，采集当前可见的原帖标题与链接。" },
  { id: "bilibili" as const, label: "B站", description: "可登录浏览首页推荐、搜索和视频，再将当前可见作品收进漫画选题。" },
];
const states = reactive({ tieba: { running: false, hasSession: false, message: "" }, douban: { running: false, hasSession: false, message: "" }, douyin: { running: false, hasSession: false, message: "" }, bilibili: { running: false, hasSession: false, message: "" } });
const pending = ref("");
const error = ref("");
const previewImage = ref("");
const previewPlatform = ref("");
const diagnostics = ref("");
async function request(platform: "douyin" | "bilibili" | "tieba" | "douban", action: string) {
  const { data } = await axios.post("/api/comicStudio/platformSession", { platform, action }, { headers: { "x-toonflow-workspace": "1" }, timeout: 45000 });
  if (action !== "preview") Object.assign(states[platform], { running: !!data.data.running, hasSession: !!data.data.hasSession, message: data.data.message });
  return data.data;
}
async function perform(platform: "douyin" | "bilibili" | "tieba" | "douban", action: "open" | "status" | "capture" | "close" | "preview") {
  if (pending.value) return;
  pending.value = `${platform}/${action}`; error.value = "";
  try {
    const result = await request(platform, action);
    if (action === "preview") { previewImage.value = result.previewImage; previewPlatform.value = platform; diagnostics.value = JSON.stringify(result.diagnostics, null, 2); }
    if (action === "capture" && result.items.length) emit("collected", result.items);
  } catch (cause) {
    error.value = axios.isAxiosError(cause) ? cause.response?.data?.message || "平台浏览器连接失败，请重试" : "平台浏览器连接失败";
  } finally { pending.value = ""; }
}
onMounted(async () => {
  const results = await Promise.allSettled(platforms.map((item) => request(item.id, "status")));
  if (results.some((item) => item.status === "rejected")) error.value = "部分平台状态读取失败，可以点击检查会话重试。";
});
</script>
<style scoped lang="scss">
.platformAccounts { p, li, small { line-height: 1.7; color: var(--el-text-color-secondary); } details { border: 1px solid var(--el-border-color); border-radius: 10px; padding: 18px; margin: 16px 0; } summary { list-style: none; cursor: pointer; min-height: 32px; &::-webkit-details-marker { display: none; } h3 { flex: 1; } svg { transition: transform 0.15s; } display: flex; align-items: center; justify-content: space-between; gap: 12px; h3 { margin: 0; } span { font-size: 12px; color: var(--el-color-primary); } } details[open] summary svg { transform: rotate(90deg); } figure { margin: 12px 0; img { width: 100%; max-height: 440px; object-fit: contain; background: #eee; } figcaption { font-size: 12px; color: var(--el-text-color-secondary); } } ol { padding-left: 20px; } .accountActions { display: flex; flex-wrap: wrap; gap: 8px; } button { padding: 9px 12px; min-height: 40px; background: var(--el-fill-color-light); border: 1px solid var(--el-border-color); border-radius: 6px; font: inherit; color: var(--el-text-color-primary); cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; } } }
</style>
