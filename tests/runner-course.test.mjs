import test from 'node:test';
import assert from 'node:assert/strict';
import {Runner,COURSE_SECTIONS,courseCue} from '../runner-core.js';
test('jump sections span every lane and cannot be dodged sideways',()=>{for(const lane of [-1,0,1]){const g=new Runner(),log=g.items.find(i=>i.fullWidth&&i.kind==='log');g.items=[log];g.lane=lane;g.x=lane*1.5;g.distance=log.z-.1;g.step(.05,{moving:true});assert.equal(g.events[0].type,'hit');}assert.equal(new Runner().items.filter(i=>i.fullWidth&&i.kind==='log').length,6);});
test('course contains only stars and logs with no overhead obstacles',()=>{const g=new Runner();assert.ok(g.items.every(i=>['star','log'].includes(i.kind)&&i.end===undefined));assert.ok(COURSE_SECTIONS.every(s=>s.type==='jump'));});
test('section cues warn early and remove conflicting legacy obstacles',()=>{assert.match(courseCue(45),/ahead/);assert.match(courseCue(64),/JUMP NOW/);assert.equal(courseCue(130),'');assert.match(courseCue(320),/golden entrance/);const g=new Runner();for(const s of COURSE_SECTIONS)assert.ok(!g.items.some(i=>!i.fullWidth&&i.kind!=='star'&&i.z>=s.start-18&&i.z<=s.end+6));});
