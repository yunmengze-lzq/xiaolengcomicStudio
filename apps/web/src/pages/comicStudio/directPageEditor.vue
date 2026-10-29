<template>
  <div class="directWorkspace">
    <div class="pageToolbar"><div><h2>整页直出</h2><p>选择本页分镜，检查对白，再生成完整漫画。文字与画面一起绘制，改字后需要重绘。</p></div><button :disabled="busy || !episode.panels.length || episode.directPages.length >= 50" @click="addPage">添加一页</button></div>
    <p class="modelNotice">中文准确度和多人物一致性取决于所选模型。本地小模型可能出现错字或漏格；需要精准文字时请选择分格制作。每次按钮只生成这一页。</p>
    <details v-if="episode.panels.some(panel => panel.image)"><summary>已有图片本身就是完整漫画？直接作为整页使用</summary><p>适合已经包含画框和对白的图片。保留原分格图片，不再重复拼格或叠加字幕。请选择其实际对应的分镜后再重绘。</p><div class="historyImages"><button v-for="(panel, index) in episode.panels.filter(panel => panel.image)" :key="panel.id" :disabled="busy || episode.directPages.length >= 50 || episode.directPages.some(page => page.image === panel.image)" @click="useExisting(panel)"><img :src="imageUrls[panel.image]" :alt="`已有图片 ${index + 1}`" />作为整页使用</button></div></details>
    <div class="pageTabs"><button v-for="(page, index) in episode.directPages" :key="page.id" :aria-pressed="selected === page.id" @click="selected = page.id">第 {{ index + 1 }} 页 · {{ page.image ? '已出图' : '待出图' }}</button></div>
    <p v-if="!episode.directPages.length">还没有整页，点击“添加一页”。分格模式已有的图片会保留。</p>
    <article v-for="page in episode.directPages" v-show="selected === page.id" :key="page.id" class="pageEditor">
      <div class="pageScript">
        <h3>本页画面与台词</h3>
        <p>勾选 1–6 格，按分镜顺序组成这一页。编辑内容同时更新对应分镜。</p>
        <label v-for="(panel, index) in episode.panels" :key="panel.id" class="panelChoice"><input v-model="page.panelIds" :value="panel.id" type="checkbox" :disabled="busy || (!page.panelIds.includes(panel.id) && page.panelIds.length >= 6)" @change="page.panelIds.sort((a, b) => episode.panels.findIndex(p => p.id === a) - episode.panels.findIndex(p => p.id === b))" />第 {{ index + 1 }} 格 · {{ panel.action.slice(0, 48) }}</label>
        <div v-for="panel in episode.panels.filter(p => page.panelIds.includes(p.id))" :key="panel.id" class="panelDialogue">
          <details><summary>画面 {{ episode.panels.indexOf(panel) + 1 }} · 场景与动作</summary><textarea v-model="panel.action" rows="3" maxlength="20000" /></details>
          <template v-if="panel.speech.length"><label v-for="line in panel.speech" :key="line.id">{{ episode.castSnapshot.find(p => p.id === line.speakerId)?.name || (line.kind === 'thought' ? '心声' : '对白') }}<textarea v-model="line.text" rows="2" maxlength="600" @input="syncDialogue(panel)" /></label></template>
          <label v-else>对白<textarea v-model="panel.dialogue" rows="3" maxlength="5000" /></label>
        </div>
        <label>气泡文字方向<select v-model="page.vertical"><option :value="false">横排</option><option :value="true">竖排 · 从右往左读</option></select></label>
        <label>排版或重绘要求<textarea v-model="page.revisionRequest" rows="3" maxlength="2000" placeholder="例如：第一格占上半页，下方并排两格；对白留在右上方，不遮挡人物。" /></label>
        <button :disabled="busy || !page.panelIds.length || !!page.candidate" @click="$emit('generate', page)">{{ page.image ? '按当前台词与设定重绘本页' : '生成本页漫画（含对白）' }}</button>
        <label>导入已完成的整页<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || !page.panelIds.length || !!page.candidate" @change="importPage($event, page)" /></label>
        <details><summary>查看本页实际生成描述</summary><pre>{{ page.panelIds.length ? promptFor(page) : '请先选择分镜' }}</pre></details>
        <button :disabled="busy" @click="removePage(page)">移除此页</button>
      </div>
      <div class="pageArtwork">
        <p v-if="busy && progress.panelId === page.id" role="status">{{ progress.phase }} · {{ progress.elapsedSeconds }} 秒</p>
        <p v-if="page.image && page.generationFingerprint !== fingerprintFor(page)" class="modelNotice">台词、分镜或设定已变化，当前成品仍为旧版。重绘后可比较采用。</p>
        <h3>当前采用</h3><img v-if="page.image" :src="imageUrls[page.image]" alt="当前采用的整页漫画" /><div v-else class="emptyPage">整页预览 · 等待生成</div>
        <template v-if="page.candidate"><h3>新候选 · 与上方旧版对比</h3><img :src="imageUrls[page.candidate.path]" alt="整页重绘候选" /><div class="pageToolbar"><button :disabled="busy" @click="$emit('resolve', page, true)">采用候选</button><button :disabled="busy" @click="$emit('resolve', page, false)">保留旧版</button></div></template>
        <details v-if="page.history.length"><summary>历史版本（保留原图）</summary><div class="historyImages"><button v-for="path in page.history" :key="path" :disabled="busy || !!page.candidate" @click="page.image = path; page.generationFingerprint = ''"><img :src="imageUrls[path]" alt="点击恢复此版本" /></button></div></details>
      </div>
    </article>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { newPanel, directPageInput } from "./model";
