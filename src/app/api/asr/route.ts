import { NextRequest, NextResponse } from "next/server";
import { speechRecognition } from "@/lib/mimo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64, audioFormat, language } = body;

    if (!audioBase64) {
      return NextResponse.json(
        { error: "audioBase64 字段不能为空" },
        { status: 400 }
      );
    }

    const text = await speechRecognition(
      audioBase64,
      audioFormat ?? "mp3",
      language ?? "auto"
    );

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "语音识别失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
