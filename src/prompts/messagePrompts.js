'use strict';

const { SEGMENTS } = require('../services/segmentationService');

const SEGMENT_TONE = {
  [SEGMENTS.WILLING_BUT_DELAYED]: 'friendly, brief, helpful',
  [SEGMENTS.HABITUAL_LATE_PAYER]: 'direct but respectful; mention payment plan availability',
  [SEGMENTS.HARDSHIP_CASE]: 'empathetic, supportive; offer hardship assistance',
  [SEGMENTS.UNRESPONSIVE]: 'polite re-engagement; ask them to reach out',
  [SEGMENTS.HIGH_RISK_ESCALATION]: 'formal, respectful; request a callback',
};

const HARD_RULES = [
  'Never use threatening or shaming language.',
  'Never mention legal action, credit-bureau reporting, or asset seizure.',
  'Never invent amounts or dates — only use facts provided.',
  'Keep total length under 320 characters for SMS.',
];

function formatCurrency(paise) {
  return `INR ${(paise / 100).toFixed(2)}`;
}

function buildMessagePrompt({ borrower, recommendation }) {
  const tone = SEGMENT_TONE[recommendation.segment] || 'respectful and professional';
  const channel = recommendation.channel;

  const facts = {
    borrower_reference: borrower.borrowerId,
    days_past_due: borrower.daysPastDue,
    overdue_amount: formatCurrency(borrower.overdueAmount),
    channel,
    intent: recommendation.nextBestAction,
  };

  return `You are a collections communication assistant for a lender in India.
Generate a customer-facing message draft that will be reviewed by an agent.

TONE: ${tone}

RULES:
${HARD_RULES.map(r => `- ${r}`).join('\n')}

FACTS:
${JSON.stringify(facts, null, 2)}

Return only the message text, no preamble.`;
}

function validateGeneratedMessage(message) {
  const violations = [];
  const lower = (message || '').toLowerCase();

  const forbidden = ['lawsuit', 'legal action', 'court', 'arrest', 'credit bureau', 'cibil', 'seize', 'repossess'];
  for (const term of forbidden) {
    if (lower.includes(term)) violations.push(`forbidden:${term}`);
  }

  if (!message || message.trim().length === 0) violations.push('empty_message');
  if (message && message.length > 600) violations.push('too_long');

  return { safe: violations.length === 0, violations };
}

function buildExplanationPrompt({ borrower, recommendation, question }) {
  const facts = {
    borrower_reference: borrower.borrowerId,
    days_past_due: borrower.daysPastDue,
    overdue_amount: formatCurrency(borrower.overdueAmount),
    prior_behavior: borrower.priorPaymentBehavior,
    hardship_indicators: borrower.hardshipIndicators,
  };

  return `You are explaining a collections strategy decision to an agent.

AGENT QUESTION: ${question}

BORROWER FACTS:
${JSON.stringify(facts, null, 2)}

DECISION:
- Segment: ${recommendation.segment}
- Action: ${recommendation.nextBestAction}
- Reasons: ${recommendation.segmentReasons.join(', ')}

Provide a 2-3 sentence plain-English explanation. Do not add facts not in the input.`;
}

module.exports = {
  buildMessagePrompt,
  buildExplanationPrompt,
  validateGeneratedMessage,
  HARD_RULES,
};
