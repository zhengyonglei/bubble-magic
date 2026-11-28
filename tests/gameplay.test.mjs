import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../game-core.js';
import * as modes from '../game-modes.js';
import * as fairyModule from '../bubble-fairies.js';
import * as remixModule from '../fruit-remix.js';
import * as tree from '../tree-game.js';
import {GardenMusic} from '../music.js';
// Execute the production update loop with synthetic input and a minimal DOM, without a camera.
function game(){
 const nodes=new Map();const ctx=new Proxy({},{get:(_,key)=>key==='createRadialGradient'||key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 const element=()=>({textContent:'',hidden:false,open:false,checked:false,dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},focus(){},pause(){},load(){},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:600}),querySelector:()=>element()});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const rewards=[5,15,30].map(n=>{const e=element();e.dataset.reward=n;const progress=element(),small=element();e.querySelector=q=>q==='progress'?progress:small;return e;});
 const events={};const sandbox={...fairyModule,...remixModule,...tree,GardenMusic,...core,...modes,URL,Image:class{},ResizeObserver:class{observe(){}},performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),requestAnimationFrame(){},setTimeout(){},clearTimeout(){},window:{addEventListener(){}},document:{documentElement:element(),hidden:false,getElementById:node,createElement:element,querySelector:node,querySelectorAll:q=>q==='[data-reward]'?rewards:[],addEventListener(type,fn){events[type]=fn;}}};
 vm.createContext(sandbox);
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../app.js',import.meta.url).href));
 vm.runInContext(source,sandbox);
 return {run:code=>vm.runInContext(code,sandbox),nodes,rewards,sandbox,events};
}
test('production loop auto-starts and scores each game with floating points',()=>{
 for(const type of ['bubbles','fruit','pets','remix']){
 const g=game();g.run(`selectedGame='${type}';baseSession('demo');ready();for(let i=0;i<31;i++)step(.1,i*100);`);
 assert.equal(g.run('phase'),'playing');
 g.run(`targets=[];spawnClock=0;pointer={x:.5,y:.5,active:true};previousActive=true;recoveryUntil=0;mousePrev={x:.49,y:.5,time:3100};targets=[{id:99,x:.5,y:${type==='pets'?'.4495':'.5'},r:.05,type:'${type==='bubbles'?'bubble':(type==='fruit'||type==='remix')?'fruit':'cat'}',fruit:0,life:0,ttl:10,vx:0,vy:0,seed:0}];step(.05,3150);step(.01,3160);`);
 assert.equal(g.run('round.score'),10,type);assert.equal(Number(g.nodes.get('score').textContent),10,type);assert.equal(g.run('totalPops'),1);assert.equal(g.run("labels.some(l=>l.text==='+10')"),true);
 }
});
test('production rewards fill bars and unlock crown and wings across rounds',()=>{const g=game();g.run("baseSession('demo');startRound();pointer={x:.5,y:.5,active:true};for(let i=0;i<30;i++){targets=[{id:100+i,x:.5,y:.5,r:.05,type:'bubble',life:0,ttl:10,vx:0,vy:0,seed:0}];spawnClock=0;step(.01,2000+i*10);}");assert.equal(g.run('rewardLevel(totalPops)'),3);assert.equal(g.rewards[1].querySelector('progress').value,15);assert.equal(g.rewards[2].querySelector('progress').value,30);g.run('startRound()');assert.equal(g.run('totalPops'),30);assert.equal(g.run('round.score'),0);});
test('solo medium and hard spawn cacti; easy never does',()=>{for(const difficulty of ['easy','medium','hard']){const g=game();g.run(`selectedGame='fruit';setMode('${difficulty}');setPlayers(1);baseSession('demo');startRound();let sawCactus=false;for(let i=0;i<100;i++){step(.1,i*100);sawCactus ||= targets.some(t=>t.type==='cactus');}`);assert.equal(g.run('sawCactus'),difficulty!=='easy',difficulty);}});

