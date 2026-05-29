'use strict';

const { SegmentationService, SEGMENTS } = require('../../src/services/segmentationService');
const fixtures = require('../fixtures/borrowers');

describe('SegmentationService', () => {
  let service;
  beforeEach(() => {
    service = new SegmentationService();
  });

  describe('rule precedence', () => {
    test('hardship takes priority over high risk', () => {
      // 95 DPD AND hardship — hardship should win because we must not escalate someone in crisis.
      const borrower = {
        ...fixtures.hardshipBorrower,
        daysPastDue: 95,
        priorPaymentBehavior: 'defaulter',
      };
      const result = service.segment(borrower);
      expect(result.segment).toBe(SEGMENTS.HARDSHIP_CASE);
      expect(result.reasons[0]).toMatch(/jobLoss/);
    });

    test('high risk wins over habitual late when no hardship', () => {
      const borrower = {
        ...fixtures.highRiskBorrower,
        priorPaymentBehavior: 'frequent_late',
      };
      const result = service.segment(borrower);
      expect(result.segment).toBe(SEGMENTS.HIGH_RISK_ESCALATION);
    });

    test('unresponsive beats habitual late', () => {
      const borrower = {
        ...fixtures.unresponsiveBorrower,
        priorPaymentBehavior: 'frequent_late',
      };
      const result = service.segment(borrower);
      expect(result.segment).toBe(SEGMENTS.UNRESPONSIVE);
    });
  });

  describe('segment classification', () => {
    test.each([
      ['willingBorrower', SEGMENTS.WILLING_BUT_DELAYED],
      ['hardshipBorrower', SEGMENTS.HARDSHIP_CASE],
      ['highRiskBorrower', SEGMENTS.HIGH_RISK_ESCALATION],
      ['unresponsiveBorrower', SEGMENTS.UNRESPONSIVE],
      ['habitualLateBorrower', SEGMENTS.HABITUAL_LATE_PAYER],
    ])('classifies %s correctly', (fixtureName, expectedSegment) => {
      const result = service.segment(fixtures[fixtureName]);
      expect(result.segment).toBe(expectedSegment);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('boundary conditions', () => {
    test('DPD exactly 90 is high risk', () => {
      const borrower = { ...fixtures.willingBorrower, daysPastDue: 90 };
      expect(service.segment(borrower).segment).toBe(SEGMENTS.HIGH_RISK_ESCALATION);
    });

    test('DPD 89 with on_time history is not high risk', () => {
      const borrower = { ...fixtures.willingBorrower, daysPastDue: 89 };
      const result = service.segment(borrower);
      expect(result.segment).not.toBe(SEGMENTS.HIGH_RISK_ESCALATION);
    });

    test('2 unanswered contacts is not unresponsive (need >=3)', () => {
      const borrower = {
        ...fixtures.willingBorrower,
        responseHistory: [
          { channel: 'sms', response: 'no_response', daysAgo: 5 },
          { channel: 'call', response: 'no_answer', daysAgo: 10 },
        ],
      };
      expect(service.segment(borrower).segment).not.toBe(SEGMENTS.UNRESPONSIVE);
    });

    test('3 unanswered contacts WITH one ack is not unresponsive', () => {
      const borrower = {
        ...fixtures.willingBorrower,
        responseHistory: [
          { channel: 'sms', response: 'no_response', daysAgo: 5 },
          { channel: 'call', response: 'no_answer', daysAgo: 10 },
          { channel: 'email', response: 'acknowledged', daysAgo: 15 },
        ],
      };
      expect(service.segment(borrower).segment).not.toBe(SEGMENTS.UNRESPONSIVE);
    });

    test('missing optional fields are handled gracefully', () => {
      const borrower = {
        borrowerId: 'EDGE-1',
        daysPastDue: 10,
        overdueAmount: 1000,
        priorPaymentBehavior: 'on_time',
        // no responseHistory, no repaymentPromises, no hardshipIndicators
        assignedAgentId: 'A001',
        locale: 'en-IN',
      };
      const result = service.segment(borrower);
      expect(result.segment).toBe(SEGMENTS.WILLING_BUT_DELAYED);
    });
  });

  describe('determinism', () => {
    test('same input produces identical output across many runs', () => {
      const borrower = fixtures.habitualLateBorrower;
      const first = service.segment(borrower);
      for (let i = 0; i < 100; i += 1) {
        expect(service.segment(borrower)).toEqual(first);
      }
    });

    test('evaluatedRules trace is included for audit', () => {
      const result = service.segment(fixtures.willingBorrower);
      expect(Array.isArray(result.evaluatedRules)).toBe(true);
      expect(result.evaluatedRules).toContain('willingDelayedRule');
    });
  });
});
