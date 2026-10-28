<template>
  <section class="artLibrary" aria-label="公共美术库">
    <header><div><h2>{{ kind === 'characters' ? '我的角色' : '我的画风' }}</h2><p>所有创作空间共用 · 保存一次，随时复用</p></div><button class="primaryButton" :disabled="working" @click="createItem">{{ kind === 'characters' ? '新建角色' : '新建画风' }}</button></header>
    <section class="selectedTray" aria-label="本篇已选资源"><strong>{{ kind === 'characters' ? `本篇已选 ${selectedItems.length} 位角色` : '本篇画风' }}</strong><p v-if="!selectedItems.length">{{ kind === 'characters' ? '尚未选择角色，请从下方选用。' : '尚未选择画风，请从下方选用。' }}</p><div class="selectedItems"><div v-for="item in selectedItems" :key="item.id"><img v-if="preview(item) || selectedUrls?.['image' in item ? item.image : item.refs.at(-1)?.path || '']" :src="preview(item) || selectedUrls?.['image' in item ? item.image : item.refs.at(-1)?.path || '']" :alt="item.name" /><span>{{ item.name }}</span><button class="textButton" :disabled="working" :aria-label="`取消选用${item.name}`" @click="perform(() => remove(kind, item.id))">× 取消</button></div></div><small>取消只移除本篇选用；公共库与已生成图片保留。</small></section>
    <div class="libraryTools"><input v-model="query" :aria-label="kind === 'characters' ? '搜索公共角色' : '搜索公共画风'" placeholder="搜索名称或描述" /><label><input v-model="showDeleted" type="checkbox" />回收站</label><button class="textButton" :disabled="working" @click="perform(load)">刷新</button></div>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" role="alert" class="libraryError">{{ error }}</p>
    <p v-if="library.warnings.length" class="libraryError">{{ library.warnings.join('；') }}</p>
    <div class="libraryCards">
      <article v-for="item in visibleItems" :key="item.id" :class="{ selectedCard: selectedItems.some((row) => row.id === item.id) }">
        <button class="libraryPreview" :aria-label="`编辑${item.name}`" :disabled="working || showDeleted" @click="editItem(item)"><img v-if="preview(item)" :src="preview(item)" :alt="`${item.name}实例图`" /><span v-else>暂无实例图 · 编辑后添加</span></button>
        <div class="libraryCardBody"><h3>{{ item.name }} <span v-if="selectedItems.some((row) => row.id === item.id)" class="selectedBadge">✓ 已选</span></h3><p>{{ 'personality' in item ? item.personality || '尚未填写性格' : item.description }}</p><small>{{ 'image' in item ? '公共角色档案' : item.refs.length ? '含参考图与画风说明' : '文字画风 · 尚无参考图' }}</small>
          <div class="libraryActions" v-if="!showDeleted"><button class="primaryButton" :disabled="working" @click="useItem(item)">{{ selectedItems.some((row) => row.id === item.id) ? '更新本篇设定' : '选用于本篇' }}</button><button class="textButton" :disabled="working" @click="editItem(item)">编辑</button><button class="textButton" :disabled="working" @click="trash(item.id)">删除</button></div>
          <button v-else class="secondaryButton" :disabled="working" @click="restore(item.id)">恢复</button>
        </div>
      </article>
    </div>
    <p v-if="!visibleItems.length && !working" class="helperText">{{ showDeleted ? '回收站为空' : query ? '没有匹配的内容' : '从新建开始，保存后的内容会出现在这里。' }}</p>
    <details v-if="kind === 'styles'" class="textPresets"><summary>文字预设 · 可选起点</summary><div><button v-for="preset in textPresets" :key="preset.id" class="textButton" @click="createStyle(preset)">{{ preset.name }}</button></div><p>仅填入描述；生成或上传实例图后，保存到“我的画风”。</p></details>
    <el-dialog v-model="editorOpen" :title="editorKind === 'characters' ? '角色档案' : '画风档案'" width="min(760px, 94vw)" :closeOnClickModal="false" :beforeClose="closeEditor">
      <div v-if="draft" class="libraryEditor">
        <section class="creationBrief"><h3>1 · 图片或一句话，开始设计</h3>
        <label>创作想法<textarea v-model="brief" rows="3" maxlength="3500" :placeholder="editorKind === 'characters' ? '例如：蓝发鲸鱼发饰的程序员女孩，热情但有点迷糊，嘴硬心软。帮我补全外形和性格。' : '例如：清爽日漫，细线条、柔和赛璐璐上色，生活感背景。'" /></label>
        <label class="secondaryButton">添加参考图片<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="working" @change="upload" /></label><p>{{ draftPaths.length ? `已添加 ${draftPaths.length} 张图片，分析使用前4张。` : '可只写一句话；上传图片后可提取外形或画风。' }}</p>
        <template v-if="editorKind === 'characters'"><label>生成角色采用的画风<select v-model="creationStyleId"><option value="">按描述 / 当前角色画风</option><option v-for="style in availableStyles" :key="style.id" :value="style.id">{{ style.name }}</option></select></label><div v-if="creationStyle" class="styleChoice"><img v-if="preview(creationStyle)" :src="preview(creationStyle)" :alt="creationStyle.name" /><p><span v-if="!preview(creationStyle)">此画风尚无预览图，可在画风档案中生成或上传。<br /></span>{{ creationStyle.description }}</p></div><label v-if="'referenceIntent' in draft">参考方式<select v-model="draft.referenceIntent"><option value="redesign">提取元素与画风，重新设计角色</option><option value="identity">保持已有角色，改变姿势或视角</option><option value="style">只参考画风，按描述设计人物</option></select></label></template>
        <details v-else><summary>从网上找画风案例</summary><label>画风关键词<input v-model="searchTerms" placeholder="如 watercolor illustration / anime / ink" /></label><button class="secondaryButton" :disabled="working || !searchTerms.trim()" @click="findExamples">搜索案例</button><p>检索 Wikimedia Commons 图片；确认后才导入分析，不代表可直接商用，原始来源随档案保留。</p><div class="exampleGrid"><article v-for="example in examples" :key="example.title"><img :src="example.thumbnail" :alt="example.title" /><p>{{ example.title }}</p><a :href="example.source" target="_blank" rel="noopener noreferrer">查看来源</a><button class="secondaryButton" :disabled="working" @click="chooseExample(example)">选中并分析画风</button></article></div><p v-if="searchMessage" role="status">{{ searchMessage }}</p></details>
        <div class="libraryActions"><button class="secondaryButton" :disabled="working" @click="analyze">分析并填写设定</button><button class="primaryButton" :disabled="working || !imageModel?.configured" @click="analyzeAndGenerate">分析并生成一张</button></div><p>{{ analysisLabel }} · {{ imageModel?.label || '尚未配置出图服务' }}。仅点击才调用；生成前先整理设定。</p></section>
        <h3>2 · 微调设定，尤其是性格和对白</h3>
        <label>名称<input v-model="draft.name" maxlength="100" /></label>
        <label>{{ editorKind === 'characters' ? '外形描述' : '画风描述 / 提示词' }}<textarea v-model="draft.description" rows="3" maxlength="20000" placeholder="用日常语言描述即可" /></label>
        <template v-if="'personality' in draft">
          <label>性格与习惯<textarea v-model="draft.personality" rows="2" maxlength="1500" /></label>
          <div class="editorColumns"><label>动机与在意的事<textarea v-model="draft.motivation" rows="2" maxlength="1000" /></label><label>对白语气<textarea v-model="draft.speechStyle" rows="2" maxlength="1000" placeholder="例如：简短、嘴硬、冷幽默" /></label></div>
          <label>剧情别名<input v-model="draft.aliases" maxlength="500" placeholder="用逗号分隔，避免多个角色使用相同别名" /></label>
          <details><summary>外形摘要与角色画风 · 可选</summary><label>固定外形摘要<textarea v-model="draft.visualSummary" rows="2" maxlength="1000" /></label><label>角色画风<textarea v-model="draft.artDirection" rows="2" maxlength="1000" /></label></details>
          <p>性格和对白语气随角色一起复用；当前作品需要点击“更新本篇设定”同步。</p>
        </template>
        <label v-else>避免的效果<input v-model="draft.avoid" maxlength="20000" /></label>
        <h3>{{ editorKind === 'characters' ? '正式形象与参考图' : '画风实例图' }}</h3>
        <p>这些图片可预览、替换或移除。图片保存在公共库，不随项目删除。</p>
        <div class="editorImages"><figure v-for="path in draftPaths" :key="path"><img :src="urls[path]" alt="档案图片" /><figcaption>{{ 'image' in draft && draft.image === path ? '正式角色图' : '参考图片' }}</figcaption><button v-if="'image' in draft && draft.image !== path" class="textButton" @click="draft.image = path">设为正式图</button><button class="textButton" @click="removeImage(path)">移除</button></figure></div>
        <label class="secondaryButton">上传图片<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="working" @change="upload" /></label>
        <details><summary>生成新图 · 使用当前图片服务</summary><p>{{ imageModel?.label || '请先在上方选择图片服务' }}</p><label v-if="'designView' in draft">输出类型<select v-model="draft.designView"><option value="fullBody">单人立绘</option><option value="turnaround">多视角设定</option><option value="expressions">表情参考</option><option value="portrait">头像</option></select></label><button class="secondaryButton" :disabled="working || !imageModel?.configured" @click="generate">{{ working ? '正在处理…' : '根据图片与描述生成一张' }}</button><p>生成后保留在编辑区，确认后保存。画风参考仅约束风格，不保证模型完全复现。</p></details>
        <p v-if="error" role="alert" class="libraryError">{{ error }}</p>
        <div class="editorFooter"><button class="secondaryButton" :disabled="working" @click="closeEditor(() => editorOpen = false)">取消</button><button class="primaryButton" :disabled="working" @click="saveDraft">保存到公共库</button></div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { z } from "zod";
