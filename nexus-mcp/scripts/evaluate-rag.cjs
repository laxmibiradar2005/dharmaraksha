require('dotenv').config();
const fs=require('fs');
(async()=>{
 const base=process.env.RAG_SERVER_URL||'http://127.0.0.1:3002';
 const cases=JSON.parse(fs.readFileSync('rag/evaluation.json','utf8'));const results=[];
 for(const item of cases){
  const response=await fetch(base+'/search?q='+encodeURIComponent(item.q),{headers:{Authorization:'Bearer '+process.env.RAG_SERVER_TOKEN},signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Search test failed with HTTP '+response.status);
  const data=await response.json();const ids=data.sources.map(s=>s.documentId||s.id.replace(/-\d+-\d+$/,''));
  const pass=item.expected.some(id=>ids.includes(id));results.push({query:item.q,pass,mode:data.mode,documents:ids});console.log(JSON.stringify(results.at(-1)));
 }
 fs.writeFileSync('data/legal/retrieval-evaluation.json',JSON.stringify({testedAt:new Date().toISOString(),passed:results.filter(x=>x.pass).length,total:results.length,results},null,2));
 if(results.some(x=>!x.pass))process.exitCode=1;
})().catch(()=>{console.error('RAG evaluation could not finish. Check the running service and private token.');process.exitCode=1;});
