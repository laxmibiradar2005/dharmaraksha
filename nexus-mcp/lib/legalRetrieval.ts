import { searchLaws, legalStatus } from './legalRag';
import { searchPostgres, postgresStatus } from './postgresRag';
import { vectorEnabled } from './ragDatabase';

export async function retrieveLaw(query:string,limit=6) {
  if(vectorEnabled()) {
    try { return await searchPostgres(query,limit); }
    catch { return {sources:searchLaws(query,limit),mode:'sqlite-fallback',degraded:true}; }
  }
  return {sources:searchLaws(query,limit),mode:'sqlite-keyword'};
}
export async function retrievalStatus() {
  if(vectorEnabled()) {
    try { return await postgresStatus(); }
    catch { return {...legalStatus(),backend:'sqlite-fallback',degraded:true,warning:'PostgreSQL unavailable; local keyword snapshot is being used.'}; }
  }
  return {...legalStatus(),backend:'sqlite-keyword'};
}
