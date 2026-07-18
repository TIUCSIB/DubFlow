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
      <header className="border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm shadow-teal-500/20">
            <Languages className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              DubFlow
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              YouTube 视频智能配音平台
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              trigger={
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onPress={() => setIsSettingsOpen(true)}
                  aria-label="设置"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span aria-hidden="true">
                    <Settings className="h-4 w-4" />
                  </span>
                </Button>
              }
            />
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={toggleTheme}
              aria-label="切换主题"
              className="theme-toggle-btn text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span aria-hidden="true">
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
