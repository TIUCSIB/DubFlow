import { NextRequest, NextResponse } from "next/server";
import {
  speechRecognition,
  translateTexts,
  type ASRLanguage,
} from "@/lib/mimo";
import {
  translateWithProvider,
  translateSingleWithProvider,
} from "@/lib/translation-providers";
import { parseSRT } from "@/lib/subtitle";
import type {
  SubtitleEntry,
  TargetLanguage,
  TranslatedEntry,
  TranslationProvider,
} from "@/types";

const TRANSLATION_CONCURRENCY = 4;

/** 根据总条目数动态调整每批大小，文件越大批次越小 */
function getBatchSize(totalEntries: number): number {
  if (totalEntries > 1000) return 10;
  if (totalEntries > 500) return 15;
  return 20;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      audioBase64,
      audioFormat,
      srtContent,
      autoTranslate,
      sourceLanguage,
      targetLanguage,
      translationProvider,
      deeplApiKey,
    } = body as {
      type: "audio" | "srt";
      audioBase64?: string;
      audioFormat?: "mp3" | "wav";
      srtContent?: string;
      autoTranslate?: boolean;
      sourceLanguage?: ASRLanguage;
      targetLanguage?: TargetLanguage;
      translationProvider?: TranslationProvider;
      deeplApiKey?: string;
    };
    const apiKey = req.headers.get("x-mimo-api-key") || undefined;
    const language = normalizeLanguage(sourceLanguage);
    let sourceEntries: SubtitleEntry[] = [];

    if (type === "audio") {
      if (!audioBase64) {
        return NextResponse.json(
          { error: "请提供音频数据" },
          { status: 400 },
        );
      }

      const text = await speechRecognition(
        audioBase64,
        audioFormat ?? "wav",
        language,
        apiKey,
      );
      sourceEntries = [
        {
          index: 1,
          startTime: "00:00:00,000",
          endTime: "00:00:00,000",
          text: text.trim(),
          startMs: 0,
          endMs: 0,
        },
      ];
    } else if (type === "srt") {
      if (!srtContent) {
        return NextResponse.json(
          { error: "请提供 SRT 字幕内容" },
          { status: 400 },
        );
      }

      sourceEntries = parseSRT(srtContent);
      if (sourceEntries.length === 0) {
        return NextResponse.json(
          { error: "SRT 解析失败，请检查文件格式" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "不支持的处理类型" },
        { status: 400 },
      );
    }

    if (autoTranslate) {
      const WARN_ENTRIES = 10000;
      if (sourceEntries.length > WARN_ENTRIES) {
        console.warn(`[DubFlow] 大文件翻译：${sourceEntries.length} 条字幕，预计耗时较长`);
      }

      const detectedLanguage = resolveSourceLanguage(language, sourceEntries);
      const selectedTargetLanguage =
        normalizeTargetLanguage(targetLanguage) ??
        getOppositeLanguage(detectedLanguage);
      const sourceLang = detectedLanguage === "zh" ? "Chinese" : "English";
      const targetLang = selectedTargetLanguage === "zh" ? "Chinese" : "English";
      const batchSize = getBatchSize(sourceEntries.length);
      const batches = chunkEntries(sourceEntries, batchSize);
      const totalBatches = batches.length;

      // 使用流式响应实时推送翻译进度
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendProgress = (current: number, total: number) => {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", current, total }) + "\n"));
          };

          let translatedEntries: TranslatedEntry[];

          if (selectedTargetLanguage === detectedLanguage) {
            sendProgress(1, 1);
            translatedEntries = sourceEntries.map((entry) => ({
              ...entry,
              translatedText: entry.text,
            }));
          } else {
            const translatedByIndex = new Map<number, string>();
            let completedBatches = 0;

            const translatedBatches = await mapWithConcurrency(
              batches,
              TRANSLATION_CONCURRENCY,
              async (batch) => {
                const result = await translateBatchWithFallback(
                  batch,
                  sourceLang,
                  targetLang,
                  apiKey,
                  translationProvider,
                  deeplApiKey,
                );
                completedBatches++;
                sendProgress(completedBatches, totalBatches);
                return result;
              },
            );

            translatedBatches
              .flat()
              .forEach((entry) =>
                translatedByIndex.set(entry.index, entry.translatedText),
              );

            translatedEntries = sourceEntries.map((entry) => ({
              ...entry,
              translatedText: translatedByIndex.get(entry.index) || entry.text,
            }));
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            type: "complete",
            entries: sourceEntries,
            translatedEntries,
            autoTranslated: true,
            detectedLanguage,
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
          }) + "\n"));

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return NextResponse.json({
      entries: sourceEntries,
      autoTranslated: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "处理失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    supportedTypes: ["audio", "srt"],
    autoTranslate: true,
  });
}

