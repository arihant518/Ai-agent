export const DSE_COMMITMENT_PROMPTS = `
----------------------------------------
DSE_COMMITMENTS JSON STRUCTURE:

dse_commitments = {
  "ccp": "yes" | "no",
  "mcp": "yes" | "no",
  "exchange": "yes" | "no",
  "other_vas": "yes" | "no",
  "in_house_finance": "yes" | "no",
  "extended_warranty": "yes" | "no",
  "preferred_insurance": "yes" | "no",
  "used_car_price_match": "yes" | "no",
  "competition_with_co_dealer": "yes" | "no",
  "technical_issue": "yes" | "no",
  "delayed_delivery": "yes" | "no",
  "msil_offer_change": "yes" | "no",
  "msil_price_change": "yes" | "no",
  "vintage_vin": "yes" | "no",

  "accessories_purchase_commitment": string,
  "other_remarks": string,

  "added_by_id": string,
  "added_by_name": string,
  "added_date": string,
  "updated_by_id": string,
  "updated_by_name": string,
  "updated_date": string
}

----------------------------------------
DSE_COMMITMENTS RULES:

1. Always use JSON_EXTRACT(dse_commitments, '$.field_name')
2. Use JSON_UNQUOTE for string comparison
3. YES/NO fields must always be compared as strings
4. Dates are stored as strings → compare using string format

----------------------------------------
EXAMPLES:

1. Deals with delayed delivery:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.delayed_delivery')) = 'yes';

2. Deals with technical issues:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.technical_issue')) = 'yes';

3. In-house finance commitments:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.in_house_finance')) = 'yes';

4. Extended warranty committed:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.extended_warranty')) = 'yes';

5. Competition with co-dealer:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.competition_with_co_dealer')) = 'yes';

6. Filter by DSE name:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.added_by_name')) = 'VINAY';

7. Filter by commitment date:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.added_date')) >= '2025-03-01';

----------------------------------------
STRICT RULES:

1. All flags are lowercase "yes"/"no" → must match exactly
2. NEVER compare without JSON_UNQUOTE
3. Dates are strings → no DATE functions unless converted
4. Text fields (remarks) → use LIKE for search

1. Risky deals (multiple issues):
SELECT *
FROM bookings
WHERE 
  JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.technical_issue')) = 'yes'
  OR JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.delayed_delivery')) = 'yes'
  OR JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.competition_with_co_dealer')) = 'yes';

2. High commitment deals:
SELECT *
FROM bookings
WHERE 
  JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.extended_warranty')) = 'yes'
  AND JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.preferred_insurance')) = 'yes'
  AND JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.other_vas')) = 'yes';

3. Remarks search:
SELECT *
FROM bookings
WHERE JSON_UNQUOTE(JSON_EXTRACT(dse_commitments, '$.other_remarks')) LIKE '%check%';

`