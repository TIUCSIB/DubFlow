import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { getInnertube, extractVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const type = request.nextUrl.searchParams.get("type") || "video";

  if (!url) {
    return NextResponse.json({ error: "请提供 YouTube 视频链接" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "无效的 YouTube 视频链接" }, { status: 400 });
  }

  try {
    const innertube = await getInnertube();
    const info = await innertube.getBasicInfo(videoId, { client: "IOS" });
    const title =
      (info.basic_info.title || "video")
        .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
        .trim() || "video";

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ext = type === "audio" ? "mp3" : "mp4";
    const filename = `${title}.${ext}`;

    // Use yt-dlp with --impersonate to bypass bot detection
    const formatArg = type === "audio" ? "bestaudio" : "best[ext=mp4]/best";

    const { stdout, stderr } = await execFileAsync(
      "yt-dlp",
      [
        "--impersonate", "chrome",
        "-f", formatArg,
        "-o", "-",  // output to stdout
        "--no-playlist",
        "--no-warnings",
        "--no-check-certificates",
        "--newline",
        ytUrl,
      ],
      {
        timeout: 300000, // 5 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        encoding: "buffer", // get raw bytes
      },
    );

    if (!stdout || stdout.length === 0) {
      throw new Error(stderr?.toString() || "Download produced no output");
    }

    const contentType = type === "audio" ? "audio/mpeg" : "video/mp4";

    return new NextResponse(stdout, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(stdout.length),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "下载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}