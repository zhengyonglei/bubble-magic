import test from 'node:test';
import assert from 'node:assert/strict';
import {FruitRemix} from '../fruit-remix.js';
test('remix waves enter from both sides, grow toward finale and never contain obstacles',()=>{
 for(const aspect of [.56,1.8]){const r=new FruitRemix();for(const [time,count] of [[0,4],[20,5],[40,6],[51,8]]){const wave=r.update(4,time,aspect,.42,()=>.5);assert.equal(wave.length,count);assert.ok(wave.every(t=>t.type==='fruit'&&(t.x<0||t.x>1)&&Number.isFinite(t.vx)));}assert.equal(r.banner,'FRUIT SHOWER!');}
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
test('Remix scales next wave with joined player count and scales back after departure',()=>{
 const r=new FruitRemix();for(const [people,count] of [[1,4],[2,6],[3,8],[4,10],[2,6],[1,4]]){const wave=r.update(10,0,.56,.42,()=>.5,people);assert.equal(wave.length,count);if(people>1){assert.ok(wave.some(t=>t.x<0));assert.ok(wave.some(t=>t.x>1));}}
 assert.equal(r.update(10,51,.56,.42,()=>.5,4).length,14);assert.equal(r.update(10,51,.56,.42,()=>.5,99).length,14);
});
test('long Remix rounds alternate gentle and busy waves, saving finale for their final ten seconds',()=>{
 for(const duration of [120,180,300]){const r=new FruitRemix();const wave=t=>r.update(4,t,.56,.42,()=>.5,1,duration).length;assert.equal(wave(0),4);assert.equal(wave(40),6);assert.equal(wave(50),4);assert.equal(wave(90),6);assert.notEqual(wave(duration-11),8);assert.equal(wave(duration-10),8);assert.equal(r.banner,'FRUIT SHOWER!');}
});
test('Remix varies reachable flight arcs and entry heights without faster or offscreen apexes',()=>{
 let seed=11;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;const r=new FruitRemix(),heights=[],destinations=[],speeds=[];let both=0;
 for(let i=0;i<60;i++){const wave=r.update(4,20,1.8,.42,random);if(wave.some(t=>t.x<0)&&wave.some(t=>t.x>1))both++;for(const t of wave){const apex=-t.vy/t.gravity,x=t.x+t.vx*apex,y=t.y+t.vy*apex+.5*t.gravity*apex*apex;assert.ok(apex>=1.16&&apex<=1.8);assert.ok(x>=.23-1e-9&&x<=.77+1e-9);assert.ok(y>=.24-1e-9&&y<=.56);assert.ok(t.x<0||t.x>1);heights.push(t.y);destinations.push(x);speeds.push(apex);}}
 assert.ok(Math.max(...heights)-Math.min(...heights)>.25);assert.ok(Math.max(...destinations)-Math.min(...destinations)>.4);assert.ok(Math.max(...speeds)-Math.min(...speeds)>.3);assert.ok(both>5&&both<55);
});
test('Remix schedules small separated clusters with different destinations and varied throw angles',()=>{
 let seed=91;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646,r=new FruitRemix(),angles=[];
 for(let n=0;n<50;n++){const wave=r.update(10,20,.56,.42,random,4),groups=new Map();for(const f of wave){if(!groups.has(f.cluster))groups.set(f.cluster,[]);groups.get(f.cluster).push(f);angles.push(Math.atan2(-f.vy,Math.abs(f.vx)/.56));}let lastTime=-1,lastX=null;for(const group of groups.values()){assert.ok(group.length>=2&&group.length<=3);const time=group[0].launchDelay;assert.ok(time-lastTime>=.69);lastTime=time;const x=group.reduce((sum,f)=>sum+f.x+f.vx*(-f.vy/f.gravity),0)/group.length;if(lastX!==null)assert.ok(Math.abs(x-lastX)>.15);lastX=x;}assert.ok(r.nextWave-r.clock>wave.at(-1).launchDelay);}
 assert.ok(Math.max(...angles)-Math.min(...angles)>.35);
});
