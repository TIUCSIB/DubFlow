<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="DubFlow：从视频、字幕和文本到中文配音的本地工作台">
</p>

<p align="center">
  <strong>把识别、翻译、字幕校对、音色选择和配音导出放进同一条工作流。</strong>
</p>

<p align="center">
  <a href="#功能概览">功能概览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#youtube-说明">YouTube 说明</a> ·
  <a href="#技术栈">技术栈</a>
</p>

DubFlow 是一个面向中文内容创作者的本地视频翻译与配音工作台。它支持音频、视频、SRT、文本和 YouTube 链接输入，可在浏览器中完成语音识别、字幕翻译、逐条校对、配音试听与文件导出。

## 功能概览

| 环节 | 已支持能力 |
| --- | --- |
| 内容输入 | 上传音频或视频、导入 SRT、直接输入文本、解析 YouTube 链接 |
| 识别与翻译 | 音视频语音识别、SRT 自动翻译、识别文本与译文查看 |
| 字幕处理 | 原文与译文逐条校对、搜索与状态筛选、单条配音试听 |
| 音色配置 | 9 种内置音色、参考音频声音克隆、自然语言音色设计 |
| 文件输出 | 识别/翻译 TXT、单语或中英双语 SRT、合并后的 WAV 配音音频 |
| YouTube 工具 | 字幕下载与加载、MP3 码率选择、MP4 清晰度与文件大小展示、下载进度 |

设置面板提供 MiMo、DeepL Free 和 Google 三种翻译服务选项。MiMo 同时承担语音识别、语音合成、声音克隆与音色设计。

## 工作流程

1. **导入内容**：上传本地文件、粘贴 YouTube 链接、导入 SRT，或直接填写配音文本。
2. **获得字幕**：从音视频识别文本，或从 YouTube 选择已有字幕轨道。
3. **翻译校对**：自动生成译文，在字幕编辑器中搜索、筛选和逐条修改。
4. **配置声音**：选择内置音色，上传参考人声，或用文字描述目标音色。
5. **试听导出**：试听单条译文，导出字幕文件或合成完整配音音频。

## 快速开始

### 运行要求

- Node.js `20.9.0` 或更高版本
- npm
- 已加入系统 `PATH` 的 [`yt-dlp`](https://github.com/yt-dlp/yt-dlp)，用于 YouTube 音视频下载

先确认本机可以执行：

```bash
node --version
yt-dlp --version
```

### 安装运行

```bash
git clone https://github.com/TIUCSIB/DubFlow.git
cd DubFlow
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，点击右上角设置按钮，然后完成以下配置：

1. 添加 MiMo API Key，并选择当前使用的配置。
2. 选择翻译服务；使用 DeepL 时还需要填写 DeepL API Key。
3. 返回主界面并选择输入方式。

Google 翻译选项无需 API Key。没有 MiMo API Key 时，语音识别、配音合成、声音克隆和音色设计无法使用。

## API Key 与数据

- API Key 配置保存在当前浏览器的 `localStorage` 中，清理站点数据后需要重新填写。
- 项目不会把本地 `.env*` 文件提交到 Git；仓库的 `.gitignore` 已覆盖这些文件。
- 处理内容时，文本或音频会发送给所选的外部服务，请避免上传不应离开本机的敏感资料。
- 在共享电脑上使用后，建议删除已保存的 API Key 配置。

## YouTube 说明

YouTube 字幕和媒体格式取决于视频本身、地区、网络环境及平台访问策略。部分视频会要求登录确认访问者身份；遇到这种情况时，DubFlow 只能显示基础视频信息，字幕和媒体下载会暂时停用。

媒体下载会先在服务端创建任务，完整处理结束后再由浏览器保存文件。MP3 转码、MP4 音视频合并和进度读取均依赖系统中的 `yt-dlp`，并需要可写的临时目录。

当前下载实现使用 Node.js 子进程、内存中的任务状态和本地临时文件。生产部署需要长期运行的 Node.js 服务、可写文件系统以及可执行的 `yt-dlp`；无服务器平台的一键部署通常无法满足这些条件。

请只下载你有权保存和使用的内容，并遵守 YouTube 的服务条款及所在地法律。

## 输出说明

- 字幕可以导出为译文 SRT 或中英双语 SRT。
- 多段配音会在浏览器中合并为 WAV 文件。
- 文本输入会直接生成可试听、可下载的 MP3 音频。
- YouTube 工具下载的是原视频提供的媒体流，视频清晰度和音频码率按解析结果选择。
- 当前版本尚未把翻译字幕和新配音重新封装成完整视频文件。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Next.js 16 / React 19 | App Router、页面与服务端 Route Handlers |
| TypeScript | 类型约束与业务模型 |
| HeroUI React 3 | 按钮、表单、标签页、反馈与进度组件 |
| Tailwind CSS 4 | 页面样式与响应式布局 |
| youtubei.js | YouTube 视频信息、字幕和媒体格式解析 |
| yt-dlp | YouTube 媒体下载、转码与音视频合并 |
| ffmpeg-static | 本地上传视频的音频提取 |
| MiMo API | 语音识别、翻译、语音合成、声音克隆、音色设计 |

## 项目结构

```text
src/
├── app/
│   ├── api/          # 识别、翻译、合成、导出与 YouTube Route Handlers
│   └── page.tsx      # 主工作台与流程状态
├── components/       # 输入、字幕编辑、音色、导出和下载界面
├── lib/              # MiMo、YouTube、字幕与音频处理逻辑
└── types/            # 全局 TypeScript 类型
```

## 开发命令

```bash
npm run dev    # 启动开发服务器
npm run build  # 创建生产构建
npm run start  # 启动生产服务器
```

仓库目前处于持续开发阶段，尚未附带开源许可证文件。
