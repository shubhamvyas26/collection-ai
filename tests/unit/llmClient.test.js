'use strict';

const axios = require('axios');
const { LLMClient } = require('../../src/services/llmClient');

jest.mock('axios');

describe('LLMClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns text from response', async () => {
    axios.post.mockResolvedValue({ data: { response: 'hi' } });
    const client = new LLMClient({ maxRetries: 0 });
    const out = await client.query('hello');
    expect(out).toBe('hi');
  });

  test('returns text from .text shape', async () => {
    axios.post.mockResolvedValue({ data: { text: 'hi' } });
    const client = new LLMClient({ maxRetries: 0 });
    expect(await client.query('hello')).toBe('hi');
  });

  test('throws on empty response', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const client = new LLMClient({ maxRetries: 0 });
    await expect(client.query('hello')).rejects.toThrow('LLM returned empty response');
  });

  test('retries on 5xx then succeeds', async () => {
    const serverErr = new Error('503');
    serverErr.response = { status: 503 };
    axios.post
      .mockRejectedValueOnce(serverErr)
      .mockResolvedValueOnce({ data: { response: 'recovered' } });

    const client = new LLMClient({ maxRetries: 2 });
    const out = await client.query('hello');
    expect(out).toBe('recovered');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('does NOT retry on 4xx', async () => {
    const clientErr = new Error('401');
    clientErr.response = { status: 401 };
    axios.post.mockRejectedValue(clientErr);

    const client = new LLMClient({ maxRetries: 3 });
    await expect(client.query('hello')).rejects.toThrow();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('gives up after maxRetries', async () => {
    const serverErr = new Error('500');
    serverErr.response = { status: 500 };
    axios.post.mockRejectedValue(serverErr);

    const client = new LLMClient({ maxRetries: 2 });
    await expect(client.query('hello')).rejects.toThrow();
    expect(axios.post).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test('forwards metadata to upstream', async () => {
    axios.post.mockResolvedValue({ data: { response: 'ok' } });
    const client = new LLMClient({ maxRetries: 0 });
    await client.query('hello', { traceId: 'abc', agentId: 'A001' });
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { prompt: 'hello', metadata: { traceId: 'abc', agentId: 'A001' } },
      expect.any(Object)
    );
  });
});
