import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { mkdir, unlink, writeFile } from "fs/promises";
import ffmpegPath from "ffmpeg-static";
import os from "os";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    const allowedTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/mp3",
      "audio/ogg",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的文件格式，请上传视频或音频文件" },
        { status: 400 },
      );
    }

    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "文件大小超过 200MB 限制" },
        { status: 400 },
      );
    }

    const tempDir = path.join(os.tmpdir(), "dubflow");
    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const fileExt = path.extname(file.name) || ".tmp";
    const tempInputPath = path.join(tempDir, `input_${timestamp}${fileExt}`);
    const tempOutputPath = path.join(tempDir, `output_${timestamp}.wav`);

    await writeFile(tempInputPath, Buffer.from(await file.arrayBuffer()));

    try {
      const executablePath = ffmpegPath || "ffmpeg";

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(executablePath, [
          "-i",
          tempInputPath,
          "-vn",
          "-acodec",
          "pcm_s16le",
          "-ar",
          "16000",
          "-ac",
          "1",
          "-y",
          tempOutputPath,
        ]);

        let stderr = "";
        ffmpeg.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        ffmpeg.on("close", (code) => {
          if (code === 0) {
            resolve();
            return;
          }

          reject(new Error(`ffmpeg 执行失败: ${stderr}`));
        });

        ffmpeg.on("error", (error) => {
          reject(new Error(`FFmpeg 无法执行: ${error.message}`));
        });
      });

      const { readFile } = await import("fs/promises");
      const outputBuffer = await readFile(tempOutputPath);

      return NextResponse.json({
        audioBase64: outputBuffer.toString("base64"),
        audioFormat: "wav",
        fileName: file.name,
      });
    } finally {
      await unlink(tempInputPath).catch(() => {});
      await unlink(tempOutputPath).catch(() => {});
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "音频提取失败";

    if (message.includes("FFmpeg 无法执行")) {
      return NextResponse.json(
        { error: "项目内置的 FFmpeg 无法执行，请重新安装依赖后重试" },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    supportedVideoFormats: ["mp4", "mov", "avi", "webm"],
    supportedAudioFormats: ["mp3", "wav", "ogg"],
    maxFileSize: "200MB",
    ffmpegRequired: false,
    ffmpegBundled: true,
  });
}
