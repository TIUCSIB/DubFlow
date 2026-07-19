import { randomUUID } from "crypto";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import {
  processYouTubeDownload,
  type DownloadProcessInput,
} from "@/lib/youtube-download-process";

export type DownloadJobStatus =
  | "preparing"
  | "downloading"
  | "processing"
  | "ready"
  | "failed";

export interface StartDownloadJobInput extends Omit<DownloadProcessInput, "tempDirectory"> {
  title: string;
}

interface DownloadJob extends StartDownloadJobInput {
  id: string;
  status: DownloadJobStatus;
  progress: number;
  message: string;
  tempDirectory: string;
  outputPath?: string;
  extension?: "mp3" | "mp4";
  size?: number;
  error?: string;
  updatedAt: number;
}

export interface DownloadJobSnapshot {
  id: string;
  status: DownloadJobStatus;
  progress: number;
  message: string;
  error?: string;
}

export interface DownloadJobFile {
  path: string;
  filename: string;
  contentType: string;
  size: number;
}

const JOB_EXPIRY_MS = 60 * 60 * 1000;
const globalJobs = globalThis as typeof globalThis & {
  dubflowYouTubeDownloadJobs?: Map<string, DownloadJob>;
};
const jobs = globalJobs.dubflowYouTubeDownloadJobs ?? new Map<string, DownloadJob>();
globalJobs.dubflowYouTubeDownloadJobs = jobs;

async function removeDirectory(directory: string) {
  await rm(directory, { recursive: true, force: true }).catch(() => undefined);
}

function pruneExpiredJobs() {
  const expiresBefore = Date.now() - JOB_EXPIRY_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt < expiresBefore) {
      jobs.delete(id);
      void removeDirectory(job.tempDirectory);
    }
  }
}

function updateJob(job: DownloadJob, update: Partial<DownloadJob>) {
  Object.assign(job, update, { updatedAt: Date.now() });
  if (typeof update.progress === "number") {
    job.progress = Math.max(0, Math.min(100, Math.round(update.progress)));
  }
}

async function runJob(job: DownloadJob) {
  try {
    const result = await processYouTubeDownload(job, (update) => updateJob(job, update));
    updateJob(job, {
      status: "ready",
      progress: 100,
      message: "\u6587\u4ef6\u51c6\u5907\u5b8c\u6210",
      ...result,
    });
  } catch (error: unknown) {
    await removeDirectory(job.tempDirectory);
    const message = error instanceof Error
      ? error.message
      : "\u4e0b\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5";
    updateJob(job, { status: "failed", message, error: message });
  }
}

export function startDownloadJob(input: StartDownloadJobInput): DownloadJobSnapshot {
  pruneExpiredJobs();
  const id = randomUUID();
  const job: DownloadJob = {
    ...input,
    id,
    status: "preparing",
    progress: 1,
    message: "\u6b63\u5728\u521b\u5efa\u4e0b\u8f7d\u4efb\u52a1...",
    tempDirectory: path.join(os.tmpdir(), `dubflow-youtube-${id}`),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  void runJob(job);
  return getDownloadJob(id)!;
}

export function getDownloadJob(id: string): DownloadJobSnapshot | null {
  pruneExpiredJobs();
  const job = jobs.get(id);
  if (!job) return null;
  const { status, progress, message, error } = job;
  return { id, status, progress, message, error };
}

export function getDownloadJobFile(id: string): DownloadJobFile | null {
  const job = jobs.get(id);
  if (!job || job.status !== "ready" || !job.outputPath || !job.extension || !job.size) return null;
  const safeTitle = job.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").trim()
    || "dubflow-download";
  return {
    path: job.outputPath,
    filename: `${safeTitle}.${job.extension}`,
    contentType: job.extension === "mp3" ? "audio/mpeg" : "video/mp4",
    size: job.size,
  };
}

export async function cleanupDownloadJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  await removeDirectory(job.tempDirectory);
}
