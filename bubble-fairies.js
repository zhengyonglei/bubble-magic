const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FAIRY_COLORS=['#99e1ca','#ffbcad','#cfaff4','#ffe193'];
export class FairyGarden {
 constructor(random=Math.random){this.random=random;this.fairies=[];this.clock=0;this.nextGroup=.15;this.emitted=0;this.nextId=1;}
 group(aspect){
  const rnd=this.random,edge=Math.floor(rnd()*3),count=2+Math.floor(rnd()*3),margin=Math.max(.13,.11*aspect);
  for(let i=0;i<count&&this.fairies.length<6;i++){
   const across=.30+rnd()*.30,start=edge===0?{x:-margin-i*.05,y:across}:edge===1?{x:1+margin+i*.05,y:across}:{x:.2+rnd()*.6,y:-.16-i*.04};
   const exit=edge===2?(rnd()<.5?0:1):(rnd()<.35?2:1-edge);
   const end=exit===0?{x:-margin,y:.30+rnd()*.30}:exit===1?{x:1+margin,y:.30+rnd()*.30}:{x:.2+rnd()*.6,y:-.18};
   let c1,c2;
   if(edge===2){c1={x:start.x,y:.65};c2={x:exit===0?.22:.78,y:.48+rnd()*.18};}
   else if(exit===2){c1={x:edge===0?.32:.68,y:.58+rnd()*.1};c2={x:end.x,y:.38};}
   else{const dip=rnd()<.5;c1={x:edge===0?.25:.75,y:dip?.72:.12};c2={x:edge===0?.75:.25,y:dip?.12:.72};}
   this.fairies.push({id:this.nextId++,kind:Math.floor(rnd()*4),start,end,c1,c2,x:start.x,y:start.y,life:0,duration:10+rnd()*4,phase:rnd()*6,emit:.25+rnd()*.45,face:end.x>=start.x?1:-1});
  }
 }
 update(dt,aspect,available=28){
  this.clock+=dt;if(this.clock>=this.nextGroup){this.group(aspect);this.nextGroup=this.clock+3.5+this.random()*2;}
  const bubbles=[];
  for(const f of this.fairies){
   f.life+=dt;const u=Math.min(1,f.life/f.duration),p=fairyPosition(f,u);
   f.x=p.x;f.y=p.y;if(Math.abs(p.dx)>.02)f.face=p.dx>0?1:-1;
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

// Cubic paths stay above the bottom edge; facing follows the actual tangent.
export function fairyPosition(f,u){
 const v=1-u;return {x:v*v*v*f.start.x+3*v*v*u*f.c1.x+3*v*u*u*f.c2.x+u*u*u*f.end.x,y:v*v*v*f.start.y+3*v*v*u*f.c1.y+3*v*u*u*f.c2.y+u*u*u*f.end.y,dx:3*v*v*(f.c1.x-f.start.x)+6*v*u*(f.c2.x-f.c1.x)+3*u*u*(f.end.x-f.c2.x)};
}
