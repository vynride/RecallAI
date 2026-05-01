import { ImageResponse } from "next/og";

export const alt = "RecallAI — Question papers, decoded.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#17171c",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + brand name */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <svg
            width="52"
            height="52"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="48" rx="11" fill="#ff7759" />
            <path
              d="M24 12 A12 12 0 1 1 12 24"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <polygon points="8,21 12,27 16,21" fill="white" />
            <circle cx="24" cy="24" r="3.5" fill="white" />
          </svg>
          <span
            style={{
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.15em",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            RecallAI
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              fontFamily: "sans-serif",
            }}
          >
            Question papers,
            <br />
            decoded.
          </div>
          <div
            style={{
              color: "#9ca3af",
              fontSize: 26,
              lineHeight: 1.5,
              fontFamily: "sans-serif",
            }}
          >
            Upload past papers, get a topic-sorted,
            <br />
            difficulty-ranked PDF you can actually study from.
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff7759",
            }}
          />
          <span
            style={{
              color: "#ff7759",
              fontSize: 17,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            Bring Your Own Gemini Key
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
