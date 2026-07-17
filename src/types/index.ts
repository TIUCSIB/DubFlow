export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  // 毫秒级时间戳，方便计算
  startMs: number;
  endMs: number;
}

export interface TranslatedEntry extends SubtitleEntry {
  translatedText: string;
}

export type VoiceMode = "builtin" | "clone" | "design";

export interface TTSRequest {
  text: string;
  voiceMode: VoiceMode;
  // 内置音色名称
  builtinVoice?: string;
  // VoiceClone: 参考音频 base64
  referenceAudio?: string;
  referenceAudioFormat?: "mp3" | "wav";
  // VoiceDesign: 音色描述
  voiceDescription?: string;
  // 风格指令（通过自然语言控制情绪/语速等）
  styleInstruction?: string;
  // 音频输出格式
  outputFormat?: "wav" | "mp3";
}

export interface TranslateRequest {
  text: string;
  sourceLang?: string;
  targetLang?: string;
}

export interface ASRRequest {
  audioBase64: string;
  audioFormat: "mp3" | "wav";
  language?: "auto" | "zh" | "en";
}

export interface PipelineJob {
  id: string;
  youtubeUrl: string;
  status: "downloading" | "translating" | "cloning" | "synthesizing" | "completed" | "error";
  progress: number;
 英文字幕?: SubtitleEntry[];
  translatedSubtitles?: TranslatedEntry[];
  error?: string;
}
