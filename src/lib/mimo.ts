import { parseMimoChatResponse } from "@/lib/mimo-response";
const MIMO_API_BASE = "https://api.xiaomimimo.com/v1";

async function getApiKey(requestApiKey?: string): Promise<string> {
  const localApiKey = requestApiKey?.trim();
  if (localApiKey) return localApiKey;

  const envKey = process.env.MIMO_API_KEY;
  if (envKey) return envKey;

  throw new Error("API Key未配置，请在设置中添加API Key");
}

async function headers(
  requestApiKey?: string,
  extra?: Record<string, string>,
) {
  const apiKey = await getApiKey(requestApiKey);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
}

export type ASRLanguage = "auto" | "zh" | "en";

export async function speechRecognition(
  audioBase64: string,
  audioFormat: "mp3" | "wav" = "mp3",
  language: ASRLanguage = "auto",
  requestApiKey?: string,
): Promise<string> {
  const mimeType = audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";
  const dataUrl = `data:${mimeType};base64,${audioBase64}`;

  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(requestApiKey),
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

  const rawResponse = await res.text();
  const data = parseMimoChatResponse(rawResponse);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("ASR 服务没有返回有效的识别文本");
  }
  return content;
}

export async function synthesizeSpeech(
  text: string,
  voice: string,
  styleInstruction?: string,
  format: "wav" | "mp3" = "wav",
  requestApiKey?: string,
): Promise<string> {
  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(requestApiKey),
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

export async function synthesizeWithClone(
  text: string,
  referenceAudioBase64: string,
  referenceFormat: "mp3" | "wav" = "mp3",
  styleInstruction?: string,
  outputFormat: "wav" | "mp3" = "wav",
  requestApiKey?: string,
): Promise<string> {
  const mimeMap = { mp3: "audio/mp3", wav: "audio/wav" };
  const voiceDataUrl = `data:${mimeMap[referenceFormat]};base64,${referenceAudioBase64}`;

  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(requestApiKey),
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
    if (res.status === 429) {
      throw new Error("声音克隆服务当前请求过多，请等待一段时间后再试");
    }
    throw new Error(`VoiceClone 请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.audio?.data ?? "";
}

export async function synthesizeWithDesign(
  text: string,
  voiceDescription: string,
  outputFormat: "wav" | "mp3" = "wav",
  requestApiKey?: string,
): Promise<string> {
  const res = await fetch(`${MIMO_API_BASE}/chat/completions`, {
    method: "POST",
    headers: await headers(requestApiKey),
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

export async function translateText(
  text: string,
  sourceLang: string = "English",
  targetLang: string = "Chinese",
  requestApiKey?: string,
): Promise<string> {
  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }

    try {
      const res = await fetchWithTimeout(
        `${MIMO_API_BASE}/chat/completions`,
        {
          method: "POST",
          headers: await headers(requestApiKey),
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
        },
        120_000,
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`翻译请求失败 (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (error: unknown) {
      lastError = error;
      if (attempt >= maxRetries) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("翻译失败");
}

export async function translateTexts(
  texts: string[],
  sourceLang: string = "English",
  targetLang: string = "Chinese",
  requestApiKey?: string,
): Promise<string[]> {
  if (texts.length === 0) return [];

  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }

    try {
      const res = await fetchWithTimeout(
        `${MIMO_API_BASE}/chat/completions`,
        {
          method: "POST",
          headers: await headers(requestApiKey),
          body: JSON.stringify({
            model: "mimo-v2.5",
            messages: [
              {
                role: "system",
                content: [
                  `Translate each ${sourceLang} subtitle into natural ${targetLang}.`,
                  "Return only a valid JSON array of strings.",
                  `The output must contain exactly ${texts.length} items in the same order as the input.`, 
                  "Do not include numbering, explanations, or markdown fences.",
                ].join("\n"),
              },
              {
                role: "user",
                content: JSON.stringify(texts),
              },
            ],
          }),
        },
        120_000,
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`批量翻译请求失败 (${res.status}): ${err}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("批量翻译服务没有返回有效内容");
      }

      const jsonStart = content.indexOf("[");
      const jsonEnd = content.lastIndexOf("]");
      if (jsonStart < 0 || jsonEnd <= jsonStart) {
        throw new Error("批量翻译结果不是有效的 JSON 数组");
      }

      let translatedTexts: unknown;
      try {
        translatedTexts = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      } catch {
        throw new Error("批量翻译结果解析失败");
      }

      if (
        !Array.isArray(translatedTexts) ||
        translatedTexts.length !== texts.length ||
        translatedTexts.some((item) => typeof item !== "string")
      ) {
        throw new Error("批量翻译结果数量与字幕数量不一致");
      }

      return translatedTexts;
    } catch (error: unknown) {
      lastError = error;
      if (attempt >= maxRetries) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("批量翻译失败");
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`翻译服务响应超时（超过 ${timeoutMs / 1000} 秒）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function estimateAudioDuration(
  base64: string,
  format: "wav" | "mp3" = "wav",
): number {
  const byteLength = Math.ceil((base64.length * 3) / 4);
  return format === "wav"
    ? Math.ceil((byteLength / 32000) * 1000)
    : Math.ceil((byteLength / 16000) * 1000);
}

function formatSRTTimestamp(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
}

export function generateSRTContent(
  entries: { startTime: string; endTime: string; text: string }[],
): string {
  return entries
    .map((entry, index) => {
      return `${index + 1}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`;
    })
    .join("\n\n");
}

export function generateTimedEntries(
  translatedTexts: string[],
  originalEntries: { startMs: number; endMs: number }[],
): {
  text: string;
  startMs: number;
  endMs: number;
  startTime: string;
  endTime: string;
}[] {
  return translatedTexts.map((text, index) => {
    const startMs = originalEntries[index]?.startMs ?? 0;
    const endMs = originalEntries[index]?.endMs ?? 0;
    return {
      text,
      startMs,
      endMs,
      startTime: formatSRTTimestamp(startMs),
      endTime: formatSRTTimestamp(endMs),
    };
  });
}
