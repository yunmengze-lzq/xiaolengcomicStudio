import { z } from "zod";

const text = z.string().max(20000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const assetPath = z.string().regex(/^assets\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/);
const referenceSchema = z.object({ id, path: assetPath, source: z.string().max(2000), note: z.string().max(2000), license: z.string().max(2000).optional() });
export const styleSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  description: text,
  avoid: text,
  createdAt: z.string(),
  refs: z.array(referenceSchema).max(30),
});
export const characterSchema = z.object({ id, name: z.string().min(1).max(100), description: text, visualSummary: z.string().max(1000).default(""), designImages: z.array(z.object({ path: assetPath, view: z.string().max(30) })).max(100).default([]), aliases: z.string().max(500).default(""), personality: z.string().max(1500).default(""), motivation: z.string().max(1000).default(""), speechStyle: z.string().max(1000).default(""), image: z.union([assetPath, z.literal("")]), refs: z.array(referenceSchema).max(12).default([]), artDirection: z.string().max(1000).default(""), designView: z.enum(["sheet", "portrait", "fullBody", "turnaround", "expressions"]).default("sheet"), referenceIntent: z.enum(["redesign", "identity", "style"]).default("redesign"), referenceAnalysis: z.string().max(3000).default(""), analysisFingerprint: z.string().max(5000).default("") });
const topicSchema = z.object({
  id,
  title: z.string().min(1).max(1000),
  url: z.string().max(2000),
  summary: text,
  source: z.string().max(100),
  publishedAt: z.string(),
  verified: z.boolean(),
  collectedAt: z.string().default(""),
  rank: z.number().int().min(1).max(1000).optional(),
  metric: z.string().max(100).default(""),
  kind: z.enum(["news", "hotSearch", "search"]).default("news"),
  collectorUrl: z.string().max(2000).default(""),
  heat: z.number().nonnegative().optional(),
});
export const memeIdeaSchema = z.object({
  topicId: id,
  theme: z.enum(["情感关系", "生活趣事", "工作职场", "学习成长", "哲学思考", "科学好奇", "MBTI趣谈"]),
  hook: z.string().min(1).max(160),
  setup: z.string().min(1).max(300),
  conflict: z.string().min(1).max(300),
  twist: z.string().min(1).max(300),
  verification: z.string().min(1).max(400),
  createdAt: z.string().default(""),
});
export type MemeIdea = z.infer<typeof memeIdeaSchema>;
const speechSchema = z.object({
  id,
  speakerId: z.string().max(100),
  text: z.string().max(600),
  x: z.number().min(0).max(0.95),
  y: z.number().min(0).max(0.95),
  width: z.number().min(0.15).max(0.95),
  kind: z.enum(["dialogue", "thought", "narration"]).default("dialogue"),
  shape: z.enum(["oval", "cloud", "burst", "box"]).default("oval"),
  tone: z.enum(["light", "dark"]).default("light"),
  vertical: z.boolean().optional(),
  tailLength: z.number().min(.05).max(.5).optional(),
  tail: z.enum(["left", "right", "none"]).default("left"),
});
const panelSchema = z.object({
  id,
  shot: text,
  action: text,
  performances: z.array(z.object({ characterId: id, emotion: z.string().max(300), expression: z.string().max(500), pose: z.string().max(500), thought: z.string().max(600) })).max(20).default([]),
  imagePromptOverride: z.string().max(8000).default(""),
  actionSubjectId: z.string().max(100).default(""),
  actionInstruction: z.string().max(2000).default(""),
  revisionRequest: z.string().max(2000).default(""),
  candidate: z.object({ path: assetPath, fingerprint: z.string().max(1000000) }).nullable().default(null),
  dialogue: z.string().max(5000),
  caption: z.string().max(300),
  sfx: z.string().max(40).default(""),
  characters: z.array(id).max(20),
  image: z.union([assetPath, z.literal("")]),
  history: z.array(assetPath).max(200),
  generationFingerprint: z.string().max(1000000),
  approvalFingerprint: z.string().max(1000000),
  reviewNote: text,
  speech: z.array(speechSchema).max(6).default([]),
  bubbleX: z.number().min(0).max(0.8),
  bubbleY: z.number().min(0).max(0.8),
});
const layoutSchema = z.object({
  perPage: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  fontSize: z.number().int().min(20).max(60),
  background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  fontFamily: z.enum(["sans", "wenkai", "serif", "genkiGothic", "huninn", "genkiMin"]).default("sans"),
  textMode: z.enum(["overlay", "safe"]).default("overlay"),
  comicFlavor: z.boolean().default(true),
  arrangement: z.enum(["grid", "vertical", "horizontal"]).optional(),
  gutter: z.number().min(8).max(60).optional(),
});
const directPageSchema = panelSchema.extend({
  panelIds: z.array(id).max(6),
  vertical: z.boolean().default(false),
});
const episodeSchema = z.object({
  productionMode: z.enum(["panels", "direct"]).default("panels"),
  directPages: z.array(directPageSchema).max(50).default([]),
  id,
  continuityImage: z.union([assetPath, z.literal("")]).default(""),
  parentEpisodeId: z.string().max(100).default(""),
  episodeNumber: z.number().int().min(1).max(10000).default(1),
  researchPackId: z.string().max(100).default(""),
  title: z.string().min(1).max(200),
  topic: topicSchema,
  direction: text,
  story: text,
  sourceStory: text.default(""),
  styleSnapshot: styleSchema.nullable(),
  castSnapshot: z.array(characterSchema).max(30),
  roleBindings: z.record(z.string().max(100), z.string().max(100)).default({}),
  panels: z.array(panelSchema).max(50),
  layout: layoutSchema,
  postText: text,
  postStyle: z.enum(["简单有梗", "emo", "误会有梗", "温柔治愈", "轻松科普"]).default("简单有梗"),
  postCandidate: z.string().max(1200).default(""),
  includeAiDisclosure: z.boolean().default(false),
  includeReferences: z.boolean().default(false),
  publishedUrl: z.string().max(2000),
  createdAt: z.string(),
});
export const feedbackSchema = z.object({
  id, episodeId: id, platform: z.enum(["小红书", "抖音", "B站"]),
  publishedUrl: z.string().max(2000), publishedAt: z.string().max(40), observedAt: z.string().min(1).max(40),
  window: z.enum(["24h", "7d", "30d", "cumulative"]),
  origin: z.enum(["manual", "auto"]).default("manual"),
  metricSource: z.string().max(1000).default(""),
  publicationId: z.string().max(100).default(""),
  approximate: z.boolean().default(false),
  keywords: z.array(z.string().min(1).max(40)).max(20),
  views: z.number().int().nonnegative().max(1e12).nullable(), likes: z.number().int().nonnegative().max(1e12).nullable(),
  comments: z.number().int().nonnegative().max(1e12).nullable(), saves: z.number().int().nonnegative().max(1e12).nullable(),
  shares: z.number().int().nonnegative().max(1e12).nullable(), note: z.string().max(3000),
});
export const assetRecordSchema = z.object({
  platform: z.string().max(100).optional(), updatedAt: z.string().max(50).optional(), trashedAt: z.string().max(50).optional(), seed: z.number().int().nonnegative().optional(),
  path: assetPath, method: z.enum(["unknown", "upload", "imageApi", "conversation", "codex", "local"]),
  source: z.string().max(2000), license: z.string().max(2000), prompt: text,
  model: z.string().max(800), createdAt: z.string().max(50),
});
export const insightSchema = z.object({
  summary: z.string().min(1).max(2000),
  keywords: z.array(z.object({ word: z.string().min(1).max(40), reason: z.string().max(500), evidenceIds: z.array(z.string().max(100)).min(1).max(50) })).max(12),
  direction: z.string().min(1).max(3000),
});
export const projectSchema = z.object({
  archived: z.boolean().default(false),
  series: z.object({ title: z.string().max(100), bible: z.string().max(4000), looseEnds: z.string().max(3000) }).default({ title: "", bible: "", looseEnds: "" }),
  researchPacks: z.array(z.object({ id, keyword: z.string().min(1).max(80), createdAt: z.string(), materials: z.array(topicSchema).max(100), statuses: z.array(z.object({ platform: z.string().max(30), message: z.string().max(500) })).max(5), notes: z.string().max(10000) })).max(100).default([]),
  marketSnapshots: z.array(z.object({ id, at: z.string(), source: z.string().max(100), items: z.array(topicSchema).max(200) })).default([]),
  publications: z.array(z.object({ id, episodeId: z.string().max(100), title: z.string().max(1000).default(""), scope: z.enum(["own", "reference"]).default("own"), platform: z.enum(["B站", "小红书", "抖音"]), url: z.url().max(2000), keywords: z.array(z.string().max(40)).max(20), enabled: z.boolean(), lastCheckedAt: z.string(), lastError: z.string().max(1000) })).max(500).default([]),
  insightReports: z.array(insightSchema.extend({ id, at: z.string(), platform: z.string().max(20), window: z.string().max(10), recordIds: z.array(id).max(50) })).default([]),
  creator: z.object({ interests: z.string().max(2000), avoid: z.string().max(2000), goal: z.string().max(2000) }).default({ interests: "", avoid: "", goal: "" }),
  feedback: z.array(feedbackSchema).default([]),
  assets: z.array(assetRecordSchema).default([]),
  journal: z.array(z.object({ id, at: z.string(), action: z.string().max(500), reason: z.string().max(3000), sections: z.array(z.string()), path: z.string().regex(/^revision[a-zA-Z0-9]+\.json$/) })).default([]),
  comicStudio: z.literal(1),
  title: z.string().min(1).max(100),
  topics: z.array(topicSchema).max(1000),
  memeIdeas: z.array(memeIdeaSchema).max(6).default([]),
  styles: z.array(styleSchema).max(200),
  activeStyleId: z.string(),
  characters: z.array(characterSchema).max(30),
  episodes: z.array(episodeSchema).max(500),
  activeEpisodeId: z.string(),
  styleDraft: z
    .object({ name: z.string().max(100), description: text, avoid: text, refs: z.array(referenceSchema).max(30), referenceIntent: z.enum(["redesign", "identity", "style"]).default("style"), referenceAnalysis: z.string().max(3000).default(""), analysisFingerprint: z.string().max(5000).default("") })
    .default({ name: "", description: "", avoid: "", refs: [], referenceIntent: "style", referenceAnalysis: "", analysisFingerprint: "" }),
});
export type ComicProject = z.infer<typeof projectSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type ArtStyle = z.infer<typeof styleSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type Panel = z.infer<typeof panelSchema>;
export type Speech = z.infer<typeof speechSchema>;

