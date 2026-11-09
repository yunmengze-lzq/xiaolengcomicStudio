<template>
  <div class="letteringEditor">
    <div class="positionCanvas" :style="{ aspectRatio: '1080 / 1440' }">
      <canvas ref="previewCanvas" aria-label="整页漫画排版画布" />
      <button v-for="item in pageFrames" :key="item.panel.id" class="frameHandle" :class="{ selectedFrame: item.panel.id === panel.id }" :style="{left:`${item.box[0]! / 1080 * 100}%`,top:`${item.box[1]! / 1440 * 100}%`,width:`${item.box[2]! / 1080 * 100}%`,height:`${item.box[3]! / 1440 * 100}%`}" :aria-label="`编辑第 ${item.index + 1} 格`" @click="emit('selectPanel', item.index)" />
      <button v-for="box in hitBoxes" :key="box.id" class="bubbleHandle" :class="{ activeBubble: activeSpeechId === box.id }" :style="{ left: `${(box.x + frame[0]!) / 1080 * 100}%`, top: `${(box.y + frame[1]!) / 1440 * 100}%`, width: `${box.width / 1080 * 100}%`, height: `${box.height / 1440 * 100}%` }" :aria-label="`编辑气泡：${panel.speech.find(line => line.id === box.id)?.text || '新气泡'}`" @click="activeSpeechId = box.id" @pointerdown="beginMove($event, box.id)" @keydown="moveWithKeys($event, box.id)" />
      <button v-if="selectedBox && textMode === 'overlay'" class="resizeHandle" aria-label="拖动调整气泡宽高" :style="{left:`${(selectedBox.x + frame[0]! + selectedBox.width) / 1080 * 100}%`,top:`${(selectedBox.y + frame[1]! + selectedBox.height) / 1440 * 100}%`}" @pointerdown="beginResize" />
    </div>
    <div class="bubbleInspector"><header class="inspectorHeading"><strong>第 {{ panelIndex + 1 }} 格</strong><span>选中气泡后编辑</span></header>
    <p v-if="fontError" role="alert">{{ fontError }}</p><p v-if="layoutWarning" class="editorHint" role="status">{{ layoutWarning }}</p>
    <p class="editorHint">{{ textMode === 'safe' ? '画外留白自动排列对白；点击气泡编辑。' : '点击气泡编辑，拖动或用方向键微调；此处与导出使用相同排版。' }}</p>
    <div class="editorToolbar">

      <button :disabled="panel.speech.length >= 6" @click="addSpeech">添加气泡</button><button :disabled="panel.speech.length >= 6 || !panel.performances.some((item) => item.thought.trim())" @click="importThoughts">从分镜添加心声</button>
    </div>
    <label v-if="panel.speech.length" class="speechPicker">编辑气泡<select v-model="activeSpeechId"><option v-for="(line, index) in panel.speech" :key="line.id" :value="line.id">{{ index + 1 }} · {{ line.kind === 'thought' ? '心声' : line.kind === 'narration' ? '旁白' : '对白' }} {{ line.text.slice(0, 16) || '新气泡' }}</option></select></label>
    <p v-if="!panel.speech.length" class="editorHint">本格暂无气泡，点击“添加气泡”开始。</p>
    <div v-for="(line, index) in panel.speech" v-show="activeSpeechId === line.id" :key="line.id" class="speechRow">
      <label :for="`speaker${line.id}`">气泡 {{ index + 1 }} · 说话角色</label>
      <select :id="`speaker${line.id}`" v-model="line.speakerId" @change="synchronize"><option value="">不标角色</option><option v-for="character in cast" :key="character.id" :value="character.id">{{ character.name }}</option></select>
      <label :for="`kind${line.id}`">文字用途<select :id="`kind${line.id}`" v-model="line.kind" @change="setKind(line); synchronize()"><option value="dialogue">对白 · 角色说出口</option><option value="thought">心声 · 内心独白</option><option value="narration">旁白 · 叙述</option></select></label>
      <textarea v-model="line.text" @input="synchronize" :aria-label="`气泡${index + 1}文字`" maxlength="600" rows="2"></textarea>
      <div class="bubbleOptions"><label>单条字号 · {{ line.fontSize || episode.layout.fontSize }} px<input type="range" :value="line.fontSize || episode.layout.fontSize" min="12" max="80" @input="line.fontSize = Number(($event.target as HTMLInputElement).value)" /></label><button v-if="line.fontSize" @click="delete line.fontSize">继承页面字号</button></div>
      <div class="editorToolbar"><button v-for="symbol in ['(≧▽≦)', 'QAQ', '♡', '…']" :key="symbol" @click="line.text += symbol; synchronize()">{{ symbol }}</button></div>
      <label>文字方向<select :value="line.vertical ?? false" @change="line.vertical = ($event.target as HTMLSelectElement).value === 'true'; if (line.vertical) line.width = Math.min(line.width, .32)"><option :value="false">横排</option><option :value="true">竖排 · 从右往左读</option></select></label>
      <details><summary>气泡样式与位置 · 可选</summary><div class="bubbleOptions"><label :for="`shape${line.id}`">气泡外形<select :id="`shape${line.id}`" v-model="line.shape"><option value="oval">圆润对白</option><option value="cloud">云朵心声</option><option value="burst">爆发喊话</option><option value="box">方框旁白</option></select></label><label :for="`tone${line.id}`">配色<select :id="`tone${line.id}`" v-model="line.tone"><option value="light">白底黑字</option><option value="dark">黑底白字</option></select></label>

      <label v-if="textMode === 'overlay'" :for="`width${line.id}`">气泡宽度 {{ Math.round(line.width * 100) }}%</label>
      <input v-if="textMode === 'overlay'" :id="`width${line.id}`" v-model.number="line.width" type="range" min="0.2" max="0.9" step="0.01" />
      <template v-if="textMode === 'overlay'"><label>气泡高度<input type="range" :value="line.height || selectedHeight(line.id)" min="0.06" max="0.85" step="0.01" @input="line.height = Number(($event.target as HTMLInputElement).value)" /></label><div class="editorToolbar"><button @click="scaleBubble(line, .9)">整体缩小</button><button @click="scaleBubble(line, 1.1)">整体放大</button><button v-if="line.height" @click="delete line.height">自动高度</button></div></template>
      <template v-if="textMode === 'overlay'"><label :for="`tail${line.id}`">气泡尾巴</label><select :id="`tail${line.id}`" v-model="line.tail"><option value="left">朝左下</option><option value="right">朝右下</option><option value="none">无尾巴</option></select></template>
      <template v-if="textMode === 'overlay' && line.kind === 'dialogue' && line.tail !== 'none'"><label :for="`tailLength${line.id}`">尾巴长度</label><input :id="`tailLength${line.id}`" :value="line.tailLength ?? .2" @input="line.tailLength = Number(($event.target as HTMLInputElement).value)" type="range" min="0.05" max="0.5" step="0.01" /></template>
