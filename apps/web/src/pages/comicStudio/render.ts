import type { Episode, Panel } from "./model";

type Files = { read: (path: string) => Promise<ArrayBuffer> };
export const fontFamilies = {
  sans: '"PingFang SC", "Microsoft YaHei", sans-serif',
  wenkai: '"Xiaoleng WenKai", serif',
  serif: '"Songti SC", "SimSun", serif',
};

let wenkaiReady: Promise<void> | undefined;
async function loadWenkai() {
  if (!wenkaiReady) {
    wenkaiReady = (async () => {
      const face = new FontFace("Xiaoleng WenKai", "url(/fonts/wenKai.ttf)");
      await face.load();
      document.fonts.add(face);
    })().catch(() => { wenkaiReady = undefined; throw new Error("内置文楷加载失败，请检查本地字体资源后重试；也可改选系统字体"); });
  }
  return wenkaiReady;
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

async function loadImage(files: Files, path: string) {
  const url = URL.createObjectURL(new Blob([await files.read(path)]));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

function bubble(context: CanvasRenderingContext2D, lines: string[], box: number[], fontSize: number, tail: "left" | "right" | "none" = "none") {
  const [x, y, width, height] = box;
  context.fillStyle = "#fffefa";
  context.strokeStyle = "#202922";
  context.lineWidth = 2.5;
  context.beginPath();
  const radius = tail === "none" ? 14 : Math.min(height * .42, width * .3);
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  if (tail !== "none") {
    const anchor = x + width * (tail === "left" ? .3 : .7);
    context.lineTo(anchor + 10, y + height);
    context.lineTo(anchor + (tail === "left" ? -12 : 12), y + height + 22);
    context.lineTo(anchor - 10, y + height);
  }
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#182420";
  lines.forEach((line, index) => context.fillText(line, tail === "none" ? x + 14 : x + (width - context.measureText(line).width) / 2, y + 14 + fontSize * (index * 1.4 + 0.88)));
}

async function drawPanel(context: CanvasRenderingContext2D, files: Files, episode: Episode, panel: Panel, box: number[]) {
  const [x, y, width, height] = box;
  const fontSize = episode.layout.fontSize;
  context.font = `500 ${fontSize}px ${fontFamilies[episode.layout.fontFamily]}`;
  const speech = panel.speech.length ? panel.speech.filter((item) => item.text.trim()).map((item) => {
    const speaker = episode.castSnapshot.find((person) => person.id === item.speakerId);
    return { ...item, label: `${episode.layout.textMode === "safe" && speaker ? `${speaker.name}：` : ""}${item.text}` };
  }) : panel.dialogue.trim() ? [{ id: "legacy", speakerId: "", text: panel.dialogue, label: panel.dialogue, x: panel.bubbleX, y: panel.bubbleY, width: .74, tail: "left" as const }] : [];
  const safe = episode.layout.textMode === "safe";
  const columns = safe && speech.length > 1 ? 2 : 1;
  const gap = 12;
  const rows: number[] = [];
  const bubbles = speech.map((item, index) => {
    const bubbleWidth = safe ? (width - 24 - (columns - 1) * gap) / columns : Math.min(width - 24, width * item.width);
    const lines = wrapText(context, item.label, bubbleWidth - 28);
    const bubbleHeight = lines.length * fontSize * 1.4 + 28;
    const row = Math.floor(index / columns);
    rows[row] = Math.max(rows[row] || 0, bubbleHeight);
    return { item, lines, width: bubbleWidth, height: bubbleHeight, row };
  });
  const captionLines = panel.caption.trim() ? wrapText(context, panel.caption, width - 32) : [];
  const captionHeight = captionLines.length ? captionLines.length * fontSize * 1.4 + 26 : 0;
  const topHeight = safe && bubbles.length ? rows.reduce((sum, value) => sum + value + gap, 12) : 0;
  const imageHeight = height - (safe ? topHeight + captionHeight : 0);
  if (imageHeight < height * .28 || captionHeight > height * .45) throw new Error("文字占位过多，请缩短对白、减小字号或改为每页 1–2 格");
  const image = await loadImage(files, panel.image);
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(x, y, width, height);
  const scale = Math.min(width / image.width, imageHeight / image.height);
  context.drawImage(image, x + (width - image.width * scale) / 2, y + (safe ? topHeight : 0) + (imageHeight - image.height * scale) / 2, image.width * scale, image.height * scale);
  const occupied: number[][] = [];
  for (const [index, current] of bubbles.entries()) {
    const left = safe ? x + 12 + (index % columns) * (current.width + gap) : x + Math.min(current.item.x * width, width - current.width - 12);
    const top = safe ? y + 12 + rows.slice(0, current.row).reduce((sum, value) => sum + value + gap, 0) : y + Math.min(current.item.y * height, height - captionHeight - current.height - 12);
    if (top < y || top + current.height + (!safe && current.item.tail !== "none" ? 22 : 0) > y + height - captionHeight) throw new Error("对白超出可用区域，请缩短文字或调整气泡位置");
    if (occupied.some(([bx, by, bw, bh]) => left < bx + bw && left + current.width > bx && top < by + bh && top + current.height > by))
      throw new Error("气泡发生重叠，请移动气泡或使用留白排字模式");
    occupied.push([left, top, current.width, current.height]);
    bubble(context, current.lines, [left, top, current.width, current.height], fontSize, safe ? "none" : current.item.tail);
  }
  if (captionLines.length) {
    context.fillStyle = "rgba(249,247,238,.98)";
    context.fillRect(x, y + height - captionHeight, width, captionHeight);
    context.fillStyle = "#182420";
    captionLines.forEach((line, index) => context.fillText(line, x + 16, y + height - captionHeight + 13 + fontSize * (index * 1.4 + .88)));
  }
  context.restore();
  context.strokeStyle = "#263a32";
  context.lineWidth = 3;
  context.strokeRect(x, y, width, height);
}

export async function renderPages(episode: Episode, files: Files): Promise<Blob[]> {
  if (!episode.panels.length || episode.panels.some((panel) => !panel.image)) throw new Error("请先完成全部分格出图");
  await document.fonts.ready;
  if (episode.layout.fontFamily === "wenkai") await loadWenkai();
  const pages: Blob[] = [];
  const perPage = episode.layout.perPage;
  for (let offset = 0; offset < episode.panels.length; offset += perPage) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持画布导出");
    context.fillStyle = episode.layout.background;
    context.fillRect(0, 0, 1080, 1440);
    const count = Math.min(perPage, episode.panels.length - offset);
    const columns = count === 1 ? 1 : perPage === 4 ? 2 : 1;
    const rows = Math.ceil(count / columns);
    const width = (1008 - (columns - 1) * 24) / columns;
    const height = (1328 - (rows - 1) * 24) / rows;
    for (let index = 0; index < perPage && offset + index < episode.panels.length; index++) {
      await drawPanel(context, files, episode, episode.panels[offset + index]!, [36 + (index % columns) * (width + 24), 36 + Math.floor(index / columns) * (height + 24), width, height]);
    }
    context.fillStyle = "#53645b";
    context.font = '22px "PingFang SC", sans-serif';
    context.fillText(`小冷漫画 · AI 辅助创作 · ${episode.title.slice(0, 24)}`, 36, 1405);
    const blob = await new Promise<Blob>((done, reject) => canvas.toBlob((value) => value ? done(value) : reject(new Error("图片导出失败")), "image/png"));
    pages.push(blob);
  }
  return pages;
}
