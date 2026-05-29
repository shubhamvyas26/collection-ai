'use strict';

const { BorrowerRepository } = require('../../src/repositories/borrowerRepository');

const seed = [
  { borrowerId: 'B1', assignedAgentId: 'A001', daysPastDue: 1, overdueAmount: 100 },
  { borrowerId: 'B2', assignedAgentId: 'A002', daysPastDue: 2, overdueAmount: 200 },
];

describe('BorrowerRepository', () => {
  test('agent sees only their borrowers', () => {
    const repo = new BorrowerRepository(seed);
    const list = repo.list({ role: 'agent', agentId: 'A001' });
    expect(list.map((b) => b.borrowerId)).toEqual(['B1']);
  });

  test('supervisor sees all borrowers', () => {
    const repo = new BorrowerRepository(seed);
    const list = repo.list({ role: 'supervisor', agentId: 'S001' });
    expect(list.map((b) => b.borrowerId).sort()).toEqual(['B1', 'B2']);
  });

  test('findById succeeds for assigned agent', () => {
    const repo = new BorrowerRepository(seed);
    const b = repo.findById('B1', { role: 'agent', agentId: 'A001' });
    expect(b.borrowerId).toBe('B1');
  });

  test('findById throws for non-assigned agent', () => {
    const repo = new BorrowerRepository(seed);
    expect(() => repo.findById('B1', { role: 'agent', agentId: 'A002' }))
      .toThrow(/not assigned/);
  });

  test('findById succeeds for supervisor regardless of assignment', () => {
    const repo = new BorrowerRepository(seed);
    const b = repo.findById('B1', { role: 'supervisor', agentId: 'S001' });
    expect(b.borrowerId).toBe('B1');
  });

  test('findById throws for missing id', () => {
    const repo = new BorrowerRepository(seed);
    expect(() => repo.findById('NOPE', { role: 'supervisor', agentId: 'S001' }))
      .toThrow(/not found/);
  });

  test('returned objects are clones', () => {
    const repo = new BorrowerRepository(seed);
    const b = repo.findById('B1', { role: 'supervisor', agentId: 'S001' });
    b.daysPastDue = 9999;
    const b2 = repo.findById('B1', { role: 'supervisor', agentId: 'S001' });
    expect(b2.daysPastDue).toBe(1);
  });
});
