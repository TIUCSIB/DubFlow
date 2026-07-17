# DubFlow 项目开发规范

## 项目概述

DubFlow 是一个 YouTube 视频智能配音平台，支持一键将英文视频翻译成中文配音，内置声音克隆与音色设计功能。

技术栈：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + HeroUI React v3。

## 核心依赖

| 包名 | 用途 |
|------|------|
| @heroui/react | UI 组件库（按钮、表单、弹窗、卡片等全部使用 HeroUI） |
| @heroui/styles | HeroUI 样式系统（BEM 类名、variant 函数、滚动条工具类） |
| 
ext 16 | 框架（App Router，注意读取 
ode_modules/next/dist/docs/ 中的变更指南） |
| eact / eact-dom 19 | UI 运行时 |
| 	ailwindcss v4 | 原子化 CSS |
| lucide-react | 图标库 |
| clsx | 条件类名拼接 |

## 项目结构

`
src/
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── layout.tsx          # 根布局（字体、ThemeProvider 包裹）
│   ├── page.tsx            # 主页面（"use client"，Pipeline 交互逻辑）
│   ├── globals.css         # 全局样式（Tailwind + HeroUI 导入）
│   └── api/                # API 路由
│       ├── asr/route.ts        # 语音识别
│       ├── clone-voice/route.ts # 声音克隆
│       ├── design-voice/route.ts # 声音设计
│       ├── translate/route.ts   # 翻译
│       └── tts/route.ts        # 语音合成
├── components/             # 组件目录
│   ├── Header.tsx          # 顶部导航栏
│   ├── PipelineProgress.tsx # 流水线进度指示器
│   ├── SubtitleEditor.tsx  # 字幕编辑器
│   ├── VoiceSelector.tsx   # 音色选择器
│   └── theme/
│       └── ThemeProvider.tsx # 主题上下文 Provider
├── lib/                    # 工具函数
│   ├── mimo.ts             # MiMo API 封装
│   └── subtitle.ts         # 字幕解析工具
└── types/
    └── index.ts            # 全局类型定义
`

## HeroUI 组件库使用规范（重要）

项目使用 HeroUI React v3，这是一个基于 Tailwind CSS v4 和 React Aria Components 构建的组件库。

### 基本原则

- **优先使用 HeroUI 组件**，不要自己手写按钮、表单、弹窗、标签页、卡片等 UI，避免重复造轮子
- HeroUI v3 不需要 Provider 包裹，直接导入使用即可
- 所有组件从 @heroui/react 导入，样式工具从 @heroui/styles 导入
- 遇到不确定的组件用法时，查阅 .heroui-docs/react/ 目录下的文档

### 可用组件一览

**按钮类：** Button, ButtonGroup, ToggleButton, ToggleButtonGroup, CloseButton
**表单类：** Input, TextArea, SearchField, NumberField, InputOTP, InputGroup, Checkbox, CheckboxGroup, RadioGroup, Select, ComboBox, Autocomplete, Form, Fieldset, Label, Description, ErrorMessage, FieldError
**数据展示：** Table, Badge, Chip, Card, Avatar, Typography, Kbd
**反馈类：** Alert, Spinner, ProgressCircle, ProgressBar, Meter, Skeleton
**导航类：** Tabs, Link, Breadcrumbs, Accordion, Disclosure, DisclosureGroup, Pagination
**弹窗类：** Modal, Drawer, Popover, AlertDialog, Tooltip, Toast
**布局类：** Separator, Surface, Toolbar, ScrollShadow
**日期时间：** Calendar, DatePicker, DateRangePicker, RangeCalendar, DateField, TimeField
**颜色选择：** ColorPicker, ColorArea, ColorField, ColorSlider, ColorSwatch, ColorSwatchPicker
**集合类：** Dropdown, ListBox, TagGroup
**开关类：** Switch, Slider

### 导入方式

`	sx
// 组件导入
import { Button, Input, Modal, Tabs } from "@heroui/react";

// 样式工具导入（用于给非 HeroUI 元素套用 HeroUI 样式）
import { buttonVariants, tv } from "@heroui/styles";

// 类型导入（推荐命名类型导入）
import type { ButtonRootProps } from "@heroui/react";
`

### 样式自定义

- 所有 HeroUI 组件都接受 className 属性，用 Tailwind 工具类覆盖默认样式
- 支持 BEM 类名直接使用（如 utton button--primary）
- 支持 render props 做动态样式（({ isPressed }) => ...）
- 自定义 variant 用 	v() 扩展已有 variant 函数：

`	sx
import { Button } from "@heroui/react";
import { buttonVariants, tv } from "@heroui/styles";

const myVariants = tv({
  extend: buttonVariants,
  base: "font-semibold",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white",
      danger: "bg-red-500 text-white",
    },
  },
});
`

### 与 Next.js Link 配合

HeroUI 按钮样式可以复用到 Next.js Link 上：

`	sx
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";

<Link className={buttonVariants({ variant: "primary" })} href="/about">
  关于我们
</Link>
`

## 主题与暗色模式

- 项目使用自定义 ThemeProvider（src/components/theme/ThemeProvider.tsx），基于 React Context 实现
- 切换主题通过 useTheme() hook，返回 { theme, toggleTheme }
- 暗色模式通过在 <html> 上切换 dark class 实现
- HeroUI 组件自动响应 .dark class，无需额外配置
- 主题偏好存储在 localStorage 的 dubflow-theme 键中

### 样式注意事项

- 全局样式文件 globals.css 的导入顺序：先 @import "tailwindcss"，再导入其他内容
- 如果全局引入 HeroUI 样式，@import "@heroui/styles" 要放在 @import "tailwindcss" 之后
- 主题色变量使用 CSS 自定义属性（--background, --foreground 等）

## TypeScript 规范

- 路径别名：@/* 映射到 ./src/*
- 全局类型统一放在 src/types/index.ts 中
- 组件 props 使用 interface 定义
- 使用 	ype 导入语法（import type { ... }）导入纯类型

## 编码风格

- 客户端组件在文件顶部标注 "use client"
- 服务端组件保持默认（不需要标注）
- 使用 useCallback 包裹事件处理函数，避免不必要的重渲染
- 类名拼接优先使用 clsx，不要手写三元表达式拼接
- 图标统一使用 lucide-react
- 组件采用 export default function ComponentName() 的导出方式

## API 路由规范

- API 路由放在 src/app/api/ 目录下，每个功能一个子目录
- 统一使用 Next.js Route Handlers（oute.ts）
- 错误处理返回标准 JSON 格式：{ error: "错误信息" }

## 重要提醒

- 这是 Next.js 16 项目，API 和约定可能与你记忆中的版本有差异，写代码前请查阅 
ode_modules/next/dist/docs/ 中的相关文档
- HeroUI v3 的 API 与 v2 不同，使用前务必查阅 .heroui-docs/react/ 目录下的文档，不要凭记忆写代码
- 不要自己手写 HeroUI 已经提供的 UI 功能（如弹窗、表单验证、标签切换等）