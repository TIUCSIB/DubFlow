"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SubtitleEntry, TranslatedEntry } from "@/types";
import {
  Captions,
  Check,
  Clipboard,
  Download,
  FileText,
  Languages,
} from "lucide-react";
import { Button, Card, Tabs } from "@heroui/react";

export type AudioResultView = "recognized" | "translated" | "bilingual";

interface AudioResultPanelProps {
  entries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
  selectedView: AudioResultView;
  onViewChange: (view: AudioResultView) => void;
}

export default function AudioResultPanel({
  entries,
  translatedEntries,
  selectedView,
  onViewChange,
}: AudioResultPanelProps) {
  const [copiedView, setCopiedView] = useState<
    "recognized" | "translated" | null
  >(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recognizedText = useMemo(
    () => entries.map((entry) => entry.text.trim()).filter(Boolean).join("\n\n"),
    [entries],
  );
  const translatedText = useMemo(
    () =>
      translatedEntries
        .map((entry) => entry.translatedText.trim())
        .filter(Boolean)
        .join("\n\n"),
    [translatedEntries],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

  const handleCopy = useCallback(
    async (view: "recognized" | "translated") => {
      const text = view === "recognized" ? recognizedText : translatedText;
      if (!text) return;

      await copyText(text);
      setCopiedView(view);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopiedView(null), 1800);
    },
    [recognizedText, translatedText],
  );

  const handleDownload = useCallback(
    (view: "recognized" | "translated") => {
      const text = view === "recognized" ? recognizedText : translatedText;
      if (!text) return;

      const filename =
        view === "recognized"
          ? "dubflow-recognized-text.txt"
          : "dubflow-translated-text.txt";
      downloadText(text, filename);
    },
    [recognizedText, translatedText],
  );

  const renderTextPanel = (
    view: "recognized" | "translated",
    text: string,
  ) => {
    const isRecognized = view === "recognized";
    const hasCopied = copiedView === view;

    return (
      <div className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isRecognized
              ? "\u8fd9\u662f\u8bed\u97f3\u8bc6\u522b\u540e\u7684\u539f\u6587\u3002"
              : "\u8fd9\u662f\u7ffb\u8bd1\u540e\u7684\u6587\u672c\uff0c\u53ef\u76f4\u63a5\u590d\u5236\u6216\u4e0b\u8f7d\u3002"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={!text}
              onPress={() => void handleCopy(view)}
            >
              {hasCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {hasCopied
                ? "\u5df2\u590d\u5236"
                : "\u590d\u5236\u6587\u672c"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={!text}
              onPress={() => handleDownload(view)}
            >
              <Download className="h-4 w-4" />
              {"\u4e0b\u8f7d TXT"}
            </Button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          {text ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {text}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {"\u6682\u65e0\u53ef\u663e\u793a\u7684\u6587\u672c"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="fade-in-up">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-teal-500 dark:text-teal-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {"\u8bc6\u522b\u7ed3\u679c"}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {entries.length} {"\u6bb5"}
        </span>
      </div>

      <Tabs
        selectedKey={selectedView}
        onSelectionChange={(key) =>
          onViewChange(String(key) as AudioResultView)
        }
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label={"\u67e5\u770b\u8bc6\u522b\u7ed3\u679c"}
            className="w-full"
          >
            <Tabs.Tab id="recognized" className="min-h-11 flex-1 gap-2 px-3">
              <Languages className="h-4 w-4" />
              <span>{"\u8bc6\u522b\u6587\u672c"}</span>
              <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
            </Tabs.Tab>
            <Tabs.Tab id="translated" className="min-h-11 flex-1 gap-2 px-3">
              <FileText className="h-4 w-4" />
              <span>{"\u7ffb\u8bd1\u6587\u672c"}</span>
              <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
            </Tabs.Tab>
            <Tabs.Tab id="bilingual" className="min-h-11 flex-1 gap-2 px-3">
              <Captions className="h-4 w-4" />
              <span>{"\u53cc\u8bed\u5b57\u5e55"}</span>
              <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="recognized">
          {renderTextPanel("recognized", recognizedText)}
        </Tabs.Panel>
        <Tabs.Panel id="translated">
          {renderTextPanel("translated", translatedText)}
        </Tabs.Panel>
        <Tabs.Panel id="bilingual">
          <div className="mt-4 rounded-lg border border-teal-500/20 bg-teal-500/10 p-4">
            <div className="flex items-start gap-3">
              <Captions className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <div>
                <p className="text-sm font-medium text-teal-700 dark:text-teal-200">
                  {"\u53cc\u8bed\u5b57\u5e55\u7f16\u8f91\u6a21\u5f0f"}
                </p>
                <p className="mt-1 text-xs leading-6 text-teal-600/70 dark:text-teal-200/70">
                  {"\u53ef\u4ee5\u5728\u4e0b\u65b9\u6309\u65f6\u95f4\u8f74\u9010\u6761\u4fee\u6539\u8bd1\u6587\uff0c\u5e76\u8bd5\u542c\u914d\u97f3\u3002"}
                </p>
              </div>
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the hidden textarea when clipboard permissions are unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([`\uFEFF${text}`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
