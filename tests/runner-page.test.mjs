import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Runner,PlayerLock,Movement} from '../runner-core.js';
import {appearance,drawTracking} from '../runner-tracking.js';
function page(width=1280,height=720){
 const events={},els={},buttons=['left','jump','duck','right'].map(action=>({dataset:{action},setPointerCapture(){}}));
 const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
 const element=id=>els[id]??=( {hidden:false,textContent:'',focus(){},getBoundingClientRect:()=>({width,height}),getContext:()=>context2d});
 const document={getElementById:element,createElement:()=>element('capture'),querySelectorAll:()=>buttons,addEventListener:(n,f)=>events[n]=f};
 const window={addEventListener:(n,f)=>events[n]=f};
 const c=vm.createContext({Runner,PlayerLock,Movement,appearance,drawTracking,document,window,performance:{now:()=>0},requestAnimationFrame(){},console});
 vm.runInContext(readFileSync(new URL('../runner.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,''),c);
 return {c,els,events,buttons,run:s=>vm.runInContext(s,c),key:(code)=>events.keydown({code,target:{tagName:'CANVAS'},preventDefault(){}})};
}
test('production runner automatically advances and scores without movement input',()=>{const p=page();p.els.demo.onclick();for(let n=1;n<260;n++)p.run(`frame(${n*16})`);assert.ok(+p.els.stars.textContent>0);assert.ok(p.run('game.distance')>20);p.els.pause.onclick();const d=p.run('game.distance');p.run('frame(5000)');assert.equal(p.run('game.distance'),d);p.els.again.onclick();assert.equal(p.run('game.distance'),0);assert.equal(p.run('held.size'),0);});
test('production touch release/cancel and blur clear held motion',()=>{const p=page();p.els.demo.onclick();const b=p.buttons[2],event={pointerId:3,preventDefault(){}};b.onpointerdown(event);p.run('frame(50)');assert.ok(p.run('game.distance')>0);b.onpointercancel(event);assert.equal(p.run('held.size'),0);p.key('KeyS');p.events.blur();assert.equal(p.run('held.size'),0);assert.equal(p.run('paused'),true);});
test('production camera uncertainty freezes collisions and rejects keyboard movement',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';game.items=[{z:.1,lane:0,kind:'star'}];motion={moving:true};");p.key('ArrowRight');p.run('frame(50)');assert.equal(p.run('game.distance'),0);assert.equal(p.run('game.stars'),0);assert.equal(p.run('game.lane'),0);assert.match(p.els.message.textContent,/raise both hands/);});

test('voxel world stays finite and bounded across course positions and screen sizes',()=>{for(const size of [[1280,720],[390,844],[1920,1080]]){const p=page(...size);for(const distance of [0,2.99,3,44.99,45,349]){p.run('game.distance='+distance+';draw()');assert.ok(p.run('faces.length')<3500);assert.ok(p.run('faces.every(f=>f.vertices.every(v=>v.every(Number.isFinite)&&project(v).every(Number.isFinite)))'));assert.equal(p.run('ctx.globalAlpha'),1);}}});

test('temporary tracking uncertainty freezes the production course until a clear match',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';ready=true;busy=true;lock.target={};lock.wait('Brief tracking gap');lastPose=100;motion={moving:true};");p.run('frame(150)');assert.equal(p.run('game.distance'),0);assert.equal(p.els.message.textContent,'Brief tracking gap');p.run('lock.waiting=false;frame(200)');assert.ok(p.run('game.distance')>0);});

test('camera auto-run needs a fresh locked player but no marching signal',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';ready=true;busy=true;lock.target={};lastPose=100;motion={jump:false,duck:false,lane:0};frame(150)");assert.ok(p.run('game.distance')>0);const d=p.run('game.distance');p.run('frame(900)');assert.equal(p.run('game.distance'),d);p.run('lastPose=950;frame(950)');assert.ok(p.run('game.distance')>d);});
