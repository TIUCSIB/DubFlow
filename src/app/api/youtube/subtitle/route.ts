import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 将 YouTube 字幕 XML（timedtext）转换为 SRT 格式。
 * 跳过文本内容为空的条目（YouTube 自动字幕中常见）。
 */
function xmlToSrt(xml: string): string {
  const textBlocks = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g) || [];
  const entries: string[] = [];
  let seq = 0;

  for (const block of textBlocks) {
    const startMatch = block.match(/start="([\d.]+)"/);
    const durMatch = block.match(/dur="([\d.]+)"/);
    const textMatch = block.match(/>([\s\S]*?)<\/text>/);

    const start = parseFloat(startMatch?.[1] || "0");
    const dur = parseFloat(durMatch?.[1] || "0");
    const end = start + dur;
    const text = (textMatch?.[1] || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!text) continue;

    seq++;
    entries.push(
      [
        seq,
        `${formatSrtTime(start)} --> ${formatSrtTime(end)}`,
        text,
        "",
      ].join("\n"),
    );
  }

  return entries.join("\n");
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "," +
    String(ms).padStart(3, "0")
  );
}

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.searchParams.get("baseUrl");
  const lang = request.nextUrl.searchParams.get("lang") || "unknown";

  if (!baseUrl) {
    return NextResponse.json({ error: "缺少字幕轨道地址" }, { status: 400 });
  }

  try {
    const srtUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=srv3`;
    const response = await fetch(srtUrl);

    if (!response.ok) {
      throw new Error(`字幕下载失败 (${response.status})`);
    }

    const content = await response.text();

    let srtContent: string;
    if (content.includes("<transcript>") || content.includes("<text ")) {
      srtContent = xmlToSrt(content);
    } else {
      srtContent = convertSrv3ToSrt(content);
    }

    return NextResponse.json({
      srtContent,
      language: lang,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "字幕下载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 将 srv3（YouTube 的 XML 字幕格式）转换为 SRT。
 */
function convertSrv3ToSrt(xml: string): string {
  const pBlocks = xml.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];
  const entries: string[] = [];
  let seq = 0;

  for (const block of pBlocks) {
    const tMatch = block.match(/t="(\d+)"/);
    const dMatch = block.match(/d="(\d+)"/);

    const startMs = parseInt(tMatch?.[1] || "0", 10);
    const durMs = parseInt(dMatch?.[1] || "0", 10);
    const endMs = startMs + durMs;

    const textContent = block
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!textContent) continue;

    seq++;
    entries.push(
      [
        seq,
        `${formatSrtTimeMs(startMs)} --> ${formatSrtTimeMs(endMs)}`,
        textContent,
        "",
      ].join("\n"),
    );
  }

  return entries.join("\n");
}

function formatSrtTimeMs(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const remainder = ms % 1000;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "," +
    String(remainder).padStart(3, "0")
  );
}
