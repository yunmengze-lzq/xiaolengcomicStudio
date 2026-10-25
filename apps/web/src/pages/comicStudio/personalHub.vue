<template>
  <section class="personalHub" :class="{ archiveOnly }">
    <header class="hubHeading"><div><span>我的创作档案</span><h1>创作档案</h1><p>管理创作偏好、修改记录与素材来源。</p></div><button class="secondaryButton" @click="exportArchive">导出分析与修改日志</button></header>
    <nav v-if="!section" class="hubTabs" aria-label="个人分析板块"><button v-for="item in tabs" :key="item.id" :class="{ selected: tab === item.id }" @click="tab = item.id">{{ item.label }}</button></nav>
    <p v-if="archiveError" role="alert">{{ archiveError }}</p>
    <fieldset :disabled="disabled">
      <template v-if="tab === 'overview'">
        <div class="hubColumns">
          <section class="hubCard"><h2>我想表达什么</h2><label for="creatorInterests">喜欢的题材、角色与画风</label><textarea id="creatorInterests" v-model="project.creator.interests" rows="4" maxlength="2000" placeholder="例如：职场小事、温柔反转、成年人之间的善意" /><label for="creatorAvoid">不喜欢的表达</label><textarea id="creatorAvoid" v-model="project.creator.avoid" rows="2" maxlength="2000" /><label for="creatorGoal">希望读者带走什么</label><input id="creatorGoal" v-model="project.creator.goal" maxlength="2000" /><button class="primaryButton" @click="emit('save')">保存创作偏好</button></section>
          <section v-if="!archiveOnly" class="hubCard"><h2>读者回应了什么</h2><div class="hubFilters"><label>平台<select v-model="platform"><option>小红书</option><option>抖音</option><option>B站</option></select></label><label>观察窗口<select v-model="window"><option value="24h">发布后 24 小时</option><option value="7d">发布后 7 天</option><option value="30d">发布后 30 天</option></select></label></div><p>{{ insights.records.length }} 篇作品有记录；同一作品取最近一次观察。数据来自手动录入，尚未连接平台后台。</p><p v-if="!insights.records.length">先到「作品反馈」录入真实数据，再比较题材表现。</p><div v-for="row in insights.keywords.slice(0, 8)" :key="row.keyword" class="keywordRow"><span>{{ row.keyword }} <small>{{ row.works }} 篇</small></span><meter :value="row.average || 0" :max="Math.max(1, ...insights.keywords.map((item) => item.average || 0))" :aria-label="`${row.keyword}平均播放或阅读量`" /><b>{{ row.average === null ? '未记录阅读量' : Math.round(row.average).toLocaleString() }}</b></div><p class="hubNote">每词平均阅读/播放量＝带该标签作品的阅读/播放量之和 ÷ 有该指标的作品数。小样本仅供探索，不代表关键词导致流量。</p><button class="secondaryButton" :disabled="!canAnalyze || !insights.records.length" @click="emit('analyze', platform, window)">AI 提取关键词与剧情建议</button><button class="secondaryButton" @click="useKeywords">把这些关键词带入原创选题</button></section>
        </div>
        <section v-if="!archiveOnly && insights.records.length" class="hubCard"><h2>作品对比 · {{ platform }} · {{ window }}</h2><div v-for="record in [...insights.records].sort((a, b) => (b.views ?? -1) - (a.views ?? -1))" :key="record.id" class="keywordRow"><span>{{ project.episodes.find((item) => item.id === record.episodeId)?.title || '历史作品' }}</span><meter v-if="record.views !== null" :value="record.views" :max="Math.max(1, ...insights.records.map((item) => item.views || 0))" :aria-label="`${record.id}阅读或播放量`" /><b>{{ record.views === null ? '未记录阅读量' : record.views.toLocaleString() }}</b></div></section>
        <section v-for="report in (archiveOnly ? [] : project.insightReports).filter((item) => item.platform === platform && item.window === window).slice(-3).reverse()" :key="report.id" class="hubCard"><h2>AI 复盘 · {{ formatTime(report.at) }}</h2><p>{{ report.summary }}</p><p v-for="keyword in report.keywords" :key="keyword.word"><b>{{ keyword.word }}</b>：{{ keyword.reason }}<small>（证据记录：{{ keyword.evidenceIds.join('、') }}）</small></p><p>{{ report.direction }}</p><button class="secondaryButton" @click="direction = report.direction">用于下一篇创作方向</button></section>
        <section v-if="!archiveOnly" class="hubCard"><h2>开始下一篇原创漫画</h2><p>可以只用生活观察，也可以加入热点词。生成后仍进入同一套分镜、角色、排字与审稿流程。</p><label for="originalDirection">关键词与剧情方向</label><textarea id="originalDirection" v-model="direction" rows="3" maxlength="3500" /><button class="primaryButton" :disabled="!direction.trim()" @click="emit('original', direction)">创建原创选题，进入 AI 编剧</button></section>
      </template>
      <template v-else-if="tab === 'feedback'">
        <section class="hubCard"><h2>记录一次发布观察</h2><p>按相同观察窗口录入累计值；留空表示未知，0 表示确实为零。标签用于聚合分析。</p><form @submit.prevent="addFeedback"><div class="hubForm"><label>作品<select v-model="feedback.episodeId" required><option value="">请选择作品</option><option v-for="item in project.episodes" :key="item.id" :value="item.id">{{ item.title }}</option></select></label><label>发布平台<select v-model="feedback.platform"><option>小红书</option><option>抖音</option><option>B站</option></select></label><label>作品链接<input v-model="feedback.publishedUrl" type="url" maxlength="2000" /></label><label>发布时间<input v-model="feedback.publishedAt" type="datetime-local" required /></label><label>观察时间<input v-model="feedback.observedAt" type="datetime-local" required /></label><label>观察窗口<select v-model="feedback.window"><option value="24h">发布后 24 小时</option><option value="7d">发布后 7 天</option><option value="30d">发布后 30 天</option></select></label><label v-for="metric in metrics" :key="metric.id">{{ metric.label }}<input v-model="counts[metric.id]" type="number" min="0" max="1000000000000" step="1" /></label><label>题材关键词<input v-model="tags" maxlength="800" placeholder="用逗号分隔，例如：职场，拖延，温柔反转" /></label></div><label>读者评论与自己的观察<textarea v-model="feedback.note" rows="2" maxlength="3000" /></label><p v-if="feedbackError" role="alert">{{ feedbackError }}</p><button class="primaryButton" :disabled="!project.episodes.length">保存反馈记录</button></form></section>
        <section class="hubCard"><h2>发布观察记录 · {{ project.feedback.length }}</h2><div class="tableScroll"><table><thead><tr><th>作品 / 平台</th><th>窗口 / 观察时间</th><th>阅读或播放</th><th>互动次数 / 阅读或播放</th><th>关键词</th></tr></thead><tbody><tr v-for="item in [...project.feedback].reverse()" :key="item.id"><td>{{ project.episodes.find((episode) => episode.id === item.episodeId)?.title || '历史作品' }}<small>{{ item.platform }}</small></td><td>{{ item.window }}<small>{{ formatTime(item.observedAt) }}</small></td><td>{{ item.views === null ? '未知' : item.views.toLocaleString() }}</td><td>{{ engagement(item) }}</td><td>{{ item.keywords.join('、') }}</td></tr></tbody></table></div><p class="hubNote">互动次数＝点赞＋评论＋收藏＋分享；缺任一指标或阅读/播放量为 0 时不计算比率。这是次数比，不是独立用户互动率。</p></section>
      </template>
      <template v-else-if="tab === 'journal'">
        <section class="hubCard"><h2>修改理由</h2><p>在工作台顶部填写理由后保存，会与本次变更一起记录。未填写时明确保留为空。</p><div class="flowStrip"><span>保存前</span><span>→ 修改内容与理由 →</span><span>保存后</span><span>→ 下一次创作</span></div></section>
        <article v-for="entry in [...project.journal].reverse()" :key="entry.id" class="hubCard journalEntry"><small>{{ formatTime(entry.at) }}</small><h3>{{ entry.action }}</h3><p>{{ entry.reason || '本次未填写修改理由' }}</p><div class="tagList"><span v-for="section in entry.sections" :key="section">{{ sectionNames[section] || section }}</span></div><button class="textButton" @click="inspectRevision(entry.path)">展开修改前后</button><div v-if="revisionPath === entry.path" class="revisionView"><p v-if="revisionError" role="alert">{{ revisionError }}</p><article v-for="side in revisionSides" :key="side.label"><h4>{{ side.label }}</h4><pre class="revisionSummary">{{ side.summary }}</pre><div v-for="work in side.episodes" :key="work.id"><strong>{{ work.title }}</strong><p>{{ work.story }}</p><div v-for="panel in work.panels" :key="panel.id"><img v-if="panel.image && imageUrls[panel.image]" :src="imageUrls[panel.image]" :alt="panel.shot" /><p>{{ panel.action }}</p><p>{{ panel.dialogue }}</p></div></div><details><summary>查看完整快照数据</summary><pre>{{ side.json }}</pre></details></article></div></article>
      </template>
      <template v-else>
        <section class="hubCard"><h2>图片来源与生成记录</h2><p>工作区：<code>{{ directory }}/assets</code></p><p>「对话生成后导入」与「软件图片 API」是两条路径。原生对话出图不会被软件自动调用。历史图片未补录来源时显示「待补录」。</p></section>
        <article v-for="asset in assetRows" :key="asset.path" class="hubCard assetRow"><img v-if="imageUrls[asset.path]" :src="imageUrls[asset.path]" :alt="asset.path" /><div><strong>{{ asset.path }}</strong><template v-if="asset.record"><label>生成方式<select v-model="asset.record.method"><option value="unknown">待补录</option><option value="upload">本地导入</option><option value="conversation">对话生成后导入</option><option value="imageApi">软件图片 API</option></select></label><label>来源与作者<input v-model="asset.record.source" maxlength="2000" /></label><label>授权依据与允许用途<input v-model="asset.record.license" maxlength="2000" /></label><label>模型<input v-model="asset.record.model" maxlength="800" /></label><label>生成提示词<textarea v-model="asset.record.prompt" rows="3" maxlength="20000" /></label><button class="secondaryButton" @click="emit('save')">保存素材档案</button></template><template v-else><p>历史图片 · 来源待补录</p><button class="secondaryButton" @click="registerAsset(asset.path)">补录来源</button></template></div></article>
      </template>
    </fieldset>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { feedbackSchema, projectSchema } from "./model";
