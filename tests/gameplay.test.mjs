import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../game-core.js';
import * as modes from '../game-modes.js';
// Execute the production update loop with synthetic input and a minimal DOM, without a camera.
function game(){
 const nodes=new Map();const ctx=new Proxy({},{get:()=>()=>{}});
 const element=()=>({textContent:'',hidden:false,open:false,checked:false,dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},focus(){},pause(){},load(){},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:600}),querySelector:()=>element()});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const rewards=[5,15,30].map(n=>{const e=element();e.dataset.reward=n;const progress=element(),small=element();e.querySelector=q=>q==='progress'?progress:small;return e;});
 const sandbox={...core,...modes,URL,Image:class{},ResizeObserver:class{observe(){}},performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),requestAnimationFrame(){},setTimeout(){},clearTimeout(){},window:{addEventListener(){}},document:{hidden:false,getElementById:node,createElement:element,querySelector:node,querySelectorAll:q=>q==='[data-reward]'?rewards:[],addEventListener(){}}};
 vm.createContext(sandbox);
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../app.js',import.meta.url).href));
 vm.runInContext(source,sandbox);
 return {run:code=>vm.runInContext(code,sandbox),nodes,rewards};
}
test('production loop auto-starts and scores each game with floating points',()=>{
 for(const type of ['bubbles','fruit','pets']){
 const g=game();g.run(`selectedGame='${type}';baseSession('demo');ready();for(let i=0;i<31;i++)step(.1,i*100);`);
 assert.equal(g.run('phase'),'playing');
 g.run(`targets=[];spawnClock=0;pointer={x:.5,y:.5,active:true};previousActive=true;recoveryUntil=0;mousePrev={x:.49,y:.5,time:3100};targets=[{id:99,x:.5,y:${type==='pets'?'.4495':'.5'},r:.05,type:'${type==='bubbles'?'bubble':type==='fruit'?'fruit':'cat'}',fruit:0,life:0,ttl:10,vx:0,vy:0,seed:0}];step(.05,3150);step(.01,3160);`);
 assert.equal(g.run('round.score'),10,type);assert.equal(Number(g.nodes.get('score').textContent),10,type);assert.equal(g.run('totalPops'),1);assert.equal(g.run("labels.some(l=>l.text==='+10')"),true);
 }
});
test('production rewards fill bars and unlock crown and wings across rounds',()=>{const g=game();g.run("baseSession('demo');startRound();pointer={x:.5,y:.5,active:true};for(let i=0;i<30;i++){targets=[{id:100+i,x:.5,y:.5,r:.05,type:'bubble',life:0,ttl:10,vx:0,vy:0,seed:0}];spawnClock=0;step(.01,2000+i*10);}");assert.equal(g.run('rewardLevel(totalPops)'),3);assert.equal(g.rewards[1].querySelector('progress').value,15);assert.equal(g.rewards[2].querySelector('progress').value,30);g.run('startRound()');assert.equal(g.run('totalPops'),30);assert.equal(g.run('round.score'),0);});
test('solo medium and hard spawn cacti; easy never does',()=>{for(const difficulty of ['easy','medium','hard']){const g=game();g.run(`selectedGame='pets';setMode('${difficulty}');setPlayers(1);baseSession('demo');startRound();for(let i=0;i<100;i++)step(.1,i*100);`);assert.equal(g.run("targets.some(t=>t.type==='cactus')"),difficulty!=='easy',difficulty);}});
test('production pet side collision bounces without awarding points',()=>{const g=game();g.run("selectedGame='pets';baseSession('demo');startRound();spawnClock=0;pointer={x:.5,y:.5,active:true};targets=[{id:55,x:.55,y:.54,r:.05,type:'cat',life:0,ttl:10,vx:0,vy:0,seed:0}];step(.01,2000);");assert.equal(g.run('round.score'),0);assert.ok(g.run('targets[0].vx')>0);assert.equal(g.run("labels[0].text"),'Boing!');});

