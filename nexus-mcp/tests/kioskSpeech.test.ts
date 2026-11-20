import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Writable, PassThrough } from 'node:stream';
import { streamKioskSpeech } from '../lib/kioskSpeech';
process.env.AI_BUDGET_DB=':memory:';
process.env.SARVAM_API_KEY='test-only';

function player(onData:(chunk:Buffer)=>void) {
  return ((_command:unknown,_args:unknown,options:any)=>{
    const child:any=new EventEmitter();child.exitCode=null;child.stderr=new PassThrough();
    child.kill=()=>{child.exitCode=1;child.emit('close',1);return true;};
    child.stdin=new Writable({write(chunk,_encoding,done){onData(chunk);done();},final(done){done();setImmediate(()=>{child.exitCode=0;child.emit('close',0);});}});
    options.signal.addEventListener('abort',()=>{child.stdin.destroy(Error('cancelled'));child.kill();},{once:true});
    return child;
  }) as any;
}
test('speech reaches the player before synthesis finishes, then reuses cached audio',async()=>{
  let finished=false,calls=0,early=false;
  const deps={spawnPlayer:player(()=>{if(!finished)early=true;}),fetcher:(async()=>{
    calls++;return new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]));setTimeout(()=>{finished=true;c.enqueue(new Uint8Array([4,5]));c.close();},40);}}));
  }) as typeof fetch};
  const input={text:'Streaming cache test',language:'hi-IN'};
  const first=await streamKioskSpeech(input,'test-sink',new AbortController().signal,deps);
  assert.equal(early,true);assert.equal(first.cached,false);
  const second=await streamKioskSpeech(input,'test-sink',new AbortController().signal,deps);
  assert.equal(second.cached,true);assert.equal(calls,1);
});
test('cancelling speech stops playback and cancels the upstream stream',async()=>{
  const control=new AbortController();let cancelled=false;
  const deps={spawnPlayer:player(()=>{control.abort();}),fetcher:(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));},cancel(){cancelled=true;}}))) as typeof fetch};
  await assert.rejects(streamKioskSpeech({text:'Cancel this speech',language:'en-IN'},'test',control.signal,deps));
  assert.equal(cancelled,true);
});
test('a rejected speech request never starts audio playback',async()=>{
  let spawned=false;
  await assert.rejects(streamKioskSpeech({text:'Unavailable test',language:'ta-IN'},'test',new AbortController().signal,{fetcher:(async()=>new Response('',{status:503})) as typeof fetch,spawnPlayer:(()=>{spawned=true;throw Error();}) as any}));
  assert.equal(spawned,false);
});
