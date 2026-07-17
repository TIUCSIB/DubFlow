"use client";

import { useState } from "react";
import { Languages, Sun, Moon, Settings } from "lucide-react";
import { Button } from "@heroui/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import SettingsModal from "./SettingsModal";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <Languages className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              DubFlow
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              YouTube 视频智能配音 · 一键翻译配音
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="设置"
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="切换主题"
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
