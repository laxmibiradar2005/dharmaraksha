import { Router } from 'express';
import { type Content } from '@google/generative-ai';
import { queryLocalAssistant } from '../lib/localAssistant';
import { answerLegal } from '../lib/groundedAssistant';

import { indianLanguages as languages, isConversationEnd, goodbyes } from '../lib/indianLanguages';
export interface AssistantRequest { message: string; history: Content[]; context: string; language: string; voice?: boolean }

/** Validate untrusted input before any provider request or billable work. */
export function parseAssistantRequest(body: unknown): AssistantRequest {
  if (!body || typeof body !== 'object') throw new Error('Please provide a legal question.');
  const data = body as Record<string, unknown>;
  if (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 6000) {
    throw new Error('Your question must contain between 1 and 6,000 characters.');
  }
  if (data.context !== undefined && (typeof data.context !== 'string' || data.context.length > 20000)) {
    throw new Error('Document context must be text of up to 20,000 characters.');
  }
  if (data.language !== undefined && (typeof data.language !== 'string' || !Object.prototype.hasOwnProperty.call(languages, data.language))) {
    throw new Error('Choose a supported Indian language or English.');
  }
  if (data.history !== undefined && (!Array.isArray(data.history) || data.history.length > 12)) {
    throw new Error('Send up to 12 recent conversation messages.');
  }
  if(data.voice!==undefined && typeof data.voice!=='boolean')throw Error('Invalid conversation mode.');
  const history: Content[] = [];
  for (const entry of (data.history ?? []) as unknown[]) {
    if (!entry || typeof entry !== 'object') throw new Error('Conversation history is invalid.');
    const message = entry as Record<string, unknown>;
    if (!['user', 'assistant'].includes(String(message.role)) || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 12000) {
      throw new Error('Conversation history contains an invalid message.');
    }
    const role = message.role === 'assistant' ? 'model' : 'user';
    if (role !== (history.length % 2 === 0 ? 'user' : 'model')) throw new Error('Conversation messages must alternate between user and assistant.');
    history.push({ role, parts: [{ text: message.text }] });
  }
  if (history.length % 2 !== 0) throw new Error('Conversation history must end with an assistant response.');
  return { message: data.message.trim(), history, context: String(data.context ?? ''), language: String(data.language ?? 'en-IN'), ...(data.voice===true?{voice:true}:{}) };
}

export const assistantRouter = Router();
assistantRouter.post('/chat', async (req, res) => {
  let input: AssistantRequest;
  try { input = parseAssistantRequest(req.body); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request.' }); return; }
  if (isConversationEnd(input.message,input.language)) { res.json({reply:goodbyes[input.language] || 'Thank you. This conversation has ended.',language:input.language,ended:true,sources:[]}); return; }
  try {
    if (process.env.RAG_SERVER_URL) {
      const response = await fetch(`${process.env.RAG_SERVER_URL.replace(/\/$/, '')}/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.RAG_SERVER_TOKEN ? { Authorization: `Bearer ${process.env.RAG_SERVER_TOKEN}` } : {}) },
        signal: AbortSignal.timeout(60000), body: JSON.stringify({...input,history:input.history.map(m=>({role:m.role==='model'?'assistant':'user',text:m.parts.map(p=>p.text||'').join('')}))}),
      });
      if (!response.ok) throw new Error('RAG service unavailable.');
      const result = await response.json() as { reply?: unknown; sources?: unknown; provider?: unknown; offline?:unknown; retrievalOnly?:unknown; retrievalMode?:unknown };
      if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Invalid RAG response.');
      const sources = Array.isArray(result.sources) ? result.sources.slice(0, 10).filter(source => source && typeof source.title === 'string' && typeof source.url === 'string' && /^https:\/\//i.test(source.url)).map(source => ({ title: source.title.slice(0, 200), url: source.url, retrievedAt: typeof source.retrievedAt === 'string' ? source.retrievedAt : undefined })) : [];
      const provider=typeof result.provider==='string'&&['gemini-rag','local-search','local'].includes(result.provider)?result.provider:'gemini-rag';
      res.json({ reply: result.reply, language: input.language, provider, sources, rag:true, offline:result.offline===true, retrievalOnly:result.retrievalOnly===true, retrievalMode:typeof result.retrievalMode==='string'?result.retrievalMode.slice(0,40):undefined }); return;
    }
    res.json(await answerLegal(input));
  } catch (error) {
    try {
      const local = await queryLocalAssistant(input);
      if (local) { res.json(local); return; }
    } catch { /* Surface one safe, actionable error without endpoint or credential details. */ }
    // SDK error messages can contain request URLs. Keep credentials out of responses and logs.
    const status = Number((error as { status?: number })?.status);
    console.warn(`[ASSISTANT] Provider request failed (${Number.isFinite(status) ? status : 'network/timeout'}).`);
    res.status(status === 429 ? 429 : 503).json({ error: status === 429 ? 'The AI provider is at its usage limit. Please try again later or check the provider quota.' : 'The AI provider is unavailable and no local fallback could answer. Check the server keys and local-model configuration, then try again. For offline mode, keep your question under 1,500 characters.' });
  }
});
