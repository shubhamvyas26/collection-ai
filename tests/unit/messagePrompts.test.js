'use strict';

const {
  buildMessagePrompt,
  buildExplanationPrompt,
  validateGeneratedMessage,
  HARD_RULES,
} = require('../../src/prompts/messagePrompts');
const fixtures = require('../fixtures/borrowers');
const { SegmentationService } = require('../../src/services/segmentationService');
const { StrategyService } = require('../../src/services/strategyService');

function recommendFor(b) {
  return new StrategyService().recommend(b, new SegmentationService().segment(b));
}

describe('messagePrompts', () => {
  describe('buildMessagePrompt', () => {
    test('includes structured facts as JSON', () => {
      const rec = recommendFor(fixtures.willingBorrower);
      const prompt = buildMessagePrompt({ borrower: fixtures.willingBorrower, recommendation: rec });
      expect(prompt).toContain('"borrower_reference": "T-001"');
      expect(prompt).toContain('"days_past_due": 5');
      expect(prompt).toContain('"channel": "sms"');
    });

    test('includes all hard rules', () => {
      const rec = recommendFor(fixtures.willingBorrower);
      const prompt = buildMessagePrompt({ borrower: fixtures.willingBorrower, recommendation: rec });
      for (const rule of HARD_RULES) {
        expect(prompt).toContain(rule);
      }
    });

    test('sms channel uses SMS length guidance', () => {
      const rec = recommendFor(fixtures.willingBorrower);
      const prompt = buildMessagePrompt({ borrower: fixtures.willingBorrower, recommendation: rec });
      expect(prompt).toMatch(/320 characters/);
    });
  });

  describe('validateGeneratedMessage', () => {
    test('passes safe message', () => {
      const result = validateGeneratedMessage('Hello, friendly reminder about your account. Please reply HELP for assistance.');
      expect(result.safe).toBe(true);
      expect(result.violations).toEqual([]);
    });

    test.each([
      ['legal action'],
      ['court'],
      ['credit bureau'],
      ['cibil'],
      ['seize'],
    ])('flags message containing "%s"', (term) => {
      const result = validateGeneratedMessage(`We will take ${term} against you.`);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.startsWith('forbidden'))).toBe(true);
    });

    test('flags empty message', () => {
      expect(validateGeneratedMessage('').safe).toBe(false);
      expect(validateGeneratedMessage('   ').safe).toBe(false);
    });

    test('flags overly long message', () => {
      const long = 'x'.repeat(700);
      const result = validateGeneratedMessage(long);
      expect(result.safe).toBe(false);
      expect(result.violations).toContain('too_long');
    });

    test('handles null/undefined', () => {
      expect(validateGeneratedMessage(null).safe).toBe(false);
      expect(validateGeneratedMessage(undefined).safe).toBe(false);
    });
  });

  describe('buildExplanationPrompt', () => {
    test('includes the agent question', () => {
      const rec = recommendFor(fixtures.hardshipBorrower);
      const prompt = buildExplanationPrompt({
        borrower: fixtures.hardshipBorrower,
        recommendation: rec,
        question: 'Why hardship support?',
      });
      expect(prompt).toContain('Why hardship support?');
    });

    test('includes decision and reasons', () => {
      const rec = recommendFor(fixtures.hardshipBorrower);
      const prompt = buildExplanationPrompt({
        borrower: fixtures.hardshipBorrower,
        recommendation: rec,
        question: 'Why?',
      });
      expect(prompt).toContain('HARDSHIP_CASE');
      expect(prompt).toContain('HARDSHIP_SUPPORT');
    });
  });
});
