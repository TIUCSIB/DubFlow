"use client";

import {
  Download,
  Languages,
  Mic,
  Volume2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, ProgressBar, Spinner } from "@heroui/react";
import clsx from "clsx";

interface Step {
  key: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
}

interface PipelineProgressProps {
  status: string;
  progress: number;
  steps: Step[];
}

const STEP_ICONS: Record<string, React.ElementType> = {
  download: Download,
  translate: Languages,
  clone: Mic,
  synthesize: Volume2,
};

export default function PipelineProgress({
  status,
  progress,
  steps,
}: PipelineProgressProps) {
  return (
    <Card>
      {/* 顶部进度条 */}
      <div className="mb-4">
        <ProgressBar
          value={progress}
          size="sm"
          color="accent"
          aria-label="处理进度"
        >
          <span className="text-xs font-medium text-gray-400">处理进度</span>
        </ProgressBar>
      </div>

      {/* 步骤条 */}
      <div className="flex items-start justify-between">
        {steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.key] ?? CheckCircle2;
          const isActive = step.status === "active";
          const isDone = step.status === "done";
          const isError = step.status === "error";
          const isPending = step.status === "pending";

          return (
            <div key={step.key} className="flex flex-1 items-start">
              {/* 步骤圆点 */}
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    isDone &&
                      "border-emerald-500 bg-emerald-500/15 text-emerald-400",
                    isActive &&
                     "border-teal-500 bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/30",
                    isError &&
                      "border-red-500 bg-red-500/15 text-red-400",
                    isPending &&
                      "dark:border-gray-700 border-gray-300 dark:bg-gray-800 bg-gray-100 dark:text-gray-600 text-gray-400",
                  )}
                >
                  {isActive && <Spinner size="sm" color="current" />}
                  {isDone && <CheckCircle2 className="h-4 w-4" />}
                  {isError && <AlertCircle className="h-4 w-4" />}
                  {isPending && <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={clsx(
                    "mt-2 text-center text-xs font-medium",
                    isActive && "text-teal-400",
                    isDone && "text-emerald-400",
                    isError && "text-red-400",
                    isPending && "dark:text-gray-600 text-gray-400",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* 连接线 */}
              {idx < steps.length - 1 && (
                <div className="mx-2 mt-4 h-0.5 flex-1">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-colors duration-300",
                      isDone
                        ? "bg-emerald-500/60"
                        : isActive
                         ? "bg-gradient-to-r from-teal-500/60 to-gray-800"
                          : "dark:bg-gray-800 bg-gray-200",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 当前状态描述 */}
      {status && (
        <p className="mt-4 text-center text-xs dark:text-gray-500 text-gray-400">{status}</p>
      )}
    </Card>
  );
}
