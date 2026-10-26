import { z } from "zod";

const text = z.string().max(20000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const assetPath = z.string().regex(/^assets\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/);
const referenceSchema = z.object({ id, path: assetPath, source: z.string().max(2000), note: z.string().max(2000), license: z.string().max(2000).optional() });
const styleSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  description: text,
  avoid: text,
  createdAt: z.string(),
  refs: z.array(referenceSchema).max(30),
});
export const characterSchema = z.object({ id, name: z.string().min(1).max(100), description: text, image: z.union([assetPath, z.literal("")]), refs: z.array(referenceSchema).max(12).default([]), artDirection: z.string().max(1000).default(""), designView: z.enum(["sheet", "portrait", "fullBody", "turnaround", "expressions"]).default("sheet"), referenceIntent: z.enum(["redesign", "identity", "style"]).default("redesign"), referenceAnalysis: z.string().max(3000).default(""), analysisFingerprint: z.string().max(5000).default("") });
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
  tail: z.enum(["left", "right", "none"]).default("left"),
});
const panelSchema = z.object({
  id,
  shot: text,
  action: text,
  actionSubjectId: z.string().max(100).default(""),
  actionInstruction: z.string().max(2000).default(""),
  revisionRequest: z.string().max(2000).default(""),
  candidate: z.object({ path: assetPath, fingerprint: z.string().max(1000000) }).nullable().default(null),
  dialogue: z.string().max(5000),
  caption: z.string().max(300),
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
  fontFamily: z.enum(["sans", "wenkai", "serif"]).default("sans"),
  textMode: z.enum(["overlay", "safe"]).default("overlay"),
});
const episodeSchema = z.object({
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
    actionSubjectId: "",
    actionInstruction: "",
    revisionRequest: "",
    candidate: null,
    dialogue: "",
    caption: "",
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
    panels: [],
    layout: { perPage: 4, fontSize: 30, background: "#ffffff", fontFamily: "wenkai", textMode: "overlay" },
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
    characters: panel.characters,
    style: episode.styleSnapshot,
    cast: episode.castSnapshot.filter((item) => panel.characters.includes(item.id)).map(({ refs, artDirection, designView, referenceIntent, referenceAnalysis, analysisFingerprint, ...identity }) => ({ ...identity, ...(refs.length ? { refs } : {}), ...(artDirection ? { artDirection } : {}), ...(designView !== "sheet" ? { designView } : {}) })),
    ...(previous?.image ? { previousImage: previous.image } : !previous && episode.continuityImage ? { previousImage: episode.continuityImage } : {}),
  });
}

