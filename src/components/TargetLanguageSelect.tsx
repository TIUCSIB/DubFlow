"use client";

import { Label, ListBox, Select } from "@heroui/react";
import type { TargetLanguage } from "@/types";

interface TargetLanguageSelectProps {
  value: TargetLanguage;
  onChange: (value: TargetLanguage) => void;
}

export default function TargetLanguageSelect({
  value,
  onChange,
}: TargetLanguageSelectProps) {
  return (
    <Select
      value={value}
      onChange={(nextValue) => {
        const normalized = String(nextValue);
        onChange(normalized === "en" ? "en" : "zh");
      }}
      className="mt-3 w-full"
      variant="secondary"
    >
      <Label>{"\u914d\u97f3\u8bed\u8a00"}</Label>
      <Select.Trigger className="min-h-11 rounded-lg border px-3">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
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
