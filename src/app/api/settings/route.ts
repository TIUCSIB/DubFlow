import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), ".settings.json");

interface Settings {
  mimoApiKey?: string;
  [key: string]: string | undefined;
}

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

// GET: 读取设置（不返回完整的API Key，只返回是否已配置）
export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({
    mimoApiKey: settings.mimoApiKey ? "已配置" : "未配置",
    hasApiKey: !!settings.mimoApiKey,
  });
}

// POST: 保存设置
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mimoApiKey } = body;

    if (!mimoApiKey) {
      return NextResponse.json({ error: "API Key不能为空" }, { status: 400 });
    }

    const settings = await readSettings();
    settings.mimoApiKey = mimoApiKey;
    await writeSettings(settings);

    return NextResponse.json({ success: true, message: "API Key保存成功" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