export function newPanel(): Panel {
  return {
    id: crypto.randomUUID(),
    shot: "中景",
    action: "",
    performances: [],
    imagePromptOverride: "",
    actionSubjectId: "",
    actionInstruction: "",
    revisionRequest: "",
    candidate: null,
    dialogue: "",
    caption: "",
    sfx: "",
    characters: [],
    image: "",
    history: [],
    generationFingerprint: "",
    approvalFingerprint: "",
    reviewNote: "",
    speech: [],
    bubbleX: 0.06,
    bubbleY: 0.06,
  };
}

export function createEpisode(project: ComicProject, topic: Topic): Episode {
  const style = project.styles.find((item) => item.id === project.activeStyleId) ?? null;
  return {
    id: crypto.randomUUID(),
    productionMode: "panels",
    directPages: [],
    continuityImage: "",
    parentEpisodeId: "",
    episodeNumber: 1,
    researchPackId: "",
    title: topic.title.slice(0, 200),
    topic: JSON.parse(JSON.stringify(topic)),
    direction: "科普或娱乐。用原创角色提出疑问、解释原理或制造反转；热搜只作线索，事实必须有可靠出处。",
    story: "",
    sourceStory: "",
    styleSnapshot: style ? JSON.parse(JSON.stringify(style)) : null,
    castSnapshot: JSON.parse(JSON.stringify(project.characters)),
    roleBindings: {},
    panels: [],
    layout: { perPage: 4, fontSize: 30, background: "#ffffff", fontFamily: "wenkai", textMode: "overlay", comicFlavor: true },
    postText: "",
    postStyle: "简单有梗",
    postCandidate: "",
    includeAiDisclosure: false,
    includeReferences: false,
    publishedUrl: "",
    createdAt: new Date().toISOString(),
  };
}

