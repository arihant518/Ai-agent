export const FINANCE_PROMPT = `
FINANCE_INFO STRUCTURE:

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
4. Missing or empty values should be handled safely`;