test('caught animals remain full-size for visible entry and pause with the game',()=>{const g=game();g.run("selectedGame='pets';baseSession('demo');startRound();spawnClock=0;pointer={x:.5,y:.5,active:true};targets=[{id:99,x:.5,y:.4495,r:.05,type:'cat',life:0,ttl:10,vx:0,vy:0,seed:0}];step(.05,2000);for(let i=0;i<10;i++)step(.1,2100+i*100);");assert.equal(g.run('caughtPets.length'),1);assert.equal(g.run('caughtPets[0].r'),.05);const age=g.run('caughtPets[0].life');g.run('manualPause=true;step(.5,4000)');assert.equal(g.run('caughtPets[0].life'),age);g.run('manualPause=false;for(let i=0;i<20;i++)step(.1,4100+i*100)');assert.equal(g.run('caughtPets.length'),0);assert.equal(g.run('round.score'),10);});


test('bubble party produces wand bubbles with decorative fairies and no hazards',()=>{const g=game();g.run("chooseGame('bubbles');baseSession('demo');startRound();fairyGarden=new FairyGarden(()=>.1);for(let i=0;i<100;i++)step(.1,i*100);");assert.equal(g.nodes.get('.mode-picker').hidden,true);assert.ok(g.run('fairyGarden.fairies.length')>=2);assert.ok(g.run('targets.length')>3);assert.equal(g.run('targets.every(t=>t.fairyBubble)'),true);assert.equal(g.run("targets.some(t=>t.type==='cactus')"),false);});
test('two quick finger taps score once each even when released before the next frame',()=>{const g=game();g.run("baseSession('demo');startRound();spawnClock=0;targets=[.3,.7].map((x,i)=>({id:100+i,x,y:.5,r:.04,type:'bubble',life:0,ttl:10,vx:0,vy:0,seed:0}));for(const [id,x] of [[1,300],[2,700]]){canvas.onpointerdown({pointerId:id,pointerType:'touch',clientX:x,clientY:300,preventDefault(){}});canvas.onpointerup({pointerId:id,preventDefault(){}});}step(.01,2000);");assert.equal(g.run('round.score'),20);assert.equal(g.run('fingers.size'),0);assert.equal(g.run('popRings.length'),2);g.run('step(.01,2010)');assert.equal(g.run('round.score'),20);});
test('cancelled fingers do not leave active touch controls',()=>{const g=game();g.run("baseSession('demo');canvas.onpointerdown({pointerId:1,pointerType:'touch',clientX:300,clientY:300,preventDefault(){}});canvas.onpointercancel({pointerId:1});");assert.equal(g.run('fingers.size'),0);});

test('mobile finger swipe slices fruit and records a glowing trail',()=>{const g=game();g.run("selectedGame='fruit';baseSession('demo');startRound();spawnClock=0;targets=[{id:99,x:.5,y:.5,r:.06,type:'fruit',fruit:2,life:0,ttl:10,vx:0,vy:0,seed:0}];canvas.onpointerdown({pointerId:1,pointerType:'touch',clientX:200,clientY:300,preventDefault(){}});canvas.onpointermove({pointerId:1,pointerType:'touch',clientX:800,clientY:300,preventDefault(){}});canvas.onpointerup({pointerId:1,preventDefault(){}});step(.01,100);");assert.equal(g.run('round.score'),10);assert.equal(g.run('slices.length'),2);assert.ok(g.run("swipeTrails.get('finger:1').length")>=2);g.run('step(.01,700)');assert.equal(g.run('swipeTrails.size'),0);});

test('side-entry fruit cannot be sliced until it is fully in view',()=>{const g=game();g.run("selectedGame='fruit';baseSession('demo');startRound();spawnClock=0;pointer={x:.01,y:.5,active:true};mousePrev={x:0,y:.5,time:90};targets=[{id:99,x:.01,y:.5,r:.06,type:'fruit',fruit:0,life:.4,ttl:10,vx:0,vy:0,gravity:0,tossed:true,seed:0}];step(.01,100);");assert.equal(g.run('round.score'),0);g.run("targets[0].x=.5;pointer.x=.5;mousePrev={x:.49,y:.5,time:190};step(.01,200);");assert.equal(g.run('round.score'),10);});


