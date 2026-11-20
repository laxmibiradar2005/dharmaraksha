const screen=document.getElementById('screen');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('dharmaraksha-kiosk-lease')||'',step='welcome',language='en-IN',pages=[],messages=[],context='',preview='',hint='Place one page flat under the camera.',voice='Connecting',heard='',error='',active=false,epoch=0,owner=false,busy=false;
let pendingStart=false;let needsWelcome=false;let uiMessages={};let languageReady=false;
const tr=(text,values={})=>(uiMessages[text]||text).replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
let guidance='';
const originalLabels=new WeakMap();
async function selectKioskLanguage(code){voice='Preparing language';render();try{const r=await fetch('/api/kiosk/language/'+code,{signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error('This language is not ready. Please connect the laptop and retry.');uiMessages=await r.json();}catch(err){error=err.message;render();return false;}language=code;error='';document.documentElement.lang=code.split('-')[0];document.documentElement.dir=['ur-IN','ks-IN','sd-IN'].includes(code)?'rtl':'ltr';languageReady=true;guidance='';render();return true;}
function translateScreen(){const walker=document.createTreeWalker(document.getElementById('app'),NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.parentElement.closest('.chat-message,.heard,.sources,script,style'))continue;if(!originalLabels.has(node))originalLabels.set(node,node.textContent);const original=originalLabels.get(node);const key=original.trim();node.textContent=uiMessages[key]?original.replace(key,uiMessages[key]):original;}}
let phonePreferred=sessionStorage.getItem('kiosk-phone-audio')==='true';
let phoneAudio=null,phoneAudioUrl='',pendingPhonePlay=false,phoneFetch=null;
let readerConnected=false,cardNotice='',cardSequence=0,identityAuthenticated=false;
const MAX_PAGES=6;let peekImage='',reconnects=0,qualityReady=false,captureBusy=false;const commands=[];let lastCard=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,body={}){const r=await fetch('/api/kiosk/'+url,{method:'POST',headers:{'Content-Type':'application/json','X-Kiosk-Request':'1','X-Kiosk-Session':token},body:JSON.stringify(body),signal:AbortSignal.timeout(url==='session'?8000:120000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||(data.issues||[]).join(' ')||'Kiosk request failed.');return data;}
function render(){
 screen.dataset.step=step;
 const badge=`${identityAuthenticated?'<div class="note">Card verified · session unlock lasts five minutes. Saved cases are not connected yet.</div>':''}<div class="voice-panel" role="status"><span class="voice-dot ${voice.startsWith('Listening')?'listening':''}"></span><div><strong>Dharmaraksha</strong><small>${escape(voice)}</small></div><span class="voice-bars">▂ ▅ ▃ ▆ ▂</span></div>`;
 let content='';
 if(step==='ended')content=`<section class="welcome"><h1>Thank you.</h1><p>Your session has ended. Your microphone is paused and this conversation has been cleared.</p><button class="primary" data-command="start as guest">Start a new session</button></section>`;
 if(step==='welcome')content=`<section class="welcome"><span class="eyebrow">LEGAL HELP IN YOUR LANGUAGE</span><h1>Your rights.<br><em>A clearer path.</em></h1><h2>Let’s begin.</h2><button class="primary" data-command="start as guest">Continue as guest →</button><p>I’m Dharmaraksha. I’ll guide you through your documents, one page at a time.</p><div class="note">Speak into the kiosk microphone.<br>Cloud AI processes your spoken questions and approved documents. Guest pages are not saved as case history.</div><span class="reader-status">${escape(cardNotice||(readerConnected?'Reader connected · tap your card. Tap your enrolled card to enter your PIN.':'Reader offline · check its Wi-Fi and power.'))}</span></section>`;
 if(step==='pin')content=`<span class="eyebrow">CARD DETECTED</span><h1>Enter your<br><em>private PIN.</em></h1><form id="pin-form"><label for="card-pin">PIN</label><input id="card-pin" type="password" inputmode="numeric" pattern="[0-9]{4,12}" minlength="4" maxlength="12" autocomplete="off" required><button class="primary" type="submit">Unlock this card</button></form><button class="secondary" data-command="start as guest">Continue as guest</button><p class="helper">Card authentication is available. Saved-case retrieval is not connected yet.</p>`;
 if(step==='choose')content=`<span class="eyebrow">LET’S BEGIN</span><h1>Documents or<br><em>a question?</em></h1><button class="primary" data-command="scan documents">Scan documents ◎</button><button class="secondary" data-command="ask a question">Ask a question →</button><p class="helper">Touch or speak to choose.</p><div class="note">Use voice to navigate. Press Capture yourself when your document looks clear.</div>`;
 if(step==='scan')content=`<span class="eyebrow">${escape(tr('PAGE {page} · MANUAL DOCUMENT SCANNER',{page:pages.length+1}))}</span><h1>Frame it clearly.<br><em>You take the photo.</em></h1><div class="live-scanner"><img id="live-video" src="/api/kiosk/preview?session=${encodeURIComponent(token)}" alt="Live UNO Q camera preview"><span class="scan-badge">LIVE · AUTOFOCUS</span></div><div class="quality-hint" id="quality-hint" role="status">${escape(hint)}</div><button class="primary" id="capture-page" ${captureBusy?'disabled':''} aria-disabled="${captureBusy}">${captureBusy?'Taking photo…':'Capture this page'} <span>◎</span></button><p class="helper">Nothing is captured automatically. Press Capture when you are ready. Image checks are guidance only. Keep all four corners visible.</p>`;
 if(step==='page')content=`<span class="eyebrow">${escape(tr('PAGE {page} CAPTURED',{page:pages.length}))}</span><h1>One page closer<br><em>to clarity.</em></h1><div class="scan-frame"><img src="data:image/jpeg;base64,${pages.at(-1)?.image||''}" alt="Perspective-corrected document page ${pages.length}"></div><div class="split"><button class="secondary" data-command="next page">＋ Next page</button><button class="secondary" data-command="retake">Retake</button></div><button class="primary" data-command="finished scanning">Finished scanning →</button><p class="helper">You can also say next page, retake, or finished scanning.</p><div class="note">${escape(tr('{count} of {maximum} pages collected. No OCR or legal analysis has started yet.',{count:pages.length,maximum:MAX_PAGES}))}</div>`;
 if(step==='consent')content=`<span class="eyebrow">YOUR DOCUMENTS, YOUR CHOICE</span><h1>${escape(tr('{count} pages.',{count:pages.length}))}<br><em>Ready to read?</em></h1><p>Analyze these pages using online document processing?</p><button class="primary" data-command="yes analyze">Yes, analyze pages →</button><button class="secondary" data-command="no">Keep scanning</button>`;
 if(step==='reading')content=`<span class="eyebrow">READING YOUR DOCUMENTS</span><h1>Making room<br><em>for understanding.</em></h1><p>${escape(hint)}</p><p class="helper">The scanner checks image quality; OCR can still make mistakes. I’ll flag unreadable or truncated text.</p>`;
 if(step==='chat')content=`<span class="eyebrow">SPEAK FREELY</span><h1>I’m listening.<br><em>What happened?</em></h1>${pages.length?`<div class="note">${escape(tr('{count} scanned pages in this session.',{count:pages.length}))}</div>`:''}<div aria-live="polite">${messages.map(m=>`<article class="chat-message ${m.role}"><small>${m.role==='user'?'YOU':'DHARMARAKSHA'}</small>${escape(m.text)}${m.sources?.length?`<div class="sources">${m.sources.filter(s=>/^https:\/\//.test(s.url)).map(s=>`<a href="${escape(s.url)}" target="_blank" rel="noreferrer">${escape(s.title)} ↗</a>`).join('')}</div>`:''}</article>`).join('')}</div><p>Ask your question aloud. Say “scan documents”, “repeat”, or “end session”.</p>`;
 const thumbs=pages.length?`<div class="page-strip" aria-label="Captured pages">${pages.map((p,i)=>`<div><img src="data:image/jpeg;base64,${p.image}" alt="Page ${i+1}"><small>${i+1}</small></div>`).join('')}</div>`:'';
 const oldVideo=document.getElementById('live-video');
 const peek=false?`<div class="live-scanner" id="camera-peek">${owner?`<img id="live-video" src="/api/kiosk/preview?session=${encodeURIComponent(token)}" alt="Live UNO Q camera preview">`:'<div class="camera-warming">Connecting to the camera…</div>'}<span class="scan-badge">LIVE PREVIEW · YOU CONTROL CAPTURE</span></div>`:'';
 const chooser=`<div class="kiosk-language"><button class="text-button" id="language-choice">🎙 ${escape(tr('Change language'))}</button><span>${escape(language)}</span></div><details class="kiosk-language-options"><summary>${escape(tr('Choose language'))}</summary><div class="language-buttons">${KIOSK_LANGUAGES.map(item=>`<button class="secondary" data-command="${item.name}">${item.native}</button>`).join('')}</div></details>`;

 screen.innerHTML='<aside class="assistant-rail">'+chooser+'<label class="helper">Audio output <select id="audio-output"><option value="kiosk" '+(!phonePreferred?'selected':'')+'>Kiosk speaker (phone fallback)</option><option value="phone" '+(phonePreferred?'selected':'')+'>This phone</option></select></label>'+badge+(pendingPhonePlay?'<button class="primary" id="phone-play">Play answer on this phone</button>':'')+(guidance?'<p class="guidance" role="status">'+escape(guidance)+'</p>':'')+(KIOSK_LANGUAGES.find(item=>item.code===language)?.voice===false?'<p class="note">'+escape(tr('Spoken replies are unavailable in this language. Your replies and guidance appear on screen. You can speak or type.'))+'</p>':'')+'</aside><section class="kiosk-stage">'+content+(step==='chat'?'<form id="text-question"><label for="question-text">'+escape(tr('Type your question'))+'</label><input id="question-text" maxlength="1500" required autocomplete="off"><button class="secondary" type="submit">'+escape(tr('Send question'))+'</button></form>':'')+thumbs+(heard?`<div class="heard">${escape(tr('Heard'))}: “${escape(heard)}”</div>`:'')+(error?`<p class="error" role="alert">${escape(error)}</p>`:'')+`<div class="fallback-controls"><button class="text-button" id="pause">${active?'Pause microphone':'Resume voice guidance'}</button><button class="text-button" id="end">Clear session</button></div><p class="helper">Speak after the listening indicator. Photo capture is always manual.</p></section>`;
 const questionForm=document.getElementById('text-question');if(questionForm)questionForm.onsubmit=event=>{event.preventDefault();const input=document.getElementById('question-text');if(input.value.trim())queueTouch(input.value.trim());};
 const pinForm=document.getElementById('pin-form');if(pinForm)pinForm.onsubmit=async event=>{event.preventDefault();const field=document.getElementById('card-pin');const pin=field.value;field.value='';try{await request('unlock',{pin,sequence:cardSequence});identityAuthenticated=true;error='';step='choose';needsWelcome=true;active=false;epoch++;await request('stop-voice').catch(()=>{});render();if(busy)pendingStart=true;else start();}catch(err){error=err.message;render();}};
 document.getElementById('audio-output').onchange=e=>{phonePreferred=e.target.value==='phone';sessionStorage.setItem('kiosk-phone-audio',String(phonePreferred));};
 const playButton=document.getElementById('phone-play');if(playButton)playButton.onclick=()=>phoneAudio?.play().then(()=>{pendingPhonePlay=false;error='';render();}).catch(()=>{error='Chrome could not play this audio. Check phone media volume.';render();});
 const nextVideo=document.getElementById('live-video');if(oldVideo&&nextVideo&&oldVideo.getAttribute('src')===nextVideo.getAttribute('src'))nextVideo.replaceWith(oldVideo);
 document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{queueTouch(b.dataset.command);b.textContent='Opening…';b.disabled=true;});
 document.getElementById('language-choice').onclick=()=>queueTouch('change language');
 const capture=document.getElementById('capture-page');if(capture)capture.onclick=()=>capturePage(epoch);

 document.getElementById('pause').onclick=()=>{if(active){active=false;epoch++;stopPhoneAudio();void request('stop-voice').catch(()=>{});voice='Paused';render();}else start();};
 document.getElementById('end').onclick=()=>{active=false;epoch++;stopPhoneAudio();void request('stop-voice').catch(()=>{});identityAuthenticated=false;void request('lock').catch(()=>{});commands.length=0;pages=[];messages=[];context='';preview='';heard='';step='welcome';voice='Session cleared · microphone paused';render();};
 translateScreen();
}
function queueTouch(command){if(step==='ended'&&command==='start as guest')step='welcome';if(command==='start as guest'&&step==='pin'){step='welcome';identityAuthenticated=false;void request('lock').catch(()=>{});}commands.push(command);stopPhoneAudio();if(owner)void request('stop-voice').catch(()=>{});if(!active){if(busy)pendingStart=true;else start();}}
function live(e){return active&&epoch===e;}
function stopPhoneAudio(){phoneFetch?.abort();if(phoneAudio){phoneAudio.pause();phoneAudio.dispatchEvent(new Event('ended'));}pendingPhonePlay=false;}
async function speakOutput(text,e){
 if(commands.length||!live(e))return;
 if(KIOSK_LANGUAGES.find(item=>item.code===language)?.voice===false){voice='Text responses for this language';render();return;}
 if(!phonePreferred){try{await request('speak',{text,language});return;}
 catch(err){if(!live(e)||commands.length)return;phonePreferred=true;sessionStorage.setItem('kiosk-phone-audio','true');voice='Switching to this phone speaker';error='';render();}}
 if(commands.length||!live(e))return;
 const controller=new AbortController();phoneFetch=controller;let r;
 try{r=await fetch('/api/voice/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});}catch(err){if(controller.signal.aborted)return;throw err;}finally{if(phoneFetch===controller)phoneFetch=null;}
 if(!r.ok){const problem=await r.json().catch(()=>({}));throw Error(problem.error||'Speech is unavailable. Your answer is still shown on screen.');}
 const blob=await r.blob();if(!live(e)||commands.length)return;
 if(phoneAudioUrl)URL.revokeObjectURL(phoneAudioUrl);phoneAudioUrl=URL.createObjectURL(blob);
 const audio=new Audio(phoneAudioUrl);phoneAudio=audio;
 voice='Speaking on this phone - microphone off';render();
 try{await new Promise((resolve,reject)=>{
  audio.onended=resolve;audio.onerror=()=>reject(Error('Phone audio could not play. Your answer is still shown on screen.'));
  audio.play().catch(()=>{pendingPhonePlay=true;voice='Tap Play answer to enable phone audio';render();});
 });}finally{audio.pause();if(phoneAudio===audio)phoneAudio=null;pendingPhonePlay=false;URL.revokeObjectURL(phoneAudioUrl);phoneAudioUrl='';}
}
async function say(text,e){if(!live(e))return;voice='Speaking · microphone off';render();guidance=uiMessages[text]||localPrompt(text,language);render();await speakOutput(guidance.slice(0,2500),e);if(live(e)){voice='Ready';render();}}
async function listen(e){if(!live(e))return '';if(commands.length)return commands.shift();voice='Listening · speak into the USB microphone';render();const r=await request('listen',{language:languageReady?language:undefined});if(!live(e))return '';if(commands.length)return commands.shift();heard=r.text||'';voice=heard?'Heard you':'No speech detected';render();return heard.trim();}
const lower=s=>s.normalize('NFKC').toLowerCase().replace(/[.,!?।؟]/g,'').trim();
function ended(s){return /^(end session|stop session|goodbye|exit|stop|cancel session|thank you(?: very much)?|thanks(?: a lot)?|thanks goodbye|thank you goodbye|that's all(?: thank you)?|no more questions|ಧನ್ಯವಾದ(?:ಗಳು)?|ಸಾಕು|धन्यवाद|शुक्रिया|நன்றி|ధన్యవాదాలు|നന്ദി|ধন্যবাদ|આભાર|ਧੰਨਵਾਦ|شکریہ)$/.test(lower(s));}
function canonicalCommand(text){
 const value=lower(text);
 const commands={'Continue as guest':'start as guest','Scan documents':'scan documents','Ask a question':'ask a question','Next page':'next page','Retake':'retake','Finished scanning':'finished scanning','Yes, analyze pages':'yes analyze','Keep scanning':'no','Repeat':'repeat','End session':'end session','Thank you':'end session','Yes':'yes analyze','No':'no'};
 for(const [label,command] of Object.entries(commands))if(value===lower(tr(label)))return command;
 const aliases={'ಅತಿಥಿಯಾಗಿ ಪ್ರಾರಂಭಿಸಿ':'start as guest','ಅತಿಥಿ':'start as guest','ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ':'scan documents','ಪ್ರಶ್ನೆ ಕೇಳಿ':'ask a question','ಮುಂದಿನ ಪುಟ':'next page','ಮತ್ತೆ ತೆಗೆಯಿರಿ':'retake','ಮುಗಿದಿದೆ':'finished scanning','ಹೌದು':'yes analyze','ಇಲ್ಲ':'no','अतिथि के रूप में शुरू करें':'start as guest','दस्तावेज़ स्कैन करें':'scan documents','सवाल पूछें':'ask a question','अगला पन्ना':'next page','अगला पेज':'next page','दोबारा फोटो':'retake','स्कैन पूरा हुआ':'finished scanning','हाँ':'yes analyze','नहीं':'no','விருந்தினராக தொடங்கு':'start as guest','ஆவணங்களை ஸ்கேன் செய்':'scan documents','அடுத்த பக்கம்':'next page','ஆம்':'yes analyze','இல்லை':'no'};
 return aliases[value]||value;
}
function languageFrom(s){
 const command=lower(s).replace(/^(?:please\s+)?(?:switch (?:the language )?to|change (?:the language )?to|speak in|answer in|select|use)\s+/,'');
 return KIOSK_LANGUAGES.find(item=>item.aliases.includes(command))?.code;
}
function duplicate(a,b){if(!a||!b)return false;const x=atob(a),y=atob(b);if(x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff+=Math.abs(x.charCodeAt(i)-y.charCodeAt(i));return diff/x.length<7;}
async function capturePage(e){
 if(captureBusy||step!=='scan')return;captureBusy=true;error='';render();
 try{const captured=await request('capture');if(!live(e))return;if(!captured.image)throw Error('No camera image is available. Please retry.');stopPhoneAudio();void request('stop-voice').catch(()=>{});pages.push({image:captured.image,fingerprint:captured.fingerprint,text:''});step='page';hint='Page captured by you.';render();}
 catch(err){error=err.message;render();}finally{captureBusy=false;render();}
}
async function scan(e){
 if(pages.length>=MAX_PAGES){step='consent';return;}
 step='scan';qualityReady=false;hint='Waiting for a clear, steady page.';render();
 void say(tr('Please place page {page} flat under the camera. When the picture is clear, press Capture this page. I will not take a photo automatically.',{page:pages.length+1}),e).catch(err=>{if(live(e)&&step==='scan'){error=err.message;render();}});
 voice='Ready for your capture · microphone off';render();
 while(live(e)&&step==='scan'){
  try{const frame=await request('frame');if(!live(e)||step!=='scan')break;qualityReady=!!frame.ready;hint=(frame.issues||[]).join(' ');const h=document.getElementById('quality-hint');if(h)h.textContent=tr(qualityReady?'Ready. Press Capture when you are happy with the image.':hint);const button=document.getElementById('capture-page');if(button){button.disabled=captureBusy;button.setAttribute('aria-disabled',String(captureBusy));}}
  catch(err){error=err.message;qualityReady=false;const h=document.getElementById('quality-hint');if(h)h.textContent=error;}
  await sleep(800);
 }
 if(live(e)&&step==='page')await say(tr('Page {page} captured. Please turn the page if you have more. Say next page, retake, or finished scanning.',{page:pages.length}),e);
}
async function readPages(e){step='reading';let combined='';let flagged=false;
 for(let i=0;i<pages.length&&live(e);i++){hint=tr('Reading page {page} of {count}…',{page:i+1,count:pages.length});voice='Reading approved pages';render();if(!pages[i].text){const r=await request('read-document',{image:pages[i].image});if(!live(e))return;pages[i].text=r.text;}flagged=flagged||/illegible|truncated/i.test(pages[i].text);combined+=`\n[Page ${i+1}]\n${pages[i].text}\n`;}
 if(!live(e))return;if(combined.length>14000){flagged=true;combined=combined.slice(0,13900)+'\n[truncated: some text exceeds the conversation limit]';}context=combined;step='chat';await say(flagged?'Some text is unreadable or incomplete. Say retake to replace the last page, or ask a question knowing the text may be incomplete.':'Your pages have been read. What would you like to understand? Please speak after I finish.',e);
}
function spokenAnswer(text){const clean=text.replace(/\[S\d+\]/g,'').replace(/[*#]/g,'');const sentences=clean.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g)||[clean];let spoken='';for(const sentence of sentences){if(spoken.length&&spoken.length+sentence.length>650)break;spoken+=sentence;if(spoken.length>=450)break;}return spoken.trim().slice(0,1000);}
async function answer(question,e){if(!live(e))return;
 voice='Researching your question';render();const history=messages.slice(-8).map(({role,text})=>({role,text}));const r=await fetch('/api/assistant/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:question,language,context,history,voice:true}),signal:AbortSignal.timeout(120000)});const d=await r.json();if(!r.ok)throw Error(d.error||'The assistant could not answer.');if(!live(e))return;messages.push({role:'user',text:question},{role:'assistant',text:d.reply,sources:d.sources||[]});voice='Speaking answer · microphone off';render();try{await speakOutput(spokenAnswer(d.reply),e);}catch(err){if(live(e))error=err.message;}if(live(e)){voice='Ready for your next question';render();}
}
async function guide(e){
 let silent=0;
 if(!languageReady){await say('Which language do you want to use? Say English, Hindi, Kannada, or Tamil.',e);}
 if(needsWelcome){needsWelcome=false;await say('Welcome. Say scan documents, or ask a question.',e);}
 if(step==='welcome'&&languageReady)await say('Namaste. I am Dharmaraksha, your legal help assistant. Say start as guest to continue. Tap your enrolled card to sign in with a PIN.',e);
 while(live(e)){
  if(step==='scan'){await scan(e);if(!live(e))break;}
  if(step==='consent')await say(tr('You have {count} pages. May I analyze them? Say yes analyze, or no.',{count:pages.length}),e);
  const text=await listen(e);if(!live(e))break;
  if(!text){if(++silent>=8){voice='Paused after silence · resume when ready';active=false;render();break;}continue;}silent=0;
  if(ended(text)||canonicalCommand(text)==='end session'){pendingStart=false;identityAuthenticated=false;void request('lock').catch(()=>{});await say('Your guest session is finished. The pages and conversation are cleared. Thank you.',e);commands.length=0;pages=[];messages=[];context='';preview='';heard='';active=false;step='ended';voice='Session ended';render();break;}
  const t=canonicalCommand(text);const chosen=languageFrom(text);if(chosen){if(!await selectKioskLanguage(chosen))continue;voice='Language selected';render();await say(step==='choose'?'Welcome. Say scan documents, or ask a question.':'Namaste. I am Dharmaraksha. Say start as guest, or tap your card to sign in.',e);continue;}
  if(t==='change language'){languageReady=false;await say('Which language do you want to use? Say the name of your language.',e);continue;}
  if(step==='welcome'){if(/guest|start|begin/.test(t)){step='choose';await say('Welcome. Say scan documents, or ask a question. You can also say your language: English, Hindi, Kannada, or Tamil.',e);}else await say('Say start as guest to begin.',e);continue;}
  if(/^(retake|retake page|retake last page)$/.test(t)){if(pages.length)pages.pop();context='';step='scan';continue;}
  if(step==='choose'){if(/^(?:please )?(?:scan(?: (?:a |the |my )?documents?)?|take (?:a )?photo|scan pages?)$/.test(t)){step='scan';continue;}if(/^(?:ask a question|talk|ask|question)$/.test(t)){step='chat';await say('Please ask your question.',e);continue;}step='chat';await answer(text,e);continue;}
  if(step==='scan'){if(/question|skip/.test(t)){step='chat';await say('Please ask your question.',e);}else if(!/try|again|ready|scan/.test(t))await say('Say try again to continue scanning.',e);continue;}
  if(step==='page'){if(/next|another/.test(t)){step='scan';continue;}if(/finish|done|analy[sz]e|complete/.test(t)){step='consent';continue;}await say('Say next page, retake, or finished scanning.',e);continue;}
  if(step==='consent'){if(/^(?:yes(?: please| analy[sz]e)?|proceed|(?:please )?analy[sz]e(?: (?:the|this|these|my) (?:document|documents|pages?))?)(?:\s+(?:and )?tell me.*)?$/.test(t)){await readPages(e);if(live(e)&&/analy[sz]e.*(?:document|page)|tell me|summari[sz]e/.test(t))await answer('Summarize this document. Tell me the key details it contains.',e);}else{step='page';await say('No pages were sent. Say next page, retake, or finished scanning.',e);}continue;}
  if(step==='chat'){if(/^(scan documents|add document|scan|next page)$/.test(t)){step='scan';continue;}if(t==='repeat'){const m=messages.at(-1);if(m?.role==='assistant')await speakOutput(spokenAnswer(m.text),e);continue;}await answer(text,e);}
 }
}
async function start(){if(busy||step==='ended')return;busy=true;error='';try{const s=await request('session',{token});token=s.token;sessionStorage.setItem('dharmaraksha-kiosk-lease',token);owner=true;active=true;const e=++epoch;render();await guide(e);}catch(e){active=false;const network=e instanceof TypeError||e.name==='TimeoutError';error=network?'Connection interrupted. Reconnecting to UNO Q…':e.message;voice=network?'Reconnecting':'Paused · needs attention';render();if(network&&reconnects++<3)setTimeout(()=>start(),4000);}finally{busy=false;if(pendingStart){pendingStart=false;setTimeout(()=>start(),0);}}}
setInterval(async()=>{if(!owner)return;try{const renewed=await request('session',{token});token=renewed.token;sessionStorage.setItem('dharmaraksha-kiosk-lease',token);}catch{owner=false;active=false;epoch++;error='Kiosk connection lost. Resume when it is available.';render();}},20000);
window.addEventListener('pagehide',()=>{active=false;epoch++;});
async function connect(){
 render();
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch('/api/kiosk/status',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Kiosk unavailable');const s=await r.json();document.getElementById('connection').textContent=s.camera?'Kiosk connected':'Check camera';error='';await start();return;}
  catch{voice='Reconnecting';error='Cannot reach UNO Q. Check that your phone and UNO Q are on the same Wi-Fi.';document.getElementById('connection').textContent='Reconnecting';render();await sleep(2000);}
 }
 voice='Not connected · tap Resume to retry';document.getElementById('connection').textContent='Offline';render();
}
void connect();

setInterval(async()=>{if(!active||!voice.startsWith('Listening'))return;try{const r=await fetch('/api/kiosk/status');const d=await r.json();const label=document.querySelector('.voice-panel small');if(label)label.textContent=tr(d.inputPhase==='transcribing'?'Understanding your speech…':'Listening · speak into the USB microphone');}catch{}},700);

setInterval(async()=>{if(!owner)return;try{const r=await fetch('/api/kiosk/status');const d=await r.json();readerConnected=!!d.reader?.connected;const status=document.querySelector('.reader-status');if(status)status.textContent=tr(cardNotice||(readerConnected?'Reader connected · tap your card. Tap your enrolled card to enter your PIN.':'Reader offline · check its Wi-Fi and power.'));const event=d.reader?.event;if(event&&event.sequence!==lastCard){lastCard=event.sequence;cardSequence=event.sequence;
 if(event.recognized){active=false;epoch++;stopPhoneAudio();void request('stop-voice').catch(()=>{});identityAuthenticated=false;pages=[];messages=[];context='';heard='';commands.length=0;error='';step='pin';voice='Enter your PIN on this screen';cardNotice='Enrolled card detected.';}
 else{active=false;epoch++;stopPhoneAudio();void request('stop-voice').catch(()=>{});identityAuthenticated=false;pages=[];messages=[];context='';heard='';commands.length=0;step='welcome';voice='Unrecognized card';cardNotice='Card received but not enrolled. Continue as guest or use the enrolled card.';}
 render();}}catch{}},2000);

setInterval(async()=>{if(!owner||!identityAuthenticated)return;try{const s=await request('identity');if(!s.authenticated){identityAuthenticated=false;active=false;epoch++;stopPhoneAudio();void request('stop-voice').catch(()=>{});pages=[];messages=[];context='';heard='';step='welcome';voice='Locked · tap your card again';render();}}catch{}},5000);
