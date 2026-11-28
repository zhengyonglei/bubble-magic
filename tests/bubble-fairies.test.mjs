import test from 'node:test';
import assert from 'node:assert/strict';
import {FairyGarden,moveFairyBubble,splitGiant,fairyPosition} from '../bubble-fairies.js';
test('fairy groups start entirely outside left, right and top edges with bounded group sizes',()=>{
 for(const n of [.01,.45,.85])for(const aspect of [.56,1.8]){const g=new FairyGarden(()=>n);g.group(aspect);assert.ok(g.fairies.length>=2&&g.fairies.length<=4);for(const f of g.fairies)assert.ok(f.x<-.08*aspect||f.x>1+.08*aspect||f.y<-.08);}
});
test('fairies emit bubbles at their wand tips, grow them, and respect density and lifetime limits',()=>{
 let seed=4;const rnd=()=>((seed=seed*16807%2147483647)-1)/2147483646,g=new FairyGarden(rnd);let count=0,giants=0;
 for(let i=0;i<1200;i++){const made=g.update(.05,.56,3);assert.ok(made.length<=3);assert.ok(g.fairies.length<=6);for(const b of made){count++;giants+=Number(b.giant);assert.ok(g.fairies.some(f=>f.wand&&Math.hypot(f.wand.x-b.x,f.wand.y-b.y)<1e-8));const r=b.r;moveFairyBubble(b,.55,.56);assert.ok(b.r>r);assert.ok(b.y>=.18&&b.y<=.74);}}
 assert.ok(count>50);assert.ok(giants>0);assert.equal(g.update(1,.56,0).length,0);
});
test('giant splits into six protected non-recursive children even near edges',()=>{
 for(const x of [.06,.5,.94]){const children=splitGiant({giant:true,x,y:.2,r:.1},1.8);assert.equal(children.length,6);for(const b of children){assert.equal(b.giant,false);assert.ok(b.popDelay>=.4);assert.ok(b.x>=.06&&b.x<=.94);assert.equal(splitGiant(b,1.8).length,0);}}
});
test('right-edge fairies face left and mirrored wand tips stay ahead of both travel directions',()=>{
 for(const [rnd,face] of [[.1,1],[.45,-1]]){const g=new FairyGarden(()=>rnd);g.group(.56);g.nextGroup=100;g.update(1,.56,0);for(const f of g.fairies){assert.equal(f.face,face);assert.ok((f.wand.x-f.x)*face>0);}}
});
test('curved routes never use the bottom, stay bounded and visibly deviate from straight lines',()=>{
 let seed=17;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
 const edges=new Set();for(let n=0;n<100;n++){const g=new FairyGarden(random);g.group(1.8);for(const f of g.fairies){for(const p of [f.start,f.end]){assert.ok(p.y<0||p.x<0||p.x>1);assert.ok(p.y<.7);edges.add(p.y<0?'top':p.x<0?'left':'right');}let deviation=0;for(let i=0;i<=100;i++){const u=i/100,p=fairyPosition(f,u);assert.ok(p.y<=.72);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.dx));deviation=Math.max(deviation,Math.hypot(p.x-(f.start.x+(f.end.x-f.start.x)*u),p.y-(f.start.y+(f.end.y-f.start.y)*u)));}assert.ok(deviation>.05);assert.ok(Math.abs(fairyPosition(f,0).x-f.start.x)<1e-8);assert.ok(Math.abs(fairyPosition(f,1).y-f.end.y)<1e-8);}}
 assert.deepEqual([...edges].sort(),['left','right','top']);
});
