import { promises as fs } from "fs";
import path from "path";

const MIMO_API_BASE = "https://api.xiaomimimo.com/v1";
const SETTINGS_FILE = path.join(process.cwd(), ".settings.json");

interface Settings {
  mimoApiKey?: string;
  [key: string]: string | undefined;
}

async function getStoredApiKey(): Promise<string | undefined> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const settings: Settings = JSON.parse(data);
    return settings.mimoApiKey;
  } catch {
    return undefined;
  }
}

async function getApiKey(): Promise<string> {
  // 优先从存储中读取
  const storedKey = await getStoredApiKey();
  if (storedKey) {
    return storedKey;
  }

  // 如果存储中没有，从环境变量读取
  const envKey = process.env.MIMO_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new Error("API Key未配置，请在设置中添加API Key");
}

async function headers(extra?: Record<string, string>) {
  const apiKey = await getApiKey();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
}

// ASR 语音识别
export async function speechRecognition(
  audioBase64: string,
  audioFormat: "mp3" | "wav" = "mp3",
  language: "auto" | "zh" | "en" = "en"
): Promise<string> {
  const mimeType = audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";
  const dataUrl = `data:${mimeType};base64,${audioBase64}`;

  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      model: "mimo-v2.5-asr",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: dataUrl,
                type: "input_audio",
              },
            },
          ],
        },
      ],
      asr_options: { language },
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ASR 请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// TTS 内置音色语音合成
export async function synthesizeSpeech(
  text: string,
  voice: string,
  styleInstruction?: string,
  format: "wav" | "mp3" = "wav"
): Promise<string> {
  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      model: "mimo-v2.5-tts",
      messages: [
        {
          role: "user",
          content: styleInstruction || "",
        },
        {
          role: "assistant",
          content: text,
        },
      ],
      audio: {
        format,
        voice,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS 请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.audio?.data ?? "";
}

// TTS VoiceClone 声音克隆
export async function synthesizeWithClone(
  text: string,
  referenceAudioBase64: string,
  referenceFormat: "mp3" | "wav" = "mp3",
  styleInstruction?: string,
  outputFormat: "wav" | "mp3" = "wav"
): Promise<string> {
  const mimeMap = { mp3: "audio/mpeg", wav: "audio/wav" };
  const voiceDataUrl = `data:${mimeMap[referenceFormat]};base64,${referenceAudioBase64}`;

  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      model: "mimo-v2.5-tts-voiceclone",
      messages: [
        {
          role: "user",
          content: styleInstruction || "",
        },
        {
          role: "assistant",
          content: text,
        },
      ],
      audio: {
        format: outputFormat,
        voice: voiceDataUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`VoiceClone 请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.audio?.data ?? "";
}

// TTS VoiceDesign 声音设计
export async function synthesizeWithDesign(
  text: string,
  voiceDescription: string,
  outputFormat: "wav" | "mp3" = "wav"
): Promise<string> {
  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      model: "mimo-v2.5-tts-voicedesign",
      messages: [
        {
          role: "user",
          content: voiceDescription,
        },
        {
          role: "assistant",
          content: text,
        },
      ],
      audio: {
        format: outputFormat,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`VoiceDesign 请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.audio?.data ?? "";
}

// MiMo 大模型翻译
export async function translateText(
  text: string,
  sourceLang: string = "English",
  targetLang: string = "Chinese"
): Promise<string> {
  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      model: "mimo-v2.5",
      messages: [
        {
          role: "system",
          content: `你是一位专业的字幕翻译员。请将以下${sourceLang}字幕翻译成${targetLang}，要求：\n1. 保持口语化、自然流畅\n2. 保留原文的情感和语气\n3. 只输出翻译结果，不要加任何解释\n4. 如果是对话，保留说话人的口吻`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`翻译请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