</div></details>
      <button @click="panel.speech.splice(index, 1); activeSpeechId = panel.speech[0]?.id || ''; synchronize()">移除此气泡</button>
    </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Character, Panel, Speech, Episode } from "./model";
import { splitDialogue } from "./model";
import { loadComicFont, drawCompositionPage, panelFrame, type BubbleHitBox, type Files } from "./render";
const props = defineProps<{ panel: Panel; episode: Episode; files: Files; cast: Character[]; imageUrl?: string; textMode: "safe" | "overlay"; fontFamily: Episode["layout"]["fontFamily"] }>();
const emit = defineEmits<{ selectPanel: [index: number] }>();
const fontError = ref("");
const activeSpeechId = ref("");
watch(() => props.panel.id, () => {
  if (!props.panel.speech.length && props.panel.dialogue.trim()) props.panel.speech = splitDialogue(props.panel, props.cast);
  activeSpeechId.value = props.panel.speech[0]?.id || "";
}, { immediate: true });
watch(() => props.fontFamily, async (key) => { fontError.value = ""; try { await loadComicFont(key); } catch (error) { fontError.value = (error as Error).message; } }, { immediate: true });
function setKind(line: Speech) { line.shape = line.kind === "thought" ? "cloud" : line.kind === "narration" ? "box" : "oval"; line.tail = line.kind === "dialogue" ? "left" : "none"; }
function importThoughts() {
  for (const acting of props.panel.performances) {
    if (props.panel.speech.length >= 6) break;
    if (acting.thought.trim() && !props.panel.speech.some((item) => item.kind === "thought" && item.speakerId === acting.characterId && item.text === acting.thought)) props.panel.speech.push({ id: crypto.randomUUID(), speakerId: acting.characterId, text: acting.thought, kind: "thought", shape: "cloud", tone: "light", x: .04, y: .55, width: .45, tail: "none" });
  }
}
function speakerName(id: string) { const character = props.cast.find((item) => item.id === id); return character ? `${character.name}：` : ""; }
function synchronize() { props.panel.dialogue = props.panel.speech.filter((line) => line.kind === "dialogue").map((line) => `${speakerName(line.speakerId)}${line.text}`).join("\n"); }
function addSpeech() {
  if (!props.panel.speech.length && props.panel.dialogue.trim()) props.panel.speech = splitDialogue(props.panel, props.cast);
  const index = props.panel.speech.length;
  if (index >= 6) return;
  props.panel.speech.push({ id: crypto.randomUUID(), speakerId: props.cast[index % Math.max(1, props.cast.length)]?.id || "", text: "", kind: "dialogue", shape: "oval", tone: "light", x: index % 2 ? .51 : .04, y: .04 + Math.floor(index / 2) * .24, width: .45, tail: index % 2 ? "right" : "left" });
  activeSpeechId.value = props.panel.speech.at(-1)!.id;
}
const previewCanvas = ref<HTMLCanvasElement>();
const hitBoxes = ref<BubbleHitBox[]>([]);
const layoutWarning = ref("");
const panelIndex = computed(() => Math.max(0, props.episode.panels.findIndex(panel => panel.id === props.panel.id)));
const pageIndex = computed(() => Math.floor(panelIndex.value / props.episode.layout.perPage));
const pageFrames = computed(() => props.episode.panels.map((panel,index) => ({ panel,index,box:panelFrame(props.episode,index) })).filter(item => Math.floor(item.index / props.episode.layout.perPage) === pageIndex.value));
const selectedBox = computed(() => hitBoxes.value.find(box => box.id === activeSpeechId.value));
const frame = computed(() => panelFrame(props.episode, Math.max(0, props.episode.panels.findIndex(panel => panel.id === props.panel.id))));
let renderVersion = 0;
let renderTimer: ReturnType<typeof setTimeout>;
let stopDrag: (() => void) | undefined;
const imageBytes = new Map<string, Promise<ArrayBuffer>>();
const cachedFiles: Files = { read(path) { if (!imageBytes.has(path)) imageBytes.set(path, props.files.read(path).catch(error => { imageBytes.delete(path); throw error; })); return imageBytes.get(path)!; } };
watch(() => [props.episode.panels, props.episode.layout, props.episode.castSnapshot, frame.value, previewCanvas.value], () => {
  const version = ++renderVersion;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(async () => {
    const needed = new Set(pageFrames.value.map(item => item.panel.image));
    for (const path of imageBytes.keys()) if (!needed.has(path)) imageBytes.delete(path);
    const target = previewCanvas.value;
    if (!target) return;
    try {
      await loadComicFont(props.fontFamily);
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1440;
      const warnings: string[] = [], boxes: BubbleHitBox[] = [];
      await drawCompositionPage(canvas.getContext("2d")!, cachedFiles, props.episode, pageIndex.value, warnings, props.panel.id, boxes);
      if (version !== renderVersion) return;
      target.width = canvas.width; target.height = canvas.height;
      target.getContext("2d")!.drawImage(canvas, 0, 0);
      hitBoxes.value = boxes; layoutWarning.value = [...new Set(warnings)].join("；"); fontError.value = "";
    } catch(error) { if (version === renderVersion) fontError.value = (error as Error).message; }
  }, 40);
}, { deep: true, immediate: true, flush: "post" });
onBeforeUnmount(() => { renderVersion++; clearTimeout(renderTimer); stopDrag?.(); imageBytes.clear(); });
function selectedHeight(id: string) { return (hitBoxes.value.find(box => box.id === id)?.height || frame.value[3]! * .2) / frame.value[3]!; }
function scaleBubble(line: Speech, scale: number) {
  line.width = Math.max(.15, Math.min(.95, line.width * scale));
  line.height = Math.max(.06, Math.min(.85, (line.height || selectedHeight(line.id)) * scale));
  line.fontSize = Math.round(Math.max(12, Math.min(80, (line.fontSize || props.episode.layout.fontSize) * scale)));
}
function beginMove(event: PointerEvent, id: string) {
  activeSpeechId.value = id;
  const line = props.panel.speech.find(line => line.id === id);
  if (!line || props.textMode === "safe" || event.button !== 0) return;
  const target = event.currentTarget as HTMLElement, rect = previewCanvas.value!.getBoundingClientRect();
  const box = hitBoxes.value.find(box => box.id === id)!;
  const start = { x: event.clientX, y: event.clientY, left: box.x / frame.value[2]!, top: box.y / frame.value[3]! };
  stopDrag?.(); target.setPointerCapture(event.pointerId);
  const move = (next: PointerEvent) => { line.x = Math.max(0, Math.min(.95, start.left + (next.clientX - start.x) / rect.width * 1080 / frame.value[2]!)); line.y = Math.max(0, Math.min(.95, start.top + (next.clientY - start.y) / rect.height * 1440 / frame.value[3]!)); };
  const stop = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", stop); target.removeEventListener("pointercancel", stop); stopDrag = undefined; };
  stopDrag = stop; target.addEventListener("pointermove", move); target.addEventListener("pointerup", stop); target.addEventListener("pointercancel", stop);
}
function beginResize(event: PointerEvent) {
  const line=props.panel.speech.find(item=>item.id===activeSpeechId.value), box=selectedBox.value;
  if (!line || !box || event.button!==0) return;
  event.preventDefault(); const target=event.currentTarget as HTMLElement; const rect=previewCanvas.value!.getBoundingClientRect();
  const start={x:event.clientX,y:event.clientY,width:box.width,height:box.height}; stopDrag?.(); target.setPointerCapture(event.pointerId);
  const move=(next:PointerEvent)=>{line.width=Math.max(.15,Math.min(.95,(start.width+(next.clientX-start.x)/rect.width*1080)/frame.value[2]!));line.height=Math.max(.06,Math.min(.85,(start.height+(next.clientY-start.y)/rect.height*1440)/frame.value[3]!));};
  const stop=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',stop);target.removeEventListener('pointercancel',stop);stopDrag=undefined;};
  stopDrag=stop;target.addEventListener('pointermove',move);target.addEventListener('pointerup',stop);target.addEventListener('pointercancel',stop);
}
function moveWithKeys(event: KeyboardEvent, id: string) {
  const line = props.panel.speech.find(line => line.id === id);
  if (!line || props.textMode === "safe" || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  line.x = Math.max(0, Math.min(.95, line.x + (event.key === "ArrowRight" ? .01 : event.key === "ArrowLeft" ? -.01 : 0)));
  line.y = Math.max(0, Math.min(.95, line.y + (event.key === "ArrowDown" ? .01 : event.key === "ArrowUp" ? -.01 : 0)));
}
</script>
<style scoped lang="scss">
.letteringEditor {
  .positionCanvas { position: relative; width: min(100%, 680px); border: 1px solid #ccd8ce; margin: 0 auto; background: white; color: #22372d; overflow: hidden; }
  .bubbleOptions { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
  .safeSpeech .darkBubble { background: #202228; color: white; }
  .editorHint { font-size: 12px; color: #647269; }
  .editorToolbar { display: flex; flex-wrap: wrap; gap: 8px; }
  button { border: 1px solid #c7d4cb; border-radius: 6px; min-height: 38px; background: #f6f8f4; color: #294937; padding: 7px 10px; cursor: pointer; }
  .speechRow { display: grid; gap: 6px; padding: 12px; margin-top: 12px; border: 1px solid #dde6de; border-radius: 8px; label { font-size: 12px; } select, textarea { width: 100%; box-sizing: border-box; padding: 8px; font: inherit; color: inherit; background: transparent; border: 1px solid #c8d4cb; border-radius: 5px; } }
}

.letteringEditor { display: grid; grid-template-columns: minmax(280px, 1fr) 280px; gap: 16px; align-items: start; }
.bubbleInspector { min-width: 0; padding:16px; background:var(--studioCard,white); border-left:1px solid var(--studioLine,#dce4dc); max-height:75vh; overflow-y:auto; } .inspectorHeading { display:flex; justify-content:space-between; gap:10px; font-size:13px; } .inspectorHeading span { color:var(--studioMuted,#647269); }
.speechPicker { display: grid; gap: 6px; margin: 12px 0; font-size: 12px; }
.speechPicker select { width: 100%; padding: 9px; border: 1px solid #ccd8ce; border-radius: 6px; background: white; font: inherit; }
@media (max-width: 1100px) { .letteringEditor { grid-template-columns: minmax(160px, 1fr) 220px; gap: 12px; } }
@media (max-width: 760px) { .letteringEditor { grid-template-columns: 1fr; } }
.positionCanvas canvas { display:block; width:100%; height:100%; }
.letteringEditor .bubbleHandle { position:absolute; padding:0; min-height:0; background:transparent; border:1px dashed transparent; border-radius:0; touch-action:none; cursor:move; }
.letteringEditor .bubbleHandle:hover, .letteringEditor .bubbleHandle:focus-visible, .letteringEditor .bubbleHandle.activeBubble { border-color:#527b58; outline:2px dashed #527b58; outline-offset:2px; }
 .letteringEditor .frameHandle { position:absolute; padding:0; min-height:0; border:1px solid transparent; border-radius:0; background:transparent; cursor:pointer; } .letteringEditor .frameHandle:hover { outline:2px dashed #527b58; } .letteringEditor .selectedFrame { outline:2px solid #527b58; pointer-events:none; } .letteringEditor .bubbleHandle { z-index:2; } .letteringEditor .resizeHandle { position:absolute; width:14px; height:14px; min-height:0; padding:0; background:#527b58; border:2px solid white; border-radius:2px; transform:translate(-50%,-50%); z-index:3; cursor:nwse-resize; touch-action:none; }
@media (max-width:760px) { .bubbleInspector { max-height:none; border-left:0; } }
</style>
