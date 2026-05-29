'use strict';


// Sample borrower data.
const borrowers = [
  {
    borrowerId: 'B-1001',
    name: 'Borrower 1001',
    daysPastDue: 7,
    overdueAmount: 1250000, // ₹12,500.00
    priorPaymentBehavior: 'on_time',
    responseHistory: [
      { channel: 'sms', response: 'acknowledged', daysAgo: 2 },
    ],
    preferredChannel: 'sms',
    repaymentPromises: [],
    hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
    assignedAgentId: 'A001',
    locale: 'en-IN',
  },
  {
    borrowerId: 'B-1002',
    name: 'Borrower 1002',
    daysPastDue: 22,
    overdueAmount: 4500000,
    priorPaymentBehavior: 'occasional_late',
    responseHistory: [
      { channel: 'call', response: 'promised_to_pay', daysAgo: 5 },
      { channel: 'sms', response: 'no_response', daysAgo: 10 },
    ],
    preferredChannel: 'call',
    repaymentPromises: [
      { promisedDate: '2026-05-25', kept: false },
    ],
    hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
    assignedAgentId: 'A001',
    locale: 'en-IN',
  },
  {
    borrowerId: 'B-1003',
    name: 'Borrower 1003',
    daysPastDue: 45,
    overdueAmount: 7800000,
    priorPaymentBehavior: 'frequent_late',
    responseHistory: [
      { channel: 'call', response: 'no_answer', daysAgo: 3 },
      { channel: 'sms', response: 'no_response', daysAgo: 7 },
      { channel: 'email', response: 'no_response', daysAgo: 14 },
    ],
    preferredChannel: 'call',
    repaymentPromises: [
      { promisedDate: '2026-05-10', kept: false },
      { promisedDate: '2026-05-20', kept: false },
    ],
    hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
    assignedAgentId: 'A002',
    locale: 'en-IN',
  },
  {
    borrowerId: 'B-1004',
    name: 'Borrower 1004',
    daysPastDue: 30,
    overdueAmount: 3200000,
    priorPaymentBehavior: 'on_time',
    responseHistory: [
      { channel: 'call', response: 'expressed_hardship', daysAgo: 4 },
    ],
    preferredChannel: 'whatsapp',
    repaymentPromises: [],
    hardshipIndicators: { jobLoss: true, medical: false, naturalDisaster: false, other: false },
    assignedAgentId: 'A002',
    locale: 'en-IN',
  },
  {
    borrowerId: 'B-1005',
    name: 'Borrower 1005',
    daysPastDue: 95,
    overdueAmount: 12500000,
    priorPaymentBehavior: 'defaulter',
    responseHistory: [
      { channel: 'call', response: 'refused', daysAgo: 2 },
      { channel: 'call', response: 'no_answer', daysAgo: 20 },
    ],
    preferredChannel: 'call',
    repaymentPromises: [
      { promisedDate: '2026-03-15', kept: false },
    ],
    hardshipIndicators: { jobLoss: false, medical: false, naturalDisaster: false, other: false },
    assignedAgentId: 'A001',
    locale: 'en-IN',
  },
];

module.exports = { borrowers };
