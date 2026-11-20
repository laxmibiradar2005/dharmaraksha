import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ragDatabase,ragTransaction,closeRagDatabase } from '../lib/ragDatabase';
import { vectorLiteral } from '../lib/legalEmbeddings';
import { reciprocalRankFusion, type RankedLaw } from '../lib/postgresRag';

test('rank fusion merges semantic/keyword evidence and avoids duplicate pages',()=>{
  const row=(id:string,page:number):RankedLaw=>({id,page,title:'Act',url:'https://example.gov.in/law.pdf',documentId:'act',text:'law',sha256:'a'.repeat(64),retrievedAt:'2026-11-13',kind:'statute',jurisdiction:'India',issuedAt:null});
  const result=reciprocalRankFusion([row('a',1),row('b',1),row('c',2)],[row('c',2),row('a',1)],6);
  assert.equal(result.length,2);assert.equal(result[0].id,'a');assert.equal(result[1].id,'c');
  assert.throws(()=>vectorLiteral([1,2]));assert.throws(()=>vectorLiteral(Array(384).fill(NaN)));
});
test('real embedded PostgreSQL supports pgvector, full-text search, rollback and persistence',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'legal-vector-test-'));
  const saved={RAG_DATABASE_URL:process.env.RAG_DATABASE_URL,RAG_STORAGE:process.env.RAG_STORAGE,RAG_PGLITE_PATH:process.env.RAG_PGLITE_PATH};
  delete process.env.RAG_DATABASE_URL;process.env.RAG_STORAGE='pglite';process.env.RAG_PGLITE_PATH=path.join(dir,'db');
  try{
    const db=ragDatabase();await db.exec(fs.readFileSync('rag/schema.sql','utf8'));
    await db.query(`INSERT INTO legal_documents(id,title,url,sha256,kind,retrieved_at,embedding_model) VALUES('a','Law','https://example.gov.in/law.pdf',$1,'statute',now(),'fixture')`,['a'.repeat(64)]);
    const x=Array(384).fill(0);x[0]=1;const y=Array(384).fill(0);y[1]=1;
    await db.query(`INSERT INTO legal_chunks(id,document_id,page,ordinal,text,embedding) VALUES('bail','a',1,0,'Bail and arrest safeguards',$1::vector),('rent','a',2,1,'Tenant lease rent',$2::vector)`,[vectorLiteral(x),vectorLiteral(y)]);
    assert.equal((await db.query('SELECT id FROM legal_chunks ORDER BY embedding <=> $1::vector LIMIT 1',[vectorLiteral(x)])).rows[0].id,'bail');
    assert.equal((await db.query("SELECT id FROM legal_chunks WHERE search_text @@ plainto_tsquery('english',$1)",['tenant'])).rows[0].id,'rent');
    await assert.rejects(ragTransaction(async tx=>{await tx.query("DELETE FROM legal_chunks");throw Error('simulate interrupted replacement');}));
    assert.equal((await db.query('SELECT count(*)::int AS count FROM legal_chunks')).rows[0].count,2);
    assert.equal((await db.query("SELECT id FROM legal_documents WHERE id=$1",["'; DROP TABLE legal_chunks; --"])).rows.length,0);
    await closeRagDatabase();
    assert.equal((await ragDatabase().query('SELECT count(*)::int AS count FROM legal_chunks')).rows[0].count,2);
  }finally{
    await closeRagDatabase();for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
