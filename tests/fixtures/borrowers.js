'use strict';

/**
 * Reusable borrower fixtures for unit tests.
 * Each fixture is a minimal-but-valid borrower shaped to trigger a specific segment.
 */

const willingBorrower = {
  borrowerId: 'T-001',
  daysPastDue: 5,
  overdueAmount: 500000,
  priorPaymentBehavior: 'on_time',
  responseHistory: [{ channel: 'sms', response: 'acknowledged', daysAgo: 1 }],
  preferredChannel: 'sms',
  repaymentPromises: [],
  hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
  assignedAgentId: 'A001',
  locale: 'en-IN',
};

const hardshipBorrower = {
  borrowerId: 'T-002',
  daysPastDue: 25,
  overdueAmount: 2000000,
  priorPaymentBehavior: 'on_time',
  responseHistory: [{ channel: 'call', response: 'expressed_hardship', daysAgo: 2 }],
  preferredChannel: 'whatsapp',
  repaymentPromises: [],
  hardshipIndicators: { jobLoss: true, medical: false, naturalDisaster: false, other: false },
  assignedAgentId: 'A001',
  locale: 'en-IN',
};

const highRiskBorrower = {
  borrowerId: 'T-003',
  daysPastDue: 120,
  overdueAmount: 10000000,
  priorPaymentBehavior: 'defaulter',
  responseHistory: [{ channel: 'call', response: 'refused', daysAgo: 1 }],
  preferredChannel: 'call',
  repaymentPromises: [{ promisedDate: '2026-01-01', kept: false }],
  hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
  assignedAgentId: 'A002',
  locale: 'en-IN',
};

const unresponsiveBorrower = {
  borrowerId: 'T-004',
  daysPastDue: 35,
  overdueAmount: 3000000,
  priorPaymentBehavior: 'occasional_late',
  responseHistory: [
    { channel: 'call', response: 'no_answer', daysAgo: 2 },
    { channel: 'sms', response: 'no_response', daysAgo: 7 },
    { channel: 'email', response: 'no_response', daysAgo: 14 },
  ],
  preferredChannel: 'call',
  repaymentPromises: [],
  hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
  assignedAgentId: 'A001',
  locale: 'en-IN',
};

const habitualLateBorrower = {
  borrowerId: 'T-005',
  daysPastDue: 40,
  overdueAmount: 4000000,
  priorPaymentBehavior: 'frequent_late',
  responseHistory: [{ channel: 'call', response: 'promised_to_pay', daysAgo: 3 }],
  preferredChannel: 'call',
  repaymentPromises: [{ promisedDate: '2026-04-15', kept: true }],
  hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
  assignedAgentId: 'A001',
  locale: 'en-IN',
};

module.exports = {
  willingBorrower,
  hardshipBorrower,
  highRiskBorrower,
  unresponsiveBorrower,
  habitualLateBorrower,
};
