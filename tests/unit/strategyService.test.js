'use strict';

const { StrategyService, ACTIONS } = require('../../src/services/strategyService');
const { SegmentationService, SEGMENTS } = require('../../src/services/segmentationService');
const fixtures = require('../fixtures/borrowers');

describe('StrategyService', () => {
  let strategy;
  let segmentation;
  beforeEach(() => {
    strategy = new StrategyService();
    segmentation = new SegmentationService();
  });

  function recommendFor(borrower) {
    const seg = segmentation.segment(borrower);
    return strategy.recommend(borrower, seg);
  }

  describe('NBA mapping', () => {
    test.each([
      ['willingBorrower', ACTIONS.SMS_REMINDER, 'sms'],
      ['hardshipBorrower', ACTIONS.HARDSHIP_SUPPORT, 'call'],
      ['highRiskBorrower', ACTIONS.ESCALATION, 'call'],
      ['unresponsiveBorrower', ACTIONS.AGENT_CALL, 'call'],
      ['habitualLateBorrower', ACTIONS.AGENT_CALL, 'call'],
    ])('%s -> action %s on channel %s', (fixtureName, expectedAction, expectedChannel) => {
      const rec = recommendFor(fixtures[fixtureName]);
      expect(rec.nextBestAction).toBe(expectedAction);
      expect(rec.channel).toBe(expectedChannel);
    });
  });

  describe('safety invariants', () => {
    test('hardship case is NEVER escalated', () => {
      const rec = recommendFor(fixtures.hardshipBorrower);
      expect(rec.nextBestAction).not.toBe(ACTIONS.ESCALATION);
      expect(rec.fallbackAction).not.toBe(ACTIONS.ESCALATION);
    });

    test('hardship channel is always live (call), never automated SMS', () => {
      // Even if borrower prefers SMS, hardship gets a live channel.
      const borrower = { ...fixtures.hardshipBorrower, preferredChannel: 'sms' };
      const rec = recommendFor(borrower);
      expect(rec.channel).toBe('call');
    });

    test('recovery probability is bounded between 0 and 1', () => {
      for (const fx of Object.values(fixtures)) {
        const rec = recommendFor(fx);
        expect(rec.recoveryProbability).toBeGreaterThanOrEqual(0);
        expect(rec.recoveryProbability).toBeLessThanOrEqual(1);
      }
    });

    test('all responses include a non-empty rationale', () => {
      for (const fx of Object.values(fixtures)) {
        const rec = recommendFor(fx);
        expect(typeof rec.rationale).toBe('string');
        expect(rec.rationale.length).toBeGreaterThan(0);
      }
    });
  });

  describe('best contact time', () => {
    test('uses historical engagement basis when borrower has responded successfully', () => {
      const rec = recommendFor(fixtures.willingBorrower);
      expect(rec.bestContactTime.basis).toBe('historical_engagement');
    });

    test('falls back to default business hours for unresponsive borrowers', () => {
      const rec = recommendFor(fixtures.unresponsiveBorrower);
      expect(rec.bestContactTime.basis).toBe('default_business_hours');
    });
  });

  describe('error handling', () => {
    test('throws when given an unknown segment', () => {
      expect(() => strategy.recommend(fixtures.willingBorrower, { segment: 'BOGUS', reasons: [] }))
        .toThrow(/No playbook/);
    });
  });
});
