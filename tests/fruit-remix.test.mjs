import test from 'node:test';
import assert from 'node:assert/strict';
import {FruitRemix} from '../fruit-remix.js';
test('remix waves enter from both sides, grow toward finale and never contain obstacles',()=>{
 for(const aspect of [.56,1.8]){const r=new FruitRemix();for(const [time,count] of [[0,3],[20,4],[40,5],[51,7]]){const wave=r.update(4,time,aspect,.42,()=>.5);assert.equal(wave.length,count);assert.ok(wave.every(t=>t.type==='fruit'&&(t.x<0||t.x>1)&&Number.isFinite(t.vx)));}assert.equal(r.banner,'FRUIT SHOWER!');}
});
test('swipe combos reward distinct fruits from one hand and reset on reversal or delay',()=>{
 const r=new FruitRemix(),hit=(id,now,angle=0,hand='a')=>r.hit(hand,{id,cut:{angle}},now);
 assert.equal(hit(1,0).bonus,0);assert.equal(hit(2,50).bonus,0);assert.equal(hit(3,100).bonus,30);assert.equal(hit(3,110).bonus,0);assert.equal(hit(4,130).bonus,15);
 assert.equal(hit(5,150,Math.PI).count,1);assert.equal(hit(6,500).count,1);assert.equal(hit(7,510,0,'b').count,1);assert.equal(new FruitRemix().swipes.size,0);
});
import {RemixRoster,REMIX_TRAILS} from '../fruit-remix.js';
const poseAt=x=>Array.from({length:33},(_,i)=>({x:x+(i%2?.025:-.025),y:i<20?.4:.65,visibility:1}));
test('four players join steadily, keep styles through reorder and brief gaps, and free departing slots',()=>{
 const r=new RemixRoster(),poses=[.12,.37,.62,.87].map(poseAt);
 assert.equal(r.update(poses,0).length,0);for(let t=100;t<=900;t+=100)r.update(poses,t);
 const first=r.update(poses,1000);assert.equal(first.length,4);assert.equal(new Set(first.map(p=>p.slot)).size,4);const ids=first.map(p=>p.id);
 const reversed=r.update([...poses].reverse(),1100);assert.deepEqual(reversed.map(p=>p.id),ids);
 r.update([],1200);assert.deepEqual(r.update(poses,1800).map(p=>p.id),ids);
 for(const t of [2000,2400,2800,3400])r.update(poses.slice(1),t);assert.equal(r.tracks.length,3);r.update(poses,3500);assert.equal(r.tracks.length,4);assert.equal(r.tracks.at(-1).slot,0);
 assert.equal(REMIX_TRAILS.length,4);
});
test('brief visitors do not join and fifth detection cannot claim an occupied style',()=>{
 const r=new RemixRoster();r.update([poseAt(.1)],0);r.update([],100);assert.equal(r.update([poseAt(.1)],1000).length,0);
 const full=new RemixRoster();const p=[.1,.3,.5,.7,.9].map(poseAt);full.update(p,0);for(let t=100;t<=1000;t+=100)full.update(p,t);assert.equal(full.tracks.length,4);assert.equal(full.update([],1100).length,0);
});
