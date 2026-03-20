"use client";

import React from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isJSON(str: string): boolean {
  try {
    const trimmed = str.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      JSON.parse(trimmed);
      return true;
    }
  } catch {}
  return false;
}
// sample commit

function looksLikeTable(data: any): boolean {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") return true;
  if (typeof data === "object" && data !== null) {
    const key = Object.keys(data).find((k) => Array.isArray((data as any)[k]));
    if (key) {
      const arr = (data as any)[key];
      return arr.length > 0 && typeof arr[0] === "object";
    }
  }
  return false;
}

function extractRows(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const key = Object.keys(data).find((k) => Array.isArray(data[k]));
  if (key) return data[key];
  return [data];
}

function isMarkdownish(text: string): boolean {
  return (
    /^#{1,4}\s/m.test(text) ||
    /^\s*[-*]\s/m.test(text) ||
    /^\s*\d+\.\s/m.test(text) ||
    /\*\*.+\*\*/.test(text) ||
    /`.+`/.test(text)
  );
}

// ─── Sub-renderers ───────────────────────────────────────────────────────────

function TableRenderer({ data }: { data: any }) {
  const rows = extractRows(data);
  if (!rows.length) return <EmptyState />;

  const flatRows = rows.map((r: any) => {
    const obj: any = {};
    Object.keys(r).forEach((k) => {
      if (typeof r[k] === "object" && r[k] !== null) {
        const sub = extractRows(r[k]);
        if (sub.length > 0) sub.forEach((item: any) => Object.assign(obj, item));
        else obj[k] = JSON.stringify(r[k]);
      } else {
        obj[k] = r[k];
      }
    });
    return obj;
  });

  const columns = Object.keys(flatRows[0]);

  return (
    <div style={{ overflowX: "auto", marginTop: 8, borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
        <thead>
          <tr style={{ background: "linear-gradient(90deg,#1e3a5f,#2563eb)", color: "#fff" }}>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  borderBottom: "2px solid #1d4ed8",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row: any, idx: number) => (
            <tr
              key={idx}
              style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f0f6ff", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dbeafe")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f0f6ff")}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  style={{ padding: "9px 14px", borderBottom: "1px solid #e2e8f0", color: "#334155", verticalAlign: "middle" }}
                >
                  {typeof row[col] === "object" && row[col] !== null
                    ? JSON.stringify(row[col])
                    : String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JSONRenderer({ data }: { data: any }) {
  const isArr = Array.isArray(data);
  const entries = isArr ? data : Object.entries(data);

  // Flat key-value object → pill cards
  if (!isArr && typeof data === "object") {
    return (
      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        {Object.entries(data).map(([k, v]) => (
          <div
            key={k}
            style={{
              background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {k}
            </span>
            <span style={{ fontSize: 13, color: "#1e3a5f", fontFamily: "'IBM Plex Mono', monospace", wordBreak: "break-all" }}>
              {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Nested / array → collapsible code block
  return (
    <pre
      style={{
        marginTop: 8,
        padding: "14px 16px",
        background: "#0f172a",
        color: "#7dd3fc",
        borderRadius: 10,
        fontSize: 12,
        fontFamily: "'IBM Plex Mono', monospace",
        overflowX: "auto",
        lineHeight: 1.7,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        // Heading
        const h4 = line.match(/^####\s+(.*)/);
        const h3 = line.match(/^###\s+(.*)/);
        const h2 = line.match(/^##\s+(.*)/);
        const h1 = line.match(/^#\s+(.*)/);
        if (h1)
          return (
            <div key={i} style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f", borderBottom: "2px solid #bfdbfe", paddingBottom: 4, marginTop: 8 }}>
              {h1[1]}
            </div>
          );
        if (h2)
          return (
            <div key={i} style={{ fontSize: 16, fontWeight: 700, color: "#1e40af", marginTop: 6 }}>
              {h2[1]}
            </div>
          );
        if (h3)
          return (
            <div key={i} style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
              {h3[1]}
            </div>
          );
        if (h4)
          return (
            <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginTop: 2 }}>
              {h4[1]}
            </div>
          );

        // Bullet
        const bullet = line.match(/^\s*[-*]\s+(.*)/);
        if (bullet)
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8 }}>
              <span style={{ color: "#2563eb", fontWeight: 700, flexShrink: 0 }}>•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );

        // Numbered list
        const numbered = line.match(/^\s*(\d+)\.\s+(.*)/);
        if (numbered)
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8 }}>
              <span
                style={{
                  color: "#fff",
                  background: "#2563eb",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {numbered[1]}
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );

        // Horizontal rule
        if (/^---+$/.test(line.trim()))
          return <hr key={i} style={{ border: "none", borderTop: "1px solid #bfdbfe", margin: "6px 0" }} />;

        // Blank line
        if (!line.trim()) return <div key={i} style={{ height: 4 }} />;

        // Regular paragraph
        return (
          <div key={i} style={{ fontSize: 14 }}>
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}

/** Renders **bold**, `code`, and plain text inline */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <strong key={i} style={{ color: "#1e3a5f" }}>
          {p.slice(2, -2)}
        </strong>
      );
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code
          key={i}
          style={{
            background: "#dbeafe",
            color: "#1d4ed8",
            borderRadius: 4,
            padding: "1px 5px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
          }}
        >
          {p.slice(1, -1)}
        </code>
      );
    return p;
  });
}

function SummaryRenderer({ text }: { text: string }) {
  // Split into sentences for a nice paragraph
  return (
    <div
      style={{
        fontSize: 14,
        lineHeight: 1.8,
        color: "#1e3a5f",
        borderLeft: "3px solid #2563eb",
        paddingLeft: 12,
        marginTop: 4,
      }}
    >
      {text}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", marginTop: 4 }}>
      No data found.
    </div>
  );
}

// ─── Smart Renderer ──────────────────────────────────────────────────────────

export function SmartMessageRenderer({ text }: { text: string }) {
  const trimmed = text.trim();

  // 1. JSON
  if (isJSON(trimmed)) {
    const parsed = JSON.parse(trimmed);
    if (looksLikeTable(parsed)) return <TableRenderer data={parsed} />;
    return <JSONRenderer data={parsed} />;
  }

  // 2. Markdown-ish
  if (isMarkdownish(trimmed)) return <MarkdownRenderer text={trimmed} />;

  // 3. Long prose → summary style
  if (trimmed.length > 300 && !trimmed.includes("\n")) return <SummaryRenderer text={trimmed} />;

  // 4. Plain text
  return (
    <span style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
      {renderInline(trimmed)}
    </span>
  );
}

// ─── Tool Output Renderer ────────────────────────────────────────────────────

export function ToolOutputRenderer({ output }: { output: any }) {
  if (!output) return <EmptyState />;

  const { rows } = output;

  if (rows && Array.isArray(rows) && rows.length > 0) {
    return <TableRenderer data={rows} />;
  }

  // Try to render whatever came back
  if (typeof output === "string") return <SmartMessageRenderer text={output} />;
  if (looksLikeTable(output)) return <TableRenderer data={output} />;
  return <JSONRenderer data={output} />;
}