test('all games render active hands with loaded and fallback artwork',()=>{
 for(const type of ['bubbles','fruit','pets','remix'])for(const loaded of [false,true]){
  const g=game();
  g.run("selectedGame='"+type+"';baseSession('demo');startRound();pointer={x:.5,y:.5,active:true};art.garden.complete=true;art.garden.naturalWidth=1280;art.garden.naturalHeight=720;");
  if(loaded)g.run('for(const img of Object.values(art)){img.complete=true;img.naturalWidth=1024;img.naturalHeight=1024;}');
  assert.doesNotThrow(()=>g.run('step(.016,100);draw(100);step(.016,116);draw(116);'),type+' loaded='+loaded);
 }
});


test('complete rounds render and end across games, difficulties and artwork states',()=>{
 for(const type of ['bubbles','fruit','pets','remix'])for(const difficulty of ['easy','medium','hard'])for(const loaded of [false,true]){
  const g=game();g.run("selectedGame='"+type+"';setMode('"+difficulty+"');baseSession('demo');startRound();pointer={x:.5,y:.5,active:true};");
  if(loaded)g.run('for(const img of Object.values(art)){img.complete=true;img.naturalWidth=1024;img.naturalHeight=1024;}');
  assert.doesNotThrow(()=>g.run('for(let i=1;i<=620;i++){if(selectedGame==="pets"&&i%10===0)shakePending=true;step(.1,i*100);draw(i*100);}'),type+' '+difficulty+' loaded='+loaded);
  assert.equal(g.run('phase'),'ended');
 }
});
test('camera players render all earned wearables with and without artwork',()=>{
 for(const type of ['bubbles','fruit','pets','remix'])for(const loaded of [false,true]){
  const g=game();g.run("selectedGame='"+type+"';baseSession('camera');startRound();totalPops=30;previewRewards=true;const pose=Array.from({length:33},(_,i)=>({x:i%2?.4:.6,y:i<10?.25:.5,visibility:1}));updatePlayers([pose],100);updatePlayers([pose],116);lastResult=116;frameCanvas.width=640;frameCanvas.height=480;");
  if(loaded)g.run('for(const img of Object.values(art)){img.complete=true;img.naturalWidth=1024;img.naturalHeight=1024;}');
  assert.doesNotThrow(()=>g.run('step(.016,116);draw(116);'));
 }
});
test('fullscreen enters, exits, and falls back to expanded view with Escape',async()=>{
 const g=game(),d=g.sandbox.document;let entered=0,exited=0;
 d.documentElement.requestFullscreen=async()=>{entered++;d.fullscreenElement=d.documentElement;};
 d.exitFullscreen=async()=>{exited++;d.fullscreenElement=null;};
 await g.nodes.get('fullscreen').onclick();assert.equal(entered,1);
 await g.nodes.get('fullscreen').onclick();assert.equal(exited,1);
 d.documentElement.requestFullscreen=async()=>{throw Error('unsupported');};
 await g.nodes.get('fullscreen').onclick();assert.equal(g.run('expanded'),true);
 g.events.keydown({key:'Escape'});assert.equal(g.run('expanded'),false);
});
test('muted music stays off and enabled music silences on pause, hidden tab, settings and round end',()=>{
 const g=game();g.run("sound=false;baseSession('demo');startRound();music={update(on){this.on=on;}};audio={resume:async()=>{}};step(.016,100);");assert.equal(g.run('music.on'),false);
 g.run('sound=true;step(.016,116)');assert.equal(g.run('music.on'),true);
 g.nodes.get('pause').onclick();assert.equal(g.run('music.on'),false);
 g.nodes.get('pause').onclick();g.run('step(.016,132)');assert.equal(g.run('music.on'),true);
 g.sandbox.document.hidden=true;g.events.visibilitychange();assert.equal(g.run('music.on'),false);
 g.sandbox.document.hidden=false;g.run('step(.016,148);');g.nodes.get('settings').open=true;g.run('step(.016,164)');assert.equal(g.run('music.on'),false);
 g.nodes.get('settings').open=false;g.run('step(.016,180);endRound()');assert.equal(g.run('music.on'),false);
});
test('audio initialization failures restore the off control without throwing',async()=>{
 const g=game();g.sandbox.window.AudioContext=class{constructor(){throw Error('no audio');}};g.run('sound=false');
 await g.nodes.get('sound').onclick();assert.equal(g.run('sound'),false);
});


