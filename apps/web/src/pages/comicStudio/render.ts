import type { Episode, Panel, Speech } from "./model";

type Files = { read: (path: string) => Promise<ArrayBuffer> };
export const fontFamilies = {
  sans: '"PingFang SC", "Microsoft YaHei", sans-serif',
  wenkai: '"Xiaoleng WenKai", serif',
  genkiGothic: '"Xiaoleng Genki Gothic", "PingFang SC", sans-serif',
  huninn: '"Xiaoleng Huninn", "PingFang SC", sans-serif',
  genkiMin: '"Xiaoleng Genki Min", "Songti SC", serif',
  serif: '"Songti SC", "SimSun", serif',
};

const fontLoads = new Map<string, Promise<void>>();
export async function loadComicFont(key: Episode["layout"]["fontFamily"]) {
  const fonts = { wenkai: ["Xiaoleng WenKai", "wenKai.ttf"], genkiGothic: ["Xiaoleng Genki Gothic", "genkiGothic.otf"], huninn: ["Xiaoleng Huninn", "huninn.ttf"], genkiMin: ["Xiaoleng Genki Min", "genkiMin.otf"] };
  if (!(key in fonts)) return;
  const [family, file] = fonts[key as keyof typeof fonts]!;
  if (!fontLoads.has(key)) fontLoads.set(key, (async () => {
    const face = new FontFace(family!, `url(/fonts/${file})`);
    await face.load();
    document.fonts.add(face);
  })().catch(() => { fontLoads.delete(key); throw new Error("内置字体加载失败，请重试或改选系统字体"); }));
  await fontLoads.get(key);
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > width) {
        const characters = [...line];
        const last = characters.at(-1)!;
        if (characters.length > 1 && (/^[，。！？；：、）》】」』…,.!?;:)]$/.test(character) || /^[（《【「『(]$/.test(last))) {
          lines.push(characters.slice(0, -1).join(""));
          line = last + character;
          continue;
        }
        lines.push(line);
        line = "";
      }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}

function fitBubbleText(context: CanvasRenderingContext2D, text: string, width: number, maxHeight: number, baseSize: number, family: string) {
  let size = baseSize;
  let lines: string[] = [];
  while (size >= 18) {
    context.font = `500 ${size}px ${family}`;
    lines = wrapText(context, text, width);
    if (lines.length * size * 1.35 + 28 <= maxHeight) break;
    size -= 1;
  }
  context.font = `500 ${size}px ${family}`;
  return { lines, size };
}

function drawPaperTexture(context: CanvasRenderingContext2D, background: string) {
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1440);
  context.save();
  context.globalAlpha = 0.045;
  context.fillStyle = "#493b2b";
  for (let y = 8; y < 1440; y += 22) {
    for (let x = (Math.floor(y / 22) % 2) * 11; x < 1080; x += 22) {
      context.beginPath();
      context.arc(x, y, 1.05, 0, Math.PI * 2);
      context.fill();
    }
  }
  const vignette = context.createRadialGradient(540, 690, 280, 540, 690, 900);
  vignette.addColorStop(0, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(55,43,28,.10)");
  context.globalAlpha = 1;
  context.fillStyle = vignette;
  context.fillRect(0, 0, 1080, 1440);
  context.restore();
}

