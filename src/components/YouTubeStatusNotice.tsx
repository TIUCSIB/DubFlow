"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

interface SuccessNoticeProps {
  message: string;
  onDismiss: () => void;
}

export function YouTubeSuccessNotice({ message, onDismiss }: SuccessNoticeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 text-emerald-500 hover:text-emerald-700">
        &times;
      </button>
    </div>
  );
}

export function YouTubeAccessNotice({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
