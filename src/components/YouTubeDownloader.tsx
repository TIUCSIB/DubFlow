"use client";

import { useCallback, useState } from "react";
import type {
  SubtitleEntry,
  TargetLanguage,
  TranslatedEntry,
} from "@/types";
import { Button, Input, toast } from "@heroui/react";
import { AlertCircle, Captions, Download, Link } from "lucide-react";
import { getApiKeyHeaders } from "@/lib/api-key-storage";
import {
  createSubtitleUrl,
  parseSrtToEntries,
  readTranslateStream,
  type CaptionTrack,
} from "@/lib/youtube-subtitle-client";
import YouTubeMediaDownloads, { type MediaFormat } from "@/components/YouTubeMediaDownloads";
import YouTubeVideoSummary from "@/components/YouTubeVideoSummary";
import { YouTubeAccessNotice } from "@/components/YouTubeStatusNotice";

interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  duration: string;
  thumbnail: string;
  publishedAt?: string | null;
  viewCount?: number | null;
  captionTracks: CaptionTrack[];
  formats: MediaFormat[];
  audioFormats: MediaFormat[];
  accessLimited?: boolean;
  accessMessage?: string;
}

interface YouTubeDownloaderProps {
  targetLanguage: TargetLanguage;
  onSubtitleLoad: (original: SubtitleEntry[], translated: TranslatedEntry[]) => void;
  onError: (message: string) => void;
}
export default function YouTubeDownloader({
  targetLanguage,
  onSubtitleLoad,
  onError,
}: YouTubeDownloaderProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadingSubtitle, setDownloadingSubtitle] = useState<string | null>(null);
  const [loadingToEditor, setLoadingToEditor] = useState(false);
  const [loadingToEditorStatus, setLoadingToEditorStatus] = useState("");

  const handleFetch = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setVideoInfo(null);
    onError("");
    try {
      const response = await fetch(`/api/youtube/info?url=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "获取视频信息失败");
      setVideoInfo(data);
      if (data.accessLimited) {
        toast.warning("已加载视频基础信息", {
          description: "YouTube 暂时限制了字幕和媒体访问。",
        });
      } else {
        toast.success("视频信息解析成功");
      }
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "获取视频信息失败");
    } finally {
      setLoading(false);
    }
  }, [url, onError]);

  const handleLoadSubtitleToEditor = useCallback(
    async (track: CaptionTrack) => {
      setLoadingToEditor(true);
      setLoadingToEditorStatus("正在下载字幕...");
      onError("");
      try {
        const response = await fetch(
          createSubtitleUrl(track, videoInfo?.videoId),
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "字幕下载失败");
        const entries = parseSrtToEntries(data.srtContent);
        if (entries.length === 0) throw new Error("字幕内容为空");
        setLoadingToEditorStatus(`正在翻译 ${entries.length} 条字幕...`);
        const translateResponse = await fetch("/api/process", {
          method: "POST",
          headers: getApiKeyHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            type: "srt",
            srtContent: data.srtContent,
            autoTranslate: true,
            sourceLanguage: "auto",
            targetLanguage,
          }),
        });
        if (!translateResponse.ok) {
          const err = await translateResponse.json().catch(() => null);
          throw new Error(err?.error || "自动翻译失败");
        }
        const translated = await readTranslateStream(translateResponse);
        onSubtitleLoad(entries, translated);
        toast.success("字幕已加载到编辑器", {
          description: `共 ${entries.length} 条字幕，自动翻译已经完成。`,
        });
      } catch (error: unknown) {
        onError(error instanceof Error ? error.message : "字幕加载失败");
      } finally {
        setLoadingToEditor(false);
        setLoadingToEditorStatus("");
      }
    },
    [onSubtitleLoad, onError, targetLanguage],
  );

  const handleDownloadSubtitle = useCallback(
    async (track: CaptionTrack) => {
      setDownloadingSubtitle(track.languageCode);
      onError("");
      try {
        const response = await fetch(
          createSubtitleUrl(track, videoInfo?.videoId),
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "字幕下载失败");
        if (typeof data.srtContent !== "string" || !data.srtContent.trim()) {
          throw new Error("字幕内容为空，请稍后重试或更换字幕轨道");
        }
        const blob = new Blob([data.srtContent], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `${videoInfo?.title || "subtitle"}_${track.languageCode}.srt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        toast.success("字幕文件已下载");
      } catch (error: unknown) {
        onError(error instanceof Error ? error.message : "字幕下载失败");
      } finally {
        setDownloadingSubtitle(null);
      }
    },
    [videoInfo, onError],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-500" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴 YouTube 视频链接..."
            aria-label="YouTube 链接"
            fullWidth
            variant="secondary"
            className="pl-9"
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
        </div>
        <Button
          variant="primary"
          onPress={handleFetch}
          isPending={loading}
          isDisabled={!url.trim()}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 shrink-0"
        >
          {loading ? "解析中..." : "解析"}
        </Button>
      </div>

      {videoInfo && (
        <div className="fade-in-up space-y-4">
          <YouTubeVideoSummary
            title={videoInfo.title}
            author={videoInfo.author}
            duration={videoInfo.duration}
            thumbnail={videoInfo.thumbnail}
            publishedAt={videoInfo.publishedAt}
            viewCount={videoInfo.viewCount}
          />

          {videoInfo.accessLimited && <YouTubeAccessNotice message={videoInfo.accessMessage} />}

          {!videoInfo.accessLimited && videoInfo.captionTracks.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                <Captions className="h-3.5 w-3.5" />
                可用字幕
              </h4>
              <div className="space-y-1.5">
                {videoInfo.captionTracks.map((track) => (
                  <div key={track.languageCode} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{track.languageName}</span>
                      {track.isAutoGenerated && (
                        <span className="ml-2 text-[10px] text-gray-400">自动生成</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => void handleLoadSubtitleToEditor(track)}
                        isDisabled={loadingToEditor || downloadingSubtitle !== null}
                        isPending={loadingToEditor}
                      >
                        <Captions className="h-3.5 w-3.5" />
                        {loadingToEditor ? loadingToEditorStatus || "加载中..." : "加载到编辑器"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => void handleDownloadSubtitle(track)}
                        isDisabled={loadingToEditor || downloadingSubtitle !== null}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!videoInfo.accessLimited && videoInfo.captionTracks.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              该视频没有可用的字幕轨道
            </div>
          )}

          {!videoInfo.accessLimited && (
            <YouTubeMediaDownloads
              sourceUrl={url}
              videoInfo={videoInfo}
              onError={onError}
            />
          )}
        </div>
      )}
    </div>
  );
}
