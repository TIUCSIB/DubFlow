import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeSpeech,
  synthesizeWithClone,
  synthesizeWithDesign,
} from "@/lib/mimo";
import { generateBilingualSRT, generateSRT } from "@/lib/subtitle";
import type { TranslatedEntry, VoiceMode } from "@/types";

interface ExportRequest {
  entries: TranslatedEntry[];
  voiceMode: VoiceMode;
  builtinVoice?: string;
  referenceAudio?: string;
  referenceAudioFormat?: "mp3" | "wav";
  voiceDescription?: string;
  styleInstruction?: string;
  outputFormat?: "wav" | "mp3";
  srtBilingual?: boolean;
  withAudio?: boolean;
  streamProgress?: boolean;
}

interface AudioSegment {
  index: number;
  base64: string;
  duration: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportRequest;
    const {
      entries,
      voiceMode,
      builtinVoice,
      referenceAudio,
      referenceAudioFormat,
      voiceDescription,
      styleInstruction,
      outputFormat,
      srtBilingual,
      withAudio = true,
      streamProgress = false,
    } = body;
    const apiKey = req.headers.get("x-mimo-api-key") || undefined;

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "字幕条目不能为空" },
        { status: 400 },
      );
    }

    const srtContent = srtBilingual
      ? generateBilingualSRT(entries)
      : generateSRT(
          entries.map((entry) => ({
            ...entry,
            text: entry.translatedText || entry.text,
          })),
        );

    if (!withAudio) {
      return NextResponse.json({
        srtContent,
        audioSegments: [],
        totalSegments: 0,
      });
    }

    validateVoiceConfig({
      voiceMode,
      referenceAudio,
      voiceDescription,
    });

    const options: SynthesisOptions = {
      voiceMode,
      builtinVoice,
      referenceAudio,
      referenceAudioFormat,
      voiceDescription,
      styleInstruction,
      outputFormat: outputFormat ?? "mp3",
      apiKey,
    };

    if (streamProgress) {
      return createProgressStream(entries, srtContent, options);
    }

    const audioSegments = await synthesizeAudioSegments(entries, options);
    return NextResponse.json({
      srtContent,
      audioSegments,
      totalSegments: audioSegments.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function createProgressStream(
  entries: TranslatedEntry[],
  srtContent: string,
  options: SynthesisOptions,
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      void (async () => {
        try {
          send({
            type: "progress",
            phase: "synthesizing",
            current: 0,
            total: entries.length,
          });

          const audioSegments = await synthesizeAudioSegments(
            entries,
            options,
            (current) => {
              send({
                type: "progress",
                phase: "synthesizing",
                current,
                total: entries.length,
              });
            },
          );

          send({
            type: "complete",
            srtContent,
            audioSegments,
            totalSegments: audioSegments.length,
          });
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "导出失败";
          send({ type: "error", error: message });
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

interface SynthesisOptions {
  voiceMode: VoiceMode;
  builtinVoice?: string;
  referenceAudio?: string;
  referenceAudioFormat?: "mp3" | "wav";
  voiceDescription?: string;
  styleInstruction?: string;
  outputFormat: "wav" | "mp3";
  apiKey?: string;
}

async function synthesizeAudioSegments(
  entries: TranslatedEntry[],
  options: SynthesisOptions,
  onProgress?: (current: number) => void,
): Promise<AudioSegment[]> {
  const audioSegments: AudioSegment[] = [];

  for (const [entryPosition, entry] of entries.entries()) {
    const text = entry.translatedText || entry.text;

    if (text.trim()) {
      try {
        const audioBase64 = await synthesizeEntry(text, options);
        const estimatedDuration = Math.ceil(
          (((audioBase64.length * 3) / 4) / 16000) * 1000,
        );

        audioSegments.push({
          index: entry.index,
          base64: audioBase64,
          duration: estimatedDuration,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        throw new Error(`第 ${entry.index} 条字幕合成失败：${message}`);
      }
    }

    onProgress?.(entryPosition + 1);
  }

  return audioSegments;
}

async function synthesizeEntry(
  text: string,
  options: SynthesisOptions,
): Promise<string> {
  switch (options.voiceMode) {
    case "builtin":
      return synthesizeSpeech(
        text,
        options.builtinVoice ?? "mimo_default",
        options.styleInstruction,
        options.outputFormat,
        options.apiKey,
      );
    case "clone":
      return synthesizeWithClone(
        text,
        options.referenceAudio as string,
        options.referenceAudioFormat ?? "mp3",
        options.styleInstruction,
        options.outputFormat,
        options.apiKey,
      );
    case "design":
      return synthesizeWithDesign(
        text,
        options.voiceDescription as string,
        options.outputFormat,
        options.apiKey,
      );
    default:
      throw new Error(`不支持的音色模式: ${options.voiceMode}`);
  }
}

function validateVoiceConfig(config: {
  voiceMode: VoiceMode;
  referenceAudio?: string;
  voiceDescription?: string;
}) {
  if (config.voiceMode === "clone" && !config.referenceAudio) {
    throw new Error("声音克隆模式需要提供参考音频");
  }
  if (config.voiceMode === "design" && !config.voiceDescription?.trim()) {
    throw new Error("声音设计模式需要提供声音描述");
  }
}

export async function GET() {
  return NextResponse.json({
    outputFormats: ["mp3", "wav"],
    srtOptions: {
      bilingual: "中英双语字幕",
      translationOnly: "仅中文字幕",
    },
  });
}
