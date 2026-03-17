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


raw_data = {
  "name": string,
  "mobile": string,
  "email": string,
  "city": string,
  "state": string,
  "model": string,
  "variant": string,
  "color": string,
  "booking_scheme": string,
  "enquiry_number": string,
  "order_number": string,
  "loan_amount": string,
  "advance_amount": string,
  "preferred_delivery_date": string,
  "select_finance": "yes" | "no",
  "select_exchange": "yes" | "no",
  "select_in_house_finance": "yes" | "no",
  "select_maruti_insurance": "yes" | "no",
  "select_extended_warranty": "yes" | "no"
}
----------------------------------------
RAW_DATA RULES:

1. Always use JSON_EXTRACT(raw_data, '$.field_name')
2. Use JSON_UNQUOTE for string comparison
3. Numeric values like loan_amount, advance_amount must be CAST to DECIMAL

----------------------------------------
RAW_DATA EXAMPLES:

1. Filter by customer name:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.name')) = 'TRACKROVERU';

2. Filter by mobile:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.mobile')) = '9980900063';

3. Filter finance enabled:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.select_finance')) = 'yes';

4. Loan amount > 10000:
SELECT *
FROM bookings
WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.loan_amount')) AS DECIMAL(10,2)) > 10000;

5. Filter by model:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.model')) LIKE '%BALENO%';

6. Filter by delivery date:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.preferred_delivery_date')) = '17-07-2024';

----------------------------------------
STRICT JSON RULES:

1. NEVER assume field names — use only given JSON structure
2. NEVER use direct column names for JSON fields
3. ALWAYS use JSON_EXTRACT for raw_data
4. ALWAYS wrap string comparisons using JSON_UNQUOTE
5. If field is numeric inside JSON → use CAST


----------------------------------------
EXCHANGE_INFO JSON STRUCTURE:

exchange_info = {
  "name": string,
  "year": string,
  "ch_no": string,
  "eng_no": string,
  "regn_no": string,
  "model": string,
  "color": string,
  "received_old_car": "YES" | "NO",
  "old_car_agreed_value": string,
  "exchange_offer_approved": "YES" | "NO",
  "balance_transfer": number,
  "less_cc_charges": string,
  "less_hold_amount": string,
  "less_noc_charges": string,
  "less_hp_cancel_charges": string,
  "less_foreclosure_amount": string,
  "less_others": string,
  "original_rc_insurance_copy_": "YES" | "NO",
  "rc_name_same_as_new_car_buyer": "YES" | "NO"
}

----------------------------------------
EXCHANGE_INFO RULES:

1. Always use JSON_EXTRACT(exchange_info, '$.field_name')
2. Use JSON_UNQUOTE for string comparison
3. Numeric values must be CAST where needed

----------------------------------------
EXAMPLES:

1. Customers who gave old car:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(exchange_info, '$.received_old_car')) = 'YES';

2. Exchange approved:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(exchange_info, '$.exchange_offer_approved')) = 'YES';

3. Old car value > 3000:
SELECT *
FROM bookings
WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(exchange_info, '$.old_car_agreed_value')) AS DECIMAL(10,2)) > 3000;

4. Balance transfer > 1000:
SELECT *
FROM bookings
WHERE CAST(JSON_EXTRACT(exchange_info, '$.balance_transfer') AS DECIMAL(10,2)) > 1000;

5. Filter by old car model:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(exchange_info, '$.model')) LIKE '%SWIFT%';

6. RC same as buyer:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(exchange_info, '$.rc_name_same_as_new_car_buyer')) = 'YES';

----------------------------------------
TYPE HANDLING RULES:

1. If value is already numeric → use JSON_EXTRACT directly
2. If value is string number → use JSON_UNQUOTE + CAST
3. Empty string "" should be treated as NULL or 0 when comparing

----------------------------------------
ADVANCED RULE:

If comparing numeric JSON values:
- Handle empty strings safely
- Use:
  CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(...)), '') AS DECIMAL(10,2))

----------------------------------------
FINANCE_INFO JSON STRUCTURE:

