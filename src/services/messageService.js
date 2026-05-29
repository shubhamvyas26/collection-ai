'use strict';

const {
  buildMessagePrompt,
  buildExplanationPrompt,
  validateGeneratedMessage,
} = require('../prompts/messagePrompts');

const FALLBACK_TEMPLATES = {
  WILLING_BUT_DELAYED: (overdue) =>
    `Hi, this is a friendly reminder about your overdue balance of ${overdue}. Please make a payment at your earliest convenience. Reply HELP for assistance.`,
  HABITUAL_LATE_PAYER: (overdue) =>
    `Hello, your account shows an overdue balance of ${overdue}. We have flexible payment plan options available. Please contact us to discuss.`,
  HARDSHIP_CASE: () =>
    `Hello, we understand you may be facing difficulties. Our hardship support team is available to help find a workable solution. Please reach out at your convenience.`,
  UNRESPONSIVE: () =>
    `Hello, we have been trying to reach you regarding your account. Please contact us at your convenience so we can assist you.`,
  HIGH_RISK_ESCALATION: (overdue) =>
    `Hello, your account with an overdue balance of ${overdue} is under review. Please contact our team at your earliest convenience to discuss options.`,
};

function formatCurrency(paise) {
  return `INR ${(paise / 100).toFixed(2)}`;
}

class MessageService {
  constructor({ llmClient }) {
    this.llmClient = llmClient;
  }

  async generateMessage(borrower, recommendation, ctx) {
    if (recommendation.nextBestAction === 'MANUAL_REVIEW' ||
        recommendation.nextBestAction === 'ESCALATION') {
      return { message: null, source: 'skipped', reason: 'Action does not require a message' };
    }

    const prompt = buildMessagePrompt({ borrower, recommendation });

    try {
      const raw = await this.llmClient.query(prompt, ctx);
      const validation = validateGeneratedMessage(raw);

      if (!validation.safe) {
        return this._fallback(borrower, recommendation, 'safety_violation');
      }

      return { message: raw, source: 'llm' };
    } catch (err) {
      console.error('LLM query failed in generateMessage:', err);
      return this._fallback(borrower, recommendation, `llm_error: ${err.message || 'unknown'}`);
    }
  }

  _fallback(borrower, recommendation, reason) {
    const template = FALLBACK_TEMPLATES[recommendation.segment];
    const overdue = formatCurrency(borrower.overdueAmount);
    const message = template ? template(overdue) : 'Please contact our support team.';
    return { message, source: 'fallback', reason };
  }

  async explain(borrower, recommendation, question, ctx) {
    const prompt = buildExplanationPrompt({ borrower, recommendation, question });
    try {
      const raw = await this.llmClient.query(prompt, ctx);
      return { explanation: raw, source: 'llm' };
    } catch (err) {

      console.error('LLM query failed in explain:', err);
      return {
        explanation: `Borrower assigned to ${recommendation.segment} with action ${recommendation.nextBestAction}. Reasons: ${recommendation.segmentReasons.join('; ')}.`,
        source: 'fallback',
      };
    }
  }
}

module.exports = { MessageService };
