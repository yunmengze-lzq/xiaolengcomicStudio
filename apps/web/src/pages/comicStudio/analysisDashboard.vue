<template>
  <section class="analysisDashboard"><header class="analysisHeading"><div><span>数据分析 / {{ view === 'market' ? '市场热点' : '作品表现' }}</span><h1>{{ view === 'market' ? '发现值得讲的故事。' : '看见作品的真实反馈。' }}</h1><p>{{ automatic ? '自动采集已开启 · 分析页在前台时运行' : '自动采集未开启' }}</p></div><div><button @click="emit('settings')">账号与采集设置</button><button class="accentButton" :disabled="disabled" @click="emit('collect')">{{ disabled ? '正在处理…' : '立即刷新数据' }}</button></div></header><p class="syncStatus" role="status">{{ status || '等待首次采集；上次保存的数据会先显示。' }}</p>
    <template v-if="view === 'market'">
      <div class="statGrid"><article><span>最近一轮关键词</span><strong>{{ latestSources.reduce((sum, item) => sum + item.items.length, 0) }}</strong><small>每个平台取最新快照，不合计不同平台热度</small></article><article><span>已有采集来源</span><strong>{{ latestSources.length }}</strong><small>抖音公开热榜 / B站公开热词</small></article><article><span>历史快照</span><strong>{{ project.marketSnapshots.length }}</strong><small>每次采集单独保留，支持观察变化</small></article></div>
      <div class="analysisToolbar"><label>来源<select v-model="marketSource"><option value="bilibili">B站</option><option value="douyin">抖音</option></select></label><label>筛选关键词<input v-model="keywordFilter" placeholder="生活、学习、AI…" /></label><span>{{ latestMarket ? formatTime(latestMarket.at) : '尚无该来源快照' }}</span></div>
      <div class="chartGrid"><article class="analysisCard"><metricChart title="本次热门词 · 平台原始热度" :rows="heatRows" emptyText="等待实际热度数据。可以点击立即刷新，或检查平台连接。" /><p>榜单仅是线索，搜索热度不能当成你的作品播放量。</p></article><article class="analysisCard"><metricChart title="最近一轮采集覆盖" :rows="coverageRows" /><p>这里比较采集条数，反映数据覆盖，不比较平台人气。</p><ul class="sourceTimes"><li v-for="source in latestSources" :key="source.source">{{ source.source === 'douyin' ? '抖音' : 'B站' }}<span>{{ formatTime(source.at) }}</span></li></ul></article></div>
      <article class="analysisCard"><div class="analysisToolbar"><label>观察某个热词<select v-model="selectedKeyword"><option value="">选择关键词</option><option v-for="topic in latestMarket?.items || []" :key="topic.id" :value="topic.title">{{ topic.title }}</option></select></label><button :disabled="!selectedKeyword || disabled" @click="emit('original', `以“${selectedKeyword}”为灵感，使用原创角色创作贴近生活的4–6格剧情；热搜仅作线索，不编造事件事实。`)">用这个词创作</button></div><metricChart title="关键词热度观察记录" :rows="keywordTrend" kind="line" emptyText="选一个热词查看历次采集值；只有一个观察点时不会编造趋势。" /></article>
      <article class="analysisCard"><h2>原始榜单与来源</h2><div class="tableScroll"><table><thead><tr><th>榜位</th><th>关键词</th><th>原始热度</th><th>来源</th></tr></thead><tbody><tr v-for="topic in filteredTopics" :key="topic.id"><td>{{ topic.rank }}</td><td>{{ topic.title }}</td><td>{{ topic.heat?.toLocaleString() ?? '未提供' }}</td><td><a v-if="safeLink(topic.url)" :href="safeLink(topic.url)" target="_blank" rel="noopener noreferrer">打开平台来源 ↗</a></td></tr></tbody></table></div></article>
    </template>
    <template v-else>
      <div class="analysisToolbar"><button :class="{ accentButton: workScope === 'own' }" @click="workScope = 'own'">本人作品</button><button :class="{ accentButton: workScope === 'reference' }" @click="workScope = 'reference'">公开参考作品</button><span>公开参考单独保存，不计入本人业绩。</span></div>
      <details class="analysisCard" :open="!publications.length"><summary>登记作品链接，之后自动同步</summary><form @submit.prevent="registerPublication"><div class="sourceForm"><label>数据归属<select v-model="draft.scope"><option value="own">本人作品</option><option value="reference">公开参考作品</option></select></label><label v-if="draft.scope === 'own'">对应漫画<select v-model="draft.episodeId"><option value="">请选择漫画</option><option v-for="episode in project.episodes" :key="episode.id" :value="episode.id">{{ episode.title }}</option></select></label><label>平台<select v-model="draft.platform"><option>B站</option><option>小红书</option><option>抖音</option></select></label><label>标准作品链接<input v-model="draft.url" type="url" required maxlength="2000" placeholder="https://www.bilibili.com/video/BV…" /></label><label>题材标签<input v-model="draft.keywords" placeholder="逗号分隔，可用于后续AI分析" maxlength="800" /></label></div><p>{{ draft.platform === 'B站' ? '读取公开视频累计指标，无需账号密码。' : draft.platform === '小红书' ? '需要本人登录会话与含 xsec_token 的标准笔记链接；只能读取公开互动数，不能读取阅读量。' : '当前未接通抖音后台指标。可以登记链接，但不会假报自动同步。' }}</p><p v-if="error" role="alert">{{ error }}</p><button class="accentButton" :disabled="disabled">登记并同步作品</button></form></details>
      <article v-for="publication in publications" :key="publication.id" class="analysisCard publicationRow"><div><strong>{{ publication.title || project.episodes.find((item) => item.id === publication.episodeId)?.title || '等待首次读取标题' }}</strong><p>{{ publication.platform }} · {{ publication.scope === 'own' ? '本人作品（自行声明）' : '公开参考，非本人作品' }}</p><small>{{ publication.lastCheckedAt ? `上次尝试：${formatTime(publication.lastCheckedAt)}` : '尚未同步' }}</small><p v-if="publication.lastError" role="alert">{{ publication.lastError }}</p></div><div><label><input v-model="publication.enabled" type="checkbox" :disabled="publication.platform === '抖音' || disabled" @change="emit('save')" />自动同步</label><button :disabled="disabled || publication.platform === '抖音'" @click="emit('sync', publication.id)">立即同步</button><button @click="selectedPublication = publication.id">查看图表</button></div></article>
      <div class="analysisToolbar"><label>查看作品<select v-model="selectedPublication"><option value="">选择已登记作品</option><option v-for="publication in publications" :key="publication.id" :value="publication.id">{{ publication.title || publication.url }}</option></select></label><label>趋势指标<select v-model="metric"><option v-for="item in metrics" :key="item.id" :value="item.id">{{ item.label }}</option></select></label></div>
      <div class="chartGrid"><article class="analysisCard"><metricChart :title="`${metrics.find((item) => item.id === metric)?.label} · 累计值观察`" kind="line" :rows="workTrend" /><p>每点为一次真实同步值，按实际观察时间排列。缺失指标保持未知；一个点不能判断增长趋势。</p></article><article class="analysisCard"><metricChart title="最近一次互动构成" :rows="interactionRows" /><p>{{ latestWork?.metricSource || '登记作品并同步后显示指标出处。' }}{{ latestWork?.approximate ? ' · 平台使用缩略数字，属于近似值。' : '' }}</p></article></div>
      <article class="analysisCard"><h2>把反馈带回创作</h2><p>题材标签和累计数据可交给AI复盘。累计值不是同一发布时长，AI需保留样本和口径限制。</p><button :disabled="disabled || !latestWork || activePublication?.scope !== 'own'" @click="emit('analyze', activePublication!.platform, 'cumulative')">分析本人作品，提取关键词</button><section v-for="report in project.insightReports.filter((item) => item.window === 'cumulative').slice(-3).reverse()" :key="report.id"><h3>{{ formatTime(report.at) }} · {{ report.platform }}</h3><p>{{ report.summary }}</p><p>{{ report.direction }}</p><button :disabled="disabled" @click="emit('original', report.direction)">按此方向创作下一篇</button></section></article>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import metricChart from "./metricChart.vue";
