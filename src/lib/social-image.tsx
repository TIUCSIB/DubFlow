import { ImageResponse } from "next/og";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

const PRODUCT_LINE = "YouTube \u89c6\u9891\u667a\u80fd\u5904\u7406\u5de5\u4f5c\u53f0";
const HEADLINE = "\u667a\u80fd\u5b57\u5e55\u3001\u7ffb\u8bd1\u4e0e\u4e2d\u6587\u914d\u97f3";
const FEATURES =
  "\u89c6\u9891\u89e3\u6790  \u00b7  \u5b57\u5e55\u63d0\u53d6  \u00b7  \u81ea\u52a8\u7ffb\u8bd1  \u00b7  \u5b57\u5e55\u7f16\u8f91  \u00b7  \u8bed\u97f3\u5408\u6210";

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f8fafc",
          color: "#111827",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 28,
            height: "100%",
            background: "#00a78e",
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 84px 68px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#00a78e",
                color: "white",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              DF
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 700 }}>DubFlow</div>
              <div style={{ marginTop: 6, fontSize: 22, color: "#64748b" }}>
                {PRODUCT_LINE}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                maxWidth: 890,
                fontSize: 66,
                lineHeight: 1.18,
                fontWeight: 700,
              }}
            >
              {HEADLINE}
            </div>
            <div
              style={{
                marginTop: 28,
                maxWidth: 900,
                fontSize: 28,
                lineHeight: 1.5,
                color: "#475569",
              }}
            >
              {FEATURES}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#00a78e",
              }}
            />
            <div style={{ fontSize: 22, color: "#64748b" }}>
              dubflow-app.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    socialImageSize,
  );
}
