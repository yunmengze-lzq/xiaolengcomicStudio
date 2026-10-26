<template>
  <div class="letteringEditor">
    <div v-if="imageUrl" class="positionCanvas" :class="{ safe: textMode === 'safe' }" :style="{ fontFamily: fontFamilies[fontFamily] }">
      <div v-if="textMode === 'safe'" class="safeSpeech">
        <span v-for="line in panel.speech" :key="line.id" :class="{ darkBubble: line.tone === 'dark' }">{{ line.kind === 'thought' ? '心声 · ' : '' }}{{ speakerName(line.speakerId) }}{{ line.text }}</span>
        <span v-if="!panel.speech.length && panel.dialogue">{{ panel.dialogue }}</span>
      </div>
      <img :src="imageUrl" alt="当前分格，拖动图内气泡可调整排字位置" />
      <template v-if="textMode === 'overlay'">
        <button v-for="line in panel.speech" :key="line.id" class="draggableBubble" :class="{ tailRight: line.tail === 'right', noTail: line.tail === 'none' || line.kind !== 'dialogue' || line.shape !== 'oval', thoughtBubble: line.kind === 'thought', darkBubble: line.tone === 'dark', cloudBubble: line.shape === 'cloud', burstBubble: line.shape === 'burst', boxBubble: line.shape === 'box' }" :style="{ left: `${line.x * 100}%`, top: `${line.y * 100}%`, width: `${line.width * 100}%` }" :aria-label="`移动${speakerName(line.speakerId) || '对白'}气泡，方向键微调`" @pointerdown="startDrag($event, line)" @keydown="nudge($event, line)"><svg class="bubbleOutline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path :d="bubblePath(line.shape)" :fill="line.tone === 'dark' ? '#202228' : '#fffefa'" stroke="#202228" stroke-width="1.5" vector-effect="non-scaling-stroke" /></svg><span>{{ line.text }}</span></button>
        <span v-if="!panel.speech.length && panel.dialogue" class="legacyBubble" :style="{ left: `${panel.bubbleX * 100}%`, top: `${panel.bubbleY * 100}%` }">{{ panel.dialogue }}</span>
      </template>
      <div v-if="panel.caption" class="captionPreview">{{ panel.caption }}</div>
    </div>
    <p v-if="fontError" role="alert">{{ fontError }}</p>
    <p class="editorHint">{{ textMode === 'safe' ? '对白在画面之外排布，自动分列，不遮人物。下方为编辑示意，成品预览采用最终字号与分格尺寸。' : '拖动气泡或用方向键微调。请避开人脸和关键动作；最终尺寸与重叠检查以成品预览为准。' }}</p>
    <div class="editorToolbar">
      <button @click="panel.speech = splitDialogue(panel, cast)">更新对白气泡 · 保留心声</button>
      <button :disabled="panel.speech.length >= 6" @click="addSpeech">添加气泡</button><button :disabled="panel.speech.length >= 6 || !panel.performances.some((item) => item.thought.trim())" @click="importThoughts">从分镜添加心声</button>
    </div>
    <div v-for="(line, index) in panel.speech" :key="line.id" class="speechRow">
      <label :for="`speaker${line.id}`">气泡 {{ index + 1 }} · 说话角色</label>
      <select :id="`speaker${line.id}`" v-model="line.speakerId" @change="synchronize"><option value="">不标角色</option><option v-for="character in cast" :key="character.id" :value="character.id">{{ character.name }}</option></select>
      <div class="bubbleOptions"><label :for="`kind${line.id}`">文字用途<select :id="`kind${line.id}`" v-model="line.kind" @change="setKind(line); synchronize()"><option value="dialogue">对白 · 角色说出口</option><option value="thought">心声 · 内心独白</option><option value="narration">旁白 · 叙述</option></select></label><label :for="`shape${line.id}`">气泡外形<select :id="`shape${line.id}`" v-model="line.shape"><option value="oval">圆润对白</option><option value="cloud">云朵心声</option><option value="burst">爆发喊话</option><option value="box">方框旁白</option></select></label><label :for="`tone${line.id}`">配色<select :id="`tone${line.id}`" v-model="line.tone"><option value="light">白底黑字</option><option value="dark">黑底白字</option></select></label></div>
      <textarea v-model="line.text" @input="synchronize" :aria-label="`气泡${index + 1}文字`" maxlength="600" rows="2"></textarea>
      <label v-if="textMode === 'overlay'" :for="`width${line.id}`">气泡宽度 {{ Math.round(line.width * 100) }}%</label>
      <input v-if="textMode === 'overlay'" :id="`width${line.id}`" v-model.number="line.width" type="range" min="0.2" max="0.9" step="0.01" />
      <template v-if="textMode === 'overlay'"><label :for="`tail${line.id}`">气泡尾巴</label><select :id="`tail${line.id}`" v-model="line.tail"><option value="left">朝左下</option><option value="right">朝右下</option><option value="none">无尾巴</option></select></template>
      <button @click="panel.speech.splice(index, 1); synchronize()">移除此气泡</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import type { Character, Panel, Speech, Episode } from "./model";
