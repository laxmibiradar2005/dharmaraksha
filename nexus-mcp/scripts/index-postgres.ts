import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { ragDatabase, ragTransaction, closeRagDatabase } from '../lib/ragDatabase';
import { embedTexts, EMBEDDING_VERSION, vectorLiteral } from '../lib/legalEmbeddings';
import { legalIndexPath, type LawSource } from '../lib/legalRag';

async function main(){
  if(!process.env.RAG_DATABASE_URL)process.env.RAG_STORAGE='pglite';
  const db=ragDatabase();await db.exec(fs.readFileSync(path.resolve('rag/schema.sql'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync('data/legal/manifest.json','utf8'));
  const catalog=JSON.parse(fs.readFileSync('rag/sources.json','utf8'));
  const sourceDb=new Database(legalIndexPath(),{readonly:true});let updated=0,inserted=0;
  try{
    for(const doc of manifest.documents){
      const source=catalog.find((s:any)=>s.id===doc.id)||doc;
      if(!source)continue;
      const pdf=fs.readFileSync(path.join('data/legal/pdfs',doc.id+'.pdf'));
      if(crypto.createHash('sha256').update(pdf).digest('hex')!==doc.sha256)throw Error(`PDF checksum mismatch for ${doc.id}`);
      const old=await db.query('SELECT sha256,embedding_model FROM legal_documents WHERE id=$1',[doc.id]);
      if(old.rows[0]?.sha256===doc.sha256&&old.rows[0]?.embedding_model===EMBEDDING_VERSION){console.log(`${doc.id}: already indexed`);continue;}
      const chunks=sourceDb.prepare('SELECT * FROM chunks WHERE sha256=? AND url=? ORDER BY CAST(page AS INTEGER),id').all(doc.sha256,doc.url) as LawSource[];
      if(!chunks.length)throw Error(`No readable passages for ${doc.id}`);
      const vectors:number[][]=[];
      for(let offset=0;offset<chunks.length;offset+=8){
        vectors.push(...await embedTexts(chunks.slice(offset,offset+8).map(c=>`${doc.title.slice(0,180)}\n${c.text.slice(0,1500)}`)));
        if(offset%80===0)console.log(`${doc.id}: embedded ${Math.min(offset+8,chunks.length)}/${chunks.length}`);
      }
      // A complete document replaces its previous version atomically; failed embedding leaves old data intact.
      await ragTransaction(async tx=>{
        await tx.query(`INSERT INTO legal_documents(id,title,url,sha256,kind,jurisdiction,issued_at,retrieved_at,embedding_model)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,url=EXCLUDED.url,sha256=EXCLUDED.sha256,
          kind=EXCLUDED.kind,jurisdiction=EXCLUDED.jurisdiction,issued_at=EXCLUDED.issued_at,retrieved_at=EXCLUDED.retrieved_at,
          embedding_model=EXCLUDED.embedding_model,indexed_at=now()`,[doc.id,doc.title,doc.url,doc.sha256,source.kind||(doc.id.includes('commencement')?'notification':'statute'),source.jurisdiction||'India',source.issuedAt||null,doc.downloadedAt,EMBEDDING_VERSION]);
        await tx.query('DELETE FROM legal_chunks WHERE document_id=$1',[doc.id]);
        for(let i=0;i<chunks.length;i++){
          const c=chunks[i];await tx.query('INSERT INTO legal_chunks(id,document_id,page,ordinal,text,embedding) VALUES($1,$2,$3,$4,$5,$6::vector)',[c.id,doc.id,Number(c.page),i,c.text,vectorLiteral(vectors[i])]);
        }
      });
      updated++;inserted+=chunks.length;console.log(`${doc.id}: committed ${chunks.length} passages`);
    }
    await db.query('INSERT INTO legal_ingestions(documents,chunks,embedding_model) VALUES($1,$2,$3)',[updated,inserted,EMBEDDING_VERSION]);
    console.log(JSON.stringify({updatedDocuments:updated,updatedChunks:inserted}));
  }finally{sourceDb.close();await closeRagDatabase();}
}
main().catch(async e=>{console.error(e instanceof Error?e.message:'Indexing failed');await closeRagDatabase();process.exitCode=1;});
