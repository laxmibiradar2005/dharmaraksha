// Public statutes only. No user documents or paid API calls enter this index.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { PDFParse } = require('pdf-parse');
const Database = require('better-sqlite3');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'data/legal');
const catalogArg = process.argv.indexOf('--catalog');
let sources = JSON.parse(fs.readFileSync(catalogArg >= 0 ? path.resolve(process.argv[catalogArg + 1]) : path.join(root, 'rag/sources.json'), 'utf8'));
const only = process.argv.indexOf('--only'); if (only >= 0) sources = sources.filter(s => s.id === process.argv[only+1]);
for (const source of sources) if (!/^[a-z0-9][a-z0-9-]{0,70}$/.test(source.id) || typeof source.verify !== 'string' || !source.verify.trim() || !Array.isArray(source.urls) || !source.urls.length) throw Error('Invalid source catalog entry');
fs.mkdirSync(path.join(dir, 'pdfs'), { recursive: true });
const metadataPath = path.join(dir, 'manifest.json');
const previous = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath, 'utf8')).documents : [];
const official = raw => { const u = new URL(raw); return u.protocol === 'https:' && /(?:\.gov\.in|\.nic\.in)$/.test(u.hostname); };
async function obtain(source) {
  const file = path.join(dir, 'pdfs', source.id + '.pdf');
  let buffer, url, downloadedAt;
  if (source.file) {
    const inbox = fs.realpathSync(path.join(root, 'rag/inbox'));
    const local = fs.realpathSync(path.resolve(inbox, source.file));
    if (!local.startsWith(inbox + path.sep) || !official(source.urls[0])) throw Error('Local files must be inside rag/inbox and cite an official HTTPS source.');
    buffer = fs.readFileSync(local); if (buffer.length > 30_000_000 || buffer.subarray(0,5).toString() !== '%PDF-') throw Error('Invalid or oversized PDF');
    url=source.urls[0]; downloadedAt=new Date().toISOString();
  } else if (fs.existsSync(file) && !process.argv.includes('--refresh')) {
    buffer = fs.readFileSync(file); const old = previous.find(d => d.id === source.id);
    url = old?.url || source.urls[0]; downloadedAt = old?.downloadedAt || new Date().toISOString();
  } else {
    for (const candidate of source.urls) {
      if (!official(candidate)) throw new Error('Non-government source rejected');
      try {
        const response = await fetch(candidate, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Dharmaraksha-LegalLibrary/1.0' } });
        if (!official(response.url) || !response.ok) continue;
        if (Number(response.headers.get('content-length')) > 30_000_000) continue;
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length > 30_000_000 || data.subarray(0, 5).toString() !== '%PDF-') continue;
        buffer = data; url = response.url; downloadedAt = new Date().toISOString(); break;
      } catch { /* Try the next documented official mirror; retain older verified data on failure. */ }
    }
  }
  if (!buffer) throw new Error('Official download unavailable');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (source.id === "bnss" && /as introduced|clauses|Bill No\./i.test(result.pages.slice(0,3).map(p=>p.text).join(" "))) throw new Error("Draft Bill rejected; enacted Act required");
    const normalize = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalize(result.text).includes(normalize(source.verify)) || result.text.length < 200) throw new Error('PDF title/text validation failed');
    fs.writeFileSync(file, buffer);
    const record = { id: source.id, title: source.title, kind: source.kind || (source.id.includes('commencement') ? 'notification' : 'statute'), jurisdiction: source.jurisdiction || 'India', issuedAt: source.issuedAt || null, url, downloadedAt, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length, pages: result.total, snapshot: true };
    console.log(`${source.id}: verified ${result.total} pages`);
    return { record, pages: result.pages };
  } finally { await parser.destroy(); }
}
(async () => {
  const documents = [], failures = [], results = [];
  // Bound public downloads and PDF parsing to protect small machines.
  for (let i = 0; i < sources.length; i += 3) {
    const batch = await Promise.allSettled(sources.slice(i, i + 3).map(obtain));
    batch.forEach((result, j) => { if (result.status === 'fulfilled') results.push(result.value); else { failures.push({ id: sources[i + j].id, reason: result.reason.message }); console.log(`${sources[i + j].id}: ${result.reason.message}`); } });
  }
  if (!results.length) throw new Error('No verified documents; existing index was preserved.');
  const db = new Database(path.join(dir, 'index.sqlite')); db.pragma('journal_mode=WAL'); db.pragma('busy_timeout=5000');
  db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(id UNINDEXED,title,url UNINDEXED,page UNINDEXED,text,retrievedAt UNINDEXED,sha256 UNINDEXED, tokenize="unicode61")');
  const insert = db.prepare('INSERT INTO chunks VALUES (?,?,?,?,?,?,?)');
  let chunks = 0;
  db.transaction(() => {
    for (const { record, pages } of results) {
      db.prepare('DELETE FROM chunks WHERE id GLOB ?').run(record.id + '-[0-9]*');
      for (const page of pages) {
        const text = page.text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
        // Exclude tables of contents, which list headings without operative provisions.
        if (/ARRANGEMENT OF SECTIONS|\bCONTENTS\b|\bContents\b/.test(text.slice(0, 200)) || text.length < 100) continue;
        for (let start = 0, part = 0; start < text.length; start += 1050, part++) {
          const chunk = text.slice(start, start + 1300); if (chunk.length < 80) continue;
          insert.run(`${record.id}-${page.num}-${part}`, record.title, record.url, page.num, chunk, record.downloadedAt, record.sha256); chunks++;
        }
      }
      documents.push(record);
    }
  })();
  // Preserve prior manifest rows for sources unavailable during a refresh.
  for (const old of previous) if (!documents.some(d => d.id === old.id)) documents.push(old);
  const count = db.prepare('SELECT COUNT(*) AS chunks,COUNT(DISTINCT url) AS documents FROM chunks').get(); db.close();
  fs.writeFileSync(metadataPath, JSON.stringify({ generatedAt: new Date().toISOString(), coverage: 'Selected official central-law snapshots; not exhaustive or guaranteed current', ...count, documents, failures }, null, 2));
  console.log(JSON.stringify({ ...count, updatedChunks: chunks, unavailable: failures.length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
