"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Button, Input, toast } from "@heroui/react";
import {
  Check,
  Eye,
  EyeOff,
  Plus,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ApiKeyProfile, TranslationProvider } from "@/types";
import ApiKeyProfileList from "@/components/ApiKeyProfileList";
import SettingsNotices from "@/components/SettingsNotices";
import TranslationServiceSettings from "@/components/TranslationServiceSettings";
import {
  getDeepLApiKey,
  getSelectedApiKeyId,
  getTranslationProvider,
  loadApiKeyProfiles,
  saveApiKeyProfiles,
  saveDeepLApiKey,
  saveSelectedApiKeyId,
  saveTranslationProvider,
} from "@/lib/api-key-storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: ReactNode;
}

export default function SettingsModal({
  isOpen,
  onClose,
  trigger,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [profiles, setProfiles] = useState<ApiKeyProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [translationProvider, setTranslationProvider] =
    useState<TranslationProvider>("mimo");
  const [deeplApiKey, setDeeplApiKey] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const storedProfiles = loadApiKeyProfiles();
    const storedSelectedId = getSelectedApiKeyId();
    const nextSelectedId = storedProfiles.some(
      (profile) => profile.id === storedSelectedId,
    )
      ? storedSelectedId
      : storedProfiles[0]?.id || null;

    setProfiles(storedProfiles);
    setSelectedId(nextSelectedId);
    setApiKey("");
    setLabel("");
    setShowApiKey(false);
    setVisibleKeys({});
    setTranslationProvider(getTranslationProvider());
    setDeeplApiKey(getDeepLApiKey() || "");
    setStatus("idle");
  }, [isOpen]);

  const handleSave = () => {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      setStatus("error");
      return;
    }

    const existingProfile = profiles.find(
      (profile) => profile.apiKey === normalizedKey,
    );
    const nextProfile: ApiKeyProfile = existingProfile || {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: label.trim() || `API Key ${profiles.length + 1}`,
      apiKey: normalizedKey,
      createdAt: Date.now(),
    };
    const nextProfiles = existingProfile
      ? profiles.map((profile) =>
          profile.id === existingProfile.id
            ? { ...profile, label: label.trim() || profile.label }
            : profile,
        )
      : [...profiles, nextProfile];

    saveApiKeyProfiles(nextProfiles);
    saveSelectedApiKeyId(nextProfile.id);
    setProfiles(nextProfiles);
    setSelectedId(nextProfile.id);
    setApiKey("");
    setLabel("");
    setStatus("idle");
    toast.success("API Key 已保存", {
      description: "当前浏览器已经保存这组配置，并将它设为当前使用的配置。",
    });
  };

  const handleSaveProvider = () => {
    saveTranslationProvider(translationProvider);
    if (translationProvider === "deepl") {
      saveDeepLApiKey(deeplApiKey.trim());
    }
    toast.success("翻译设置已保存");
  };

  const handleSelect = useCallback((id: string) => {
    saveSelectedApiKeyId(id);
    setSelectedId(id);
    setStatus("idle");
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setVisibleKeys((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const nextProfiles = profiles.filter((profile) => profile.id !== id);
      const nextSelectedId =
        selectedId === id ? nextProfiles[0]?.id || null : selectedId;

      saveApiKeyProfiles(nextProfiles);
      saveSelectedApiKeyId(nextSelectedId);
      setProfiles(nextProfiles);
      setSelectedId(nextSelectedId);
      setVisibleKeys((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setStatus("idle");
      toast.success("API Key 配置已删除");
    },
    [profiles, selectedId],
  );

  const selectedProfile = profiles.find((profile) => profile.id === selectedId);

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open: boolean) => !open && onClose()}
      >
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <Modal.Heading>设置</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="max-h-[80vh] overflow-y-auto pr-2 settings-modal-scroll">
              <div className="space-y-4">
                {/* MiMo API Key 配置 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API Key 配置
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    可以保存多组 MiMo API Key，并随时切换使用。
                  </p>
                </div>

                {profiles.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      已保存 {profiles.length} 个配置，当前使用：
                      {selectedProfile?.label || "未选择"}
                    </span>
                  </div>
                )}

                {profiles.length > 0 && (
                  <ApiKeyProfileList
                    profiles={profiles}
                    selectedId={selectedId}
                    visibleKeys={visibleKeys}
                    onSelect={handleSelect}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                  />
                )}

                <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-teal-500" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      添加 API Key
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="settings-label"
                      className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      备注
                    </label>
                    <Input
                      id="settings-label"
                      aria-label="备注"
                      placeholder="例如：主账号、测试账号"
                      value={label}
                      onChange={(event) => {
                        setLabel(event.target.value);
                        setStatus("idle");
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="settings-api-key"
                      className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      API Key
                    </label>
                    <div className="relative min-w-0 flex-1">
                      <Input
                        id="settings-api-key"
                        aria-label="MiMo API Key"
                        type={showApiKey ? "text" : "password"}
                        placeholder="输入你的 API Key"
                        value={apiKey}
                        onChange={(event) => {
                          setApiKey(event.target.value);
                          setStatus("idle");
                        }}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((current) => !current)}
                        aria-label={
                          showApiKey ? "隐藏 API Key" : "查看 API Key"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <TranslationServiceSettings
                  provider={translationProvider}
                  deeplApiKey={deeplApiKey}
                  onProviderChange={setTranslationProvider}
                  onDeepLApiKeyChange={setDeeplApiKey}
                  onSave={handleSaveProvider}
                />
                <SettingsNotices showApiKeyError={status === "error"} />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                关闭
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                isDisabled={!apiKey.trim()}
              >
                保存配置
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
