<template>
  <section class="assetLibrary">
    <header><h2>图片素材库</h2><p>当前空间的导入图、参考图、生成结果和历史版本统一保存在：</p><code>{{ directory }}/assets</code><button :disabled="working || disabled" @click="scan">刷新本机文件列表</button><p>删除空间和移入素材回收站均保留本机文件，可恢复，不会释放磁盘空间。仍被角色、画风或漫画引用的图片不能移入回收站。</p></header>
    <div class="assetFilters"><label for="assetState">查看<select id="assetState" v-model="state"><option value="active">在库素材</option><option value="trash">素材回收站</option></select></label><label for="assetPlatform">来源平台<select id="assetPlatform" v-model="platform"><option value="">全部平台</option><option v-for="name in platforms" :key="name">{{ name }}</option></select></label><label>更新起始日期<input v-model="from" type="date" /></label><label>更新截止日期<input v-model="to" type="date" /></label><label>搜索<input v-model="keyword" placeholder="文件、来源、模型或提示词" /></label></div>
    <p>{{ visibleRows.length }} 张 · 按最近更新时间排序；未知创建时间不会猜测。</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="assetCards"><article v-for="row in visibleRows.slice(0, limit)" :key="row.path"><img v-if="imageUrls[row.path] || diskUrls[row.path]" :src="imageUrls[row.path] || diskUrls[row.path]" :alt="`素材 ${row.path}`" loading="lazy" /><div><strong>{{ row.record ? methodLabels[row.record.method] : '来源待补录' }}</strong><small>{{ platformName(row.record) }} · {{ day(row.record?.updatedAt || row.record?.createdAt) || '时间待补录' }}</small><code>{{ row.path }}</code><p>{{ usage.get(row.path)?.join('、') || '当前未被作品引用' }}</p><div class="assetActions"><button :disabled="disabled || working" @click="download(row.path)">下载原图</button><button v-if="state === 'trash'" :disabled="disabled || working" @click="setTrash(row.path, false)">恢复素材</button><button v-else :disabled="disabled || working || usage.has(row.path)" :title="usage.has(row.path) ? '先解除角色、画风或漫画中的引用' : '保留文件，可恢复'" @click="setTrash(row.path, true)">移入回收站</button></div><details><summary>来源、平台与生成记录</summary><template v-if="row.record"><label>来源平台<input v-model="row.record.platform" list="assetPlatforms" maxlength="100" @change="touch(row.record)" /></label><label>生成方式<select v-model="row.record.method" @change="touch(row.record)"><option v-for="(label, value) in methodLabels" :key="value" :value="value">{{ label }}</option></select></label><label>来源或作者<input v-model="row.record.source" maxlength="2000" @change="touch(row.record)" /></label><label>授权依据<input v-model="row.record.license" maxlength="2000" @change="touch(row.record)" /></label><label>模型<input v-model="row.record.model" maxlength="800" @change="touch(row.record)" /></label><label>提示词<textarea v-model="row.record.prompt" rows="4" maxlength="20000" @change="touch(row.record)"></textarea></label><small>创建：{{ row.record.createdAt || '未知' }} · 更新：{{ row.record.updatedAt || '未修改' }}</small></template><button v-else :disabled="disabled" @click="register(row.path); emit('save')">补录来源</button></details></div></article></div>
    <button v-if="visibleRows.length > limit" @click="limit += 50">再显示50张</button>
    <datalist id="assetPlatforms"><option v-for="name in ['本机导入', 'AI生成', '小红书', '抖音', 'B站', '贴吧', '豆瓣']" :key="name">{{ name }}</option></datalist>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, reactive, onMounted, onBeforeUnmount, watch } from "vue";
