'use client'

import { useState, useRef, useCallback } from 'react'
import type { VoiceMode } from '@/types'
import { Mic, Paintbrush, Upload, X, Music } from 'lucide-react'
import { Button, Card, ToggleButtonGroup, ToggleButton, TextArea } from '@heroui/react'
import clsx from 'clsx'

const BUILTIN_VOICES = [
  { id: 'mimo_default', label: '默认' },
  { id: '冰糖', label: '冰糖' },
  { id: '茉莉', label: '茉莉' },
  { id: '苏打', label: '苏打' },
  { id: '白桦', label: '白桦' },
  { id: 'Mia', label: 'Mia' },
  { id: 'Chloe', label: 'Chloe' },
  { id: 'Milo', label: 'Milo' },
  { id: 'Dean', label: 'Dean' },
] as const

const VOICE_MODE_TABS: { key: VoiceMode; label: string; icon: React.ElementType }[] = [
  { key: 'builtin', label: '内置音色', icon: Mic },
  { key: 'clone', label: '声音克隆', icon: Music },
  { key: 'design', label: '声音设计', icon: Paintbrush },
]

interface VoiceSelectorProps {
  voiceMode: VoiceMode
  onChange: (mode: VoiceMode) => void
  builtinVoice: string
  onBuiltinVoiceChange: (v: string) => void
  voiceDescription: string
  onVoiceDescriptionChange: (d: string) => void
  referenceAudioFile: File | null
  onReferenceAudioChange: (f: File | null) => void
}

export default function VoiceSelector({
  voiceMode,
  onChange,
  builtinVoice,
  onBuiltinVoiceChange,
  voiceDescription,
  onVoiceDescriptionChange,
  referenceAudioFile,
  onReferenceAudioChange,
}: VoiceSelectorProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file && isSupportedReferenceAudio(file)) {
        onReferenceAudioChange(file)
      }
    },
    [onReferenceAudioChange],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onReferenceAudioChange(file)
      }
    },
    [onReferenceAudioChange],
  )

  return (
    <Card className="fade-in-up">
      <h2 className="mb-4 text-sm font-medium dark:text-gray-300 text-gray-700">音色配置</h2>

      {/* 标签页切换 */}
      <ToggleButtonGroup
        className="mb-5"
        selectionMode="single"
        selectedKeys={new Set([voiceMode])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as VoiceMode
          if (selected) onChange(selected)
        }}
        fullWidth
        isDetached
        size="sm"
      >
        {VOICE_MODE_TABS.map(({ key, label, icon: Icon }) => (
          <ToggleButton key={key} id={key}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* 内置音色网格 */}
      {voiceMode === 'builtin' && (
        <ToggleButtonGroup
          className="flex flex-wrap gap-2"
          selectionMode="single"
          selectedKeys={new Set([builtinVoice])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string
            if (selected) onBuiltinVoiceChange(selected)
          }}
          isDetached
        >
          {BUILTIN_VOICES.map(({ id, label }) => (
            <ToggleButton key={id} id={id}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {/* 声音克隆 - 拖拽上传 */}
      {voiceMode === 'clone' && (
    <div>
          {referenceAudioFile ?
            <div className="flex items-center gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3">
              <Music className="h-5 w-5 text-teal-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm dark:text-gray-200 text-gray-800">{referenceAudioFile.name}</p>
                <p className="text-xs dark:text-gray-500 text-gray-500">{(referenceAudioFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <Button variant="ghost" isIconOnly size="sm" onPress={() => onReferenceAudioChange(null)}>
                <span aria-hidden="true">
                  <X className="h-4 w-4" />
                </span>
              </Button>
            </div>
          : <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
                dragOver ? 'border-teal-500 bg-teal-500/10' : (
                  'dark:border-gray-700 border-gray-300 dark:hover:border-gray-600 hover:border-gray-400 dark:hover:bg-gray-800/30 hover:bg-gray-100/50'
                ),
              )}
            >
              <Upload className={clsx('h-8 w-8', dragOver ? 'text-teal-400' : 'dark:text-gray-600 text-gray-400')} />
              <div className="text-center">
                <p className="text-sm dark:text-gray-400 text-gray-500">
                  拖拽音频文件到这里，或者 <span className="text-teal-500 dark:text-teal-400">点击选择</span>
                </p>
                <p className="mt-1 text-xs dark:text-gray-600 text-gray-400">支持 MP3、WAV 格式，建议 3~10 秒清晰人声</p>
              </div>
              <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" onChange={handleFileSelect} className="hidden" />
            </div>
          }

          <p className="mt-3 text-xs leading-relaxed dark:text-gray-600 text-gray-400">上传一段清晰的参考音频，系统会模仿其音色生成中文配音。建议选取 3~10 秒无背景噪音的纯人声片段。</p>
        </div>
      )}

      {/* 声音设计 - 文字描述 */}
      {voiceMode === 'design' && (
        <div>
          <TextArea
            value={voiceDescription}
            onChange={(e) => onVoiceDescriptionChange(e.target.value)}
            placeholder="描述你想要的声音特征，例如：温柔的年轻女性，播音腔，语速适中..."
            rows={3}
            fullWidth
            variant="secondary"
          />
          <p className="mt-2 text-xs dark:text-gray-600 text-gray-400">用自然语言描述你想要的声音风格、年龄、性别和情绪特点，AI 会根据你的描述生成匹配的音色。</p>
        </div>
      )}
    </Card>
  )
}

function isSupportedReferenceAudio(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'audio/mpeg' || file.type === 'audio/wav' || name.endsWith('.mp3') || name.endsWith('.wav')
}

