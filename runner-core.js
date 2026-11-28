import {appearanceScore} from './runner-tracking.js?v=runner-09';
// Pure simulation and conservative session tracking. Appearance cues remain in session memory only.
export const COURSE_SECTIONS=[{start:60,end:96,type:'jump',name:'Hopping Logs'},{start:190,end:226,type:'jump',name:'River Hops'}];
export function courseCue(distance){const section=COURSE_SECTIONS.find(s=>distance>=s.start-18&&distance<s.end);if(!section)return distance>=310?'RAINBOW GROVE · Follow the golden entrance':'';if(distance<section.start)return section.name+' · '+'Jump section ahead';const next=[6,18,30].map(d=>section.start+d).find(z=>z>distance);return section.name+' · '+(!next?'Great! Keep going':next-distance<2.7?'JUMP NOW!':'Get ready to jump');}
export class Runner {
  constructor(){this.events=[];this.distance=0;this.lane=0;this.x=0;this.jump=0;this.stars=0;this.finished=false;this.message='Follow the star trail!';this.items=Array.from({length:66},(_,i)=>({z:12+i*5,lane:[0,-1,1,0,1,-1][i%6],kind:i%7===4?'log':'star',done:false})).filter(item=>item.kind==='star'||!COURSE_SECTIONS.some(s=>item.z>=s.start-18&&item.z<=s.end+6));for(const section of COURSE_SECTIONS){for(const offset of [6,18,30])this.items.push({z:section.start+offset,lane:0,kind:'log',fullWidth:true,done:false});}this.items.sort((a,b)=>a.z-b.z);}
  hop(){if(this.jump===0&&!this.finished)this.jump=.85;}
  step(dt,{moving=false,paused=false}={}){
    if(paused||this.finished)return;
    dt=Math.max(0,Math.min(.05,dt));
    this.jump=Math.max(0,this.jump-dt);this.x+=(this.lane*1.5-this.x)*Math.min(1,dt*12);
    if(!moving)return;
    const old=this.distance;this.distance=Math.min(350,old+dt*6);
    for(const item of this.items){
      if(item.done||item.z>this.distance||item.z<=old)continue;item.done=true;
      if(!item.fullWidth&&Math.abs(item.lane*1.5-this.x)>.65)continue;
      if(item.kind==='star'){this.events.push({type:'star',lane:item.lane});this.stars++;this.message='Lovely! A star for your garden.';}
      else if(item.kind==='log'&&this.height()<.6){this.events.push({type:'hit',kind:item.kind,lane:item.fullWidth?this.lane:item.lane});this.message='Soft bump! Keep exploring — your stars are safe.';}
      else{this.events.push({type:'clear',kind:item.kind,lane:item.lane});this.message='Super jump!';}
    }
    if(this.distance>=350){this.finished=true;this.events.push({type:'finish',lane:0});this.message='You made it to the rainbow grove!';}
  }
  height(){return Math.sin(this.jump/.85*Math.PI)*1.55;}
}

export function body(p){
  const ids=[11,12,23,24];
  if(!p||ids.some(i=>!p[i]||!Number.isFinite(p[i].x)||!Number.isFinite(p[i].y)||(p[i].visibility??0)<.2)||ids.filter(i=>(p[i].visibility??0)>=.5).length<3)return null;
  const x=(p[11].x+p[12].x+p[23].x+p[24].x)/4;
  const y=(p[11].y+p[12].y+p[23].y+p[24].y)/4;
  const size=Math.hypot(p[11].x-p[23].x,p[11].y-p[23].y);
  if(size<.08)return null;
  return {x,y,size,p,raised:[15,16].every((i,j)=>p[i]&&(p[i].visibility??0)>.65&&p[i].y<p[11+j].y-.07)};
}

