import { Innertube } from "youtubei.js";
import https from "https";
import http from "http";
import { URL } from "url";

let instance: Innertube | null = null;

/**
 * 将不同类型的 body 转换为 Buffer。
 */
async function bodyToBuffer(body: NonNullable<RequestInit["body"]>): Promise<Buffer> {
  if (typeof body === "string") {
    return Buffer.from(body, "utf-8");
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
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
 * 基于 Node.js 原生 https 模块的 fetch 实现。
 * Node.js 内置的 globalThis.fetch（undici）在某些代理/网络环境下
 * 会出现 TLS 握手失败，原生 https 模块则没有这个问题。
 */
async function nativeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  // 从 input 和 init 中提取请求参数
  let url: string;
  let method = "GET";
  let headers: Record<string, string> = {};
  let body: RequestInit["body"] = undefined;

  // 先从 input 提取信息
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input instanceof Request) {
    url = input.url;
    method = input.method || "GET";
    input.headers.forEach((v, k) => { headers[k] = v; });
    body = input.body as RequestInit["body"];
  } else {
    url = String(input);
  }

  // init 中的值覆盖 input 中的值
  if (init) {
    if (init.method) method = init.method;
    if (init.body !== undefined) body = init.body;
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.assign(headers, init.headers);
      }
    }
  }

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";
  const transport = isHttps ? https : http;

  let reqBody: Buffer | undefined;
  if (body) {
    reqBody = await bodyToBuffer(body);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        timeout: 30000,
      },
      (res) => {
        const respHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (v) respHeaders.set(k, Array.isArray(v) ? v.join(", ") : v);
        }

        const respBody = new ReadableStream({
          start(controller) {
            res.on("data", (chunk: Buffer) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            res.on("end", () => controller.close());
            res.on("error", (err) => controller.error(err));
          },
        });

        resolve(
          new Response(respBody, {
            status: res.statusCode || 500,
            statusText: res.statusMessage || "",
            headers: respHeaders,
          }),
        );
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("请求超时"));
    });

    if (reqBody) {
      req.end(reqBody);
    } else {
      req.end();
    }
  });
}

/**
 * 获取或创建共享的 Innertube 实例。
 */
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

export async function getYouTubeOEmbedInfo(videoId: string): Promise<YouTubeOEmbedInfo> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  endpoint.searchParams.set("format", "json");
  const response = await nativeFetch(endpoint);
  if (!response.ok) {
    throw new Error("\u65e0\u6cd5\u83b7\u53d6\u89c6\u9891\u57fa\u7840\u4fe1\u606f");
  }
  return response.json() as Promise<YouTubeOEmbedInfo>;
}

/**
 * 从 YouTube 视频链接中提取 videoId。
 */
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
      const v = parsed.searchParams.get("v");
      if (v) return v;

      const pathMatch = parsed.pathname.match(
        /^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/,
      );
      if (pathMatch) return pathMatch[2];
    }
  } catch {
    // 无效 URL，忽略
  }

  return null;
}
