<template>
  <section class="seriesDesk surface">
    <h2>连续集漫画 · {{ project.series.title || '固定角色，接着讲下去' }}</h2>
    <p>每个创作空间可管理一部连载。下一集继承所选前集的角色、画风和排版，编剧带入最近五集正文、世界设定与未完线索。</p>
    <label for="seriesTitle">连载名称</label><input id="seriesTitle" v-model="project.series.title" maxlength="100" placeholder="例如：小冷与小暖的下班日常" />
    <label for="seriesBible">固定世界设定与人物关系</label><textarea id="seriesBible" v-model="project.series.bible" rows="3" maxlength="4000" placeholder="人物关系、地点、长期目标、不能改变的设定。" />
    <label for="seriesLooseEnds">未完线索与长期伏笔</label><textarea id="seriesLooseEnds" v-model="project.series.looseEnds" rows="2" maxlength="3000" placeholder="记下哪些问题尚未解决，以及后续打算。AI参考这里，但不会假装自动记住未写入的情节。" />
    <button class="secondaryButton" :disabled="disabled" @click="emit('save')">保存连载设定</button>
    <label for="seriesPrevious">承接哪一集</label><select id="seriesPrevious" :value="project.activeEpisodeId" :disabled="disabled" @change="emit('select', ($event.target as HTMLSelectElement).value)"><option v-for="work in project.episodes" :key="work.id" :value="work.id">{{ work.parentEpisodeId ? `第${work.episodeNumber}集 · ` : '' }}{{ work.title }}{{ work.story ? '' : '（尚无正文）' }}</option></select>
    <label for="seriesDirection">下一集想讲什么</label><input id="seriesDirection" v-model="direction" maxlength="2000" placeholder="例如：两人决定每天留出两分钟，第一天就被加班打断……" />
    <button class="primaryButton" :disabled="disabled || !direction.trim() || !current?.story.trim()" @click="emit('next', direction)">创建下一集，继续编剧</button><small>创建后可手写或AI生成脚本；前集保持不变。已有后续集时，会提示你确认是否创建支线。</small>
    <ol><li v-for="work in [...project.episodes].reverse()" :key="work.id"><button class="textButton" :disabled="disabled" @click="emit('select', work.id)">{{ work.parentEpisodeId ? `第${work.episodeNumber}集 · ` : '' }}{{ work.title }}</button><small v-if="work.parentEpisodeId">承接：{{ project.episodes.find((item) => item.id === work.parentEpisodeId)?.title || '前集未找到' }}</small></li></ol>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import type { ComicProject } from "./model";
const props = defineProps<{ project: ComicProject; disabled: boolean }>();
const emit = defineEmits<{ save: []; select: [id: string]; next: [direction: string] }>();
const direction = ref("");
const current = computed(() => props.project.episodes.find((item) => item.id === props.project.activeEpisodeId));
</script>
<style scoped lang="scss">
@use "./studioForms.scss";
.seriesDesk { margin-bottom: 20px; summary { cursor: pointer; font-weight: 650; font-size: 16px; padding: 4px 0; } p, small { color: var(--studioMuted); line-height: 1.7; } small { display: block; margin-top: 8px; } ol { padding-left: 20px; } li { padding: 5px 0; } }
</style>
