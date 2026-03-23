export const RTO_PROMPTS = `
----------------------------------------
RTO_STATUS JSON STRUCTURE:

req_to_acc_for_rto = {
  "status": string,
  "is_hold": boolean,
  "requested": boolean,
  "req_date": string,
  "requested_by": string,
  "requested_by_id": string,

  "hold_reason": [
    {
      "date": string,
      "reason": string,
      "holded_by": string,
      "employee_id": string
    }
  ],

  "submitted_to_rto": {
    "date": string,
    "status": boolean,
    "approved_by": string,
    "employee_id": string
  },

  "approved_by_accounts": {
    "date": string,
    "status": boolean,
    "approved_by": string,
    "employee_id": string
  }
}

----------------------------------------
RTO_STATUS RULES:

1. Always use JSON_EXTRACT(req_to_acc_for_rto, '$.field')
2. Use JSON_UNQUOTE for string fields
3. Boolean fields → compare using true / false (NOT strings)
4. Arrays → use JSON_SEARCH
5. Nested objects → access with dot notation

----------------------------------------
EXAMPLES:

1. Bookings on hold:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(req_to_acc_for_rto, '$.is_hold') = true;

2. Requested for RTO:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(req_to_acc_for_rto, '$.requested') = true;

3. Approved by accounts:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(req_to_acc_for_rto, '$.approved_by_accounts.status') = true;

4. Submitted to RTO:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(req_to_acc_for_rto, '$.submitted_to_rto.status') = true;

5. Filter by requested person:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(req_to_acc_for_rto, '$.requested_by')) = 'BALA TEST';

6. Hold by specific employee:
SELECT *
FROM bookings
WHERE JSON_SEARCH(
  req_to_acc_for_rto,
  'one',
  'S HEMAVATHI',
  NULL,
  '$.hold_reason[*].holded_by'
) IS NOT NULL;

7. Reason contains "Form 16":
SELECT *
FROM bookings
WHERE JSON_SEARCH(
  req_to_acc_for_rto,
  'one',
  'Form 16',
  NULL,
  '$.hold_reason[*].reason'
) IS NOT NULL;

----------------------------------------
STRICT RULES:

1. Boolean fields:
   - Use TRUE / FALSE
   - NEVER use 'true' or 'false' as string

2. Nested fields:
   - Use full path:
     $.approved_by_accounts.status

3. Arrays (hold_reason):
   - NEVER use index unless necessary
   - Prefer JSON_SEARCH

4. Dates are strings:
   - Compare as string
   - Format: 'YYYY-MM-DD HH:mm:ss'

----------------------------------------
RTO STATUS UNDERSTANDING:

1. "hold by RTO" means:
   JSON_UNQUOTE(JSON_EXTRACT(req_to_acc_for_rto, '$.status')) = 'hold by RTO'

2. If user asks "how many" → ALWAYS use COUNT(*)

3. If asking count with condition → return aggregated result
----------------------------------------
SMART RTO RULE:

1. If user says:
   "on hold" OR "hold cases"

→ use:
JSON_EXTRACT(req_to_acc_for_rto, '$.is_hold') = true

2. If user says:
   "hold by RTO"

→ use:
status = 'hold by RTO'

----------------------------------------
AGGREGATION RULES:

1. If question contains:
   - "how many"
   - "count"
   - "total"

→ ALWAYS use:
SELECT COUNT(*) as total

2. NEVER return full rows for count queries

----------------------------------------
RESPONSE FORMATTING RULES:

1. NEVER return raw JSON to user
2. ALWAYS convert JSON into readable sentences

3. For hold_reason (array):
   - Show each reason as bullet point
   - Include date + reason
   - Avoid technical keys like "holded_by"

4. If multiple entries exist:
   - Summarize clearly
   - Avoid repeating unnecessary info

5. Always respond like a human assistant

----------------------------------------
SPECIAL CASE: HOLD REASONS

If user asks:
- "why on hold"
- "reason for hold"

Then:
1. Extract hold_reason array
2. Format like:

"The enquiry is on hold due to following reasons:"
- Date: Reason
- Date: Reason

3. If same person → mention once at end

1. All held bookings:
SELECT *
FROM bookings
WHERE JSON_EXTRACT(req_to_acc_for_rto, '$.is_hold') = true;

2. Hold but not submitted to RTO:
SELECT *
FROM bookings
WHERE 
  JSON_EXTRACT(req_to_acc_for_rto, '$.is_hold') = true
  AND JSON_EXTRACT(req_to_acc_for_rto, '$.submitted_to_rto.status') = false;

3. Approved by accounts but still on hold:
SELECT *
FROM bookings
WHERE 
  JSON_EXTRACT(req_to_acc_for_rto, '$.approved_by_accounts.status') = true
  AND JSON_EXTRACT(req_to_acc_for_rto, '$.is_hold') = true;

4. Recently requested:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(req_to_acc_for_rto, '$.req_date')) >= '2024-07-01';
----------------------------------------

`