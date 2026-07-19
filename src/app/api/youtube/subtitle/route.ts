import { NextRequest, NextResponse } from "next/server";
import { getInnertube } from "@/lib/youtube";
import {
  buildSubtitleUrls,
  convertCaptionToSrt,
} from "@/lib/youtube-subtitle";

export const runtime = "nodejs";

interface YouTubeCaptionTrack {
  language_code: string;
  name?: { toString(): string };
  base_url: string;
}

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.searchParams.get("baseUrl");
  const videoId = request.nextUrl.searchParams.get("videoId");
  const lang = request.nextUrl.searchParams.get("lang") || "unknown";
  const languageName = request.nextUrl.searchParams.get("languageName") || "";

  if (!baseUrl && !videoId) {
    return NextResponse.json(
      { error: "缺少字幕轨道地址或视频 ID" },
      { status: 400 },
    );
  }

  try {
    if (videoId) {
      const refreshedSrt = await fetchVideoTrackSrt(
        videoId,
        lang,
        languageName,
      );
      if (refreshedSrt) return createSubtitleResponse(refreshedSrt, lang);
    }

    if (baseUrl) {
      const originalSrt = await fetchTrackSrt(baseUrl);
      if (originalSrt) return createSubtitleResponse(originalSrt, lang);
    }

    throw new Error("YouTube 没有返回可用的字幕内容，请稍后重试");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "字幕下载失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function fetchVideoTrackSrt(
  videoId: string,
  languageCode: string,
  languageName: string,
): Promise<string> {
  const innertube = await getInnertube();
  const clients = ["ANDROID", "IOS"] as const;

  for (const client of clients) {
    try {
      const info = await innertube.getBasicInfo(videoId, { client });
      const tracks = (info.captions?.caption_tracks ?? []) as YouTubeCaptionTrack[];
      const track = selectCaptionTrack(tracks, languageCode, languageName);
      if (!track) continue;

      const srtContent = await fetchTrackSrt(track.base_url);
      if (srtContent) return srtContent;
    } catch {
      continue;
    }
  }

  return "";
}

function selectCaptionTrack(
  tracks: YouTubeCaptionTrack[],
  languageCode: string,
  languageName: string,
): YouTubeCaptionTrack | undefined {
  const normalizedCode = normalizeLanguage(languageCode);
  const normalizedName = languageName.trim().toLowerCase();

  return (
    tracks.find(
      (track) => normalizeLanguage(track.language_code) === normalizedCode,
    ) ??
    tracks.find(
      (track) => track.name?.toString().trim().toLowerCase() === normalizedName,
    ) ??
    tracks.find(
      (track) =>
        normalizeLanguage(track.language_code).split("-")[0] ===
        normalizedCode.split("-")[0],
    ) ??
    (languageCode === "unknown" ? tracks[0] : undefined)
  );
}

function normalizeLanguage(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

async function fetchTrackSrt(baseUrl: string): Promise<string> {
  for (const subtitleUrl of buildSubtitleUrls(baseUrl)) {
    const response = await fetch(subtitleUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/xml, text/vtt, application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) continue;

    const srtContent = convertCaptionToSrt(await response.text());
    if (srtContent.trim()) return srtContent;
  }

  return "";
}

function createSubtitleResponse(srtContent: string, language: string) {
  return NextResponse.json({
    srtContent: `${srtContent.trim()}\n`,
    language,
  });
}