export function publicationText(episode: Episode) {
  return [episode.postText.trim(), ...(episode.includeAiDisclosure ? ["本作品为原创虚构漫画，AI辅助创作。"] : []), ...(episode.includeReferences ? [`参考来源：${episode.topic.url || episode.topic.source}`] : [])].filter(Boolean).join("\n\n");
}

function stableSnapshot(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}

export function imageInput(episode: Episode, panel: Panel) {
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  return stableSnapshot({
    shot: panel.shot,
    action: panel.action,
    ...(panel.actionSubjectId || panel.actionInstruction || panel.revisionRequest ? { actionSubjectId: panel.actionSubjectId, actionInstruction: panel.actionInstruction, revisionRequest: panel.revisionRequest } : {}),
    ...(panel.performances.length ? { performances: panel.performances } : {}),
    ...(panel.imagePromptOverride ? { imagePromptOverride: panel.imagePromptOverride } : {}),
    characters: panel.characters,
    style: episode.styleSnapshot,
    cast: episode.castSnapshot.filter((item) => panel.characters.includes(item.id)).map(({ refs, artDirection, designView, referenceIntent, referenceAnalysis, analysisFingerprint, designImages, aliases, visualSummary, personality, motivation, speechStyle, ...identity }) => ({ ...identity, ...(visualSummary ? { visualSummary } : {}), ...(personality || motivation || speechStyle ? { personality, motivation, speechStyle } : {}), ...(refs.length ? { refs } : {}), ...(artDirection ? { artDirection } : {}), ...(designView !== "sheet" ? { designView } : {}) })),
    ...(previous?.image ? { previousImage: previous.image } : !previous && episode.continuityImage ? { previousImage: episode.continuityImage } : {}),
  });
}

