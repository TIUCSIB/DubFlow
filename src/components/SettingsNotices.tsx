"use client";

import { AlertCircle } from "lucide-react";

export default function SettingsNotices({ showApiKeyError }: { showApiKeyError: boolean }) {
  return (
    <>
      {showApiKeyError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">
            请输入 API Key
          </span>
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          存储说明
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          配置只保存在当前浏览器的 localStorage 中。切换浏览器或清理网站数据后，需要重新添加。
        </p>
      </div>
    </>
  );
}
