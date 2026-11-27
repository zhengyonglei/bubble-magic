import test from 'node:test';
import assert from 'node:assert/strict';
import {JumpTracker,playerNets,netContact,advanceTree} from '../tree-game.js';
const body=(y,id=1)=>({id,y,height:.2,confidence:1});
test('torso rise triggers once per jump and requires landing; both players can trigger',()=>{
 const t=new JumpTracker();assert.equal(t.update([body(.5),body(.5,2)],0),0);
 assert.equal(t.update([body(.44),body(.5,2)],100),1);
 assert.equal(t.update([body(.43),body(.44,2)],200),1);
 assert.equal(t.update([body(.44),body(.44,2)],300),0);
 t.update([body(.5),body(.5,2)],400);
 assert.equal(t.update([body(.44),body(.5,2)],900),1);
});
test('jitter, tracking teleports and returning after absence do not shake the tree',()=>{
 const t=new JumpTracker();t.update([body(.5)],0);
 assert.equal(t.update([body(.49)],100),0);
 assert.equal(t.update([body(.1)],200),0);
 assert.equal(t.update([body(.4)],1000),0);
 assert.equal(t.update([{...body(.3),confidence:.1}],1100),0);
});
test('every player gets a separate net with fresh, confident hands',()=>{
 const h=(playerId,x)=>({playerId,x,y:.6,seen:100,confidence:1});
 const nets=playerNets([h(2,.8),h(1,.2),h(2,.6),h(1,.4)],100);
 assert.equal(nets.length,2);assert.ok(nets.every(n=>n.a.playerId===n.b.playerId));
 assert.equal(playerNets([h(1,.2),h(2,.8)],100).length,0);
 assert.equal(playerNets([h(1,.2),h(1,.4)],500).length,0);
});
const hand=(x,y)=>({x,y,seen:100,confidence:1});
test('objects touch any side or mesh of the net, while distant objects miss',()=>{
 const net={a:hand(.3,.5),b:hand(.7,.5)};
 for(const [x,y] of [[.3,.5],[.7,.5],[.5,.5],[.5,.58]])assert.equal(netContact({x,y,r:.02},net,1000,600,100),true);
 assert.equal(netContact({x:.9,y:.7,r:.02},net,1000,600,100),false);
 assert.equal(netContact({x:.5,y:.5,r:.02},net,1000,600,500),false);
});
test('fast falling objects and fast finger net sweeps cannot pass through the net',()=>{
 const net={a:hand(.3,.5),b:hand(.7,.5)};
 assert.equal(netContact({x:.5,y:.8,r:.02,prev:{x:.5,y:.2}},net,1000,600,100),true);
 const moving={a:{...hand(.3,.8),direct:true,prev:{x:.3,y:.2,time:90}},b:{...hand(.7,.8),direct:true,prev:{x:.7,y:.2,time:90}}};
 assert.equal(netContact({x:.5,y:.5,r:.02},moving,1000,600,100),true);
});
test('treasures appear gradually and only repeated jumps release mature items',()=>{
 let s={items:[],index:0};
 for(let i=0;i<3;i++){s=advanceTree(s.items,s.index,'easy',5,()=>.5);assert.equal(s.falling.length,0);}
 assert.ok(s.items[0].growth>s.items.at(-1).growth);
 s=advanceTree(s.items,s.index,'easy',5,()=>.5);assert.equal(s.falling.length,4);
 assert.deepEqual(new Set([...s.items,...s.falling].map(i=>i.type)),new Set(['cat','apple','dog','orange','squirrel','pear','peach','cherries']));
 for(let i=0;i<50;i++){s=advanceTree(s.items,s.index,'easy',0);assert.equal(s.falling.length,0);assert.ok(s.items.length<=18);}
});

test('all tree treasures grow and release in the top quarter above normal nets',()=>{for(const random of [()=>0,()=>.5,()=>.999999]){let s={items:[],index:0};for(let jump=0;jump<5;jump++){s=advanceTree(s.items,s.index,'easy',14,random);for(const item of [...s.items,...s.falling]){assert.ok(item.x>=.06&&item.x<=.94);assert.ok(item.y>=.11&&item.y<=.16);assert.ok(item.y+item.r*1.35<.25);assert.equal(netContact(item,{a:hand(.1,.5),b:hand(.9,.5)},1000,600,100),false);}}}});
