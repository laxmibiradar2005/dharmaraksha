import { Router } from 'express';
import { aiBudget } from '../lib/aiBudget';
import { retrieveLaw, retrievalStatus } from '../lib/legalRetrieval';

async function remote(route:string) {
  const base=process.env.RAG_SERVER_URL;if(!base)return null;
  const r=await fetch(base.replace(/\/$/,'')+route,{headers:{Authorization:`Bearer ${process.env.RAG_SERVER_TOKEN||''}`},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('RAG service unavailable');return await r.json() as any;
}
async function status(){try{return await remote('/health')||await retrievalStatus();}catch{return await retrievalStatus();}}
export const ragRouter = Router();
ragRouter.get('/status', async (_req,res) => res.json({ ...await status(), model: process.env.LEGAL_ASSISTANT_MODEL || 'gemini-2.5-flash-lite', economyMode: process.env.ECONOMY_MODE === 'true', budget: aiBudget().status() }));
ragRouter.get('/search', async (req,res) => {
  if (typeof req.query.q !== 'string' || !req.query.q.trim() || req.query.q.length > 600) { res.status(400).json({ error: 'Enter a legal search of 1–600 characters.' }); return; }
  let result;try{result=await remote('/search?q='+encodeURIComponent(req.query.q))||await retrieveLaw(req.query.q);}catch{result=await retrieveLaw(req.query.q);}
  res.json({ sources: result.sources.map((h: {url:string;page:number}) => ({ ...h, url: `${h.url}#page=${h.page}` })), retrievalMode:result.mode, ...await status() });
});

