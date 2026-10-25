<template>
  <el-dialog v-model="visible" title="设置中心" width="min(1080px, calc(100vw - 32px))" alignCenter appendToBody>
    <div class="settings">
      <aside class="sidebar" aria-label="设置分类">
        <template v-for="item in visiblePanels" :key="item.id">
          <h3 v-if="item.groupLabel" class="settingsGroupLabel">{{ item.groupLabel }}</h3>
          <button
            class="settingsItem"
            type="button"
            :aria-label="item.id === 'about' && hasDesktopUpdate ? `${item.label}，有新版本可用` : item.label"
            :aria-pressed="activePanel.id === item.id"
            @click="panel = item.id">
            <el-badge class="panelIcon" isDot :hidden="item.id !== 'about' || !hasDesktopUpdate">
              <component :is="item.icon" :size="18" aria-hidden="true" />
            </el-badge>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </aside>
      <section class="content" :aria-label="activePanel.label" tabindex="0">
        <h2 class="panelTitle">{{ activePanel.label }}</h2>
        <div class="panelContent">
          <div v-if="props.comicStudio && ['languageModel', 'mediaModel'].includes(activePanel.id)" class="modelPurpose"><p>{{ activePanel.id === 'languageModel' ? '管理编剧、选梗和分析使用的文本服务。可添加云端API，也可配置本机OpenAI兼容服务。' : '管理角色、画风和分格出图服务。支持已有图片供应商，以及本机ComfyUI工作流。' }}</p><button @click="panel = 'comicDefaults'">查看漫画默认模型分配</button><button @click="panel = 'comicLocal'">检测本地模型服务</button></div>
          <div v-if="activePanel.id.startsWith('comic')" :key="activePanel.id">
            <slot :name="activePanel.id" />
          </div>
            <keep-alive v-else include="personalization">
              <component
                :is="activePanel.component"
                :key="activePanel.id"
                v-bind="
                  { ...(['pluginMarket', 'languageModel', 'mediaModel', 'personalization', 'deviceLink'].includes(activePanel.id) ? { visible } : {}), ...(['languageModel', 'mediaModel', 'ui'].includes(activePanel.id) ? { comicStudio: props.comicStudio } : {}) }
                " />
            </keep-alive>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { hasDesktopUpdate } from "@/stores/desktopUpdate";
import { isMobile } from "@/lib/platform";
import {
  IconPalette,
  IconSettings,
  IconPhotoVideo,
  IconBuildingStore,
  IconInfoCircle,
  IconCode,
  IconShieldLock,
  IconPlugConnected,
  IconUserCog,
  IconSubtitlesAi,
  IconDevices,
} from "@tabler/icons-vue";

