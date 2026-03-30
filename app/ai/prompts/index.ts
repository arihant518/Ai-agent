
import { BASE_PROMPT } from "./basePromptNew";
import { CREDITS_PROMPT } from "./creditPrompt";
import { DEBITS_PROMPT } from "./debitsPrompt";
import { DISCOUNT_PROMPT } from "./discountPrompt";
import { DSE_COMMITMENT_PROMPTS } from "./dseCommitmentPrompt";
import { EXCHANGE_INFO_PROMPT } from "./exchangeInfo";
import { FINANCE_PROMPT } from "./financePrompt";
import { INVOICE_PROMPTS } from "./invoicePrompts";
import { PAYMENTS_PROMPT } from "./paymentPrompt";
import { RAW_DATA_PROMPT } from "./rawDataPrompt";
import { RTO_PROMPTS } from "./rtoPrompt";


export function buildSystemPrompt(schema: string) {
  return `
${BASE_PROMPT}

DATABASE SCHEMA:
${schema}

${RAW_DATA_PROMPT}

${FINANCE_PROMPT}

${EXCHANGE_INFO_PROMPT}

${PAYMENTS_PROMPT}

${CREDITS_PROMPT}

${DEBITS_PROMPT}

${DISCOUNT_PROMPT}

${RTO_PROMPTS}

${INVOICE_PROMPTS}

${DSE_COMMITMENT_PROMPTS}
`.trim();
}