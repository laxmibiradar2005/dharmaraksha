import {speechConfiguration, spokenLanguages} from '../lib/voiceLanguages';
import { Router } from 'express';
import { createHash } from 'node:crypto';
import { aiBudget, BudgetError } from '../lib/aiBudget';

const languages = new Set(spokenLanguages);
export function parseVoiceRequest(body: unknown) {
  const data = body as Record<string, unknown> | null;
  if (!data || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 2500) throw new Error('Speech text must contain 1–2,500 characters.');
  const language = data.language ?? 'en-IN';
  if (typeof language !== 'string' || !languages.has(language)) throw new Error('Unsupported voice language.');
  return { text: data.text.trim(), language };
}

export function createVoiceRouter(fetcher: typeof fetch = fetch) {
  const router = Router();
  const cache = new Map<string, Buffer>(); // Bounded memory only: no private speech text is persisted.
  const inflight = new Map<string, Promise<Buffer>>();
  router.get('/status', (_req, res) => res.json({ languages: spokenLanguages, configured: !!process.env.SARVAM_API_KEY, onlineOnly: true }));
  router.post('/speak', async (req, res) => {
    let input: ReturnType<typeof parseVoiceRequest>;
    try { input = parseVoiceRequest(req.body); } catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    const key = process.env.SARVAM_API_KEY;
    if (!key) { res.status(503).json({ error: 'Voice is not configured. Please contact the kiosk operator.' }); return; }
    try {
      const {model,speaker}=speechConfiguration(input.language);
      const cacheKey = createHash('sha256').update(JSON.stringify([model, speaker || '', input])).digest('hex');
      let audio = cache.get(cacheKey);
      if (!audio) {
        let pending = inflight.get(cacheKey);
        if (!pending) {
          pending = (async () => {
      aiBudget().reserve('sarvam-tts', input.text.length / 1000 * (model === 'bulbul:v3' ? 3 : 1) * 1.18);
      const response = await fetcher('https://api.sarvam.ai/text-to-speech', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'api-subscription-key': key }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ text: input.text, language_code: input.language, model, output_audio_codec: 'wav', ...(speaker ? { speaker } : {}) }),
      });
      if (!response.ok) throw new Error('Sarvam voice is unavailable.');
      const result = await response.json() as { audios?: unknown[] };
      const encoded = result.audios?.[0];
      if (typeof encoded !== 'string' || !encoded || encoded.length > 16_000_000 || !/^[A-Za-z0-9+/=\r\n]+$/.test(encoded)) throw new Error('Invalid provider audio.');
      const resultAudio = Buffer.from(encoded, 'base64');
      // ~20 MB total cap; large private replies are played without retention.
      if (resultAudio.length <= 400000) { if (cache.size >= 50) cache.delete(cache.keys().next().value!); cache.set(cacheKey, resultAudio); }
      return resultAudio;
          })();
          inflight.set(cacheKey, pending);
        }
        try { audio = await pending; } finally { if (inflight.get(cacheKey) === pending) inflight.delete(cacheKey); }
      }
      res.setHeader('Cache-Control', 'no-store');
      res.type('audio/wav').send(audio);
    } catch (error) { res.status(error instanceof BudgetError ? 429 : 503).json({ error: error instanceof BudgetError ? error.message : 'The voice request could not finish. Check the connection and try again.' }); }
  });
  return router;
}
