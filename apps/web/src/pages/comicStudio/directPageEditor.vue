<template>
  <div class="directWorkspace">
    <button class="pageListToggle" :aria-expanded="showPages" @click="showPages = !showPages">漫画页列表 · {{ episode.directPages.length }} 页 {{ showPages ? "收起" : "展开" }}</button>
    <aside ref="pageRail" class="pageRail" :class="{ collapsed: !showPages }" aria-label="漫画页导航">
      <button v-if="removedPage" @click="restorePage">撤销移除上一页</button>
      <strong>漫画页 <small>{{ episode.directPages.length }}</small></strong>
      <button v-for="(page, index) in episode.directPages" :key="page.id" class="pageThumb" :aria-pressed="selected === page.id" @click="selected = page.id">
        <img v-if="page.image" :src="imageUrls[page.image]" alt="" /><span v-else class="thumbPlaceholder">{{ String(index + 1).padStart(2, '0') }}</span>
        <span>第 {{ index + 1 }} 页</span><small>{{ page.candidate ? '待选版本' : page.image ? '已出图' : '待生成' }}</small>
      </button>
      <button :disabled="busy || !episode.panels.length || episode.directPages.length >= 50" @click="addPage">＋ 添加页</button>
      <details class="pageManagement"><summary>分页与批量</summary><label>每页画面数<select v-model.number="episode.layout.perPage"><option :value="1">1 个</option><option :value="2">2 个</option><option :value="4">4 个</option></select></label><button :disabled="busy || !episode.panels.length" @click="planPages">补齐分页</button><button :disabled="busy || !!generationIssue || !episode.directPages.some(page => !page.image && !page.candidate)" @click="$emit('generateAll')">生成全部待出图页</button></details>
      <details v-if="episode.panels.some(panel => panel.image)" class="pageManagement"><summary>复用已有图片</summary><div class="historyImages"><button v-for="(panel, index) in episode.panels.filter(panel => panel.image)" :key="panel.id" :disabled="busy || episode.directPages.length >= 50 || episode.directPages.some(page => page.image === panel.image)" @click="useExisting(panel)"><img :src="imageUrls[panel.image]" :alt="`已有图片 ${index + 1}`" />作为整页</button></div></details>
    </aside>
    <div v-if="!episode.directPages.length" class="emptyWorkspace"><h3>从第一页开始</h3><p>按分镜自动分页，检查台词后生成含对白的漫画。</p><button :disabled="busy || !episode.panels.length" @click="planPages">按分镜建立漫画页</button><p v-if="!episode.panels.length">请先完成分镜设计。</p></div>
    <article v-for="(page, index) in episode.directPages" v-show="selected === page.id" :key="page.id" class="pageEditor">
      <div class="pageArtwork">
        <header><strong>第 {{ index + 1 }} / {{ episode.directPages.length }} 页</strong><span>{{ page.panelIds.length }} 个画面 · 含对白</span><div class="pageNavigation"><button :disabled="busy" @click="removePage(page)">移除此页</button><button :disabled="index === 0" aria-label="上一漫画页" @click="selected = episode.directPages[index - 1]!.id">←</button><button :disabled="index === episode.directPages.length - 1" aria-label="下一漫画页" @click="selected = episode.directPages[index + 1]!.id">→</button></div></header>
        <div v-if="busy && progress.panelId === page.id" class="modelNotice" role="status">{{ progress.phase }} · {{ progress.elapsedSeconds }} 秒<progress aria-label="本页生成中"></progress></div>
        <p v-if="page.image && page.generationFingerprint !== fingerprintFor(page)" class="modelNotice">内容已修改，重绘后才能更新到图片。</p>
        <div class="artCanvas" :class="{ comparing: !!page.candidate }"><figure><img v-if="page.image" :src="imageUrls[page.image]" alt="当前采用的整页漫画" /><div v-else class="emptyPage"><strong>本页还没有图片</strong><span>在右侧确认画面与台词，再生成本页</span></div><figcaption v-if="page.candidate">当前版本</figcaption></figure><figure v-if="page.candidate"><img :src="imageUrls[page.candidate.path]" alt="整页重绘候选" /><figcaption>重绘候选</figcaption></figure></div>
        <div v-if="page.candidate" class="candidateActions"><button class="generateButton" :disabled="busy" @click="$emit('resolve', page, true)">采用新版</button><button :disabled="busy" @click="$emit('resolve', page, false)">保留当前版</button></div>
      </div>
      <aside class="pageScript">
        <h3>本页内容</h3><p v-if="generationIssue" class="modelNotice" role="status">{{ generationIssue }}</p>        <button class="generateButton" :disabled="busy || !!generationIssue || !page.panelIds.length || !!page.candidate" @click="$emit('generate', page)">{{ page.image ? '重绘本页' : '生成本页漫画' }}</button><p class="hint">检查画面和台词，然后生成整页。改字需重绘。</p>
        <details><summary>调整本页画面 · {{ page.panelIds.length }} 格</summary><label v-for="(panel, panelIndex) in episode.panels" :key="panel.id" class="panelChoice"><input v-model="page.panelIds" :value="panel.id" type="checkbox" :disabled="busy || (!page.panelIds.includes(panel.id) && page.panelIds.length >= 6)" @change="page.panelIds.sort((a, b) => episode.panels.findIndex(p => p.id === a) - episode.panels.findIndex(p => p.id === b))" />第 {{ panelIndex + 1 }} 格 · {{ panel.action.slice(0, 30) }}</label></details>
        <label>编辑画面<select :value="page.panelIds.includes(editingPanel) ? editingPanel : page.panelIds[0] || ''" @change="editingPanel = ($event.target as HTMLSelectElement).value"><option v-for="panel in episode.panels.filter(p => page.panelIds.includes(p.id))" :key="panel.id" :value="panel.id">第 {{ episode.panels.indexOf(panel) + 1 }} 格 · {{ panel.action.slice(0, 18) }}</option></select></label>
        <div v-for="panel in episode.panels.filter(p => page.panelIds.includes(p.id) && p.id === (page.panelIds.includes(editingPanel) ? editingPanel : page.panelIds[0]))" :key="panel.id" class="panelDialogue">
          <label>场景与动作<textarea v-model="panel.action" rows="3" maxlength="20000" /></label>
          <template v-if="panel.speech.length"><label v-for="line in panel.speech" :key="line.id">{{ episode.castSnapshot.find(p => p.id === line.speakerId)?.name || (line.kind === 'thought' ? '心声' : '对白') }}<textarea v-model="line.text" rows="2" maxlength="600" @input="syncDialogue(panel)" /></label></template><label v-else>对白<textarea v-model="panel.dialogue" rows="3" maxlength="5000" /></label>
        </div>
        <details><summary>排版与重绘要求</summary><label>文字方向<select v-model="page.vertical"><option :value="false">横排</option><option :value="true">竖排 · 从右往左</option></select></label><label>本次要求<textarea v-model="page.revisionRequest" rows="3" maxlength="2000" placeholder="描述布局，或指出上一版需要修改的地方" /></label></details>

        <details><summary>导入与历史版本</summary><label>导入完整漫画页<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || !page.panelIds.length || !!page.candidate" @change="importPage($event, page)" /></label><div class="historyImages"><button v-for="(path, version) in page.history" :key="path" :disabled="busy || !!page.candidate" @click="page.image = path; page.generationFingerprint = ''"><img :src="imageUrls[path]" :alt="`恢复版本 ${version + 1}`" />版本 {{ version + 1 }}</button></div><p v-if="!page.history.length" class="hint">生成后会保留历史图片。</p></details>
        <details><summary>高级 · 生成描述与页面管理</summary><p class="hint">模型决定中文准确度与人物一致性；需要精确排字时使用分格制作。</p><pre>{{ page.panelIds.length ? promptFor(page) : '请先选择画面' }}</pre></details>
      </aside>
    </article>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { newPanel, directPageInput } from "./model";