async function loadImage(files: Files, path: string) {
  const url = URL.createObjectURL(new Blob([await files.read(path)]));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

export function bubblePath(shape: Speech["shape"], width = 100, height = 100, tail: "left" | "right" | "none" = "none", tailLength = .2) {
  if (shape === "burst") return Array.from({ length: 32 }, (_, index) => { const angle = index * Math.PI / 16, radius = index % 2 ? .88 : 1; return `${index ? "L" : "M"}${width / 2 + Math.cos(angle) * width / 2 * radius},${height / 2 + Math.sin(angle) * height / 2 * radius}`; }).join(" ") + " Z";
  if (shape === "cloud") return Array.from({ length: 17 }, (_, index) => { const angle = index * Math.PI / 8, mid = angle - Math.PI / 16; const end = `${width / 2 + Math.cos(angle) * width * .47},${height / 2 + Math.sin(angle) * height * .47}`; return index ? `Q${width / 2 + Math.cos(mid) * width * .54},${height / 2 + Math.sin(mid) * height * .54} ${end}` : `M${end}`; }).join(" ") + " Z";
  if (shape === "oval") {
    if (tail === "none") return `M${width},${height/2} A${width/2},${height/2} 0 1 1 0,${height/2} A${width/2},${height/2} 0 1 1 ${width},${height/2} Z`;
    const angle = tail === "left" ? Math.PI * 2 / 3 : Math.PI / 3;
    const point = (a: number) => `${width/2 + Math.cos(a)*width/2},${height/2 + Math.sin(a)*height/2}`;
    return `M${width},${height/2} A${width/2},${height/2} 0 0 1 ${point(angle-.13)} L${width * (tail === "left" ? .18 : .82)},${height*(1+tailLength)} L${point(angle+.13)} A${width/2},${height/2} 0 1 1 ${width},${height/2} Z`;
  }
  const r = shape === "box" ? Math.min(5, height * .08) : Math.min(height * .42, width * .3);
  return `M${r},0 H${width-r} Q${width},0 ${width},${r} V${height-r} Q${width},${height} ${width-r},${height} H${r} Q0,${height} 0,${height-r} V${r} Q0,0 ${r},0 Z`;
}

function bubble(context: CanvasRenderingContext2D, lines: string[], box: number[], fontSize: number, tail: "left" | "right" | "none" = "none", shape: Speech["shape"] = "oval", tone: Speech["tone"] = "light", kind: Speech["kind"] = "dialogue", tailLength = .2, flavor = true) {
  const [x, y, width, height] = box;
  context.save();
  context.translate(x, y);
  const outline = new Path2D(bubblePath(shape, width, height, kind === "dialogue" ? tail : "none", tailLength));
  context.fillStyle = tone === "dark" ? "#202228" : "#fffdf5";
  if (flavor) {
    context.shadowColor = "rgba(0,0,0,.22)";
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 4;
  }
  context.fill(outline);
  context.shadowColor = "transparent";
  context.strokeStyle = flavor ? "#171717" : "#202228";
  context.lineWidth = flavor ? 3.2 : 2.5;
  context.stroke(outline);
  context.restore();
  if (kind === "thought") {
    for (const [dx, dy, r] of [[width * .25, height + 8, 6], [width * .2, height + 20, 3]]) { context.beginPath(); context.arc(x + dx!, y + dy!, r!, 0, Math.PI * 2); context.fillStyle = tone === "dark" ? "#202228" : "#fffdf5"; context.fill(); context.strokeStyle = "#171717"; context.lineWidth = 2; context.stroke(); }
  }
  context.fillStyle = tone === "dark" ? "#ffffff" : "#182420";
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lineHeight = fontSize * 1.35;
  lines.forEach((line, index) => context.fillText(line, x + width / 2, y + height / 2 + (index - (lines.length - 1) / 2) * lineHeight));
  context.restore();
}

async function drawPanel(context: CanvasRenderingContext2D, files: Files, episode: Episode, panel: Panel, box: number[], warnings?: string[]) {
  const [x, y, width, height] = box;
  const fontSize = episode.layout.fontSize;
  const flavor = episode.layout.comicFlavor !== false;
  const family = fontFamilies[episode.layout.fontFamily];
  context.font = `500 ${fontSize}px ${family}`;
  const speech = panel.speech.length ? panel.speech.filter((item) => item.text.trim()).map((item) => {
    const speaker = episode.castSnapshot.find((person) => person.id === item.speakerId);
    return { ...item, label: `${episode.layout.textMode === "safe" && speaker ? `${speaker.name}${item.kind === "thought" ? "（心声）" : ""}：` : ""}${item.text}` };
  }) : panel.dialogue.trim() ? [{ id: "legacy", speakerId: "", text: panel.dialogue, label: panel.dialogue, x: panel.bubbleX, y: panel.bubbleY, width: .74, kind: "dialogue" as const, shape: "oval" as const, tone: "light" as const, tail: "left" as const, tailLength: .2 }] : [];
  const safe = episode.layout.textMode === "safe";
  const columns = safe && speech.length > 1 ? 2 : 1;
  const gap = 12;
  const rows: number[] = [];
  const bubbles = speech.map((item, index) => {
    const bubbleWidth = safe ? (width - 24 - (columns - 1) * gap) / columns : Math.min(width - 24, Math.max(190, width * item.width));
    const fitted = fitBubbleText(context, item.label, bubbleWidth - 44, height * (safe ? .44 : .38), fontSize, family);
    const bubbleHeight = fitted.lines.length * fitted.size * 1.35 + 28;
    const row = Math.floor(index / columns);
    rows[row] = Math.max(rows[row] || 0, bubbleHeight);
    const shape = item.shape;
    return { item, lines: fitted.lines, size: fitted.size, width: bubbleWidth, height: bubbleHeight, row, shape };
  });
  const captionFont = Math.max(20, Math.min(fontSize, 28));
  context.font = `500 ${captionFont}px ${family}`;
  const captionLines = panel.caption.trim() ? wrapText(context, panel.caption, width - 64) : [];
  const captionHeight = captionLines.length ? captionLines.length * captionFont * 1.35 + 30 : 0;
  const topHeight = safe && bubbles.length ? rows.reduce((sum, value) => sum + value + gap, 12) : 0;
  const imageHeight = height - (safe ? topHeight + captionHeight : 0);
  if (imageHeight < height * .28 || captionHeight > height * .45) throw new Error("文字占位过多，请缩短对白、减小字号或改为每页 1–2 格");
  const image = panel.image ? await loadImage(files, panel.image) : null;
  context.save();
  if (flavor) {
    context.shadowColor = "rgba(0,0,0,.24)";
    context.shadowBlur = 12;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 6;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(x, y, width, height);
  context.restore();
  if (image) {
    const scale = Math.min(width / image.width, imageHeight / image.height);
    context.drawImage(image, x + (width - image.width * scale) / 2, y + (safe ? topHeight : 0) + (imageHeight - image.height * scale) / 2, image.width * scale, image.height * scale);
  } else {
    context.save(); context.fillStyle = "#edf0ed"; context.fillRect(x, y, width, height);
    context.fillStyle = "#647269"; context.font = `24px ${family}`; context.textAlign = "center";
    context.fillText("待配图 · 字幕位置预览", x + width / 2, y + height * .72); context.restore();
  }
  const occupied: number[][] = [];
  for (const [index, current] of bubbles.entries()) {
    const left = safe ? x + 12 + (index % columns) * (current.width + gap) : x + Math.min(current.item.x * width, width - current.width - 12);
    const tailPad = safe ? 0 : current.item.kind === "thought" ? 26 : current.item.tail !== "none" && current.shape === "oval" ? current.height * (current.item.tailLength ?? .2) : 0;
    const top = safe ? y + 12 + rows.slice(0, current.row).reduce((sum, value) => sum + value + gap, 0) : y + Math.min(current.item.y * height, height - captionHeight - current.height - tailPad - 12);
    if (top < y || top + current.height + tailPad > y + height - captionHeight) { if (warnings) warnings.push("对白超出可用区域，请调整气泡位置"); else throw new Error("对白超出可用区域，请缩短文字或调整气泡位置"); }
    if (occupied.some(([bx, by, bw, bh]) => left < bx + bw && left + current.width > bx && top < by + bh && top + current.height > by))
      { if (warnings) warnings.push("气泡发生重叠，请移动气泡或使用画外留白模式"); else throw new Error("气泡发生重叠，请移动气泡或使用留白排字模式"); }
    occupied.push([left, top, current.width, current.height + tailPad]);
    context.font = `500 ${current.size}px ${family}`;
    bubble(context, current.lines, [left, top, current.width, current.height], current.size, safe ? "none" : current.item.tail, current.shape, current.item.tone, safe ? "narration" : current.item.kind, current.item.tailLength, flavor);
  }
  if (captionLines.length) {
    context.save();
    context.fillStyle = flavor ? "#fff7e3" : "rgba(249,247,238,.98)";
    context.fillRect(x, y + height - captionHeight, width, captionHeight);
    if (flavor) {
      context.fillStyle = "#171717";
      context.fillRect(x, y + height - captionHeight, 8, captionHeight);
      context.strokeStyle = "#171717";
      context.lineWidth = 2.2;
      context.strokeRect(x, y + height - captionHeight, width, captionHeight);
    }
    context.fillStyle = "#182420";
    context.font = `500 ${captionFont}px ${family}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    const captionLineHeight = captionFont * 1.35;
    captionLines.forEach((line, index) => context.fillText(line, x + 22, y + height - captionHeight / 2 + (index - (captionLines.length - 1) / 2) * captionLineHeight));
    context.restore();
  }
  if (flavor && panel.sfx.trim()) {
    const text = panel.sfx.trim();
    const characters = [...text].length;
    const sfxSize = Math.max(36, Math.min(52, Math.floor((width / Math.max(3, characters)) * 1.25)));
    const sfxFamily = '"Xiaoleng WenKai", "Microsoft YaHei", sans-serif';
    context.save();
    context.font = `900 ${sfxSize}px ${sfxFamily}`;
    const half = context.measureText(text).width / 2 + 10;
    const centerX = x + Math.min(width - half - 8, Math.max(half + 8, width * .32));
    context.globalAlpha = 0.9;
    context.translate(centerX, y + height * (captionLines.length ? .70 : .84));
    context.rotate(-.1);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `900 ${sfxSize}px ${sfxFamily}`;
    context.lineJoin = "round";
    context.lineWidth = 7;
    context.strokeStyle = "#171717";
    context.strokeText(text, 0, 0);
    context.fillStyle = "#fff2c8";
    context.fillText(text, 0, 0);
    context.restore();
  }
  context.strokeStyle = flavor ? "#151515" : "#263a32";
  context.lineWidth = flavor ? 5 : 3;
  context.strokeRect(x, y, width, height);
}

export async function renderPages(episode: Episode, files: Files, options?: { preview: boolean; warnings: string[] }): Promise<Blob[]> {
  if (!episode.panels.length || (!options?.preview && episode.panels.some((panel) => !panel.image))) throw new Error("请先完成全部分格出图");
  await document.fonts.ready;
  await loadComicFont(episode.layout.fontFamily);
  const pages: Blob[] = [];
  const perPage = episode.layout.perPage;
  for (let offset = 0; offset < episode.panels.length; offset += perPage) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持画布导出");
    if (episode.layout.comicFlavor !== false) drawPaperTexture(context, episode.layout.background);
    else {
      context.fillStyle = episode.layout.background;
      context.fillRect(0, 0, 1080, 1440);
    }
    const count = Math.min(perPage, episode.panels.length - offset);
    const columns = count === 1 ? 1 : perPage === 4 ? 2 : 1;
    const rows = Math.ceil(count / columns);
    const width = (1008 - (columns - 1) * 24) / columns;
    const height = (1328 - (rows - 1) * 24) / rows;
    for (let index = 0; index < perPage && offset + index < episode.panels.length; index++) {
      await drawPanel(context, files, episode, episode.panels[offset + index]!, [36 + (index % columns) * (width + 24), 36 + Math.floor(index / columns) * (height + 24), width, height], options?.preview ? options.warnings : undefined);
    }
    if (episode.layout.comicFlavor !== false) {
      const pageNumber = String(Math.floor(offset / perPage) + 1).padStart(2, "0");
      context.save();
      context.fillStyle = "#151515";
      context.fillRect(956, 1392, 88, 2);
      context.font = '700 24px "Xiaoleng WenKai", "Microsoft YaHei", sans-serif';
      context.textAlign = "right";
      context.fillText(pageNumber, 1044, 1418);
      context.textAlign = "left";
      context.font = '500 17px "Xiaoleng WenKai", "Microsoft YaHei", sans-serif';
      context.fillStyle = "#6b5a42";
      context.fillText(episode.title.slice(0, 18), 36, 1418);
      context.restore();
    }
    const blob = await new Promise<Blob>((done, reject) => canvas.toBlob((value) => value ? done(value) : reject(new Error("图片导出失败")), "image/png"));
    pages.push(blob);
  }
  return pages;
}
