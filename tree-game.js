// Each player owns a separate net; hands from different people never join.
export function playerNets(hands,now,demo=false){
 const fresh=hands.filter(h=>now-h.seen<350&&h.confidence>=.45);
 if(demo){const pair=fresh.filter(h=>h.id!=='mouse'),h=pair[0]||fresh[0];if(!h)return [];
 return [{id:'net:demo',a:pair.length>=2?pair[0]:{...h,x:Math.max(.02,h.x-.13)},b:pair.length>=2?pair[1]:{...h,x:Math.min(.98,h.x+.13)}}];}
 const groups=new Map();for(const h of fresh){if(h.playerId==null)continue;if(!groups.has(h.playerId))groups.set(h.playerId,[]);groups.get(h.playerId).push(h);}
 return [...groups].filter(([,p])=>p.length===2).map(([id,p])=>({id:'net:'+id,a:p[0],b:p[1]}));
}
// Track torso rise and require landing before another jump. Wrist motion is ignored.
export class JumpTracker{
 constructor(){this.people=new Map();}
 update(bodies,now){
  let jumps=0;
  for(const body of bodies){if(body.confidence<.45)continue;let p=this.people.get(body.id);
   if(!p||now-p.seen>600){this.people.set(body.id,{ground:body.y,last:body.y,seen:now,airborne:false,cooldown:0});continue;}
   if(Math.abs(body.y-p.last)>.22){p.ground=body.y;p.airborne=false;p.cooldown=now+500;}
   const threshold=Math.max(.028,body.height*.18);
   if(!p.airborne&&now>=p.cooldown&&p.ground-body.y>threshold){jumps++;p.airborne=true;p.cooldown=now+700;}
   if(p.airborne&&body.y>=p.ground-threshold*.35)p.airborne=false;
   if(!p.airborne&&Math.abs(body.y-p.ground)<threshold*.6)p.ground=p.ground*.98+body.y*.02;
   p.last=body.y;p.seen=now;
  }
  for(const [id,p] of this.people)if(now-p.seen>1500)this.people.delete(id);
  return jumps;
 }
}
export function netPoints(net,width,height){
 const a={x:net.a.x*width,y:net.a.y*height},b={x:net.b.x*width,y:net.b.y*height};
 const sag=Math.min(height*.12,Math.hypot(b.x-a.x,b.y-a.y)*.28);
 return Array.from({length:13},(_,i)=>{const t=i/12;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t+Math.sin(Math.PI*t)*sag};});
}
function distance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function touches(p,net,width,height,r){
 const curve=netPoints(net,width,height),a=curve[0],b=curve.at(-1),polygon=[...curve,a];
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const u=polygon[i],v=polygon[j];
   if(distance(p,u,v)<=r+5)return true;
   if((u.y>p.y)!==(v.y>p.y)&&p.x<(v.x-u.x)*(p.y-u.y)/(v.y-u.y)+u.x)inside=!inside;
 }
 return inside||distance(p,a,b)<=r+5;
}
export function netContact(target,net,width,height,now){
 if(!net||[net.a,net.b].some(h=>now-h.seen>350||h.confidence<.45))return false;
 const current={x:target.x*width,y:target.y*height},r=target.r*height;
 if(touches(current,net,width,height,r))return true;
 const valid=h=>h.prev&&now-h.prev.time<250&&(h.direct||Math.hypot(h.x-h.prev.x,h.y-h.prev.y)<.25);
 const oldA=valid(net.a)?net.a.prev:net.a,oldB=valid(net.b)?net.b.prev:net.b,old=target.prev||target;
 const travel=Math.max(Math.hypot((target.x-old.x)*width,(target.y-old.y)*height),Math.hypot((net.a.x-oldA.x)*width,(net.a.y-oldA.y)*height),Math.hypot((net.b.x-oldB.x)*width,(net.b.y-oldB.y)*height));
 const steps=Math.min(100,Math.max(1,Math.ceil(travel/Math.max(3,r*.5))));
 for(let i=0;i<=steps;i++){const t=i/steps,lerp=(a,b)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
   const p=lerp(old,target);if(touches({x:p.x*width,y:p.y*height},{a:lerp(oldA,net.a),b:lerp(oldB,net.b)},width,height,r))return true;
 }
 return false;
}
export function treeDrop(index,level,random=Math.random){
 const type=['cat','apple','dog','pear','squirrel','apple','peach','dog','orange','cat','cherries','apple'][index%12];
 return {type,fruit:type==='orange'?1:0,x:.18+random()*.64,y:.29+random()*.12,r:['cat','dog','squirrel'].includes(type)?.061:.042,vx:(random()-.5)*.04,vy:.11,treeDrop:true,gravity:.08,life:0,ttl:12};
}
// Only jumps advance the tree: appear, grow, then drop on a later jump.
export function advanceTree(items,index,level,capacity,random=Math.random){
 const staying=[],falling=[];
 for(const item of items){const grown={...item,growth:Math.min(1,item.growth+.3)};
   if(grown.growth>=1&&falling.length<capacity)falling.push(grown);else staying.push(grown);
 }
 for(let i=0;i<4&&staying.length<18;i++)staying.push({...treeDrop(index++,level,random),growth:.15,shown:0});
 return {items:staying,falling,index};
}
