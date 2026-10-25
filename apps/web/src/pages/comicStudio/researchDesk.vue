<template>
  <section class="researchDesk surface" id="researchDesk">
    <div class="sectionTitle"><h2>围绕一个梗，收集多平台素材</h2><span>热词 → 素材 → 原创脚本</span></div>
    <p>选择热词后，在这里搜索同一个主题。搜索结果只有标题时会标明；已收集的正文、人工核对笔记会一起交给编剧。</p>
    <label for="researchKeyword">要研究的热词或剧情梗</label><input id="researchKeyword" v-model="keyword" maxlength="80" placeholder="例如：职场热梗、已读不回、MBTI下班" />
    <div class="researchActions"><label v-for="item in platforms" :key="item.id"><input v-model="selected" type="checkbox" :value="item.id" />{{ item.label }}</label><button class="primaryButton" :disabled="disabled || !keyword.trim() || !selected.length" @click="emit('collect', keyword.trim(), selected)">搜索并建立素材包</button></div>
    <small>小红书使用本人会话搜索；抖音和B站需先在平台设置打开专用浏览器并登录。豆瓣读取公开讨论搜索，弱智吧读取公开列表并按关键词筛选，受限时需在官网本人处理。失败平台单独说明，保留成功结果。</small>
    <p v-if="status" role="status">{{ status }}</p>
    <template v-if="project.researchPacks.length">
      <label for="researchPack">专题素材包</label><select id="researchPack" v-model="selectedPack"><option v-for="item in project.researchPacks" :key="item.id" :value="item.id">{{ item.keyword }} · {{ item.materials.length }}条 · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}</option></select>
      <template v-if="pack"><div class="sourceResults"><p v-for="item in pack.statuses" :key="item.platform"><strong>{{ item.platform }}</strong> {{ item.message }}</p></div>
        <label for="researchNotes">已核对的剧情结构与改编想法</label><textarea id="researchNotes" v-model="pack.notes" rows="3" maxlength="10000" placeholder="记录原梗怎么玩、冲突与反转，哪些是事实、哪些想原创。不会自动将标题补写成原剧情。" />
        <div class="researchActions"><button class="secondaryButton" :disabled="disabled" @click="emit('save')">保存研究笔记</button><button class="primaryButton" :disabled="disabled" @click="emit('use', pack.id)">用这包素材创作原创漫画</button></div>
        <details><summary>查看 {{ pack.materials.length }} 条来源与素材</summary><article v-for="item in pack.materials" :key="item.id"><a :href="safeLink(item.url)" target="_blank" rel="noopener noreferrer">{{ item.title }}</a><small>{{ item.source }} · {{ item.metric || '未获取热度' }}</small><p>{{ item.summary }}</p><button v-if="item.source.includes('小红书')" class="textButton" :disabled="disabled" @click="emit('detail', pack.id, item.id)">读取这篇笔记正文</button></article></details>
      </template>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ComicProject } from "./model";
import { safeLink } from "./model";
const props = defineProps<{ project: ComicProject; disabled: boolean; status: string }>();
const keyword = defineModel<string>("keyword", { default: "" });
const emit = defineEmits<{ collect: [keyword: string, platforms: string[]]; save: []; use: [id: string]; detail: [packId: string, topicId: string] }>();
const platforms = [{ id: "xhsLocal", label: "小红书" }, { id: "douyin", label: "抖音" }, { id: "bilibili", label: "B站" }, { id: "tieba", label: "弱智吧" }, { id: "douban", label: "豆瓣" }];
const selected = ref(["xhsLocal", "douyin", "bilibili"]);
const selectedPack = ref(props.project.researchPacks[0]?.id || "");
const pack = computed(() => props.project.researchPacks.find((item) => item.id === selectedPack.value));
watch(() => props.project.researchPacks[0]?.id, (id) => { selectedPack.value = id || ""; });
</script>
<style scoped lang="scss">
@use "./studioForms.scss";
.researchDesk { .researchActions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 12px 0; label { display: inline-flex; align-items: center; gap: 6px; margin: 0; } } small { display: block; color: var(--studioMuted); line-height: 1.7; } article { border-top: 1px solid var(--studioLine); padding: 14px 0; p { white-space: pre-wrap; max-height: 220px; overflow: auto; margin: 8px 0; } } .sourceResults { background: var(--studioPaper); padding: 12px; margin-top: 12px; p { margin: 5px 0; font-size: 13px; } } summary { cursor: pointer; padding: 10px 0; } }
</style>
