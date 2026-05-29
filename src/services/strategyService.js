'use strict';

const { SEGMENTS } = require('./segmentationService');

/**
 * Strategy service: given a segment, decide:
 *   1. Next Best Action (NBA)
 *   2. Channel (overrides borrower's preferred channel if compliance requires)
 *   3. Best contact time (derived from response history)
 *   4. Expected recovery probability (heuristic — documented as such)
 *
 * DESIGN DECISION: Segment → action mapping is a lookup table, not freeform.
 * Compliance teams can review this table and sign off. An LLM here would be
 * unauditable and could hallucinate actions like "send legal threat" — which
 * is explicitly disallowed by the case study.
 */

const ACTIONS = Object.freeze({
  SMS_REMINDER: 'SMS_REMINDER',
  EMAIL_REMINDER: 'EMAIL_REMINDER',
  AGENT_CALL: 'AGENT_CALL',
  PAYMENT_PLAN_OFFER: 'PAYMENT_PLAN_OFFER',
  HARDSHIP_SUPPORT: 'HARDSHIP_SUPPORT',
  ESCALATION: 'ESCALATION',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
});

const SEGMENT_PLAYBOOK = Object.freeze({
  [SEGMENTS.WILLING_BUT_DELAYED]: {
    primaryAction: ACTIONS.SMS_REMINDER,
    fallbackAction: ACTIONS.EMAIL_REMINDER,
    recoveryProbability: 0.85,
    rationale: 'Cooperative borrower; light-touch reminder is sufficient.',
  },
  [SEGMENTS.HABITUAL_LATE_PAYER]: {
    primaryAction: ACTIONS.AGENT_CALL,
    fallbackAction: ACTIONS.PAYMENT_PLAN_OFFER,
    recoveryProbability: 0.65,
    rationale: 'Pattern of lateness; direct conversation + plan offer improves recovery.',
  },
  [SEGMENTS.HARDSHIP_CASE]: {
    primaryAction: ACTIONS.HARDSHIP_SUPPORT,
    fallbackAction: ACTIONS.MANUAL_REVIEW,
    recoveryProbability: 0.40,
    rationale: 'Borrower has signaled hardship; route to support team, never escalate.',
  },
  [SEGMENTS.UNRESPONSIVE]: {
    primaryAction: ACTIONS.AGENT_CALL,
    fallbackAction: ACTIONS.MANUAL_REVIEW,
    recoveryProbability: 0.35,
    rationale: 'Silent across channels; live agent contact attempt before manual review.',
  },
  [SEGMENTS.HIGH_RISK_ESCALATION]: {
    primaryAction: ACTIONS.ESCALATION,
    fallbackAction: ACTIONS.MANUAL_REVIEW,
    recoveryProbability: 0.20,
    rationale: 'Deep delinquency / defaulter pattern; supervisor review required.',
  },
});

function selectChannel(segment, borrowerPreferredChannel, primaryAction) {
  const actionChannelMap = {
    [ACTIONS.SMS_REMINDER]: 'sms',
    [ACTIONS.EMAIL_REMINDER]: 'email',
    [ACTIONS.AGENT_CALL]: 'call',
    [ACTIONS.PAYMENT_PLAN_OFFER]: borrowerPreferredChannel || 'call',
    [ACTIONS.HARDSHIP_SUPPORT]: 'call',
    [ACTIONS.ESCALATION]: 'call',
    [ACTIONS.MANUAL_REVIEW]: 'internal',
  };
  return actionChannelMap[primaryAction] || borrowerPreferredChannel || 'sms';
}

function selectBestTime(responseHistory) {
  const successfulResponses = (responseHistory || []).filter(
    (r) => r.response === 'acknowledged'
        || r.response === 'promised_to_pay'
        || r.response === 'expressed_hardship',
  );

  // Without per-contact timestamps in mock data, we use a sensible default.
  if (successfulResponses.length > 0) {
    return { window: '10:00-13:00', tz: 'Asia/Kolkata', basis: 'historical_engagement' };
  }
  return { window: '10:00-13:00', tz: 'Asia/Kolkata', basis: 'default_business_hours' };
}

class StrategyService {
  recommend(borrower, segmentation) {
    const playbook = SEGMENT_PLAYBOOK[segmentation.segment];
    if (!playbook) {
      throw new Error(`No playbook for segment ${segmentation.segment}`);
    }

    const channel = selectChannel(segmentation.segment, borrower.preferredChannel, playbook.primaryAction);
    const bestTime = selectBestTime(borrower.responseHistory);

    return {
      segment: segmentation.segment,
      segmentReasons: segmentation.reasons,
      nextBestAction: playbook.primaryAction,
      fallbackAction: playbook.fallbackAction,
      channel,
      bestContactTime: bestTime,
      recoveryProbability: playbook.recoveryProbability, // heuristic — see README
      rationale: playbook.rationale,
    };
  }
}

module.exports = { StrategyService, ACTIONS, SEGMENT_PLAYBOOK };
