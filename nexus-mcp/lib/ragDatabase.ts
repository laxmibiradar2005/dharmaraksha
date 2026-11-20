import type { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface RagConnection { query(sql:string,params?:unknown[]):Promise<{rows:any[]}>; exec(sql:string):Promise<unknown> }
let pool:Pool|undefined, embedded:Promise<any>|undefined;
let lockFile='',lockValue='';
export const vectorEnabled=()=>!!process.env.RAG_DATABASE_URL || process.env.RAG_STORAGE==='pglite';
export const vectorBackend=()=>process.env.RAG_DATABASE_URL?'postgres-pgvector':'pglite-pgvector';
function releaseLock(){if(lockFile&&fs.existsSync(lockFile)&&fs.readFileSync(lockFile,'utf8')===lockValue)fs.unlinkSync(lockFile);lockFile='';}
async function localDatabase(){
  if(!embedded) embedded=(async()=>{
    const dir=path.resolve(process.env.RAG_PGLITE_PATH||'data/legal-postgres');fs.mkdirSync(dir,{recursive:true});
    lockFile=dir+'.lock';
    if(fs.existsSync(lockFile)){
      const old=JSON.parse(fs.readFileSync(lockFile,'utf8'));
      let alive=true;try{process.kill(old.pid,0);}catch(e){alive=(e as NodeJS.ErrnoException).code!=='ESRCH';}
      if(alive)throw Error('Another process owns the legal database. Stop the RAG server before indexing.');
      fs.unlinkSync(lockFile);
    }
    lockValue=JSON.stringify({pid:process.pid,id:randomUUID()});fs.writeFileSync(lockFile,lockValue,{flag:'wx'});
    process.once('exit',releaseLock);
    const {PGlite}=await new Function('return import("@electric-sql/pglite")')();
    const {vector}=await new Function('return import("@electric-sql/pglite-pgvector")')();
    return new PGlite(dir,{extensions:{vector}});
  })().catch(e=>{releaseLock();embedded=undefined;throw e;});
  return embedded;
}
function postgres(){
  if(!pool){const {Pool:PostgresPool}=require('pg') as typeof import('pg');pool=new PostgresPool({connectionString:process.env.RAG_DATABASE_URL,max:3,connectionTimeoutMillis:4000,statement_timeout:12000,idleTimeoutMillis:10000});pool.on('error',()=>console.warn('[RAG] Idle database connection lost.'));}
  return pool;
}
export function ragDatabase():RagConnection{
  if(process.env.RAG_DATABASE_URL){const db=postgres();return {query:(sql,params)=>db.query(sql,params),exec:sql=>db.query(sql)};}
  if(process.env.RAG_STORAGE!=='pglite')throw Error('Configure PostgreSQL or RAG_STORAGE=pglite');
  return {query:async(sql,params)=>(await localDatabase()).query(sql,params),exec:async sql=>(await localDatabase()).exec(sql)};
}
export async function ragTransaction<T>(work:(db:RagConnection)=>Promise<T>):Promise<T>{
  if(!process.env.RAG_DATABASE_URL)return (await localDatabase()).transaction((tx:any)=>work(tx));
  const client=await postgres().connect();
  try{await client.query('BEGIN');const value=await work({query:(s,p)=>client.query(s,p),exec:s=>client.query(s)});await client.query('COMMIT');return value;}
  catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function closeRagDatabase(){
  const oldPool=pool;pool=undefined;await oldPool?.end();
  const oldEmbedded=embedded;embedded=undefined;if(oldEmbedded){try{await (await oldEmbedded).close();}finally{releaseLock();}}
}
