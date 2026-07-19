import type { SubtitleEntry, TranslatedEntry } from "@/types";

export interface ProcessResponseResult {
  entries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
}

interface ProcessCompleteEvent extends ProcessResponseResult {
  type?: "complete";
}

interface ProcessErrorEvent {
  type?: "error";
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCompleteEvent(value: unknown): value is ProcessCompleteEvent {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    Array.isArray(value.translatedEntries)
  );
}

function parseLine(line: string): unknown {
  const payload = line.startsWith("data:")
    ? line.slice("data:".length).trim()
    : line;
  if (!payload || payload === "[DONE]") return null;
  return JSON.parse(payload);
}

export async function readProcessResponse(
  response: Response,
): Promise<ProcessResponseResult> {
  const rawResponse = await response.text();
  const trimmedResponse = rawResponse.trim();
  if (!trimmedResponse) {
    throw new Error("\u5904\u7406\u670d\u52a1\u6ca1\u6709\u8fd4\u56de\u7ed3\u679c");
  }

  try {
    const value = JSON.parse(trimmedResponse);
    if (isCompleteEvent(value)) return value;
  } catch {
    // Streaming responses contain one JSON event per line.
  }

  for (const line of trimmedResponse.split(/\r?\n/)) {
    if (!line.trim()) continue;

    let event: unknown;
    try {
      event = parseLine(line.trim());
    } catch {
      throw new Error("\u5904\u7406\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6cd5\u89e3\u6790\u7684\u6570\u636e");
    }
    if (!event) continue;
    if (isCompleteEvent(event)) return event;
    if (isRecord(event) && typeof (event as ProcessErrorEvent).error === "string") {
      throw new Error((event as ProcessErrorEvent).error);
    }
  }

  throw new Error("\u5904\u7406\u670d\u52a1\u672a\u8fd4\u56de\u5b8c\u6210\u7ed3\u679c");
}
