import http from "http";
import https from "https";
import { URL } from "url";
import { Innertube } from "youtubei.js";

let instance: Innertube | null = null;

/** 将不同类型的请求正文转换为 Buffer。 */
async function bodyToBuffer(
  body: NonNullable<RequestInit["body"]>,
): Promise<Buffer> {
  if (typeof body === "string") {
    return Buffer.from(body, "utf-8");
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (body instanceof URLSearchParams) {
    return Buffer.from(body.toString(), "utf-8");
  }
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  return Buffer.from(String(body), "utf-8");
}

/**
 * 基于 Node.js 原生 HTTP 模块的 fetch 实现。
 * 当前运行环境中的内置 fetch 可能出现 TLS 握手失败，因此保留该实现。
 */
async function nativeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let url: string;
  let method = "GET";
  const headers: Record<string, string> = {};
  let body: RequestInit["body"] = undefined;

  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input instanceof Request) {
    url = input.url;
    method = input.method || "GET";
    input.headers.forEach((value, key) => {
      headers[key] = value;
    });
    body = input.body;
  } else {
    url = String(input);
  }

  if (init) {
    if (init.method) method = init.method;
    if (init.body !== undefined) body = init.body;
    if (init.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headers[key] = value;
      });
    }
  }

  return performNativeRequest(url, method, headers, body, 0);
}

async function performNativeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: RequestInit["body"],
  redirectCount: number,
): Promise<Response> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";
  const transport = isHttps ? https : http;
  const reqBody =
    body === undefined || body === null ? undefined : await bodyToBuffer(body);
  const requestHeaders = { ...headers };

  if (reqBody && !hasHeader(requestHeaders, "content-length")) {
    requestHeaders["Content-Length"] = String(reqBody.byteLength);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: requestHeaders,
        timeout: 30000,
      },
      (res) => {
        const status = res.statusCode || 500;
        const location = res.headers.location;

        if (location && [301, 302, 303, 307, 308].includes(status)) {
          res.resume();

          if (redirectCount >= 5) {
            reject(new Error("请求重定向次数过多"));
            return;
          }

          const redirectUrl = new URL(location, parsedUrl).href;
          const switchToGet =
            status === 303 ||
            ((status === 301 || status === 302) &&
              method.toUpperCase() === "POST");
          const redirectHeaders = { ...requestHeaders };

          if (switchToGet) {
            deleteHeader(redirectHeaders, "content-length");
            deleteHeader(redirectHeaders, "content-type");
          }

          void performNativeRequest(
            redirectUrl,
            switchToGet ? "GET" : method,
            redirectHeaders,
            switchToGet ? undefined : body,
            redirectCount + 1,
          ).then(resolve, reject);
          return;
        }

        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) {
            responseHeaders.set(
              key,
              Array.isArray(value) ? value.join(", ") : value,
            );
          }
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const payload = Buffer.concat(chunks);
          const responseBody =
            method.toUpperCase() === "HEAD" || [204, 205, 304].includes(status)
              ? null
              : (payload.buffer.slice(
                  payload.byteOffset,
                  payload.byteOffset + payload.byteLength,
                ) as ArrayBuffer);
          const response = new Response(responseBody, {
            status,
            statusText: res.statusMessage || "",
            headers: responseHeaders,
          });
          Object.defineProperty(response, "url", { value: url });
          resolve(response);
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("请求超时"));
    });
    req.end(reqBody);
  });
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function deleteHeader(headers: Record<string, string>, name: string): void {
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) delete headers[key];
  }
}

/** 获取或创建共享的 Innertube 实例。 */
export async function getInnertube(): Promise<Innertube> {
  if (!instance) {
    instance = await Innertube.create({
      lang: "zh-Hans",
      location: "CN",
      fetch: nativeFetch as typeof fetch,
    });
  }
  return instance;
}

export interface YouTubeOEmbedInfo {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export async function getYouTubeOEmbedInfo(
  videoId: string,
): Promise<YouTubeOEmbedInfo> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  endpoint.searchParams.set("format", "json");
  const response = await nativeFetch(endpoint);
  if (!response.ok) {
    throw new Error("无法获取视频基础信息");
  }
  return response.json() as Promise<YouTubeOEmbedInfo>;
}

/** 从 YouTube 视频链接中提取 videoId。 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }

    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtube-nocookie.com")
    ) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return videoId;

      const pathMatch = parsed.pathname.match(
        /^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/,
      );
      if (pathMatch) return pathMatch[2];
    }
  } catch {
    // 无效 URL，直接返回空值。
  }

  return null;
}
