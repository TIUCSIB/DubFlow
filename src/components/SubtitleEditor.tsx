"use client";

import { useMemo, useState } from "react";
import type { SubtitleEntry, TranslatedEntry } from "@/types";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Loader2, Play, Search } from "lucide-react";
import { Button, Card, Input, ToggleButton, ToggleButtonGroup, Tooltip } from "@heroui/react";

interface SubtitleEditorProps {
  entries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
  onUpdateTranslation: (index: number, text: string) => void;
  onPreviewTranslation: (index: number) => void;
  previewingIndex: number | null;
}

type SubtitleFilter = "all" | "missing" | "ready";

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
  onPreviewTranslation,
  previewingIndex,
}: SubtitleEditorProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SubtitleFilter>("all");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return translatedEntries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const matchesQuery =
          !normalizedQuery ||
          entry.text.toLocaleLowerCase().includes(normalizedQuery) ||
          entry.translatedText.toLocaleLowerCase().includes(normalizedQuery);
        const hasTranslation = Boolean(entry.translatedText.trim());
        const matchesFilter =
          filter === "all" ||
          (filter === "missing" && !hasTranslation) ||
          (filter === "ready" && hasTranslation);

        return matchesQuery && matchesFilter;
      });
  }, [filter, query, translatedEntries]);

  const translatedCount = translatedEntries.filter((entry) =>
    entry.translatedText.trim(),
  ).length;

  return (
    <Card className="fade-in-up">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Clock className="h-4 w-4 text-teal-500 dark:text-teal-400" />
        <h2 className="text-sm font-semibold dark:text-gray-200 text-gray-800">
          字幕编辑器
        </h2>
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-300">
          {entries.length} 条
        </span>
        <span className="ml-auto text-xs dark:text-gray-500 text-gray-400">
          已翻译 {translatedCount} / {entries.length}
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索原文或译文..."
            aria-label="搜索字幕"
            fullWidth
            variant="secondary"
            className="pl-9"
          />
        </div>
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={new Set([filter])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as SubtitleFilter | undefined;
            if (selected) setFilter(selected);
          }}
          isDetached
          size="sm"
          aria-label="字幕筛选"
        >
          <ToggleButton id="all">全部</ToggleButton>
          <ToggleButton id="missing">
            <AlertCircle className="h-3.5 w-3.5" />
            待翻译
          </ToggleButton>
          <ToggleButton id="ready">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已翻译
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs dark:text-gray-600 text-gray-400">
        <span>
          当前显示 {filteredEntries.length} 条
          {query.trim() || filter !== "all" ? `，共 ${entries.length} 条` : ""}
        </span>
        <span>支持直接编辑译文</span>
      </div>

      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {filteredEntries.map(({ entry, index }) => (
          <div
            key={entry.index}
            className="group grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-lg border dark:border-gray-800/60 border-gray-200/60 dark:bg-gray-950/60 bg-gray-50/60 p-3 transition-colors dark:hover:border-gray-700 hover:border-gray-300"
          >
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded dark:bg-gray-800 bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] dark:text-gray-500 text-gray-500">
                {formatTime(entry.startMs)} → {formatTime(entry.endMs)}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed dark:text-gray-300 text-gray-700">
                {entry.text}
              </p>
            </div>

            <div className="flex items-center pt-5 dark:text-gray-600 text-gray-400">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>

            <div className="flex min-w-0 items-center gap-2 pt-3">
              <Input
                type="text"
                value={entry.translatedText}
                onChange={(event) =>
                  onUpdateTranslation(index, event.target.value)
                }
                placeholder="输入译文..."
                fullWidth
                variant="secondary"
              />
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    isIconOnly
                    aria-label="试听这条配音"
                    isDisabled={
                      !entry.translatedText.trim() ||
                      (previewingIndex !== null && previewingIndex !== index)
                    }
                    isPending={previewingIndex === index}
                    onPress={() => onPreviewTranslation(index)}
                  >
                    <span aria-hidden="true">
                      {previewingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>试听这条配音</Tooltip.Content>
              </Tooltip>
            </div>
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div className="rounded-lg border border-dashed dark:border-gray-800 border-gray-200 px-4 py-10 text-center text-sm dark:text-gray-500 text-gray-400">
            没有找到匹配的字幕
          </div>
        )}
      </div>
    </Card>
  );
}
