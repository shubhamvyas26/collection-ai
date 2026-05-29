'use strict';

const { validationError } = require('../utils/errors');

function makeStrategyController({
  borrowerRepository,
  segmentationService,
  strategyService,
  messageService,
}) {
  async function listBorrowers(req, res, next) {
    try {
      const list = borrowerRepository.list(req.principal);
      const summary = list.map((b) => ({
        borrowerId: b.borrowerId,
        daysPastDue: b.daysPastDue,
        overdueAmount: b.overdueAmount,
        assignedAgentId: b.assignedAgentId,
      }));
      res.json({ borrowers: summary });
    } catch (err) {
      next(err);
    }
  }

  async function recommend(req, res, next) {
    try {
      const borrower = borrowerRepository.findById(req.params.id, req.principal);
      const segmentation = segmentationService.segment(borrower);
      const recommendation = strategyService.recommend(borrower, segmentation);

      const messageResult = await messageService.generateMessage(borrower, recommendation, {
        traceId: req.id || 'no-trace',
        agentId: req.principal.agentId,
      });

      res.json({
        borrowerId: borrower.borrowerId,
        recommendation,
        message: messageResult,
        explainability: {
          rules: segmentation.evaluatedRules,
          reasons: segmentation.reasons,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async function explain(req, res, next) {
    try {
      const { question } = req.body;
      if (!question || question.length < 3) {
        throw validationError('Question must be at least 3 characters');
      }

      const borrower = borrowerRepository.findById(req.params.id, req.principal);
      const segmentation = segmentationService.segment(borrower);
      const recommendation = strategyService.recommend(borrower, segmentation);

      const result = await messageService.explain(borrower, recommendation, question, {
        traceId: req.id || 'no-trace',
        agentId: req.principal.agentId,
      });

      res.json({
        borrowerId: borrower.borrowerId,
        question,
        explanation: result.explanation,
        source: result.source,
        decision: {
          segment: recommendation.segment,
          nextBestAction: recommendation.nextBestAction,
          reasons: recommendation.segmentReasons,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  return { listBorrowers, recommend, explain };
}

module.exports = { makeStrategyController };
