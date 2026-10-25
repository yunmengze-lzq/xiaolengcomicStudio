<template>
  <figure class="metricChart"><figcaption>{{ title }}</figcaption><svg v-if="validRows.length" :viewBox="`0 0 760 ${kind === 'line' ? 250 : Math.max(120, rows.length * 42 + 28)}`" role="img" :aria-label="title">
    <template v-if="kind === 'line'"><line x1="66" y1="205" x2="730" y2="205" stroke="currentColor" opacity=".2" /><line x1="66" y1="25" x2="66" y2="205" stroke="currentColor" opacity=".2" /><text x="8" y="35">{{ format(maximum) }}</text><text x="30" y="205">0</text><path :d="linePath" fill="none" stroke="var(--studioAccent)" stroke-width="3" /><circle v-for="(row, index) in rows" v-show="row.value !== null" :key="row.id" :cx="x(index)" :cy="y(row.value || 0)" r="5" fill="var(--studioAccent)"><title>{{ row.label }}：{{ row.value === null ? '未知' : format(row.value) }}</title></circle><text x="66" y="235">{{ rows[0]?.label }}</text><text x="730" y="235" text-anchor="end">{{ rows.at(-1)?.label }}</text></template>
    <g v-else v-for="(row, index) in rows" :key="row.id" :transform="`translate(0,${index * 42 + 16})`"><title>{{ row.label }}：{{ row.value === null ? '未知' : format(row.value) }}</title><text x="0" y="17">{{ row.label.length > 15 ? row.label.slice(0, 15) + '…' : row.label }}</text><rect x="240" y="0" :width="row.value === null ? 0 : row.value / maximum * 400" height="24" rx="4" fill="var(--studioAccent)" opacity=".82" /><text x="660" y="17">{{ row.value === null ? '未知' : format(row.value) }}</text></g>
  </svg><p v-else class="chartEmpty">{{ emptyText || '尚无可绘制的实际指标；同步成功后自动呈现。' }}</p><details v-if="rows.length"><summary>查看图表数据</summary><table><thead><tr><th>项目 / 观察时间</th><th>数值</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{ row.label }}</td><td>{{ row.value === null ? '未知' : row.value.toLocaleString() }}</td></tr></tbody></table></details></figure>
</template>
<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ title: string; rows: { id: string; label: string; value: number | null; at?: string }[]; kind?: "bar" | "line"; emptyText?: string }>();
const validRows = computed(() => props.rows.filter((row) => row.value !== null));
const maximum = computed(() => Math.max(1, ...validRows.value.map((row) => row.value!)));
function format(value: number) { return value.toLocaleString("zh-CN", { maximumFractionDigits: 1 }); }
function x(index: number) { const first = Date.parse(props.rows[0]?.at || ""); const last = Date.parse(props.rows.at(-1)?.at || ""); return Number.isFinite(first) && Number.isFinite(last) && last > first ? 66 + (Date.parse(props.rows[index]?.at || "") - first) / (last - first) * 664 : props.rows.length === 1 ? 398 : 66 + index / Math.max(1, props.rows.length - 1) * 664; }
function y(value: number) { return 205 - value / maximum.value * 175; }
const linePath = computed(() => { let path = ""; let connected = false; props.rows.forEach((row, index) => { if (row.value === null) { connected = false; return; } path += `${connected ? "L" : "M"}${x(index)},${y(row.value)} `; connected = true; }); return path; });
</script>
<style scoped lang="scss">
.metricChart { margin: 0; min-width: 0; figcaption { font-size: 17px; font-weight: 650; margin-bottom: 20px; } svg { width: 100%; height: auto; display: block; overflow: visible; } text { font: 13px -apple-system, "PingFang SC", sans-serif; fill: currentColor; } details { margin-top: 16px; font-size: 12px; } table { width: 100%; text-align: left; border-collapse: collapse; th, td { padding: 8px; border-bottom: 1px solid var(--studioLine); } } .chartEmpty { padding: 34px 14px; color: var(--studioMuted); background: var(--studioPaper); border-radius: 8px; } }
</style>
