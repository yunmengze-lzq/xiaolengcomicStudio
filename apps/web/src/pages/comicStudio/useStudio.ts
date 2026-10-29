import { computed, onBeforeUnmount, ref, reactive, watch } from "vue";
import axios from "axios";
import { z } from "zod";
import { zipSync, strToU8 } from "fflate";
import { ElMessage } from "element-plus";
import useWorkspaceFiles from "@/lib/workspaceFiles";
import { useWorkspaceStore } from "@/stores/workspace";
import saveFile from "@/lib/saveFile";
import { uiSettings, settings as appSettings } from "@/stores/settings";
import { projectSchema, characterSchema, assetRecordSchema, feedbackSchema, insightSchema, memeIdeaSchema, createEpisode, newPanel, imageInput, imagePrompt, identityPanelInput, referencePaths, isApproved, splitDialogue, characterPrompt, publicationText, bindCast, matchingCharacter, directPageInput, productionReady } from "./model";
import type { ComicProject, Topic, Panel, ArtStyle, MemeIdea, Character } from "./model";
import { keywordInsights } from "./creatorInsights";
import { renderPages } from "./render";

type Model = { providerId: string; modelId: string; label: string; type?: string; configured?: boolean };
const planSchema = z.object({
  title: z.string().min(1).max(100),
  story: z.string().min(1).max(12000),
  newCharacters: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), name: z.string().min(1).max(30), description: z.string().min(1).max(1500), personality: z.string().max(1500).default(""), motivation: z.string().max(1000).default(""), speechStyle: z.string().max(1000).default("") })).max(4).default([]),
  panels: z
    .array(
      z.object({
        shot: z.string().max(100),
        action: z.string().min(1).max(3000),
        performances: z.array(z.object({ characterId: z.string().max(100), emotion: z.string().max(300), expression: z.string().max(500), pose: z.string().max(500), thought: z.string().max(600) })).max(10).default([]),
        dialogue: z.string().max(240),
        caption: z.string().max(160),
        characters: z.array(z.string()).max(10),
      }),
    )
    .min(2)
    .max(12),
});