export class PlayerLock {
  constructor(){this.reset();}
  reset(){this.target=null;this.profile=null;this.samples=[];this.enrollment=[];this.anchorSize=0;this.recovery=null;this.candidate=null;this.since=0;this.last=0;this.lastAppearance=0;this.lastLearn=0;this.blocked=false;this.waiting=false;this.uncertain=false;this.code='select';this.reason='Stand in the center and raise both hands.';}
  wait(reason,code='gap'){this.waiting=true;this.code=code;this.reason=reason;return null;}
  score(feature){const scores=this.samples.map(s=>appearanceScore(s,feature)).filter(s=>s!==null);return scores.length?Math.min(...scores):null;}
  accept(p,now,learn=false){
    if(learn&&p.appearance&&now-this.lastLearn>=300){
      // Keep admission references; learn only small changes in an isolated continuous track.
      const anchor=appearanceScore(this.profile,p.appearance);
      if(!this.profile){this.profile=p.appearance;this.samples=[p.appearance];}
      else if(anchor!==null&&anchor<.3){this.samples.push(p.appearance);if(this.samples.length>8)this.samples.splice(3,1);}
      this.lastLearn=now;
    }
    if(p.appearance&&this.score(p.appearance)!==null)this.lastAppearance=now;
    this.target=p;this.last=now;this.waiting=false;this.blocked=false;this.uncertain=false;this.recovery=null;this.code='locked';this.reason='Player locked · jump or lean!';return p;
  }
  update(poses,now,features=[]){
    const people=poses.map((raw,i)=>{const b=body(raw);return b?{...b,appearance:features[i],index:i}:null;}).filter(Boolean);
    if(this.blocked&&!this.profile)return null;
    if(!this.target){
      const p=people.length===1&&poses.length===1&&people[0];
      if(!p||!p.raised||Math.abs(p.x-.5)>.18){this.candidate=null;this.enrollment=[];this.since=now;return null;}
      if(!this.candidate||Math.abs(p.x-this.candidate.x)>.08||Math.abs(p.size/this.candidate.size-1)>.2){this.candidate=p;this.enrollment=[];this.since=now;}
      if(p.appearance){this.enrollment.push(p.appearance);this.enrollment=this.enrollment.slice(-5);}
      if(now-this.since<1200)return null;
      this.samples=this.enrollment.slice();this.profile=this.samples[0]||null;this.anchorSize=p.size;this.lastAppearance=now;return this.accept(p,now);
    }
    const prev=this.target,elapsed=now-this.last;
    const close=people.filter(p=>Math.abs(p.x-prev.x)<.14&&Math.abs(p.y-prev.y)<.22&&Math.abs(p.size/prev.size-1)<.45);
    const p=close[0];
    const overlaps=target=>poses.length>1&&poses.some(raw=>{if(raw===target?.p)return false;const pts=[11,12,23,24].map(i=>raw?.[i]).filter(q=>q&&(q.visibility??0)>.25);return pts.length&&Math.abs(pts.reduce((n,q)=>n+q.x,0)/pts.length-(target?.x??prev.x))<.32;});
    if(close.length>1||(p&&overlaps(p))){
      this.uncertain=true;this.recovery=null;this.blocked=!this.profile;return this.wait('Players overlap — separate to resume.','overlap');
    }
    if(!people.length){this.recovery=null;return this.wait('Brief tracking gap — hold your position.','pose-gap');}
    if(!this.profile){
      if(elapsed>1200||!p){this.blocked=true;return this.wait('Player changed or lost for too long. Select player again.','reselect');}
      return this.accept(p,now,poses.length===1);
    }
    const score=p?this.score(p.appearance):null;
    const shortGap=!this.waiting||['pose-gap','slow-frame','stale','gap'].includes(this.code);
    // Missing clothing is tolerable briefly ONLY with a fresh, unique spatial match.
    // An explicit strong colour contradiction never receives this grace period.
    const missing=!p?.appearance&&now-this.lastAppearance<=500&&elapsed<=500;
    if(p&&!this.uncertain&&shortGap&&elapsed<=900&&(score!==null&&score<.4||missing)){
      return this.accept(p,now,poses.length===1&&score!==null&&score<.2&&!this.waiting);
    }
    const candidates=people.map(p=>({p,score:this.score(p.appearance)})).filter(q=>q.score!==null&&q.score<.28&&Math.abs(q.p.size/this.anchorSize-1)<.6).sort((a,b)=>a.score-b.score);
    const best=candidates[0];
    if(!best||overlaps(best.p)||(candidates[1]&&candidates[1].score-best.score<.12)){
      this.recovery=null;this.uncertain=true;
      return this.wait(!best?'Checking your player — keep your shirt visible.':overlaps(best.p)?'Players overlap — separate to resume.':'Similar appearances — keep only the selected player in view.',!best?'appearance':overlaps(best.p)?'overlap':'ambiguous');
    }
    const q=best.p;
    if(!this.recovery||Math.abs(q.x-this.recovery.x)>.12||Math.abs(q.y-this.recovery.y)>.18||Math.abs(q.size/this.recovery.size-1)>.3||now-this.recovery.last>900)this.recovery={x:q.x,y:q.y,size:q.size,since:now,last:now,frames:1};
    else{Object.assign(this.recovery,{x:q.x,y:q.y,size:q.size,last:now});this.recovery.frames++;}
    if(now-this.recovery.since<450||this.recovery.frames<3)return this.wait('Found your player — confirming appearance…','recovering');
    return this.accept(q,now);
  }
}

export class Movement {
  constructor(){this.base=null;this.previous=null;this.air=false;}
  update(b,now){
    if(!this.base){this.base={...b};this.previous=b;}
    const p=b.p,scale=this.base.size;
    const rise=(this.base.y-b.y)/scale;

    const jump=rise>.2&&!this.air;
    if(rise>.2)this.air=true;else if(rise<.09)this.air=false;
    const lean=(b.x-this.base.x)/scale;
    return {jump,lane:lean>.3?-1:lean<-.3?1:0};
  }
}
