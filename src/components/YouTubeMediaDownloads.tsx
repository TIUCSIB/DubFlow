"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ProgressBar, Tabs } from "@heroui/react";
import { Download, FileVideo, Music } from "lucide-react";

export interface MediaFormat {
  itag: number;
  qualityLabel: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  bitrate: number;
  contentLength?: number;
}

export interface VideoMediaInfo {
  title: string;
  duration: string;
  formats: MediaFormat[];
  audioFormats: MediaFormat[];
}

interface YouTubeMediaDownloadsProps {
  sourceUrl: string;
  videoInfo: VideoMediaInfo;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface AudioOption {
  bitrate: number;
  label: string;
  estimatedBytes: number;
}

interface DownloadProgress {
  progress: number;
  message: string;
}

interface DownloadJobResponse extends DownloadProgress {
  status: "preparing" | "downloading" | "processing" | "ready" | "failed";
  error?: string;
  downloadUrl?: string;
}

const TEXT = {
  queryFailed: "\u67e5\u8be2\u4e0b\u8f7d\u8fdb\u5ea6\u5931\u8d25",
  downloadFailed: "\u4e0b\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
  downloadTimeout: "\u4e0b\u8f7d\u5904\u7406\u8d85\u65f6\uff0c\u8bf7\u91cd\u8bd5",
  creating: "\u6b63\u5728\u521b\u5efa\u4e0b\u8f7d\u4efb\u52a1...",
  createFailed: "\u521b\u5efa\u4e0b\u8f7d\u4efb\u52a1\u5931\u8d25",
  ready: "\u6587\u4ef6\u5df2\u51c6\u5907\u5b8c\u6210\uff0c\u6b63\u5728\u4e0b\u8f7d",
  media: "\u4e0b\u8f7d\u5a92\u4f53",
  type: "\u4e0b\u8f7d\u7c7b\u578b",
  audio: "\u97f3\u9891",
  video: "\u89c6\u9891",
  progress: "\u5a92\u4f53\u4e0b\u8f7d\u8fdb\u5ea6",
  approximate: "\u7ea6",
  processing: "\u5904\u7406\u4e2d...",
  pendingSize: "\u5927\u5c0f\u5f85\u8ba1\u7b97",
  noVideo: "\u8be5\u89c6\u9891\u6682\u672a\u63d0\u4f9b\u53ef\u4e0b\u8f7d\u7684 MP4 \u6e05\u6670\u5ea6\u3002",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes >= 100 * 1024 ** 2 ? 0 : 1)} MB`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || fallback;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function YouTubeMediaDownloads({
  sourceUrl,
  videoInfo,
  onError,
  onSuccess,
}: YouTubeMediaDownloadsProps) {
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  const audioOptions = useMemo<AudioOption[]>(() => {
    const duration = Number(videoInfo.duration) || 0;
    return [320, 256, 192, 128, 64].map((bitrate) => ({
      bitrate,
      label: `${bitrate} Kbps`,
      estimatedBytes: (duration * bitrate * 1000) / 8,
    }));
  }, [videoInfo.duration]);

  const audioTrackSize = useMemo(
    () => videoInfo.audioFormats.find(
      (format) => format.hasAudio && !format.hasVideo && format.container === "mp4",
    )?.contentLength ?? 0,
    [videoInfo.audioFormats],
  );

  const videoOptions = useMemo(
    () => [...videoInfo.formats]
      .filter((format) => format.hasVideo && format.container === "mp4")
      .sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0))
      .filter((format, index, formats) =>
        formats.findIndex((candidate) => candidate.qualityLabel === format.qualityLabel) === index,
      ),
    [videoInfo.formats],
  );

  const pollDownload = useCallback(async (jobId: string, signal: AbortSignal) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 30 * 60 * 1000) {
      const response = await fetch(`/api/youtube/download?jobId=${encodeURIComponent(jobId)}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error(await readError(response, TEXT.queryFailed));
      const job = (await response.json()) as DownloadJobResponse;
      setDownloadProgress({ progress: job.progress, message: job.message });
      if (job.status === "failed") throw new Error(job.error || job.message || TEXT.downloadFailed);
      if (job.status === "ready" && job.downloadUrl) return job.downloadUrl;
      await wait(800);
    }
    throw new Error(TEXT.downloadTimeout);
  }, []);

  const handleDownload = useCallback(
    async (type: "audio" | "video", option: AudioOption | MediaFormat) => {
      const pendingId = type === "audio"
        ? `audio-${(option as AudioOption).bitrate}`
        : `video-${(option as MediaFormat).itag}`;
      const controller = new AbortController();
      requestController.current?.abort();
      requestController.current = controller;
      setDownloadingId(pendingId);
      setDownloadProgress({ progress: 1, message: TEXT.creating });
      onError("");

      try {
        const response = await fetch("/api/youtube/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: sourceUrl.trim(),
            type,
            title: videoInfo.title,
            duration: Number(videoInfo.duration) || 0,
            audioBitrate: type === "audio" ? (option as AudioOption).bitrate : undefined,
            videoItag: type === "video" ? (option as MediaFormat).itag : undefined,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await readError(response, TEXT.createFailed));
        const { jobId } = (await response.json()) as { jobId: string };
        const downloadUrl = await pollDownload(jobId, controller.signal);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = "";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setDownloadProgress({ progress: 100, message: TEXT.ready });
        onSuccess(`${type === "audio" ? TEXT.audio : TEXT.video}${TEXT.ready}`);
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          onError(error instanceof Error ? error.message : TEXT.downloadFailed);
          setDownloadProgress(null);
        }
      } finally {
        if (requestController.current === controller) requestController.current = null;
        setDownloadingId(null);
      }
    },
    [onError, onSuccess, pollDownload, sourceUrl, videoInfo.duration, videoInfo.title],
  );

  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <Download className="h-3.5 w-3.5" />
        {TEXT.media}
      </h4>

      <Tabs
        selectedKey={mediaType}
        onSelectionChange={(key) => setMediaType(key as "audio" | "video")}
        className="w-full"
      >
        <Tabs.ListContainer className="mb-3">
          <Tabs.List
            aria-label={TEXT.type}
            className="grid w-full grid-cols-2 overflow-hidden rounded-md border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800 *:h-9 *:justify-center *:rounded-sm *:text-sm *:font-medium *:text-gray-500 *:data-[selected=true]:bg-white *:data-[selected=true]:text-teal-700 *:data-[selected=true]:shadow-sm dark:*:text-gray-400 dark:*:data-[selected=true]:bg-gray-700 dark:*:data-[selected=true]:text-teal-300"
          >
            <Tabs.Tab id="audio"><Music className="mr-1.5 h-4 w-4" />MP3 {TEXT.audio}</Tabs.Tab>
            <Tabs.Tab id="video"><FileVideo className="mr-1.5 h-4 w-4" />MP4 {TEXT.video}</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {downloadProgress && (
          <div className="mb-3 rounded-md border border-teal-200 bg-teal-50 p-3 dark:border-teal-900/70 dark:bg-teal-950/30">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-teal-800 dark:text-teal-200">
              <span className="min-w-0 truncate">{downloadProgress.message}</span>
              <span className="shrink-0 font-mono">{downloadProgress.progress}%</span>
            </div>
            <ProgressBar
              value={downloadProgress.progress}
              size="sm"
              color={downloadProgress.progress === 100 ? "success" : "accent"}
              aria-label={TEXT.progress}
            />
          </div>
        )}

        <Tabs.Panel id="audio">
          <div className="grid gap-2 sm:grid-cols-2">
            {audioOptions.map((option) => {
              const pendingId = `audio-${option.bitrate}`;
              return (
                <Button
                  key={option.bitrate}
                  variant="secondary"
                  onPress={() => void handleDownload("audio", option)}
                  isPending={downloadingId === pendingId}
                  isDisabled={downloadingId !== null}
                  className="h-auto min-h-16 w-full justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-left text-teal-900 hover:border-teal-400 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-100 dark:hover:bg-teal-900/40"
                >
                  <span className="flex flex-col items-start">
                    <span className="font-semibold">MP3</span>
                    <span className="text-xs font-normal text-teal-700/80 dark:text-teal-300/80">
                      {TEXT.approximate} {formatFileSize(option.estimatedBytes)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">
                    {downloadingId === pendingId ? TEXT.processing : option.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="video">
          {videoOptions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {videoOptions.map((option) => {
                const pendingId = `video-${option.itag}`;
                const estimatedBytes = (option.contentLength ?? 0) + audioTrackSize;
                return (
                  <Button
                    key={option.itag}
                    variant="secondary"
                    onPress={() => void handleDownload("video", option)}
                    isPending={downloadingId === pendingId}
                    isDisabled={downloadingId !== null}
                    className="h-auto min-h-16 w-full justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-semibold">MP4</span>
                      <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">
                        {estimatedBytes > 0 ? formatFileSize(estimatedBytes) : TEXT.pendingSize}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">
                      {downloadingId === pendingId ? TEXT.processing : option.qualityLabel}
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              {TEXT.noVideo}
            </p>
          )}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
