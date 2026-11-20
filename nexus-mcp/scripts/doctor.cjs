// Read-only deployment checks. Never prints secrets or invokes paid models.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'); process.chdir(root);
require('dotenv').config({ quiet: true });
let failures = 0;
function check(name, ok) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; }
check('Node.js 22+', Number(process.versions.node.split('.')[0]) >= 22);
for (const file of ['dist/server.js','dashboard/index.html','.env','serviceAccountKey.json','data/legal/index.sqlite']) check(file, fs.existsSync(file));
for (const name of ['GEMINI_API_KEY','SARVAM_API_KEY','FIREBASE_DATABASE_URL','FIREBASE_STORAGE_BUCKET']) check(`${name} present (not a live credential check)`, !!process.env[name]);
check('Economy mode', process.env.ECONOMY_MODE === 'true');
check('Local RAG enabled', process.env.RAG_ENABLED === 'true');
check('Outbound integrations disabled', process.env.DISABLE_OUTBOUND_INTEGRATIONS === 'true');
try { const DB = require('better-sqlite3'); const db = new DB('data/legal/index.sqlite',{readonly:true}); check('Legal index integrity', db.pragma('integrity_check',{simple:true}) === 'ok'); console.log(db.prepare('SELECT COUNT(*) AS chunks,COUNT(DISTINCT url) AS documents FROM chunks').get()); db.close(); } catch { check('Native SQLite and legal index readable',false); }
console.log('Hardware, RFID login, encryption, provider quotas and model quality require separate acceptance tests.');
process.exitCode = failures ? 1 : 0;