export default function useStudio() {
  const workspace = useWorkspaceStore();
  const archivedProjects = ref<{ directory: string; name: string }[]>([]);
  const directory = ref("");
  const files = computed(() => useWorkspaceFiles(directory.value));
  const project = ref<ComicProject>();
  const stage = ref(0);
  const changeReason = ref("");
  const busy = ref("");
  const generationProgress = reactive({ active: false, panelId: "", phase: "", elapsedSeconds: 0, model: "" });
  let generationTimer: ReturnType<typeof setInterval> | undefined;
  const lastError = ref("");
  const saving = ref(false);
  const savedText = ref("");
  let revision = "";
  const dirty = computed(() => Boolean(project.value && JSON.stringify(project.value) !== savedText.value));
  const episode = computed(() => project.value?.episodes.find((item) => item.id === project.value?.activeEpisodeId));
  const activeStyle = computed(() => project.value?.styles.find((item) => item.id === project.value?.activeStyleId));
  const imageUrls = reactive<Record<string, string>>({});
  const previewUrls = ref<string[]>([]);
  const previewMessage = ref("");
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let previewVersion = 0;
  const textModels = ref<Model[]>([]);
  const imageModels = ref<Model[]>([]);
  const textModel = ref("");
  const imageModel = ref("");
  const zImageQuality = ref(z.enum(["draft", "standard", "detail"]).catch("standard").parse(appSettings.value.comicZImageQuality));
  watch(zImageQuality, (value) => { appSettings.value.comicZImageQuality = value; });
  const zImageReferenceMode = ref(z.enum(["text", "reference"]).catch("text").parse(appSettings.value.comicZImageReferenceMode));
  const referenceAnalysisMode = ref(z.enum(["selected", "codex"]).catch("selected").parse(appSettings.value.comicReferenceAnalysisMode));
  watch(referenceAnalysisMode, (value) => { appSettings.value.comicReferenceAnalysisMode = value; });
  watch(zImageReferenceMode, (value) => { appSettings.value.comicZImageReferenceMode = value; });
  const textMode = ref<"codex" | "api">("codex");
  const codexModel = ref("gpt-6.1-sol");
  const textEffort = ref<"low" | "medium" | "high" | "xhigh">("medium");
  const studioTheme = ref<"paper" | "night">("paper");
  const studioAccent = ref<"forest" | "blue" | "coral">("forest");
  const studioDensity = ref<"standard" | "large">("standard");
  const preferenceSchema = z.object({ textEffort: z.enum(["low", "medium", "high", "xhigh"]).default("medium"), textMode: z.enum(["codex", "api"]), codexModel: z.string().max(101), textModel: z.string().max(800), imageModel: z.string().max(800), theme: z.enum(["paper", "night"]), accent: z.enum(["forest", "blue", "coral"]), density: z.enum(["standard", "large"]) });
  const restored = preferenceSchema.safeParse(appSettings.value.comicStudio);
  if (restored.success) {
    textMode.value = restored.data.textMode;
    codexModel.value = restored.data.codexModel;
    textEffort.value = restored.data.textEffort;
    textModel.value = restored.data.textModel;
    imageModel.value = restored.data.imageModel;
    studioTheme.value = restored.data.theme;
    studioAccent.value = restored.data.accent;
    studioDensity.value = restored.data.density;
  }
  if (!appSettings.value.ui) appSettings.value.ui = { theme: studioTheme.value === "night" ? "dark" : "light", primaryColor: { forest: "#315e44", blue: "#326b92", coral: "#a75237" }[studioAccent.value], fontScale: studioDensity.value === "large" ? 115 : 100 };
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)");
  function synchronizeAppearance() { studioTheme.value = (uiSettings.value.theme === "system" ? preferredDark.matches : uiSettings.value.theme === "dark") ? "night" : "paper"; studioDensity.value = uiSettings.value.fontScale >= 110 ? "large" : "standard"; }
  watch(uiSettings, synchronizeAppearance, { immediate: true });
  preferredDark.addEventListener("change", synchronizeAppearance);
  onBeforeUnmount(() => preferredDark.removeEventListener("change", synchronizeAppearance));
  watch([textEffort, textMode, codexModel, textModel, imageModel, studioTheme, studioAccent, studioDensity], () => {
    appSettings.value.comicStudio = { textEffort: textEffort.value, textMode: textMode.value, codexModel: codexModel.value, textModel: textModel.value, imageModel: imageModel.value, theme: studioTheme.value, accent: studioAccent.value, density: studioDensity.value };
  });
  const collectionSettings = reactive({ automatic: (appSettings.value.comicCollection as { automatic?: boolean } | undefined)?.automatic !== false, intervalMinutes: (appSettings.value.comicCollection as { intervalMinutes?: number } | undefined)?.intervalMinutes || 30 });
  watch(collectionSettings, () => { appSettings.value.comicCollection = { ...collectionSettings }; });
  const analysisStatus = ref("");
  const source = ref("douyin");
  const topicCategory = ref("all");
  const topicKeyword = ref("");
  const searchKeyword = ref("科普");
  const loginImage = ref("");
  const loginMessage = ref("");
  const connectionsVisible = ref(false);
  const loginBusy = ref(false);
  const xhsConnected = ref(false);
  const xhsAvailable = ref(false);
  const loginExpiresAt = ref(0);
  const loginSeconds = ref(0);
  let loginPoll: ReturnType<typeof setTimeout> | undefined;
  let loginTimer: ReturnType<typeof setTimeout> | undefined;
  const sourceMessage = ref("");
  const visibleTopics = computed(() =>
    (project.value?.topics || []).filter((item) => {
      const content = item.title + " " + item.summary;
      const matches =
        topicCategory.value === "all" ||
        (topicCategory.value === "science"
          ? /科普|科学|科技|天文|宇宙|航天|卫星|月球|地球|物理|化学|生物|量子|芯片|机器人|人工智能|AI|台风|暴雨|气象|天气|地震|实验|原理|为什么|流星|极光|海洋|生态|能源/i.test(
              content,
            )
          : /娱乐|明星|演员|歌手|音乐|电影|电视剧|综艺|演唱会|票房|新剧|热播|首映|定档|大结局|喜剧|舞台|动漫|动画|挑战|游戏|电竞|跳舞|出道|角色/.test(
              content,
            ));
      return matches && (!topicKeyword.value.trim() || content.includes(topicKeyword.value.trim()));
    }),
  );
  const fetchedAt = ref("");
  const approvedCount = computed(() => episode.value?.panels.filter((panel) => isApproved(episode.value!, panel)).length ?? 0);
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  watch(
    () => JSON.stringify({ stage: stage.value, id: episode.value?.id, mode: episode.value?.productionMode, pages: episode.value?.directPages, layout: episode.value?.layout, panels: episode.value?.panels.map((panel) => [panel.image, panel.dialogue, panel.caption, panel.bubbleX, panel.bubbleY, panel.speech]) }),
    () => {
      clearTimeout(previewTimer);
      previewVersion++;
      previewUrls.value.forEach(URL.revokeObjectURL);
      previewUrls.value = [];
      previewMessage.value = "";
      if (![5, 6].includes(stage.value) || !episode.value?.panels.length) return;
      previewTimer = setTimeout(() => {
        void preview().catch((error) => { previewMessage.value = error instanceof Error ? error.message : "排版预览失败"; });
      }, 400);
    },
  );

  function clearUrls() {
    Object.values(imageUrls).forEach(URL.revokeObjectURL);
    Object.keys(imageUrls).forEach((key) => delete imageUrls[key]);
    previewUrls.value.forEach(URL.revokeObjectURL);
    previewUrls.value = [];
  }

  async function ensureImage(path: string) {
    if (!path || imageUrls[path]) return;
    const targetDirectory = directory.value;
    const bytes = await useWorkspaceFiles(targetDirectory).read(path);
    if (directory.value === targetDirectory) imageUrls[path] = URL.createObjectURL(new Blob([bytes]));
  }

  async function hydrateImages() {
    if (!project.value) return;
    const paths = new Set(
      [
        ...project.value.assets.map((item) => item.path),
        ...project.value.styleDraft.refs.map((item) => item.path),
        ...project.value.styles.flatMap((style) => style.refs.map((item) => item.path)),
        ...project.value.characters.flatMap((item) => [item.image, ...item.designImages.map((design) => design.path), ...item.refs.map((ref) => ref.path)]),
        ...project.value.episodes.flatMap((item) => [
          ...item.castSnapshot.flatMap((character) => [character.image, ...character.designImages.map((design) => design.path), ...character.refs.map((ref) => ref.path)]),
          ...[...item.panels, ...item.directPages].flatMap((panel) => [panel.image, ...panel.history]),
        ]),
      ].filter(Boolean),
    );
    await Promise.all([...paths].map(ensureImage));
  }

  async function run(label: string, action: () => Promise<unknown>) {
    if (busy.value || saving.value) return;
    busy.value = label;
    lastError.value = "";
    try {
      await action();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : "操作失败";
      lastError.value = message;
      ElMessage.error(message);
    } finally {
      clearInterval(generationTimer);
      generationProgress.active = false;
      generationProgress.panelId = "";
      busy.value = "";
    }
  }

  async function save() {
    if (!project.value || saving.value) throw new Error("请等待当前保存完成");
    const currentProject = project.value;
    const parsed = projectSchema.parse(currentProject);
    const before = savedText.value ? projectSchema.parse(JSON.parse(savedText.value)) : null;
    const { journal: _afterJournal, ...afterState } = parsed;
    const { journal: _beforeJournal, ...beforeState } = before || parsed;
    const sections = Object.keys(afterState).filter((key) => JSON.stringify(afterState[key as keyof typeof afterState]) !== JSON.stringify(beforeState[key as keyof typeof beforeState]));
    const currentDirectory = directory.value;
    const boundFiles = useWorkspaceFiles(currentDirectory);
    saving.value = true;
    try {
      let entry: ComicProject["journal"][number] | undefined;
      if (sections.length || !parsed.journal.length) {
        const entryId = crypto.randomUUID().replaceAll("-", "");
        entry = { id: entryId, at: new Date().toISOString(), action: busy.value || "保存修改", reason: changeReason.value.trim(), sections: sections.length ? sections : ["baseline"], path: `revision${entryId}.json` };
        await boundFiles.writeJson(entry.path, { ...entry, before: beforeState, after: afterState }, true);
        parsed.journal.push(entry);
      }
      revision = await boundFiles.writeTextSnapshot("comicProject.json", JSON.stringify(parsed, null, 2), { revision, encoding: "utf-8" });
      if (entry) currentProject.journal.push(entry);
      savedText.value = JSON.stringify(currentProject);
      changeReason.value = "";
    } finally {
      saving.value = false;
    }
  }

  async function startOriginal(direction: string, useExistingCharacters = true, characterIds?: string[]) {
    if (!project.value || !direction.trim()) throw new Error("请填写原创方向或关键词");
    const topic = projectSchema.shape.topics.element.parse({ id: crypto.randomUUID(), title: direction.slice(0, 80), url: "", summary: "原创虚构选题，不依赖热点；涉及科学结论时仍需核对出处。", source: "原创灵感", publishedAt: "", verified: true });
    const created = createEpisode(project.value, topic);
    if (!useExistingCharacters) created.castSnapshot = [];
    else if (characterIds) {
      created.castSnapshot = created.castSnapshot.filter((item) => characterIds.includes(item.id));
      if (!created.castSnapshot.length) throw new Error("请至少选择一位固定角色");
    }
    created.direction = `创作原创生活漫画，4–6格，有清晰铺垫、冲突和反转。\n${direction}\n个人兴趣：${project.value.creator.interests}\n避免：${project.value.creator.avoid}\n创作目标：${project.value.creator.goal}`.slice(0, 5000);
    project.value.episodes.unshift(created);
    project.value.activeEpisodeId = created.id;
    stage.value = 1;
    await save();
  }

  async function startFromStory(story: string, useExistingCharacters: boolean, characterIds?: string[]) {
    if (!story.trim() || story.length > 10000) throw new Error("请填写或导入10000字以内的剧情");
    await startOriginal(story.trim().split("\n")[0]!.slice(0, 80), useExistingCharacters, characterIds);
    if (!episode.value) return;
    episode.value.sourceStory = story.trim();
    episode.value.story = story.trim();
    episode.value.direction = "忠实整理我提供的剧情，保留主要事件、角色与结局，仅拆分为可画的漫画分镜。";
    await save();
  }

  async function renameSpace(title: string) {
    if (!project.value || !title.trim() || title.trim().length > 100) throw new Error("空间名称需要1–100个字");
    project.value.title = title.trim();
    await save();
    workspace.renameProject(directory.value, project.value.title);
  }

  async function archiveSpace() {
    if (!project.value) return;
    project.value.archived = true;
    await save();
    archivedProjects.value.push({ directory: directory.value, name: project.value.title });
    workspace.removeProject(directory.value);
    clearUrls();
    project.value = undefined;
    directory.value = "";
    savedText.value = "";
  }

  async function restoreSpace(path: string) {
    if (!archivedProjects.value.some((item) => item.directory === path)) throw new Error("请从已删除空间列表选择恢复");
    await openProject(path);
    if (directory.value !== path || !project.value) return;
    project.value.archived = false;
    await save();
    archivedProjects.value = archivedProjects.value.filter((item) => item.directory !== path);
  }

  const researchStatus = ref("");
  async function collectResearch(keyword: string, platforms: string[]) {
    if (!project.value || !keyword.trim()) throw new Error("请先选择空间并填写关键词");
    const targetDirectory = directory.value;
    const selected = [...new Set(platforms)].filter((item) => ["xhsLocal", "douyin", "bilibili", "tieba", "douban"].includes(item));
    if (!selected.length) throw new Error("请至少选择一个平台");
    researchStatus.value = "正在按同一关键词检索所选平台…";
    const results = await Promise.allSettled(selected.map(async (platform) => { if (["douban", "tieba"].includes(platform)) { try { return await axios.get("/api/comicStudio/forumTopics", { params: { source: platform, keyword }, headers: { "x-toonflow-workspace": "1" }, timeout: 25000 }); } catch (cause) { try { return await axios.post("/api/comicStudio/platformSession", { platform, action: "search", keyword }, { headers: { "x-toonflow-workspace": "1" }, timeout: 45000 }); } catch { throw cause; } } } return platform === "xhsLocal"
      ? axios.get("/api/comicStudio/topics", { params: { source: "xhsLocal", keyword }, headers: { "x-toonflow-workspace": "1" }, timeout: 100000 })
      : axios.post("/api/comicStudio/platformSession", { platform, action: "search", keyword }, { headers: { "x-toonflow-workspace": "1" }, timeout: 45000 }); }));
    if (directory.value !== targetDirectory) throw new Error("创作空间已切换，本次素材没有写入其他空间");
    const materials: Topic[] = [];
    const statuses = results.map((result, index) => {
      const platform = { xhsLocal: "小红书", douyin: "抖音", bilibili: "B站", tieba: "弱智吧", douban: "豆瓣" }[selected[index]!] || selected[index]!;
      if (result.status === "rejected") return { platform, message: axios.isAxiosError(result.reason) ? String(result.reason.response?.data?.message || "连接失败，请重试").slice(0, 500) : "连接失败" };
      const rows = projectSchema.shape.topics.parse((result.value.data.data.items || []).slice(0, 20).map((item: unknown) => ({ ...(item as object), id: crypto.randomUUID(), verified: false })));
      materials.push(...rows);
      return { platform, message: `${rows.length}条标题与来源${["douban", "tieba"].includes(selected[index]!) ? "（公开来源检索）" : ""}；正文需逐条读取或人工核对` };
    });
    researchStatus.value = statuses.map((item) => `${item.platform}：${item.message}`).join("；");
    if (!materials.length) throw new Error(researchStatus.value);
    project.value.researchPacks.unshift({ id: crypto.randomUUID(), keyword: keyword.slice(0, 80), createdAt: new Date().toISOString(), materials, statuses, notes: "" });
    project.value.researchPacks = project.value.researchPacks.slice(0, 100);
    project.value.topics = [...materials, ...project.value.topics.filter((old) => !materials.some((item) => item.url === old.url))].slice(0, 1000);
    await save();
  }

  async function readResearchSource(packId: string, topicId: string) {
    const directorySnapshot = directory.value;
    const material = project.value?.researchPacks.find((item) => item.id === packId)?.materials.find((item) => item.id === topicId);
    if (!material) throw new Error("素材已不存在");
    const { data } = await axios.post("/api/comicStudio/sourceText", { url: material.url }, { headers: { "x-toonflow-workspace": "1" }, timeout: 100000 });
    if (directorySnapshot !== directory.value) throw new Error("空间已切换，正文未写入");
    material.summary = `【笔记文字正文，非视频字幕；采集于${data.data.collectedAt}】\n${data.data.text}\n${data.data.limitation}`.slice(0, 20000);
    await save();
    researchStatus.value = "已读取笔记文字正文；生成原创脚本时会带入所选素材包。";
  }

  async function startNextEpisode(direction: string) {
    const previous = episode.value;
    if (!project.value || !previous?.story.trim()) throw new Error("请先完成当前集的故事正文，再续写下一集");
    if (!direction.trim()) throw new Error("请填写下一集的目标或冲突");
    if (project.value.episodes.some((item) => item.parentEpisodeId === previous.id) && !window.confirm("该集已有后续作品。继续将从同一前集创建支线，是否继续？")) return;
    const topic = projectSchema.shape.topics.element.parse({ id: crypto.randomUUID(), title: `第${previous.episodeNumber + 1}集 · ${direction.slice(0, 60)}`, url: "", summary: "原创连续集，承接前集人物与世界设定；科学结论仍需核对。", source: "原创连载", publishedAt: "", verified: true });
    const created = createEpisode(project.value, topic);
    created.parentEpisodeId = previous.id;
    created.continuityImage = previous.panels.at(-1)?.image || "";
    created.episodeNumber = previous.episodeNumber + 1;
    created.castSnapshot = clone(previous.castSnapshot);
    created.styleSnapshot = clone(previous.styleSnapshot);
    created.layout = clone(previous.layout);
    created.direction = `续写第${created.episodeNumber}集；本集目标：${direction}`;
    project.value.episodes.unshift(created);
    project.value.activeEpisodeId = created.id;
    await save(); stage.value = 1;
  }

  async function useResearchPack(packId: string) {
    const pack = project.value?.researchPacks.find((item) => item.id === packId);
    if (!project.value || !pack) throw new Error("未找到专题素材包");
    const topic = projectSchema.shape.topics.element.parse({ id: crypto.randomUUID(), title: pack.keyword, url: "", summary: "多平台线索改编为原创虚构故事；素材未经逐项核实，不据此陈述新闻或科学事实。", source: "专题原创", publishedAt: "", verified: true });
    const created = createEpisode(project.value, topic);
    created.researchPackId = pack.id;
    created.direction = `围绕“${pack.keyword}”创作原创4–6格漫画。参考素材只用于理解话题和剧情结构，不复刻原作者台词或完整情节；事实内容须另行核对。`;
    project.value.episodes.unshift(created); project.value.activeEpisodeId = created.id;
    await save(); stage.value = 1;
  }

  async function analyzeFeedback(platform: string, window: string) {
    if (!project.value) return;
    const targetDirectory = directory.value;
    const currentProject = project.value;
    const records = keywordInsights(currentProject, platform, window).records.filter((record) => currentProject.publications.find((item) => item.id === record.publicationId)?.scope !== "reference").sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, 50);
    if (!records.length) throw new Error("所选平台和窗口尚无真实反馈，请先录入");
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    const { data } = await axios.post("/api/comicStudio/analyze", {
      mode: textMode.value, codexModel: textMode.value === "codex" ? codexModel.value : undefined, providerId: selected?.providerId, modelId: selected?.modelId,
      platform, window, interests: currentProject.creator.interests, avoid: currentProject.creator.avoid,
      records: records.map((record) => { const work = currentProject.episodes.find((item) => item.id === record.episodeId); return { id: record.id, title: work?.title || "历史作品", story: work?.story.slice(0, 3000) || "", keywords: record.keywords, views: record.views, note: record.note }; }),
    }, { headers: { "x-toonflow-workspace": "1" }, timeout: 260000 });
    const result = insightSchema.parse(data.data);
    const known = new Set(records.map((item) => item.id));
    if (result.keywords.some((item) => item.evidenceIds.some((id) => !known.has(id)))) throw new Error("分析结果引用了未知记录");
    if (directory.value !== targetDirectory) return;
    currentProject.insightReports.push({ ...result, id: crypto.randomUUID(), at: new Date().toISOString(), platform, window, recordIds: records.map((item) => item.id) });
    await save();
  }

  async function generateStylePreview() {
    if (!project.value) return;
    const draft = project.value.styleDraft;
    if (draft.referenceIntent === "identity" && !draft.refs.length) throw new Error("保持角色需要先添加角色参考图");
    if (!draft.description.trim() && !draft.refs.length) throw new Error("请用日常语言描述想要的效果，或先添加参考图");
    const model = imageModels.value.find((item) => `${item.providerId}/${item.modelId}` === imageModel.value);
    if (!model?.configured) throw new Error("请在创作设置选择已配置的图片模型");
    const targetDirectory = directory.value;
    const intent = { redesign: "提取参考图元素与画风，重新设计原创人物和新场景，不复制原图构图或拼贴原图", identity: "保持参考角色的身份和服装，用用户要求的画风绘制一个新镜头，不复制原姿势", style: "只参考线条、配色、上色和人物比例，人物身份和场景重新设计，不照搬参考图的人物" };
    const prompt = `创作一张新的原创漫画画风样张，清楚展示人物、服装、线条、上色与背景，不要文字。参考方式：${intent[draft.referenceIntent]}。用户要求：${draft.description}。图片分析（可选，仅作补充）：${draft.referenceAnalysis}。参考特点：${draft.refs.map((item) => item.note).filter(Boolean).join("；")}。避免：${draft.avoid}`;
    const references = model.providerId === "zImage" && draft.referenceIntent !== "identity" ? [] : draft.refs.map((item) => item.path);
    const { data } = await requestImage(model, targetDirectory, prompt, references);
    if (!data.data?.[0]?.path) throw new Error("图片模型没有返回画风样张");
    if (directory.value !== targetDirectory) return;
    const path = data.data[0].path;
    project.value.assets.push({ path, method: ["zImage", "fluxKlein"].includes(model.providerId) ? "local" : model.providerId === "codex" ? "codex" : "imageApi", source: "自定义画风样张", license: "待按供应商条款确认用途", seed: data.data?.[0]?.seed, prompt, model: `${model.providerId}/${model.modelId}`, createdAt: new Date().toISOString() });
    draft.refs.push({ id: crypto.randomUUID(), path, source: "自定义 AI 生成", note: "画风样张；提示词保存在素材档案", license: "待确认供应商条款" });
    await ensureImage(path);
    await save();
  }

  async function openProject(path: string) {
    if (dirty.value && !window.confirm("当前修改尚未保存，确定切换项目吗？")) return;
    const snapshot = await useWorkspaceFiles(path).readTextSnapshot("comicProject.json");
    const data = projectSchema.parse(JSON.parse(snapshot.text));
    for (const work of data.episodes) {
      const legacy = `${work.title}\n\n本作品为原创虚构漫画，AI辅助创作。${work.topic.url ? `\n参考来源：${work.topic.url}` : work.researchPackId ? "\n参考素材已保存在项目专题素材包中。" : ""}`;
      if (work.postText === legacy) work.postText = work.title;
    }
    clearUrls();
    directory.value = path;
    revision = snapshot.revision;
    project.value = data;
    savedText.value = JSON.stringify(data);
    await workspace.openProject(path);
    workspace.renameProject(path, data.title);
    await hydrateImages();
    stage.value = 0;
    changeReason.value = "";
  }

  async function createProject(title: string) {
    if (!title.trim()) throw new Error("请填写项目名称");
    const { data } = await axios.post("/api/comicStudio/create", { title }, { headers: { "x-toonflow-workspace": "1" } });
    await openProject(data.data.directory);
  }

  let modelLoadVersion = 0;
  async function loadModels() {
    const version = ++modelLoadVersion;
    const results = await Promise.allSettled([axios.get("/api/ai/models"), axios.get("/api/ai/media/models"), axios.get("/api/providers/media/list"), axios.get("/api/comicStudio/cliStatus", { headers: { "x-toonflow-workspace": "1" }, timeout: 25000 }), axios.get("/api/comicStudio/zImageStatus", { headers: { "x-toonflow-workspace": "1" }, timeout: 8000 })]);
    if (version !== modelLoadVersion) return;
    if (results[0].status === "fulfilled") textModels.value = results[0].value.data.data;
    if (results[1].status === "fulfilled") {
      const metadata = results[2].status === "fulfilled" ? z.array(z.object({ id: z.string(), rules: z.array(z.object({ field: z.string().optional() })).optional() })).safeParse(results[2].value.data.data) : undefined;
      const configurations = appSettings.value.mediaProviderConfigs as Record<string, { apiKey?: string; workflow?: string; baseUrl?: string; modelId?: string }> | undefined;
      imageModels.value = results[1].value.data.data.filter((item: Model) => item.type === "image").map((item: Model) => {
        const provider = metadata?.success ? metadata.data.find((entry) => entry.id === item.providerId) : undefined;
        const configured = item.providerId === "imageApi" ? !!configurations?.imageApi?.apiKey?.trim() && !!configurations?.imageApi?.baseUrl?.trim() && !!configurations?.imageApi?.modelId?.trim() : item.providerId === "comfyLocal" ? !!configurations?.comfyLocal?.workflow?.trim() : !!provider && (!provider.rules?.some((rule) => rule.field === "apiKey") || !!configurations?.[item.providerId]?.apiKey?.trim());
        return { ...item, configured, label: configured ? (item.providerId === "imageApi" ? `在线API · ${configurations?.imageApi?.modelId || item.label}` : item.providerId === "comfyLocal" ? `本地 ComfyUI · ${item.label}（工作流已保存）` : item.label) : `${item.label}（未完成配置）` };
      });
    }
    const cli = results[3].status === "fulfilled" ? results[3].value.data.data : undefined;
    imageModels.value = imageModels.value.filter((item) => !["codex", "zImage", "fluxKlein"].includes(item.providerId));
    const localImage = results[4].status === "fulfilled" ? results[4].value.data.data : undefined;
    if (localImage?.installed && localImage.modelReady) imageModels.value.push({ providerId: "zImage", modelId: "turbo4bit", label: "Z-Image Turbo · 本机 MLX", type: "image", configured: true });
    if (localImage?.fluxKlein?.installed && localImage.fluxKlein.modelReady) imageModels.value.push({ providerId: "fluxKlein", modelId: "klein4bit", label: "FLUX.2 klein · 本机多角色参考", type: "image", configured: true });
    if (cli?.available && cli.loggedIn && cli.imageGeneration) imageModels.value.push({ providerId: "codex", modelId: "imagegen", label: "Codex 内置生图 · 需联网", type: "image", configured: true });

    if (imageModel.value && !imageModels.value.some((item) => `${item.providerId}/${item.modelId}` === imageModel.value)) {
      const slash = imageModel.value.indexOf("/");
      const providerId = imageModel.value.slice(0, slash);
      imageModels.value.push({ providerId, modelId: imageModel.value.slice(slash + 1), label: `${providerId === "comfyLocal" ? "ComfyUI" : imageModel.value}（此电脑未就绪，请检查配置与服务）`, configured: false, type: "image" });
    }
    if (!textModel.value && textModels.value.length) textModel.value = `${textModels.value[0]!.providerId}/${textModels.value[0]!.modelId}`;
    const firstImageModel = imageModels.value.find((item) => item.configured);
    if (!imageModel.value && firstImageModel) imageModel.value = `${firstImageModel.providerId}/${firstImageModel.modelId}`;
  }

  const refreshConfiguredModels = () => { void loadModels(); };
  window.addEventListener("toonflow:provider-config-changed", refreshConfiguredModels);
  window.addEventListener("toonflow:plugin-installed", refreshConfiguredModels);
  onBeforeUnmount(() => {
    window.removeEventListener("toonflow:provider-config-changed", refreshConfiguredModels);
    window.removeEventListener("toonflow:plugin-installed", refreshConfiguredModels);
  });

  async function discoverProjects() {
    const { data } = await axios.get("/api/workspaces/list", { headers: { "x-toonflow-workspace": "1" } });
    const listing = z.object({ absolutePath: z.string(), directories: z.array(z.object({ name: z.string() })) }).parse(data.data);
    let unreadable = 0;
    archivedProjects.value = [];
    for (const entry of listing.directories.filter((item) => /^comic[a-f0-9]{32}$/.test(item.name))) {
      const path = `${listing.absolutePath}/${entry.name}`;
      try {
        const content = await useWorkspaceFiles(path).readJson("comicProject.json");
        const record = z.object({ comicStudio: z.literal(1), title: z.string().min(1).max(100), archived: z.boolean().default(false) }).parse(content);
        if (record.archived) {
          archivedProjects.value.push({ directory: path, name: record.title });
          workspace.removeProject(path);
          continue;
        }
        if (workspace.projectList.some((item) => item.directory === path)) { workspace.renameProject(path, record.title); continue; }
        await workspace.addProject(path, record.title);
      } catch {
        unreadable++;
      }
    }
    if (unreadable) ElMessage.warning(`${unreadable} 个本机漫画项目无法读取，未加入列表；已有项目仍可打开`);
  }

  async function refreshTopics(sourceId = source.value) {
    if (!project.value) return;
    const { data } = await axios.get(["douban", "tieba"].includes(sourceId) ? "/api/comicStudio/forumTopics" : "/api/comicStudio/topics", {
      params: { source: sourceId, keyword: sourceId === "xhsLocal" ? searchKeyword.value : undefined },
      timeout: 100000,
      headers: { "x-toonflow-workspace": "1" },
    });
    let topics: Topic[];
    if (data.data.items) {
      topics = data.data.items.map((item: unknown) =>
        projectSchema.shape.topics.element.parse({ ...(item as object), id: crypto.randomUUID(), verified: false }),
      );
    } else {
      const document = new DOMParser().parseFromString(data.data.xml, "text/xml");
      if (document.querySelector("parsererror")) throw new Error("资讯源格式无法读取");
      topics = [...document.querySelectorAll("item")]
        .slice(0, 30)
        .map((item) => ({
          id: crypto.randomUUID(),
          title: (item.querySelector("title")?.textContent || "").slice(0, 1000),
          url: (item.querySelector("link")?.textContent || "").slice(0, 2000),
          source: sourceId === "ithome" ? "IT之家" : "Solidot",
          summary:
            new DOMParser().parseFromString(item.querySelector("description")?.textContent || "", "text/html").body.textContent?.slice(0, 12000) ||
            "",
          publishedAt: item.querySelector("pubDate")?.textContent || "",
          verified: false,
          collectedAt: data.data.fetchedAt,
          metric: "",
          kind: "news" as const,
          collectorUrl: data.data.url,
        }))
        .filter((item) => item.title);
    }
    if (!topics.length) throw new Error("该来源没有可读取的候选，可更换关键词或来源");
    topics = topics.map((item) => ({ ...item, id: project.value!.topics.find((old) => old.url === item.url)?.id || item.id }));
    project.value.topics = [...topics, ...project.value.topics.filter((old) => !topics.some((item) => old.url === item.url))].slice(0, 1000);
    if (["douyin", "bilibili"].includes(sourceId)) project.value.marketSnapshots.push({ id: crypto.randomUUID(), at: data.data.fetchedAt, source: sourceId, items: clone(topics).slice(0, 200) });
    fetchedAt.value = data.data.fetchedAt;
    sourceMessage.value = `本次获取 ${topics.length} 条。`;
    await save();
    return topics;
  }

  async function syncPublication(publicationId: string) {
    if (!project.value) return;
    const publication = project.value.publications.find((item) => item.id === publicationId);
    if (!publication) throw new Error("未找到登记作品");
    const targetDirectory = directory.value;
    try {
      const { data } = await axios.post("/api/comicStudio/metrics", { platform: publication.platform, url: publication.url }, { headers: { "x-toonflow-workspace": "1" }, timeout: 100000 });
      if (directory.value !== targetDirectory) return;
      const result = data.data;
      const record = feedbackSchema.parse({ id: crypto.randomUUID(), episodeId: publication.episodeId || publication.id, platform: publication.platform, publishedUrl: publication.url, publishedAt: result.publishedAt || "", observedAt: result.at, window: "cumulative", keywords: publication.keywords, views: result.views, likes: result.likes, comments: result.comments, saves: result.saves, shares: result.shares, note: `${result.source}${publication.scope === "reference" ? " · 公开参考作品，非本人业绩" : ""}`, origin: "auto", metricSource: result.source, publicationId: publication.id, approximate: result.approximate });
      project.value.feedback.push(record);
      publication.title = result.title;
      publication.lastCheckedAt = result.at;
      publication.lastError = "";
      await save();
    } catch (error) {
      publication.lastCheckedAt = new Date().toISOString();
      publication.lastError = axios.isAxiosError(error) ? error.response?.data?.message || "平台连接失败，旧数据已保留" : error instanceof Error ? error.message : "同步失败";
      await save();
      throw new Error(publication.lastError);
    }
  }

  async function collectAnalysis(automatic = false) {
    if (!project.value) return;
    if (automatic && (dirty.value || changeReason.value.trim())) { analysisStatus.value = "当前有未保存修改；保存后可继续自动采集。"; return; }
    const messages: string[] = [];
    for (const sourceId of ["douyin", "bilibili"]) {
      try { const topics = await refreshTopics(sourceId); messages.push(`${sourceId === "douyin" ? "抖音" : "B站"} ${topics?.length || 0} 条`); }
      catch (error) { messages.push(`${sourceId === "douyin" ? "抖音" : "B站"}：${error instanceof Error ? error.message : "连接失败"}`); }
    }
    for (const publication of project.value.publications.filter((item) => item.enabled)) {
      try { await syncPublication(publication.id); messages.push(`${publication.platform}作品同步成功`); }
      catch { messages.push(`${publication.platform}作品同步失败，旧值保留`); }
    }
    analysisStatus.value = `${new Date().toLocaleTimeString("zh-CN")} · ${messages.join("；")}`;
  }

  async function discoverMemes() {
    const fresh = await refreshTopics();
    if (!project.value) return;
    const candidates = (fresh || []).filter((item) => item.kind === "hotSearch" || item.kind === "search").slice(0, 80);
    if (!candidates.length) throw new Error("请选择抖音热榜或小红书来源，先获取平台候选");
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    busy.value = "分析生活与剧情梗的改编潜力…";
    const { data } = await axios.post(
      "/api/comicStudio/memes",
      {
        directory: directory.value,
        mode: textMode.value,
        providerId: selected?.providerId,
        modelId: selected?.modelId,
        codexModel: textMode.value === "codex" ? codexModel.value || undefined : undefined,
        candidates: candidates.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary.slice(0, 2000),
          source: item.source,
          metric: item.metric,
        })),
      },
      { headers: { "x-toonflow-workspace": "1" }, timeout: 260000 },
    );
    const result = z.object({ ideas: z.array(memeIdeaSchema).max(6) }).parse(data.data);
    const known = new Set(candidates.map((item) => item.id));
    if (result.ideas.some((item) => !known.has(item.topicId))) throw new Error("选梗结果引用了未知来源，当前结果未被替换");
    project.value.memeIdeas = result.ideas.map((item) => ({ ...item, createdAt: new Date().toISOString() }));
    await save();
    if (!result.ideas.length) ElMessage.info("这批候选没有合适的剧情梗，可换关键词或来源。没有强行生成推荐。");
  }

  async function selectMeme(idea: MemeIdea) {
    const topic = project.value?.topics.find((item) => item.id === idea.topicId);
    if (!topic || !project.value) throw new Error("原始线索已不在候选中，请重新收集");
    const created = createEpisode(project.value, topic);
    created.title = idea.hook.slice(0, 200);
    created.topic.summary = `原创虚构改编，仅借关键词作灵感，不代表来源原文或真实事件。\n原始线索平台：${created.topic.source}\n${created.topic.summary}`.slice(0, 20000);
    created.topic.source = "原创灵感";
    created.topic.verified = true;
    created.direction = `原创${idea.theme}漫画。以下均为原创改编方案，不是原梗剧情复述。\n开场：${idea.setup}\n冲突：${idea.conflict}\n反转：${idea.twist}\n核对要求：${idea.verification}\n用原创角色演绎4–6格，保留铺垫和因果；不编造来源故事或已核实事实。`;
    project.value.episodes.unshift(created);
    project.value.activeEpisodeId = created.id;
    stage.value = 1;
    await save();
  }

  function stopLoginPolling() {
    clearTimeout(loginPoll);
    clearTimeout(loginTimer);
  }

  function scheduleLoginCheck() {
    clearTimeout(loginPoll);
    if (!connectionsVisible.value || !loginImage.value || xhsConnected.value) return;
    loginPoll = setTimeout(async () => {
      if (loginBusy.value) { scheduleLoginCheck(); return; }
      try {
        await checkXhsLogin();
      } catch {
        loginMessage.value = "暂时无法检查登录，请稍后点击检查连接。当前二维码会保留到过期。";
      }
      scheduleLoginCheck();
    }, 6000);
  }

  async function checkXhsLogin() {
    if (loginBusy.value) return;
    loginBusy.value = true;
    try {
      const { data } = await axios.get("/api/comicStudio/xhsLogin", { params: { action: "status" }, headers: { "x-toonflow-workspace": "1" }, timeout: 100000 });
      xhsAvailable.value = data.data.available;
      xhsConnected.value = data.data.loggedIn;
      if (xhsConnected.value) {
        stopLoginPolling();
        loginImage.value = "";
        loginMessage.value = "已连接。回到选题页，输入关键词即可搜索近期高赞笔记。";
      } else {
        loginMessage.value = !xhsAvailable.value
          ? "尚未启动搜索服务。点击连接会自动启动本机已安装的服务。"
          : loginImage.value ? "等待手机扫码并确认；确认后这里会自动更新。" : "服务已就绪，尚未登录。请连接并用本人小红书 App 扫码。";
      }
    } catch {
      loginMessage.value = "暂时无法检查登录，请稍后点击检查连接重试。当前二维码会保留到过期。";
    } finally {
      loginBusy.value = false;
    }
  }

  async function connectXhs() {
    if (loginBusy.value || xhsConnected.value) return;
    if (loginImage.value && Date.now() < loginExpiresAt.value) { scheduleLoginCheck(); return; }
    loginBusy.value = true;
    loginMessage.value = "正在准备本机服务和登录二维码…";
    try {
      await axios.post("/api/comicStudio/xhsStart", {}, { headers: { "x-toonflow-workspace": "1" }, timeout: 30000 });
      xhsAvailable.value = true;
      const { data } = await axios.get("/api/comicStudio/xhsLogin", { params: { action: "qrcode" }, headers: { "x-toonflow-workspace": "1" }, timeout: 100000 });
      xhsConnected.value = data.data.loggedIn;
      loginImage.value = data.data.image;
      loginExpiresAt.value = Date.now() + 240000;
      loginSeconds.value = 240;
      loginMessage.value = xhsConnected.value ? "已连接，可以开始搜索。" : "用本人小红书 App 扫码，并在手机上确认。这里会自动检查结果。";
      function updateCountdown() {
        loginSeconds.value = Math.max(0, Math.ceil((loginExpiresAt.value - Date.now()) / 1000));
        if (loginSeconds.value > 0 && loginImage.value) loginTimer = setTimeout(updateCountdown, 1000);
        else {
          stopLoginPolling();
          loginImage.value = "";
          if (!xhsConnected.value) loginMessage.value = "二维码已过期，请点击连接小红书重新获取。";
        }
      }
      stopLoginPolling();
      if (loginImage.value) { updateCountdown(); scheduleLoginCheck(); }
    } catch (error) {
      loginMessage.value = axios.isAxiosError(error) ? error.response?.data?.message || "连接失败，请检查本机服务后重试。" : "连接失败，请重试。";
    } finally {
      loginBusy.value = false;
    }
  }

  watch(source, () => { sourceMessage.value = ""; });

  watch(connectionsVisible, (visible) => {
    if (visible) {
      void checkXhsLogin().catch(() => { loginMessage.value = "暂时无法检查连接，请点击检查连接重试。"; });
      scheduleLoginCheck();
    } else clearTimeout(loginPoll);
  });

  async function selectTopic(topic: Topic) {
    if (!project.value) return;
    const created = createEpisode(project.value, topic);
    project.value.episodes.unshift(created);
    project.value.activeEpisodeId = created.id;
    stage.value = 1;
    await save();
  }

  async function putImage(file: Blob) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024)
      throw new Error("请使用不超过 15 MB 的 PNG、JPEG 或 WebP 图片");
    const bitmap = await createImageBitmap(file);
    const valid = bitmap.width * bitmap.height <= 30_000_000;
    bitmap.close();
    if (!valid) throw new Error("图片像素过多，请先缩小图片");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
    const path = `assets/${crypto.randomUUID()}.${extension}`;
    await files.value.write(path, file, true);
    await ensureImage(path);
    project.value?.assets.push({ path, method: "upload", source: "本地导入", license: "待确认", prompt: "", model: "", createdAt: new Date().toISOString() });
    return path;
  }

  async function generateStory() {
    const current = episode.value;
    if (!current) return;
    if (!current.topic.verified) throw new Error("请先核对来源，并在选题页确认事实素材");
    if (current.panels.length && !window.confirm("重新生成会替换当前脚本和分镜。旧内容将先保存为项目内的历史快照，是否继续？")) return;
    await save();
    if (current.panels.length) await files.value.writeJson(`storyBackup${Date.now()}.json`, clone(current), true);
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    const castContext = JSON.stringify(current.castSnapshot.map((item) => matchingCharacter(item, project.value?.characters || []) || item).map(({ id, name, aliases, description, personality, motivation, speechStyle }) => ({ id, name, aliases, description, personality, motivation, speechStyle })));
    if (castContext.length > 10000) throw new Error("本期角色设定超过编剧输入上限，请减少出场角色或精简设定；尚未调用模型");
    const { data } = await axios.post(
      "/api/comicStudio/plan",
      {
        directory: directory.value,
        mode: textMode.value,
        topic: JSON.stringify(current.topic),
        direction: `${current.direction}\n创作者偏好：${project.value?.creator.interests || ""}\n避免：${project.value?.creator.avoid || ""}`.slice(0, 5000),
        style: current.styleSnapshot?.description || "",
        characters: castContext,
        providerId: selected?.providerId,
        modelId: selected?.modelId,
        codexModel: textMode.value === "codex" ? codexModel.value || undefined : undefined,
        reasoningEffort: textEffort.value,
        context: JSON.stringify({
          suppliedStory: current.sourceStory ? current.story.slice(0, 10000) : undefined,
          series: project.value ? { title: project.value.series.title, bible: project.value.series.bible.slice(0, 3000), looseEnds: project.value.series.looseEnds.slice(0, 1500) } : undefined,
          previousEpisodes: (() => { const chain = []; let parent = current.parentEpisodeId; const seen = new Set<string>(); while (parent && chain.length < 5 && !seen.has(parent)) { seen.add(parent); const work = project.value?.episodes.find((item) => item.id === parent); if (!work) break; chain.unshift({ title: work.title, episodeNumber: work.episodeNumber, story: work.story.slice(0, 1200) }); parent = work.parentEpisodeId; } return chain; })(),
          research: (() => { const pack = project.value?.researchPacks.find((item) => item.id === current.researchPackId); return pack ? { keyword: pack.keyword, notes: pack.notes.slice(0, 2500), sources: [...pack.materials].sort((a, b) => Number(b.summary.includes("【笔记文字正文")) - Number(a.summary.includes("【笔记文字正文"))).slice(0, 8).map((item) => ({ title: item.title, url: item.url, summary: item.summary.slice(0, 1000), source: item.source })) } : undefined; })(),
        }).slice(0, 22000),
      },
      { headers: { "x-toonflow-workspace": "1" }, timeout: 260000 },
    );
    const plan = planSchema.parse(data.data);
    bindCast(current, project.value!.characters);
    if (new Set(plan.newCharacters.map((item) => item.id)).size !== plan.newCharacters.length) throw new Error("生成角色标识重复，当前设定已保留，请重试");
    const reused = new Map<string, Character>();
    for (const person of plan.newCharacters) {
      const match = matchingCharacter({ ...person, id: "" }, project.value!.characters);
      if (match) reused.set(person.id, match);
    }
    const plannedCast = [...new Map([...current.castSnapshot, ...reused.values()].map((item) => [item.id, item])).values()];
    plan.newCharacters = plan.newCharacters.filter((item) => !reused.has(item.id));
    plan.panels.forEach((panel) => { panel.characters = panel.characters.map((id) => reused.get(id)?.id || id); panel.performances.forEach((item) => { item.characterId = reused.get(item.characterId)?.id || item.characterId; }); });
    if (current.castSnapshot.length && plan.newCharacters.length) throw new Error("生成结果试图替换固定角色，当前设定已保留，请重试");
    const available = [...plannedCast, ...plan.newCharacters];
    const resolveRole = (value: string) => {
      if (available.some((item) => item.id === value)) return value;
      const matches = available.filter((item) => [item.name, ...("aliases" in item && typeof item.aliases === "string" ? item.aliases.split(/[,，、\n]/) : [])].some((name) => name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase()));
      if (matches.length !== 1) throw new Error(`剧本角色「${value}」未唯一匹配，原稿已保留。请补充角色别名`);
      return matches[0]!.id;
    };
    plan.panels.forEach((panel) => { panel.characters = [...new Set(panel.characters.map(resolveRole))]; panel.performances.forEach((item) => { item.characterId = resolveRole(item.characterId); }); });
    const known = new Set([...plannedCast.map((item) => item.id), ...plan.newCharacters.map((item) => item.id)]);
    if (plan.panels.some((panel) => panel.characters.some((character) => !known.has(character))))
      throw new Error("生成结果引用了未定义角色，当前脚本未被替换，请重试");
    if (plan.panels.some((panel) => panel.characters.some((id) => !panel.performances.some((item) => item.characterId === id && item.emotion.trim() && item.expression.trim() && item.pose.trim())))) throw new Error("模型遗漏了出场人物的表情或动作，原稿已保留，请重试或更换编剧模型");
    if (plan.panels.some((panel) => panel.performances.some((item) => !panel.characters.includes(item.characterId)))) throw new Error("表演设定引用了未出场角色，原稿已保留");
    const characterIds = new Map(plan.newCharacters.map((item) => [item.id, crypto.randomUUID()]));
    const newCharacters = plan.newCharacters.map((item) => characterSchema.parse({ ...item, id: characterIds.get(item.id)!, image: "" }));
    if (newCharacters.length) {
      project.value!.characters.push(...newCharacters);

      plan.panels.forEach((panel) => { panel.characters = panel.characters.map((id) => characterIds.get(id) || id); panel.performances.forEach((item) => { item.characterId = characterIds.get(item.characterId) || item.characterId; }); });
    }
    current.castSnapshot = clone([...plannedCast, ...newCharacters]);
    current.title = plan.title;
    current.story = plan.story;
    current.panels = plan.panels.map((panel) => { const created = { ...newPanel(), ...panel }; created.speech = splitDialogue(created, current.castSnapshot);
      for (const acting of created.performances) {
        if (!created.characters.includes(acting.characterId)) throw new Error("表演设定引用了本格未出场角色，请重试");
        if (acting.thought.trim() && created.speech.length < 6) created.speech.push({ id: crypto.randomUUID(), speakerId: acting.characterId, text: acting.thought, kind: "thought", shape: "cloud", tone: "light", x: .04, y: .55, width: .45, tail: "none" });
      }
      return created; });
    if (!current.postText.trim()) current.postText = plan.title;
    await save();
    stage.value = 2;
  }

  async function bindSettings() {
    if (!episode.value || !project.value) return;
    episode.value.styleSnapshot = activeStyle.value ? clone(activeStyle.value) : null;
    bindCast(episode.value, project.value.characters);
    if (!episode.value.castSnapshot.length) episode.value.castSnapshot = clone(project.value.characters);
    await save();
    if (!episode.value.story) stage.value = 1;
  }

  async function publishStyle(draft: { name: string; description: string; avoid: string; refs: ArtStyle["refs"]; referenceAnalysis?: string }) {
    if (!project.value) return;
    if (!draft.name.trim() || (!draft.description.trim() && !draft.refs.length)) throw new Error("请填写风格名称，并添加参考图或描述想要的效果");
    const style = { ...clone(draft), description: [draft.description, draft.referenceAnalysis].filter(Boolean).join("\n"), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    project.value.styles.push(style);
    project.value.activeStyleId = style.id;
    Object.assign(project.value.styleDraft, { name: "", description: "", avoid: "", refs: [], referenceAnalysis: "", analysisFingerprint: "", referenceIntent: "style" });
    await save();
  }

  async function adoptImage(panel: Panel, file: Blob | string, fingerprint = episode.value ? imageInput(episode.value, panel) : "", compareFirst = false) {
    const path = typeof file === "string" ? assetRecordSchema.shape.path.parse(file) : await putImage(file);
    if (typeof file === "string") {
      await ensureImage(path);
      if (project.value && !project.value.assets.some((item) => item.path === path)) project.value.assets.push({ path, method: "unknown", source: "图片服务输出", license: "待确认", prompt: "", model: "", createdAt: new Date().toISOString() });
    }
    if (panel.image && !panel.history.includes(panel.image)) panel.history.push(panel.image);
    panel.history.push(path);
    if (compareFirst && panel.image) panel.candidate = { path, fingerprint };
    else {
      panel.image = path;
      panel.generationFingerprint = fingerprint;
      panel.approvalFingerprint = "";
      panel.candidate = null;
    }
    await save();
    return path;
  }

  async function resolveCandidate(panel: Panel, accept: boolean) {
    if (!panel.candidate || !episode.value) return;
    if (accept) {
      if (panel.candidate.fingerprint !== imageInput(episode.value, panel)) throw new Error("候选生成后设定又有变化，请先检查修改内容；旧版仍保留");
      panel.image = panel.candidate.path;
      panel.generationFingerprint = panel.candidate.fingerprint;
      panel.approvalFingerprint = "";
    }
    panel.candidate = null;
    await save();
  }

  async function generateCharacter(character: Character) {
    if (!project.value) return;
    if (character.referenceIntent === "identity" && !character.refs.length && !character.image) throw new Error("保持角色需要先选择参考图或已有正式角色图");
    if (!character.name.trim() || (!character.description.trim() && !character.refs.length && !character.image)) throw new Error("请填写角色名称，再用一句话描述或添加角色参考图");
    const style = activeStyle.value || { description: "原创清晰的漫画角色画风", avoid: "", refs: [] };
    const model = imageModels.value.find((item) => `${item.providerId}/${item.modelId}` === imageModel.value);
    if (!model) throw new Error("请在创作设置中配置图片 API，或导出角色提示词交给 Codex 生成后导入");
    const targetDirectory = directory.value;
    const references = model.providerId === "zImage" ? [] : character.referenceIntent === "identity" ? [character.image || character.refs[0]?.path].filter((path): path is string => !!path) : [...new Set([...character.refs.map((item) => item.path), ...style.refs.map((item) => item.path)])];
    const { data } = await requestImage(model, targetDirectory, characterPrompt(character, style, ["zImage", "fluxKlein"].includes(model.providerId)), references);
    const path = data.data?.[0]?.path;
    if (data.code !== 200 || !path) throw new Error(data.message || "图片服务没有返回角色图");
    if (directory.value !== targetDirectory) return;
    character.designImages.push({ path, view: character.designView });
    if (!character.image) character.image = path;
    project.value?.assets.push({ path, method: ["zImage", "fluxKlein"].includes(model.providerId) ? "local" : model.providerId === "codex" ? "codex" : "imageApi", source: "软件角色生成", license: "待按供应商条款确认用途", seed: data.data?.[0]?.seed, prompt: characterPrompt(character, style, ["zImage", "fluxKlein"].includes(model.providerId)), model: `${model.providerId}/${model.modelId}`, createdAt: new Date().toISOString() });
    await ensureImage(path);
    await save();
  }

  async function exportCharacter(character: Character) {
    const style = activeStyle.value || { description: "原创清晰的漫画角色画风", avoid: "", refs: [] };
    if (!character.description.trim() && !character.refs.length && !character.image) throw new Error("请添加参考图或描述角色外形");
    const taskFiles = useWorkspaceFiles(directory.value);
    const archive: Record<string, Uint8Array> = { "characterPrompt.txt": strToU8(characterPrompt(character, style)), "character.json": strToU8(JSON.stringify(character, null, 2)), "readme.txt": strToU8("在 Codex 中使用 characterPrompt.txt 与参考图生成角色设定图，然后在角色卡导入。生成后导入角色卡；更新已有角色后，请为需要更新的作品重新绑定设定。") };
    for (const reference of [...style.refs, ...character.refs]) archive[reference.path] = new Uint8Array(await taskFiles.read(reference.path));
    if (character.image && !archive[character.image]) archive[character.image] = new Uint8Array(await taskFiles.read(character.image));
    const blob = new Blob([zipSync(archive)]);
    const output = `comicCharacter${Date.now()}.zip`;
    await save();
    await taskFiles.write(output, blob, true);
    await saveFile(blob, output);
    ElMessage.success("角色包已导出，并保存在项目目录");
  }

  async function analyzeReferences(target: Character | ComicProject["styleDraft"], purpose: "character" | "style") {
    if (!target.refs.length || target.refs.length > 4) throw new Error("一次请选择1–4张参考图分析");
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    const targetDirectory = directory.value;
    const paths = target.refs.map((item) => item.path);
    const mode = referenceAnalysisMode.value === "codex" ? "codex" : textMode.value;
    const { data } = await axios.post("/api/comicStudio/referenceAnalysis", { directory: targetDirectory, mode, providerId: mode === "api" ? selected?.providerId : undefined, modelId: mode === "api" ? selected?.modelId : undefined, codexModel: codexModel.value || undefined, purpose, intent: target.referenceIntent, request: `${target.description}\n${"personality" in target ? `性格：${target.personality}；动机：${target.motivation}；画风：${target.artDirection}；输出视图：${target.designView}` : ""}\n全篇画风：${activeStyle.value?.description || ""}\n${target.refs.map((item) => item.note).join("\n")}`.slice(0, 5000), paths }, { headers: { "x-toonflow-workspace": "1" }, timeout: 260000 });
    const result = z.object({ analysis: z.string().min(1).max(3000), visualSummary: z.string().max(1000).optional() }).parse(data.data);
    if (directory.value !== targetDirectory || JSON.stringify(paths) !== JSON.stringify(target.refs.map((item) => item.path))) return;
    target.referenceAnalysis = result.analysis;
    if ("visualSummary" in target && result.visualSummary) target.visualSummary = result.visualSummary;
    target.analysisFingerprint = JSON.stringify(paths);
    await save();
  }

  async function requestImage(model: Model, targetDirectory: string, prompt: string, references: string[]) {
    if (model.providerId === "fluxKlein" && references.length > 4) throw new Error("本地 FLUX.2 klein 最多4张参考图，请减少本页人物或改用支持更多参考图的服务");
    if (references.length > 12) throw new Error("一次最多12张参考图，请减少角色、画风参考或更换工作流");
    if (model.providerId === "zImage" && references.length > 1) throw new Error("本机 Z-Image 只能使用一张参考图。请保留一张参考，或切换支持多参考图的生图服务");
    Object.assign(generationProgress, { active: true, phase: "等待模型生成", elapsedSeconds: 0, model: model.label });
    clearInterval(generationTimer);
    const started = Date.now();
    generationTimer = setInterval(() => { generationProgress.elapsedSeconds = Math.floor((Date.now() - started) / 1000); }, 1000);
    const local = ["zImage", "fluxKlein"].includes(model.providerId);
    const endpoint = local ? "/api/comicStudio/zImage" : model.providerId === "codex" ? "/api/comicStudio/image" : "/api/ai/media/generate";
    const payload = {
      directory: targetDirectory,
      mediaType: "image",
      providerId: model.providerId,
      modelId: model.modelId,
      prompt,
      ratio: "3:4",
      outputDirectory: "assets",
      images: references.map((path) => ({ path, mimeType: path.endsWith(".jpg") ? "image/jpeg" : path.endsWith(".webp") ? "image/webp" : "image/png" })),
      ...(local ? { quality: zImageQuality.value } : {}),
      ...(model.providerId === "codex" ? { codexModel: codexModel.value } : {}),
    };
    const response = await axios.post(endpoint, payload, { headers: { "x-toonflow-workspace": "1" }, timeout: local ? 920000 : model.providerId === "codex" ? 500000 : 300000 });
    generationProgress.phase = "保存图片与版本";
    return response;
  }

  function panelGenerationIssue(panel: Panel) {
    const current = episode.value;
    if (!current?.styleSnapshot) return "请先同步本期画风";
    const model = imageModels.value.find((item) => `${item.providerId}/${item.modelId}` === imageModel.value);
    if (!model?.configured) return "请先选择已配置的生图服务";
    try { current.castSnapshot.filter((item) => panel.characters.includes(item.id)).forEach((item) => matchingCharacter(item, project.value?.characters || [])); } catch (error) { return (error as Error).message; }
    if (panel.characters.some((id) => !current.castSnapshot.some((item) => item.id === id))) return "本格有未绑定角色，请到分镜设计选择角色";
    if (current.castSnapshot.length && panel.dialogue.trim() && !panel.characters.length) return "本格有台词但未分配角色，请到角色与美术的剧本人物对应表完成绑定";
    if (model.providerId === "fluxKlein") {
      try { identityPanelInput(current, panel); } catch (error) { return (error as Error).message; }
    }

    if (model.providerId === "zImage") {



      if (zImageReferenceMode.value === "reference" && !panel.image) return "旧图修订需要已有图片；首次环境出图请选择文生图";
    }
    return "";
  }

  async function generatePanel(panel: Panel) {
    const current = episode.value;
    if (!current?.styleSnapshot) throw new Error("请先为本期绑定美术风格");
    const model = imageModels.value.find((item) => `${item.providerId}/${item.modelId}` === imageModel.value);
    if (!model) throw new Error("请在模型设置中配置图片供应商，或使用 Codex 任务包后导入图片");
    const issue = panelGenerationIssue(panel);
    if (issue) throw new Error(issue);
    const targetDirectory = directory.value;
    const localReference = model.providerId === "zImage" && zImageReferenceMode.value === "reference";
    if (localReference && !panel.image) throw new Error("本地图生图需要本格已有图片；首次出图请选择‘文生图 · 本格动作优先’");
    generationProgress.panelId = panel.id;
    const fingerprint = imageInput(current, panel);
    const identityInput = model.providerId === "fluxKlein" ? identityPanelInput(current, panel) : undefined;
    const generationPrompt = identityInput?.prompt ?? imagePrompt(current, panel, model.providerId !== "zImage" || localReference, localReference, "", model.providerId === "zImage");
    const references = identityInput?.references ?? (model.providerId === "zImage" ? (localReference ? [panel.image] : []) : referencePaths(current, panel));
    const { data } = await requestImage(model, targetDirectory, generationPrompt, references);
    if (data.code !== 200 || !data.data?.[0]?.path) throw new Error(data.message || "图片服务没有返回可用图片");
    if (directory.value !== targetDirectory) return;
    const generated = data.data[0];
    const path = await adoptImage(panel, generated.path, fingerprint, true);
    const asset = project.value?.assets.find((item) => item.path === path);
    if (asset) Object.assign(asset, { method: ["zImage", "fluxKlein"].includes(model.providerId) ? "local" : model.providerId === "codex" ? "codex" : "imageApi", source: "软件分镜生成", license: "待按供应商条款确认用途", seed: generated.seed, prompt: generationPrompt, model: `${model.providerId}/${model.modelId}` });
    await save();
  }

  async function generateDirectPage(page: NonNullable<typeof episode.value>["directPages"][number]) {
    const current = episode.value;
    if (!current?.styleSnapshot) throw new Error("请先选择本篇画风");
    const model = imageModels.value.find((item) => `${item.providerId}/${item.modelId}` === imageModel.value);
    if (!model?.configured) throw new Error("请选择已配置的生图服务");
    for (const id of page.panelIds) {
      const panel = current.panels.find((item) => item.id === id);
      if (!panel) throw new Error("本页分镜已删除，请重新选择");
      if (current.castSnapshot.length && panel.dialogue.trim() && !panel.characters.length) throw new Error("请先为本页分镜绑定角色，再生成整页");
    }
    const input = directPageInput(current, page);
    const targetDirectory = directory.value;
    generationProgress.panelId = page.id;
    const { data } = await requestImage(model, targetDirectory, input.prompt, input.references);
    if (data.code !== 200 || !data.data?.[0]?.path) throw new Error(data.message || "没有返回整页图片");
    if (directory.value !== targetDirectory) return;
    const path = await adoptImage(page, data.data[0].path, input.fingerprint, true);
    const asset = project.value?.assets.find((item) => item.path === path);
    if (asset) Object.assign(asset, { method: ["zImage", "fluxKlein"].includes(model.providerId) ? "local" : model.providerId === "codex" ? "codex" : "imageApi", seed: data.data[0].seed, source: "整页漫画生成（含对白）", prompt: input.prompt, model: `${model.providerId}/${model.modelId}` });
    await save();
  }

  async function resolveDirectPage(page: NonNullable<typeof episode.value>["directPages"][number], accept: boolean) {
    if (!page.candidate || !episode.value) return;
    if (accept) {
      if (page.candidate.fingerprint !== directPageInput(episode.value, page).fingerprint) throw new Error("候选生成后台词或设定发生变化，请重新生成");
      page.image = page.candidate.path;
      page.generationFingerprint = page.candidate.fingerprint;
    }
    page.candidate = null;
    await save();
  }

  async function generateMissingPanels() {
    const current = episode.value;
    if (!current?.panels.length) throw new Error("请先完成分镜");
    const pending = current.panels.filter((panel) => !panel.image || panel.generationFingerprint !== imageInput(current, panel));
    if (!pending.length) {
      ElMessage.info("全部分格已有与当前设定匹配的图片");
      return;
    }
    for (let index = 0; index < current.panels.length; index++) {
      const panel = current.panels[index]!;
      if (panel.candidate) continue;
      if (panel.image && panel.generationFingerprint === imageInput(current, panel)) continue;
      busy.value = `连续出图 ${index + 1} / ${current.panels.length}…`;
      await generatePanel(panel);
    }
  }

  async function exportCodexTask() {
    const current = episode.value;
    if (!current?.panels.length || !current.styleSnapshot) throw new Error("请先完成分镜并绑定美术版本");
    const taskFiles = useWorkspaceFiles(directory.value);
    const archive: Record<string, Uint8Array> = {};
    const manifest = current.panels.map((panel, index) => ({
      panel: index + 1,
      panelId: panel.id,
      output: `panel${String(index + 1).padStart(2, "0")}.png`,
      prompt: imagePrompt(current, panel),
      refs: referencePaths(current, panel),
    }));
    for (const path of new Set(manifest.flatMap((item) => item.refs))) archive[path] = new Uint8Array(await taskFiles.read(path));
    archive["manifest.json"] = strToU8(
      JSON.stringify({ episodeId: current.id, title: current.title, styleId: current.styleSnapshot.id, panels: manifest }, null, 2),
    );
    archive["readme.txt"] = strToU8(
      "请用 Codex 可用的图片生成工具按 manifest.json 逐格生成漫画。先查看参考图，保持角色和风格一致，不绘制文字。请按 panel01.png 等名字保存到 images 文件夹。生成后回到工作台，在分格出图页按对应格导入；这是人工交接任务包；需要软件内连续生成时，请配置图片 API。\n",
    );
    const blob = new Blob([zipSync(archive)]);
    const output = `comicCodexTask${Date.now()}.zip`;
    await save();
    await taskFiles.write(output, blob, true);
    await saveFile(blob, output);
    ElMessage.success("分格任务包已导出，并保存在项目目录");
  }

  async function preview() {
    const current = episode.value;
    if (!current) throw new Error("请先选择作品");
    const version = ++previewVersion;
    const warnings: string[] = [];
    const pages = await renderPages(clone(current), useWorkspaceFiles(directory.value), { preview: true, warnings });
    if (version !== previewVersion) return;
    previewUrls.value.forEach(URL.revokeObjectURL);
    previewUrls.value = pages.map(URL.createObjectURL);
    previewMessage.value = [...new Set(warnings)].join("；");
  }

  async function generatePost() {
    const current = episode.value;
    if (!current?.story.trim()) throw new Error("请先完成本期故事，再生成发布文案");
    const targetDirectory = directory.value;
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    const { data } = await axios.post("/api/comicStudio/post", {
      mode: textMode.value, codexModel: codexModel.value || undefined,
      providerId: selected?.providerId, modelId: selected?.modelId,
      style: current.postStyle, title: current.title, story: current.story.slice(0, 6000),
      dialogue: current.panels.map((panel) => panel.dialogue).join("\n").slice(0, 3000),
    }, { headers: { "x-toonflow-workspace": "1" }, timeout: textMode.value === "codex" ? 180000 : 90000 });
    const result = z.object({ postText: z.string().min(1).max(1200) }).parse(data.data);
    if (directory.value !== targetDirectory) return;
    current.postCandidate = result.postText;
    await save();
  }

  async function analyzeLibrary(input: { directory: string; purpose: "character" | "style"; intent: "identity" | "redesign" | "style"; request: string; paths: string[] }) {
    const mode = input.paths.length && referenceAnalysisMode.value === "codex" ? "codex" : textMode.value;
    const selected = textModels.value.find((item) => `${item.providerId}/${item.modelId}` === textModel.value);
    if (mode === "api" && !selected) throw new Error("请在设置中选择文本模型；图片分析须使用支持识图的模型");
    const { data } = await axios.post("/api/comicStudio/referenceAnalysis", { ...input, mode, providerId: selected?.providerId, modelId: selected?.modelId, codexModel: codexModel.value || undefined }, { headers: { "x-toonflow-workspace": "1" }, timeout: 260000 });
    return data.data;
  }

  async function exportImages() {
    if (!episode.value || !productionReady(episode.value)) throw new Error("请先补齐分格图片");
    const pages = await renderPages(episode.value, files.value);
    if (pages.length === 1) await saveFile(pages[0]!, "comicPage.png");
    else {
      const archive: Record<string, Uint8Array> = {};
      for (let i = 0; i < pages.length; i++) archive[`page${i + 1}.png`] = new Uint8Array(await pages[i]!.arrayBuffer());
      await saveFile(new Blob([zipSync(archive)]), "comicPages.zip");
    }
  }

  async function exportPackage() {
    const current = episode.value;
    if (!current || !productionReady(current)) throw new Error("请先补齐分格图片，再导出");
    const taskFiles = useWorkspaceFiles(directory.value);
    const pages = await renderPages(current, taskFiles);
    const archive: Record<string, Uint8Array> = {};
    for (let index = 0; index < pages.length; index++)
      archive[`page${String(index + 1).padStart(2, "0")}.png`] = new Uint8Array(await pages[index]!.arrayBuffer());
    archive["publish.txt"] = strToU8(publicationText(current));
    archive["internalReview.txt"] = strToU8(`仅供创作者审核，不是发布正文。\n生成方式：请结合素材来源记录确认 AI 辅助情况，并按发布平台要求完成标识。\n参考来源：${current.topic.url || current.topic.source}\n风格版本：${current.styleSnapshot?.name} (${current.styleSnapshot?.id})\n参考素材包：${current.researchPackId || "无"}\n`);
    archive["readme.txt"] = strToU8(`小冷漫画发布包\n${current.productionMode === "direct" ? "整页成品按模型原始尺寸导出 PNG，不重复叠加字幕" : "成品为 1080×1440 PNG"}，按 page01、page02 顺序发布。\n${current.productionMode === "direct" ? "整页包含模型绘制或导入的对白，请核对错字和画面内容。" : `每页 ${current.layout.perPage} 格；字体 ${current.layout.fontFamily}；文字模式 ${current.layout.textMode}。文字已经绘制进 PNG，不依赖读者安装字体。`}\nepisode.json 保留故事、分镜、多角色对白、角色与美术快照。assets 为实际使用的原始图片。\n发布前请按平台要求声明 AI 辅助创作，软件未自动发布。\n`);
    archive["episode.json"] = strToU8(JSON.stringify(current, null, 2));
    const paths = new Set(
      [
        ...current.panels.flatMap((panel) => [panel.image, ...referencePaths(current, panel)]),
        ...current.directPages.map((page) => page.image),
        ...current.castSnapshot.map((character) => character.image),
      ].filter(Boolean),
    );
    archive["assetProvenance.json"] = strToU8(JSON.stringify((project.value?.assets || []).filter((item) => paths.has(item.path)), null, 2));
    for (const path of paths) archive[path] = new Uint8Array(await taskFiles.read(path));
    const blob = new Blob([zipSync(archive)]);
    const output = `comicExport${Date.now()}.zip`;
    await save();
    await taskFiles.write(output, blob, true);
    await saveFile(blob, output);
    ElMessage.success("发布包已导出，并保存在项目目录");
  }

  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", beforeUnload);
  onBeforeUnmount(() => {
    clearInterval(generationTimer);
    stopLoginPolling();
    clearTimeout(previewTimer);
    previewVersion++;
    clearUrls();
    window.removeEventListener("beforeunload", beforeUnload);
  });

  return {
    requestImage: async (...args: Parameters<typeof requestImage>) => {
      if (busy.value) throw new Error("请等待当前任务完成");
      busy.value = "生成公共库图片";
      try { return await requestImage(...args); }
      finally { clearInterval(generationTimer); generationProgress.active = false; busy.value = ""; }
    },
    referenceAnalysisMode,
    analyzeReferences,
    startFromStory,
    archivedProjects,
    renameSpace,
    archiveSpace,
    restoreSpace,
    generatePost,
    generationProgress,
    zImageReferenceMode,
    resolveCandidate,
    zImageQuality,
    collectionSettings,
    analysisStatus,
    collectAnalysis,
    syncPublication,
    changeReason,
    startOriginal,
    startNextEpisode,
    collectResearch,
    readResearchSource,
    researchStatus,
    useResearchPack,
    generateStylePreview,
    analyzeFeedback,
    workspace,
    directory,
    files,
    project,
    stage,
    busy,
    lastError,
    textEffort,
    saving,
    dirty,
    episode,
    activeStyle,
    imageUrls,
    previewUrls,
    previewMessage,
    studioTheme,
    studioAccent,
    studioDensity,
    generateCharacter,
    exportCharacter,
    textModels,
    imageModels,
    textModel,
    imageModel,
    textMode,
    codexModel,
    source,
    topicCategory,
    topicKeyword,
    searchKeyword,
    visibleTopics,
    loginImage,
    loginMessage,
    sourceMessage,
    connectionsVisible,
    loginBusy,
    xhsConnected,
    xhsAvailable,
    loginSeconds,
    checkXhsLogin,
    connectXhs,
    fetchedAt,
    approvedCount,
    run,
    save,
    openProject,
    createProject,
    loadModels,
    discoverProjects,
    refreshTopics,
    discoverMemes,
    selectMeme,
    selectTopic,
    putImage,
    generateStory,
    bindSettings,
    publishStyle,
    adoptImage,
    panelGenerationIssue,
    generatePanel,
    generateDirectPage,
    resolveDirectPage,
    generateMissingPanels,
    exportCodexTask,
    preview,
    exportPackage,
    exportImages,
    analyzeLibrary,
    ensureImage,
  };
}
