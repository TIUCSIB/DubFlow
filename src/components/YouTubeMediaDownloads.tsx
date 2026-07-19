"use client";

import { useMemo, useState } from "react";
import { Button, ProgressBar, Tabs } from "@heroui/react";
import { Download, FileVideo, Music, RotateCcw } from "lucide-react";
import clsx from "clsx";
import useYouTubeMediaDownload, {
  type MediaDownloadState,
  type MediaDownloadType,
} from "@/hooks/useYouTubeMediaDownload";

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
}

interface AudioOption {
  bitrate: number;
  label: string;
  estimatedBytes: number;
}

const TEXT = {
  media: "下载媒体",
  type: "下载类型",
  audio: "音频",
  video: "视频",
  progress: "媒体下载进度",
  approximate: "约",
  processing: "处理中...",
  pendingSize: "大小待计算",
  noVideo: "该视频暂未提供可下载的 MP4 清晰度。",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes >= 100 * 1024 ** 2 ? 0 : 1)} MB`;
}

export default function YouTubeMediaDownloads({
  sourceUrl,
  videoInfo,
  onError,
}: YouTubeMediaDownloadsProps) {
  const [mediaType, setMediaType] = useState<MediaDownloadType>("audio");
  const duration = Number(videoInfo.duration) || 0;
  const { states, startDownload, downloadAgain } = useYouTubeMediaDownload({
    sourceUrl,
    title: videoInfo.title,
    duration,
    onError,
  });

  const audioOptions = useMemo<AudioOption[]>(
    () => [320, 256, 192, 128, 64].map((bitrate) => ({
      bitrate,
      label: `${bitrate} Kbps`,
      estimatedBytes: (duration * bitrate * 1000) / 8,
    })),
    [duration],
  );

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

  const audioState = states.audio;
  const videoState = states.video;
  const selectedState = states[mediaType];

  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <Download className="h-3.5 w-3.5" />
        {TEXT.media}
      </h4>

      <Tabs
        selectedKey={mediaType}
        onSelectionChange={(key) => setMediaType(key as MediaDownloadType)}
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

        <DownloadStatusPanel
          type={mediaType}
          state={selectedState}
          onDownloadAgain={downloadAgain}
        />

        <Tabs.Panel id="audio">
          <div className="grid gap-2 sm:grid-cols-2">
            {audioOptions.map((option) => {
              const pendingId = `audio-${option.bitrate}`;
              return (
                <Button
                  key={option.bitrate}
                  variant="secondary"
                  onPress={() => void startDownload({
                    type: "audio",
                    pendingId,
                    label: `MP3 ${option.label} 音频`,
                    audioBitrate: option.bitrate,
                  })}
                  isPending={audioState.pendingId === pendingId}
                  isDisabled={audioState.pendingId !== null}
                  className="h-auto min-h-16 w-full justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-left text-teal-900 hover:border-teal-400 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-100 dark:hover:bg-teal-900/40"
                >
                  <span className="flex flex-col items-start">
                    <span className="font-semibold">MP3</span>
                    <span className="text-xs font-normal text-teal-700/80 dark:text-teal-300/80">
                      {TEXT.approximate} {formatFileSize(option.estimatedBytes)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">
                    {audioState.pendingId === pendingId ? TEXT.processing : option.label}
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
                    onPress={() => void startDownload({
                      type: "video",
                      pendingId,
                      label: `MP4 ${option.qualityLabel} 视频`,
                      videoItag: option.itag,
                    })}
                    isPending={videoState.pendingId === pendingId}
                    isDisabled={videoState.pendingId !== null}
                    className="h-auto min-h-16 w-full justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-semibold">MP4</span>
                      <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">
                        {estimatedBytes > 0 ? formatFileSize(estimatedBytes) : TEXT.pendingSize}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">
                      {videoState.pendingId === pendingId ? TEXT.processing : option.qualityLabel}
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

function DownloadStatusPanel({
  type,
  state,
  onDownloadAgain,
}: {
  type: MediaDownloadType;
  state: MediaDownloadState;
  onDownloadAgain: (type: MediaDownloadType) => void;
}) {
  if (state.status === "idle") return null;

  const isReady = state.status === "ready" && Boolean(state.downloadUrl);
  const isFailed = state.status === "failed";

  return (
    <div
      className={clsx(
        "mb-3 rounded-md border p-3",
        isFailed
          ? "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
          : "border-teal-200 bg-teal-50 dark:border-teal-900/70 dark:bg-teal-950/30",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className={clsx("min-w-0 text-xs", isFailed ? "text-red-700 dark:text-red-200" : "text-teal-800 dark:text-teal-200")}>
          <p className="truncate font-medium">{state.message}</p>
          {state.label && <p className="mt-0.5 truncate opacity-70">{state.label}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={clsx("font-mono text-xs", isFailed ? "text-red-700 dark:text-red-200" : "text-teal-800 dark:text-teal-200")}>
            {state.progress}%
          </span>
          {isReady && (
            <Button size="sm" variant="secondary" onPress={() => onDownloadAgain(type)}>
              <RotateCcw className="h-3.5 w-3.5" />
              再次下载
            </Button>
          )}
        </div>
      </div>
      <ProgressBar
        value={state.progress}
        size="sm"
        color={isReady ? "success" : isFailed ? "danger" : "accent"}
        aria-label={`${type === "audio" ? TEXT.audio : TEXT.video}${TEXT.progress}`}
      />
    </div>
  );
}