export function reviewInput(episode: Episode, panel: Panel) {
  return stableSnapshot({
    input: imageInput(episode, panel),
    image: panel.image,
    dialogue: panel.dialogue,
    caption: panel.caption,
    sfx: panel.sfx,
    bubbleX: panel.bubbleX,
    bubbleY: panel.bubbleY,
    layout: {
      perPage: episode.layout.perPage,
      fontSize: episode.layout.fontSize,
      background: episode.layout.background,
      ...(episode.layout.fontFamily !== "sans" ? { fontFamily: episode.layout.fontFamily } : {}),
      ...(episode.layout.textMode !== "overlay" ? { textMode: episode.layout.textMode } : {}),
      ...(episode.layout.comicFlavor === false ? { comicFlavor: false } : {}),
    },
    ...(panel.speech.length ? { speech: panel.speech } : {}),
    topic: episode.topic,
  });
}

export function isApproved(episode: Episode, panel: Panel) {
  return Boolean(
    panel.image && panel.generationFingerprint === imageInput(episode, panel) && panel.approvalFingerprint === reviewInput(episode, panel),
  );
}

export function splitDialogue(panel: Panel, cast: Character[]): Speech[] {
  const other = panel.speech.filter((item) => item.kind !== "dialogue");
  const used = new Set<string>();
  const dialogue: Speech[] = panel.dialogue.split("\n").filter((line) => line.trim()).slice(0, 6 - other.length).map((line, index) => {
    const match = line.match(/^([^：:]{1,30})[：:]\s*(.*)$/);
    const matches = match ? cast.filter((item) => [item.name, ...item.aliases.split(/[,，、\n]/)].some((name) => name.trim().toLocaleLowerCase() === match[1]?.trim().toLocaleLowerCase())) : [];
    const character = matches.length === 1 ? matches[0] : undefined;
    const text = character ? match![2]! : line;
    const speakerId = character?.id || "";
    const candidates = panel.speech.filter((item) => item.kind === "dialogue" && item.speakerId === speakerId && !used.has(item.id));
    const previous = candidates.find((item) => item.text === text) || candidates[0];
    if (previous) { used.add(previous.id); return { ...previous, speakerId, text }; }
    return { id: crypto.randomUUID(), kind: "dialogue", shape: "oval", tone: "light", speakerId, text, x: index % 2 ? 0.51 : 0.04, y: 0.04 + Math.floor(index / 2) * 0.24, width: 0.45, tail: index % 2 ? "right" : "left" };
  });
  return [...dialogue, ...other];
}

export function characterVisual(character: Character) {
  if (character.visualSummary.trim()) return character.visualSummary.trim();
  const analysis = character.referenceAnalysis;
  const facts = analysis.match(/(?:保留核心识别元素|核心识别|新图应保留)[：:]([^。\n]+)/)?.[1] || analysis.match(/角色为([^。\n]+)/)?.[1];
  return facts || character.description || analysis;
}

