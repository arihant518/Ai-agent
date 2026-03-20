"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef } from "react";
import { SmartMessageRenderer, ToolOutputRenderer } from "./common/MessageRenderer";

export default function Chat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: "680px",
        margin: "0 auto",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        backgroundColor: "#f0f6ff",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          color: "white",
          fontSize: "17px",
          fontWeight: "700",
          letterSpacing: "-0.3px",
          boxShadow: "0 2px 12px rgba(37,99,235,0.35)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ✦
        </span>
        AI Assistant
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              marginTop: "60px",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>💬</span>
            Start a conversation…
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {/* Avatar (assistant only) */}
              {!isUser && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#1e3a5f,#2563eb)",
                    color: "#fff",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(37,99,235,0.3)",
                  }}
                >
                  ✦
                </div>
              )}

              <div
                style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: isUser
                    ? "20px 20px 4px 20px"
                    : "20px 20px 20px 4px",
                  backgroundColor: isUser ? "#2563eb" : "#ffffff",
                  color: isUser ? "white" : "#1e3a5f",
                  fontSize: "14px",
                  lineHeight: "1.65",
                  boxShadow: isUser
                    ? "0 2px 8px rgba(37,99,235,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.07)",
                }}
              >
                {message.parts.map((part, i) => {
                  // ── Text part ──
                  if (part.type === "text") {
                    if (isUser) {
                      // User messages: plain, white text
                      return (
                        <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                          {part.text}
                        </span>
                      );
                    }
                    // Assistant text: smart renderer
                    return <SmartMessageRenderer key={i} text={part.text} />;
                  }

                  // ── Tool output part ──
                  if (
                    part.type.startsWith("tool-") &&
                    "output" in part &&
                    part.state === "output-available"
                  ) {
                    return (
                      <ToolOutputRenderer key={i} output={(part as any).output} />
                    );
                  }

                  // ── Tool loading state ──
                  if (
                    part.type.startsWith("tool-") &&
                    "state" in part &&
                    (part as any).state !== "output-available"
                  ) {
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#64748b",
                          fontSize: 13,
                          fontStyle: "italic",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#2563eb",
                            animation: "pulse 1s infinite",
                          }}
                        />
                        Fetching data…
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        style={{
          padding: "14px 18px",
          backgroundColor: "white",
          borderTop: "1px solid #dbeafe",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          value={input}
          placeholder="Ask anything…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          style={{
            flex: 1,
            padding: "11px 16px",
            borderRadius: "28px",
            border: "1.5px solid #bfdbfe",
            outline: "none",
            fontSize: "14px",
            color: "#1e3a5f",
            backgroundColor: "#f0f6ff",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#bfdbfe")}
        />
        <button
          onClick={() => {
            if (!input.trim()) return;
            sendMessage({ text: input });
            setInput("");
          }}
          style={{
            padding: "11px 20px",
            background: "linear-gradient(135deg,#1e40af,#2563eb)",
            color: "white",
            border: "none",
            borderRadius: "28px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.35)";
          }}
        >
          Send ↑
        </button>
      </div>
    </div>
  );
}