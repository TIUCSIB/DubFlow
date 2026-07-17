import type { SubtitleEntry, TranslatedEntry } from "@/types";

// ── SRT 时间戳解析 ────────────────────────────────────
// 输入 "00:01:23,456" → 输出毫秒数
export function parseTimestamp(ts: string): number {
  const match = ts.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(s) * 1000 +
    parseInt(ms)
  );
}

// 毫秒数 → "00:01:23,456"
export function formatTimestamp(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return (
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`
  );
}

// ── SRT 文件解析 ──────────────────────────────────────
export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  // 按双换行分割各条字幕
  const blocks = content.trim().split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) continue;

    const index = parseInt(lines[0]);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;

    const startTime = timeMatch[1].replace(".", ",");
    const endTime = timeMatch[2].replace(".", ",");
    const text = lines.slice(2).join("\n").trim();

    entries.push({
      index,
      startTime,
      endTime,
      text,
      startMs: parseTimestamp(startTime),
      endMs: parseTimestamp(endTime),
    });
  }

  return entries;
}

// ── 生成 SRT 文件内容 ─────────────────────────────────
export function generateSRT(entries: SubtitleEntry[]): string {
  return entries
    .map((e, i) => {
      return `${i + 1}\n${e.startTime} --> ${e.endTime}\n${e.text}`;
    })
    .join("\n\n");
}

// ── 中英双语 SRT ─────────────────────────────────────
export function generateBilingualSRT(
  entries: TranslatedEntry[]
): string {
  return entries
    .map((e, i) => {
      return `${i + 1}\n${e.startTime} --> ${e.endTime}\n${e.text}\n${e.translatedText}`;
    })
    .join("\n\n");
}
