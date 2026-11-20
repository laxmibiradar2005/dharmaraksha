import test from 'node:test';
import assert from 'node:assert/strict';
import { BudgetLedger } from '../lib/aiBudget';
import { searchLaws, legalStatus } from '../lib/legalRag';
test('budget rejects overspend and retains reservations',()=>{const b=new BudgetLedger(':memory:');try{b.reserve('test',2,'test',3,3);assert.throws(()=>b.reserve('test',2,'test',3,3));assert.throws(()=>b.reserve('test',NaN,'test',3,3));}finally{b.close()}});
test('official corpus retrieval returns relevant pages and rejects query syntax injection',()=>{assert.equal(legalStatus().ready,true);assert.ok(searchLaws('free consent section 14 contract')[0].id.startsWith('contract-'));assert.ok(searchLaws('BNSS bail').some(s=>s.id.startsWith('bnss-')));assert.ok(searchLaws('domestic violence protection order').some(s=>s.id.startsWith('domestic-violence-')));assert.doesNotThrow(()=>searchLaws('" OR * NEAR( DROP TABLE'));assert.deepEqual(searchLaws('zzqxyznonexistenttoken'),[]);});
