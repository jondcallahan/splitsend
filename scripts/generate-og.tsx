import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "@vercel/og";
import React from "react";

const fontPath = path.join(
  process.cwd(),
  "node_modules/@fontsource/google-sans-flex/files/google-sans-flex-latin-700-normal.woff"
);
const fontData = fs.readFileSync(fontPath);

const image = new ImageResponse(
  <div
    style={{
      background: "linear-gradient(145deg, #fafafa 0%, #e8e8e8 100%)",
      display: "flex",
      flexDirection: "column",
      fontFamily: '"Google Sans Flex"',
      height: "100%",
      padding: "72px 80px",
      width: "100%",
    }}
  >
    {/* Header */}
    <div style={{ alignItems: "center", display: "flex", marginBottom: "40px" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="56"
        height="56"
        style={{ marginRight: "18px" }}
      >
        <rect width="32" height="32" rx="8" fill="#000" />
        <g transform="translate(4, 4) scale(1)">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
          <path d="M7 6h1v4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
          <path d="m16.71 13.88.7.71-2.82 2.82" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
        </g>
      </svg>
      <div style={{ color: "#000", display: "flex", fontSize: "42px", fontWeight: "bold" }}>
        SplitSend
      </div>
    </div>

    {/* Main content */}
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: "#111",
          display: "flex",
          fontSize: "64px",
          fontWeight: "bold",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          marginBottom: "24px",
        }}
      >
        Split expenses with friends.
      </div>
      <div
        style={{
          color: "#111",
          display: "flex",
          fontSize: "64px",
          fontWeight: "bold",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          marginBottom: "40px",
        }}
      >
        No account needed.
      </div>
      <div
        style={{
          color: "#666",
          display: "flex",
          fontSize: "28px",
          fontWeight: "bold",
          lineHeight: 1.5,
        }}
      >
        Share a link · Track who owes what · Settle up · Free forever
      </div>
    </div>

    {/* Footer */}
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div style={{ color: "#333", display: "flex", fontSize: "24px", fontWeight: "bold" }}>
        splitsend.app
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        {["No sign-up", "No app download", "No ads"].map((tag) => (
          <div
            key={tag}
            style={{
              background: "rgba(0,0,0,0.06)",
              borderRadius: "20px",
              color: "#444",
              display: "flex",
              fontSize: "18px",
              fontWeight: "bold",
              padding: "8px 20px",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>
  </div>,
  {
    fonts: [
      {
        name: "Google Sans Flex",
        data: fontData,
        weight: 700,
        style: "normal" as const,
      },
    ],
    height: 630,
    width: 1200,
  }
);

const buffer = Buffer.from(await image.arrayBuffer());
const outPath = path.join(process.cwd(), "public", "og.png");
fs.writeFileSync(outPath, buffer);
console.log(`✅ OG image written to ${outPath}`);
