"use client";

import { Label, ListBox, Select } from "@heroui/react";
import type { ASRLanguage } from "@/types";

interface SourceLanguageSelectProps {
  value: ASRLanguage;
  onChange: (value: ASRLanguage) => void;
}

export default function SourceLanguageSelect({
  value,
  onChange,
}: SourceLanguageSelectProps) {
  return (
    <Select
      value={value}
      onChange={(nextValue) => {
        const normalized = String(nextValue);
        onChange(
          normalized === "zh" || normalized === "en" ? normalized : "auto",
        );
      }}
      className="mt-4 w-full"
      variant="secondary"
    >
      <Label>{"\u539f\u59cb\u8bed\u8a00"}</Label>
      <Select.Trigger className="min-h-11 rounded-lg border px-3">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item
            id="auto"
            textValue={"\u81ea\u52a8\u68c0\u6d4b"}
          >
            {"\u81ea\u52a8\u68c0\u6d4b"}
          </ListBox.Item>
          <ListBox.Item id="zh" textValue={"\u4e2d\u6587"}>
            {"\u4e2d\u6587"}
          </ListBox.Item>
          <ListBox.Item id="en" textValue="English">
            English
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