import type { ComicProject } from "./model";
import useWorkspaceFiles from "@/lib/workspaceFiles";
import saveFile from "@/lib/saveFile";
const props = defineProps<{ project: ComicProject; directory: string; disabled: boolean; imageUrls: Record<string, string> }>();
const emit = defineEmits<{ save: [] }>();
type Asset = ComicProject["assets"][number];
const state = ref("active");
const platform = ref("");
const from = ref("");
const to = ref("");
const keyword = ref("");
const error = ref("");
const working = ref(false);
const diskPaths = ref<string[]>([]);
const diskUrls = reactive<Record<string, string>>({});
const limit = ref(50);
const acquired = new Map<string, ReturnType<ReturnType<typeof useWorkspaceFiles>["acquireUrl"]>>();
const methodLabels: Record<Asset["method"], string> = { unknown: "来源待补录", upload: "本机导入", conversation: "对话生成后导入", imageApi: "在线图片 API", codex: "Codex 生成", local: "本机模型生成" };
const usage = computed(() => {
  const paths = new Map<string, string[]>();
  const add = (path: string, label: string) => { if (path) paths.set(path, [...new Set([...(paths.get(path) || []), label])]); };
  const p = props.project;
  p.styleDraft.refs.forEach((item) => add(item.path, "画风草稿参考"));
  p.styles.forEach((style) => style.refs.forEach((item) => add(item.path, `画风：${style.name}`)));
  p.characters.forEach((character) => { add(character.image, `角色：${character.name}`); character.designImages.forEach((item) => add(item.path, `角色设计：${character.name}`)); character.refs.forEach((item) => add(item.path, `角色参考：${character.name}`)); });
  p.episodes.forEach((episode) => {
    add(episode.continuityImage, `连续集：${episode.title}`);
    episode.castSnapshot.forEach((character) => { add(character.image, `作品角色：${episode.title}`); character.designImages.forEach((item) => add(item.path, `作品角色设计：${episode.title}`)); character.refs.forEach((item) => add(item.path, `作品参考：${episode.title}`)); });
    episode.styleSnapshot?.refs.forEach((item) => add(item.path, `作品画风：${episode.title}`));
    episode.panels.forEach((panel) => { add(panel.image, `漫画：${episode.title}`); panel.history.forEach((path) => add(path, `历史版本：${episode.title}`)); if (panel.candidate) add(panel.candidate.path, `候选图：${episode.title}`); });
  });
  return paths;
});
const rows = computed(() => [...new Set([...props.project.assets.map((item) => item.path), ...diskPaths.value, ...usage.value.keys()])].map((path) => ({ path, record: props.project.assets.find((item) => item.path === path) })));
const referenceSources = computed(() => [...props.project.styleDraft.refs, ...props.project.styles.flatMap((item) => item.refs), ...props.project.characters.flatMap((item) => item.refs), ...props.project.episodes.flatMap((item) => [...(item.styleSnapshot?.refs || []), ...item.castSnapshot.flatMap((character) => character.refs)])]);
function platformName(asset?: Asset) {
  if (asset?.platform?.trim()) return asset.platform.trim();
  const source = [asset?.source || "", ...referenceSources.value.filter((item) => item.path === asset?.path).map((item) => item.source)].join(" ").toLowerCase();
  const platforms = [["小红书", /xiaohongshu|xhslink|小红书/], ["抖音", /douyin|抖音/], ["B站", /bilibili|b23\.tv|b站/], ["贴吧", /tieba|贴吧/], ["豆瓣", /douban|豆瓣/]] as const;
  return platforms.find(([, expression]) => expression.test(source))?.[0] || (asset?.method === "upload" ? "本机导入" : asset && ["imageApi", "codex", "local"].includes(asset.method) ? "AI生成" : "未标注");
}
function day(value?: string) { if (!value || Number.isNaN(Date.parse(value))) return ""; return new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }); }
const platforms = computed(() => [...new Set(rows.value.map((row) => platformName(row.record)))].sort());
const visibleRows = computed(() => rows.value.filter((row) => {
  const asset = row.record;
  const date = day(asset?.updatedAt || asset?.createdAt);
  return (state.value === "trash" ? !!asset?.trashedAt : !asset?.trashedAt) && (!platform.value || platformName(asset) === platform.value) && (!from.value || !!date && date >= from.value) && (!to.value || !!date && date <= to.value) && (!keyword.value.trim() || `${row.path} ${asset?.source || ""} ${asset?.model || ""} ${asset?.prompt || ""}`.toLowerCase().includes(keyword.value.trim().toLowerCase()));
}).sort((a, b) => (b.record?.updatedAt || b.record?.createdAt || "").localeCompare(a.record?.updatedAt || a.record?.createdAt || "")));
async function scan() { error.value = ""; try { const listing = await useWorkspaceFiles(props.directory).list("assets"); diskPaths.value = listing.entries.filter((item) => item.type === "file" && /^assets\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(item.path)).map((item) => item.path); } catch { error.value = "素材文件列表读取失败，可重试；已有档案仍保留。"; } }
onMounted(scan);
watch(() => visibleRows.value.slice(0, limit.value).map((row) => row.path), async (paths) => {
  await Promise.all(paths.map(async (path) => { if (props.imageUrls[path] || acquired.has(path)) return; const handle = useWorkspaceFiles(props.directory).acquireUrl(path); acquired.set(path, handle); try { const url = await handle.url; if (acquired.get(path) === handle) diskUrls[path] = url; } catch { handle.release(); acquired.delete(path); } }));
}, { immediate: true });
onBeforeUnmount(() => { acquired.forEach((handle) => handle.release()); acquired.clear(); });
function register(path: string) { let record = props.project.assets.find((item) => item.path === path); if (!record) { record = { path, method: "unknown", source: "", license: "", prompt: "", model: "", createdAt: "" }; props.project.assets.push(record); } return record; }
function touch(asset: Asset) { asset.updatedAt = new Date().toISOString(); emit("save"); }
function setTrash(path: string, trash: boolean) { if (trash && usage.value.has(path)) { error.value = "该图片仍被角色、画风或漫画引用，请先解除引用。"; return; } const asset = register(path); asset.trashedAt = trash ? new Date().toISOString() : ""; touch(asset); }
async function download(path: string) { working.value = true; error.value = ""; try { const bytes = await useWorkspaceFiles(props.directory).read(path); await saveFile(new Blob([bytes]), path.split("/").at(-1)!); } catch { error.value = "图片读取失败，请检查工作区文件是否仍存在。"; } finally { working.value = false; } }
</script>
<style scoped lang="scss">
.assetLibrary { header { padding: 20px; background: var(--studioCard); border: 1px solid var(--studioLine); border-radius: 12px; } p, small { line-height: 1.7; color: var(--studioMuted); } code { display: block; overflow-wrap: anywhere; font-size: 12px; } label { display: grid; gap: 6px; margin-bottom: 12px; } input, select, textarea { width: 100%; box-sizing: border-box; padding: 9px; border: 1px solid var(--studioLine); border-radius: 6px; background: var(--studioCard); color: var(--studioInk); font: inherit; } button { padding: 9px 12px; border: 1px solid var(--studioLine); border-radius: 7px; font: inherit; background: var(--studioCard); color: var(--studioInk); cursor: pointer; &:disabled { opacity: .5; cursor: not-allowed; } } .assetFilters { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 20px; label { flex: 1 1 160px; } } .assetCards { display: grid; gap: 16px; article { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 20px; padding: 18px; border: 1px solid var(--studioLine); border-radius: 12px; background: var(--studioCard); } img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 8px; } small { display: block; } summary { cursor: pointer; padding: 12px 0; } } .assetActions { display: flex; flex-wrap: wrap; gap: 8px; } @media (max-width: 650px) { .assetCards article { grid-template-columns: 1fr; } .assetCards img { max-height: 200px; } } }
</style>
