'use client'

import { useCallback, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '@heroui/react'
import type { ExportProgress, SubtitleEntry, TranslatedEntry, VoiceMode } from '@/types'
import AudioPreview from '@/components/AudioPreview'
import AudioResultPanel, { type AudioResultView } from '@/components/AudioResultPanel'
import ExportPanel, { DownloadLinks } from '@/components/ExportPanel'
import Header from '@/components/Header'
import SubtitleEditor from '@/components/SubtitleEditor'
import TextInputPanel from '@/components/TextInputPanel'
import TranslationInputTabs from '@/components/TranslationInputTabs'
import VoiceSelector from '@/components/VoiceSelector'
import { getApiKeyHeaders } from '@/lib/api-key-storage'

type InputMode = 'text' | 'file' | 'srt' | 'youtube'

interface ExportResult {
  srtContent: string
  audioSegments: { index: number; base64: string; duration: number }[]
}

interface ExportProgressEvent {
  type: 'progress' | 'complete' | 'error'
  phase?: 'synthesizing'
  current?: number
  total?: number
  error?: string
  srtContent?: string
  audioSegments?: ExportResult['audioSegments']
}

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [audioResultView, setAudioResultView] = useState<AudioResultView>('recognized')
  const [pageError, setPageError] = useState<string | null>(null)
  const [originalEntries, setOriginalEntries] = useState<SubtitleEntry[]>([])
  const [translatedEntries, setTranslatedEntries] = useState<TranslatedEntry[]>([])
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('builtin')
  const [builtinVoice, setBuiltinVoice] = useState('mimo_default')
  const [voiceDescription, setVoiceDescription] = useState('')
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null)
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingSrt, setIsExportingSrt] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportAudioUrl, setExportAudioUrl] = useState<string | null>(null)
  const [exportSrtUrl, setExportSrtUrl] = useState<string | null>(null)

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode)
    setAudioResultView('recognized')
    setOriginalEntries([])
    setTranslatedEntries([])
    setAudioBase64(null)
    clearObjectUrl(setExportAudioUrl)
    clearObjectUrl(setExportSrtUrl)
    setExportProgress(null)
    setIsExportingSrt(false)
    setPageError(null)
  }, [])

  const synthesizeText = useCallback(
    async (text: string) => {
      const referenceAudio = referenceAudioFile ? await fileToBase64(referenceAudioFile) : undefined

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: getApiKeyHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          text,
          voiceMode,
          builtinVoice: voiceMode === 'builtin' ? builtinVoice : undefined,
          referenceAudio,
          referenceAudioFormat: getReferenceAudioFormat(referenceAudioFile),
          voiceDescription: voiceMode === 'design' ? voiceDescription : undefined,
          outputFormat: 'mp3',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '语音合成失败')
      }

      const data = await response.json()
      return data.audioBase64 as string
    },
    [builtinVoice, referenceAudioFile, voiceDescription, voiceMode],
  )

  const handleGenerateText = useCallback(
    async (text: string) => {
      setIsGeneratingText(true)
      setPageError(null)
      setAudioBase64(null)

      try {
        const generatedAudio = await synthesizeText(text)
        const entry: SubtitleEntry = {
          index: 1,
          startTime: '00:00:00,000',
          endTime: '00:00:00,000',
          text,
          startMs: 0,
          endMs: 0,
        }

        setOriginalEntries([entry])
        setTranslatedEntries([{ ...entry, translatedText: text }])
        setAudioBase64(generatedAudio)
      } catch (error: unknown) {
        setPageError(error instanceof Error ? error.message : '语音合成失败')
      } finally {
        setIsGeneratingText(false)
      }
    },
    [synthesizeText],
  )

  const handlePreviewTranslation = useCallback(
    async (index: number) => {
      const entry = translatedEntries[index]
      if (!entry?.translatedText.trim()) {
        setPageError('请先填写译文')
        return
      }

      setPreviewingIndex(index)
      setPageError(null)
      setAudioBase64(null)

      try {
        setAudioBase64(await synthesizeText(entry.translatedText))
      } catch (error: unknown) {
        setPageError(error instanceof Error ? error.message : '语音合成失败')
      } finally {
        setPreviewingIndex(null)
      }
    },
    [synthesizeText, translatedEntries],
  )

  const handleUpdateTranslation = useCallback((index: number, text: string) => {
    setTranslatedEntries((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, translatedText: text } : entry)))
    setAudioBase64(null)
  }, [])

  const handleDownload = useCallback(() => {
    if (!audioBase64) return

    downloadBlob(new Blob([decodeBase64(audioBase64)], { type: 'audio/mpeg' }), 'dubflow-output.mp3')
  }, [audioBase64])

  const handleExport = useCallback(
    async (options: { srtBilingual: boolean; withAudio: boolean }) => {
      if (translatedEntries.length === 0) return

      if (options.withAudio) {
        setIsExporting(true)
      } else {
        setIsExportingSrt(true)
      }
      setExportProgress(
        options.withAudio ?
          {
            phase: 'synthesizing',
            current: 0,
            total: translatedEntries.length,
          }
        : null,
      )
      clearObjectUrl(setExportAudioUrl)
      clearObjectUrl(setExportSrtUrl)
      setPageError(null)

      try {
        const referenceAudio = options.withAudio && voiceMode === 'clone' && referenceAudioFile ? await fileToBase64(referenceAudioFile) : undefined
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: getApiKeyHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            entries: translatedEntries,
            voiceMode,
            builtinVoice: voiceMode === 'builtin' ? builtinVoice : undefined,
            referenceAudio,
            referenceAudioFormat: getReferenceAudioFormat(referenceAudioFile),
            voiceDescription: voiceMode === 'design' ? voiceDescription : undefined,
            outputFormat: 'mp3',
            srtBilingual: options.srtBilingual,
            withAudio: options.withAudio,
            streamProgress: options.withAudio,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || '导出失败')
        }

        const data = options.withAudio ? await readExportStream(response, setExportProgress) : ((await response.json()) as ExportResult)

        if (!data.srtContent) {
          throw new Error('导出结果缺少字幕内容')
        }

        setExportSrtUrl(
          URL.createObjectURL(
            new Blob([data.srtContent], {
              type: 'text/plain;charset=utf-8',
            }),
          ),
        )

        if (options.withAudio && data.audioSegments.length > 0) {
          setExportProgress({
            phase: 'merging',
            current: data.audioSegments.length,
            total: data.audioSegments.length,
          })
          const audioBlob = await mergeAudioSegments(data.audioSegments)
          setExportAudioUrl(URL.createObjectURL(audioBlob))
        }
      } catch (error: unknown) {
        setPageError(error instanceof Error ? error.message : '导出失败')
      } finally {
        setIsExporting(false)
        setIsExportingSrt(false)
        setExportProgress(null)
      }
    },
    [builtinVoice, referenceAudioFile, translatedEntries, voiceDescription, voiceMode],
  )

  const showVoiceSelector = inputMode === 'text' || translatedEntries.length > 0

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <TranslationInputTabs
          inputMode={inputMode}
          originalEntries={originalEntries}
          translatedEntries={translatedEntries}
          onInputModeChange={handleInputModeChange}
          onOriginalEntriesChange={setOriginalEntries}
          onTranslatedEntriesChange={setTranslatedEntries}
          onError={setPageError}
        />

        {pageError && <p className="text-sm text-red-400">{pageError}</p>}

        {inputMode !== 'text' && !pageError && translatedEntries.length === 0 && (
          <Card className="fade-in-up flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center">
            <Sparkles className="h-8 w-8 text-teal-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {'\u4e0a\u4f20\u97f3\u9891\u3001\u89c6\u9891\u6216\u5b57\u5e55\u6587\u4ef6\uff0c\u5f00\u59cb\u667a\u80fd\u914d\u97f3\u6d41\u7a0b'}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{'\u652f\u6301\u8bed\u97f3\u8bc6\u522b \u2192 \u81ea\u52a8\u7ffb\u8bd1 \u2192 \u914d\u97f3\u5408\u6210'}</p>
            </div>
          </Card>
        )}

        {inputMode === 'file' && translatedEntries.length > 0 && (
          <AudioResultPanel entries={originalEntries} translatedEntries={translatedEntries} selectedView={audioResultView} onViewChange={setAudioResultView} />
        )}

        {inputMode === 'text' && (
          <VoiceSelector
            voiceMode={voiceMode}
            onChange={setVoiceMode}
            builtinVoice={builtinVoice}
            onBuiltinVoiceChange={setBuiltinVoice}
            voiceDescription={voiceDescription}
            onVoiceDescriptionChange={setVoiceDescription}
            referenceAudioFile={referenceAudioFile}
            onReferenceAudioChange={setReferenceAudioFile}
          />
        )}

        {inputMode === 'text' && (
          <TextInputPanel
            value={textInput}
            onChange={setTextInput}
            onGenerate={async () => {
              const text = textInput.trim()
              if (!text) return

              setPageError(null)
              await handleGenerateText(text)
            }}
            isGenerating={isGeneratingText}
          />
        )}

        {inputMode !== 'text' && showVoiceSelector && (
          <VoiceSelector
            voiceMode={voiceMode}
            onChange={setVoiceMode}
            builtinVoice={builtinVoice}
            onBuiltinVoiceChange={setBuiltinVoice}
            voiceDescription={voiceDescription}
            onVoiceDescriptionChange={setVoiceDescription}
            referenceAudioFile={referenceAudioFile}
            onReferenceAudioChange={setReferenceAudioFile}
          />
        )}

        {inputMode !== 'text' && translatedEntries.length > 0 && (inputMode === 'srt' || inputMode === 'youtube' || audioResultView === 'bilingual') && (
          <SubtitleEditor
            entries={originalEntries}
            translatedEntries={translatedEntries}
            onUpdateTranslation={handleUpdateTranslation}
            onPreviewTranslation={handlePreviewTranslation}
            previewingIndex={previewingIndex}
          />
        )}

        {inputMode !== 'text' && translatedEntries.length > 0 && (
          <>
            <ExportPanel hasEntries onExport={handleExport} isExporting={isExporting} isExportingSrt={isExportingSrt} exportProgress={exportProgress} />
            <DownloadLinks audioDownloadUrl={exportAudioUrl} srtDownloadUrl={exportSrtUrl} audioFilename="dubflow-audio.wav" srtFilename="dubflow-subtitles.srt" />
          </>
        )}

        {audioBase64 && <AudioPreview audioBase64={audioBase64} onDownload={handleDownload} />}

        <div className="h-8" />
      </main>
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getReferenceAudioFormat(file: File | null): 'mp3' | 'wav' {
  return file?.name.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3'
}

