"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, FileVideo, FileText, X } from "lucide-react";
import { Button } from "@heroui/react";
import clsx from "clsx";

interface FileUploaderProps {
  accept: string;
  maxSizeMB: number;
  onFileSelect: (file: File) => void;
  title: string;
  description: string;
  icon: "audio" | "video" | "srt";
}

export default function FileUploader({
  accept,
  maxSizeMB,
  onFileSelect,
  title,
  description,
  icon,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      // 检查文件大小
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`文件大小超过 ${maxSizeMB}MB 限制`);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [maxSizeMB, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const IconComponent = icon === "srt" ? FileText : icon === "video" ? FileVideo : FileAudio;

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          dragOver
            ? "border-teal-500 bg-teal-500/10"
            : "dark:border-gray-700 border-gray-300 dark:hover:border-gray-600 hover:border-gray-400 dark:hover:bg-gray-800/30 hover:bg-gray-50"
        )}
      >
        <IconComponent
          className={clsx(
            "h-10 w-10",
            dragOver ? "text-teal-400" : "dark:text-gray-500 text-gray-400"
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium dark:text-gray-300 text-gray-700">
            {title}
          </p>
          <p className="mt-1 text-xs dark:text-gray-500 text-gray-400">
            {description}
          </p>
          <p className="mt-2 text-xs text-teal-500 dark:text-teal-400">
            点击选择或拖拽文件到此处
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {selectedFile && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border dark:border-gray-700 border-gray-200 dark:bg-gray-800/50 bg-gray-50 p-3">
          <IconComponent className="h-5 w-5 text-teal-500 dark:text-teal-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm dark:text-gray-200 text-gray-800">
              {selectedFile.name}
            </p>
            <p className="text-xs dark:text-gray-500 text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={handleClear}
            aria-label="清除文件"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
