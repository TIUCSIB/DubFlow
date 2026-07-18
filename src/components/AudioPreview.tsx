"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";
import { Button, Card, Tooltip } from "@heroui/react";

interface AudioPreviewProps {
  audioBase64: string;
  onDownload: () => void;
}

export default function AudioPreview({
  audioBase64,
  onDownload,
}: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      await audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioBase64]);

  return (
    <Card className="fade-in-up">
      <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
        {"\u914d\u97f3\u9884\u89c8"}
      </h2>

      <audio
        ref={audioRef}
        src={`data:audio/mpeg;base64,${audioBase64}`}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          isIconOnly
          onPress={togglePlayPause}
          aria-label={isPlaying ? "\u6682\u505c\u914d\u97f3" : "\u64ad\u653e\u914d\u97f3"}
          className="h-11 w-11 shrink-0 rounded-full"
        >
          <span aria-hidden="true" className="flex items-center justify-center">
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </span>
        </Button>

        <div className="relative min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="progress-gradient h-full rounded-full transition-all duration-75"
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        <Tooltip>
          <Tooltip.Trigger>
            <Button
              variant="outline"
              isIconOnly
              onPress={onDownload}
              aria-label={"\u4e0b\u8f7d\u914d\u97f3"}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              <span aria-hidden="true" className="flex items-center justify-center">
                <Download className="h-4 w-4" />
              </span>
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{"\u4e0b\u8f7d\u914d\u97f3"}</Tooltip.Content>
        </Tooltip>
      </div>
    </Card>
  );
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