test('tree needs repeated jumps before objects fall, then net catches score once',()=>{
 const g=game();g.run("chooseGame('pets');baseSession('demo');startRound();pointer={x:.5,y:.65,active:true};step(.1,100);");assert.equal(g.run('targets.length'),0);
 g.run("$('shake-tree').onclick();step(.1,200)");assert.equal(g.run('treeItems.length'),4);assert.equal(g.run('targets.length'),0);
 g.run('for(let i=0;i<3;i++){shakeCooldown=0;shakePending=true;step(.1,300+i*100);}');assert.ok(g.run('targets.length')>0);
 g.run("targets=[{id:999,type:'cat',x:.5,y:.65,r:.05,vy:0,vx:0,gravity:0,treeDrop:true,life:0,ttl:10}];step(.01,700);step(.01,710);");assert.equal(g.run('round.score'),10);assert.equal(g.run('caughtPets.length'),1);
 g.run('draw(710)');
});
test('two camera players have independent nets; either can catch without duplicate score',()=>{
 const g=game();g.run("selectedGame='pets';baseSession('camera');startRound();lastResult=1000;hands=[{playerId:1,x:.2,y:.6},{playerId:1,x:.4,y:.6},{playerId:2,x:.6,y:.6},{playerId:2,x:.8,y:.6}].map((h,i)=>({...h,id:i,seen:1000,confidence:1}));targets=[{id:1,type:'cat',x:.3,y:.6,r:.03,life:0,ttl:10,vx:0,vy:0,treeDrop:true,gravity:0},{id:2,type:'apple',fruit:0,x:.7,y:.6,r:.03,life:0,ttl:10,vx:0,vy:0,treeDrop:true,gravity:0}];step(.01,1000);draw(1000);");assert.equal(g.run('treeNets.length'),2);assert.equal(g.run('round.score'),20);assert.equal(g.run('caughtPets.length'),2);
});
test('paused and ended tree rounds ignore jump input',()=>{
 const g=game();g.run("selectedGame='pets';baseSession('demo');startRound();manualPause=true;$('shake-tree').onclick();step(.1,100);");assert.equal(g.run('treeItems.length'),0);g.run("manualPause=false;endRound();$('shake-tree').onclick();step(.1,200)");assert.equal(g.run('treeItems.length'),0);
});


test('camera torso jump advances tree while a stationary player does not',()=>{
 const g=game();g.run("selectedGame='pets';baseSession('camera');startRound();const p=Array.from({length:33},(_,i)=>({x:i%2?.4:.6,y:i>=23?.7:.5,visibility:1}));updatePlayers([p],100);updatePlayers([p],116);step(.016,116);step(.016,132);");assert.equal(g.run('treeItems.length'),0);g.run("const raised=p.map(v=>({...v,y:v.y-.12}));updatePlayers([raised],200);step(.016,200)");assert.equal(g.run('treeItems.length'),4);g.run('step(.016,216)');assert.equal(g.run('treeItems.length'),4);
});


test('all games map the complete camera frame to the full play area at every aspect ratio',()=>{
 for(const type of ['bubbles','fruit','pets','remix'])for(const [width,height] of [[1920,1016],[1000,600],[390,772]]){
 const g=game();g.run("selectedGame='"+type+"';W="+width+";H="+height+";frameCanvas.width=640;frameCanvas.height=480;");
 assert.equal(g.run('imageRect().w'),width);assert.equal(g.run('imageRect().h'),height);assert.equal(g.run('imageRect().x'),0);assert.equal(g.run('imageRect().y'),0);
 assert.equal(g.run('screenPoint({x:0,y:0}).x'),1);assert.equal(g.run('screenPoint({x:1,y:1}).x'),0);assert.equal(g.run('screenPoint({x:1,y:1}).y'),1);assert.equal(g.run('screenPoint({x:.5,y:.5}).x'),.5);
 }
});