import { projectSchema, safeLink } from "./model";
import type { ComicProject } from "./model";
const props = defineProps<{ project: ComicProject; view: string; disabled: boolean; status: string; automatic: boolean }>();
const emit = defineEmits<{ collect: []; save: []; registered: [id: string]; sync: [id: string]; settings: []; original: [direction: string]; analyze: [platform: string, window: string] }>();
const marketSource = ref("bilibili");
const keywordFilter = ref("");
const selectedKeyword = ref("");
const latestSources = computed(() => { const map = new Map<string, ComicProject["marketSnapshots"][number]>(); for (const item of props.project.marketSnapshots) map.set(item.source, item); return [...map.values()]; });
const latestMarket = computed(() => latestSources.value.find((item) => item.source === marketSource.value));
const filteredTopics = computed(() => (latestMarket.value?.items || []).filter((item) => item.title.includes(keywordFilter.value.trim())));
const heatRows = computed(() => filteredTopics.value.slice(0, 10).map((item) => ({ id: item.id, label: item.title, value: item.heat ?? null })));
const coverageRows = computed(() => latestSources.value.map((item) => ({ id: item.source, label: item.source === "douyin" ? "抖音" : "B站", value: item.items.length })));
const keywordTrend = computed(() => props.project.marketSnapshots.filter((item) => item.source === marketSource.value && item.items.some((topic) => topic.title === selectedKeyword.value)).slice(-30).map((item) => ({ id: item.id, label: shortTime(item.at), at: item.at, value: item.items.find((topic) => topic.title === selectedKeyword.value)?.heat ?? null })));
const workScope = ref("own");
const selectedPublication = ref("");
const publications = computed(() => props.project.publications.filter((item) => item.scope === workScope.value));
watch(publications, (items) => { if (!items.some((item) => item.id === selectedPublication.value)) selectedPublication.value = items[0]?.id || ""; }, { immediate: true });
const activePublication = computed(() => props.project.publications.find((item) => item.id === selectedPublication.value));
const observations = computed(() => props.project.feedback.filter((item) => item.publicationId === selectedPublication.value && selectedPublication.value).sort((a, b) => a.observedAt.localeCompare(b.observedAt)).slice(-30));
const latestWork = computed(() => observations.value.at(-1));
const metrics = [{ id: "views", label: "阅读 / 播放" }, { id: "likes", label: "点赞" }, { id: "comments", label: "评论" }, { id: "saves", label: "收藏" }, { id: "shares", label: "分享" }] as const;
const metric = ref<(typeof metrics)[number]["id"]>("views");
const workTrend = computed(() => observations.value.map((item) => ({ id: item.id, label: shortTime(item.observedAt), at: item.observedAt, value: item[metric.value] })));
const interactionRows = computed(() => latestWork.value ? metrics.filter((item) => item.id !== "views").map((item) => ({ id: item.id, label: item.label, value: latestWork.value![item.id] })) : []);
const draft = reactive({ scope: "own", episodeId: "", platform: "B站", url: "", keywords: "" });
const error = ref("");
function registerPublication() {
  error.value = "";
  if (draft.scope === "own" && !draft.episodeId) { error.value = "请选择对应漫画。"; return; }
  try {
    const url = new URL(draft.url.trim());
    const domains: Record<string, string[]> = { B站: ["www.bilibili.com", "bilibili.com"], 小红书: ["www.xiaohongshu.com", "xiaohongshu.com"], 抖音: ["www.douyin.com", "douyin.com"] };
    if (url.protocol !== "https:" || url.username || url.password || url.port || !domains[draft.platform]?.includes(url.hostname)) throw new Error("请填写所选平台的 HTTPS 标准作品链接。");
    if (draft.platform === "B站" && !/^\/video\/BV[a-zA-Z0-9]{10}(?:\/|$)/.test(url.pathname)) throw new Error("请使用完整 BV 作品链接，暂不支持短链接。");
    if (draft.platform === "小红书" && (!/^\/(?:explore|discovery\/item)\/[a-f0-9]{24}/.test(url.pathname) || !url.searchParams.get("xsec_token"))) throw new Error("请复制含 xsec_token 的完整笔记链接，并先在设置登录。");
    if (props.project.publications.some((item) => item.url === url.href)) throw new Error("该链接已登记，请直接同步已有记录。");
    const record = projectSchema.shape.publications.unwrap().element.parse({ id: crypto.randomUUID(), episodeId: draft.scope === "own" ? draft.episodeId : "", title: "", scope: draft.scope, platform: draft.platform, url: url.href, keywords: [...new Set(draft.keywords.split(/[,，、]/).map((item) => item.trim()).filter(Boolean))], enabled: draft.platform !== "抖音", lastCheckedAt: "", lastError: "" });
    props.project.publications.push(record);
    workScope.value = record.scope;
    selectedPublication.value = record.id;
    emit("registered", record.id);
    draft.url = "";
  } catch (reason) { error.value = reason instanceof Error ? reason.message : "链接或标签格式不正确"; }
}
function formatTime(value: string) { return new Date(value).toLocaleString("zh-CN"); }
function shortTime(value: string) { return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
</script>
<style scoped lang="scss">
.analysisDashboard {
  max-width: 1360px; margin: auto;
  .analysisHeading { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 22px; h1 { font-size: 30px; margin: 8px 0; } span, p { color: var(--studioMuted); } }
  button { font: inherit; padding: 10px 14px; background: var(--studioCard); color: var(--studioInk); border: 1px solid var(--studioLine); border-radius: 8px; cursor: pointer; margin: 4px 8px 4px 0; min-height: 42px; } button:disabled { opacity: .5; cursor: not-allowed; } .accentButton { background: var(--studioAccent); color: white; border-color: var(--studioAccent); }
  button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--studioAccent); outline-offset: 3px; }
  .syncStatus { color: var(--studioMuted); padding: 12px 16px; border-radius: 8px; background: var(--studioCard); border: 1px solid var(--studioLine); overflow-wrap: anywhere; }
  .statGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 24px 0; article { display: flex; flex-direction: column; border: 1px solid var(--studioLine); border-radius: 12px; background: var(--studioCard); padding: 20px; } strong { font-size: 36px; line-height: 1.5; } span, small { color: var(--studioMuted); } }
  .analysisToolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin: 20px 0; label { display: grid; gap: 6px; min-width: 180px; flex: 1; max-width: 550px; } span { color: var(--studioMuted); font-size: 12px; } }
  input, select { border: 1px solid var(--studioLine); border-radius: 7px; padding: 10px; font: inherit; background: var(--studioPaper); color: var(--studioInk); min-width: 0; width: 100%; box-sizing: border-box; } input[type="checkbox"] { width: auto; }
  .chartGrid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 20px; }
  .analysisCard { background: var(--studioCard); border: 1px solid var(--studioLine); border-radius: 12px; padding: 24px; margin-bottom: 22px; min-width: 0; p { color: var(--studioMuted); font-size: 13px; line-height: 1.7; } h2 { font-size: 18px; } }
  .sourceTimes { list-style: none; padding: 0; li { display: flex; justify-content: space-between; border-bottom: 1px solid var(--studioLine); padding: 12px 0; gap: 20px; } span { font-size: 12px; color: var(--studioMuted); } }
  .sourceForm { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; label { display: grid; gap: 8px; } }
  .publicationRow { display: flex; justify-content: space-between; gap: 24px; strong { overflow-wrap: anywhere; } }
  .tableScroll { overflow: auto; table { width: 100%; border-collapse: collapse; text-align: left; min-width: 520px; } td, th { padding: 12px 8px; border-bottom: 1px solid var(--studioLine); } }
  @media(max-width: 1000px) { .chartGrid { grid-template-columns: 1fr; } .analysisHeading { display: block; } }
  @media(max-width: 650px) { .statGrid, .sourceForm { grid-template-columns: 1fr; } .publicationRow { flex-direction: column; } .analysisCard { padding: 16px; } }
}
</style>
