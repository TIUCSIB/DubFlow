"use client";

import { Button, Card, TextArea } from "@heroui/react";

interface TextInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

export default function TextInputPanel({
  value,
  onChange,
  onGenerate,
  isGenerating,
}: TextInputPanelProps) {
  return (
    <Card className="fade-in-up">
      <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
        配音文本
      </h2>

      <TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入想要生成配音的文本..."
        rows={4}
        fullWidth
      />

      {value.trim() && (
        <Button
          fullWidth
          variant="primary"
          className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600"
          onPress={onGenerate}
          isPending={isGenerating}
        >
          {isGenerating ? "正在生成配音..." : "生成配音"}
        </Button>
      )}
    </Card>
  );
}
