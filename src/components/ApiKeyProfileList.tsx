"use client";

import { Button } from "@heroui/react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { ApiKeyProfile } from "@/types";

interface ApiKeyProfileListProps {
  profiles: ApiKeyProfile[];
  selectedId: string | null;
  visibleKeys: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ApiKeyProfileList({
  profiles,
  selectedId,
  visibleKeys,
  onSelect,
  onToggleVisibility,
  onDelete,
}: ApiKeyProfileListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        已保存的配置
      </h3>
      {profiles.map((profile) => {
        const isSelected = profile.id === selectedId;
        const isVisible = visibleKeys[profile.id] === true;

        return (
          <div
            key={profile.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              isSelected
? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/30"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <input
              type="radio"
              name="selected-api-key"
              checked={isSelected}
              onChange={() => onSelect(profile.id)}
              aria-label={`使用 ${profile.label}`}
className="h-4 w-4 accent-teal-600"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {profile.label}
              </p>
              <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                {isVisible ? profile.apiKey : maskApiKey(profile.apiKey)}
              </p>
            </div>
            <Button
              isIconOnly
              variant="ghost"
              aria-label={isVisible ? "隐藏 API Key" : "查看 API Key"}
              onPress={() => onToggleVisibility(profile.id)}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              className="text-red-500 hover:text-red-600"
              aria-label={`删除 ${profile.label}`}
              onPress={() => onDelete(profile.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function maskApiKey(value: string) {
  return value.length <= 8
    ? "••••••••"
    : `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}
