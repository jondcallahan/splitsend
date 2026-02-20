import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "@vercel/og";
import React from "react";

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
  const group = await GroupDAO.findBySlug(params.slug);
  if (!group) {return new Response("Not Found", { status: 404 });}

  const member = await MemberDAO.findByGroupIdAndToken(
    group.id,
    params.memberToken
  );
  if (!member) {return new Response("Not Found", { status: 404 });}

  const balances = await ExpenseDAO.getBalances(group.id);
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
    <div
      style={{
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Google Sans Flex"',
        height: "100%",
        padding: "80px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "40px",
        }}
      >
        <div style={{ alignItems: "center", display: "flex" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            width="48"
            height="48"
            style={{ marginRight: "16px" }}
          >
            <path
              d="M0,16 C0,7.2,0,2.8,2.8,0 C7.2,0,7.2,0,16,0 C24.8,0,29.2,0,32,2.8 C32,7.2,32,7.2,32,16 C32,24.8,32,29.2,29.2,32 C24.8,32,24.8,32,16,32 C7.2,32,2.8,32,0,29.2 C0,24.8,0,24.8,0,16 Z"
              fill="#000000"
            />
            <g transform="translate(4, 4) scale(1)">
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M18.09 10.37A6 6 0 1 1 10.34 18"
                fill="none"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7 6h1v4"
                fill="none"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="m16.71 13.88.7.71-2.82 2.82"
                fill="none"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
          </svg>
          <div
            style={{
              color: "#000",
              display: "flex",
              fontSize: "28px",
              fontWeight: "bold",
              marginRight: "24px",
            }}
          >
            SplitSend
          </div>
          <div
            style={{
              color: "#888",
              display: "flex",
              fontSize: "28px",
              fontWeight: 400,
            }}
          >
            {group.name}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(0,0,0,0.05)",
          borderRadius: "32px",
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px",
        }}
      >
        <div
          style={{
            color: "#666",
            display: "flex",
            fontSize: "36px",
            fontWeight: 400,
            marginBottom: "8px",
          }}
        >
          Hey {member.name},
        </div>
        {myBalances.length === 0 ? (
          <div
            style={{
              color: "#111",
              display: "flex",
              fontSize: "56px",
              fontWeight: "bold",
              marginTop: "8px",
            }}
          >
            You're all settled up! 🎉
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "64px",
                fontWeight: "bold",
                letterSpacing: "-0.02em",
                marginBottom: "24px",
                marginTop: "8px",
              }}
            >
              {netBalance > 0 ? (
                <span style={{ color: "#2e7d32" }}>
                  You are owed {cents(netBalance)}
                </span>
              ) : (netBalance < 0 ? (
                <span style={{ color: "#d32f2f" }}>
                  You owe {cents(Math.abs(netBalance))}
                </span>
              ) : (
                <span style={{ color: "#111" }}>You're settled up!</span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {myBalances.slice(0, 3).map((b, i) => (
                <div
                  key={i}
                  style={{
                    alignItems: "center",
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.05)",
                    borderRadius: "14px",
                    display: "flex",
                    fontSize: "22px",
                    padding: "12px 24px",
                  }}
                >
                  {b.from_member_id === member.id ? (
                    <span style={{ display: "flex" }}>
                      Owe{" "}
                      <strong style={{ marginLeft: "8px" }}>{b.to_name}</strong>
                      :{" "}
                      <span
                        style={{
                          color: "#d32f2f",
                          fontWeight: "bold",
                          marginLeft: "8px",
                        }}
                      >
                        {cents(b.amount)}
                      </span>
                    </span>
                  ) : (
                    <span style={{ display: "flex" }}>
                      <strong style={{ marginRight: "8px" }}>
                        {b.from_name}
                      </strong>{" "}
                      owes you:{" "}
                      <span
                        style={{
                          color: "#2e7d32",
                          fontWeight: "bold",
                          marginLeft: "8px",
                        }}
                      >
                        {cents(b.amount)}
                      </span>
                    </span>
                  )}
                </div>
              ))}
              {myBalances.length > 3 && (
                <div
                  style={{
                    alignItems: "center",
                    color: "#999",
                    display: "flex",
                    fontSize: "22px",
                    paddingLeft: "12px",
                  }}
                >
                  + {myBalances.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "60px",
        }}
      >
        <div
          style={{
            color: "#333",
            display: "flex",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          splitsend.app
        </div>
      </div>
    </div>,
    {
      fonts: [
        {
          name: "Google Sans Flex",
          data: getFontData(),
          weight: 700,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
      height: 630,
      width: 1200,
    }
  );
};
