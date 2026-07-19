import type { ASRLanguage, SubtitleEntry, TranslatedEntry } from "@/types";
import { formatTimestamp } from "@/lib/subtitle";
import { getApiKeyHeaders, getDeepLApiKey, getTranslationProvider } from "@/lib/api-key-storage";
import { readProcessResponse } from "@/lib/process-response";

export interface AudioPayload {
  audioBase64: string;
  audioFormat: "mp3" | "wav";
}

export interface AudioProcessResult {
  entries: SubtitleEntry[];
  translatedEntries: TranslatedEntry[];
}

export type AudioProcessStage =
  | "reading"
  | "extracting"
  | "preparing"
  | "processing";

export interface AudioProcessProgress {
  stage: AudioProcessStage;
  current: number;
  total: number;
  percent: number;
}

export type AudioProcessProgressHandler = (
  progress: AudioProcessProgress,
) => void;

// The API limit applies to the base64 payload, so keep decoded audio below 6 MiB.
const ASR_CHUNK_BYTES = 6 * 1024 * 1024;
const ASR_SAMPLE_RATE = 16000;

export function isDirectAudioFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "audio/mpeg" ||
    file.type === "audio/mp3" ||
    file.type === "audio/wav" ||
    file.type === "audio/x-wav" ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav")
  );
}

export function getAudioFormat(file: File): "mp3" | "wav" {
  return file.name.toLowerCase().endsWith(".wav") ||
    file.type === "audio/wav" ||
    file.type === "audio/x-wav"
    ? "wav"
    : "mp3";
}

export function fileToBase64(
  file: File,
  onProgress?: AudioProcessProgressHandler,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;

      onProgress({
        stage: "reading",
        current: event.loaded,
        total: event.total,
        percent: Math.max(1, Math.round((event.loaded / event.total) * 15)),
      });
    };
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractAudioFromVideo(
  file: File,
): Promise<AudioPayload> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-audio", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "瑙嗛闊抽鎻愬彇澶辫触");
  }

  const data = await response.json();
  return {
    audioBase64: data.audioBase64,
    audioFormat: "wav",
  };
}

export async function processAudioInput(
  payload: AudioPayload,
  sourceLanguage: ASRLanguage,
  onProgress?: AudioProcessProgressHandler,
): Promise<AudioProcessResult> {
  onProgress?.({
    stage: "preparing",
    current: 0,
    total: 1,
    percent: 20,
  });

  if (decodedByteLength(payload.audioBase64) <= ASR_CHUNK_BYTES) {
    onProgress?.({
      stage: "processing",
      current: 0,
      total: 1,
      percent: 30,
    });
    const result = await requestAudioProcess(payload, sourceLanguage);
    onProgress?.({
      stage: "processing",
      current: 1,
      total: 1,
      percent: 100,
    });
    return result;
  }

  const chunks = await createAudioChunks(payload);
  const entries: SubtitleEntry[] = [];
  const translatedEntries: TranslatedEntry[] = [];

  for (let index = 0; index < chunks.length; index++) {
    onProgress?.({
      stage: "processing",
      current: index,
      total: chunks.length,
      percent: getProcessingPercent(index, chunks.length),
    });

    try {
      const result = await requestAudioProcess(chunks[index], sourceLanguage);
      const startMs = Math.round(
        (chunks[index].startSample / ASR_SAMPLE_RATE) * 1000,
      );
      const endMs = Math.round(
        (chunks[index].endSample / ASR_SAMPLE_RATE) * 1000,
      );

      result.entries.forEach((entry, entryIndex) => {
        const normalizedEntry: SubtitleEntry = {
          ...entry,
          index: entries.length + entryIndex + 1,
          startMs,
          endMs,
          startTime: formatTimestamp(startMs),
          endTime: formatTimestamp(endMs),
        };
        entries.push(normalizedEntry);

        const translatedEntry = result.translatedEntries[entryIndex];
        translatedEntries.push({
          ...normalizedEntry,
          translatedText: translatedEntry?.translatedText || "",
        });
      });
      onProgress?.({
        stage: "processing",
        current: index + 1,
        total: chunks.length,
        percent: getProcessingPercent(index + 1, chunks.length),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "璇煶璇嗗埆澶辫触";
      throw new Error(`绗?${index + 1} / ${chunks.length} 娈佃瘑鍒け璐ワ細${message}`);
    }
  }

  return { entries, translatedEntries };
}

function getProcessingPercent(current: number, total: number): number {
  if (total <= 0) return 25;
  return Math.min(100, 25 + Math.round((current / total) * 75));
}

async function requestAudioProcess(
  payload: AudioPayload,
  sourceLanguage: ASRLanguage,
): Promise<AudioProcessResult> {
  const translationProvider = getTranslationProvider();
  const response = await fetch("/api/process", {
    method: "POST",
    headers: getApiKeyHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      type: "audio",
      audioBase64: payload.audioBase64,
      audioFormat: payload.audioFormat,
      autoTranslate: true,
      sourceLanguage,
      translationProvider,
      deeplApiKey: translationProvider === "deepl" ? getDeepLApiKey() : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "璇煶璇嗗埆澶辫触");
  }

  return readProcessResponse(response);
}

interface AudioChunk extends AudioPayload {
  startSample: number;
  endSample: number;
}

async function createAudioChunks(payload: AudioPayload): Promise<AudioChunk[]> {
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(
      base64ToArrayBuffer(payload.audioBase64),
    );
    const totalSamples = Math.ceil(audioBuffer.duration * ASR_SAMPLE_RATE);
    const monoSamples = new Float32Array(totalSamples);

    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
      const sourceIndex = Math.min(
        audioBuffer.length - 1,
        Math.floor((sampleIndex * audioBuffer.sampleRate) / ASR_SAMPLE_RATE),
      );
      let sample = 0;

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        sample += audioBuffer.getChannelData(channel)[sourceIndex];
      }

      monoSamples[sampleIndex] = sample / audioBuffer.numberOfChannels;
    }

    const samplesPerChunk = Math.floor(ASR_CHUNK_BYTES / 2);
    const chunks: AudioChunk[] = [];

    for (let startSample = 0; startSample < totalSamples; startSample += samplesPerChunk) {
      const endSample = Math.min(startSample + samplesPerChunk, totalSamples);
      const samples = monoSamples.slice(startSample, endSample);
      const wavBuffer = encodeMonoWav(samples, ASR_SAMPLE_RATE);

      chunks.push({
        audioBase64: arrayBufferToBase64(wavBuffer),
        audioFormat: "wav",
        startSample,
        endSample,
      });
    }

    return chunks;
  } finally {
    await audioContext.close();
  }
}

function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
  }

  return buffer;
}

function decodedByteLength(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }

  return btoa(binary);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
