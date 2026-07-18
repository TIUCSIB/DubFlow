import { NextRequest, NextResponse } from "next/server";
import { speechRecognition, type ASRLanguage } from "@/lib/mimo";

const SUPPORTED_LANGUAGES: ASRLanguage[] = ["auto", "zh", "en"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64, audioFormat, language } = body;

    if (!audioBase64) {
      return NextResponse.json(
        { error: "audioBase64 字段不能为空" },
        { status: 400 },
      );
    }

    const validLanguage: ASRLanguage = SUPPORTED_LANGUAGES.includes(language)
      ? language
      : "auto";
    const validFormat = ["mp3", "wav"].includes(audioFormat)
      ? audioFormat
      : "mp3";
    const apiKey = req.headers.get("x-mimo-api-key") || undefined;
    const text = await speechRecognition(
      audioBase64,
      validFormat,
      validLanguage,
      apiKey,
    );

    return NextResponse.json({
      text,
      language: validLanguage,
      format: validFormat,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "语音识别失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    supportedLanguages: [
      { code: "auto", name: "自动检测", description: "自动识别音频中的语言" },
      { code: "zh", name: "中文", description: "普通话" },
      { code: "en", name: "英文", description: "英语" },
    ],
    supportedFormats: ["mp3", "wav"],
    maxSize: "10MB",
  });
}
