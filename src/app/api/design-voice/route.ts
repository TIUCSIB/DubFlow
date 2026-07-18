import { NextRequest, NextResponse } from "next/server";
import { synthesizeWithDesign } from "@/lib/mimo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceDescription, outputFormat } = body;

    if (!text || !voiceDescription) {
      return NextResponse.json(
        { error: "text 和 voiceDescription 字段都不能为空" },
        { status: 400 },
      );
    }

    const apiKey = req.headers.get("x-mimo-api-key") || undefined;
    const audioBase64 = await synthesizeWithDesign(
      text,
      voiceDescription,
      outputFormat ?? "wav",
      apiKey,
    );

    return NextResponse.json({ audioBase64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "声音设计失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
