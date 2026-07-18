"use client";

import type { AudioProcessProgress } from "@/lib/audio-processing";
import {
  CheckCircle2,
  FileAudio,
  Languages,
  Loader2,
  Scissors,
} from "lucide-react";
import { ProgressBar } from "@heroui/react";

interface ProcessingProgressProps {
  progress: AudioProcessProgress;
}

export default function ProcessingProgress({
  progress,
}: ProcessingProgressProps) {
  const isComplete =
    progress.stage === "processing" && progress.current >= progress.total;
  const isIndeterminate =
    !isComplete &&
    (progress.stage === "extracting" ||
      progress.stage === "preparing" ||
      progress.stage === "processing");

  return (
    <div className="mt-3 rounded-lg border border-teal-500/20 bg-teal-500/10 p-3">
      <div className="mb-2 flex items-center gap-2">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : progress.stage === "reading" ? (
          <FileAudio className="h-4 w-4 text-teal-400" />
        ) : progress.stage === "preparing" ? (
          <Scissors className="h-4 w-4 text-teal-400" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
        )}
        <span className="min-w-0 flex-1 text-xs font-medium text-teal-700 dark:text-teal-200">
          {getProgressLabel(progress)}
        </span>
        <span className="font-mono text-xs text-teal-500 dark:text-teal-300">
          {progress.percent}%
        </span>
      </div>

      <ProgressBar
        value={progress.percent}
        isIndeterminate={isIndeterminate}
        size="sm"
        color="accent"
        aria-label={"\u97f3\u9891\u5904\u7406\u8fdb\u5ea6"}
      />

      {progress.stage === "processing" && progress.total > 1 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-600/70 dark:text-teal-200/70">
          <Languages className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
          <span>
            {"\u5df2\u5b8c\u6210"} {progress.current} / {progress.total}{" "}
            {"\u6279"}
          </span>
        </div>
      )}
    </div>
  );
}

function getProgressLabel(progress: AudioProcessProgress): string {
  if (progress.stage === "reading") {
    return "\u6b63\u5728\u8bfb\u53d6\u97f3\u9891\u6587\u4ef6...";
  }
  if (progress.stage === "extracting") {
    return "\u6b63\u5728\u4ece\u89c6\u9891\u4e2d\u63d0\u53d6\u97f3\u9891...";
  }
  if (progress.stage === "preparing") {
    return "\u6b63\u5728\u51c6\u5907\u97f3\u9891\u5206\u7247...";
  }
  if (progress.current >= progress.total) {
    return "\u7ffb\u8bd1\u5df2\u5b8c\u6210";
  }

  return `\u5df2\u5b8c\u6210 ${progress.current} / ${progress.total} \u6279\uff0c\u6b63\u5728\u7ee7\u7eed...`;
}