import { splitDialogue } from "./model";
import { fontFamilies, loadComicFont, bubblePath } from "./render";
const props = defineProps<{ panel: Panel; cast: Character[]; imageUrl?: string; textMode: "safe" | "overlay"; fontFamily: Episode["layout"]["fontFamily"] }>();
const fontError = ref("");
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
}
function startDrag(event: PointerEvent, line: Speech) {
  if (event.button !== 0) return;
  const target = event.currentTarget as HTMLElement;
  const parent = target.parentElement!;
  const box = parent.getBoundingClientRect();
  const start = { x: event.clientX, y: event.clientY, left: line.x, top: line.y };
  target.setPointerCapture(event.pointerId);
  const move = (next: PointerEvent) => {
    line.x = Math.max(0, Math.min(1 - line.width - .02, start.left + (next.clientX - start.x) / box.width));
    line.y = Math.max(0, Math.min(Math.max(0, .9 - target.offsetHeight / box.height), start.top + (next.clientY - start.y) / box.height));
  };
  const stop = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", stop); target.removeEventListener("pointercancel", stop); };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", stop);
  target.addEventListener("pointercancel", stop);
}
function nudge(event: KeyboardEvent, line: Speech) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  line.x = Math.max(0, Math.min(1 - line.width - .02, line.x + (event.key === "ArrowRight" ? .01 : event.key === "ArrowLeft" ? -.01 : 0)));
  const target = event.currentTarget as HTMLElement;
  const maxTop = Math.max(0, .9 - target.offsetHeight / target.parentElement!.clientHeight);
  line.y = Math.max(0, Math.min(maxTop, line.y + (event.key === "ArrowDown" ? .01 : event.key === "ArrowUp" ? -.01 : 0)));
}
</script>
<style scoped lang="scss">
.letteringEditor {
  .positionCanvas { position: relative; width: min(100%, 380px); aspect-ratio: 3 / 4; border: 1px solid #ccd8ce; margin: 16px auto; background: white; color: #22372d; overflow: hidden; img { width: 100%; height: 100%; object-fit: contain; } &.safe { display: flex; flex-direction: column; img { min-height: 0; flex: 1; object-fit: contain; } } }
  .safeSpeech { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 8px; span { border: 1px solid #294937; border-radius: 8px; padding: 6px; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; } }
  .draggableBubble, .legacyBubble { position: absolute; border: 1px solid #294937; border-radius: 9px; background: white; color: #22372d; padding: 8px; font: inherit; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; cursor: grab; touch-action: none; text-align: left; min-height: 36px; &:focus-visible { outline: 3px solid #c78e49; outline-offset: 2px; } }
  .legacyBubble { max-width: 74%; }
  .draggableBubble { z-index: 1; margin: 0; border: 1.5px solid #202922; border-radius: 50% / 42%; background: #fffefa; padding: 14px 16px; text-align: center; line-height: 1.45; font-weight: 500; box-sizing: border-box; &::after { content: ""; position: absolute; left: 25%; bottom: -9px; width: 13px; height: 13px; background: #fffefa; border-right: 1.5px solid #202922; border-bottom: 1.5px solid #202922; transform: skew(-20deg) rotate(45deg); } &.tailRight::after { left: auto; right: 25%; transform: skew(20deg) rotate(45deg); } &.noTail::after { display: none; } &:active { cursor: grabbing; } }
  .draggableBubble { border: 0; border-radius: 0; background: transparent; box-shadow: none; .bubbleOutline { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; } > span { position: relative; z-index: 1; } }
  .draggableBubble.darkBubble { background: transparent; color: white; &::after { background: #202228; } }
  .draggableBubble.thoughtBubble::after { display: block; left: 23%; bottom: -10px; width: 7px; height: 7px; border: 1px solid #202922; border-radius: 50%; transform: none; box-shadow: -7px 9px 0 -1px #fffefa, -7px 9px 0 0 #202922; }
  .draggableBubble.thoughtBubble.darkBubble::after { box-shadow: -7px 9px 0 -1px #202228, -7px 9px 0 0 #202922; }
  .bubbleOptions { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
  .positionCanvas:not(.safe) .captionPreview { position: absolute; bottom: 0; left: 0; right: 0; }
  .captionPreview { background: #f7f2e5; padding: 7px; font-size: 13px; white-space: pre-wrap; }
  .safeSpeech .darkBubble { background: #202228; color: white; }
  .editorHint { font-size: 12px; color: #647269; }
  .editorToolbar { display: flex; flex-wrap: wrap; gap: 8px; }
  button { border: 1px solid #c7d4cb; border-radius: 6px; min-height: 38px; background: #f6f8f4; color: #294937; padding: 7px 10px; cursor: pointer; }
  .speechRow { display: grid; gap: 6px; padding: 12px; margin-top: 12px; border: 1px solid #dde6de; border-radius: 8px; label { font-size: 12px; } select, textarea { width: 100%; box-sizing: border-box; padding: 8px; font: inherit; color: inherit; background: transparent; border: 1px solid #c8d4cb; border-radius: 5px; } }
}
</style>
