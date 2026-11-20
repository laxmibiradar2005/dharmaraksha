import test from 'node:test';
process.env.AI_BUDGET_DB = ':memory:';
import assert from 'node:assert/strict';
import express from 'express';
import { createVoiceRouter, parseVoiceRequest } from '../api/voice';
import { queryLocalAssistant } from '../lib/localAssistant';
import { assistantRouter } from '../api/assistant';
import type { AddressInfo } from 'node:net';

test('voice validation rejects malformed inputs before provider work', () => {
  for (const body of [null, {}, { text: '' }, { text: 'a'.repeat(2501) }, { text: 'Hello', language: '__proto__' }]) assert.throws(() => parseVoiceRequest(body));
  assert.deepEqual(parseVoiceRequest({ text: ' Hello ', language: 'kn-IN' }), { text: 'Hello', language: 'kn-IN' });
});

test('Sarvam adapter keeps the key server-side and returns audio without caching', async () => {
  const previous = process.env.SARVAM_API_KEY; process.env.SARVAM_API_KEY = 'test-private-key';
  let request: RequestInit | undefined;
  const mock = (async (_url, options) => { request = options; return new Response(JSON.stringify({ audios: [Buffer.from('RIFFtest').toString('base64')] }), { status: 200 }); }) as typeof fetch;
  const app = express(); app.use(express.json()); app.use('/voice', createVoiceRouter(mock));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/voice/speak`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello', language: 'hi-IN' }) });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), 'RIFFtest');
    assert.equal((request?.headers as Record<string, string>)['api-subscription-key'], 'test-private-key');
    assert.equal(JSON.parse(String(request?.body)).language_code, 'hi-IN');
  } finally { server.close(); if (previous === undefined) delete process.env.SARVAM_API_KEY; else process.env.SARVAM_API_KEY = previous; }
});

test('local fallback bounds context and clearly marks its answer as offline', async () => {
  const previous = process.env.LOCAL_LLM_URL; process.env.LOCAL_LLM_URL = 'http://127.0.0.1:8080';
  let payload: Record<string, any> = {};
  try {
    const result = await queryLocalAssistant({ message: 'Summarize the known facts.', language: 'en-IN', context: 'c'.repeat(10000), history: [] }, (async (_url, options) => {
      payload = JSON.parse(String(options?.body)); return new Response(JSON.stringify({ choices: [{ message: { content: 'Only the cached facts are available.' } }] }));
    }) as typeof fetch);
    assert.equal(result?.offline, true); assert.equal(result?.limitedContext, true); assert.equal(payload.max_tokens, 256);
    assert.ok(payload.messages.at(-1).content.length < 2200);
  } finally { if (previous === undefined) delete process.env.LOCAL_LLM_URL; else process.env.LOCAL_LLM_URL = previous; }
});

test('assistant API falls back when no online provider is configured', async () => {
  const saved = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, RAG_SERVER_URL: process.env.RAG_SERVER_URL, LOCAL_LLM_URL: process.env.LOCAL_LLM_URL };
  delete process.env.GEMINI_API_KEY; delete process.env.RAG_SERVER_URL;
  const model = express(); model.use(express.json()); model.post('/v1/chat/completions', (_req, res) => res.json({ choices: [{ message: { content: 'Cached case response.' } }] }));
  const modelServer = model.listen(0, '127.0.0.1'); await new Promise<void>(resolve => modelServer.once('listening', resolve));
  process.env.LOCAL_LLM_URL = `http://127.0.0.1:${(modelServer.address() as AddressInfo).port}`;
  const app = express(); app.use(express.json()); app.use('/assistant', assistantRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Explain this cached case.' }) });
    assert.equal(response.status, 200); const result = await response.json() as { offline: boolean; reply: string }; assert.equal(result.offline, true); assert.equal(result.reply, 'Cached case response.');
  } finally { server.close(); modelServer.close(); for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('assistant returns to RAG after an outage and filters unsafe source links', async () => {
  const saved = { RAG_SERVER_URL: process.env.RAG_SERVER_URL, RAG_SERVER_TOKEN: process.env.RAG_SERVER_TOKEN, LOCAL_LLM_URL: process.env.LOCAL_LLM_URL };
  let online = false; let localCalls = 0; let sourceOnly = false;
  const providers = express(); providers.use(express.json());
  providers.post('/query', (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer test-rag-token');
    if (!online) { res.status(503).end(); return; }
    res.json({ reply: 'Answer with retrieved context.', provider:sourceOnly?'local-search':'gemini-rag', retrievalOnly:sourceOnly, sources: [{ title: 'Reference', url: 'https://example.org/law' }, { title: 'Unsafe', url: 'javascript:alert(1)' }] });
  });
  providers.post('/v1/chat/completions', (_req, res) => { localCalls++; res.json({ choices: [{ message: { content: 'Offline draft.' } }] }); });
  const providerServer = providers.listen(0, '127.0.0.1'); await new Promise<void>(resolve => providerServer.once('listening', resolve));
  const base = `http://127.0.0.1:${(providerServer.address() as AddressInfo).port}`;
  process.env.RAG_SERVER_URL = base; process.env.LOCAL_LLM_URL = base; process.env.RAG_SERVER_TOKEN = 'test-rag-token';
  const app = express(); app.use(express.json()); app.use('/assistant', assistantRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const request = () => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Explain the case.' }) });
  try {
    const first = await request(); assert.equal(first.status, 200); assert.equal((await first.json() as { offline: boolean }).offline, true);
    online = true;
    const second = await request(); assert.equal(second.status, 200);
    const result = await second.json() as { provider: string; sources: { url: string }[] };
    assert.equal(result.provider, 'gemini-rag'); assert.deepEqual(result.sources.map(source => source.url), ['https://example.org/law']); assert.equal(localCalls, 1);
    sourceOnly=true;const third=await (await request()).json() as {provider:string;retrievalOnly:boolean};assert.equal(third.provider,'local-search');assert.equal(third.retrievalOnly,true);
  } finally { server.close(); providerServer.close(); for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
