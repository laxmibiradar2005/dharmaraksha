import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssistantRequest } from '../api/assistant';
import { answerLegal, matchesResponseLanguage } from '../lib/groundedAssistant';
import { formatTelegramReply } from '../bot/telegramChat';
import { readTelegramDocument } from '../lib/documentText';
import type TelegramBot from 'node-telegram-bot-api';

process.env.RAG_ENABLED='true';

test('Kannada document question uses supplied facts without a law lookup',async()=>{
  const result=await answerLegal(parseAssistantRequest({message:'Summarize this document',context:'[Page 1] Payment is due on 21 May.',language:'kn-IN',voice:true}),{
    retrieve:async()=>{throw Error('Document summary should not search law');},
    generate:async input=>{assert.match(input.system,/Kannada/);assert.match(input.prompt,/21 May/);return 'ಪಾವತಿಯ ಗಡುವು ಮೇ 21.';},
  });
  assert.deepEqual(result.sources,[]);
  assert.match(result.reply,/21/);
});

test('consumer and contract specialists both contribute before final synthesis',async()=>{
  const events:string[]=[];
  const result=await answerLegal(parseAssistantRequest({message:'The supplier breached our agreement and refused a refund.'}),{
    retrieve:async()=>({mode:'hybrid',sources:[{id:'consumer-1',title:'Consumer law',url:'https://example.org/act',page:4,text:'Supporting excerpt',sha256:'test',retrievedAt:'2026-01-01'}]}),
    progress:(agent,state)=>events.push(agent.id+':'+state),
    generate:async input=>{
      if(input.system.startsWith('Classify'))return JSON.stringify({documentOnly:false,agents:['consumer_law_agent','corporate_law_agent']});
      if(input.system.startsWith('Review'))return 'Review notes [S1]';
      assert.match(input.prompt,/Review notes \[S1\]/);
      return 'Here are your options. [S1]';
    },
  });
  for(const id of ['consumer_law_agent','corporate_law_agent'])assert.ok(events.indexOf(id+':complete')<events.indexOf('supreme_judge:start')&&events.includes(id+':complete'));
  assert.equal(result.sources.length,1);
});

test('Telegram escapes HTML and retains only HTTPS source links',()=>{
  const messages=formatTelegramReply('## Guidance\n- A & <B>',[{title:'A < B',url:'https://example.org/a?x=1&y=2'},{title:'Unsafe',url:'javascript:alert(1)'}],'en-IN');
  assert.match(messages[0],/• A &amp; &lt;B&gt;/);
  assert.match(messages[1],/x=1&amp;y=2/);
  assert.doesNotMatch(messages[1],/javascript/);
});

test('Telegram attachment ingestion extracts and preserves UTF-8 text',async()=>{
  const bot={getFileLink:async()=> 'data:text/plain;charset=utf-8,'+encodeURIComponent('ದಾಖಲೆ 2026')} as unknown as TelegramBot;
  const message={document:{file_id:'test',file_name:'case.txt'}} as TelegramBot.Message;
  assert.deepEqual(await readTelegramDocument(bot,message),{name:'case.txt',text:'ದಾಖಲೆ 2026'});
});


test('wrong-script answers are translated once and preserve page references',async()=>{
  let calls=0;
  const result=await answerLegal(parseAssistantRequest({message:'What is the deadline?',context:'[Page 2] Due on 21 May.',language:'kn-IN'}),{
    generate:async input=>{calls++;if(calls===1)return 'Payment is due on 21 May. [Page 2]';assert.match(input.system,/Translate/);return JSON.stringify({answer:'ಪಾವತಿಯ ಗಡುವು ಮೇ 21. [Page 2]'});},
  });
  assert.equal(calls,2);assert.match(result.reply,/ಪಾವತಿಯ/);assert.match(result.reply,/\[Page 2\]/);assert.ok(!result.reply.includes('{'));
});
test('persistent language mismatch returns a localized fallback, never the incorrect script',async()=>{
  const result=await answerLegal(parseAssistantRequest({message:'What is the deadline?',context:'[Page 2] Due on 21 May.',language:'kn-IN'}),{generate:async()=> 'Payment is due on 21 May.'});
  assert.equal(result.retrievalOnly,true);assert.ok(matchesResponseLanguage(result.reply,'kn-IN'));
  assert.equal(matchesResponseLanguage('ငွေပေးချေမှုကို 2027 ခုနှစ် မေလ','kn-IN'),false);
  assert.equal(matchesResponseLanguage('பணம் செலுத்த வேண்டும். [Page 2]','ta-IN'),true);
});

test('non-English follow-up routes specialists using prior context before final review',async()=>{
 const events:string[]=[];
 await answerLegal(parseAssistantRequest({message:'ಮುಂದೆ ಏನು ಮಾಡಬೇಕು?',language:'kn-IN',history:[{role:'user',text:'My landlord is evicting me.'},{role:'assistant',text:'Please share the notice.'}]}),{
  retrieve:async()=>({mode:'hybrid',sources:[{id:'p1',title:'Property law',url:'https://example.org/property',page:2,text:'Supporting excerpt',sha256:'test',retrievedAt:'2026-01-01'}]}),
  progress:(agent,state)=>events.push(agent.id+':'+state),
  generate:async input=>{if(input.system.startsWith('Classify')){assert.match(input.prompt,/landlord/);return JSON.stringify({documentOnly:false,agents:['property_law_agent']})}return 'ನೋಟಿಸ್ ಪರಿಶೀಲಿಸಿ. [S1]'},
 });
 for(const id of ['data_verifier','property_law_agent','fact_checker','defense_counsel']){assert.ok(events.includes(id+':complete'));assert.ok(events.indexOf(id+':complete')<events.indexOf('supreme_judge:start'))}
});

test('classification outage retains deterministic specialist routing',async()=>{
 const events:string[]=[];
 await answerLegal(parseAssistantRequest({message:'My landlord sent an eviction notice.'}),{
 retrieve:async()=>({mode:'hybrid',sources:[{id:'p1',title:'Property law',url:'https://example.org/property',page:2,text:'Supporting excerpt',sha256:'test',retrievedAt:'2026-01-01'}]}),
 progress:(agent,state)=>events.push(agent.id+':'+state),
 generate:async input=>{if(input.system.startsWith('Classify'))throw Error('Temporary outage');return 'Check the notice. [S1]'},
 });
 assert.ok(events.includes('property_law_agent:complete'));assert.ok(events.includes('supreme_judge:complete'));
});
