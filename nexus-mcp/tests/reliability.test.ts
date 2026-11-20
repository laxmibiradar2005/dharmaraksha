import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { BudgetLedger } from '../lib/aiBudget';
import { createVoiceRouter } from '../api/voice';
process.env.AI_BUDGET_DB = ':memory:';

test('optional Composio integration does not prevent startup without its key', () => {
  const result = spawnSync(process.execPath, ['-e', "require('dotenv').config(); process.env.COMPOSIO_API_KEY=''; require('./dist/lib/composioTools')"], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
});

test('budget survives restart and enforces independent daily and total caps',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dharmaraksha-budget-'));
  const file=path.join(dir,'test.sqlite'); let ledger=new BudgetLedger(file);
  try {
    ledger.reserve('test',2,'test',5,3,new Date('2026-11-13T10:00:00Z')); ledger.close(); ledger=new BudgetLedger(file);
    assert.throws(()=>ledger.reserve('test',2,'test',5,3,new Date('2026-11-13T10:02:00Z')));
    ledger.reserve('test',2,'test',5,3,new Date('2026-11-14T10:00:00Z'));
    assert.throws(()=>ledger.reserve('test',2,'test',5,3,new Date('2026-11-15T10:00:00Z')));
  } finally { ledger.close(); for(const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir,name)); fs.rmdirSync(dir); }
});

test('simultaneous identical speech requests share one billed call; failures do not poison cache',async()=>{
  const previous=process.env.SARVAM_API_KEY; process.env.SARVAM_API_KEY='test-only';
  let calls=0; let fail=true;
  const app=express(); app.use(express.json()); app.use(createVoiceRouter((async()=>{
    calls++; await new Promise(r=>setTimeout(r,25));
    return fail ? new Response('{}',{status:503}) : new Response(JSON.stringify({audios:[Buffer.from('RIFFmock').toString('base64')]}));
  }) as typeof fetch));
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  const request=()=>fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/speak`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Reliability test'})});
  try {
    assert.equal((await request()).status,503); fail=false;
    const responses=await Promise.all([request(),request(),request()]); assert.ok(responses.every(r=>r.status===200)); assert.equal(calls,2);
    assert.equal((await request()).status,200); assert.equal(calls,2);
  } finally { server.close(); if(previous===undefined) delete process.env.SARVAM_API_KEY; else process.env.SARVAM_API_KEY=previous; }
});
