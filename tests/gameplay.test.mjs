import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../game-core.js';
import * as modes from '../game-modes.js';
// Execute the production update loop with synthetic input and a minimal DOM, without a camera.
function game(){
 const nodes=new Map();const ctx=new Proxy({},{get:()=>()=>{}});
 const element=()=>({textContent:'',hidden:false,open:false,checked:false,dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},focus(){},pause(){},load(){},getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:600}),querySelector:()=>element()});
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
test('solo medium and hard spawn cacti; easy never does',()=>{for(const difficulty of ['easy','medium','hard']){const g=game();g.run(`setMode('${difficulty}');setPlayers(1);baseSession('demo');startRound();for(let i=0;i<100;i++)step(.1,i*100);`);assert.equal(g.run("targets.some(t=>t.type==='cactus')"),difficulty!=='easy',difficulty);}});
test('production pet side collision bounces without awarding points',()=>{const g=game();g.run("selectedGame='pets';baseSession('demo');startRound();spawnClock=0;pointer={x:.5,y:.5,active:true};targets=[{id:55,x:.57,y:.54,r:.05,type:'cat',life:0,ttl:10,vx:0,vy:0,seed:0}];step(.01,2000);");assert.equal(g.run('round.score'),0);assert.ok(g.run('targets[0].vx')>0);assert.equal(g.run("labels[0].text"),'Boing!');});