export function characterPrompt(character: Character, style: Pick<ArtStyle, "description" | "avoid">, local = false) {
  if (local) {
    const views = { sheet: "同一个角色的正面全身、侧面和面部特写三种视角，纯色背景", turnaround: "同一个角色的正面、侧面、背面全身三视图，纯色背景", expressions: "同一张脸的六种表情：平静、开心、惊讶、担心、生气、困倦", portrait: "单个人物半身头像，仅一个视角", fullBody: "单个人物全身立绘，仅一个视角，脚部完整" };
    return `${views[character.designView]}。目标画风：${style.description.slice(0, 300)}。${characterVisual(character).slice(0, 260)}。当前设计要求：${character.description.slice(0, 140)}。性格表现：${character.personality.slice(0, 60)}。角色补充画风：${character.artDirection.slice(0, 70)}，服从全篇画风。保持每个视角的发型、脸部与服装相同，衣服和背景为干净无字表面，画面只呈现人物造型。当前输出视图优先于旧分析中的构图和姿势建议。`;
  }
  const views = { turnaround: "One character turnaround sheet with full-body front, side and back views of exactly the same character and outfit.", expressions: "One expression reference sheet: the same character face in six expressions (neutral, happy, surprised, worried, angry, sleepy), stable hairstyle and facial features.", sheet: "Character design sheet: full-body front view, side view and a head close-up, the SAME identity and outfit repeated across views.", portrait: "One expressive head-and-shoulders portrait, one view only.", fullBody: "One full-body standing character illustration, one view only, entire outfit and feet visible." };
  const intent = { redesign: "Extract distinctive elements AND the visual style, then design a NEW original character. For a logo, object or animal, reinterpret its colours, silhouette and motifs into the requested person or mascot. Do NOT reproduce the input image, layout, collage or original pose.", identity: "Preserve the referenced character identity and outfit; create the requested new views or pose rather than duplicating the original image.", style: "Use ONLY linework, palette, shading and proportions from the reference; invent a new identity from the user's description. Do not copy the original character or composition." };
  return `Design ONE original named character (person, animal or mascot as described), no text, no lettering, no logo. ${views[character.designView]} Plain light background. ${intent[character.referenceIntent]}\nName: ${character.name}\nUser's everyday description: ${character.description}\nPersonality to convey through visual attitude: ${character.personality}. Motivation: ${character.motivation}\nVisual identity: ${characterVisual(character)}\nReference analysis is source material only; current user description, selected output views, personality and art direction override any old layout/pose suggestions or IP/name commentary. Reviewed visual analysis: ${character.referenceAnalysis}\nCharacter reference instructions: ${character.refs.map((item) => item.note).filter(Boolean).join("; ")}\nGlobal art direction (takes priority over older character art notes): ${style.description}\nAdditional character art notes: ${character.artDirection}\nAvoid: ${style.avoid}\nKeep the newly designed hairstyle, face shape, outfit colours and distinctive accessories consistent across all views. Do not add unrelated characters.`;
}

export function referenceReady(target: { refs: { path: string }[]; referenceIntent: string; referenceAnalysis: string; analysisFingerprint: string }) {
  // 图像为主：参考图可以直接作为生成条件，文字分析只用于可读说明，不再作为前置门槛。
  void target;
  return true;
}

