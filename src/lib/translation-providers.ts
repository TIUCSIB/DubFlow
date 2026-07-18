import type { TranslationProvider } from "@/types";

/** 统一的翻译函数接口 */
export async function translateWithProvider(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
  apiKey?: string,
): Promise<string[]> {
  switch (provider) {
    case "deepl":
      return translateWithDeepL(texts, sourceLang, targetLang, apiKey);
    case "google":
      return translateWithGoogle(texts, sourceLang, targetLang);
    case "mimo":
    default:
      throw new Error("MiMo 翻译应通过 mimo.ts 中的 translateTexts 处理");
  }
}

/** 单条翻译（用于逐条降级场景） */
export async function translateSingleWithProvider(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
  apiKey?: string,
): Promise<string> {
  const results = await translateWithProvider(
    [text],
    sourceLang,
    targetLang,
    provider,
    apiKey,
  );
  return results[0] || text;
}

// ─── DeepL ──────────────────────────────────────────────

const DEEPL_API_BASE = "https://api-free.deepl.com/v2";

const DEEPL_LANG_MAP: Record<string, string> = {
  English: "EN",
  Chinese: "ZH",
  Japanese: "JA",
  Korean: "KO",
  French: "FR",
  German: "DE",
  Spanish: "ES",
  Portuguese: "PT",
  Russian: "RU",
  Italian: "IT",
};

async function translateWithDeepL(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  apiKey?: string,
): Promise<string[]> {
  if (!apiKey) {
    throw new Error("DeepL API Key 未配置，请在设置中添加");
  }

  const srcLang = DEEPL_LANG_MAP[sourceLang] || sourceLang.toUpperCase();
  const tgtLang = DEEPL_LANG_MAP[targetLang] || targetLang.toUpperCase();

  const combinedText = texts.join("\n\n");

  const res = await fetchWithTimeout(
    `${DEEPL_API_BASE}/translate`,
    {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [combinedText],
        source_lang: srcLang,
        target_lang: tgtLang,
      }),
    },
    60_000,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL 翻译请求失败 (${res.status}): ${err}`);
  }

  const data = await res.json();
  const translated = data.translations?.[0]?.text || "";

  const parts = translated.split("\n\n");
  return texts.map((_, i) => parts[i]?.trim() || texts[i]);
}

// ─── Google Translate (via free API) ────────────────────

const GOOGLE_LANG_MAP: Record<string, string> = {
  English: "en",
  Chinese: "zh-CN",
  Japanese: "ja",
  Korean: "ko",
  French: "fr",
  German: "de",
  Spanish: "es",
  Portuguese: "pt",
  Russian: "ru",
  Italian: "it",
};

async function translateWithGoogle(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const from = GOOGLE_LANG_MAP[sourceLang] || "auto";
  const to = GOOGLE_LANG_MAP[targetLang] || "zh-CN";

  const results = await Promise.allSettled(
    texts.map((text) => translateSingleGoogle(text, from, to)),
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.warn(`[Google Translate] 第 ${i + 1} 条翻译失败:`, result.reason);
    return texts[i];
  });
}

async function translateSingleGoogle(
  text: string,
  from: string,
  to: string,
): Promise<string> {
  const url = "https://translate.googleapis.com/translate_a/single";
  const params = new URLSearchParams({
    client: "gtx",
    sl: from,
    tl: to,
    dt: "t",
    q: text,
  });

  const res = await fetchWithTimeout(`${url}?${params}`, {}, 15_000);

  if (!res.ok) {
    throw new Error(`Google Translate 请求失败 (${res.status})`);
  }

  const data = await res.json();
  // 返回格式: [[["translated text","source text",null,null,10]],null,"en"]
  const sentences = data[0];
  if (!Array.isArray(sentences)) {
    throw new Error("Google Translate 返回格式异常");
  }

  return sentences
    .map((sentence: [string, ...unknown[]]) => sentence[0])
    .join("");
}

// ─── 通用工具 ──────────────────────────────────────────

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`翻译服务响应超时（超过 ${timeoutMs / 1000} 秒）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
