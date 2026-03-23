export const PAYMENTS_PROMPT = `
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
STRICT RESULT FILTERING RULES:

1. Always return ONLY data relevant to the question.

2. If user asks about:
   - payments → return ONLY payment details
   - approved payments → return ONLY approved payment info
   - totals → return ONLY aggregated values
   - count → return ONLY count

3. NEVER return full enquiry rows unless explicitly asked:
   (e.g., "show full details", "show all data")

4. For payment-related queries:
   - Extract ONLY:
     • total approved payment amount
     • number of approved payments (if needed)
   - DO NOT include:
     • raw JSON
     • enquiry details
     • unrelated fields

5. Response format for approved payments:

   Example:
   "Total approved payment amount is ₹X from Y transactions."

6. If location is mentioned:
   - Filter by location
   - Return only aggregated result

7. Always summarize instead of dumping data.

----------------------------------------
SMART PAYMENT UNDERSTANDING:

1. "approved payment" means:
   JSON_SEARCH(payments, 'one', 'approved', NULL, '$.payments[*].status') IS NOT NULL

2. If user asks:
   - "how much" → return SUM(amount)
   - "how many" → return COUNT
   - "what is" → return summarized answer

----------------------------------------
FINAL RESPONSE RULE:

- Keep answer short
- No JSON
- No technical terms
- Human readable only

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

`