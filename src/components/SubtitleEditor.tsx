"use client";

import type { SubtitleEntry, TranslatedEntry } from "@/types";
import { Clock, ArrowRight } from "lucide-react";
import { Input } from "@heroui/react";

interface SubtitleEditorProps {
  entries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
  onUpdateTranslation: (index: number, text: string) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(2, "0")}`;
}

export default function SubtitleEditor({
  entries,
  translatedEntries,
  onUpdateTranslation,
}: SubtitleEditorProps) {
  return (
    <section className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold dark:text-gray-200 text-gray-800">
          瀛楀箷缂栬緫鍣?        </h2>
        <span className="ml-auto rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
          {entries.length} 鏉?        </span>
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {translatedEntries.map((entry, idx) => (
          <div
            key={entry.index}
            className="group grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-lg border dark:border-gray-800/60 border-gray-200/60 dark:bg-gray-950/60 bg-gray-50/60 p-3 transition-colors dark:hover:border-gray-700 hover:border-gray-300"
          >
            {/* 宸︿晶锛氭椂闂寸爜 + 鍘熸枃 */}
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded dark:bg-gray-800 bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] dark:text-gray-500 text-gray-500">
                {formatTime(entry.startMs)} 鈫?{formatTime(entry.endMs)}
              </span>
              <p className="mt-1 text-sm leading-relaxed dark:text-gray-300 text-gray-700">
                {entry.text}
              </p>
            </div>

            {/* 涓棿绠ご */}
            <div className="flex items-center pt-5 dark:text-gray-600 text-gray-400">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>

            {/* 鍙充晶锛氳瘧鏂囪緭鍏?*/}
            <div className="min-w-0 pt-3">
              <Input
                type="text"
                value={entry.translatedText}
                onChange={(e) => onUpdateTranslation(idx, e.target.value)}
                placeholder="杈撳叆璇戞枃..."
                fullWidth
                variant="secondary"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}