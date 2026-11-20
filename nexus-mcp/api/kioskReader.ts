import { kioskIdentity } from '../lib/kioskIdentity';
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
export const kioskReaderRouter=Router();
let lastSeen=0, sequence=0, lastTapAt=0, lastUid='';
let event:{sequence:number;cardSuffix:string;at:number;recognized?:boolean;enrolled?:boolean}|null=null;
export function readerStatus(){return {connected:Date.now()-lastSeen<15000,event:event&&Date.now()-event.at<30000?event:null,privateCases:false,identity:kioskIdentity().status()};}
kioskReaderRouter.use((req,res,next)=>{
  const expected=process.env.KIOSK_DEVICE_TOKEN;
  const incoming=req.get('X-Device-Key')||'';
  if(!expected || !incoming || Buffer.byteLength(incoming)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(incoming),Buffer.from(expected))){res.status(401).json({error:'Reader authentication failed.'});return;}
  if(req.get('X-Device-Id')!==(process.env.KIOSK_DEVICE_ID||'dharmaraksha-reader-01')){res.status(403).json({error:'Unknown reader.'});return;}
  next();
});
kioskReaderRouter.get('/heartbeat',(_req,res)=>{lastSeen=Date.now();res.json({ok:true,mode:'read',privateCases:false});});
kioskReaderRouter.post('/tap',(req,res)=>{
  const uid=req.body?.uid;
  if(typeof uid!=='string'||!/^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/.test(uid)){res.status(400).json({error:'Invalid card identifier.'});return;}
  lastSeen=Date.now();
  if(uid!==lastUid || Date.now()-lastTapAt>2500){lastUid=uid;lastTapAt=Date.now();event={sequence:++sequence,cardSuffix:uid.slice(-4),at:Date.now(),...kioskIdentity().card(uid,sequence)};}
  res.json({ok:true,sequence,authenticated:false,message:kioskIdentity().status().enabled?'Card received. Enter your PIN on the phone.':'Card detected. Continue as guest on the phone.'});
});