test('caught animals remain full-size for visible entry and pause with the game',()=>{const g=game();g.run("selectedGame='pets';baseSession('demo');startRound();spawnClock=0;pointer={x:.5,y:.5,active:true};targets=[{id:99,x:.5,y:.4495,r:.05,type:'cat',life:0,ttl:10,vx:0,vy:0,seed:0}];step(.05,2000);for(let i=0;i<10;i++)step(.1,2100+i*100);");assert.equal(g.run('caughtPets.length'),1);assert.equal(g.run('caughtPets[0].r'),.05);const age=g.run('caughtPets[0].life');g.run('manualPause=true;step(.5,4000)');assert.equal(g.run('caughtPets[0].life'),age);g.run('manualPause=false;for(let i=0;i<20;i++)step(.1,4100+i*100)');assert.equal(g.run('caughtPets.length'),0);assert.equal(g.run('round.score'),10);});

test('camera pet catches use one midpoint basket rather than individual wrists',()=>{const g=game();g.run("selectedGame='pets';baseSession('camera');startRound();spawnClock=0;previousActive=true;lastResult=2000;hands=[{id:'1:15',playerId:1,x:.4,y:.5,r:.02,seen:2000,confidence:1,bodyWidth:.12},{id:'1:16',playerId:1,x:.6,y:.5,r:.02,seen:2000,confidence:1,bodyWidth:.12}];targets=[{id:99,x:.5,y:.4495,r:.05,type:'cat',life:0,ttl:10,vx:0,vy:0,seed:0}];step(.05,2000);");assert.equal(g.run('round.score'),10);assert.equal(g.run('caughtPets[0].handId'),'basket:1');assert.equal(g.run('caughtPets[0].hand.x'),.5);});

test('bubble party removes difficulty, fills the scene, and blows bubbles in from outside',()=>{const g=game();g.run("chooseGame('bubbles');baseSession('demo');startRound();spawnClock=0;spawn(2000);");assert.equal(g.nodes.get('.mode-picker').hidden,true);assert.ok(g.run('targets[0].x>1'));g.run('spawn(2000)');assert.ok(g.run('targets[1].x<0'));g.run('for(let i=0;i<65;i++)step(.1,2100+i*100)');assert.ok(g.run('targets.length')>=15);assert.equal(g.run("targets.some(t=>t.type==='cactus')"),false);assert.ok(g.run('targets[0].x')<1);});
test('two quick finger taps score once each even when released before the next frame',()=>{const g=game();g.run("baseSession('demo');startRound();spawnClock=0;targets=[.3,.7].map((x,i)=>({id:100+i,x,y:.5,r:.04,type:'bubble',life:0,ttl:10,vx:0,vy:0,seed:0}));for(const [id,x] of [[1,300],[2,700]]){canvas.onpointerdown({pointerId:id,pointerType:'touch',clientX:x,clientY:300,preventDefault(){}});canvas.onpointerup({pointerId:id,preventDefault(){}});}step(.01,2000);");assert.equal(g.run('round.score'),20);assert.equal(g.run('fingers.size'),0);assert.equal(g.run('popRings.length'),2);g.run('step(.01,2010)');assert.equal(g.run('round.score'),20);});
test('cancelled fingers do not leave active touch controls',()=>{const g=game();g.run("baseSession('demo');canvas.onpointerdown({pointerId:1,pointerType:'touch',clientX:300,clientY:300,preventDefault(){}});canvas.onpointercancel({pointerId:1});");assert.equal(g.run('fingers.size'),0);});

test('mobile finger swipe slices fruit and records a glowing trail',()=>{const g=game();g.run("selectedGame='fruit';baseSession('demo');startRound();spawnClock=0;targets=[{id:99,x:.5,y:.5,r:.06,type:'fruit',fruit:2,life:0,ttl:10,vx:0,vy:0,seed:0}];canvas.onpointerdown({pointerId:1,pointerType:'touch',clientX:200,clientY:300,preventDefault(){}});canvas.onpointermove({pointerId:1,pointerType:'touch',clientX:800,clientY:300,preventDefault(){}});canvas.onpointerup({pointerId:1,preventDefault(){}});step(.01,100);");assert.equal(g.run('round.score'),10);assert.equal(g.run('slices.length'),2);assert.ok(g.run("swipeTrails.get('finger:1').length")>=2);g.run('step(.01,700)');assert.equal(g.run('swipeTrails.size'),0);});
