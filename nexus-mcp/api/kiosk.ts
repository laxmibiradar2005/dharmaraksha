import {indianLanguages} from '../lib/indianLanguages';
import { kioskIdentity } from '../lib/kioskIdentity';
import { streamKioskSpeech } from '../lib/kioskSpeech';
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { transcribeImage } from '../lib/documentText';
import { parseVoiceRequest } from './voice';
import { randomUUID } from 'node:crypto';
import { aiBudget, BudgetError } from '../lib/aiBudget';
import { get as httpGet } from 'node:http';
import { readerStatus } from './kioskReader';

const run = promisify(execFile);
export const kioskRouter = Router();
kioskRouter.get('/language/:code',async(req,res)=>{
 const code=req.params.code;
 if(!/^(en|hi|kn|ta|te|ml|mr|bn|gu|pa|od|as|ur|ne|kok|ks|sd|sa|sat|mni|brx|mai|doi)-IN$/.test(code)){res.status(400).json({error:'Unsupported language'});return;}
 if(code==='en-IN'){res.json({});return;}
 const file=path.resolve(process.cwd(),'kiosk/locales',code+'.json');
 try{res.json(JSON.parse(await readFile(file,'utf8')));return}catch{/* Fetch public interface translations from laptop. */}
 try{
  const base=process.env.RAG_SERVER_URL;if(!base)throw Error('Language service unavailable');
  const r=await fetch(base.replace(/\/$/,'')+'/languages/'+code,{headers:{Authorization:`Bearer ${process.env.RAG_SERVER_TOKEN||''}`},signal:AbortSignal.timeout(300000)});
  if(!r.ok)throw Error('Language not ready');const data=await r.json() as {messages:Record<string,string>};
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(data.messages));res.json(data.messages);
 }catch{res.status(503).json({error:'This language is not downloaded yet. Connect the laptop language service and retry.'});}
});
let capturing = false, speaking = false, listening = false;
let voiceControl:AbortController|null=null;
let inputPhase = 'idle';
let lastVoiceTiming:Record<string,unknown>={};
let microphoneInfo: Record<string,number> = {};
let lease = { token: '', expires: 0 };
kioskRouter.use((req,res,next) => {
  if (process.env.KIOSK_MODE !== 'true') { res.status(404).json({error:'Kiosk hardware is not enabled.'}); return; }
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET' && (req.get('X-Kiosk-Request') !== '1' || req.get('Origin') !== `${req.protocol}://${req.get('host')}`)) {
    res.status(403).json({error:'Use the kiosk page on this device.'}); return;
  }
  next();
});
kioskRouter.get('/status',async (_req,res)=>{
  const camera = await access(process.env.KIOSK_CAMERA || '/dev/video0').then(()=>true,()=>false);
  res.json({camera,reader:readerStatus(),privateCases:false,speaker:process.env.KIOSK_SPEAKER || 'Mivi Roam 2',voice:!!process.env.SARVAM_API_KEY,inputPhase,microphone:microphoneInfo,lastVoiceTiming});
});
kioskRouter.post('/session',(req,res)=>{
  if(lease.expires>Date.now() && req.body.token!==lease.token){res.status(409).json({error:'Another phone is controlling this kiosk. Close that kiosk tab and wait one minute.'});return;}
  if(!lease.token || lease.expires<=Date.now())lease.token=randomUUID();
  lease.expires=Date.now()+60000;res.json({token:lease.token});
});
kioskRouter.get('/preview',(req,res)=>{
  if(!lease.token || lease.expires<=Date.now() || req.query.session!==lease.token){res.sendStatus(403);return;}
  res.setHeader('Content-Type','multipart/x-mixed-replace; boundary=frame');
  res.setHeader('X-Accel-Buffering','no');
  const upstream=httpGet('http://127.0.0.1:8083/stream',r=>r.pipe(res));
  upstream.on('error',()=>res.end());
  res.on('close',()=>upstream.destroy());
});
kioskRouter.use((req,res,next)=>{
  if(req.method==='GET'){next();return;}
  if(!lease.token || lease.expires<=Date.now() || req.get('X-Kiosk-Session')!==lease.token){res.status(409).json({error:'This kiosk session expired. Reload the page to reconnect.'});return;}
  lease.expires=Date.now()+60000;next();
});
kioskRouter.post('/unlock',(req,res)=>{
  try{res.json({...kioskIdentity().unlock(req.body.pin,req.body.sequence,lease.token),privateCases:false});}
  catch(error){res.status(403).json({error:(error as Error).message});}
});
kioskRouter.post('/identity',(_req,res)=>res.json({authenticated:kioskIdentity().authenticated(lease.token),privateCases:false}));
kioskRouter.post('/lock',(_req,res)=>{kioskIdentity().lock();res.json({locked:true});});
kioskRouter.post('/stop-voice',(_req,res)=>{voiceControl?.abort();res.json({stopped:true});});
kioskRouter.post('/frame',async (_req,res)=>{
  try{const r=await fetch('http://127.0.0.1:8083/quality',{signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error();res.json(await r.json());}
  catch{res.status(503).json({error:'Document scanner unavailable. Check the camera and scanner service.'});}
});
kioskRouter.post('/capture',async (_req,res)=>{
  if(capturing){res.status(409).json({error:'Camera is busy. Try again shortly.'});return;}
  capturing=true;
  try {
    const r=await fetch('http://127.0.0.1:8083/capture',{signal:AbortSignal.timeout(5000)});
    const result=await r.json();res.status(r.status).json(result);
  } catch {res.status(503).json({error:'The UNO Q camera could not capture a photo. Check its USB connection and try again.'});}
  finally {capturing=false;}
});
kioskRouter.post('/listen',async (req,res)=>{
  if(listening || speaking){res.status(409).json({error:'Please wait until Dharmaraksha finishes speaking.'});return;}
  if(!process.env.SARVAM_API_KEY){res.status(503).json({error:'Speech recognition is not configured.'});return;}
  const startedAt=Date.now();let recordedAt=startedAt;
  voiceControl=new AbortController();const control=voiceControl;
  listening=true;inputPhase='listening';
  try{
    const {stdout,stderr}=await run('python3',[path.resolve(process.cwd(),'scripts/listen-kiosk.py')],{encoding:'buffer',signal:control.signal,timeout:39000,maxBuffer:1_200_000});
    recordedAt=Date.now();
    try{microphoneInfo=JSON.parse(stderr.toString().trim());}catch{microphoneInfo={};}
    if(stdout.length<3200){res.json({text:'',silent:true,microphone:microphoneInfo,timing:{recordingMs:recordedAt-startedAt}});return;}
    inputPhase='transcribing';
    const seconds=(stdout.length-44)/32000;
    aiBudget().reserve('sarvam-stt',Math.ceil(seconds)/60*1.5*1.18);
    const form=new FormData();form.append('file',new Blob([new Uint8Array(stdout)],{type:'audio/wav'}),'utterance.wav');
    form.append('model','saaras:v3');form.append('mode','transcribe');form.append('language_code',Object.prototype.hasOwnProperty.call(indianLanguages,req.body.language||'')?req.body.language:'unknown');
    const r=await fetch('https://api.sarvam.ai/speech-to-text',{method:'POST',headers:{'api-subscription-key':process.env.SARVAM_API_KEY},body:form,signal:AbortSignal.any([control.signal,AbortSignal.timeout(20000)])});
    if(!r.ok)throw Error('Speech recognition is unavailable. Check internet and voice credits.');
    const body=await r.json() as {transcript?:string;language_code?:string};res.json({text:(body.transcript||'').slice(0,1500),language:body.language_code,timing:{recordingMs:recordedAt-startedAt,recognitionMs:Date.now()-recordedAt}});
  }catch{if(control.signal.aborted){res.json({text:'',cancelled:true});return;}res.status(503).json({error:'Voice listening could not finish. Check the USB microphone, internet and daily budget.'});}
  finally{listening=false;inputPhase='idle';}
});
kioskRouter.post('/read-document',async(req,res)=>{
  if(typeof req.body.image !== 'string' || !req.body.image || req.body.image.length>6_000_000){res.status(400).json({error:'Provide a document photograph.'});return;}
  try {
    const text=await transcribeImage(req.body.image);
    res.json({text});
  }catch{res.status(503).json({error:'Document reading is unavailable. Check the internet or type your question instead.'});}
});
kioskRouter.post('/speak',async(req,res)=>{
  let input:ReturnType<typeof parseVoiceRequest>;
  try{input=parseVoiceRequest(req.body);}catch{res.status(400).json({error:'Provide a short message and supported language.'});return;}
  if(speaking || listening){res.status(409).json({error:'The kiosk microphone or speaker is busy. Please wait.'});return;}
  voiceControl=new AbortController();const control=voiceControl;
  speaking=true;
  try{
    const {stdout}=await run('pw-dump',[],{timeout:5000,maxBuffer:4_000_000});
    const sink=JSON.parse(stdout).find((entry:any)=>entry.info?.props?.['media.class']==='Audio/Sink' && entry.info?.props?.['node.name']?.replaceAll('_',':').includes('88:81:75:22:10:03'));
    if(!sink)throw Error('Speaker unavailable');
    const timing=await streamKioskSpeech(input,sink.info.props['node.name'],control.signal);
    lastVoiceTiming=timing;res.json({played:true,timing});
  }catch(error){if(control.signal.aborted){res.json({played:false,cancelled:true});return;}if(error instanceof BudgetError){res.status(429).json({error:error.message});return;}res.status(503).json({error:'Could not play on the kiosk speaker. Check the internet and Mivi connection.'});}
  finally{speaking=false;}
});
