export const DISCOUNT_PROMPT =`
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


`