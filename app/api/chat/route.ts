import { buildSystemPrompt } from "@/app/ai/prompts";
import db from "@/app/lib/db";
import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages, tool } from "ai";
import { RowDataPacket } from "mysql2";
import z from "zod";

export const maxDuration = 30;

/* -----------------------------
   Load Database Schema
------------------------------*/

async function getSchema() {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'test'
  `);

  const tables: Record<string, string[]> = {};

  rows.forEach((row: any) => {
    if (!tables[row.TABLE_NAME]) tables[row.TABLE_NAME] = [];
    tables[row.TABLE_NAME].push(`${row.COLUMN_NAME} (${row.DATA_TYPE})`);
  });

  return Object.entries(tables)
    .map(([table, cols]) => `Table: ${table}\n- ${cols.join("\n- ")}`)
    .join("\n\n");
}

/* -----------------------------
   JSON Parser
------------------------------*/

function parseJSONFields(row: any) {
  const jsonCols = [
    "raw_data",
    "exchange_info",
    "finance_info",
    "discounts",
    "original_vehicle_price",
    "account_debits",
    "account_credits",
    "payments",
    "dse_commitments",
  ];

  const newRow = { ...row };

  jsonCols.forEach((col) => {
    if (newRow[col]) {
      try {
        newRow[col] = JSON.parse(newRow[col]);
      } catch {}
    }
  });

  return newRow;
}

/* -----------------------------
   JSON Total Calculators
------------------------------*/

function calculateTotals(rows: any[]) {
  let totalDebits = 0;
  let totalCredits = 0;
  let totalPayments = 0;

  rows.forEach((row) => {
    if (row.account_debits?.debits) {
      row.account_debits.debits.forEach((d: any) => {
        totalDebits += Number(d.amount || 0);
      });
    }

    if (row.account_credits?.credits) {
      row.account_credits.credits.forEach((c: any) => {
        totalCredits += Number(c.amount || 0);
      });
    }

    if (Array.isArray(row.payments)) {
      row.payments.forEach((p: any) => {
        totalPayments += Number(p.amount || 0);
      });
    }
  });

  return {
    totalDebits,
    totalCredits,
    totalPayments,
  };
}

/* -----------------------------
   SQL Validation
------------------------------*/

function validateSQL(query: string) {
  const lower = query.toLowerCase();

  if (!lower.startsWith("select")) {
    throw new Error("Only SELECT queries allowed");
  }

  if (
    lower.includes("delete") ||
    lower.includes("update") ||
    lower.includes("insert") ||
    lower.includes("drop") ||
    lower.includes("alter")
  ) {
    throw new Error("Dangerous query blocked");
  }

  // if (/\bselect\s+\*/i.test(query)) {
  //   throw new Error("SELECT * not allowed");
  // }

  return true;
}

/* -----------------------------
   API Route
------------------------------*/

export async function POST(req: Request) {
  console.log("API HIT");

  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const schemaText = await getSchema();

    const SYSTEM_PROMPT = buildSystemPrompt(schemaText);

    const result = streamText({
      model: openai("gpt-4o-mini"),

      messages: await convertToModelMessages(messages),

      system: SYSTEM_PROMPT,

      tools: {
        db: tool({
          description: "Execute SQL SELECT query",

          inputSchema: z.object({
            query: z.string(),
          }),

          execute: async ({ query }) => {
            try {
              console.log("AI Query:", query);

              validateSQL(query);

              query = query.trim().replace(/;$/, "");

              // if (!query.toLowerCase().includes("limit")) {
              //   query += " LIMIT 50";
              // }

              const [rows] = await db.query<RowDataPacket[]>(query);

              const cleanedRows = rows.map((row: any) => parseJSONFields(row));

              const totals = calculateTotals(cleanedRows);

              return {
                rows: cleanedRows,
                totals,
                count: cleanedRows.length,
              };
            } catch (err) {
              console.error("SQL ERROR:", err);

              return {
                error:
                  err instanceof Error ? err.message : "SQL execution failed",
              };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("API ERROR:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
