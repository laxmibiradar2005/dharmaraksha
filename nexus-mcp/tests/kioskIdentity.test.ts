import test from 'node:test';
import assert from 'node:assert/strict';
import { KioskIdentity } from '../lib/kioskIdentity';
test('one-card enrollment requires fresh tap and correct PIN, binds unlock to lease',()=>{
 const id=new KioskIdentity(':memory:');id.arm('1234');assert.throws(()=>id.arm('1234'));
 assert.deepEqual(id.card('12345678',1,1000),{recognized:true,enrolled:true});
 assert.throws(()=>id.unlock('1234',2,'phone',1001));assert.throws(()=>id.unlock('0000',1,'phone',1001));
 id.unlock('1234',1,'phone',1002);assert.equal(id.authenticated('phone',1003),true);assert.equal(id.authenticated('other',1003),false);
 assert.throws(()=>id.unlock('1234',1,'phone',1004));assert.equal(id.authenticated('phone',301003),false);
 assert.equal(id.card('AABBCCDD',2,1005).recognized,false);assert.equal(id.authenticated('phone',1006),false);id.close();
});
test('PIN lockout survives card retaps and expired taps cannot unlock',()=>{
 const id=new KioskIdentity(':memory:');id.arm('1234');id.card('12345678',1,1000);
 for(let i=0;i<5;i++)assert.throws(()=>id.unlock('0000',1,'phone',1001));
 id.card('12345678',2,1002);assert.throws(()=>id.unlock('1234',2,'phone',1003),/five minutes/);
 id.card('12345678',3,302000);id.unlock('1234',3,'phone',302001);id.lock();assert.equal(id.authenticated('phone',302002),false);
 id.card('12345678',4,303000);assert.throws(()=>id.unlock('1234',4,'phone',364000),/Tap/);id.close();
});
