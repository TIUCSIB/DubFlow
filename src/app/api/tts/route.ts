import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeSpeech,
  synthesizeWithClone,
  synthesizeWithDesign,
} from "@/lib/mimo";
import type { VoiceMode } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voiceMode,
      builtinVoice,
      referenceAudio,
      referenceAudioFormat,
      voiceDescription,
      styleInstruction,
      outputFormat,
    }: {
      text: string;
      voiceMode: VoiceMode;
      builtinVoice?: string;
      referenceAudio?: string;
      referenceAudioFormat?: "mp3" | "wav";
      voiceDescription?: string;
      styleInstruction?: string;
      outputFormat?: "wav" | "mp3";
    } = body;

    if (!text) {
      return NextResponse.json({ error: "text 字段不能为空" }, { status: 400 });
    }

    let audioBase64: string;

    switch (voiceMode) {
      case "builtin":
        audioBase64 = await synthesizeSpeech(
          text,
          builtinVoice ?? "Chloe",
          styleInstruction,
          outputFormat
        );
        break;

      case "clone":
        if (!referenceAudio) {
          return NextResponse.json(
            { error: "声音克隆模式需要提供 referenceAudio" },
            { status: 400 }
          );
        }
        audioBase64 = await synthesizeWithClone(
          text,
          referenceAudio,
          referenceAudioFormat ?? "mp3",
          styleInstruction,
          outputFormat
        );
        break;

      case "design":
        if (!voiceDescription) {
          return NextResponse.json(
            { error: "声音设计模式需要提供 voiceDescription" },
            { status: 400 }
          );
        }
        audioBase64 = await synthesizeWithDesign(
          text,
          voiceDescription,
          outputFormat
        );
        break;

      default:
        return NextResponse.json(
          { error: `不支持的 voiceMode: ${voiceMode}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ audioBase64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "TTS 合成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
