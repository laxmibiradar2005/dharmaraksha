import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { browserCapabilities, type SpeechRecognitionLike } from '../lib/browserCapabilities'
import languageList from '../locales/languages.json'
import './LanguageSetup.css'

import { LanguageContext } from './languageState'
type Dictionary = Record<string,string>
export function LanguageProvider({children}:{children:ReactNode}) {
 const [language,setLanguage]=useState('en-IN')
 const [dictionary,setDictionary]=useState<Dictionary>({})
 const [open,setOpen]=useState(true)
 const [status,setStatus]=useState('Which language do you want to use? Say Kannada, Hindi, Tamil, or another language below.')
 const [busy,setBusy]=useState(false)
 const recognition=useRef<SpeechRecognitionLike|null>(null)
 const audio=useRef<HTMLAudioElement|null>(null)
 const request=useRef<AbortController|null>(null)
 const revision=useRef(0)
 const selected=useRef(false)
 const t=useCallback((text:string)=>dictionary[text] || text,[dictionary])
 async function select(code:string) {
  if(selected.current)return null
  selected.current=true;recognition.current?.abort();audio.current?.pause();setBusy(true)
  setStatus('Loading your language…')
  try {
   const response=await fetch('/api/languages/'+encodeURIComponent(code),{signal:AbortSignal.timeout(300000)})
   if(!response.ok)throw Error('Language setup is unavailable. Please try again or choose English.')
   const data=await response.json()
   setDictionary(data.messages || {});setLanguage(code);sessionStorage.setItem('dharmaraksha-language',code)
   document.documentElement.lang=code.split('-')[0];document.documentElement.dir=['ur-IN','ks-IN','sd-IN'].includes(code)?'rtl':'ltr'
   setOpen(false);return data.messages || {}
  }catch(error){setStatus(error instanceof Error?error.message:'Language setup failed.');selected.current=false;return null}
  finally{setBusy(false)}
 }
 function listen() {
  recognition.current?.abort()
  const Recognition=browserCapabilities.SpeechRecognition || browserCapabilities.webkitSpeechRecognition
  if(!Recognition){setStatus('Voice selection is unavailable in this browser. Choose a language button below.');return}
  const r=new Recognition();recognition.current=r;r.lang='en-IN';r.continuous=false;r.interimResults=false;r.maxAlternatives=3
  r.onstart=()=>setStatus('Listening… Say the name of your language.')
  r.onresult=event=>{
   const alternatives=Array.from(event.results[0]).map(result=>result.transcript.toLowerCase().replace(/[.!?,]/g,'').trim())
   const found=languageList.find(item=>alternatives.some(text=>item.aliases.some(alias=>text===alias||text===`please ${alias}`||text===`i want ${alias}`||text===`speak ${alias}`||text===`speak in ${alias}`)))
   if(found)void select(found.code);else setStatus('I did not recognize the language. Try again or choose a language below.')
  }
  r.onerror=()=>{if(!selected.current)setStatus('Microphone access was blocked or speech was not heard. Press Start voice setup, or choose a language.')}
  r.onend=()=>{};try{r.start()}catch{setStatus('Press Start voice setup to allow the microphone.')}
 }
 async function greet() {
  if(busy)return
  selected.current=false;const run=++revision.current;request.current?.abort();audio.current?.pause()
  const controller=new AbortController();request.current=controller
  setStatus('Which language do you want to use?')
  try{
   const response=await fetch('/api/voice/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Namaste. Which language do you want to use? Please say the name of your language after this greeting.',language:'en-IN'}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])})
   if(!response.ok)throw Error('Speech unavailable')
   const url=URL.createObjectURL(await response.blob());if(run!==revision.current||selected.current){URL.revokeObjectURL(url);return}
   const player=new Audio(url);audio.current=player
   player.onended=()=>{URL.revokeObjectURL(url);if(run===revision.current&&!selected.current)listen()}
   player.onerror=()=>{URL.revokeObjectURL(url);if(run===revision.current&&!selected.current)listen()}
   await player.play()
  }catch{if(!controller.signal.aborted&&!selected.current)setStatus('Press Start voice setup to enable the greeting and microphone, or choose your language below.')}
 }
 const greetRef=useRef(greet)
 useEffect(()=>{greetRef.current=greet})
 useEffect(()=>{const timer=setTimeout(()=>void greetRef.current(),250);return()=>{clearTimeout(timer);request.current?.abort();audio.current?.pause();recognition.current?.abort()}},[]) // One setup greeting per page load.
 return <LanguageContext.Provider value={{language,t,loadLanguage:async code=>{selected.current=false;return select(code)},choose:()=>{selected.current=false;setOpen(true);void greet()}}}>
  <div inert={open}>{children}</div>
  <button className="language-launch" onClick={()=>{selected.current=false;setOpen(true);void greet()}} aria-label="Change language">{languageList.find(item=>item.code===language)?.native} · 🎙</button>
  {open&&<div className="language-overlay" role="dialog" aria-modal="true" aria-labelledby="language-heading"><section className="language-setup"><span>धर्मरक्षा · ಧರ್ಮರಕ್ಷಾ · Dharmaraksha</span><h1 id="language-heading">Which language do you want to use?</h1><p role="status">{status}</p><button className="primary-button" onClick={()=>void greet()} disabled={busy}>🎙 Start voice setup</button><div className="language-grid">{languageList.map(item=><button key={item.code} onClick={()=>void select(item.code)} disabled={busy}><strong>{item.native}</strong><small>{item.name}{item.voice?'':' · Text responses'}</small></button>)}</div><p className="language-note">Voice-first setup. Buttons remain available if the microphone is blocked. Translations are AI-assisted; legal documents keep their original wording. Regional language and dialect accuracy varies.</p></section></div>}
 </LanguageContext.Provider>
}
