import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { kioskRouter } from '../api/kiosk';

test('hardware control requires same-origin requests and one active kiosk lease',async()=>{
  const old=process.env.KIOSK_MODE;process.env.KIOSK_MODE='true';
  const app=express();app.use(express.json());app.use('/api/kiosk',kioskRouter);
  const server=app.listen(0);const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(route:string,body:unknown={},headers:Record<string,string>={})=>fetch(base+'/api/kiosk/'+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const same={'Origin':base,'X-Kiosk-Request':'1'};
  try{
    assert.equal((await post('session')).status,403);
    assert.equal((await post('session',{}, {...same,Origin:'http://untrusted.example'})).status,403);
    assert.equal((await post('capture',{},same)).status,409);
    const session=await post('session',{},same);assert.equal(session.status,200);
    const {token}=await session.json() as {token:string};assert.ok(token.length>20);
    assert.equal((await post('session',{},same)).status,409);
    assert.equal((await post('session',{token},same)).status,200);
    assert.equal((await post('listen',{}, {...same,'X-Kiosk-Session':'wrong'})).status,409);
    assert.equal((await post('read-document',{image:''},{...same,'X-Kiosk-Session':token})).status,400);
  }finally{server.close();if(old===undefined)delete process.env.KIOSK_MODE;else process.env.KIOSK_MODE=old;}
});
