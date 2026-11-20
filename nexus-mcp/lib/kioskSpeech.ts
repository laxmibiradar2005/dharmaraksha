import {speechConfiguration} from './voiceLanguages';
import { spawn } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { aiBudget } from './aiBudget';

const cache = new Map<string, Buffer>();
export async function streamKioskSpeech(input: {text:string;language:string}, sink:string, cancel:AbortSignal, deps: {fetcher?:typeof fetch; spawnPlayer?:typeof spawn} = {}) {
  const started=Date.now();
  const signal=AbortSignal.any([cancel,AbortSignal.timeout(90000)]);
  const key=process.env.SARVAM_API_KEY;if(!key)throw Error('Voice is not configured');
  const {model,speaker}=speechConfiguration(input.language);
  const body={text:input.text,language_code:input.language,model,output_audio_codec:'mp3',speech_sample_rate:24000,...(speaker?{speaker}:{})};
  const id=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const cached=cache.get(id);
  let source:Readable;
  if(cached)source=Readable.from([cached]);
  else {
    aiBudget().reserve('sarvam-tts',input.text.length/1000*(model==='bulbul:v3'?3:1)*1.18);
    const response=await (deps.fetcher || fetch)('https://api.sarvam.ai/text-to-speech/stream',{method:'POST',headers:{'Content-Type':'application/json','api-subscription-key':key},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
    if(!response.ok||!response.body)throw Error('Speech unavailable');
    source=Readable.fromWeb(response.body as any);
  }
  // Decode while bytes arrive; never wait for the complete utterance before playback.
  const player=(deps.spawnPlayer || spawn)('ffplay',['-nodisp','-autoexit','-loglevel','error','-probesize','32','-analyzeduration','0','-f','mp3','-i','pipe:0'],{env:{...process.env,SDL_AUDIODRIVER:'pulseaudio',PULSE_SINK:sink},stdio:['pipe','ignore','pipe'],signal});
  player.stderr.resume();
  const finished=new Promise<void>((resolve,reject)=>{player.once('error',reject);player.once('close',code=>code===0?resolve():reject(Error('Speaker playback failed')));});
  // Attach rejection immediately, including when piping fails first.
  void finished.catch(()=>{});
  let firstAudioMs:number|undefined,bytes=0;const chunks:Buffer[]=[];
  const meter=new Transform({transform(chunk:Buffer,_encoding,callback){
    firstAudioMs??=Date.now()-started;bytes+=chunk.length;
    if(bytes>5_000_000){callback(Error('Speech audio too large'));return;}
    if(bytes<=400000)chunks.push(Buffer.from(chunk));else chunks.length=0;
    callback(null,chunk);
  }});
  try {
    await pipeline(source,meter,player.stdin,{signal});
    await finished;
    if(!bytes)throw Error('Empty speech audio');
    if(!cached&&bytes<=400000){if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(id,Buffer.concat(chunks));}
    return {firstAudioMs,totalMs:Date.now()-started,cached:!!cached};
  } finally {source.destroy();if(player.exitCode===null)player.kill('SIGKILL');}
}