function normalizeLanguage(language?: ASRLanguage): ASRLanguage {
  return language === "zh" || language === "en" ? language : "auto";
}

function normalizeTargetLanguage(
  language?: TargetLanguage,
): TargetLanguage | undefined {
  return language === "zh" || language === "en" ? language : undefined;
}

function getOppositeLanguage(language: "zh" | "en"): TargetLanguage {
  return language === "zh" ? "en" : "zh";
}

function detectLanguage(entries: SubtitleEntry[]): "zh" | "en" | "mixed" {
  const text = entries.map((entry) => entry.text).join("\n");
  const chineseCount = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;

  if (chineseCount === 0 && latinCount > 0) return "en";
  if (chineseCount > 0 && chineseCount >= latinCount) return "zh";
  if (chineseCount > 0 && latinCount > 0) return "mixed";
  return "en";
}

function resolveSourceLanguage(
  requestedLanguage: ASRLanguage,
  entries: SubtitleEntry[],
): "zh" | "en" {
  if (requestedLanguage === "zh" || requestedLanguage === "en") {
    return requestedLanguage;
  }

  return detectLanguage(entries) === "zh" ? "zh" : "en";
}

/** 批次级容错：批量翻译失败后自动降级成逐条翻译 */
async function translateBatchWithFallback(
  batch: SubtitleEntry[],
  sourceLang: string,
  targetLang: string,
  apiKey: string | undefined,
  translationProvider: TranslationProvider = "mimo",
  deeplApiKey?: string,
): Promise<TranslatedEntry[]> {
  try {
    let translatedTexts: string[];

    if (translationProvider === "deepl" || translationProvider === "google") {
      translatedTexts = await translateWithProvider(
        batch.map((entry) => entry.text),
        sourceLang,
        targetLang,
        translationProvider,
        deeplApiKey,
      );
    } else {
      translatedTexts = await translateTexts(
        batch.map((entry) => entry.text),
        sourceLang,
        targetLang,
        apiKey,
      );
    }

    return batch.map((entry, index) => ({
      ...entry,
      translatedText: translatedTexts[index] || entry.text,
    }) satisfies TranslatedEntry);
  } catch {
    return translateBatchIndividually(batch, sourceLang, targetLang, apiKey, translationProvider, deeplApiKey);
  }
}

/** 逐条翻译：批量失败后的降级方案，单条失败保留原文 */
async function translateBatchIndividually(
  batch: SubtitleEntry[],
  sourceLang: string,
  targetLang: string,
  apiKey: string | undefined,
  translationProvider: TranslationProvider = "mimo",
  deeplApiKey?: string,
): Promise<TranslatedEntry[]> {
  const results: TranslatedEntry[] = [];

  for (const entry of batch) {
    try {
      let translated: string;
      if (translationProvider === "deepl" || translationProvider === "google") {
        translated = await translateSingleWithProvider(entry.text, sourceLang, targetLang, translationProvider, deeplApiKey);
      } else {
        const { translateText } = await import("@/lib/mimo");
        translated = await translateText(entry.text, sourceLang, targetLang, apiKey);
      }
      results.push({ ...entry, translatedText: translated || entry.text });
    } catch {
      results.push({ ...entry, translatedText: entry.text });
    }
  }

  return results;
}

async function mapWithConcurrency<Item, Result>(
  items: Item[],
  concurrency: number,
  mapper: (item: Item, index: number) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const current = nextIndex++;
        results[current] = await mapper(items[current], current);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

function chunkEntries(
  entries: SubtitleEntry[],
  batchSize: number,
): SubtitleEntry[][] {
  const batches: SubtitleEntry[][] = [];

  for (let index = 0; index < entries.length; index += batchSize) {
    batches.push(entries.slice(index, index + batchSize));
  }

  return batches;
}
