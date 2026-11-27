import {appearanceScore} from './runner-tracking.js?v=runner-04';
// Pure simulation and conservative session tracking. Appearance cues remain in session memory only.
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
  const ids=[11,12,23,24];
  if(!p||ids.some(i=>!p[i]||(p[i].visibility??0)<.45))return null;
  const x=(p[11].x+p[12].x+p[23].x+p[24].x)/4;
  const y=(p[11].y+p[12].y+p[23].y+p[24].y)/4;
  const size=Math.hypot(p[11].x-p[23].x,p[11].y-p[23].y);
  if(size<.08)return null;
  return {x,y,size,p,raised:[15,16].every((i,j)=>p[i]&&(p[i].visibility??0)>.65&&p[i].y<p[11+j].y-.07)};
}

export class PlayerLock {
  constructor(){this.reset();}
  reset(){this.target=null;this.profile=null;this.anchorSize=0;this.recovery=null;this.candidate=null;this.since=0;this.last=0;this.blocked=false;this.waiting=false;this.reason='Stand in the center and raise both hands.';}
  wait(reason){this.waiting=true;this.reason=reason;return null;}
  update(poses,now,features=[]){
    const people=poses.map((raw,i)=>{const b=body(raw);return b?{...b,appearance:features[i],index:i}:null;}).filter(Boolean);
    if(this.blocked&&!this.profile)return null;
    if(!this.target){
      // Select one visible torso with raised hands; ankles are not needed for identity.
      const p=people.length===1&&poses.length===1&&people[0];
      if(!p||!p.raised||Math.abs(p.x-.5)>.18){this.candidate=null;this.since=now;return null;}
      if(!this.candidate||Math.abs(p.x-this.candidate.x)>.08||Math.abs(p.size/this.candidate.size-1)>.2){this.candidate=p;this.since=now;return null;}
      if(now-this.since<1200)return null;
      this.target=p;this.profile=p.appearance||null;this.anchorSize=p.size;this.last=now;this.waiting=false;this.reason='Player selected. March to explore!';return p;
    }
    if(this.profile)return this.matchAppearance(people,poses,now);
    const prev=this.target;
    // Allow the torso travel of a jump or lean, including slower inference intervals.
    const matches=people.filter(p=>Math.abs(p.x-prev.x)<.14&&Math.abs(p.y-prev.y)<.22&&Math.abs(p.size/prev.size-1)<.45);
    const p=matches[0];
    // A nearby partial person can still obscure the selected player. A distant
    // partial detection must not invalidate an otherwise clear match.
    const nearby=poses.length>1&&poses.some(raw=>{if(raw===p?.p)return false;const points=[11,12,23,24].map(i=>raw?.[i]).filter(q=>q&&(q.visibility??0)>.25);if(!points.length)return false;const x=points.reduce((v,q)=>v+q.x,0)/points.length;return Math.abs(x-(p?.x??prev.x))<.32;});
    if(now-this.last>1200||matches.length>1||nearby||people.length&&matches.length===0){
      this.blocked=true;return this.wait(now-this.last>1200?'Player lost for too long. Select player again.':'People overlap or player changed. Clear the space and select player again.');
    }
    if(!p)return this.wait('Brief tracking gap — hold your position. Resuming automatically…');
    this.target=p;this.last=now;this.waiting=false;this.reason='Player selected. March to explore!';return p;
  }
  matchAppearance(people,poses,now){
    const candidates=people.map(p=>({p,score:appearanceScore(this.profile,p.appearance)})).filter(q=>q.score!==null&&q.score<.28&&Math.abs(q.p.size/this.anchorSize-1)<.6).sort((a,b)=>a.score-b.score);
    const best=candidates[0],p=best?.p;
    const overlap=p&&poses.some(raw=>{if(raw===p.p)return false;const pts=[11,12,23,24].map(i=>raw?.[i]).filter(q=>q&&(q.visibility??0)>.25);return pts.length&&Math.abs(pts.reduce((n,q)=>n+q.x,0)/pts.length-p.x)<.28;});
    if(!p||overlap||(candidates[1]&&candidates[1].score-best.score<.12)){
      this.recovery=null;return this.wait(overlap?'Players overlap — separate to resume.':candidates.length>1?'Similar appearances — keep only the selected player in view.':'Looking for your saved player — face the camera with your shirt visible.');
    }
    const continuous=!this.waiting&&now-this.last<900&&Math.abs(p.x-this.target.x)<.18&&Math.abs(p.y-this.target.y)<.25;
    if(!continuous){
      if(!this.recovery||Math.abs(p.x-this.recovery.x)>.12||now-this.recovery.last>900)this.recovery={x:p.x,since:now,last:now,frames:1};
      else{this.recovery.x=p.x;this.recovery.last=now;this.recovery.frames++;}
      if(now-this.recovery.since<450||this.recovery.frames<3)return this.wait('Found your player — confirming appearance…');
    }
    this.recovery=null;this.target=p;this.last=now;this.waiting=false;this.blocked=false;this.reason='Player locked · session appearance remembered';return p;
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
    const knees=[25,26].every(i=>p[i]&&(p[i].visibility??0)>.45);
    const diff=knees?(p[25].y-p[26].y)/scale:0;
    const side=diff>.1?1:diff<-.1?-1:0;
    if(side&&side!==this.lastSide){this.lastStep=now;this.lastSide=side;}
    const lean=(b.x-this.base.x)/scale;
    return {moving:knees&&now-this.lastStep<650,duck,jump,lane:lean>.3?-1:lean<-.3?1:0};
  }
}
