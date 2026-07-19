export function buildSubtitleUrls(baseUrl: string): string[] {
  const formats = ["srv3", "vtt", "json3", ""];
  const originalUrl = new URL(baseUrl);
  const urls = [
    originalUrl.toString(),
    ...formats.map((format) => {
      const url = new URL(baseUrl);

      if (format) {
        url.searchParams.set("fmt", format);
      } else {
        url.searchParams.delete("fmt");
      }

      return url.toString();
    }),
  ];

  return [...new Set(urls)];
}

export function convertCaptionToSrt(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) return "";
  if (/^WEBVTT(?:\s|$)/i.test(trimmed)) return convertWebVttToSrt(trimmed);
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return convertJson3ToSrt(trimmed);
  }
  if (/<text(?:\s|>)/i.test(trimmed)) return convertTimedTextToSrt(trimmed);
  if (/<p(?:\s|>)/i.test(trimmed)) return convertSrv3ToSrt(trimmed);

  return "";
}

function convertTimedTextToSrt(xml: string): string {
  const textBlocks = xml.match(/<text[^>]*>[\s\S]*?<\/text>/gi) || [];
  const entries: string[] = [];

  for (const block of textBlocks) {
    const start = parseFloat(block.match(/\bstart="([\d.]+)"/)?.[1] || "0");
    const duration = parseFloat(block.match(/\bdur="([\d.]+)"/)?.[1] || "0");
    const text = decodeXmlEntities(
      block.match(/>([\s\S]*?)<\/text>/i)?.[1] || "",
    ).trim();

    if (!text) continue;
    entries.push(
      [
        entries.length + 1,
        `${formatSrtTime(start)} --> ${formatSrtTime(start + duration)}`,
        text,
        "",
      ].join("\n"),
    );
  }

  return entries.join("\n");
}

function convertSrv3ToSrt(xml: string): string {
  const blocks = xml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const entries: string[] = [];

  for (const block of blocks) {
    const startMs = Number(block.match(/\bt="(\d+)"/)?.[1] || 0);
    const durationMs = Number(block.match(/\bd="(\d+)"/)?.[1] || 0);
    const text = decodeXmlEntities(block.replace(/<[^>]+>/g, "")).trim();

    if (!text) continue;
    entries.push(
      [
        entries.length + 1,
        `${formatSrtTimeMs(startMs)} --> ${formatSrtTimeMs(startMs + durationMs)}`,
        text,
        "",
      ].join("\n"),
    );
  }

  return entries.join("\n");
}

function convertWebVttToSrt(vtt: string): string {
  const lines = vtt.replace(/^WEBVTT[^\n]*\r?\n?/i, "").split(/\r?\n/);
  const entries: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const timing = lines[lineIndex].trim();
    if (!timing.includes(" --> ")) continue;

    const textLines: string[] = [];
    lineIndex++;
    while (lineIndex < lines.length && lines[lineIndex].trim()) {
      textLines.push(lines[lineIndex].trim());
      lineIndex++;
    }

    const text = decodeXmlEntities(textLines.join("\n"))
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) continue;

    entries.push(
      [entries.length + 1, normalizeVttTiming(timing), text, ""].join("\n"),
    );
  }

  return entries.join("\n");
}

function convertJson3ToSrt(json: string): string {
  try {
    const data = JSON.parse(json) as {
      events?: Array<{
        tStartMs?: number;
        dDurationMs?: number;
        segs?: Array<{ utf8?: string }>;
      }>;
    };
    const entries: string[] = [];

    for (const event of data.events ?? []) {
      const text = (event.segs ?? [])
        .map((segment) => segment.utf8 || "")
        .join("")
        .trim();
      if (!text) continue;

      const startMs = event.tStartMs ?? 0;
      entries.push(
        [
          entries.length + 1,
          `${formatSrtTimeMs(startMs)} --> ${formatSrtTimeMs(startMs + (event.dDurationMs ?? 0))}`,
          text,
          "",
        ].join("\n"),
      );
    }

    return entries.join("\n");
  } catch {
    return "";
  }
}

function normalizeVttTiming(timing: string): string {
  return timing.replace(
    /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/g,
    (_, hours: string | undefined, minutes: string, seconds: string, milliseconds: string) =>
      `${hours || "00:"}${minutes}:${seconds},${milliseconds}`,
  );
}

function formatSrtTime(seconds: number): string {
  return formatSrtTimeMs(Math.max(0, Math.round(seconds * 1000)));
}

export function formatSrtTimeMs(milliseconds: number): string {
  const safeMilliseconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.round(milliseconds))
    : 0;
  const hours = Math.floor(safeMilliseconds / 3600000);
  const minutes = Math.floor((safeMilliseconds % 3600000) / 60000);
  const seconds = Math.floor((safeMilliseconds % 60000) / 1000);
  const remainder = safeMilliseconds % 1000;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":") + `,${String(remainder).padStart(3, "0")}`;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}
