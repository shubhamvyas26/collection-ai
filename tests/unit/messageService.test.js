'use strict';

const { MessageService } = require('../../src/services/messageService');
const { StrategyService } = require('../../src/services/strategyService');
const { SegmentationService } = require('../../src/services/segmentationService');
const fixtures = require('../fixtures/borrowers');

function makeFakeLLM({ response, error } = {}) {
  return {
    query: jest.fn(async () => {
      if (error) throw error;
      return response;
    }),
  };
}

function recommendFor(borrower) {
  const seg = new SegmentationService().segment(borrower);
  return new StrategyService().recommend(borrower, seg);
}

describe('MessageService', () => {
  describe('generateMessage', () => {
    test('returns LLM message when output is safe', async () => {
      const llm = makeFakeLLM({ response: 'Hello, friendly reminder about your balance. Reply HELP if needed.' });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.willingBorrower);

      const result = await svc.generateMessage(fixtures.willingBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('llm');
      expect(result.message).toMatch(/HELP/);
      expect(llm.query).toHaveBeenCalledTimes(1);
    });

    test('falls back to template when LLM output contains forbidden term', async () => {
      const llm = makeFakeLLM({
        response: 'Pay now or face legal action and court proceedings.',
      });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.willingBorrower);

      const result = await svc.generateMessage(fixtures.willingBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('fallback');
      expect(result.reason).toBe('safety_violation');
      expect(result.message).not.toMatch(/legal action/i);
    });

    test('falls back when LLM throws', async () => {
      const llm = makeFakeLLM({ error: new Error('boom') });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.willingBorrower);

      const result = await svc.generateMessage(fixtures.willingBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('fallback');
      expect(result.reason).toBe('llm_error');
      expect(result.message).toBeTruthy();
    });

    test('skips message generation for ESCALATION action', async () => {
      const llm = makeFakeLLM({ response: 'should not be called' });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.highRiskBorrower);

      const result = await svc.generateMessage(fixtures.highRiskBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('skipped');
      expect(result.message).toBeNull();
      expect(llm.query).not.toHaveBeenCalled();
    });

    test('hardship fallback message contains no payment urgency', async () => {
      const llm = makeFakeLLM({ error: new Error('forced fallback') });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.hardshipBorrower);

      const result = await svc.generateMessage(fixtures.hardshipBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.message).toMatch(/support|help/i);
      expect(result.message).not.toMatch(/legal|court|seize/i);
    });

    test('rejects empty LLM response', async () => {
      const llm = makeFakeLLM({ response: '   ' });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.willingBorrower);

      const result = await svc.generateMessage(fixtures.willingBorrower, rec, {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('fallback');
    });
  });

  describe('explain', () => {
    test('returns LLM explanation when call succeeds', async () => {
      const llm = makeFakeLLM({ response: 'This borrower was flagged as hardship because of job loss.' });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.hardshipBorrower);

      const result = await svc.explain(fixtures.hardshipBorrower, rec, 'Why hardship?', {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('llm');
      expect(result.explanation).toMatch(/hardship/i);
    });

    test('falls back to deterministic explanation on LLM failure', async () => {
      const llm = makeFakeLLM({ error: new Error('upstream down') });
      const svc = new MessageService({ llmClient: llm });
      const rec = recommendFor(fixtures.hardshipBorrower);

      const result = await svc.explain(fixtures.hardshipBorrower, rec, 'Why?', {
        traceId: 't1', agentId: 'A001',
      });

      expect(result.source).toBe('fallback');
      expect(result.explanation).toMatch(/HARDSHIP_CASE/);
      expect(result.explanation).toMatch(/HARDSHIP_SUPPORT/);
    });
  });
});
