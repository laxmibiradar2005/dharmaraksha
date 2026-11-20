import TelegramBot from 'node-telegram-bot-api';
import { randomUUID } from 'node:crypto';
import { broadcast } from '../lib/websocket';
import { createSession, updateSession, addEvent, setAgentOutput } from '../lib/sessionStore';
import { parseAssistantRequest } from '../api/assistant';
import { answerLegal } from '../lib/groundedAssistant';
import { detectLanguage } from '../lib/legalTopics';
import { readTelegramDocument } from '../lib/documentText';
import { retrieveLaw } from '../lib/legalRetrieval';

type Conversation = {language:string; document?:{name:string;text:string}; history:{role:string;text:string}[]};
const conversations = new Map<number, Conversation>();
const busy = new Set<number>();
const escape = (text:string) => text.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

const copy:Record<string,{answer:string;sources:string;review:string;failed:string}> = {
  'en-IN':{answer:'Dharmaraksha',sources:'Sources',review:'Summarize this document and identify key dates, parties, amounts and obligations.',failed:'I could not finish this request. Please retry or send a clearer copy.'},
  'hi-IN':{answer:'धर्मरक्षा',sources:'स्रोत',review:'इस दस्तावेज़ का सारांश दें और मुख्य तारीखें, पक्ष, रकम और दायित्व बताएं।',failed:'अनुरोध पूरा नहीं हो सका। फिर कोशिश करें या स्पष्ट प्रति भेजें।'},
  'kn-IN':{answer:'ಧರ್ಮರಕ್ಷಾ',sources:'ಮೂಲಗಳು',review:'ಈ ದಾಖಲೆಯ ಸಾರಾಂಶ ನೀಡಿ. ಮುಖ್ಯ ದಿನಾಂಕಗಳು, ಪಕ್ಷಗಳು, ಮೊತ್ತಗಳು ಮತ್ತು ಹೊಣೆಗಾರಿಕೆಗಳನ್ನು ತಿಳಿಸಿ.',failed:'ವಿನಂತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಸ್ಪಷ್ಟ ಪ್ರತಿಯನ್ನು ಕಳುಹಿಸಿ.'},
  'ta-IN':{answer:'தர்மரக்ஷா',sources:'ஆதாரங்கள்',review:'இந்த ஆவணத்தைச் சுருக்கி முக்கிய தேதிகள், தரப்பினர், தொகைகள் மற்றும் கடமைகளைக் குறிப்பிடுங்கள்.',failed:'கோரிக்கையை முடிக்க முடியவில்லை. மீண்டும் முயலுங்கள் அல்லது தெளிவான நகலை அனுப்புங்கள்.'},
};

