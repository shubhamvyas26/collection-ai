'use strict';

const express = require('express');
const { buildRouter } = require('./routes');

const { BorrowerRepository } = require('./repositories/borrowerRepository');
const { SegmentationService } = require('./services/segmentationService');
const { StrategyService } = require('./services/strategyService');
const { MessageService } = require('./services/messageService');
const { LLMClient } = require('./services/llmClient');

function createApp(overrides = {}) {
  const app = express();
  app.use(express.json());

  const borrowerRepository = overrides.borrowerRepository || new BorrowerRepository();
  const segmentationService = overrides.segmentationService || new SegmentationService();
  const strategyService = overrides.strategyService || new StrategyService();
  const llmClient = overrides.llmClient || new LLMClient();
  const messageService = overrides.messageService || new MessageService({ llmClient });

  app.use(buildRouter({
    borrowerRepository,
    segmentationService,
    strategyService,
    messageService,
  }));

  // Simple error handler
  app.use((err, req, res, _next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}

module.exports = { createApp };
