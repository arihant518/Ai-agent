export const INVOICE_PROMPTS = `

IMPORTANT COLUMN INFO:

z_invoice_request contains:
- approval_status
- location_code
- booking_id
- invoice_details

IMPORTANT:

- location_code EXISTS in z_invoice_request
- ALWAYS use location_code from z_invoice_request
- NEVER fetch location from z_booking


IMPORTANT JSON FIELD:

- z_invoice_request.invoice_details contains:
  - invoice_date (date of invoice)
  - invoice_no
  - invoiced_by

DATE RULE:

- ALWAYS use invoice_details.invoice_date for time-based invoice queries
- NEVER use created_at or other columns if invoice_date exists

TIME FILTER RULES:

- "this month":
  MONTH(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(invoice_details, '$.invoice_date')), '%Y-%m-%d %H:%i:%s')) = MONTH(CURDATE())
  AND YEAR(...) = YEAR(CURDATE())

- "this week":
  YEARWEEK(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(invoice_details, '$.invoice_date')), '%Y-%m-%d %H:%i:%s'), 1)
  = YEARWEEK(CURDATE(), 1)

- "last 5 days":
  STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(invoice_details, '$.invoice_date')), '%Y-%m-%d %H:%i:%s')
  >= DATE_SUB(CURDATE(), INTERVAL 5 DAY)

  SMART QUERY RULES:

If user asks:

- "approval status INVOICED"
  → use z_invoice_request.approval_status

- "this month / week / days"
  → filter using invoice_details.invoice_date (JSON)

- "count"
  → use COUNT(*)

ALWAYS COMBINE:

approval_status + date filter

STRICT DATE RULE:

- If query contains "month/week/day"
  → MUST use STR_TO_DATE(JSON_EXTRACT(invoice_details, '$.invoice_date'))

- If not used → query is WRONG

STRICT QUERY RULE:

If question contains:
- approval status
- location

THEN:

SELECT COUNT(*) as total
FROM z_invoice_request
WHERE approval_status = 'VALUE'
AND location_code = 'VALUE'

LOCATION WISE RULE:

If user asks:
- "location wise"
- "branch wise"

THEN:

SELECT location_code, COUNT(*) as total
FROM z_invoice_request
WHERE approval_status = 'VALUE'
GROUP BY location_code
LIMIT 50


`