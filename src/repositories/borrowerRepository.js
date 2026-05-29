'use strict';

const { borrowers } = require('../data/borrowers');
const { notFoundError, forbiddenError } = require('../utils/errors');

class BorrowerRepository {
  constructor(data = borrowers) {
    this._store = new Map(data.map((b) => [b.borrowerId, { ...b }]));
  }

  list(principal) {
    const all = Array.from(this._store.values());
    if (principal.role === 'supervisor') return all;
    return all.filter((b) => b.assignedAgentId === principal.agentId);
  }

  findById(bId, principal) {
    const borrower = this._store.get(bId);
    if (!borrower) throw notFoundError('Borrower');

    if (principal.role !== 'supervisor' && borrower.assignedAgentId !== principal.agentId) {
      throw forbiddenError('Borrower not assigned to this agent');
    }
    return { ...borrower };
  }
}

module.exports = { BorrowerRepository };
