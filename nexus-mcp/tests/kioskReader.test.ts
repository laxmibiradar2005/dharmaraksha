import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { kioskReaderRouter,readerStatus } from '../api/kioskReader';
import type {AddressInfo} from 'node:net';
test('RFID rejects unknown devices, validates UIDs and never grants visitor access',async()=>{
 process.env.KIOSK_DEVICE_TOKEN='reader-test';process.env.KIOSK_DEVICE_ID='test-reader';
 const app=express();app.use(express.json());app.use(kioskReaderRouter);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const headers={'Content-Type':'application/json','X-Device-Key':'reader-test','X-Device-Id':'test-reader'};
 try{
 assert.equal((await fetch(base+'/heartbeat')).status,401);
 assert.equal((await fetch(base+'/heartbeat',{headers})).status,200);
 assert.equal((await fetch(base+'/tap',{method:'POST',headers,body:JSON.stringify({uid:'invalid'})})).status,400);
 const tap=()=>fetch(base+'/tap',{method:'POST',headers,body:JSON.stringify({uid:'1234ABCD'})}).then(r=>r.json()) as Promise<any>;
 const first=await tap(),second=await tap();assert.equal(first.authenticated,false);assert.equal(first.sequence,second.sequence);
 assert.equal(readerStatus().event?.cardSuffix,'ABCD');assert.equal(readerStatus().privateCases,false);
 }finally{server.close();delete process.env.KIOSK_DEVICE_TOKEN;delete process.env.KIOSK_DEVICE_ID;}
});
