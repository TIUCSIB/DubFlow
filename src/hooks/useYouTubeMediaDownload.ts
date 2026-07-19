"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";

export type MediaDownloadType = "audio" | "video";
type DownloadJobStatus = "preparing" | "downloading" | "processing" | "ready" | "failed";

export interface MediaDownloadState {
  status: DownloadJobStatus | "idle";
  pendingId: string | null;
  progress: number;
  message: string;
  label: string;
  downloadUrl?: string;
}

interface StartDownloadInput {
  type: MediaDownloadType;
  pendingId: string;
  label: string;
  audioBitrate?: number;
  videoItag?: number;
}

interface DownloadJobResponse {
  status: DownloadJobStatus;
  progress: number;
  message: string;
  error?: string;
  downloadUrl?: string;
}

interface UseYouTubeMediaDownloadOptions {
  sourceUrl: string;
  title: string;
  duration: number;
  onError: (message: string) => void;
}

const TEXT = {
  queryFailed: "查询下载进度失败",
  downloadFailed: "下载失败，请重试",
  downloadTimeout: "下载处理超时，请重试",
  creating: "正在创建下载任务...",
  createFailed: "创建下载任务失败",
  ready: "文件已准备完成",
};

function createInitialState(): MediaDownloadState {
  return {
    status: "idle",
    pendingId: null,
    progress: 0,
    message: "",
    label: "",
  };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || fallback;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function downloadFromUrl(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function useYouTubeMediaDownload({
  sourceUrl,
  title,
  duration,
  onError,
}: UseYouTubeMediaDownloadOptions) {
  const [states, setStates] = useState<Record<MediaDownloadType, MediaDownloadState>>({
    audio: createInitialState(),
    video: createInitialState(),
  });
  const controllers = useRef<Partial<Record<MediaDownloadType, AbortController>>>({});

  useEffect(() => {
    const activeControllers = controllers.current;
    return () => Object.values(activeControllers).forEach((controller) => controller?.abort());
  }, []);

  const updateState = useCallback(
    (type: MediaDownloadType, update: Partial<MediaDownloadState>) => {
      setStates((current) => ({
        ...current,
        [type]: { ...current[type], ...update },
      }));
    },
    [],
  );

  const pollDownload = useCallback(
    async (type: MediaDownloadType, jobId: string, signal: AbortSignal) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 30 * 60 * 1000) {
        const response = await fetch(`/api/youtube/download?jobId=${encodeURIComponent(jobId)}`, {
          cache: "no-store",
          signal,
        });
        if (!response.ok) throw new Error(await readError(response, TEXT.queryFailed));

        const job = (await response.json()) as DownloadJobResponse;
        updateState(type, {
          status: job.status,
          progress: job.progress,
          message: job.message,
        });
        if (job.status === "failed") {
          throw new Error(job.error || job.message || TEXT.downloadFailed);
        }
        if (job.status === "ready" && job.downloadUrl) return job.downloadUrl;
        await wait(800);
      }
      throw new Error(TEXT.downloadTimeout);
    },
    [updateState],
  );

  const startDownload = useCallback(
    async ({ type, pendingId, label, audioBitrate, videoItag }: StartDownloadInput) => {
      controllers.current[type]?.abort();
      const controller = new AbortController();
      controllers.current[type] = controller;
      updateState(type, {
        status: "preparing",
        pendingId,
        progress: 1,
        message: TEXT.creating,
        label,
        downloadUrl: undefined,
      });
      onError("");

      try {
        const response = await fetch("/api/youtube/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: sourceUrl.trim(),
            type,
            title,
            duration,
            audioBitrate,
            videoItag,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await readError(response, TEXT.createFailed));

        const { jobId } = (await response.json()) as { jobId: string };
        const downloadUrl = await pollDownload(type, jobId, controller.signal);
        downloadFromUrl(downloadUrl);
        updateState(type, {
          status: "ready",
          pendingId: null,
          progress: 100,
          message: TEXT.ready,
          downloadUrl,
        });
        toast.success(`${label}下载完成`, {
          description: "文件已经保存，也可以在当前标签中再次下载。",
          actionProps: {
            children: "再次下载",
            onPress: () => downloadFromUrl(downloadUrl),
          },
        });
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message = error instanceof Error ? error.message : TEXT.downloadFailed;
        updateState(type, {
          status: "failed",
          pendingId: null,
          message,
          downloadUrl: undefined,
        });
        onError(message);
        toast.danger(message);
      } finally {
        if (controllers.current[type] === controller) {
          delete controllers.current[type];
          updateState(type, { pendingId: null });
        }
      }
    },
    [duration, onError, pollDownload, sourceUrl, title, updateState],
  );

  const downloadAgain = useCallback(
    (type: MediaDownloadType) => {
      const downloadUrl = states[type].downloadUrl;
      if (downloadUrl) downloadFromUrl(downloadUrl);
    },
    [states],
  );

  return { states, startDownload, downloadAgain };
}