export function scriptRoleNames(episode: Episode) {
  const bindings = new Map<string, string>(Object.entries(episode.roleBindings).filter(([, id]) => id).map(([name, id]) => [id, name]));
  const speakers = new Set<string>();
  for (const panel of episode.panels) {
    const names = [...new Set(panel.dialogue.split("\n").map((line) => line.match(/^([^：:]{1,30})[：:]/)?.[1]?.trim()).filter((name): name is string => !!name))];
    names.forEach((name) => speakers.add(name));
    if (panel.characters.length === 1 && names.length === 1 && !Object.hasOwn(episode.roleBindings, names[0]!)) bindings.set(panel.characters[0]!, names[0]!);
  }
  for (const person of episode.castSnapshot) for (const name of speakers) if (!Object.hasOwn(episode.roleBindings, name) && [person.name, ...person.aliases.split(/[,，、\n]/)].some((alias) => alias.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) bindings.set(person.id, name);
  const remainingRoles = episode.castSnapshot.filter((item) => !bindings.has(item.id));
  const remainingNames = [...speakers].filter((name) => !Object.hasOwn(episode.roleBindings, name) && ![...bindings.values()].includes(name));
  // ACT: 仅唯一剩余的一对做排除匹配；多人歧义保留用户的角色ID绑定，不猜测。
  if (remainingRoles.length === 1 && remainingNames.length === 1) bindings.set(remainingRoles[0]!.id, remainingNames[0]!);
  return bindings;
}

export function imagePrompt(episode: Episode, panel: Panel, useReferences = true, referenceIsCurrent = false, referenceOverride = "", local = false) {
  const cast = episode.castSnapshot.filter((item) => panel.characters.includes(item.id));
  if (panel.imagePromptOverride.trim()) return panel.imagePromptOverride.trim();
  if (local) {
    const names = scriptRoleNames(episode);
    const roles = cast.map((person, index) => `人物${index + 1}${names.has(person.id) ? `（剧情称呼${names.get(person.id)}）` : ""}：${characterVisual(person).slice(0, cast.length > 1 ? 135 : 210)}；性格${person.personality.slice(0, 30)}`);
    const acting = panel.performances.filter((item) => panel.characters.includes(item.characterId)).map((item) => `人物${cast.findIndex((person) => person.id === item.characterId) + 1}：${item.emotion}，${item.expression}，${item.pose}`.slice(0, 125));
    return [`一张完整的漫画剧情画面，一个连续场景，${cast.length}位不同人物各出现一次。`, `目标画风：${episode.styleSnapshot?.description.slice(0, 300) || "日式动漫"}。`, `${panel.shot}。${panel.action.slice(0, 260)}`, panel.actionInstruction.slice(0, 100), ...roles, ...acting, panel.revisionRequest.slice(0, 100), "仅绘制本格动作，人物离开设定图的静态站姿；服装、背景与道具保持干净无字表面，文字和气泡由软件另外排版。"].filter(Boolean).join("\n");
  }
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  return [
    "Draw one original comic panel, portrait 3:4 composition. No borders, speech bubbles, text, readable signs or watermarks. Leave simple space at the top for later lettering.",
    ...(cast.length ? [`Characters in this frame: EXACTLY ${cast.length} named characters. Each identity appears once; do not duplicate or merge them.\n${cast.map((item) => `IDENTITY ${item.name}: ${item.description}. Personality: ${item.personality}. Motivation: ${item.motivation}. Speech manner: ${item.speechStyle}`).join("\n")}`] : []),
    ...(panel.actionSubjectId ? [`PRIMARY ACTION SUBJECT: ${cast.find((item) => item.id === panel.actionSubjectId)?.name || "未在本格选择的角色"}. This subject alone performs the primary action. Never transfer this action to another person or animal.`] : []),
    `Acting direction: convey the current story beat through specific facial muscles, gaze, body tension and gestures. Keep facial identity fixed while expressions change; avoid blank faces, identical smiles and static reference-sheet poses.`,
    `Shot: ${panel.shot}\nScene action: ${panel.action}`,
    ...(panel.actionInstruction ? [`EXPLICIT SUBJECT–ACTION–OBJECT CONTRACT (highest priority): ${panel.actionInstruction}`] : []),
    ...(panel.revisionRequest ? [`CORRECTION REQUIRED: ${panel.revisionRequest}. Keep all other named identities, costumes and intended story unchanged.`] : []),
    ...panel.performances.filter((item) => panel.characters.includes(item.characterId)).map((item) => `ACTING for ${cast.find((person) => person.id === item.characterId)?.name || item.characterId}: emotional state ${item.emotion}; VISIBLE facial expression ${item.expression}; body language / gaze / pose ${item.pose}. Internal motivation (do not write text in image): ${item.thought}. Show this emotional beat clearly through eyes, brows, mouth and posture; do not reuse a neutral reference pose.`),
    `Style: ${episode.styleSnapshot?.description || "Use the supplied art direction"}`,
    `Avoid: ${episode.styleSnapshot?.avoid || ""}`,
    ...(referenceOverride ? [referenceOverride] : useReferences ? [referenceIsCurrent ? "The only reference is the OLD VERSION OF THIS PANEL. Preserve its character identities but apply the CURRENT requested art direction, and replace the incorrect action according to the current subject–action contract. Do not preserve action mistakes or duplicated characters." : "References: style images guide linework and colour; character sheets guide identity. Reference images are not the new action. Follow the current subject–action contract even when the previous frame shows a different pose."] : ["No reference image is supplied. Draw the current action from this description; do not reconstruct a preceding frame."]),
    ...(useReferences && !referenceIsCurrent && !referenceOverride && !previous && episode.continuityImage ? ["The last reference is the previous episode ending. Preserve character identity and art style, while following the new episode action and location."] : []),
    ...(useReferences && !referenceIsCurrent && !referenceOverride && previous?.image
      ? [
          "The last reference is the preceding panel. Preserve scene continuity, props, clothing and left-right relationships unless the action explicitly changes them. Draw only the new scene.",
        ]
      : []),
    ...(useReferences && !referenceIsCurrent && !referenceOverride ? [`Reference order: ${referencePaths(episode, panel).map((path, index) => { const character = cast.find((item) => item.image === path); return `${index + 1}: ${character ? `IDENTITY reference for ${character.name}; preserve face, hair, outfit and species, but render the current action` : episode.styleSnapshot?.refs.some((item) => item.path === path) ? "STYLE ONLY; use rendering, not the depicted character or composition" : "previous scene for continuity only; never copy its pose"}`; }).join("; ")}. Role identity references take priority over style and previous-frame people. Each named character appears once in the requested pose.`] : []),
  ].join("\n\n");
}

export function identityPanelInput(episode: Episode, panel: Panel) {
  const cast = panel.characters.map((id) => episode.castSnapshot.find((person) => person.id === id));
  if (cast.some((person) => !person?.image)) throw new Error("固定角色出图需要本格每位角色的正式参考图，请先到角色与美术补齐并同步本期设定");
  const people = cast.filter((person): person is Character => !!person);
  if (people.length > 4) throw new Error("本机多参考编辑一次最多4位角色，请拆分镜头");
  const references = people.map((person) => person.image);
  if (new Set(references).size !== references.length) throw new Error("两位角色使用了同一张正式图，请分别指定各自的角色参考图");
  const styleReference = references.length < 4 ? episode.styleSnapshot?.refs.slice().reverse().find((item) => !references.includes(item.path)) : undefined;
  if (styleReference) references.push(styleReference.path);
  const styleReferenceIndex = references.length;
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  const sceneReference = (panel.image && panel.generationFingerprint === imageInput(episode, panel) ? panel.image : "") || (previous?.image && previous.generationFingerprint === imageInput(episode, previous) && previous.characters.length === panel.characters.length && previous.characters.every((id) => panel.characters.includes(id)) ? previous.image : "");
  const useSceneReference = !!sceneReference && references.length < 4 && !references.includes(sceneReference);
  if (useSceneReference) references.push(sceneReference);
  const names = scriptRoleNames(episode);
  const prompt = panel.imagePromptOverride.trim() || [
    `One continuous comic scene, exactly ${people.length} distinct characters, each appearing once. Each reference sheet depicts ONE person.`,
    `Art direction: ${episode.styleSnapshot?.description.slice(0, 360) || "anime manga"}. Keep each identity distinct.`,
    ...people.map((person, index) => `Image ${index + 1} = ${person.name.trim()}${names.has(person.id) ? ` (story name: ${names.get(person.id)})` : ""}. Visual identity: ${characterVisual(person).split(/[；;]整体/)[0]!.slice(0, 170)}.`),
    ...(styleReference ? [`Image ${styleReferenceIndex}: STYLE ONLY for linework, shading and atmosphere; never copy its people, text, panels or story.`] : []),
    "Preserve identity traits and outfit design, but re-render ALL references in the requested art direction. Reference rendering style must not override the selected art direction. Change setting, pose and expression. Never mix identities, horns, tails or outfits; never reproduce reference-sheet layouts or labels.",
    ...(useSceneReference ? [`Image ${references.length}: continuity reference ONLY for identities, clothes and props. Use the NEW shot, action and framing below; do not copy its pose, camera or background when the story changes.`] : []),
    `Shot: ${panel.shot}. Scene: ${panel.action}`,
    panel.actionInstruction ? `Action: ${panel.actionInstruction}` : "",
    ...panel.performances.filter((item) => panel.characters.includes(item.characterId)).map((item) => `${people.find((person) => person.id === item.characterId)?.name}: ${item.emotion}; ${item.expression}; ${item.pose}.`),
    panel.revisionRequest ? `Correction: ${panel.revisionRequest}` : "",
    "Expressive faces and clear gestures. Background supports the story. Leave uncluttered space for later lettering, away from faces and hands. No text, speech bubbles or watermark.",
  ].filter(Boolean).join("\n");
  return { prompt, references };
}

export function referencePaths(episode: Episode, panel: Panel) {
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  return [...new Set([
    ...episode.castSnapshot.filter((item) => panel.characters.includes(item.id) && item.image).map((item) => item.image),
    ...(episode.styleSnapshot?.refs.map((item) => item.path) ?? []),
    ...(previous?.image && previous.generationFingerprint === imageInput(episode, previous) ? [previous.image] : []),
  ])];
}

export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function matchingCharacter(person: { id: string; name: string; aliases?: string }, library: Character[]) {
  const exact = library.find((item) => item.id === person.id);
  if (exact) return exact;
  const names = (item: { name: string; aliases?: string }) => [item.name, ...(item.aliases || "").split(/[,，、\n]/)].map((name) => name.trim().toLocaleLowerCase()).filter(Boolean);
  const matches = library.filter((item) => names(item).some((name) => names(person).includes(name)));
  if (matches.length > 1) throw new Error(`角色「${person.name}」有多个同名或别名匹配，请修改角色名称后绑定`);
  return matches[0];
}

export function bindCast(episode: Episode, library: Character[]) {
  const replacements = new Map<string, string>();
  const bound = episode.castSnapshot.map((person) => {
    const target = matchingCharacter(person, library) || person;
    replacements.set(person.id, target.id);
    return JSON.parse(JSON.stringify(target)) as Character;
  });
  for (const [name, id] of Object.entries(episode.roleBindings)) episode.roleBindings[name] = replacements.get(id) || id;
  episode.castSnapshot = [...new Map(bound.map((item) => [item.id, item])).values()];
  for (const panel of episode.panels) {
    panel.characters = [...new Set(panel.characters.map((id) => replacements.get(id) || id))];
    panel.actionSubjectId = replacements.get(panel.actionSubjectId) || panel.actionSubjectId;
    panel.performances.forEach((item) => { item.characterId = replacements.get(item.characterId) || item.characterId; });
    panel.speech.forEach((item) => { item.speakerId = replacements.get(item.speakerId) || item.speakerId; });
  }
}


export function directPageInput(episode: Episode, page: Episode["directPages"][number]) {
  if (!page.panelIds.length) throw new Error("请先为本页选择分镜");
  const panels = page.panelIds.map((id) => episode.panels.find((panel) => panel.id === id));
  if (panels.some((panel) => !panel)) throw new Error("本页有已删除的分镜，请重新选择画面");
  const cast = episode.castSnapshot.filter((person) => panels.some((panel) => panel!.characters.includes(person.id)));
  const references = [...new Set([...cast.map((person) => person.image), episode.styleSnapshot?.refs.at(-1)?.path].filter((path): path is string => !!path))];
  const prompt = [
    "绘制一张完整的彩色漫画成品页，纵向3:4。不是单幅插画，不是角色设定集。将以下分镜按顺序拼成一页，阅读顺序从左至右、从上至下。画框、场景、人物、对白气泡统一设计。",
    `全篇画风：${episode.styleSnapshot?.description || "清晰动漫线稿、赛璐璐上色"}。避免：${episode.styleSnapshot?.avoid || ""}`,
    `气泡为简洁日漫细黑线白底，尖尾巴指向说话者，预留文字空间不遮挡脸。对白${page.vertical ? "竖排，每列从上往下、列从右往左" : "横排"}。只绘制指定对白、心声、旁白，不加人物标签、英文说明、水印或额外文字。准确书写中文。`,
    ...(episode.styleSnapshot?.refs.at(-1)?.path ? [`参考图${references.indexOf(episode.styleSnapshot.refs.at(-1)!.path) + 1}为画风参考，参考其线条、色彩与光影，不复制其人物。`] : []),
    ...cast.map((person) => `固定角色${person.name}：${person.visualSummary || person.description}；性格${person.personality}；说话方式${person.speechStyle}。${person.image ? `参考图${references.indexOf(person.image) + 1}绑定此角色，保持面貌服装，不混淆身份。` : ""}`),
    ...panels.map((panel, index) => `第${index + 1}格：${panel!.shot}；${panel!.action}。人物：${cast.filter((person) => panel!.characters.includes(person.id)).map((person) => person.name).join("、")}。表演：${JSON.stringify(panel!.performances)}。文字：${panel!.speech.length ? panel!.speech.map((line) => `${line.kind} / ${episode.castSnapshot.find((person) => person.id === line.speakerId)?.name || "未署名"}：${line.text}`).join("；") : panel!.dialogue}。旁白：${panel!.caption}。音效：${panel!.sfx}`),
    `本页构图与重绘要求：${page.revisionRequest || "清晰自然的连续叙事，气泡融入构图"}`,
  ].join("\n");
  return { prompt, references, fingerprint: stableSnapshot({ prompt, references }) };
}

export function productionReady(episode: Episode) {
  const images = episode.productionMode === "direct" ? episode.directPages : episode.panels;
  return images.length > 0 && images.every((item) => !!item.image);
}
