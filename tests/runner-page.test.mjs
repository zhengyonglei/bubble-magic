import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Runner,PlayerLock,Movement,courseCue} from '../runner-core.js';
import {RunnerEffects} from '../runner-effects.js';
import {appearance,drawTracking,TrackingDiagnostics} from '../runner-tracking.js';
function page(width=1280,height=720){
 const clock={now:0},workers=[],cameraCalls=[];
 class FakeWorker{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}}
 const navigator={mediaDevices:{getUserMedia:async()=>{cameraCalls.push(1);return {getTracks:()=>[{stop(){}}]};}}};
 const events={},els={},buttons=['left','jump','right'].map(action=>({dataset:{action},setPointerCapture(){}}));
 const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
 const element=id=>els[id]??=( {hidden:false,textContent:'',play:async()=>{},focus(){},getBoundingClientRect:()=>({width,height}),getContext:()=>context2d});
 const document={getElementById:element,createElement:()=>element('capture'),querySelectorAll:()=>buttons,addEventListener:(n,f)=>events[n]=f};
 const window={addEventListener:(n,f)=>events[n]=f};
 const c=vm.createContext({courseCue,RunnerEffects,Runner,PlayerLock,Movement,Worker:FakeWorker,navigator,appearance,drawTracking,TrackingDiagnostics,document,window,performance:{now:()=>clock.now},requestAnimationFrame(){},console});
 vm.runInContext(readFileSync(new URL('../runner.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,''),c);
 return {c,els,events,buttons,clock,workers,cameraCalls,run:s=>vm.runInContext(s,c),key:(code)=>events.keydown({code,target:{tagName:'CANVAS'},preventDefault(){}})};
}
test('production runner automatically advances and scores without movement input',()=>{const p=page();p.els.demo.onclick();for(let n=1;n<260;n++)p.run(`frame(${n*16})`);assert.ok(+p.els.stars.textContent>0);assert.ok(p.run('game.distance')>20);p.els.pause.onclick();const d=p.run('game.distance');p.run('frame(5000)');assert.equal(p.run('game.distance'),d);p.els.again.onclick();assert.equal(p.run('game.distance'),0);assert.equal(p.run('held.size'),0);});
test('production touch release/cancel and blur clear held motion',()=>{const p=page();p.els.demo.onclick();const b=p.buttons[2],event={pointerId:3,preventDefault(){}};b.onpointerdown(event);p.run('frame(50)');assert.ok(p.run('game.distance')>0);b.onpointercancel(event);assert.equal(p.run('held.size'),0);p.key('Space');p.events.blur();assert.equal(p.run('held.size'),0);assert.equal(p.run('paused'),true);});
test('production camera uncertainty freezes collisions and rejects keyboard movement',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';game.items=[{z:.1,lane:0,kind:'star'}];motion={moving:true};");p.key('ArrowRight');p.run('frame(50)');assert.equal(p.run('game.distance'),0);assert.equal(p.run('game.stars'),0);assert.equal(p.run('game.lane'),0);assert.match(p.els.message.textContent,/raise both hands/);});

test('voxel world stays finite and bounded across course positions and screen sizes',()=>{for(const size of [[1280,720],[390,844],[1920,1080]]){const p=page(...size);for(const distance of [0,2.99,3,44.99,45,349]){p.run('game.distance='+distance+';draw()');assert.ok(p.run('faces.length')<3500);assert.ok(p.run('faces.every(f=>f.vertices.every(v=>v.every(Number.isFinite)&&project(v).every(Number.isFinite)))'));assert.equal(p.run('ctx.globalAlpha'),1);}}});

test('temporary tracking uncertainty freezes the production course until a clear match',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';ready=true;busy=true;lock.target={};lock.wait('Brief tracking gap');lastPose=100;motion={moving:true};");p.run('frame(150)');assert.equal(p.run('game.distance'),0);assert.equal(p.els.message.textContent,'Brief tracking gap');p.run('lock.waiting=false;frame(200)');assert.ok(p.run('game.distance')>0);});

test('camera auto-run needs a fresh locked player but no marching signal',()=>{const p=page();p.els.demo.onclick();p.run("mode='camera';ready=true;busy=true;lock.target={};lastPose=100;motion={jump:false,lane:0};frame(150)");assert.ok(p.run('game.distance')>0);const d=p.run('game.distance');p.run('frame(900)');assert.equal(p.run('game.distance'),d);p.run('lastPose=950;lock.waiting=false;frame(950)');assert.ok(p.run('game.distance')>d);});

test('camera replay reopens camera and recalibrates lane center before running',async()=>{const p=page();const pose=x=>Array.from({length:33},(_,i)=>({x:x+([11,23,25,27].includes(i)?-.08:.08),y:[11,12].includes(i)?.3:[15,16].includes(i)?.1:[23,24].includes(i)?.55:.8,visibility:.99}));
 const send=(worker,x,t)=>{p.clock.now=t;worker.onmessage({data:{type:'result',landmarks:[pose(x)],stamp:t}});};
 await p.els.camera.onclick();const first=p.workers[0];first.onmessage({data:{type:'ready'}});send(first,.5,0);send(first,.5,1300);assert.ok(p.run('lock.target'));p.run('busy=true;game.distance=349.9;frame(1316)');assert.equal(p.run('game.finished'),true);assert.equal(first.terminated,true);
 await p.els.again.onclick();assert.equal(p.cameraCalls.length,2);assert.equal(p.run('mode'),'camera');assert.equal(p.run('lock.target'),null);assert.equal(p.run('movement.base'),null);p.run('frame(1400)');assert.equal(p.run('game.distance'),0);
 first.onmessage({data:{type:'ready'}});assert.equal(p.run('ready'),false);const second=p.workers[1];second.onmessage({data:{type:'ready'}});send(second,.62,2000);send(second,.62,3300);assert.ok(p.run('lock.target'));send(second,.52,3400);assert.equal(p.run('game.lane'),1);assert.ok(Math.abs(p.run('movement.base.x')-.62)<.001);
});
test('star hit and finish events produce feedback once and reset on replay',()=>{const p=page();p.els.demo.onclick();p.run("game.items=[{z:.1,lane:0,kind:'star'},{z:.4,lane:0,kind:'log'}];frame(50)");assert.equal(p.run('effects.flights.length'),1);p.run('frame(100)');assert.ok(p.run('effects.hit')>0);assert.ok(p.run('effects.labels.some(p=>p.text.includes("BONK"))'));p.els.pause.onclick();const hit=p.run('effects.hit');p.run('frame(150)');assert.equal(p.run('effects.hit'),hit);p.els.pause.onclick();p.run('game.distance=349.9;frame(200)');assert.ok(p.run('effects.celebration')>0);assert.equal(p.els.finish.hidden,false);p.els.again.onclick();assert.equal(p.run('effects.celebration'),0);assert.equal(p.run('effects.particles.length'),0);});

test('duck controls and tunnels are absent from the shipped interface and simulation',()=>{const html=readFileSync(new URL('../runner.html',import.meta.url),'utf8');assert.doesNotMatch(html,/duck|squat|tunnel|arches/i);const p=page();p.els.demo.onclick();p.key('KeyS');p.key('ArrowDown');assert.equal(p.run('held.size'),0);assert.equal(p.run('game.items.some(i=>i.kind==="arch")'),false);});
test('copy diagnostics works without clipboard permission through a visible report',async()=>{const p=page();p.els['tracking-report']={focus(){},select(){},hidden:true};p.run("diagnostics.sample(100,45,55);diagnostics.state('pose-gap',100)");await p.els['copy-tracking'].onclick();assert.equal(p.els['tracking-report'].hidden,false);assert.match(p.els['tracking-report'].value,/runner-08/);});