export function reviewInput(episode: Episode, panel: Panel) {
  return stableSnapshot({
    input: imageInput(episode, panel),
    image: panel.image,
    dialogue: panel.dialogue,
    caption: panel.caption,
    bubbleX: panel.bubbleX,
    bubbleY: panel.bubbleY,
    layout: {
      perPage: episode.layout.perPage,
      fontSize: episode.layout.fontSize,
      background: episode.layout.background,
      ...(episode.layout.fontFamily !== "sans" ? { fontFamily: episode.layout.fontFamily } : {}),
      ...(episode.layout.textMode !== "overlay" ? { textMode: episode.layout.textMode } : {}),
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
  return panel.dialogue.split("\n").filter((line) => line.trim()).slice(0, 6).map((line, index) => {
    const match = line.match(/^([^：:]{1,30})[：:]\s*(.*)$/);
    const character = match ? cast.find((item) => item.name === match[1]?.trim()) : undefined;
    return { id: crypto.randomUUID(), speakerId: character?.id || "", text: character ? match![2]! : line, x: index % 2 ? 0.51 : 0.04, y: 0.04 + Math.floor(index / 2) * 0.24, width: 0.45, tail: index % 2 ? "right" : "left" };
  });
}

export function characterPrompt(character: Character, style: Pick<ArtStyle, "description" | "avoid">) {
  const views = { turnaround: "One character turnaround sheet with full-body front, side and back views of exactly the same character and outfit.", expressions: "One expression reference sheet: the same character face in six expressions (neutral, happy, surprised, worried, angry, sleepy), stable hairstyle and facial features.", sheet: "Character design sheet: full-body front view, side view and a head close-up, the SAME identity and outfit repeated across views.", portrait: "One expressive head-and-shoulders portrait, one view only.", fullBody: "One full-body standing character illustration, one view only, entire outfit and feet visible." };
  const intent = { redesign: "Extract distinctive elements AND the visual style, then design a NEW original character. For a logo, object or animal, reinterpret its colours, silhouette and motifs into the requested person or mascot. Do NOT reproduce the input image, layout, collage or original pose.", identity: "Preserve the referenced character identity and outfit; create the requested new views or pose rather than duplicating the original image.", style: "Use ONLY linework, palette, shading and proportions from the reference; invent a new identity from the user's description. Do not copy the original character or composition." };
  return `Design ONE original named character (person, animal or mascot as described), no text, no lettering, no logo. ${views[character.designView]} Plain light background. ${intent[character.referenceIntent]}\nName: ${character.name}\nUser's everyday description: ${character.description}\nReviewed visual analysis: ${character.referenceAnalysis}\nCharacter reference instructions: ${character.refs.map((item) => item.note).filter(Boolean).join("; ")}\nArt direction: ${character.artDirection || style.description}\nAvoid: ${style.avoid}\nKeep the newly designed hairstyle, face shape, outfit colours and distinctive accessories consistent across all views. Do not add unrelated characters.`;
}

export function referenceReady(target: { refs: { path: string }[]; referenceIntent: string; referenceAnalysis: string; analysisFingerprint: string }) {
  return !target.refs.length || target.referenceIntent === "identity" || !!target.referenceAnalysis.trim() && target.analysisFingerprint === JSON.stringify(target.refs.map((item) => item.path));
}

export function imagePrompt(episode: Episode, panel: Panel, useReferences = true, referenceIsCurrent = false, referenceOverride = "") {
  const cast = episode.castSnapshot.filter((item) => panel.characters.includes(item.id));
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  return [
    "Draw one original comic panel, portrait 3:4 composition. No borders, speech bubbles, text, readable signs or watermarks. Leave simple space at the top for later lettering.",
    ...(cast.length ? [`Characters in this frame: EXACTLY ${cast.length} named characters. Each identity appears once; do not duplicate or merge them.\n${cast.map((item) => `IDENTITY ${item.name}: ${item.description}`).join("\n")}`] : []),
    ...(panel.actionSubjectId ? [`PRIMARY ACTION SUBJECT: ${cast.find((item) => item.id === panel.actionSubjectId)?.name || "未在本格选择的角色"}. This subject alone performs the primary action. Never transfer this action to another person or animal.`] : []),
    `Shot: ${panel.shot}\nScene action: ${panel.action}`,
    ...(panel.actionInstruction ? [`EXPLICIT SUBJECT–ACTION–OBJECT CONTRACT (highest priority): ${panel.actionInstruction}`] : []),
    ...(panel.revisionRequest ? [`CORRECTION REQUIRED: ${panel.revisionRequest}. Keep all other named identities, costumes and intended story unchanged.`] : []),
    `Style: ${episode.styleSnapshot?.description || "Use the supplied art direction"}`,
    `Avoid: ${episode.styleSnapshot?.avoid || ""}`,
    ...(referenceOverride ? [referenceOverride] : useReferences ? [referenceIsCurrent ? "The only reference is the OLD VERSION OF THIS PANEL. Preserve its art direction and identities, but replace the incorrect action according to the current subject–action contract. Do not preserve action mistakes or duplicated characters." : "References: style images guide linework and colour; character sheets guide identity. Reference images are not the new action. Follow the current subject–action contract even when the previous frame shows a different pose."] : ["No reference image is supplied. Draw the current action from this description; do not reconstruct a preceding frame."]),
    ...(useReferences && !referenceIsCurrent && !referenceOverride && !previous && episode.continuityImage ? ["The last reference is the previous episode ending. Preserve character identity and art style, while following the new episode action and location."] : []),
    ...(useReferences && !referenceIsCurrent && !referenceOverride && previous?.image
      ? [
          "The last reference is the preceding panel. Preserve scene continuity, props, clothing and left-right relationships unless the action explicitly changes them. Draw only the new scene.",
        ]
      : []),
    ...(useReferences && !referenceIsCurrent && !referenceOverride ? [`Reference order: ${referencePaths(episode, panel).map((path, index) => { const character = cast.find((item) => item.image === path); return `${index + 1}: ${character ? `IDENTITY reference for ${character.name}; preserve face, hair, outfit and species, but render the current action` : episode.styleSnapshot?.refs.some((item) => item.path === path) ? "STYLE ONLY; use rendering, not the depicted character or composition" : "previous scene for continuity only; never copy its pose"}`; }).join("; ")}. Role identity references take priority over style and previous-frame people. Each named character appears once in the requested pose.`] : []),
  ].join("\n\n");
}

export function referencePaths(episode: Episode, panel: Panel) {
  const previous = episode.panels[episode.panels.findIndex((item) => item.id === panel.id) - 1];
  return [...new Set([
    ...episode.castSnapshot.filter((item) => panel.characters.includes(item.id) && item.image).map((item) => item.image),
    ...(episode.styleSnapshot?.refs.map((item) => item.path) ?? []),
    ...(previous?.image ? [previous.image] : !previous && episode.continuityImage ? [episode.continuityImage] : []),
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
