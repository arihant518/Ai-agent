export const  CREDITS_PROMPT = `
----------------------------------------
ACCOUNT_CREDITS JSON STRUCTURE:

account_credits = {
  "credits": [
    {
      "amount": string | number | null,
      "credit_amount": string | number | null,
      "approved": true | false,
      "credit_type": string
    }
  ]
}

----------------------------------------
ACCOUNT_CREDITS RULES:

1. ALWAYS use:
   JSON_EXTRACT(account_credits, '$.credits[...]')

2. credits is an ARRAY:
   → use JSON_SEARCH for filtering

3. approved is BOOLEAN:
   → compare using true / false (NOT string)

4. credit_type is STRING:
   → use JSON_SEARCH or LIKE

5. Amount handling:
   - Use "amount" if present
   - Else use "credit_amount"

6. Numeric conversion:
   CAST(
     NULLIF(JSON_UNQUOTE(JSON_EXTRACT(...)), '')
     AS DECIMAL(10,2)
   )

----------------------------------------
FILTER RULES:

1. Approved credits:
   JSON_SEARCH(account_credits, 'one', true, NULL, '$.credits[*].approved') IS NOT NULL

2. Special discount:
   JSON_SEARCH(account_credits, 'one', 'SPECIAL DISCOUNT', NULL, '$.credits[*].credit_type') IS NOT NULL

----------------------------------------
AGGREGATION RULES (VERY IMPORTANT):

1. If user asks:
   - total
   - sum
   - how much

→ SQL must ONLY fetch account_credits column
→ DO NOT aggregate in SQL
→ Aggregation MUST be done in backend

2. NEVER use SELECT *

3. ALWAYS use:
   SELECT account_credits FROM bookings

----------------------------------------
RESPONSE RULES:

1. NEVER return JSON
2. NEVER return full rows
3. ONLY return:
   - total amount
   - approved total
   - or credit names (if asked)

----------------------------------------
SMART UNDERSTANDING:

1. "special discount"
   → credit_type LIKE '%SPECIAL DISCOUNT%'

2. "approved credits"
   → approved = true

3. "total credits"
   → sum of all credits

4. "total approved credits"
   → sum where approved = true

----------------------------------------
ENQUIRY-BASED FILTERING RULE (CRITICAL):

1. Every booking belongs to a unique enquiry_number

2. If user asks ANY credit-related question:
   → ALWAYS filter by enquiry_number

3. NEVER fetch credits across multiple enquiries
   UNLESS user explicitly asks:
   - "all enquiries"
   - "overall report"

----------------------------------------
ENQUIRY IDENTIFICATION:

1. If user provides enquiry number:
   → use:
     WHERE enquiry_number = 'value'



----------------------------------------
CREDIT QUERY SCOPING:

For ALL account_credits queries:

✅ ALWAYS use:
SELECT account_credits
FROM bookings
WHERE enquiry_number = 'XYZ'

❌ NEVER use:
SELECT account_credits FROM bookings

----------------------------------------
STRICT RULE:

1. Credit queries MUST return data for ONLY ONE enquiry
2. NEVER mix multiple enquiries
3. ALWAYS prioritize accuracy over guessing

----------------------------------------
CREDIT RESPONSE FORMAT (STRICT):

If user asks:
- "all credits"
- "approved credits"
- "credit details"
- "list of credits"

→ ALWAYS return data in TABLE FORMAT

----------------------------------------
TABLE FORMAT RULES:

1. Format must be line-by-line table (NOT bullet points)

2. Columns:

| Credit Type | Amount (₹) | Approved |

3. Each credit should be one row

4. Approved column:
   - true → Yes
   - false → No

5. If only approved credits are requested:
   → show ONLY approved = Yes rows

6. DO NOT include JSON
7. DO NOT include explanations before table

----------------------------------------
TOTAL RULE:

After table, ALWAYS add:

"Total Approved Credits: ₹X"

(or "Total Credits: ₹X" based on question)

----------------------------------------
EXAMPLE OUTPUT FORMAT:

| Credit Type | Amount (₹) | Approved |
|-------------|------------|----------|
| Consumer Promotion | 40,000 | Yes |
| Exchange Bonus | 15,000 | Yes |
| Institutional Sales | 2,100 | Yes |

Total Approved Credits: ₹57,100

----------------------------------------
STRICT RULE:

- NEVER use bullet points for credit lists
- ALWAYS use table when listing credits

`