"use client";

import { Tabs } from "@heroui/react";
import { FileText, Type, Upload, Video } from "lucide-react";

const tabClassName =
  "min-h-11 min-w-0 gap-1 whitespace-nowrap px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm";

export default function TranslationInputModeTabList() {
  return (
    <Tabs.ListContainer className="min-w-0 max-w-full">
      <Tabs.List
        aria-label={"\u9009\u62e9\u8f93\u5165\u65b9\u5f0f"}
        className="grid w-full min-w-0 grid-cols-4"
      >
        <Tabs.Tab id="file" className={tabClassName}>
          <Upload className="hidden h-4 w-4 sm:block" />
          <span>{"\u97f3\u9891/\u89c6\u9891"}</span>
          <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
        </Tabs.Tab>
        <Tabs.Tab id="srt" className={tabClassName}>
          <FileText className="hidden h-4 w-4 sm:block" />
          <span>SRT {"\u5b57\u5e55"}</span>
          <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
        </Tabs.Tab>
        <Tabs.Tab id="text" className={tabClassName}>
          <Type className="hidden h-4 w-4 sm:block" />
          <span>{"\u6587\u672c\u8f93\u5165"}</span>
          <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
        </Tabs.Tab>
        <Tabs.Tab id="youtube" className={tabClassName}>
          <Video className="hidden h-4 w-4 sm:block" />
          <span>YouTube</span>
          <Tabs.Indicator className="bg-white shadow-sm dark:bg-gray-700" />
        </Tabs.Tab>
      </Tabs.List>
    </Tabs.ListContainer>
  );
}
