export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface TranslatedEntry extends SubtitleEntry {
  translatedText: string;
}

export type VoiceMode = "builtin" | "clone" | "design";

export type ExportProgressPhase = "synthesizing" | "merging";

export interface ExportProgress {
  phase: ExportProgressPhase;
  current: number;
  total: number;
}

export interface TTSRequest {
  text: string;
  voiceMode: VoiceMode;
  builtinVoice?: string;
  referenceAudio?: string;
  referenceAudioFormat?: "mp3" | "wav";
  voiceDescription?: string;
  styleInstruction?: string;
  outputFormat?: "wav" | "mp3";
}

export interface TranslateRequest {
  text: string;
  sourceLang?: string;
  targetLang?: string;
}

export type ASRLanguage = "auto" | "zh" | "en";

export type TargetLanguage = "zh" | "en";

export interface ASRRequest {
  audioBase64: string;
  audioFormat: "mp3" | "wav";
  language?: ASRLanguage;
}

export interface ApiKeyProfile {
  id: string;
  label: string;
  apiKey: string;
  createdAt: number;
}

export interface PipelineJob {
  id: string;
  youtubeUrl: string;
  status:
    | "downloading"
    | "translating"
    | "cloning"
    | "synthesizing"
    | "completed"
    | "error";
  progress: number;
  englishSubtitles?: SubtitleEntry[];
  translatedSubtitles?: TranslatedEntry[];
  error?: string;
}

export type TranslationProvider = "mimo" | "deepl" | "google";
