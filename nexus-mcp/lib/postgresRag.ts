import { relevantSpecialties } from './legalTopics';
import { ragDatabase, vectorBackend } from './ragDatabase';
import type { LawSource } from './legalRag';
import { searchTerms } from './legalRag';
import { embedTexts, EMBEDDING_VERSION, vectorLiteral } from './legalEmbeddings';

export type RankedLaw = LawSource & { documentId: string; kind: string; jurisdiction: string; issuedAt: string | null; similarity?: number };
export function reciprocalRankFusion(lexical: RankedLaw[], semantic: RankedLaw[], limit=6, preferred:string[]=[]): RankedLaw[] {
  const scores = new Map<string, { row: RankedLaw; value: number }>();
  for (const list of [lexical, semantic]) list.forEach((row, rank) => {
    const old = scores.get(row.id); scores.set(row.id, { row: { ...old?.row, ...row }, value: (old?.value || 0) + 1/(60+rank+1) });
  });
  const pages = new Set<string>();
  const weight=(x:{row:RankedLaw;value:number})=>x.value+(preferred.includes(x.row.documentId)?.025:0);
  return [...scores.values()].sort((a,b)=>weight(b)-weight(a)).filter(({row})=>{
    const key=`${row.documentId}:${row.page}`; if(pages.has(key))return false; pages.add(key); return true;
  }).slice(0,Math.max(1,Math.min(limit,8))).map(({row,value})=>({...row,score:value}));
}
const columns = `c.id,d.id AS "documentId",d.title,d.url,c.page,c.text,d.retrieved_at::text AS "retrievedAt",d.sha256,d.kind,d.jurisdiction,d.issued_at::text AS "issuedAt"`;
export async function searchPostgres(query: string, limit=6): Promise<{sources:RankedLaw[];mode:string}> {
  const db=ragDatabase();
  const words=searchTerms(query);
  const topics=relevantSpecialties(query);
  const preferred=[...new Set(topics.flatMap(topic=>topic.docs))];
  const excludeCriminal=topics.length>0&&!topics.some(topic=>topic.id==='criminal_law_agent');
  const excluded=excludeCriminal?['bns','bnss','bsa','pocso','satender-antil-2022','bns-commencement','bnss-commencement']:[];
  const terms=words.map(t=>`'${t.replace(/'/g,'')}'`).join(' | ');
  if(!terms)return {sources:[],mode:'hybrid'};
  const legalAid=/legal aid|legal services|free (?:legal|lawyer)|मुफ्त.*(?:कानून|वकील)|विधिक.*सहायता|ಉಚಿತ.*ಕಾನೂನು|ಕಾನೂನು.*ನೆರವು|இலவச.*சட்ட|சட்ட.*உதவி/i.test(query);
  const exactAct=/\bbnss\b/i.test(query)?'bnss':/\bbns\b/i.test(query)?'bns':/\bbsa\b/i.test(query)?'bsa':legalAid?'legal-aid':null;
  const lexical=(await db.query(`SELECT ${columns} FROM legal_chunks c JOIN legal_documents d ON d.id=c.document_id
    WHERE c.search_text @@ to_tsquery('english',$1) AND d.embedding_model=$2 AND NOT (d.id=ANY($4::text[]))
    ORDER BY (CASE WHEN d.id=$3 THEN 1 ELSE 0 END) DESC,ts_rank_cd(c.search_text,to_tsquery('english',$1)) DESC,c.id LIMIT 80`,[terms,EMBEDDING_VERSION,exactAct,excluded])).rows.filter(row=>{const text=(row.text+' '+row.title).toLocaleLowerCase();return words.filter(w=>text.includes(w)).length>=Math.min(2,words.length);}) as RankedLaw[];
  let semantic:RankedLaw[]=[];let mode='hybrid';
  try {
    const [vector]=await embedTexts([query.slice(0,1800)]);
    semantic=(await db.query(`SELECT ${columns},1-(c.embedding <=> $1::vector) AS similarity
      FROM legal_chunks c JOIN legal_documents d ON d.id=c.document_id WHERE d.embedding_model=$2 AND NOT (d.id=ANY($3::text[]))
      ORDER BY c.embedding <=> $1::vector LIMIT 40`,[vectorLiteral(vector),EMBEDDING_VERSION,excluded])).rows.filter(r=>Number(r.similarity)>=.38) as RankedLaw[];
  } catch { mode='postgres-keyword'; }
  return {sources:reciprocalRankFusion(lexical,semantic,limit,exactAct?[exactAct]:preferred),mode};
}
export async function postgresStatus() {
  const result=await ragDatabase().query(`SELECT count(DISTINCT d.id)::int AS documents,count(c.id)::int AS chunks,max(d.indexed_at) AS "indexedAt"
    FROM legal_documents d LEFT JOIN legal_chunks c ON c.document_id=d.id WHERE d.embedding_model=$1`,[EMBEDDING_VERSION]);
  return {ready:result.rows[0].chunks>0,...result.rows[0],backend:vectorBackend(),embeddingModel:EMBEDDING_VERSION,coverage:'Selected verified public-law snapshots and judgments; not exhaustive. Current validity and later treatment require verification.'};
}