async function readExportStream(response: Response, onProgress: (progress: ExportProgress) => void): Promise<ExportResult> {
  if (!response.body) {
    throw new Error('导出服务没有返回进度流')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: ExportResult | null = null

  const handleLine = (line: string) => {
    if (!line.trim()) return

    const event = JSON.parse(line) as ExportProgressEvent
    if (event.type === 'error') {
      throw new Error(event.error || '配音合成失败')
    }
    if (event.type === 'progress') {
      onProgress({
        phase: 'synthesizing',
        current: event.current ?? 0,
        total: event.total ?? 0,
      })
    }
    if (event.type === 'complete') {
      result = {
        srtContent: event.srtContent || '',
        audioSegments: event.audioSegments || [],
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    lines.forEach(handleLine)
    if (done) break
  }

  if (buffer.trim()) handleLine(buffer)
  if (!result) throw new Error('导出服务没有返回完整结果')
  return result
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function clearObjectUrl(setter: React.Dispatch<React.SetStateAction<string | null>>) {
  setter((url) => {
    if (url) URL.revokeObjectURL(url)
    return null
  })
}

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return buffer
}

async function mergeAudioSegments(segments: { base64: string }[]): Promise<Blob> {
  const audioContext = new window.AudioContext()

  try {
    const buffers = await Promise.all(segments.map(({ base64 }) => audioContext.decodeAudioData(decodeBase64(base64))))

    if (buffers.length === 0) {
      throw new Error('没有可用的音频片段')
    }

    const channelCount = Math.max(...buffers.map((buffer) => buffer.numberOfChannels))
    const sampleRate = Math.max(...buffers.map((buffer) => buffer.sampleRate))
    const totalLength = buffers.reduce((length, buffer) => length + buffer.length, 0)
    const mergedBuffer = audioContext.createBuffer(channelCount, totalLength, sampleRate)

    let offset = 0
    for (const buffer of buffers) {
      for (let channel = 0; channel < channelCount; channel++) {
        const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1)
        mergedBuffer.getChannelData(channel).set(buffer.getChannelData(sourceChannel), offset)
      }
      offset += buffer.length
    }

    return audioBufferToWav(mergedBuffer)
  } finally {
    await audioContext.close()
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channelCount = buffer.numberOfChannels
  const dataLength = buffer.length * channelCount * 2
  const view = new DataView(new ArrayBuffer(44 + dataLength))

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channelCount * 2, true)
  view.setUint16(32, channelCount * 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  const channels = Array.from({ length: channelCount }, (_, channel) => buffer.getChannelData(channel))
  let offset = 44

  for (let sample = 0; sample < buffer.length; sample++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const value = Math.max(-1, Math.min(1, channels[channel][sample]))
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([view], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}
