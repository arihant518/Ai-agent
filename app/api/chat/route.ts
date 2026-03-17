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

    const SYSTEM_PROMPT = `
You are an expert SQL assistant for a MariaDB database.

DATABASE SCHEMA:
${schemaText}

JSON COLUMNS:
raw_data
exchange_info
finance_info
discounts
original_vehicle_price
account_debits
account_credits
payments
dse_commitments

----------------------------------------
PAYMENTS JSON STRUCTURE:

payments = {
  "payments": [
    {
      "date": "YYYY-MM-DD HH:mm:ss",
      "mode": "UPI | CASH | CARD | BANK",
      "amount": "number as string",
      "status": "approved | pending | rejected",
      "verified": true | false,
      "payment_type": "string",
      "payment_proof": "url",
      "verified_by_id": "string",
      "verified_by_name": "string",
      "peyment_reference": "string"
    }
  ]
}

----------------------------------------

IMPORTANT RULES:

1. Only use SELECT queries
2. Never use JSON_TABLE
3. Use JSON_EXTRACT for JSON fields
4. Use JSON_UNQUOTE when extracting string values
5. JSON arrays should be accessed using indexes like [0], [1], etc.
6. If filtering inside JSON arrays, use JSON_SEARCH or conditions on specific indexes
7. If totals are required for JSON arrays, return full JSON column

----------------------------------------

EXAMPLES:

1. Get first payment status:
JSON_UNQUOTE(JSON_EXTRACT(payments, '$.payments[0].status'))

2. Get first payment amount:
CAST(JSON_UNQUOTE(JSON_EXTRACT(payments, '$.payments[0].amount')) AS DECIMAL(10,2))

3. Filter approved payments (basic approach using first element):
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(payments, '$.payments[0].status')) = 'approved';

4. Filter ANY approved payment using JSON_SEARCH:
SELECT *
FROM bookings
WHERE JSON_SEARCH(payments, 'one', 'approved', NULL, '$.payments[*].status') IS NOT NULL;

5. Filter UPI payments:
SELECT *
FROM bookings
WHERE JSON_SEARCH(payments, 'one', 'UPI', NULL, '$.payments[*].mode') IS NOT NULL;

6. Payments greater than 3000 (first element only):
SELECT *
FROM bookings
WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(payments, '$.payments[0].amount')) AS DECIMAL(10,2)) > 3000;

Always return human readable answers.
`.trim();

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

              if (!query.toLowerCase().includes("limit")) {
                query += " LIMIT 50";
              }

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
