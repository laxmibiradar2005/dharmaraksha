import { aiBudget } from './aiBudget';

export interface GeminiInput { system: string; prompt: string; history?: { role: string; parts: { text?: string }[] }[]; image?: string; imageMime?: string; outputTokens?: number; maxInputChars?: 60000 }
// Explicit allowlist avoids a configuration typo silently selecting a costly model.
export async function budgetGemini(input: GeminiInput, fetcher: typeof fetch = fetch) {
  const model = process.env.LEGAL_ASSISTANT_MODEL || 'gemini-2.5-flash-lite';
  if (model !== 'gemini-2.5-flash-lite') throw new Error('Economy mode requires the reviewed Flash-Lite model.');
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
  const maxOutputTokens = input.outputTokens === 8192 ? 8192 : input.outputTokens === 2048 ? 2048 : 768;
  const history = (input.history || []).slice(-8).map(m => ({ role: m.role, parts: [{ text: m.parts.map(p => p.text || '').join('').slice(0, 2000) }] }));
  const maxInputChars=input.maxInputChars===60000?60000:18000;
  const parts: Record<string, unknown>[] = [{ text: input.prompt.slice(0, maxInputChars) }];
  if (input.image) {
    if (input.image.length > 6_000_000 || !/^[A-Za-z0-9+/=\r\n]+$/.test(input.image)) throw new Error('Choose a smaller JPEG image.');
    parts.push({ inlineData: { data: input.image, mimeType: input.imageMime || 'image/jpeg' } });
  }
  const contents = [...history, { role: 'user', parts }];
  // Bytes deliberately overestimate text tokens. Reserve 10k image tokens and ₹100/USD + GST buffer.
  const inputBound = Buffer.byteLength(JSON.stringify({ system: input.system, history, prompt: input.prompt.slice(0, maxInputChars) })) + (input.image ? 10000 : 0) + 500;
  aiBudget().reserve('gemini', (inputBound * .10 + maxOutputTokens * .40) / 1_000_000 * 100 * 1.18);
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: input.system }] }, contents, generationConfig: { temperature: .15, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } } }),
  });
  if (!response.ok) throw new Error(`Gemini request unavailable (HTTP ${response.status}).`);
  const result = await response.json() as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
  const text = result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no answer.');
  return result.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? text+'\n[truncated]' : text;
}
