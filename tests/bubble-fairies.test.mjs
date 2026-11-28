import test from 'node:test';
import assert from 'node:assert/strict';
import {FairyGarden,moveFairyBubble,splitGiant} from '../bubble-fairies.js';
test('fairy groups start entirely outside all four edges with bounded group sizes',()=>{
 for(const n of [.01,.26,.51,.76])for(const aspect of [.56,1.8]){const g=new FairyGarden(()=>n);g.group(aspect);assert.ok(g.fairies.length>=2&&g.fairies.length<=4);for(const f of g.fairies)assert.ok(f.x<-.08*aspect||f.x>1+.08*aspect||f.y<-.08||f.y>1.08);}
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
 for(const [rnd,face] of [[.1,1],[.3,-1]]){const g=new FairyGarden(()=>rnd);g.group(.56);g.nextGroup=100;g.update(1,.56,0);for(const f of g.fairies){assert.equal(f.face,face);assert.ok((f.wand.x-f.x)*face>0);}}
});
