"use client";

import type { ApiKeyProfile } from "@/types";

export const API_KEYS_STORAGE_KEY = "dubflow-api-keys";
export const SELECTED_API_KEY_STORAGE_KEY = "dubflow-selected-api-key";

function isApiKeyProfile(value: unknown): value is ApiKeyProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Partial<ApiKeyProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.label === "string" &&
    typeof profile.apiKey === "string" &&
    typeof profile.createdAt === "number"
  );
}

export function loadApiKeyProfiles(): ApiKeyProfile[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(API_KEYS_STORAGE_KEY) || "[]",
    );
    return Array.isArray(stored) ? stored.filter(isApiKeyProfile) : [];
  } catch {
    return [];
  }
}

export function saveApiKeyProfiles(profiles: ApiKeyProfile[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(profiles));
}

export function getSelectedApiKeyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_API_KEY_STORAGE_KEY);
}

export function saveSelectedApiKeyId(id: string | null): void {
  if (typeof window === "undefined") return;

  if (id) {
    window.localStorage.setItem(SELECTED_API_KEY_STORAGE_KEY, id);
  } else {
    window.localStorage.removeItem(SELECTED_API_KEY_STORAGE_KEY);
  }
}

export function getSelectedApiKey(): string | undefined {
  const profiles = loadApiKeyProfiles();
  const selectedId = getSelectedApiKeyId();
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedId) || profiles[0];

  return selectedProfile?.apiKey || undefined;
}

export function getApiKeyHeaders(headers: HeadersInit = {}): HeadersInit {
  const apiKey = getSelectedApiKey();
  return apiKey ? { ...headers, "x-mimo-api-key": apiKey } : headers;
}

// ─── 翻译服务商设置 ──────────────────────────────────

export const TRANSLATION_PROVIDER_KEY = "dubflow-translation-provider";
export const DEEPL_API_KEY_KEY = "dubflow-deepl-api-key";

import type { TranslationProvider } from "@/types";

export function getTranslationProvider(): TranslationProvider {
  if (typeof window === "undefined") return "mimo";
  const value = window.localStorage.getItem(TRANSLATION_PROVIDER_KEY);
  if (value === "deepl" || value === "google" || value === "mimo") return value;
  return "mimo";
}

export function saveTranslationProvider(provider: TranslationProvider): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRANSLATION_PROVIDER_KEY, provider);
}

export function getDeepLApiKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(DEEPL_API_KEY_KEY) || undefined;
}

export function saveDeepLApiKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEEPL_API_KEY_KEY, key);
}

export function getTranslationHeaders(headers: HeadersInit = {}): HeadersInit {
  const provider = getTranslationProvider();
  const result = new Headers(headers);
  result.set("x-translation-provider", provider);

  if (provider === "deepl") {
    const deeplKey = getDeepLApiKey();
    if (deeplKey) result.set("x-deepl-api-key", deeplKey);
  }

  return result;
}
