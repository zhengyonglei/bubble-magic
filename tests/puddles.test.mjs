import test from 'node:test';
import assert from 'node:assert/strict';
import {LandingTracker,PuddleParty,puddleBodies,SURPRISES} from '../puddle-party.js';
const body=(id=1,x=.3,y=.55)=>({id,x,y,height:.2,width:.12,foot:.85,anchors:[{x,y}]});
test('little jumps score on landing once, never on rising or ordinary jitter',()=>{
 const t=new LandingTracker();let events=[];
 for(let i=0;i<12;i++)events.push(...t.update([body(1,.3,.55+Math.sin(i)*.003)],i*50));assert.equal(events.length,0);
 assert.equal(t.update([body(1,.3,.52)],600).length,0);assert.equal(t.update([body(1,.3,.51)],650).length,0);
 assert.equal(t.update([body(1,.3,.52)],750).length,0);assert.equal(t.update([body()],850).length,1);
 for(let i=0;i<10;i++)assert.equal(t.update([body()],900+i*50).length,0);
});
test('returning from lost tracking, teleports and partial poses never manufacture landings',()=>{
 const t=new LandingTracker();t.update([body()],0);t.update([body()],300);t.update([body(1,.3,.52)],400);t.update([body(1,.3,.51)],450);
 assert.equal(t.update([body()],1000).length,0);assert.equal(t.update([body(1,.8)],1050).length,0);
 const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));pose[23].visibility=.1;
 assert.deepEqual(puddleBodies([{id:1,seen:100,pose}],p=>p,100),[]);
});
test('mud flies to a teammate, sticks only near their body, then expires',()=>{
 const p=new PuddleParty(()=>.5),b=[body(),body(2,.7)];p.land(b[0],b);
 for(let i=0;i<50;i++)p.update(.02,b,i*20);
 assert.ok(p.splats.length>0);assert.ok(p.splats.every(s=>s.id===2));
 for(let i=0;i<300;i++)p.update(.02,b,1000+i*20);assert.equal(p.splats.length,0);
 const miss=new PuddleParty(()=>.5);miss.land(b[0],b);
 for(let i=0;i<50;i++)miss.update(.02,[b[0],body(2,.95)],i*20);assert.equal(miss.splats.length,0);
});
test('solo play, nonrepeating surprises, together bonus visuals and resource caps',()=>{
 const p=new PuddleParty(()=>.4),b=body();const variants=new Set();
 for(let i=0;i<SURPRISES.length;i++){p.land(b,[b]);variants.add(p.effects.at(-1).variant);}assert.equal(variants.size,SURPRISES.length);
 p.land(body(2,.7),[b,body(2,.7)]);assert.equal(p.banner,'TOGETHER SPLOSH!');
 for(let i=0;i<100;i++)p.land(b,[b]);assert.ok(p.drops.length<=180);assert.ok(p.effects.length<=12);
 p.update(.8,[b],800);assert.ok(p.splats.length<=48);
 p.update(.01,[],810);assert.equal(p.splats.length,0);
});
