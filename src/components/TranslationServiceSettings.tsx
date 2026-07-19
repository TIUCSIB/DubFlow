"use client";

import { Button, Input, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import type { TranslationProvider } from "@/types";

interface TranslationServiceSettingsProps {
  provider: TranslationProvider;
  deeplApiKey: string;
  onProviderChange: (provider: TranslationProvider) => void;
  onDeepLApiKeyChange: (apiKey: string) => void;
  onSave: () => void;
}

const PROVIDERS: { id: TranslationProvider; label: string }[] = [
  { id: "mimo", label: "MiMo" },
  { id: "deepl", label: "DeepL Free" },
  { id: "google", label: "Google" },
];

export default function TranslationServiceSettings({
  provider,
  deeplApiKey,
  onProviderChange,
  onDeepLApiKeyChange,
  onSave,
}: TranslationServiceSettingsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          翻译服务
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          选择字幕翻译使用的服务。DeepL Free 每月提供免费字符额度，Google Translate 无需 API Key。
        </p>
      </div>

      <ToggleButtonGroup
        selectionMode="single"
        selectedKeys={new Set([provider])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as TranslationProvider | undefined;
          if (selected) onProviderChange(selected);
        }}
        fullWidth
        isDetached
        size="sm"
      >
        {PROVIDERS.map((item) => (
          <ToggleButton key={item.id} id={item.id}>
            {item.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {provider === "deepl" && (
        <div className="flex items-center gap-3">
          <label
            htmlFor="deepl-api-key"
            className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            DeepL API Key
          </label>
          <Input
            id="deepl-api-key"
            aria-label="DeepL API Key"
            type="password"
            placeholder="输入你的 DeepL Free API Key"
            value={deeplApiKey}
            onChange={(event) => onDeepLApiKeyChange(event.target.value)}
          />
        </div>
      )}

      {provider === "google" && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          无需 API Key。大量请求时可能受到 Google 的访问限制。
        </p>
      )}

      {provider === "mimo" && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          使用上方当前选中的 MiMo API Key 进行翻译。
        </p>
      )}

      <Button
        variant="primary"
        size="sm"
        onPress={onSave}
        isDisabled={provider === "deepl" && !deeplApiKey.trim()}
      >
        保存翻译设置
      </Button>
    </div>
  );
}
