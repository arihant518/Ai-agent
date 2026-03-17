"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  function extractRows(data: any) {
    if (!data) return [];

    // if already array
    if (Array.isArray(data)) return data;

    // if object with array inside (payments, discounts etc)
    const key = Object.keys(data).find((k) => Array.isArray(data[k]));
    if (key) return data[key];

    return [data];
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily: "sans-serif",
        backgroundColor: "#f0f6ff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "#2563eb",
          color: "white",
          fontSize: "18px",
          fontWeight: "600",
          letterSpacing: "-0.3px",
          boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
        }}
      >
        AI Assistant
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              marginTop: "40px",
              fontSize: "14px",
            }}
          >
            Start a conversation...
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius:
                  message.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                backgroundColor: message.role === "user" ? "#2563eb" : "white",
                color: message.role === "user" ? "white" : "#1e3a5f",
                fontSize: "14px",
                lineHeight: "1.6",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.text}</span>;
                }

                if (
                  part.type.startsWith("tool-") &&
                  "output" in part &&
                  part.state === "output-available"
                ) {
                  const rows = (part.output as any).rows;

                  if (!rows || rows.length === 0) {
                    return <p key={i}>No data found</p>;
                  }

                  const parsedRows = rows.flatMap((r: any) => {
                    const newObj: any = {};

                    Object.keys(r).forEach((key) => {
                      if (typeof r[key] === "object") {
                        const extracted = extractRows(r[key]);

                        if (extracted.length > 0) {
                          extracted.forEach((item: any) => {
                            Object.assign(newObj, item);
                          });
                        }
                      } else {
                        newObj[key] = r[key];
                      }
                    });

                    return newObj;
                  });

                  const columns = Object.keys(parsedRows[0]);

                  return (
                    <table
                      key={i}
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: "'IBM Plex Mono', monospace",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#1e293b",
                            color: "#f8fafc",
                          }}
                        >
                          {columns.map((col) => (
                            <th
                              key={col}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                fontSize: 11,
                                borderBottom: "2px solid #334155",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {parsedRows.map((row: any, idx: number) => (
                          <tr
                            key={idx}
                            style={{
                              backgroundColor:
                                idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#e0f2fe")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                idx % 2 === 0 ? "#ffffff" : "#f8fafc")
                            }
                          >
                            {columns.map((col) => (
                              <td
                                key={col}
                                style={{
                                  padding: "9px 14px",
                                  borderBottom: "1px solid #e2e8f0",
                                  color: "#334155",
                                  verticalAlign: "middle",
                                }}
                              >
                                {typeof row[col] === "object" &&
                                row[col] !== null
                                  ? JSON.stringify(row[col], null, 2)
                                  : row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "white",
          borderTop: "1px solid #dbeafe",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          value={input}
          placeholder="Type a message..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "24px",
            border: "1.5px solid #bfdbfe",
            outline: "none",
            fontSize: "14px",
            color: "#1e3a5f",
            backgroundColor: "#f0f6ff",
          }}
        />
        <button
          onClick={() => {
            if (!input.trim()) return;
            sendMessage({ text: input });
            setInput("");
          }}
          style={{
            padding: "10px 18px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "24px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
