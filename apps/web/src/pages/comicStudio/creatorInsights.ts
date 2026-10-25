import type { ComicProject } from "./model";

export function keywordInsights(project: ComicProject, platform: string, window: string) {
  const latest = new Map<string, ComicProject["feedback"][number]>();
  for (const item of project.feedback.filter((item) => item.platform === platform && item.window === window)) {
    const old = latest.get(item.episodeId);
    if (!old || item.observedAt > old.observedAt) latest.set(item.episodeId, item);
  }
  const records = [...latest.values()];
  const groups = new Map<string, { keyword: string; works: number; views: number; measured: number }>();
  for (const item of records) {
    for (const keyword of new Set(item.keywords)) {
      const row = groups.get(keyword) || { keyword, works: 0, views: 0, measured: 0 };
      row.works++;
      if (item.views !== null) { row.views += item.views; row.measured++; }
      groups.set(keyword, row);
    }
  }
  return {
    records,
    keywords: [...groups.values()].map((item) => ({ ...item, average: item.measured ? item.views / item.measured : null })).sort((a, b) => (b.average ?? -1) - (a.average ?? -1)),
  };
}
