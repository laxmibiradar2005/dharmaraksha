import 'dotenv/config';
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import {languageRouter} from '../api/languages';
import { parseAssistantRequest } from '../api/assistant';
import { answerLegal } from '../lib/groundedAssistant';
import { embedTexts } from '../lib/legalEmbeddings';
import { retrievalStatus, retrieveLaw } from '../lib/legalRetrieval';
import { closeRagDatabase } from '../lib/ragDatabase';

async function main(){
  const token=process.env.RAG_SERVER_TOKEN;
  if(!token||token.length<32)throw Error('Set a private RAG_SERVER_TOKEN of at least 32 characters.');
  process.env.RAG_ENABLED='true';if(!process.env.RAG_DATABASE_URL)process.env.RAG_STORAGE='pglite';
  const status=await retrievalStatus();if(!status.ready||'degraded' in status)throw Error('Build the vector database before starting the RAG server.');
  await embedTexts(['Indian legal research']);
  const app=express();app.use(express.json({limit:'192kb'}));app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  app.get('/health',async(_req,res)=>{const status=await retrievalStatus();res.status(status.ready?200:503).json(status);});
  app.use((req,res,next)=>{const incoming=req.get('Authorization')||'';const expected=`Bearer ${token}`;
    if(Buffer.byteLength(incoming)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(incoming),Buffer.from(expected))){res.status(401).json({error:'RAG authentication required.'});return;}next();});
  app.use('/languages',languageRouter);
  app.post('/query',async(req,res)=>{
    let input;try{input=parseAssistantRequest(req.body);}catch{res.status(400).json({error:'Invalid legal question or conversation.'});return;}
    try{res.json(await answerLegal(input));}catch{res.status(503).json({error:'The legal research service is unavailable. No verified answer was generated.'});}
  });
  app.get('/search',async(req,res)=>{if(typeof req.query.q!=='string'||!req.query.q.trim()||req.query.q.length>600){res.status(400).json({error:'Enter 1–600 characters.'});return;}try{res.json(await retrieveLaw(req.query.q));}catch{res.status(503).json({error:'Search unavailable.'});}});
  const server=app.listen(Number(process.env.RAG_PORT||3002),process.env.RAG_HOST||'0.0.0.0',()=>console.log('Dharmaraksha public-law RAG service is ready.'));
  for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(async()=>{await closeRagDatabase();process.exit(0);}));
}
main().catch(async e=>{console.error(e instanceof Error?e.message:'RAG startup failed');await closeRagDatabase();process.exitCode=1;});
