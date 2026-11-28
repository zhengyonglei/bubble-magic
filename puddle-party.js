const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SURPRISES=['SPLISH!','Rainbow splash!','Duck parade!','Bubble bath!','Flower shower!','Frog hop!','Star puddle!','Jelly wobble!','Butterfly party!','Silly socks!','Confetti splash!','SUPER SPLOSH!'];
const PALETTE=['#b47555','#ef9bbd','#f4c95c','#8acbd0','#b5a0dc','#85bb74'];
// Normalized screen coordinates, with no face landmarks used as splash anchors.
export function puddleBodies(players,project,now){return players.filter(p=>now-p.seen<350).flatMap(p=>{
 const pose=p.pose,ids=[11,12,23,24];if(ids.some(i=>!pose[i]||(pose[i].visibility??1)<.5))return [];
 const points=pose.map(project),a=points[11],b=points[12],c=points[23],d=points[24];
 const height=Math.abs((c.y+d.y-a.y-b.y)/2),width=Math.max(.045,Math.abs(a.x-b.x));
 const anchors=[{x:(a.x+b.x+c.x+d.x)/4,y:(a.y+b.y+c.y+d.y)/4}];
 for(const [i,j] of [[11,13],[12,14],[23,25],[24,26]])if((pose[j]?.visibility??0)>.5)anchors.push({x:(points[i].x+points[j].x)/2,y:(points[i].y+points[j].y)/2});
 const feet=[27,28].filter(i=>(pose[i]?.visibility??0)>.5).map(i=>points[i].y);
 return [{id:p.id,x:anchors[0].x,y:anchors[0].y,height,width,foot:clamp(feet.length?Math.max(...feet):Math.max(c.y,d.y)+height*.9,.4,.94),anchors}];
 });}