import type { Episode, Panel } from "./model";
const props = defineProps<{ episode: Episode; imageUrls: Record<string, string>; busy: boolean; progress: { panelId: string; phase: string; elapsedSeconds: number } }>();
const emit = defineEmits<{ import: [page: Episode["directPages"][number], file: File]; generate: [page: Episode["directPages"][number]]; resolve: [page: Episode["directPages"][number], accept: boolean] }>();
const selected = ref("");
watch(() => props.episode.id, () => { selected.value = props.episode.directPages[0]?.id || ""; }, { immediate: true });
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
  props.episode.directPages.splice(props.episode.directPages.indexOf(page), 1); selected.value = props.episode.directPages[0]?.id || "";
}
</script>
<style scoped>
.directWorkspace { display: grid; gap: 16px; min-width: 0; overflow-wrap: anywhere; }
.pageToolbar, .pageTabs { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; }
.pageTabs { justify-content: flex-start; }
button { border: 1px solid #b8cabc; border-radius: 8px; padding: 10px 14px; background: #f5f8f4; color: #244c35; cursor: pointer; }
button[aria-pressed="true"] { background: #315c42; color: white; }
button:disabled { opacity: .5; cursor: not-allowed; }
.pageEditor { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(280px, 1fr); gap: 24px; }
.pageScript, .pageArtwork { min-width: 0; padding: 20px; background: var(--studioSurface, #fff); border: 1px solid #dce4dc; border-radius: 14px; }
.pageScript { display: grid; gap: 14px; align-content: start; }
label { display: grid; gap: 6px; }
.panelChoice { display: flex; align-items: start; gap: 8px; }
.panelDialogue { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid #e0e7e1; }
textarea, select { width: 100%; box-sizing: border-box; font: inherit; padding: 9px; border: 1px solid #becdc2; border-radius: 7px; }
.pageArtwork img { width: 100%; height: auto; }
.emptyPage { aspect-ratio: 3/4; background: #eef2ed; display: grid; place-items: center; color: #627566; }
.modelNotice { background: #fbf4e7; padding: 12px; border-radius: 8px; color: #735c36; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 360px; overflow: auto; }
.historyImages { display: flex; flex-wrap: wrap; gap: 8px; }.historyImages button { width: 100px; padding: 4px; }.historyImages img { width: 100%; height: auto; display: block; }
@media (max-width: 900px) { .pageEditor { grid-template-columns: 1fr; } }
</style>
