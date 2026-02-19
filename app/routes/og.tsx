import React from "react";
import { ImageResponse } from "@vercel/og";
import fs from "node:fs";
import path from "node:path";
import { ExpenseDAO } from "~/dao/expense.dao.server";
import { GroupDAO } from "~/dao/group.dao.server";
import { MemberDAO } from "~/dao/member.dao.server";
import { cents } from "~/lib/currency";
import type { Route } from "./+types/og";

// Lazy-load font data (cached after first call)
let _fontData: Buffer | null = null;
function getFontData(): Buffer {
  if (!_fontData) {
    const fontPath = path.join(
      process.cwd(),
      "node_modules/@fontsource/google-sans-flex/files/google-sans-flex-latin-700-normal.woff"
    );
    _fontData = fs.readFileSync(fontPath);
  }
  return _fontData;
}

export const loader = async ({ params }: Route.LoaderArgs) => {
  const group = GroupDAO.findBySlug(params.slug);
  if (!group) return new Response("Not Found", { status: 404 });

  const member = MemberDAO.findByGroupIdAndToken(group.id, params.memberToken);
  if (!member) return new Response("Not Found", { status: 404 });

  const balances = ExpenseDAO.getBalances(group.id);
  const myBalances = balances.filter(
    (b) => b.from_member_id === member.id || b.to_member_id === member.id
  );

  const totalOwed = myBalances
    .filter((b) => b.to_member_id === member.id)
    .reduce((acc, b) => acc + b.amount, 0);
  const totalOwe = myBalances
    .filter((b) => b.from_member_id === member.id)
    .reduce((acc, b) => acc + b.amount, 0);

  const netBalance = totalOwed - totalOwe;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: '"Google Sans Flex"',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="48" height="48" style={{ marginRight: "16px" }}>
              <path d="M0,16 C0,7.2,0,2.8,2.8,0 C7.2,0,7.2,0,16,0 C24.8,0,29.2,0,32,2.8 C32,7.2,32,7.2,32,16 C32,24.8,32,29.2,29.2,32 C24.8,32,24.8,32,16,32 C7.2,32,2.8,32,0,29.2 C0,24.8,0,24.8,0,16 Z" fill="#000000"/>
              <g transform="translate(4, 4) scale(1)">
                <circle cx="8" cy="8" r="6" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.09 10.37A6 6 0 1 1 10.34 18" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 6h1v4" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m16.71 13.88.7.71-2.82 2.82" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </svg>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#000", display: "flex", marginRight: "24px" }}>
              SplitSend
            </div>
            <div style={{ fontSize: "28px", color: "#888", fontWeight: 400, display: "flex" }}>
              {group.name}
            </div>
          </div>

        </div>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          flex: 1, 
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.8)",
          padding: "48px",
          borderRadius: "32px",
          border: "1px solid rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: "36px", color: "#666", fontWeight: 400, display: "flex", marginBottom: "8px" }}>
            Hey {member.name},
          </div>
          {myBalances.length === 0 ? (
            <div style={{ fontSize: "56px", fontWeight: "bold", color: "#111", display: "flex", marginTop: "8px" }}>You're all settled up! 🎉</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "64px", fontWeight: "bold", letterSpacing: "-0.02em", display: "flex", marginTop: "8px", marginBottom: "24px" }}>
                {netBalance > 0 ? (
                  <span style={{ color: "#2e7d32" }}>
                    You are owed {cents(netBalance)}
                  </span>
                ) : netBalance < 0 ? (
                  <span style={{ color: "#d32f2f" }}>
                    You owe {cents(Math.abs(netBalance))}
                  </span>
                ) : (
                  <span style={{ color: "#111" }}>You're settled up!</span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {myBalances.slice(0, 3).map((b, i) => (
                  <div
                    key={i}
                    style={{
                      background: "white",
                      padding: "12px 24px",
                      borderRadius: "14px",
                      fontSize: "22px",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    {b.from_member_id === member.id ? (
                      <span style={{ display: "flex" }}>Owe <strong style={{ marginLeft: "8px" }}>{b.to_name}</strong>: <span style={{ color: "#d32f2f", marginLeft: "8px", fontWeight: "bold" }}>{cents(b.amount)}</span></span>
                    ) : (
                      <span style={{ display: "flex" }}><strong style={{ marginRight: "8px" }}>{b.from_name}</strong> owes you: <span style={{ color: "#2e7d32", marginLeft: "8px", fontWeight: "bold" }}>{cents(b.amount)}</span></span>
                    )}
                  </div>
                ))}
                {myBalances.length > 3 && (
                  <div style={{ fontSize: "22px", color: "#999", display: "flex", alignItems: "center", paddingLeft: "12px" }}>
                    + {myBalances.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "22px", color: "#333", fontWeight: 700, display: "flex" }}>
            splitsend.app
          </div>

        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
      fonts: [
        {
          name: "Google Sans Flex",
          data: getFontData(),
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
};
