'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { makeStrategyController } = require('../controllers/strategyController');

function buildRouter(deps) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const strategy = makeStrategyController(deps);

  router.use(authenticate);

  router.get('/api/v1/borrowers', strategy.listBorrowers);
  router.post('/api/v1/borrowers/:id/recommend', strategy.recommend);
  router.post('/api/v1/borrowers/:id/explain', strategy.explain);

  return router;
}

module.exports = { buildRouter };
