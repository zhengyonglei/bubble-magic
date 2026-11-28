const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FAIRY_COLORS=['#99e1ca','#ffbcad','#cfaff4','#ffe193'];
export class FairyGarden {
 constructor(random=Math.random){this.random=random;this.fairies=[];this.clock=0;this.nextGroup=.15;this.emitted=0;this.nextId=1;}
 group(aspect){
  const rnd=this.random,edge=Math.floor(rnd()*4),count=2+Math.floor(rnd()*3),margin=Math.max(.13,.11*aspect);
  for(let i=0;i<count&&this.fairies.length<6;i++){
   const across=.32+rnd()*.30,start=edge===0?{x:-margin-i*.05,y:across}:edge===1?{x:1+margin+i*.05,y:across}:edge===2?{x:across,y:-.16-i*.04}:{x:across,y:1.16+i*.04};
   const end=edge===0?{x:1+margin,y:.32+rnd()*.30}:edge===1?{x:-margin,y:.32+rnd()*.30}:edge===2?{x:.15+rnd()*.7,y:1.2}:{x:.15+rnd()*.7,y:-.2};
   this.fairies.push({id:this.nextId++,kind:Math.floor(rnd()*4),start,end,x:start.x,y:start.y,life:0,duration:9+rnd()*4,phase:rnd()*6,bend:(rnd()-.5)*.12,emit:.25+rnd()*.45,face:end.x>=start.x?1:-1});
  }
 }
 update(dt,aspect,available=28){
  this.clock+=dt;if(this.clock>=this.nextGroup){this.group(aspect);this.nextGroup=this.clock+3.5+this.random()*2;}
  const bubbles=[];
  for(const f of this.fairies){
   f.life+=dt;const u=Math.min(1,f.life/f.duration),curve=Math.sin(u*Math.PI)*f.bend;
   f.x=f.start.x+(f.end.x-f.start.x)*u+curve*.5;f.y=f.start.y+(f.end.y-f.start.y)*u+curve+Math.sin(f.life*2+f.phase)*.012;
   f.wand={x:f.x+f.face*.0672*aspect,y:f.y-.0416};f.emit-=dt;
   if(f.emit<=0&&f.wand.x>.06&&f.wand.x<.94&&f.wand.y>.18&&f.wand.y<.70){
    f.emit=.30+this.random()*.42+(f.kind===1?.25:0);if(bubbles.length>=available)continue;
    this.emitted++;const giant=this.emitted%17===0,r=giant?.10:f.kind===0?.028+this.random()*.012:f.kind===1?.052:.033+this.random()*.02;
    bubbles.push({type:this.emitted%11===0&&!giant?'star':'bubble',fairyBubble:true,giant,x:f.wand.x,y:f.wand.y,r:r*.25,fullR:r,life:0,ttl:12,color:FAIRY_COLORS[f.kind],seed:this.random()*6,vx:(f.face*.018+(this.random()-.5)*.045)*aspect,vy:(.46-f.wand.y)*.07,popDelay:.32});
   }
  }
  this.fairies=this.fairies.filter(f=>f.life<f.duration);
  return bubbles;
 }
}
export function moveFairyBubble(t,dt,aspect){
 t.life+=dt;t.r=t.fullR*(.25+.75*Math.min(1,t.life/.55));t.x+=t.vx*dt;t.y+=(t.vy+Math.sin(t.life*1.7+t.seed)*.012)*dt;
 t.vx*=Math.exp(-dt*.16);t.vy+=(.44-t.y)*dt*.018;
 const margin=Math.min(.2,t.r*aspect*1.2);if(t.x<margin){t.x=margin;t.vx=Math.abs(t.vx);}if(t.x>1-margin){t.x=1-margin;t.vx=-Math.abs(t.vx);}t.y=clamp(t.y,.18,.74);
}
export function splitGiant(t,aspect){
 if(!t.giant)return [];
 return Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return {type:'bubble',fairyBubble:true,giant:false,x:clamp(t.x+Math.cos(a)*t.r*.55*aspect,.06,.94),y:clamp(t.y+Math.sin(a)*t.r*.55,.18,.74),r:.014,fullR:.031,life:0,ttl:10,color:FAIRY_COLORS[i%4],seed:a,vx:Math.cos(a)*.13*aspect,vy:Math.sin(a)*.11,popDelay:.45};});
}
