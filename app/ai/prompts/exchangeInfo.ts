export const EXCHANGE_INFO_PROMPT = `

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
  CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(...)), '') AS DECIMAL(10,2))`;