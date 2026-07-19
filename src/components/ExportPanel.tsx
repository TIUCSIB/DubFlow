"use client";

import { useCallback, useState } from "react";
import type { ExportProgress } from "@/types";
import { FileAudio, FileText, Loader2, Volume2 } from "lucide-react";
import { Button, Card, Checkbox, ProgressBar } from "@heroui/react";

interface ExportPanelProps {
  hasEntries: boolean;
  onExport: (options: {
    srtBilingual: boolean;
    withAudio: boolean;
  }) => Promise<void>;
  isExporting: boolean;
  isExportingSrt: boolean;
  exportProgress: ExportProgress | null;
}

export default function ExportPanel({
  hasEntries,
  onExport,
  isExporting,
  isExportingSrt,
  exportProgress,
}: ExportPanelProps) {
  const [srtBilingual, setSrtBilingual] = useState(false);

  const handleExport = useCallback(
    (withAudio: boolean) => {
      onExport({ srtBilingual, withAudio });
    },
    [onExport, srtBilingual],
  );

  const progressValue =
    exportProgress && exportProgress.total > 0
      ? (exportProgress.current / exportProgress.total) * 100
      : 0;
  const progressLabel =
    exportProgress?.phase === "merging"
      ? "正在合并音频片段..."
      : exportProgress
        ? `正在合成第 ${exportProgress.current} / ${exportProgress.total} 条`
        : "";

  return (
    <Card className="fade-in-up">
      <h2 className="mb-4 text-sm font-semibold dark:text-gray-200 text-gray-800">
        导出设置
      </h2>

      <div className="mb-4">
        <Checkbox isSelected={srtBilingual} onChange={setSrtBilingual}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span className="text-sm dark:text-gray-300 text-gray-700">
              生成中英双语字幕
            </span>
          </Checkbox.Content>
        </Checkbox>
      </div>

      {isExporting && exportProgress && (
        <div className="mb-4 rounded-lg border border-teal-500/20 bg-teal-500/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-teal-600 dark:text-teal-300">{progressLabel}</span>
            <span className="font-mono text-teal-500 dark:text-teal-400">
              {Math.round(progressValue)}%
            </span>
          </div>
          <ProgressBar
            value={progressValue}
            size="sm"
            color="accent"
            aria-label="配音合成进度"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          fullWidth
          variant="primary"
          onPress={() => handleExport(false)}
          isDisabled={!hasEntries || isExporting || isExportingSrt}
          isPending={isExportingSrt}
          className="bg-gray-800 text-gray-100 dark:bg-gray-800"
        >
          <FileText className="h-4 w-4" />
          仅导出字幕文件
        </Button>
        <Button
          fullWidth
          variant="primary"
          onPress={() => handleExport(true)}
          isDisabled={!hasEntries || isExporting}
          isPending={isExporting}
          className="bg-gradient-to-r from-teal-600 to-emerald-600"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {isExporting ? "正在合成配音..." : "合成配音并导出"}
        </Button>

        <p className="text-center text-xs dark:text-gray-500 text-gray-400">
          字幕文件可以单独导出；需要完整配音时再启动逐条合成。
        </p>
      </div>
    </Card>
  );
}

interface DownloadLinksProps {
  audioDownloadUrl: string | null;
  srtDownloadUrl: string | null;
  audioFilename: string;
  srtFilename: string;
}

export function DownloadLinks({
  audioDownloadUrl,
  srtDownloadUrl,
  audioFilename,
  srtFilename,
}: DownloadLinksProps) {
  if (!audioDownloadUrl && !srtDownloadUrl) return null;

  return (
    <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
      <h3 className="mb-3 text-sm font-medium text-green-400">
        {audioDownloadUrl ? "合成完成！" : "字幕已导出！"}
      </h3>
      <div className="flex flex-col gap-2">
        {audioDownloadUrl && (
          <a
            href={audioDownloadUrl}
            download={audioFilename}
            className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20"
          >
            <FileAudio className="h-4 w-4" />
            下载配音音频
          </a>
        )}
        {srtDownloadUrl && (
          <a
            href={srtDownloadUrl}
            download={srtFilename}
            className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20"
          >
            <FileText className="h-4 w-4" />
            下载 SRT 字幕
          </a>
        )}
      </div>
    </div>
  );
}
