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
