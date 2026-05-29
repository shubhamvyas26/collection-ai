'use strict';

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

function parseDemoTokens(raw) {
  if (!raw) return new Map();
  const map = new Map();
  for (const entry of raw.split(',')) {
    const [token, role, agentId] = entry.split(':').map((s) => (s || '').trim());
    if (token && role && agentId) {
      map.set(token, { role, agentId });
    }
  }
  return map;
}

const config = {
  env,
  port: parseInt(process.env.PORT || '3000', 10),
  llm: {
    baseUrl: process.env.LLM_WRAPPER_URL || 'https://llm-wrapper-741152993481.asia-south1.run.app',
    token: process.env.LLM_API_TOKEN || 'dev-token',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10),
  },
  auth: {
    demoTokens: parseDemoTokens(process.env.DEMO_TOKENS ||
      'agent-token-1:agent:A001,supervisor-token-1:supervisor:S001'),
  },
};

module.exports = config;
