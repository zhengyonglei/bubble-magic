import test from 'node:test';
import assert from 'node:assert/strict';
import {RunnerEffects} from '../runner-effects.js';
import {Runner} from '../runner-core.js';
test('effects expire and fireworks remain bounded then stop',()=>{const fx=new RunnerEffects();fx.emit({type:'finish',lane:0});let max=0;for(let i=0;i<240;i++){fx.step(.05);max=Math.max(max,fx.particles.length);}assert.ok(max>40&&max<=320);assert.equal(fx.particles.length,0);assert.equal(fx.celebration,0);});
test('reduced motion uses fewer particles and pause freezes effects',()=>{const a=new RunnerEffects(),b=new RunnerEffects(true);for(const fx of [a,b])fx.emit({type:'star',lane:0});assert.ok(b.particles.length<a.particles.length);const before=JSON.stringify(a);a.step(.05,true);assert.equal(JSON.stringify(a),before);});
test('collision events distinguish hits from successful evasions and never duplicate',()=>{for(const kind of ['log','arch'])for(const avoid of [false,true]){const g=new Runner();g.items=[{z:.1,lane:0,kind}];if(avoid&&kind==='log')g.jump=.45;g.step(.05,{moving:true,duck:avoid&&kind==='arch'});assert.equal(g.events[0].type,avoid?'clear':'hit');assert.equal(g.events[0].kind,kind);g.step(.05,{moving:true});assert.equal(g.events.length,1);}});
