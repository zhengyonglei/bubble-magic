// Pure simulation and conservative session tracking. No biometric identity or storage.
export class Runner {
  constructor(){this.distance=0;this.lane=0;this.x=0;this.jump=0;this.duck=false;this.stars=0;this.finished=false;this.message='Follow the star trail!';this.items=Array.from({length:66},(_,i)=>({z:12+i*5,lane:[0,-1,1,0,1,-1][i%6],kind:i%7===4?'log':i%7===6?'arch':'star',done:false}));}
  hop(){if(this.jump===0&&!this.finished)this.jump=.85;}
  step(dt,{moving=false,duck=false,paused=false}={}){
    if(paused||this.finished)return;
    dt=Math.max(0,Math.min(.05,dt));this.duck=duck;
    this.jump=Math.max(0,this.jump-dt);this.x+=(this.lane*1.5-this.x)*Math.min(1,dt*12);
    if(!moving)return;
    const old=this.distance;this.distance=Math.min(350,old+dt*6);
    for(const item of this.items){if(item.done||item.z>this.distance||item.z<=old)continue;item.done=true;
      if(Math.abs(item.lane*1.5-this.x)>.65)continue;
      if(item.kind==='star'){this.stars++;this.message='Lovely! A star for your garden.';}
      else if(item.kind==='log'&&this.height()<.6||item.kind==='arch'&&!duck)this.message='Soft bump! Keep exploring — your stars are safe.';
      else this.message=item.kind==='log'?'Super jump!':'Lovely duck!';
    }
    if(this.distance>=350){this.finished=true;this.message='You made it to the rainbow grove!';}
  }
  height(){return Math.sin(this.jump/.85*Math.PI)*1.55;}
}

export function body(p){
  const ids=[11,12,23,24,25,26,27,28];
  if(!p||ids.some(i=>!p[i]||(p[i].visibility??0)<.6))return null;
  const x=(p[11].x+p[12].x+p[23].x+p[24].x)/4;
  const y=(p[11].y+p[12].y+p[23].y+p[24].y)/4;
  const size=Math.hypot(p[11].x-p[23].x,p[11].y-p[23].y);
  if(size<.08)return null;
  return {x,y,size,p,raised:[15,16].every((i,j)=>p[i]&&(p[i].visibility??0)>.65&&p[i].y<p[11+j].y-.07)};
}

export class PlayerLock {
  constructor(){this.reset();}
  reset(){this.target=null;this.candidate=null;this.since=0;this.last=0;this.blocked=false;this.reason='Stand in the outline and raise both hands.';}
  update(poses,now){
    const people=poses.map(body).filter(Boolean);
    if(this.blocked)return null;
    if(!this.target){
      // Admission requires exactly one detected, fully visible person for 1.2 seconds.
      const p=people.length===1&&poses.length===1&&people[0];
      if(!p||!p.raised||Math.abs(p.x-.5)>.18){this.candidate=null;this.since=now;return null;}
      if(!this.candidate||Math.abs(p.x-this.candidate.x)>.08||Math.abs(p.size/this.candidate.size-1)>.2){this.candidate=p;this.since=now;return null;}
      if(now-this.since<1200)return null;
      this.target=p;this.last=now;this.reason='Player selected. March to explore!';return p;
    }
    const prev=this.target;
    const matches=people.filter(p=>Math.abs(p.x-prev.x)<.09&&Math.abs(p.y-prev.y)<.12&&Math.abs(p.size/prev.size-1)<.25);
    const p=matches[0];
    // Invalid partial detections and nearby bystanders are also uncertainty, not permission to switch.
    if(now-this.last>450||people.length!==poses.length||matches.length!==1||people.some(q=>q!==p&&Math.abs(q.x-p.x)<.32)){
      this.blocked=true;this.reason='Tracking uncertain. Clear the space, then select the player again.';return null;
    }
    this.target=p;this.last=now;return p;
  }
}

export class Movement {
  constructor(){this.base=null;this.previous=null;this.lastStep=-Infinity;this.lastSide=0;this.air=false;}
  update(b,now){
    if(!this.base){this.base={...b};this.previous=b;}
    const p=b.p,scale=this.base.size;
    const rise=(this.base.y-b.y)/scale;
    const duck=(b.y-this.base.y)/scale>.23;
    const jump=rise>.2&&!this.air;
    if(rise>.2)this.air=true;else if(rise<.09)this.air=false;
    const diff=(p[25].y-p[26].y)/scale;
    const side=diff>.1?1:diff<-.1?-1:0;
    if(side&&side!==this.lastSide){this.lastStep=now;this.lastSide=side;}
    const lean=(b.x-this.base.x)/scale;
    return {moving:now-this.lastStep<650,duck,jump,lane:lean>.3?-1:lean<-.3?1:0};
  }
}
