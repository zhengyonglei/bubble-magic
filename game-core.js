export const REWARDS=[{at:5,name:'Sparkle bracelets'},{at:15,name:'Star crown'},{at:30,name:'Butterfly wings'}];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function segmentHitsCircle(a,b,c,r){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const t=len?clamp(((c.x-a.x)*dx+(c.y-a.y)*dy)/len,0,1):0;
  return Math.hypot(c.x-a.x-t*dx,c.y-a.y-t*dy)<=r;
}
export function handHits(hand,target,now){
  if(now-hand.seen>350||hand.confidence<0.45)return false;
  const b={x:hand.x,y:hand.y};
  // Never sweep a cursor across the screen after a tracking gap or identity jump.
  const a=hand.prev&&now-hand.prev.time<250&&(hand.direct||Math.hypot(b.x-hand.prev.x,b.y-hand.prev.y)<0.25)?hand.prev:b;
  return segmentHitsCircle(a,b,target,target.r+hand.r);
}
export class Round {
  constructor(mode='gentle',duration=60){this.mode=mode;this.duration=duration;this.time=0;this.score=0;this.pops=0;this.streak=0;this.lastPop=-Infinity;this.multiplier=1;this.hitIds=new Set();}
  get remaining(){return Math.max(0,this.duration-this.time);}
  get finished(){return this.remaining===0;}
  tick(dt,active=true){if(active){this.time=Math.min(this.duration,this.time+Math.max(0,dt));if(this.time-this.lastPop>2){this.streak=0;this.multiplier=1;}}}
  hit(target){
    if(this.finished||this.hitIds.has(target.id))return null;
    this.hitIds.add(target.id);
    if(target.type==='cactus'){if(this.mode==='challenge'){this.streak=0;this.multiplier=1;this.lastPop=-Infinity;}const penalty=this.mode==='challenge'?Math.min(20,this.score):0;this.score-=penalty;return {points:0,cactus:true,penalty};}
    this.streak=this.time-this.lastPop<=2?this.streak+1:1;
    this.lastPop=this.time;
    this.multiplier=this.mode==='gentle'?1:this.streak>=10?3:this.streak>=5?2:1;
    const points=(target.type==='star'?30:10)*this.multiplier;
    this.score+=points;this.pops++;
    return {points,cactus:false};
  }
}
export function rewardLevel(total){return REWARDS.filter(r=>total>=r.at).length;}
export function matchPoses(previous,poses){
  const center=p=>({x:(p[11].x+p[12].x)/2,y:(p[11].y+p[12].y)/2});
  const candidates=[];
  previous.forEach((p,i)=>poses.forEach((pose,j)=>{const c=center(pose);candidates.push({i,j,d:Math.hypot(c.x-p.cx,c.y-p.cy)});}));
  candidates.sort((a,b)=>a.d-b.d);
  const usedOld=new Set(),usedNew=new Set(),pairs=[];
  for(const p of candidates)if(p.d<0.3&&!usedOld.has(p.i)&&!usedNew.has(p.j)){pairs.push(p);usedOld.add(p.i);usedNew.add(p.j);}
  return poses.map((pose,j)=>{const pair=pairs.find(p=>p.j===j);return {pose,old:pair?previous[pair.i]:null,...center(pose)};});
}