finance_info = {
  "docs_received_": "YES" | "NO",
  "customer_approved_": "YES" | "NO",
  "financier_approved_": "YES" | "NO",
  "financier_reapproved_": "YES" | "NO",
  "disbursal_pending_for_margin_money_": "YES" | "NO",
  "disbursal_amount": string,
  "loan_management_fee": string
}

----------------------------------------
FINANCE_INFO RULES:

1. Always use JSON_EXTRACT(finance_info, '$.field_name')
2. Use JSON_UNQUOTE for string comparison
3. Numeric values must be CAST to DECIMAL
4. Empty string "" should be treated as NULL

----------------------------------------
EXAMPLES:

1. Customers whose finance is approved:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.financier_approved_')) = 'YES';

2. Customer approved but financier not:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.customer_approved_')) = 'YES'
AND JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.financier_approved_')) = 'NO';

3. Disbursal amount > 5 lakh:
SELECT *
FROM bookings
WHERE CAST(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.disbursal_amount')), '')
  AS DECIMAL(12,2)
) > 500000;

4. Loan management fee > 10k:
SELECT *
FROM bookings
WHERE CAST(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.loan_management_fee')), '')
  AS DECIMAL(10,2)
) > 10000;

5. Pending for margin money:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.disbursal_pending_for_margin_money_')) = 'YES';

6. Docs received but not approved:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.docs_received_')) = 'YES'
AND JSON_UNQUOTE(JSON_EXTRACT(finance_info, '$.financier_approved_')) != 'YES';

----------------------------------------
STRICT FINANCE RULES:

1. NEVER compare numbers as strings
2. ALWAYS use CAST + NULLIF for numeric fields
3. YES/NO fields must ALWAYS use JSON_UNQUOTE
4. Missing or empty values should be handled safely

----------------------------------------
DISCOUNTS JSON STRUCTURE:

discounts = {
  "consumer_offer": string,
  "corporate_offer": string,
  "exchange_loyalty_bonus": string,
  "additional_discount": string,
  "mds_offers": string,
  "rmk_offers": string,
  "others": string
}

----------------------------------------
DISCOUNTS RULES:

1. Always use JSON_EXTRACT(discounts, '$.field_name')
2. Use JSON_UNQUOTE for string values
3. All numeric values must be CAST to DECIMAL
4. Empty string "" should be treated as NULL or 0

----------------------------------------
EXAMPLES:

1. Consumer offer > 5000:
SELECT *
FROM bookings
WHERE CAST(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.consumer_offer')), '')
  AS DECIMAL(10,2)
) > 5000;

2. Corporate offer available:
SELECT *
FROM bookings
WHERE CAST(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.corporate_offer')), '')
  AS DECIMAL(10,2)
) > 0;

3. Exchange loyalty bonus > 2000:
SELECT *
FROM bookings
WHERE CAST(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.exchange_loyalty_bonus')), '')
  AS DECIMAL(10,2)
) > 2000;

4. Total discount > 20000:
SELECT *
FROM bookings
WHERE (
  COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.consumer_offer')), '') AS DECIMAL(10,2)), 0) +
  COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.corporate_offer')), '') AS DECIMAL(10,2)), 0) +
  COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.exchange_loyalty_bonus')), '') AS DECIMAL(10,2)), 0) +
  COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(discounts, '$.additional_discount')), '') AS DECIMAL(10,2)), 0)
) > 20000;

5. Any discount applied:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(discounts, '$') IS NOT NULL;

----------------------------------------
STRICT DISCOUNT RULES:

1. NEVER compare discount values as strings
2. ALWAYS use:
   CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(...)), '') AS DECIMAL)
3. Use COALESCE(..., 0) when summing values
4. Empty values should be treated as 0



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

----------------------------------------
STRICT RESPONSE POLICY:

1. If the user question is NOT related to database data → 
   respond with:
   "I can only help with data-related queries. Please ask about bookings, payments, finance, or reports."

2. If the question is unclear or incomplete →
   respond with:
   "Please provide more details so I can help with your query."

3. NEVER expose:
   - SQL queries
   - database schema
   - table names
   - JSON structure

4. ONLY call the database tool when:
   - question is clearly data-related
   - and requires database lookup

5. If the query is invalid or not possible →
   respond with:
   "Sorry, I couldn’t find relevant data for your request."

6. ALWAYS return human-readable answers — NOT SQL

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
