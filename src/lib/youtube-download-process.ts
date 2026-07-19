import { spawn } from "child_process";
import { mkdir, readdir, stat } from "fs/promises";
import ffmpegPath from "ffmpeg-static";
import path from "path";

export interface DownloadProcessInput {
  videoId: string;
  type: "audio" | "video";
  duration: number;
  audioBitrate?: number;
  videoItag?: number;
  tempDirectory: string;
}

interface ProcessUpdate {
  status?: "downloading" | "processing";
  progress: number;
  message: string;
}

interface ProcessResult {
  outputPath: string;
  extension: "mp3" | "mp4";
  size: number;
}

const PROCESS_TIMEOUT_MS = 30 * 60 * 1000;

function runProcess(
  command: string,
  args: string[],
  onOutput?: (chunk: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("\u4e0b\u8f7d\u5904\u7406\u8d85\u65f6\uff0c\u8bf7\u91cd\u8bd5"));
    }, PROCESS_TIMEOUT_MS);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => onOutput?.(chunk));
    child.stderr?.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-8000);
      onOutput?.(chunk);
    });
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if (code === 0) return finish();
      const fallback = `${command} \u6267\u884c\u5931\u8d25\uff0c\u72b6\u6001\u7801\uff1a${code ?? "\u672a\u77e5"}`;
      finish(new Error(stderr.trim() || fallback));
    });
  });
}

function createPercentParser(onProgress: (percent: number) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer = `${buffer}${chunk}`.slice(-2048);
    const matches = [...buffer.matchAll(/download:\s*([\d.]+)%/g)];
    const percent = Number(matches.at(-1)?.[1]);
    if (Number.isFinite(percent)) onProgress(percent);
  };
}

function createFfmpegParser(duration: number, onProgress: (percent: number) => void) {
  let buffer = "";
  return (chunk: string) => {
    if (duration <= 0) return;
    buffer = `${buffer}${chunk}`.slice(-4096);
    const matches = [...buffer.matchAll(/out_time_(?:ms|us)=(\d+)/g)];
    const elapsedMicroseconds = Number(matches.at(-1)?.[1]);
    if (Number.isFinite(elapsedMicroseconds)) {
      onProgress(Math.min(100, (elapsedMicroseconds / 1_000_000 / duration) * 100));
    }
  };
}

async function findDownloadedFile(directory: string, prefix: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const file = entries.find(
    (entry) => entry.isFile() && entry.name.startsWith(prefix) && !entry.name.endsWith(".part"),
  );
  if (!file) throw new Error("\u4e0b\u8f7d\u7684\u6587\u4ef6\u4e3a\u7a7a\uff0c\u8bf7\u91cd\u8bd5");
  return path.join(directory, file.name);
}

async function downloadFormat(
  input: DownloadProcessInput,
  prefix: string,
  format: string,
  onProgress: (percent: number) => void,
) {
  const outputTemplate = path.join(input.tempDirectory, `${prefix}.%(ext)s`);
  await runProcess(
    "yt-dlp",
    [
      "--impersonate", "chrome",
      "--no-playlist", "--no-warnings", "--no-check-certificates", "--no-color",
      "--newline", "--progress-template", "download:%(progress._percent_str)s",
      "-f", format, "-o", outputTemplate,
      `https://www.youtube.com/watch?v=${input.videoId}`,
    ],
    createPercentParser(onProgress),
  );
  return findDownloadedFile(input.tempDirectory, prefix);
}

