'use strict';

const axios = require('axios');
const config = require('../config');

class LLMClient {
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || config.llm.baseUrl;
    this.token = opts.token || config.llm.token;
    this.timeoutMs = opts.timeoutMs || config.llm.timeoutMs;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  async query(prompt, metadata = {}) {
    const body = { prompt, metadata };
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await axios.post(`${this.baseUrl}/llm/query`, body, {
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
        });

        const text = res.data?.response || res.data?.text ||
          (typeof res.data === 'string' ? res.data : null);
        if (!text) throw new Error('LLM returned empty response');
        return text.trim();
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        // Only retry on server errors or network issues
        if (status && status < 500) break;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 2 ** attempt * 200));
        }
      }
    }

    throw new Error(`LLM call failed: ${lastError?.message}`);
  }
}

module.exports = { LLMClient };