import type { Episode, Panel } from "./model";
const props = defineProps<{ episode: Episode; beforeRemove: () => Promise<void>; imageUrls: Record<string, string>; busy: boolean; generationIssue: string; progress: { panelId: string; phase: string; elapsedSeconds: number } }>();
const emit = defineEmits<{ generateAll: []; import: [page: Episode["directPages"][number], file: File]; generate: [page: Episode["directPages"][number]]; resolve: [page: Episode["directPages"][number], accept: boolean] }>();
const pageRail = ref<HTMLElement>();
const selected = ref("");
const showPages = ref(true);
const removedPage = ref<{ episodeId: string; index: number; page: Episode["directPages"][number] }>();
function restorePage() { const entry = removedPage.value; if (!entry || entry.episodeId !== props.episode.id) return; props.episode.directPages.splice(entry.index, 0, entry.page); selected.value = entry.page.id; removedPage.value = undefined; }
watch(selected, async () => {
  await nextTick();
  const rail = pageRail.value;
  const thumb = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (!rail || !thumb) return;
  const box = rail.getBoundingClientRect(); const target = thumb.getBoundingClientRect();
  if (target.top < box.top || target.bottom > box.bottom) rail.scrollTop += target.top - box.top;
});
const editingPanel = ref("");
watch(selected, () => { editingPanel.value = ""; });
watch(() => props.episode.id, () => { selected.value = props.episode.directPages[0]?.id || ""; removedPage.value = undefined; }, { immediate: true });
function planPages() {
  const used = new Set(props.episode.directPages.flatMap(page => page.panelIds));
  const remaining = props.episode.panels.filter(panel => !used.has(panel.id));
  for (let offset = 0; offset < remaining.length && props.episode.directPages.length < 50; offset += props.episode.layout.perPage) {
    props.episode.directPages.push({ ...newPanel(), panelIds: remaining.slice(offset, offset + props.episode.layout.perPage).map(panel => panel.id), vertical: false });
  }
  selected.value ||= props.episode.directPages[0]?.id || "";
}
function addPage() {
  const used = new Set(props.episode.directPages.flatMap(page => page.panelIds));
  const panels = props.episode.panels.filter(panel => !used.has(panel.id));
  const page = { ...newPanel(), panelIds: (panels.length ? panels : props.episode.panels).slice(0, props.episode.layout.perPage).map(panel => panel.id), vertical: false };
  props.episode.directPages.push(page); selected.value = page.id;
}
function importPage(event: Event, page: Episode["directPages"][number]) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) emit("import", page, file); input.value = ""; }
function useExisting(panel: Panel) {
  const page = { ...newPanel(), panelIds: [panel.id], vertical: false, image: panel.image, history: [panel.image] };
  props.episode.directPages.push(page); selected.value = page.id;
}
function syncDialogue(panel: Panel) { panel.dialogue = panel.speech.filter(line => line.kind === "dialogue").map(line => `${props.episode.castSnapshot.find(person => person.id === line.speakerId)?.name || "对白"}：${line.text}`).join("\n"); }
function promptFor(page: Episode["directPages"][number]) { try { return directPageInput(props.episode, page).prompt; } catch (error) { return (error as Error).message; } }
function fingerprintFor(page: Episode["directPages"][number]) { try { return directPageInput(props.episode, page).fingerprint; } catch { return ""; } }
async function removePage(page: Episode["directPages"][number]) {
  try { await ElMessageBox.confirm("移除此页编排？已生成原图仍保留在素材库，分镜和台词不会删除。", "移除整页", { type: "warning" }); } catch { return; }
  try { await props.beforeRemove(); } catch (error) { ElMessage.error((error as Error).message); return; }
  const index = props.episode.directPages.indexOf(page);
  removedPage.value = { episodeId: props.episode.id, index, page: JSON.parse(JSON.stringify(page)) };
  props.episode.directPages.splice(index, 1); selected.value = props.episode.directPages[Math.min(index, props.episode.directPages.length - 1)]?.id || "";
}
</script>
<style scoped>
.directWorkspace { display: grid; grid-template-columns: 112px minmax(0, 1fr); border: 1px solid var(--studioLine, #dce4dc); border-radius: 14px; overflow: hidden; background: var(--studioCard, white); min-height: 540px; }
.pageRail { min-height: 0; overscroll-behavior: contain; padding: 14px 10px; display: flex; flex-direction: column; gap: 10px; background: #f0f3ed; border-right: 1px solid #dce4dc; min-width: 0; }
.pageRail strong { font-size: 13px; }.pageRail small { font-size: 11px; }
button { border: 1px solid #cbd6cb; border-radius: 8px; padding: 9px; background: white; color: #284535; cursor: pointer; font: inherit; font-size: 12px; }
button:disabled { opacity: .5; cursor: not-allowed; }button[aria-pressed="true"] { border: 2px solid #42664b; background: #e4eddf; }.generateButton { background: #365c42; color: white; padding: 12px; font-weight: 600; }
.pageThumb { flex-shrink: 0; display: grid; gap: 5px; text-align: center; }.pageThumb img, .thumbPlaceholder { width: 100%; height: 94px; object-fit: contain; background: #fff; border-radius: 4px; }.thumbPlaceholder { display: grid; place-items: center; font-size: 28px; color: #b1bcae; }
.pageEditor { display: grid; grid-template-columns: minmax(220px, 1fr) 290px; min-width: 0; }.pageArtwork { background: #e9ece6; padding: 18px; min-width: 0; }.pageArtwork header { display: flex; gap: 10px; justify-content: space-between; font-size: 12px; color: #526251; margin-bottom: 16px; }.artCanvas figure { margin: 0; }.artCanvas img { display: block; max-width: 100%; max-height: 560px; margin: auto; box-shadow: 0 4px 20px #20302115; }.comparing { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }figcaption { text-align: center; margin: 8px; font-size: 12px; }
.emptyPage { aspect-ratio: 3/4; background: #fafbf7; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 18px; text-align: center; color: #687566; }.emptyPage span { font-size: 12px; }.pageScript { min-height: 0; overscroll-behavior: contain; padding: 18px; display: grid; align-content: start; gap: 14px; min-width: 0; }.pageScript h3 { margin: 0; font-size: 15px; }.hint { font-size: 12px; color: #748071; line-height: 1.6; margin: 0; }label { display: grid; gap: 6px; font-size: 12px; }textarea, select { width: 100%; box-sizing: border-box; font: inherit; padding: 8px; border: 1px solid #d5ddd2; border-radius: 6px; background: white; }textarea { resize: vertical; }.panelDialogue { display: grid; gap: 10px; }.panelChoice { display: flex; align-items: start; margin-top: 10px; }summary { cursor: pointer; font-size: 12px; padding: 8px 0; color: #526650; }details { border-top: 1px solid #e6eae3; }details label, details button { margin-top: 8px; }.pageManagement button { width: 100%; }pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; font-size: 11px; }.historyImages { display: flex; gap: 6px; flex-wrap: wrap; }.historyImages button { width: 70px; }.historyImages img { width: 100%; }.modelNotice { padding: 10px; font-size: 12px; color: #735c36; background: #fbf4e7; border-radius: 6px; }.candidateActions { display: flex; justify-content: center; gap: 10px; margin-top: 12px; }.emptyWorkspace { padding: 60px 24px; text-align: center; }
@media (max-width: 1100px) { .pageEditor { grid-template-columns: minmax(180px, 1fr) 250px; }.pageArtwork, .pageScript { min-height: 0; overscroll-behavior: contain; padding: 12px; } }
.pageListToggle { display: none; }
@media (max-width: 760px) { .directWorkspace { grid-template-columns: 1fr; }.pageListToggle { display: block; }.pageRail { max-height: 280px; overflow-y: auto; }.pageRail.collapsed { display: none; }.pageThumb { grid-template-columns: 60px 1fr; align-items: center; }.pageThumb img, .thumbPlaceholder { height: 60px; grid-row: span 2; }.pageEditor { grid-template-columns: 1fr; }.pageArtwork { max-height: 520px; overflow: auto; } }
@media (min-width: 761px) { .directWorkspace { min-height: 460px; height: max(460px, calc(100vh - 325px)); } .pageRail, .pageScript { overflow-y: auto; } .pageEditor { min-height: 0; } .pageArtwork { min-height: 0; overflow-y: auto; overscroll-behavior: contain; } .emptyPage { aspect-ratio: auto; min-height: 360px; height: calc(100% - 40px); box-sizing: border-box; } }
.pageNavigation { display: flex; gap: 5px; } .pageNavigation button { padding: 4px 8px; }.pageArtwork header { align-items: center; flex-wrap: wrap; }
</style>