const settingsPanels = [
  { id: "ui", label: "界面设置", icon: IconPalette, component: defineAsyncComponent(() => import("./panels/ui.vue")) },
  { id: "general", label: "常规配置", icon: IconSettings, component: defineAsyncComponent(() => import("./panels/general/index.vue")) },
  {
    id: "languageModel",
    label: "文本模型",
    icon: IconSubtitlesAi,
    groupLabel: "模型",
    component: defineAsyncComponent(() => import("./panels/languageModel/index.vue")),
  },
  { id: "mediaModel", label: "媒体模型", icon: IconPhotoVideo, component: defineAsyncComponent(() => import("./panels/mediaModel/index.vue")) },
  {
    id: "pluginMarket",
    label: "插件市场",
    icon: IconBuildingStore,
    groupLabel: "市场",
    component: defineAsyncComponent(() => import("./panels/pluginMarket/index.vue")),
  },
  { id: "mcp", label: "MCP", icon: IconPlugConnected, groupLabel: "通讯", component: defineAsyncComponent(() => import("./panels/mcp/index.vue")) },
  ...(!isMobile
    ? [{ id: "deviceLink", label: "设备互联", icon: IconDevices, component: defineAsyncComponent(() => import("./panels/deviceLink.vue")) }]
    : []),
  {
    id: "personalization",
    label: "个性化",
    icon: IconUserCog,
    groupLabel: "其他",
    component: defineAsyncComponent(() => import("./panels/personalization.vue")),
  },
  { id: "privacy", label: "隐私", icon: IconShieldLock, component: defineAsyncComponent(() => import("./panels/privacy.vue")) },
  { id: "developer", label: "开发者选项", icon: IconCode, component: defineAsyncComponent(() => import("./panels/developer/index.vue")) },
  { id: "about", label: "关于", icon: IconInfoCircle, component: defineAsyncComponent(() => import("./panels/about.vue")) },
];
const props = defineProps<{ comicStudio?: boolean }>();
const comicPanels = [
  { id: "comicOverview", label: "连接与状态", icon: IconInfoCircle, component: null, groupLabel: "工作台" },
  { id: "comicDefaults", label: "漫画任务与外观", icon: IconSettings, component: null, groupLabel: undefined },
  { id: "comicPlatforms", label: "平台账号与数据", icon: IconPlugConnected, component: null, groupLabel: undefined },
  { id: "comicCollection", label: "自动采集", icon: IconDevices, component: null, groupLabel: undefined },
  { id: "comicLocal", label: "本地模型服务", icon: IconCode, component: null, groupLabel: undefined },
];
const visiblePanels = computed(() => {
  if (!props.comicStudio) return settingsPanels;
  const original = (id: string, groupLabel?: string) => ({ ...settingsPanels.find((item) => item.id === id)!, groupLabel });
  const comic = (id: string, groupLabel?: string) => ({ ...comicPanels.find((item) => item.id === id)!, groupLabel });
  return [comic("comicOverview", "开始使用"), original("languageModel", "模型"), { ...original("mediaModel"), label: "生图模型" }, { ...comic("comicDefaults"), label: "默认任务" }, comic("comicPlatforms", "内容来源"), comic("comicCollection"), comic("comicLocal", "本地运行"), original("ui", "外观") ];
});
const panel = defineModel<string>("panel", { default: "ui" });
const activePanel = computed(() => visiblePanels.value.find((item) => item.id === panel.value) || visiblePanels.value[0]!);
const visible = defineModel<boolean>({ default: false });
</script>

<style lang="scss" scoped>
.modelPurpose { padding: 16px; border: 1px solid var(--el-border-color); border-radius: 10px; margin-bottom: 20px; background: var(--el-fill-color-light); p { margin: 0 0 12px; line-height: 1.7; } button { margin: 0 12px 5px 0; padding: 8px 12px; border: 1px solid var(--el-border-color); background: var(--el-bg-color); color: var(--el-text-color-primary); border-radius: 6px; cursor: pointer; font: inherit; } }

.settings {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  height: min(78vh, calc(100dvh - 140px));
  overflow: hidden;

  .sidebar {
    min-height: 0;
    overflow-y: auto;
    padding: 2px;

    .settingsGroupLabel {
      margin: 14px 12px 6px;
      color: var(--el-text-color-secondary);
      font-size: 12px;
      font-weight: 400;
      line-height: 1.5;
    }

    .settingsItem {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 4px;
      border: 0;
      border-radius: var(--el-border-radius-base);
      background: transparent;
      color: var(--el-text-color-regular);
      font: inherit;
      text-align: start;
      cursor: pointer;

      .panelIcon {
        display: inline-flex;
        flex-shrink: 0;
      }

      > span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      &:hover {
        background: var(--el-fill-color-light);
      }

      &[aria-pressed="true"] {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--el-color-primary);
      }
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0 20px;
    overflow: hidden;

    .panelTitle {
      flex-shrink: 0;
      margin: 0 0 20px;
      font-size: 18px;
    }

    .panelContent {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-left: 5px;
      padding-right: 5px;
      padding-bottom: 50px;

      > :deep(.el-fade-in-enter-active),
      > :deep(.el-fade-in-leave-active) {
        transition-duration: 100ms;
      }
    }
  }

  @media (max-width: 700px) {
    grid-template-columns: 44px minmax(0, 1fr);

    .sidebar {
      .settingsGroupLabel {
        margin: 12px 0 6px;
        text-align: center;
      }

      .settingsItem {
        justify-content: center;
        padding: 12px;
        span {
          display: none;
        }
      }
    }

    .content {
      padding: 0 8px 0 16px;
    }
  }
}
</style>