test('starting any game enables its background music without a separate sound click',()=>{
 for(const type of ['bubbles','fruit','pets','remix']){
  const g=game();let resumes=0;
  g.sandbox.window.AudioContext=class{state='running';resume(){resumes++;return Promise.resolve();}};
  g.sandbox.GardenMusic=class{update(on,game){this.on=on;this.game=game;}};
  assert.equal(g.run('sound'),true);
  g.run("selectedGame='"+type+"';baseSession('demo');startRound();step(.016,100);");
  assert.equal(resumes,1);assert.equal(g.run('music.on'),true);assert.equal(g.run('music.game'),type==='remix'?'fruit':type);
  g.nodes.get('sound').onclick();assert.equal(g.run('music.on'),false);
  g.run("baseSession('demo');startRound();step(.016,116)");assert.equal(g.run('music.on'),false);assert.equal(resumes,1);
 }
});
test('camera and video session starts also unlock audio',()=>{
 for(const source of ['camera','video']){const g=game();let resumes=0;
 g.sandbox.window.AudioContext=class{resume(){resumes++;return Promise.resolve();}};g.sandbox.GardenMusic=class{update(){}};
 g.run("baseSession('"+source+"')");assert.equal(resumes,1);assert.equal(g.run('sound'),true);
 }
});


test('tree party has no difficulty or hazards and releases larger mixed batches',()=>{const g=game();g.run("selectedGame='fruit';setMode('hard');chooseGame('pets');baseSession('demo');startRound();pointer={x:.5,y:.8,active:true};for(let i=0;i<8;i++){shakeCooldown=0;shakePending=true;step(.1,100+i*100);draw(100+i*100);}");assert.equal(g.nodes.get('.mode-picker').hidden,true);assert.equal(g.run('difficulty'),'easy');assert.equal(g.run('config.hazards'),false);assert.equal(g.run('mode'),'gentle');assert.equal(g.run('level().max'),14);assert.ok(g.run('targets.length')>5);assert.equal(g.run("targets.some(t=>t.type==='cactus')"),false);});