async function processAudio(
  input: DownloadProcessInput,
  update: (value: ProcessUpdate) => void,
): Promise<string> {
  if (!ffmpegPath) {
    throw new Error("\u672a\u627e\u5230 FFmpeg\uff0c\u65e0\u6cd5\u8f6c\u6362\u97f3\u9891");
  }
  update({
    status: "downloading",
    progress: 5,
    message: "\u6b63\u5728\u4e0b\u8f7d\u97f3\u9891\u8d44\u6e90...",
  });
  const sourcePath = await downloadFormat(
    input,
    "audio-source",
    "bestaudio[ext=m4a]/bestaudio",
    (value) => update({
      progress: 5 + value * 0.67,
      message: `\u6b63\u5728\u4e0b\u8f7d\u97f3\u9891\u8d44\u6e90 ${Math.round(value)}%`,
    }),
  );

  update({
    status: "processing",
    progress: 74,
    message: "\u6b63\u5728\u8f6c\u6362 MP3 \u97f3\u9891...",
  });
  const outputPath = path.join(input.tempDirectory, "download.mp3");
  await runProcess(
    ffmpegPath,
    [
      "-y", "-i", sourcePath,
      "-vn", "-codec:a", "libmp3lame", "-b:a", `${input.audioBitrate ?? 192}k`,
      "-progress", "pipe:1", "-nostats", outputPath,
    ],
    createFfmpegParser(input.duration, (value) => update({
      progress: 74 + value * 0.24,
      message: `\u6b63\u5728\u8f6c\u6362 MP3 \u97f3\u9891 ${Math.round(value)}%`,
    })),
  );
  return outputPath;
}

async function processVideo(
  input: DownloadProcessInput,
  update: (value: ProcessUpdate) => void,
): Promise<string> {
  if (!ffmpegPath) {
    throw new Error("\u672a\u627e\u5230 FFmpeg\uff0c\u65e0\u6cd5\u5408\u6210\u89c6\u9891");
  }
  update({
    status: "downloading",
    progress: 5,
    message: "\u6b63\u5728\u4e0b\u8f7d\u89c6\u9891\u4e0e\u97f3\u9891\u8d44\u6e90...",
  });
  let videoProgress = 0;
  let audioProgress = 0;
  const reportProgress = () => {
    const value = (videoProgress + audioProgress) / 2;
    update({
      progress: 5 + value * 0.67,
      message: `\u6b63\u5728\u4e0b\u8f7d\u5a92\u4f53\u8d44\u6e90 ${Math.round(value)}%`,
    });
  };
  const [videoPath, audioPath] = await Promise.all([
    downloadFormat(input, "video-source", String(input.videoItag), (value) => {
      videoProgress = value;
      reportProgress();
    }),
    downloadFormat(input, "audio-source", "bestaudio[ext=m4a]/bestaudio", (value) => {
      audioProgress = value;
      reportProgress();
    }),
  ]);

  update({
    status: "processing",
    progress: 74,
    message: "\u6b63\u5728\u5408\u6210 MP4 \u89c6\u9891...",
  });
  const outputPath = path.join(input.tempDirectory, "download.mp4");
  await runProcess(
    ffmpegPath,
    [
      "-y", "-i", videoPath, "-i", audioPath,
      "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart",
      "-progress", "pipe:1", "-nostats", outputPath,
    ],
    createFfmpegParser(input.duration, (value) => update({
      progress: 74 + value * 0.24,
      message: `\u6b63\u5728\u5408\u6210 MP4 \u89c6\u9891 ${Math.round(value)}%`,
    })),
  );
  return outputPath;
}

export async function processYouTubeDownload(
  input: DownloadProcessInput,
  update: (value: ProcessUpdate) => void,
): Promise<ProcessResult> {
  await mkdir(input.tempDirectory, { recursive: true });
  update({ progress: 3, message: "\u6b63\u5728\u8fde\u63a5 YouTube..." });
  const outputPath = input.type === "audio"
    ? await processAudio(input, update)
    : await processVideo(input, update);
  const extension = input.type === "audio" ? "mp3" : "mp4";
  const outputStats = await stat(outputPath);
  if (outputStats.size <= 0) {
    throw new Error("\u4e0b\u8f7d\u7684\u6587\u4ef6\u4e3a\u7a7a\uff0c\u8bf7\u91cd\u8bd5");
  }
  return { outputPath, extension, size: outputStats.size };
}
