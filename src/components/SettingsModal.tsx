"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Input } from "@heroui/react";
import { Settings, Eye, EyeOff, Check, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasExistingKey, setHasExistingKey] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setHasExistingKey(data.hasApiKey);
    } catch (err) {
      console.error("获取设置失败:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setApiKey("");
      setStatus("idle");
    }
  }, [isOpen, fetchSettings]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setStatus("error");
      return;
    }

    setIsLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimoApiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setHasExistingKey(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <Modal.Heading>设置</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API Key 配置
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    配置 MiMo API Key 以使用配音功能
                  </p>
                </div>

                {hasExistingKey && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      已配置 API Key
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    MiMo API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="输入你的 API Key"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setStatus("idle");
                      }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
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

                {status === "success" && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      API Key 保存成功！
                    </span>
                  </div>
                )}

                {status === "error" && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {apiKey.trim() ? "保存失败，请重试" : "请输入 API Key"}
                    </span>
                  </div>
                )}

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    如何获取 API Key？
                  </h4>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                    <li>访问 MiMo 官网并注册账号</li>
                    <li>在控制台中创建 API Key</li>
                    <li>复制 API Key 并粘贴到上方输入框</li>
                  </ol>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                isLoading={isLoading}
                isDisabled={!apiKey.trim()}
              >
                保存
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
