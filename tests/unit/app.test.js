'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');

function makeFakeLLM(response = 'Friendly reminder. Reply HELP if needed.') {
  return { query: jest.fn(async () => response) };
}

function buildApp(llmResponse) {
  return createApp({ llmClient: makeFakeLLM(llmResponse) });
}

const AGENT_TOKEN = 'agent-token-1';
const SUPERVISOR_TOKEN = 'supervisor-token-1';

describe('Collections API', () => {
  describe('GET /health', () => {
    test('is public', async () => {
      const res = await request(buildApp()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('authentication', () => {
    test('rejects request with no token', async () => {
      const res = await request(buildApp()).get('/api/v1/borrowers');
      expect(res.status).toBe(401);
    });

    test('rejects request with bad token', async () => {
      const res = await request(buildApp())
        .get('/api/v1/borrowers')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });

    test('accepts valid agent token', async () => {
      const res = await request(buildApp())
        .get('/api/v1/borrowers')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/borrowers — RBAC', () => {
    test('agent sees only assigned borrowers', async () => {
      const res = await request(buildApp())
        .get('/api/v1/borrowers')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`);
      expect(res.status).toBe(200);
      for (const b of res.body.borrowers) {
        expect(b.assignedAgentId).toBe('A001');
      }
    });

    test('supervisor sees every borrower', async () => {
      const res = await request(buildApp())
        .get('/api/v1/borrowers')
        .set('Authorization', `Bearer ${SUPERVISOR_TOKEN}`);
      expect(res.status).toBe(200);
      const agentIds = new Set(res.body.borrowers.map((b) => b.assignedAgentId));
      expect(agentIds.size).toBeGreaterThan(1);
    });
  });

  describe('POST /api/v1/borrowers/:id/recommend', () => {
    test('returns full recommendation for owned borrower', async () => {
      const res = await request(buildApp())
        .post('/api/v1/borrowers/B-1001/recommend')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.body.borrowerId).toBe('B-1001');
      expect(res.body.recommendation.segment).toBeDefined();
      expect(res.body.recommendation.nextBestAction).toBeDefined();
      expect(res.body.recommendation.channel).toBeDefined();
      expect(res.body.message).toBeDefined();
      expect(res.body.explainability.reasons.length).toBeGreaterThan(0);
    });

    test('returns 403 when agent requests a non-owned borrower', async () => {
      const res = await request(buildApp())
        .post('/api/v1/borrowers/B-1003/recommend')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`);
      expect(res.status).toBe(403);
    });

    test('returns 404 for unknown borrower', async () => {
      const res = await request(buildApp())
        .post('/api/v1/borrowers/DOES-NOT-EXIST/recommend')
        .set('Authorization', `Bearer ${SUPERVISOR_TOKEN}`);
      expect(res.status).toBe(404);
    });

    test('uses fallback when LLM returns unsafe content', async () => {
      const res = await request(buildApp('You will face legal action.'))
        .post('/api/v1/borrowers/B-1001/recommend')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.body.message.source).toBe('fallback');
      expect(res.body.message.message).not.toMatch(/legal action/i);
    });
  });

  describe('POST /api/v1/borrowers/:id/explain', () => {
    test('returns plain-English explanation', async () => {
      const res = await request(buildApp('This borrower was assigned to hardship support due to job loss.'))
        .post('/api/v1/borrowers/B-1004/explain')
        .set('Authorization', `Bearer ${SUPERVISOR_TOKEN}`)
        .send({ question: 'Why is this borrower assigned to hardship support?' });
      expect(res.status).toBe(200);
      expect(res.body.explanation).toMatch(/hardship/i);
      expect(res.body.decision.segment).toBeDefined();
    });

    test('rejects request with empty question', async () => {
      const res = await request(buildApp())
        .post('/api/v1/borrowers/B-1001/explain')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`)
        .send({ question: '' });
      expect(res.status).toBe(400);
    });

    test('rejects request with no question field', async () => {
      const res = await request(buildApp())
        .post('/api/v1/borrowers/B-1001/explain')
        .set('Authorization', `Bearer ${AGENT_TOKEN}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