export function formatTelegramReply(reply:string, sources:{title:string;url:string}[], language:string) {
  const labels=copy[language] || copy['en-IN'];
  const clean=reply.replace(/^#{1,6}\s+/gm,'').replace(/^\s*[-*]\s+/gm,'• ').replace(/\*\*([^*]+)\*\*/g,'$1');
  const parts:string[]=[];
  // Split before escaping so no chunk contains a partial HTML entity or emoji.
  let part='';
  for(const char of clean){
    if(part.length+char.length>3400){parts.push(part);part='';}
    part+=char;
  }
  if(part)parts.push(part);
  const messages=parts.map((chunk,i)=>(i===0?`<b>${labels.answer}</b>\n\n`:'')+escape(chunk));
  const links=sources.filter(source=>/^https:\/\//i.test(source.url)).slice(0,6).map(source=>`• <a href="${escape(source.url)}">${escape(source.title)}</a>`);
  if(links.length)messages.push(`<b>${labels.sources}</b>\n${links.join('\n')}`);
  return messages;
}

async function searchForTelegram(query:string):ReturnType<typeof retrieveLaw> {
  const url=process.env.RAG_SERVER_URL;
  if(!url)return retrieveLaw(query);
  const response=await fetch(`${url.replace(/\/$/,'')}/search?q=${encodeURIComponent(query.slice(0,600))}`,{
    headers:process.env.RAG_SERVER_TOKEN?{Authorization:`Bearer ${process.env.RAG_SERVER_TOKEN}`}:{},
    signal:AbortSignal.timeout(12000),
  });
  if(!response.ok)throw Error('Research search unavailable');
  return await response.json() as Awaited<ReturnType<typeof retrieveLaw>>;
}

export function initTelegramChat(){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)return null;
  const bot=new TelegramBot(token,{polling:{autoStart:true,params:{timeout:25}}});
  bot.on('polling_error',()=>console.warn('[Telegram] Polling interrupted; retrying.'));
  bot.on('message',async msg=>{
    if(msg.chat.type!=='private')return;
    const attachment=!!(msg.document || msg.photo?.length);
    const text=(msg.text || msg.caption || '').trim();
    if(!text&&!attachment)return;
    const chat=msg.chat.id;
    if(busy.has(chat)){await bot.sendMessage(chat,'I’m finishing your previous request.').catch(()=>{});return;}
    busy.add(chat);
    let language='en-IN';
    let id:string|undefined;
    let typing:ReturnType<typeof setInterval>|undefined;
    try{
      const previous=conversations.get(chat);
      language=detectLanguage(text) || previous?.language || (['hi','kn','ta'].includes(msg.from?.language_code?.split('-')[0] || '') ? msg.from?.language_code?.split('-')[0]+'-IN' : undefined) || 'en-IN';
      if(text==='/start'){
        await bot.sendMessage(chat,'Ask a legal question or attach a PDF, TXT, JPEG or PNG under 4 MB. Add a caption to ask about the document. Scanned pages are processed online.\n\nUse /language en, hi, kn or ta to choose a reply language. Use /clear to forget the current document and conversation. The operator courtroom displays research progress.');
        return;
      }
      if(text==='/clear'){conversations.delete(chat);await bot.sendMessage(chat,'Conversation and document context cleared.');return;}
      const selection=/^\/language\s+(en|hi|kn|ta)$/i.exec(text);
      if(selection){conversations.set(chat,{...previous,history:previous?.history||[],language:selection[1].toLowerCase()+'-IN'});await bot.sendMessage(chat,copy[selection[1].toLowerCase()+'-IN'].answer+' ✓');return;}
      if(text.length>6000){await bot.sendMessage(chat,'Please shorten the question to 6,000 characters.');return;}
      id=randomUUID();
      createSession(id,attachment?'Telegram document review':'Telegram legal question',chat);
      const sessionId=id;
      const emit=(type:string,data:Record<string,unknown>)=>{
        addEvent(sessionId,{type,data});
        broadcast({type,session_id:sessionId,timestamp:new Date().toISOString(),...data});
      };
      const progress:NonNullable<Parameters<typeof answerLegal>[1]>['progress']=(agent,state,bubble)=>emit(state==='start'?'AGENT_START':'AGENT_COMPLETE',{agentId:agent.id,name:agent.name,category:agent.category,bubble});
      emit('session_start',{topic:attachment?'Telegram document review':'Telegram legal question',origin:'telegram'});
      const showTyping=()=>void bot.sendChatAction(chat,'typing').catch(()=>{});
      showTyping();
      typing=setInterval(showTyping,4000);
      let document=previous?.document;
      if(attachment){
        const reader={id:'claim_extractor',name:'Document Review',category:'analysis'};
        progress(reader,'start','Extracting the readable text from the attachment.');
        document=await readTelegramDocument(bot,msg);
        progress(reader,'complete','Document text is ready for analysis.');
        language=detectLanguage(text) || previous?.language || detectLanguage(document.text.slice(0,600)) || language;
      }
      const question=text || copy[language].review;
      const history=attachment?[]:previous?.history||[];
      if(attachment&&document)conversations.set(chat,{language,document,history});
      const input=parseAssistantRequest({message:question,language,context:document?.text||'',history});
      const result=await answerLegal(input,{retrieve:searchForTelegram,progress});
      const summary=result.retrievalOnly?'Available sources could not support a verified answer.':'Research and final review complete. Reply delivered to Telegram.';
      for(const message of formatTelegramReply(result.reply,result.sources,language)){
        await bot.sendMessage(chat,message,{parse_mode:'HTML',disable_web_page_preview:true});
      }
      updateSession(id,{status:'complete',verdict:summary});
      setAgentOutput(id,'legal',summary);
      emit('session_complete',{verdict:summary});
      conversations.set(chat,{language,document,history:[...history,{role:'user',text:question},{role:'assistant',text:result.reply.slice(0,12000)}].slice(-8)});
    }catch(error){
      if(id){updateSession(id,{status:'error'});addEvent(id,{type:'session_error',data:{error:'This request could not be completed.'}});broadcast({type:'session_error',session_id:id,error:'This request could not be completed.'});}
      const reason=error instanceof Error?error.message:'';
      const safe=/^(Please send a file under 4 MB|Telegram could not download the file|Send a PDF|No readable text)/.test(reason)?reason:copy[language].failed;
      await bot.sendMessage(chat,safe).catch(()=>{});
    }finally{
      if(typing)clearInterval(typing);
      while(conversations.size>100)conversations.delete(conversations.keys().next().value!);
      busy.delete(chat);
    }
  });
  return bot;
}