test('remix finger sweep scores a combo, draws juicy halves, resets on replay and never enables hazards',()=>{const g=game();g.run("chooseGame('remix');config.hazards=true;baseSession('demo');startRound();targets=[.35,.5,.65].map((x,i)=>({id:99+i,x,y:.5,r:.05,type:'fruit',fruit:i,life:.4,ttl:10,vx:0,vy:0,seed:0,color:'#ff8844'}));canvas.onpointerdown({pointerId:1,pointerType:'touch',clientX:200,clientY:300,preventDefault(){}});canvas.onpointermove({pointerId:1,pointerType:'touch',clientX:800,clientY:300,preventDefault(){}});canvas.onpointerup({pointerId:1,preventDefault(){}});step(.01,100);draw(100);");assert.equal(g.run('round.score'),60);assert.equal(g.run('config.hazards'),false);assert.equal(g.run('slices.filter(s=>s.remix).length'),6);assert.ok(g.run("labels.some(l=>l.text.includes('3 FRUIT COMBO'))"));g.run('manualPause=true;step(.1,200)');assert.equal(g.run('remix.clock'),.01);g.run('startRound()');assert.equal(g.run('remix.swipes.size'),0);assert.equal(g.run('round.score'),0);});
test('Remix admits four camera players, gives paired hands the same style and preserves other game selection',()=>{
 const g=game();g.run("config.players=1;chooseGame('remix');baseSession('camera');ready();const four=[.12,.37,.62,.87].map(x=>Array.from({length:33},(_,i)=>({x:x+(i%2?.025:-.025),y:i<20?.4:.65,visibility:1})));for(let t=0;t<=1000;t+=100)updatePlayers(four,t);lastResult=1000;step(.016,1000);draw(1000);");
 assert.equal(g.run('sessionConfig.players'),4);assert.equal(g.run('config.players'),1);assert.equal(g.run('players.length'),4);assert.equal(g.run('hands.length'),8);assert.equal(g.run('new Set(hands.map(h=>h.trailSlot)).size'),4);assert.equal(g.nodes.get('player-picker').hidden,true);
 assert.equal(g.run('hands.every(h=>hands.filter(p=>p.playerId===h.playerId).every(p=>p.trailSlot===h.trailSlot))'),true);
 g.run("chooseGame('fruit');baseSession('camera');");assert.equal(g.run('sessionConfig.players'),1);assert.equal(g.nodes.get('player-picker').hidden,false);
});
test('production Remix waves use joined camera population and reduce after players leave',()=>{
 const g=game();g.run("chooseGame('remix');baseSession('camera');startRound();const group=[.12,.37,.62,.87].map(x=>Array.from({length:33},(_,i)=>({x:x+(i%2?.025:-.025),y:i<20?.4:.65,visibility:1})));for(let t=0;t<=1000;t+=100)updatePlayers(group,t);lastResult=1000;remix.nextWave=0;step(.01,1000);");assert.equal(g.run('targets.length'),10);
 g.run('for(let t=1100;t<=2700;t+=100)updatePlayers(group.slice(0,1),t);lastResult=2700;targets=[];remix.nextWave=0;step(.01,2700);');assert.equal(g.run('targets.length'),4);
});
test('Bubble Magic automatically joins four players and restores manual selection for other games',()=>{
 const g=game();g.run("config.players=1;chooseGame('bubbles');baseSession('camera');ready();const group=[.12,.37,.62,.87].map(x=>Array.from({length:33},(_,i)=>({x:x+(i%2?.025:-.025),y:i<20?.4:.65,visibility:1})));for(let t=0;t<=1000;t+=100)updatePlayers(group,t);lastResult=1000;step(.016,1000);draw(1000);");
 assert.equal(g.run('sessionConfig.players'),4);assert.equal(g.run('players.length'),4);assert.equal(g.run('hands.length'),8);assert.equal(g.nodes.get('player-picker').hidden,true);assert.equal(g.nodes.get('player-setting').hidden,true);
 g.run('updatePlayers([],1100)');assert.equal(g.run('hands.length'),0);g.run('updatePlayers(group.slice(0,2),1200)');assert.equal(g.run('hands.length'),4);
 g.run("chooseGame('fruit');baseSession('camera')");assert.equal(g.run('sessionConfig.players'),1);assert.equal(g.nodes.get('player-picker').hidden,false);
});
test('giant bubble scores once and releases six separately poppable children; pause and replay reset fairies',()=>{
 const g=game();g.run("chooseGame('bubbles');baseSession('demo');startRound();fairyGarden.nextGroup=100;pointer={x:.5,y:.5,active:true};targets=[{id:99,type:'bubble',fairyBubble:true,giant:true,x:.5,y:.5,r:.1,fullR:.1,life:1,ttl:12,vx:0,vy:0,seed:0,color:'#ffeeaa',popDelay:.3}];step(.01,100);");
 assert.equal(g.run('round.score'),10);assert.equal(g.run('targets.length'),6);assert.equal(g.run('new Set(targets.map(t=>t.id)).size'),6);g.run('step(.01,110)');assert.equal(g.run('round.score'),10);
 g.run('pointer.active=false;for(let i=0;i<6;i++)step(.1,200+i*100);pointer={x:targets[0].x,y:targets[0].y,active:true};mousePrev=null;step(.01,900);');assert.ok(g.run('round.score')>10);assert.equal(g.run('targets.some(t=>t.giant)'),false);
 const clock=g.run('fairyGarden.clock');g.run('manualPause=true;step(.1,1000)');assert.equal(g.run('fairyGarden.clock'),clock);g.run('startRound()');assert.equal(g.run('fairyGarden.fairies.length'),0);assert.equal(g.run('targets.length'),0);
});
test('all shared games honor each round length, pause time, and keep mid-round changes for replay',()=>{
 for(const type of ['bubbles','fruit','pets','remix'])for(const duration of [60,120,180,300]){const g=game();g.run(`chooseGame('${type}');setDuration(${duration});baseSession('demo');startRound();`);assert.equal(g.run('round.duration'),duration);assert.equal(g.nodes.get('time').textContent,`${duration/60}:00`);g.run('manualPause=true;step(.1,100)');assert.equal(g.run('round.time'),0);g.run('manualPause=false');for(let i=0;i<duration*10-1;i++)g.run(`step(.1,${1000+i*100})`);assert.equal(g.run('phase'),'playing');g.run('step(.2,999999)');assert.equal(g.run('phase'),'ended');}
 const g=game();g.nodes.get('duration').value='180';g.nodes.get('duration').onchange();assert.equal(g.nodes.get('duration-setting').value,'180');g.run("baseSession('demo');startRound()");g.nodes.get('duration-setting').value='300';g.nodes.get('duration-setting').onchange();assert.equal(g.run('round.duration'),180);g.run('startRound()');assert.equal(g.run('round.duration'),300);g.run('setDuration(999)');assert.equal(g.run('config.duration'),60);
});
