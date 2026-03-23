export const RAW_DATA_PROMPT = `
RAW_DATA STRUCTURE:

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
5. If field is numeric inside JSON → use CAST`;
