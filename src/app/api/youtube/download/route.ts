import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import {
  cleanupDownloadJob,
  getDownloadJob,
  getDownloadJobFile,
  startDownloadJob,
} from "@/lib/youtube-download";
import { extractVideoId } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_BITRATES = new Set([64, 128, 192, 256, 320]);

interface DownloadRequestBody {
  url?: string;
  type?: "audio" | "video";
  title?: string;
  duration?: number;
  audioBitrate?: number;
  videoItag?: number;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as DownloadRequestBody | null;
  const url = body?.url?.trim();
  const type = body?.type;
  if (!url) {
    return NextResponse.json({ error: "\u8bf7\u63d0\u4f9b YouTube \u89c6\u9891\u94fe\u63a5" }, { status: 400 });
  }
  if (type !== "audio" && type !== "video") {
    return NextResponse.json({ error: "\u4e0b\u8f7d\u7c7b\u578b\u65e0\u6548" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "\u65e0\u6548\u7684 YouTube \u89c6\u9891\u94fe\u63a5" }, { status: 400 });
  }
  const audioBitrate = Number(body?.audioBitrate);
  const videoItag = Number(body?.videoItag);
  if (type === "audio" && !AUDIO_BITRATES.has(audioBitrate)) {
    return NextResponse.json({ error: "\u4e0d\u652f\u6301\u7684\u97f3\u9891\u7801\u7387" }, { status: 400 });
  }
  if (type === "video" && (!Number.isInteger(videoItag) || videoItag <= 0)) {
    return NextResponse.json({ error: "\u8bf7\u9009\u62e9\u6709\u6548\u7684\u89c6\u9891\u6e05\u6670\u5ea6" }, { status: 400 });
  }

  const job = startDownloadJob({
    videoId,
    type,
    title: body?.title?.trim() || "dubflow-download",
    duration: Math.max(0, Number(body?.duration) || 0),
    audioBitrate: type === "audio" ? audioBitrate : undefined,
    videoItag: type === "video" ? videoItag : undefined,
  });
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "\u7f3a\u5c11\u4e0b\u8f7d\u4efb\u52a1\u7f16\u53f7" }, { status: 400 });
  }

  if (request.nextUrl.searchParams.get("file") === "1") {
    const file = getDownloadJobFile(jobId);
    if (!file) {
      return NextResponse.json({
        error: "\u6587\u4ef6\u5c1a\u672a\u51c6\u5907\u5b8c\u6210\u6216\u5df2\u7ecf\u8fc7\u671f",
      }, { status: 409 });
    }
    const fileStream = createReadStream(file.path);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      void cleanupDownloadJob(jobId);
    };
    fileStream.once("close", cleanup);
    fileStream.once("error", cleanup);

    const encodedFilename = encodeURIComponent(file.filename);
    const extension = file.filename.split(".").pop() || "bin";
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="dubflow-download.${extension}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(file.size),
        "Cache-Control": "no-store",
      },
    });
  }

  const job = getDownloadJob(jobId);
  if (!job) {
    return NextResponse.json({
      error: "\u4e0b\u8f7d\u4efb\u52a1\u4e0d\u5b58\u5728\u6216\u5df2\u7ecf\u8fc7\u671f",
    }, { status: 404 });
  }
  return NextResponse.json({
    ...job,
    downloadUrl: job.status === "ready"
      ? `/api/youtube/download?jobId=${job.id}&file=1`
      : undefined,
  });
}