export class LandingTracker{
 constructor(){this.people=new Map();}
 update(bodies,now){const landed=[];
  for(const b of bodies){let s=this.people.get(b.id);
   if(!s||now-s.seen>350||Math.abs(b.x-s.x)>.18||Math.abs(b.y-s.last)>.18){this.people.set(b.id,{ground:b.y,last:b.y,x:b.x,seen:now,air:false,frames:0,cooldown:now+350});continue;}
   const threshold=Math.max(.014,b.height*.09),rise=s.ground-b.y;
   if(!s.air){s.frames=rise>threshold?s.frames+1:0;if(s.frames>=2&&now>=s.cooldown){s.air=true;s.takeoff=now;}
    if(rise<threshold*.5)s.ground=s.ground*.94+b.y*.06;
   }else if(now-s.takeoff>1800){s.air=false;s.ground=b.y;s.frames=0;}
   else if(rise<threshold*.35&&b.y>=s.last&&now-s.takeoff>=70){landed.push(b);s.air=false;s.frames=0;s.cooldown=now+300;s.ground=b.y;}
   s.last=b.y;s.x=b.x;s.seen=now;
  }
  for(const [id,s] of this.people)if(now-s.seen>350)this.people.delete(id);
  return landed;
 }
}
export class PuddleParty{
 constructor(random=Math.random){this.random=random;this.tracker=new LandingTracker();this.drops=[];this.splats=[];this.effects=[];this.count=0;this.cooldown=0;this.lastLanding=-10;this.lastPlayer=null;this.clock=0;this.banner='Little jumps. Big splashes!';this.deck=[];}
 nextSurprise(){if(!this.deck.length){this.deck=Array.from({length:SURPRISES.length},(_,i)=>i);for(let i=this.deck.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];}}return this.deck.pop();}
 land(body,bodies){const variant=this.nextSurprise(),together=this.clock-this.lastLanding<.65&&body.id!==this.lastPlayer;
  this.lastLanding=this.clock;this.lastPlayer=body.id;this.count++;this.banner=together?'TOGETHER SPLOSH!':SURPRISES[variant];
  this.effects.push({x:body.x,y:body.foot,life:0,variant,together});
  const recipients=bodies.filter(b=>b.id!==body.id),recipient=recipients.length?recipients[Math.floor(this.random()*recipients.length)]:body;
  for(let i=0;i<18;i++){
   const anchor=i%recipient.anchors.length,point=recipient.anchors[anchor],flight=.5+this.random()*.3;
   const aimed=i<5,dx=(this.random()-.5)*recipient.width*.3,dy=(this.random()-.5)*body.height*.15;
   this.drops.push({x:body.x,y:body.foot,vx:aimed?(point.x+dx-body.x)/flight:(this.random()-.5)*.8,vy:aimed?(point.y+dy-body.foot-.5*.9*flight*flight)/flight:-.35-this.random()*.65,life:0,flight,aimed,id:recipient.id,anchor,dx,dy,color:i%3===0?PALETTE[variant%6]:'#a66d4d',r:.007+this.random()*.007});
  }
  this.drops=this.drops.slice(-180);this.effects=this.effects.slice(-12);return {x:body.x,y:body.foot,text:this.banner};
 }
 update(dt,bodies,now,demoJump=false){this.clock+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
  const landings=demoJump?(this.cooldown===0&&bodies.length?[bodies[0]]:[]):this.tracker.update(bodies,now);
  const events=landings.map(b=>this.land(b,bodies));if(demoJump&&events.length)this.cooldown=.4;
  for(const d of this.drops){const travel=d.aimed?Math.max(0,Math.min(dt,d.flight-d.life)):dt;d.life+=dt;d.x+=d.vx*travel;d.y+=d.vy*travel+.45*travel*travel;d.vy+=.9*travel;
   if(d.aimed&&d.life>=d.flight){const b=bodies.find(b=>b.id===d.id),p=b?.anchors[d.anchor];
    // Only attach when the actual droplet reaches the moving body; no teleporting mud.
    if(p&&Math.hypot(d.x-p.x,d.y-p.y)<Math.max(.045,b.width*.65))this.splats.push({id:d.id,anchor:d.anchor,dx:d.dx,dy:d.dy,r:d.r*1.9,color:d.color,life:0});d.dead=true;
   }
  }
  this.drops=this.drops.filter(d=>!d.dead&&d.life<1.6&&d.y<1.1);
  this.splats=this.splats.filter(s=>{s.life+=dt;return s.life<5&&bodies.some(b=>b.id===s.id);}).slice(-48);
  this.effects=this.effects.filter(e=>{e.life+=dt;return e.life<2.2;});return events;
 }
}
function oval(c,x,y,rx,ry,color,stroke=false){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle='#715448';c.lineWidth=3;c.stroke();}}
export function drawPuddleScene(c,w,h,time){
 c.fillStyle='#bce7ee';c.fillRect(0,0,w,h);oval(c,w*.87,h*.16,h*.065,h*.065,'#ffdf76');
 for(let i=0;i<4;i++){const x=w*(.12+i*.25)+Math.sin(time*.08+i)*8,y=h*(.12+(i%2)*.07);for(let j=0;j<3;j++)oval(c,x+j*24,y-(j===1?12:0),35,20,'#fffaf2');}
 oval(c,w*.23,h*.89,w*.65,h*.4,'#96ce82');oval(c,w*.85,h*.96,w*.6,h*.38,'#afd78b');
 c.fillStyle='#bbdf94';c.fillRect(0,h*.8,w,h*.2);
 for(let i=0;i<15;i++){const x=w*(i+.5)/15,y=h*(.77+(i%3)*.055);c.strokeStyle='#73a85d';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-15);c.stroke();oval(c,x+3,y-17,5,5,i%2?'#f5a9bf':'#fff2af');}
}
function splat(c,x,y,r,color){oval(c,x,y,r,r*.65,color);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;oval(c,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.55,r*.45,r*.35,color);}}
export function drawPuddles(c,w,h,bodies,time){for(const b of bodies){const x=b.x*w,y=b.foot*h,r=clamp(b.width*w,65,145);oval(c,x,y,r,18,'#7d5946',true);oval(c,x,y-3,r*.84,10,'#b68a65');c.strokeStyle='#dec09a';c.lineWidth=3;c.beginPath();c.ellipse(x-10,y-4,r*.55,5,0,Math.PI,Math.PI*2);c.stroke();}}
export function drawPuddleEffects(c,w,h,party,bodies,reduced=false){
 const icons=['💦','🌈','🦆','🫧','🌼','🐸','⭐','🍮','🦋','🧦','🎉','🐳'];
 for(const e of party.effects){const k=e.life/2.2;c.save();c.globalAlpha=Math.min(1,(1-k)*2);const x=e.x*w,y=e.y*h;
  c.strokeStyle=PALETTE[e.variant%6];c.lineWidth=5*(1-k)+1;c.beginPath();c.ellipse(x,y,(45+e.life*100)*(e.together?1.4:1),10+e.life*20,0,0,Math.PI*2);c.stroke();
  c.font=`${Math.round(h*.065)}px sans-serif`;c.textAlign='center';
  for(let j=0;j<(reduced?2:5);j++){const a=Math.PI+(j+1)*Math.PI/6,r=(reduced?45:60+e.life*65);c.fillText(icons[e.variant],x+Math.cos(a)*r,y+Math.sin(a)*r-e.life*30);}c.restore();
 }
 for(const d of party.drops){c.save();c.globalAlpha=Math.min(1,(1.6-d.life)*3);splat(c,d.x*w,d.y*h,d.r*h,d.color);c.restore();}
 for(const s of party.splats){const b=bodies.find(b=>b.id===s.id),p=b?.anchors[s.anchor];if(!p)continue;c.save();c.globalAlpha=Math.min(1,5-s.life);splat(c,(p.x+s.dx)*w,(p.y+s.dy)*h+s.life*s.life*.25,s.r*h,s.color);c.restore();}
}
