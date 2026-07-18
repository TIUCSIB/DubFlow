import { NextRequest, NextResponse } from "next/server";
import { synthesizeWithClone } from "@/lib/mimo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      referenceAudio,
      referenceAudioFormat,
      styleInstruction,
      outputFormat,
    } = body;

    if (!text || !referenceAudio) {
      return NextResponse.json(
        { error: "text 和 referenceAudio 字段都不能为空" },
        { status: 400 },
      );
    }

    const apiKey = req.headers.get("x-mimo-api-key") || undefined;
    const audioBase64 = await synthesizeWithClone(
      text,
      referenceAudio,
      referenceAudioFormat ?? "mp3",
      styleInstruction,
      outputFormat ?? "wav",
      apiKey,
    );

    return NextResponse.json({ audioBase64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "声音克隆失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
