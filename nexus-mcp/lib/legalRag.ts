import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export interface LawSource { id: string; title: string; url: string; page: number; text: string; retrievedAt: string; sha256: string; score?: number }
export const legalIndexPath = () => process.env.RAG_INDEX_PATH || path.join(process.cwd(), 'data/legal/index.sqlite');
const stop = new Set('a an the is are was were am i me my we our you your to for of and or in on at by with can could should would what when where why how please tell explain about under india indian law legal section act help have has do does get need'.split(' '));
const expansions: [RegExp, string][] = [
  [/bail|जमानत|ಜಾಮೀನು|ஜாமீன்/i, 'bail bond arrest'], [/police|fir|पुलिस|ಪೊಲೀಸ್|காவல்/i, 'police information cognizable complaint'],
  [/tenant|rent|landlord|किराय|ಬಾಡಿಗೆ|வாடகை/i, 'lease lessor lessee notice'], [/contract|agreement|अनुबंध|ಒಪ್ಪಂದ|ஒப்பந்த/i, 'contract agreement consent void'],
  [/consumer|refund|defective|उपभोक्ता|ಗ್ರಾಹಕ|நுகர்வோர்/i, 'consumer defect complaint goods'], [/domestic|violence|घरेलू|ಹಿಂಸೆ|வன்முறை/i, 'domestic violence protection residence'],
  [/divorce|marriage|ವಿಚ್ಛೇದನ|ವಿವಾಹ ವಿಚ್ಛೇದನ|விவாகரத்து|तलाक|ವಿವಾಹ|திருமண/i, 'marriage divorce maintenance'], [/legal aid|free lawyer|मुफ्त|ಉಚಿತ|இலவச/i, 'legal services entitled persons'],
  [/rights|संविधान|ಸಂವಿಧಾನ|அரசியலமைப்பு/i, 'constitution equality liberty'], [/cyber|online fraud|साइबर|ಸೈಬರ್/i, 'computer identity cheating electronic'],
];
export function searchTerms(query: string) {
  const expanded = query + ' ' + expansions.filter(([re]) => re.test(query)).map(([, words]) => words).join(' ');
  return [...new Set((expanded.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter(t => !stop.has(t) && t.length > 1))].slice(0, 24);
}
export function searchLaws(query: string, limit = 5, filename = legalIndexPath()): LawSource[] {
  if (!fs.existsSync(filename)) return [];
  const terms = searchTerms(query); if (!terms.length) return [];
  const db = new Database(filename, { readonly: true });
  try {
    const match = terms.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
    const rows = db.prepare('SELECT id,title,url,page,text,retrievedAt,sha256,bm25(chunks,0,4,0,0,1,0,0) AS score FROM chunks WHERE chunks MATCH ? ORDER BY score LIMIT 60').all(match) as LawSource[];
    const section = query.match(/(?:section|धारा|ಸೆಕ್ಷನ್|பிரிவு)\s*(\d+[a-z]?)/i)?.[1];
    const act = /\bbnss\b|nagarik/i.test(query) ? 'bnss' : /\bbns\b|nyaya/i.test(query) ? 'bns' : /\bbsa\b|sakshya/i.test(query) ? 'bsa' : '';
    const ranked = rows.map(row => ({ ...row, rank: -(row.score || 0) + terms.filter(t => row.text.toLowerCase().includes(t)).length * .15 + (act && row.id.startsWith(act + '-') ? 8 : 0) + (section && new RegExp(`(?:^|\\n)\\s*${section}\\.`,'i').test(row.text) ? 12 : 0) })).sort((a,b) => b.rank - a.rank);
    const seen = new Set<string>();
    return ranked.filter(row => { const key = row.url + ':' + row.page; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, Math.min(limit, 6));
  } finally { db.close(); }
}
export function legalStatus() {
  const filename = legalIndexPath(); if (!fs.existsSync(filename)) return { ready: false, documents: 0, chunks: 0 };
  const db = new Database(filename, { readonly: true });
  try { return { ready: true, ...(db.prepare('SELECT COUNT(*) AS chunks, COUNT(DISTINCT url) AS documents, MAX(retrievedAt) AS indexedAt FROM chunks').get() as object), coverage: 'Selected central-law snapshots. Not all Indian law, amendments, state rules or judgments.' }; } finally { db.close(); }
}