import type { ComicProject } from "./model";
import useWorkspaceFiles from "@/lib/workspaceFiles";
import saveFile from "@/lib/saveFile";
import { zipSync, strToU8 } from "fflate";
import { keywordInsights } from "./creatorInsights";
const props = defineProps<{ section?: string; archiveOnly?: boolean; project: ComicProject; directory: string; disabled: boolean; canAnalyze: boolean; imageUrls: Record<string, string> }>();
const emit = defineEmits<{ save: []; analyze: [platform: string, window: string]; original: [direction: string] }>();
const tabs = [{ id: "overview", label: "偏好与方向" }, { id: "feedback", label: "作品反馈" }, { id: "journal", label: "修改时间线" }, { id: "assets", label: "素材档案" }];
const tab = ref(props.section || "overview");
watch(() => props.section, (value) => { if (value) tab.value = value; });
watch(tab, () => globalThis.scrollTo({ top: 0, behavior: "instant" }), { flush: "post" });
const platform = ref("小红书");
const window = ref("7d");
const direction = ref("");
const insights = computed(() => keywordInsights(props.project, platform.value, window.value));
const feedback = reactive({ episodeId: "", platform: "小红书", publishedUrl: "", publishedAt: "", observedAt: "", window: "7d", note: "" });
const metrics = [{ id: "views", label: "阅读 / 播放量" }, { id: "likes", label: "点赞" }, { id: "comments", label: "评论" }, { id: "saves", label: "收藏" }, { id: "shares", label: "分享" }];
const counts = reactive<Record<string, string>>({});
const tags = ref("");
const feedbackError = ref("");
const archiveError = ref("");
function addFeedback() {
  feedbackError.value = "";
  const publishedAt = new Date(feedback.publishedAt);
  const observedAt = new Date(feedback.observedAt);
  const hours = Number(feedback.window.replace("h", "").replace("d", "")) * (feedback.window.endsWith("d") ? 24 : 1);
  const age = (observedAt.getTime() - publishedAt.getTime()) / 3600000;
  if (!Number.isFinite(age) || age < hours * 0.8 || age > hours * 1.2 || observedAt.getTime() > Date.now() + 60000) { feedbackError.value = "请检查时间：观察时间应接近所选窗口（允许前后 20%），并且不能在未来。"; return; }
  const result = feedbackSchema.safeParse({ ...feedback, id: crypto.randomUUID(), publishedAt: publishedAt.toISOString(), observedAt: observedAt.toISOString(), keywords: [...new Set(tags.value.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean))], ...Object.fromEntries(metrics.map((item) => [item.id, counts[item.id] === undefined || counts[item.id] === "" ? null : Number(counts[item.id])])) });
  if (!result.success) { feedbackError.value = "请检查作品、关键词（最多20个、每个40字）及非负整数指标。"; return; }
  props.project.feedback.push(result.data);
  emit("save");
  feedback.note = "";
  Object.keys(counts).forEach((key) => delete counts[key]);
}
function engagement(item: ComicProject["feedback"][number]) {
  if (!item.views || [item.likes, item.comments, item.saves, item.shares].some((value) => value === null)) return "指标不足";
  return `${(((item.likes! + item.comments! + item.saves! + item.shares!) / item.views) * 100).toFixed(1)}%`;
}
function useKeywords() { direction.value = [props.project.creator.interests, ...insights.value.keywords.filter((item) => item.average !== null).slice(0, 5).map((item) => item.keyword)].filter(Boolean).join("；"); }
function formatTime(value: string) { return new Date(value).toLocaleString("zh-CN"); }
const sectionNames: Record<string, string> = { series: "连载设定", researchPacks: "多平台专题素材", marketSnapshots: "热点采集快照", publications: "作品数据源", insightReports: "AI复盘报告", creator: "创作偏好", feedback: "作品反馈", assets: "素材来源", episodes: "剧本 / 分镜 / 图片 / 排版", styles: "画风版本", styleDraft: "画风草稿", topics: "热点来源", memeIdeas: "选梗方向", activeEpisodeId: "当前作品", activeStyleId: "默认画风", characters: "固定角色", title: "项目名称", baseline: "初始基线" };
const revisionPath = ref("");
const revisionError = ref("");
const revisionSides = ref<{ label: string; episodes: ComicProject["episodes"]; summary: string; json: string }[]>([]);
function sectionValue(state: ComicProject, key: string) {
  if (key === "activeStyleId") return state.styles.find((item) => item.id === state.activeStyleId)?.name || "未设置";
  if (key === "activeEpisodeId") return state.episodes.find((item) => item.id === state.activeEpisodeId)?.title || "未选择作品";
  if (key === "creator") return { 喜欢的题材与画风: state.creator.interests, 不喜欢的表达: state.creator.avoid, 创作目标: state.creator.goal };
  return state[key as keyof ComicProject];
}
async function inspectRevision(path: string) {
  revisionPath.value = path; revisionError.value = ""; revisionSides.value = [];
  const directory = props.directory;
  try {
    const raw = await useWorkspaceFiles(directory).readJson<{ before: unknown; after: unknown }>(path);
    const before = projectSchema.parse(raw.before);
    const after = projectSchema.parse(raw.after);
    const changed = Object.keys(after).filter((key) => key !== "journal" && JSON.stringify(before[key as keyof ComicProject]) !== JSON.stringify(after[key as keyof ComicProject]));
    const changedWorks = new Set([...before.episodes, ...after.episodes].filter((work) => JSON.stringify(before.episodes.find((item) => item.id === work.id)) !== JSON.stringify(after.episodes.find((item) => item.id === work.id))).map((item) => item.id));
    const sides = [{ label: "修改前", state: before }, { label: "修改后", state: after }].map((side) => ({ label: side.label, episodes: side.state.episodes.filter((work) => changedWorks.has(work.id)), summary: JSON.stringify(Object.fromEntries(changed.filter((key) => key !== "episodes").map((key) => [sectionNames[key] || key, sectionValue(side.state, key)])), null, 2), json: JSON.stringify(side.state, null, 2) }));
    if (directory === props.directory && path === revisionPath.value) revisionSides.value = sides;
  } catch (error) { revisionError.value = error instanceof Error ? error.message : "快照读取失败"; }
}
const assetRows = computed(() => {
  const paths = new Set([...props.project.assets.map((item) => item.path), ...props.project.styles.flatMap((style) => style.refs.map((item) => item.path)), ...props.project.characters.map((item) => item.image), ...props.project.episodes.flatMap((episode) => [...episode.panels.flatMap((item) => [item.image, ...item.history]), ...episode.castSnapshot.map((item) => item.image)])].filter(Boolean));
  return [...paths].map((path) => ({ path, record: props.project.assets.find((item) => item.path === path) }));
});
function registerAsset(path: string) { props.project.assets.push({ path, method: "unknown", source: "", license: "", prompt: "", model: "", createdAt: "" }); }
async function exportArchive() {
  archiveError.value = "";
  const snapshot = JSON.parse(JSON.stringify(props.project)) as ComicProject;
  const files = useWorkspaceFiles(props.directory);
  try {
    const archive: Record<string, Uint8Array> = { "currentProject.json": strToU8(JSON.stringify(snapshot, null, 2)) };
    for (const entry of snapshot.journal) archive[entry.path] = new Uint8Array(await files.read(entry.path));
    archive["analysis.json"] = strToU8(JSON.stringify({ platform: platform.value, window: window.value, ...keywordInsights(snapshot, platform.value, window.value) }, null, 2));
    await saveFile(new Blob([zipSync(archive) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), "xiaolengAnalysis.zip");
  } catch (error) { archiveError.value = error instanceof Error ? error.message : "导出失败"; }
}
</script>
<style scoped lang="scss">
.personalHub {
  max-width: 1280px; margin: auto;
  button { font: inherit; cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .5; }
  button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--studioAccent); outline-offset: 3px; }
  .primaryButton, .secondaryButton, .textButton { display: inline-flex; align-items: center; justify-content: center; padding: 10px 15px; min-height: 42px; border-radius: 8px; border: 1px solid var(--studioLine); background: var(--studioCard); color: var(--studioInk); gap: 8px; margin-right: 8px; }
  .primaryButton { color: #fff; background: var(--studioAccent); border-color: var(--studioAccent); }
  .textButton { background: transparent; border: 0; color: var(--studioAccent); padding-left: 0; }

  .hubHeading { display: flex; justify-content: space-between; gap: 24px; align-items: start; margin-bottom: 28px; h1 { font-size: 28px; margin: 10px 0; } p, span { color: var(--studioMuted); } }
  .hubTabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; button { border: 1px solid var(--studioLine); border-radius: 8px; padding: 10px 18px; background: var(--studioCard); color: var(--studioInk); } .selected { background: var(--studioAccent); color: white; } }
  fieldset { border: 0; padding: 0; min-width: 0; }
  &.archiveOnly .hubColumns { grid-template-columns: 1fr; }
  .hubColumns, .revisionView { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .hubCard { background: var(--studioCard); border: 1px solid var(--studioLine); border-radius: 14px; padding: 24px; margin-bottom: 22px; min-width: 0; h2 { font-size: 19px; margin: 0 0 14px; } h3 { margin: 8px 0; } p { color: var(--studioMuted); overflow-wrap: anywhere; } label { display: grid; gap: 6px; margin: 12px 0; font-weight: 600; } input, textarea, select { width: 100%; box-sizing: border-box; padding: 10px; color: var(--studioInk); background: var(--studioPaper); border: 1px solid var(--studioLine); border-radius: 7px; } button { margin-top: 10px; } }
  .hubFilters, .hubForm { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
  .keywordRow { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; margin: 16px 0; align-items: center; small { color: var(--studioMuted); } meter { width: 100%; } }
  .hubNote { font-size: 12px; line-height: 1.7; }
  .tableScroll { overflow-x: auto; table { border-collapse: collapse; width: 100%; min-width: 650px; } th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--studioLine); vertical-align: top; } small { display: block; color: var(--studioMuted); } }
  .flowStrip, .tagList { display: flex; flex-wrap: wrap; gap: 12px; span { border-radius: 6px; background: var(--studioPaper); padding: 8px 12px; } }
  .journalEntry { border-left: 3px solid var(--studioAccent); }
  .revisionView { margin-top: 20px; img { width: 130px; max-height: 170px; object-fit: contain; } pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 350px; overflow: auto; font-size: 11px; } }
  .assetRow { display: grid; grid-template-columns: 150px 1fr; gap: 24px; img { width: 100%; max-height: 220px; object-fit: contain; } strong, code { overflow-wrap: anywhere; } }
  @media (max-width: 850px) { .hubColumns, .revisionView { grid-template-columns: 1fr; } .hubHeading { display: block; } .hubHeading h1 { font-size: 24px; } .assetRow { grid-template-columns: 1fr; img { width: 150px; } } }
}
</style>
