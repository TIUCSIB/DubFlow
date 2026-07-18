import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/mimo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLang, targetLang } = body as {
      text?: string;
      sourceLang?: string;
      targetLang?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "text 字段不能为空" },
        { status: 400 },
      );
    }

    const apiKey = req.headers.get("x-mimo-api-key") || undefined;
    const result = await translateText(
      text,
      sourceLang ?? "English",
      targetLang ?? "Chinese",
      apiKey,
    );

    return NextResponse.json({ translatedText: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "翻译失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
