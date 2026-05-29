'use strict';

/**
 * Borrower segmentation uses fixed business rules, not an LLM.
 * This keeps decisions consistent, explainable, and easy to audit.
 *
 * Segments:
 * - WILLING_BUT_DELAYED: Cooperative, short payment delay.
 * - HABITUAL_LATE_PAYER: Often pays late.
 * - HARDSHIP_CASE: Facing financial hardship.
 * - UNRESPONSIVE: Not responding to outreach.
 * - HIGH_RISK_ESCALATION: High risk of default.
 */

const SEGMENTS = Object.freeze({
  WILLING_BUT_DELAYED: 'WILLING_BUT_DELAYED',
  HABITUAL_LATE_PAYER: 'HABITUAL_LATE_PAYER',
  HARDSHIP_CASE: 'HARDSHIP_CASE',
  UNRESPONSIVE: 'UNRESPONSIVE',
  HIGH_RISK_ESCALATION: 'HIGH_RISK_ESCALATION',
});

const RULES = [
  // Hardship beats everything else, we never want to escalate someone in crisis.
  function hardshipRule(b) {
    const h = b.hardshipIndicators || {};
    const flagged = Object.entries(h).filter(([, v]) => v === true).map(([k]) => k);
    if (flagged.length > 0) {
      return {
        segment: SEGMENTS.HARDSHIP_CASE,
        reasons: [`Hardship indicators present: ${flagged.join(', ')}`],
      };
    }
    return null;
  },

  // High risk: long DPD plus signal of unwillingness.
  function highRiskRule(b) {
    const brokenPromises = (b.repaymentPromises || []).filter((p) => p.kept === false).length;
    if (b.daysPastDue >= 90 || b.priorPaymentBehavior === 'defaulter') {
      const reasons = [];
      if (b.daysPastDue >= 90) reasons.push(`DPD=${b.daysPastDue} (>=90)`);
      if (b.priorPaymentBehavior === 'defaulter') reasons.push('Prior behavior: defaulter');
      if (brokenPromises > 0) reasons.push(`${brokenPromises} broken promise(s)`);
      return { segment: SEGMENTS.HIGH_RISK_ESCALATION, reasons };
    }
    return null;
  },

  // Unresponsive: silent across 3+ contact attempts in last 30 days.
  function unresponsiveRule(b) {
    const recent = (b.responseHistory || []).filter((r) => r.daysAgo <= 30);
    const noResponseCount = recent.filter(
      (r) => r.response === 'no_response' || r.response === 'no_answer',
    ).length;
    if (recent.length >= 3 && noResponseCount === recent.length) {
      return {
        segment: SEGMENTS.UNRESPONSIVE,
        reasons: [`${noResponseCount} unanswered contacts across ${new Set(recent.map((r) => r.channel)).size} channels`],
      };
    }
    return null;
  },

  // Habitual late: pattern of lateness without hardship/high risk markers.
  function habitualLateRule(b) {
    if (b.priorPaymentBehavior === 'frequent_late') {
      return {
        segment: SEGMENTS.HABITUAL_LATE_PAYER,
        reasons: [`Prior behavior: frequent_late, DPD=${b.daysPastDue}`],
      };
    }
    return null;
  },

  // Default bucket: cooperative borrower in shallow delinquency.
  function willingDelayedRule(b) {
    return {
      segment: SEGMENTS.WILLING_BUT_DELAYED,
      reasons: [
        `DPD=${b.daysPastDue}`,
        `Prior behavior: ${b.priorPaymentBehavior}`,
        'No hardship indicators',
      ],
    };
  },
];

class SegmentationService {
  segment(borrower) {
    const evaluatedRules = [];
    for (const rule of RULES) {
      evaluatedRules.push(rule.name);
      const result = rule(borrower);
      if (result) {
        return {
          segment: result.segment,
          reasons: result.reasons,
          evaluatedRules,
        };
      }
    }
    // Defensive — the last rule always matches, but never trust the future.
    return {
      segment: SEGMENTS.WILLING_BUT_DELAYED,
      reasons: ['Default fallback'],
      evaluatedRules,
    };
  }
}

module.exports = { SegmentationService, SEGMENTS };