import { ElMessageBox } from "element-plus";
import useWorkspaceFiles from "@/lib/workspaceFiles";
import { characterSchema, styleSchema, characterPrompt } from "./model";
import type { Character, ArtStyle } from "./model";
import { stylePresets, dailyAnimeStyle } from "./stylePresets";
import modelGirlsPack from "../../../public/characterPacks/modelGirls/manifest.json";

type Model = { providerId: string; modelId: string; label: string; configured?: boolean };
const props = defineProps<{ kind: "characters" | "styles"; imageModel?: Model; selectedItems: (Character | ArtStyle)[]; selectedUrls?: Record<string, string>; activeStyleId?: string; analysisLabel: string;
  remove: (kind: "characters" | "styles", id: string) => Promise<void>;
  analyzeDesign: (input: { directory: string; purpose: "character" | "style"; intent: "identity" | "redesign" | "style"; request: string; paths: string[] }) => Promise<any>;
  requestImage: (model: Model, directory: string, prompt: string, references: string[]) => Promise<any>; apply: (kind: "characters" | "styles", item: Character | ArtStyle, directory: string) => Promise<void> }>();
const schema = z.object({ characters: z.array(characterSchema), styles: z.array(styleSchema), deleted: z.array(z.string()).default([]), warnings: z.array(z.string()).default([]), seeded: z.boolean().default(false) });
const library = ref<z.infer<typeof schema>>({ characters: [], styles: [], deleted: [], warnings: [], seeded: false });
const directory = ref("");
const files = useWorkspaceFiles(directory);
let revision = "";
const urls = reactive<Record<string, string>>({});
const query = ref("");
const brief = ref("");
const creationStyleId = ref("");
const availableStyles = computed(() => library.value.styles.filter((item) => !library.value.deleted.includes(item.id)));
const creationStyle = computed(() => availableStyles.value.find((item) => item.id === creationStyleId.value));
const searchTerms = ref("");
const searchMessage = ref("");
type Example = { title: string; thumbnail: string; source: string };
const examples = ref<Example[]>([]);
const working = ref(false);
const showDeleted = ref(false);
const error = ref("");
const message = ref("");
const draft = ref<Character | ArtStyle>();
const editorKind = ref<"characters" | "styles">("characters");
const editorOpen = ref(false);
let initialDraft = "";
const textPresets = [dailyAnimeStyle, ...stylePresets];
const visibleItems = computed(() => library.value[props.kind].filter((item) => library.value.deleted.includes(item.id) === showDeleted.value && `${item.name} ${item.description}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
const paths = (item: Character | ArtStyle) => [...new Set([ ...("image" in item ? [item.image, ...item.designImages.map((image) => image.path)] : []), ...item.refs.map((ref) => ref.path)].filter(Boolean))];
const draftPaths = computed(() => draft.value ? paths(draft.value) : []);
const preview = (item: Character | ArtStyle) => urls["image" in item ? item.image : item.refs.at(-1)?.path || ""];
async function hydrate(item: Character | ArtStyle) { for (const path of paths(item)) if (!urls[path]) urls[path] = URL.createObjectURL(new Blob([await files.read(path)])); }
async function load() {
  if (!directory.value) directory.value = (await axios.post("/api/comicStudio/artLibrary", {}, { headers: { "x-toonflow-workspace": "1" } })).data.data.directory;
  const snapshot = await files.readTextSnapshot("library.json");
  library.value = schema.parse(JSON.parse(snapshot.text)); revision = snapshot.revision;
  if (!library.value.seeded) await seedBuiltins();
  await Promise.all([...library.value.characters, ...library.value.styles].map(hydrate));
}
async function seedBuiltins() {
  const next = structuredClone(JSON.parse(JSON.stringify(library.value))) as z.infer<typeof schema>;
  for (const character of modelGirlsPack.characters) {
    if (next.characters.some((item) => item.id === character.id)) continue;
    const source = modelGirlsPack.sources.find((item) => item.id === character.sourceId);
    if (!source || !/^[a-zA-Z0-9]+\.png$/.test(source.file)) throw new Error("内置角色清单无效");
    const response = await fetch(`/characterPacks/modelGirls/${source.file}`);
    if (!response.ok) throw new Error("内置角色图片未安装完整，请更新软件资源");
    const blob = await response.blob();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())), (value) => value.toString(16).padStart(2, "0")).join("");
    if (hash !== source.sha256) throw new Error("内置角色素材校验失败");
    const image = await putImage(blob);
    next.characters.push(characterSchema.parse({ ...character, image, referenceIntent: "identity", designView: "turnaround", referenceAnalysis: character.referenceNote, designImages: [{ path: image, view: "turnaround" }], refs: [{ id: crypto.randomUUID(), path: image, source: source.source, license: source.license, note: character.referenceNote }] }));
  }
  for (const style of modelGirlsPack.styles) {
    if (next.styles.some((item) => item.id === style.id || item.name === style.name)) continue;
    const image = next.characters.find((item) => item.id === (style.id === "modelGirlsChibi" ? "modelGirlsDeepseekChibi" : "modelGirlsDeepseekAdult"))?.image;
    next.styles.push(styleSchema.parse({ ...style, createdAt: new Date().toISOString(), refs: image ? [{ id: crypto.randomUUID(), path: image, source: "内置模型娘画风实例", note: "只参考画风，不复制人物身份", license: "沿用原素材授权" }] : [] }));
  }
  next.seeded = true;
  await persist(next);
}
async function persist(next: z.infer<typeof schema>) {
  const valid = schema.parse(next);
  revision = await files.writeTextSnapshot("library.json", JSON.stringify(valid, null, 2), { revision, encoding: "utf-8" });
  library.value = valid;
}
async function perform(action: () => Promise<void>) { if (working.value) return; working.value = true; error.value = ""; try { await action(); } catch (cause: any) { error.value = cause.response?.data?.message || cause.message || "操作失败"; } finally { working.value = false; } }
function editItem(item: Character | ArtStyle) { draft.value = structuredClone(JSON.parse(JSON.stringify(item))); editorKind.value = props.kind; brief.value = ""; examples.value = []; searchMessage.value = ""; creationStyleId.value = props.activeStyleId || ""; initialDraft = JSON.stringify(draft.value); editorOpen.value = true; }
function createItem() { editItem(props.kind === "characters" ? characterSchema.parse({ id: crypto.randomUUID(), name: "新角色", description: "", image: "", designView: "fullBody", referenceIntent: "redesign" }) : styleSchema.parse({ id: crypto.randomUUID(), name: "新画风", description: "", avoid: "", createdAt: new Date().toISOString(), refs: [] })); }
function createStyle(preset: { name: string; description: string; avoid: string }) { createItem(); if (draft.value) Object.assign(draft.value, preset, { id: crypto.randomUUID() }); }
async function closeEditor(done: () => void) { if (working.value) return; if (JSON.stringify(draft.value) !== initialDraft && !await ElMessageBox.confirm("尚未保存，放弃这次编辑？", "关闭编辑", { confirmButtonText: "放弃编辑", cancelButtonText: "继续编辑" }).then(() => true, () => false)) return; done(); }
async function saveDraft() { await perform(async () => { if (!draft.value) return; const item = editorKind.value === "characters" ? characterSchema.parse(draft.value) : styleSchema.parse(draft.value); if (!item.name.trim()) throw new Error("请填写名称"); if (editorKind.value === "styles" && !item.description.trim() && !item.refs.length) throw new Error("请填写画风描述或上传实例图"); const next = structuredClone(JSON.parse(JSON.stringify(library.value))); const index = next[editorKind.value].findIndex((row: Character | ArtStyle) => row.id === item.id); if (index < 0) next[editorKind.value].push(item); else next[editorKind.value][index] = item; await persist(next); editorOpen.value = false; message.value = `已保存「${item.name}」，所有空间都可使用`; }); }
async function trash(id: string) { const ok = await ElMessageBox.confirm("移入公共库回收站？已有作品和图片保留，可随时恢复。", "删除库内容", { confirmButtonText: "移入回收站", cancelButtonText: "保留" }).then(() => true, () => false); if (ok) await perform(() => persist({ ...library.value, deleted: [...library.value.deleted, id] })); }
async function restore(id: string) { await perform(() => persist({ ...library.value, deleted: library.value.deleted.filter((value) => value !== id) })); }
async function useItem(item: Character | ArtStyle) { await perform(async () => { await props.apply(props.kind, item, directory.value); message.value = `已将「${item.name}」用于当前作品；修改公共档案后可再次应用更新`; }); }
async function putImage(blob: Blob) { if (!["image/png","image/jpeg","image/webp"].includes(blob.type) || blob.size > 15 * 1024 * 1024) throw new Error("请使用15MB以内的PNG、JPG或WebP"); const bitmap = await createImageBitmap(blob); const valid = bitmap.width * bitmap.height <= 30_000_000; bitmap.close(); if (!valid) throw new Error("图片像素过多"); const path = `assets/${crypto.randomUUID()}.${blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`; await files.write(path, blob, true); urls[path] = URL.createObjectURL(blob); return path; }
function addImage(path: string, generated: boolean) { if (!draft.value) return; if ("image" in draft.value) { if (!draft.value.image) draft.value.image = path; draft.value.designImages.push({ path, view: draft.value.designView }); } else draft.value.refs.push({ id: crypto.randomUUID(), path, source: generated ? "自定义 AI 生成" : "本地上传", note: "仅参考画风，不复制人物身份", license: "" }); }
async function upload(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ""; if (file) await perform(async () => addImage(await putImage(file), false)); }
function removeImage(path: string) { if (!draft.value) return; draft.value.refs = draft.value.refs.filter((ref) => ref.path !== path); if ("image" in draft.value) { draft.value.designImages = draft.value.designImages.filter((image) => image.path !== path); if (draft.value.image === path) draft.value.image = ""; } }
async function generate() { await perform(async () => { if (!draft.value || !props.imageModel?.configured) throw new Error("请先选择已配置的出图服务"); const item = draft.value; if (!item.description.trim() && !paths(item).length) throw new Error("请填写描述或上传参考图"); const character = "image" in item; const references = character ? [...new Set([...(item.image ? [item.image] : []), ...(creationStyle.value?.refs.slice(0, 1).map((ref) => ref.path) || [])])].slice(0, 4) : item.refs.map((ref) => ref.path).slice(0, 4); if (props.imageModel.providerId === "zImage" && references.length) throw new Error("Z-Image不适合此多参考创作，请在上方切换klein或支持参考图的服务"); let prompt = character ? characterPrompt(item, { description: creationStyle.value?.description || item.artDirection || "清晰动漫线条、柔和赛璐璐上色", avoid: "" }, ["fluxKlein","zImage"].includes(props.imageModel.providerId)) : `生成一张原创漫画画风实例图，只参考输入图的线条、配色、上色和比例，不复制人物或构图。要求：${item.description}。避免：${item.avoid}。不画文字、标签或水印。`; if (character && references.length) prompt += `\n参考图顺序：${item.image ? "第1张为角色参考；" : ""}${creationStyle.value?.refs.length ? "最后1张仅供画风参考，不要复制其中的人物。" : ""}参考意图：${{ redesign: "提取元素重新设计原创人物，不复刻输入构图", identity: "保持角色身份，按指定视图重新绘制", style: "只参考画风，根据文字创造新的角色" }[item.referenceIntent]}。`;
if (character && creationStyle.value) item.artDirection = creationStyle.value.description.slice(0, 1000);
const response = await props.requestImage(props.imageModel, directory.value, prompt, references); const path = response.data.data?.[0]?.path; if (!path) throw new Error(response.data.message || "未返回图片"); addImage(path, true); if (character) item.image = path; await hydrate(item); }); }
async function analyzeDraft() {
  if (!draft.value) return;
  const item = draft.value;
  if (!brief.value.trim() && !item.description.trim() && !draftPaths.value.length) throw new Error("请写一句创作想法或上传参考图");
  const result = await props.analyzeDesign({ directory: directory.value, purpose: editorKind.value === "characters" ? "character" : "style", intent: "referenceIntent" in item ? item.referenceIntent : "style", request: `用户想法：${brief.value}\n已有设定：${JSON.stringify({ name: item.name, description: item.description, ...("personality" in item ? { personality: item.personality, motivation: item.motivation, speechStyle: item.speechStyle } : {}) })}\n选用画风：${creationStyle.value?.description || "按用户要求"}`.slice(0, 5000), paths: draftPaths.value.slice(0, 4) });
  const resultSchema = z.object({ name: z.string().min(1).max(100), description: z.string().max(3000), analysis: z.string().max(3000), visualSummary: z.string().max(500), personality: z.string().max(1500), motivation: z.string().max(1000), speechStyle: z.string().max(1000), aliases: z.string().max(500), artDirection: z.string().max(1000), avoid: z.string().max(1000) });
  const parsed = resultSchema.parse(result);
  if ("personality" in item) Object.assign(item, { name: parsed.name, description: parsed.description, visualSummary: parsed.visualSummary, personality: parsed.personality, motivation: parsed.motivation, speechStyle: parsed.speechStyle, aliases: parsed.aliases.replace(/[;；]/g, "，"), artDirection: creationStyle.value?.description.slice(0, 1000) || parsed.artDirection, referenceAnalysis: parsed.analysis });
  else Object.assign(item, { name: parsed.name, description: `${parsed.description}\n${parsed.analysis}`, avoid: parsed.avoid });
  message.value = "已整理设定，可微调性格、外形与对白后再生成";
}
async function analyze() { await perform(analyzeDraft); }
async function analyzeAndGenerate() { await perform(analyzeDraft); if (!error.value) await generate(); }
async function findExamples() {
  await perform(async () => {
    const { data } = await axios.get("/api/comicStudio/styleExamples", { params: { keyword: searchTerms.value }, headers: { "x-toonflow-workspace": "1" }, timeout: 25000 });
    examples.value = data.data;
    searchMessage.value = examples.value.length ? `找到 ${examples.value.length} 张案例，请选择后分析` : "没有匹配案例，试试更具体的画风或英文关键词";
  });
}
async function chooseExample(example: Example) {
  await perform(async () => {
    const response = await axios.post("/api/comicStudio/styleExampleImage", { url: example.thumbnail }, { headers: { "x-toonflow-workspace": "1" }, responseType: "blob", timeout: 25000 });
    const path = await putImage(response.data);
    if (!draft.value || "image" in draft.value) return;
    draft.value.refs = [{ id: crypto.randomUUID(), path, source: example.source, note: example.title, license: "请查看来源页授权" }, ...draft.value.refs].slice(0, 30);
    if (!brief.value) brief.value = searchTerms.value;
    await analyzeDraft();
  });
}
onMounted(() => perform(load));
onBeforeUnmount(() => Object.values(urls).forEach(URL.revokeObjectURL));
</script>

<style scoped lang="scss">
.selectedTray { background: #edf4ee; border: 1px solid #8da995; border-radius: 10px; padding: 16px; margin: 18px 0; .selectedItems { display:flex; flex-wrap:wrap; gap:12px; margin:12px 0; > div { display:flex; align-items:center; gap:8px; background:white; border-radius:8px; padding:6px 10px; } img { width:48px; height:58px; object-fit:contain; } } }
.selectedBadge { font-size:12px; color:#21603a; white-space:nowrap; }
.artLibrary article.selectedCard { border:2px solid #34765b; box-shadow:0 0 0 2px #34765b15; }
.creationBrief { background:#f2f6f2; padding:18px; border-radius:10px; display:grid; gap:12px; }
.styleChoice { display:flex; gap:12px; img { width:120px; height:140px; object-fit:contain; } p { max-height:140px; overflow:auto; } }
.exampleGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; img { width:100%; height:150px; object-fit:contain; } }
.artLibrary { background: var(--studioCard); border: 1px solid var(--studioLine); border-radius: 12px; padding: 24px; color: var(--studioInk); header, .libraryTools, .libraryActions, .editorFooter { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } header { justify-content: space-between; } h2,h3 { margin: 0 0 8px; } p { color: var(--studioMuted); font-size: 13px; line-height: 1.6; } .libraryTools { margin: 22px 0; > input { flex: 1; min-width: 180px; } label { display: flex; gap: 8px; align-items: center; } } .libraryCards { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 18px; } article { border: 1px solid var(--studioLine); border-radius: 12px; overflow: hidden; } .libraryPreview { display: flex; align-items: center; justify-content: center; height: 190px; width: 100%; background: #f3f4ef; border: 0; color: #667568; cursor: pointer; img { width: 100%; height: 100%; object-fit: contain; } } .libraryCardBody { padding: 16px; p { height: 42px; overflow: hidden; } small { color: var(--studioMuted); } } .libraryActions { margin-top: 16px; gap: 10px; } .textPresets { margin-top: 28px; border-top: 1px solid var(--studioLine); padding-top: 16px; div { display:flex; flex-wrap:wrap; gap:10px; margin:12px 0; } } }
.libraryEditor { display: grid; gap: 16px; label { display: grid; gap: 6px; } p { margin: 0; font-size: 13px; color: #68756d; } .editorColumns { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; } .editorImages { display: flex; flex-wrap: wrap; gap: 12px; figure { margin:0; width:160px; img { width:100%; height:120px; object-fit:contain; } } } .editorFooter { display:flex; justify-content:flex-end; gap:12px; } }
.artLibrary, .libraryEditor { input:not([type=checkbox]):not([type=file]), textarea, select { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #ccd5cc; border-radius:7px; color:#203b2c; background:#fff; font:inherit; } button { cursor:pointer; } summary { cursor:pointer; } .primaryButton,.secondaryButton { padding:10px 14px; border-radius:7px; border:1px solid #587261; background:#fff; color:#244631; } .primaryButton { background:#365c44; color:white; } .textButton { background:none; border:0; color:#365c44; padding:8px 4px; } button:disabled { opacity:.5; cursor:default; } .libraryError { color:#a83d32; } button:focus-visible { outline:2px solid #34765b; outline-offset:3px; } }
@media(max-width:600px) { .artLibrary { padding:16px; } .libraryEditor .editorColumns { grid-template-columns:1fr; } }
</style>
