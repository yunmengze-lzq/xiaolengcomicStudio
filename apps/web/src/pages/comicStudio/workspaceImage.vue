<template>
  <img ref="element" :src="url" :alt="alt" :class="{ waitingImage: !url }" decoding="async" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import useWorkspaceFiles from "@/lib/workspaceFiles";

const props = defineProps<{ directory: string; path: string; alt: string }>();
const element = ref<HTMLImageElement>();
const visible = ref(false);
const url = ref<string>();
const foreground = ref(!document.hidden);
const updateVisibility = () => { foreground.value = !document.hidden; };
onMounted(() => document.addEventListener("visibilitychange", updateVisibility));
onBeforeUnmount(() => document.removeEventListener("visibilitychange", updateVisibility));

watch(element, (image, _previous, cleanup) => {
  if (!image) return;
  const observer = new IntersectionObserver(([entry]) => { visible.value = entry?.isIntersecting === true; }, { rootMargin: "96px" });
  observer.observe(image);
  cleanup(() => observer.disconnect());
}, { flush: "post" });

watch(() => [visible.value && foreground.value, props.directory, props.path] as const, async ([inView, directory, path], _previous, cleanup) => {
  url.value = undefined;
  if (!inView || !directory || !path) return;
  const image = useWorkspaceFiles(directory).acquireUrl(path);
  let current = true;
  cleanup(() => { current = false; image.release(); });
  try {
    const result = await image.url;
    if (current) url.value = result;
  } catch { /* A removed image or a cancelled read keeps the placeholder. */ }
}, { immediate: true });
</script>

<style scoped>
.waitingImage { min-width: 24px; min-height: 28px; }
</style>
