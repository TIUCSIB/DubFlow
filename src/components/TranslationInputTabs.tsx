"use client";

import { useCallback, useState } from "react";
import type { ASRLanguage, SubtitleEntry, TranslatedEntry } from "@/types";
import { Button, Card, Tabs } from "@heroui/react";
import { FileText, Type, Upload, Video } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import YouTubeDownloader from "@/components/YouTubeDownloader";
import ProcessingProgress from "@/components/ProcessingProgress";
import SourceLanguageSelect from "@/components/SourceLanguageSelect";
import {
  type AudioProcessProgress,
  extractAudioFromVideo,
  fileToBase64,
  getAudioFormat,
  isDirectAudioFile,
  processAudioInput,
} from "@/lib/audio-processing";
import { getApiKeyHeaders, getDeepLApiKey, getTranslationProvider } from "@/lib/api-key-storage";

interface TranslationInputTabsProps {
  inputMode: "text" | "file" | "srt" | "youtube";
  originalEntries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
  onInputModeChange: (mode: "text" | "file" | "srt" | "youtube") => void;
  onOriginalEntriesChange: (entries: SubtitleEntry[]) => void;
  onTranslatedEntriesChange: (entries: TranslatedEntry[]) => void;
  onError: (message: string) => void;
}

export default function TranslationInputTabs({
  inputMode,
  originalEntries,
  translatedEntries,
  onInputModeChange,
  onOriginalEntriesChange,
  onTranslatedEntriesChange,
  onError,
}: TranslationInputTabsProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtContent, setSrtContent] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<ASRLanguage>("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] =
    useState<AudioProcessProgress | null>(null);

  const handleAudioFileSelect = useCallback(
    (file: File) => {
      setAudioFile(file);
      onError("");
    },
    [onError],
  );

  const handleSrtFileSelect = useCallback(
    (file: File) => {
      setSrtFile(file);
      onError("");

      const reader = new FileReader();
      reader.onload = (event) => {
        setSrtContent((event.target?.result as string) || "");
      };
      reader.readAsText(file);
    },
    [onError],
  );

  const handleProcessFile = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress({
      stage: "reading",
      current: 0,
      total: 1,
      percent: 1,
    });
    onError("");
    onOriginalEntriesChange([]);
    onTranslatedEntriesChange([]);

    try {
      if (inputMode === "file" && audioFile) {
        const reportProgress = (progress: AudioProcessProgress) => {
          setProcessingProgress(progress);
        };
        const audioPayload = isDirectAudioFile(audioFile)
          ? {
              audioBase64: await fileToBase64(audioFile, reportProgress),
              audioFormat: getAudioFormat(audioFile),
            }
          : await (async () => {
              reportProgress({
                stage: "extracting",
                current: 0,
                total: 1,
                percent: 15,
              });
              const payload = await extractAudioFromVideo(audioFile);
              reportProgress({
                stage: "extracting",
                current: 1,
                total: 1,
                percent: 20,
              });
              return payload;
            })();

        const data = await processAudioInput(
          audioPayload,
          sourceLanguage,
          reportProgress,
        );
        onOriginalEntriesChange(data.entries);
        onTranslatedEntriesChange(data.translatedEntries || []);
      } else if (inputMode === "srt" && srtContent) {
        setProcessingProgress({
          stage: "processing",
          current: 0,
          total: 1,
          percent: 30,
        });
        const translationProvider = getTranslationProvider();
        const processResponse = await fetch("/api/process", {
          method: "POST",
          headers: getApiKeyHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            type: "srt",
            srtContent,
            autoTranslate: true,
            sourceLanguage,
            translationProvider,
            deeplApiKey: translationProvider === "deepl" ? getDeepLApiKey() : undefined,
          }),
        });

        if (!processResponse.ok) {
          const error = await processResponse.json().catch(() => null);
          throw new Error(error?.error || "Subtitle processing failed");
        }

        // 读取流式响应，实时更新翻译进度
        const reader = processResponse.body?.getReader();
        if (!reader) throw new Error("无法读取服务端响应");
        const decoder = new TextDecoder();
        let buffer = "";
        let resultData: { entries: typeof originalEntries; translatedEntries: typeof translatedEntries } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.type === "progress") {
              setProcessingProgress({
                stage: "processing",
                current: event.current,
                total: event.total,
                percent: Math.round((event.current / event.total) * 100),
              });
            }
            if (event.type === "complete") {
              resultData = { entries: event.entries, translatedEntries: event.translatedEntries };
            }
          }

          if (done) break;
        }

        if (!resultData) throw new Error("翻译服务未返回结果");
        setProcessingProgress({
          stage: "processing",
          current: resultData.translatedEntries.length,
          total: resultData.translatedEntries.length,
          percent: 100,
        });
        onOriginalEntriesChange(resultData.entries);
        onTranslatedEntriesChange(resultData.translatedEntries || []);
      }
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
    }
  }, [
    audioFile,
    inputMode,
    onError,
    onOriginalEntriesChange,
    onTranslatedEntriesChange,
    sourceLanguage,
    srtContent,
  ]);

  const handleSelectionChange = useCallback(
    (key: unknown) => {
      onInputModeChange(String(key) as typeof inputMode);
      onError("");
    },
    [onError, onInputModeChange],
  );

  const entryCount = originalEntries.length || translatedEntries.length;

  return (
    <Card className="fade-in-up">
      <h2 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {"\u9009\u62e9\u8f93\u5165\u65b9\u5f0f"}
      </h2>

      <Tabs
        selectedKey={inputMode}
        onSelectionChange={handleSelectionChange}
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label={"\u9009\u62e9\u8f93\u5165\u65b9\u5f0f"}
            className="w-full"
          >
            <Tabs.Tab id="file" className="min-h-11 flex-1 gap-2 px-3">
              <Upload className="h-4 w-4" />
              <span>{"\u97f3\u9891/\u89c6\u9891"}</span>
            <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
          </Tabs.Tab>
          <Tabs.Tab id="srt" className="min-h-11 flex-1 gap-2 px-3">
            <FileText className="h-4 w-4" />
            <span>SRT {"\u5b57\u5e55"}</span>
            <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
          </Tabs.Tab>
            <Tabs.Tab id="text" className="min-h-11 flex-1 gap-2 px-3">
              <Type className="h-4 w-4" />
              <span>{"\u6587\u672c\u8f93\u5165"}</span>
              <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
            </Tabs.Tab>
          <Tabs.Tab id="youtube" className="min-h-11 flex-1 gap-2 px-3">
            <Video className="h-4 w-4" />
            <span>YouTube</span>
            <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
          </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="file" className="px-1">
          <div className="mt-4">
            <FileUploader
              accept="video/*,audio/*,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg"
              maxSizeMB={200}
              onFileSelect={handleAudioFileSelect}
              title={"\u4e0a\u4f20\u97f3\u9891\u6216\u89c6\u9891\u6587\u4ef6"}
              description={"\u652f\u6301 MP4\u3001MOV\u3001AVI\u3001MP3\u3001WAV \u683c\u5f0f"}
              icon="video"
            />
            <SourceLanguageSelect
              value={sourceLanguage}
              onChange={setSourceLanguage}
            />
            {audioFile && (
              <>
                <Button
                  fullWidth
                  variant="primary"
                  className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600"
                  onPress={handleProcessFile}
                  isPending={isProcessing}
                >
                  {isProcessing
                    ? "\u6b63\u5728\u8bc6\u522b..."
                    : "\u5f00\u59cb\u8bc6\u522b"}
                </Button>
                {processingProgress && (
                  <ProcessingProgress progress={processingProgress} />
                )}
              </>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="srt" className="px-1">
          <div className="mt-4">
            <FileUploader
              accept=".srt,text/srt"
              maxSizeMB={10}
              onFileSelect={handleSrtFileSelect}
              title={"\u4e0a\u4f20 SRT \u5b57\u5e55\u6587\u4ef6"}
              description={"\u652f\u6301\u6807\u51c6 SRT \u5b57\u5e55\u683c\u5f0f"}
              icon="srt"
            />
            <SourceLanguageSelect
              value={sourceLanguage}
              onChange={setSourceLanguage}
            />
            {srtFile && srtContent && (
              <>
                <Button
                  fullWidth
                  variant="primary"
                  className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600"
                  onPress={handleProcessFile}
                  isPending={isProcessing}
                >
                  {isProcessing
                    ? "\u6b63\u5728\u5904\u7406..."
                    : "\u89e3\u6790\u5b57\u5e55"}
                </Button>
                {processingProgress && (
                  <ProcessingProgress progress={processingProgress} />
                )}
              </>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="text" className="hidden">
          <span aria-hidden="true" />
        </Tabs.Panel>

        <Tabs.Panel id="youtube" className="px-1">
          <div className="mt-4">
            <YouTubeDownloader
              onSubtitleLoad={(original, translated) => {
                onOriginalEntriesChange(original);
                onTranslatedEntriesChange(translated);
              }}
              onError={onError}
            />
          </div>
        </Tabs.Panel>
      </Tabs>

      {inputMode !== "text" && entryCount > 0 && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {"\u5df2\u52a0\u8f7d"} {entryCount}{" "}
          {"\u6761\u5185\u5bb9\uff0c\u53ef\u4ee5\u7ee7\u7eed\u7f16\u8f91\u8bd1\u6587\u3002"}
        </p>
      )}
    </Card>
  );
}
