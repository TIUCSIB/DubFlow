import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasApiKey: Boolean(process.env.MIMO_API_KEY),
    storage: "browser-local",
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "API Key 只支持保存在当前浏览器的 localStorage 中" },
    { status: 410 },
  );
}
