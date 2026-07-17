"use client";

import { useState, useCallback, useRef } from "react";
import type {
  SubtitleEntry,
  TranslatedEntry,
  VoiceMode,
} from "@/types";
import Header from "@/components/Header";
import SubtitleEditor from "@/components/SubtitleEditor";
import VoiceSelector from "@/components/VoiceSelector";
import PipelineProgress from "@/components/PipelineProgress";
import {
  Link,
  FileText,
  Type,
  Play,
  Pause,
  Download,
  Volume2,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Input,
  TextArea,
  Spinner,
} from "@heroui/react";

/* ------------------------------------------------------------------ */
/*  Pipeline 配置                                                       */
/* ------------------------------------------------------------------ */

const PIPELINE_STEPS = [
  { key: "download", label: "下载视频" },
  { key: "translate", label: "翻译字幕" },
  { key: "clone", label: "声音克隆" },
  { key: "synthesize", label: "语音合成" },
] as const;

type StepStatus = "pending" | "active" | "done" | "error";

/* ------------------------------------------------------------------ */
/*  主页面                                                              */
/* ------------------------------------------------------------------ */

export default function Home() {
  // ---- 输入模式 ----
  const [inputMode, setInputMode] = useState<"url" | "text" | null>(null);

  // ---- URL 模式 ----
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isUrlSubmitting, setIsUrlSubmitting] = useState(false);

  // ---- Pipeline 状态 ----
  const [pipelineJobId, setPipelineJobId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState("");
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStepStatuses, setPipelineStepStatuses] = useState<
    StepStatus[]
  >(["pending", "pending", "pending", "pending"]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- 文本模式 ----
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // ---- 字幕 / 翻译 ----
  const [originalEntries, setOriginalEntries] = useState<SubtitleEntry[]>([]);
  const [translatedEntries, setTranslatedEntries] = useState<
    TranslatedEntry[]
  >([]);

  // ---- 音色配置 ----
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("builtin");
  const [builtinVoice, setBuiltinVoice] = useState("Chloe");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(
    null,
  );

  // ---- 生成 ----
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- 音频播放 ----
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* -------------------------------------------------------------- */
  /*  辅助函数                                                        */
  /* -------------------------------------------------------------- */

  const getAudioSrc = useCallback(
    (b64: string) => `data:audio/mpeg;base64,${b64}`,
    [],
  );

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleDownload = useCallback(() => {
    if (!audioBase64) return;
    const a = document.createElement("a");
    a.href = `data:audio/mpeg;base64,${audioBase64}`;
    a.download = `dubflow-output.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioBase64]);

  /* -------------------------------------------------------------- */
  /*  Pipeline 轮询                                                   */
  /* -------------------------------------------------------------- */

  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        setPipelineProgress(data.progress ?? 0);
        setPipelineStatus(data.status ?? "");

        // 映射步骤状态
        const statuses: StepStatus[] = ["pending", "pending", "pending", "pending"];
        const stepMap: Record<string, number> = {
          downloading: 0,
          translating: 1,
          cloning: 2,
          synthesizing: 3,
        };

        if (data.status && stepMap[data.status] !== undefined) {
          statuses[stepMap[data.status]] = "active";
          for (let i = 0; i < stepMap[data.status]; i++) {
            statuses[i] = "done";
          }
        }
        if (data.status === "completed") {
          statuses.fill("done");
        }
        if (data.status === "error") {
          for (let i = statuses.length - 1; i >= 0; i--) {
            if (statuses[i] === "active") {
              statuses[i] = "error";
              break;
            }
          }
        }

        setPipelineStepStatuses(statuses);

        if (data.status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (data.英文字幕 && data.translatedSubtitles) {
            setOriginalEntries(data.英文字幕);
            setTranslatedEntries(data.translatedSubtitles);
          }
        }

        if (data.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // 轮询失败时静默处理
      }
    }, 2000);
  }, []);

  /* -------------------------------------------------------------- */
  /*  URL 提交                                                        */
  /* -------------------------------------------------------------- */

  const handleUrlSubmit = useCallback(async () => {
    if (!youtubeUrl.trim()) return;
    setIsUrlSubmitting(true);

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });

      if (!res.ok) throw new Error("创建任务失败");

      const data = await res.json();
      setPipelineJobId(data.jobId);
      setPipelineStepStatuses(["active", "pending", "pending", "pending"]);
      setPipelineProgress(0);
      startPolling(data.jobId);
    } catch (err) {
      console.error(err);
      setPipelineStatus("任务启动失败，请检查 URL 后重试");
    } finally {
      setIsUrlSubmitting(false);
    }
  }, [youtubeUrl, startPolling]);

  /* -------------------------------------------------------------- */
  /*  文本翻译                                                        */
  /* -------------------------------------------------------------- */

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim() }),
      });

      if (!res.ok) throw new Error("翻译失败");

      const data = await res.json();

      const sentences = inputText
        .split(/(?<=[。！？.!?])\s*/)
        .filter((s) => s.trim());
      const translatedParts = data.translatedText
        .split(/(?<=[。！？.!?])\s*/)
        .filter((s: string) => s.trim());

      const orig: SubtitleEntry[] = sentences.map((text, i) => ({
        index: i,
        startTime: "",
        endTime: "",
        text,
        startMs: i * 5000,
        endMs: (i + 1) * 5000,
      }));

      const trans: TranslatedEntry[] = orig.map((entry, i) => ({
        ...entry,
        translatedText: translatedParts[i] ?? "",
      }));

      setOriginalEntries(orig);
      setTranslatedEntries(trans);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  }, [inputText]);

  /* -------------------------------------------------------------- */
  /*  更新单条翻译                                                     */
  /* -------------------------------------------------------------- */

  const handleUpdateTranslation = useCallback(
    (index: number, text: string) => {
      setTranslatedEntries((prev) =>
        prev.map((e, i) => (i === index ? { ...e, translatedText: text } : e)),
      );
    },
    [],
  );

  /* -------------------------------------------------------------- */
  /*  生成配音                                                        */
  /* -------------------------------------------------------------- */

  const handleGenerate = useCallback(async () => {
    const textToSpeak = translatedEntries
      .map((e) => e.translatedText)
      .filter(Boolean)
      .join("\n");

    if (!textToSpeak.trim()) return;
    setIsGenerating(true);
    setAudioBase64(null);
    setIsPlaying(false);

    try {
      const body: Record<string, unknown> = {
        text: textToSpeak,
        voiceMode,
      };

      if (voiceMode === "builtin") {
        body.builtinVoice = builtinVoice;
      } else if (voiceMode === "clone" && referenceAudioFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.readAsDataURL(referenceAudioFile);
        });
        body.referenceAudio = base64;
        body.referenceAudioFormat = referenceAudioFile.name.endsWith(".wav")
          ? "wav"
          : "mp3";
      } else if (voiceMode === "design") {
        body.voiceDescription = voiceDescription;
      }

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("语音合成失败");

      const data = await res.json();
      setAudioBase64(data.audioBase64);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [
    translatedEntries,
    voiceMode,
    builtinVoice,
    referenceAudioFile,
    voiceDescription,
  ]);

  /* -------------------------------------------------------------- */
  /*  渲染                                                             */
  /* -------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {/* ============================================================ */}
        {/* Section 1 — URL 输入 / 方式选择                                 */}
        {/* ============================================================ */}
        {inputMode === null && (
          <section className="flex flex-col items-center gap-6 py-16">
            <h2 className="text-2xl font-bold dark:text-white text-gray-900">
              粘贴 YouTube 链接，开始智能配音
            </h2>
            <p className="max-w-md text-center text-sm dark:text-gray-400 text-gray-500">
              自动下载视频、提取字幕、翻译成中文、用你选择的音色生成配音
            </p>

            {/* URL 输入 */}
            <div className="flex w-full max-w-lg items-center gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pl-10"
                  fullWidth
                />
              </div>
              <Button
                variant="primary"
                onPress={handleUrlSubmit}
                isDisabled={isUrlSubmitting || !youtubeUrl.trim()}
                isPending={isUrlSubmitting}
              >
                <Sparkles className="h-4 w-4" />
                开始处理
              </Button>
            </div>

            {/* 分割线 */}
            <div className="flex w-full max-w-lg items-center gap-3">
              <div className="h-px flex-1 dark:bg-gray-800 bg-gray-300" />
              <span className="text-xs dark:text-gray-600 text-gray-400">或者</span>
              <div className="h-px flex-1 dark:bg-gray-800 bg-gray-300" />
            </div>

            {/* 其他入口按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onPress={() => setInputMode("text")}
              >
                <Type className="h-4 w-4" />
                直接输入文字
              </Button>
              <Button
                variant="outline"
                onPress={() => setInputMode("text")}
              >
                <FileText className="h-4 w-4" />
                上传字幕文件
              </Button>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* Section 2 — 内容区域：Pipeline 进度 / 文本输入                    */}
        {/* ============================================================ */}
        {inputMode === "url" && pipelineJobId && (
          <PipelineProgress
            status={pipelineStatus}
            progress={pipelineProgress}
            steps={PIPELINE_STEPS.map((s, i) => ({
              key: s.key,
              label: s.label,
              status: pipelineStepStatuses[i],
            }))}
          />
        )}

        {inputMode === "text" && (
          <section className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold dark:text-gray-200 text-gray-800">
              输入需要翻译的文字
            </h2>
            <TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在这里粘贴或输入需要翻译成中文的英文文本..."
              rows={5}
              fullWidth
              variant="secondary"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {inputText.length} 字符
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setInputMode(null);
                    setInputText("");
                  }}
                >
                  返回
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleTranslate}
                  isDisabled={isTranslating || !inputText.trim()}
                  isPending={isTranslating}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  翻译
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* Section 3 — 字幕编辑器                                         */}
        {/* ============================================================ */}
        {translatedEntries.length > 0 && (
          <SubtitleEditor
            entries={originalEntries}
            translatedEntries={translatedEntries}
            onUpdateTranslation={handleUpdateTranslation}
          />
        )}

        {/* ============================================================ */}
        {/* Section 4 — 音色选择器                                         */}
        {/* ============================================================ */}
        {translatedEntries.length > 0 && (
          <VoiceSelector
            voiceMode={voiceMode}
            onChange={setVoiceMode}
            builtinVoice={builtinVoice}
            onBuiltinVoiceChange={setBuiltinVoice}
            voiceDescription={voiceDescription}
            onVoiceDescriptionChange={setVoiceDescription}
            referenceAudioFile={referenceAudioFile}
            onReferenceAudioChange={setReferenceAudioFile}
          />
        )}

        {/* ============================================================ */}
        {/* Section 5 — 生成配音按钮                                       */}
        {/* ============================================================ */}
        {translatedEntries.length > 0 && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleGenerate}
            isDisabled={
              isGenerating ||
              translatedEntries.every((e) => !e.translatedText.trim())
            }
            isPending={isGenerating}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500"
          >
            <Volume2 className="h-4 w-4" />
            生成配音
          </Button>
        )}

        {/* ============================================================ */}
        {/* Section 6 — 音频播放器                                         */}
        {/* ============================================================ */}
        {audioBase64 && (
          <section className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold dark:text-gray-200 text-gray-800">
              配音预览
            </h2>

            {/* 隐藏的 audio 元素 */}
            <audio
              ref={audioRef}
              src={getAudioSrc(audioBase64)}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  setDuration(audioRef.current.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* 播放器 UI */}
            <div className="flex items-center gap-4">
              {/* 播放/暂停按钮 */}
              <Button
                variant="primary"
                isIconOnly
                onPress={togglePlayPause}
                className="rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </Button>

              {/* 进度条 */}
              <div className="flex flex-1 flex-col gap-1">
                <div
                  className="h-1.5 w-full cursor-pointer overflow-hidden rounded-full dark:bg-gray-800 bg-gray-200"
                  onClick={(e) => {
                    if (!audioRef.current) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio =
                      (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime =
                      ratio * audioRef.current.duration;
                  }}
                >
                  <div
                    className="progress-gradient h-full rounded-full transition-all duration-75"
                    style={{
                      width: duration
                        ? `${(currentTime / duration) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              {/* 下载按钮 */}
              <Button
                variant="outline"
                isIconOnly
                onPress={handleDownload}
                className="rounded-full"
                aria-label="下载配音文件"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {/* 底部留白 */}
        <div className="h-8" />
      </main>

      {/* 页脚 */}
      <footer className="border-t dark:border-gray-800 border-gray-200 py-4 text-center text-xs dark:text-gray-600 text-gray-400">
        DubFlow · YouTube 视频智能配音
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  辅助工具函数                                                        */
/* ------------------------------------------------------------------ */

function formatSeconds(sec: number): string {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}