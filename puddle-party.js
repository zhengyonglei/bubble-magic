const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SURPRISES=['SPLISH!','Rainbow splash!','Duck parade!','Bubble bath!','Flower shower!','Frog hop!','Star puddle!','Jelly wobble!','Butterfly party!','Silly socks!','Confetti splash!','SUPER SPLOSH!'];
export const SPLASH_STYLES=['fan','fountain','sideways','big-blobs','fine-spray','double-jet'];
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
  const style=this.count%SPLASH_STYLES.length;
  this.effects.push({x:body.x,y:body.foot,life:0,variant,together,style,seed:this.random()*6.28});
  const recipients=bodies.filter(b=>b.id!==body.id),recipient=recipients.length?recipients[Math.floor(this.random()*recipients.length)]:body;
  const count=[24,28,30,18,38,26][style];
  for(let i=0;i<count;i++){
   const anchor=i%recipient.anchors.length,point=recipient.anchors[anchor],flight=.5+this.random()*.3;
   const aimed=i<5,dx=(this.random()-.5)*recipient.width*.3,dy=(this.random()-.5)*body.height*.15;
   const fan=(i/(count-1)-.5),speed=.65+this.random()*.45;
   const vx=[fan*1.5,fan*.35,fan*2.1,fan*.9,fan*1.8,(i%2?1:-1)*(.24+this.random()*.15)][style];
   const vy=[-.35-Math.cos(fan*2)*.3,-speed,-.25-this.random()*.25,-.5-this.random()*.45,-.2-this.random()*.65,-.6-this.random()*.25][style];
   this.drops.push({style,spin:(this.random()-.5)*9,angle:this.random()*6.28,shape:i%3,x:body.x,y:body.foot,vx:aimed?(point.x+dx-body.x)/flight:vx,vy:aimed?(point.y+dy-body.foot-.5*.9*flight*flight)/flight:vy,life:0,flight,aimed,id:recipient.id,anchor,dx,dy,color:i%3===0?PALETTE[variant%6]:'#a66d4d',r:style===3?.014+this.random()*.014:style===4?.003+this.random()*.005:.006+this.random()*.011});
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
 // Rolling hills and a yellow house at the crest behind the players.
 oval(c,w*.65,h*.88,w*.42,h*.51,'#94c975');oval(c,w*.12,h*.93,w*.56,h*.37,'#a6d486');
 c.save();c.translate(w*.65,h*.375);const u=Math.min(w*.13,h*.24);c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#856a51';
 c.fillStyle='#f9e49b';c.beginPath();c.rect(-u*.43,-u*.83,u*.86,u*.84);c.fill();c.stroke();
 c.fillStyle='#db7c63';c.beginPath();c.moveTo(-u*.5,-u*.83);c.lineTo(0,-u*1.13);c.lineTo(u*.5,-u*.83);c.closePath();c.fill();c.stroke();
 c.fillStyle='#e8a08a';c.fillRect(u*.2,-u*1.12,u*.1,u*.24);c.strokeRect(u*.2,-u*1.12,u*.1,u*.24);
 for(const x of [-.23,.23])for(const y of [-.64,-.3]){c.fillStyle='#d6eff3';c.fillRect(u*(x-.09),u*y,u*.18,u*.19);c.strokeRect(u*(x-.09),u*y,u*.18,u*.19);c.beginPath();c.moveTo(u*x,u*y);c.lineTo(u*x,u*(y+.19));c.moveTo(u*(x-.09),u*(y+.095));c.lineTo(u*(x+.09),u*(y+.095));c.stroke();}
 c.fillStyle='#d78f74';c.fillRect(-u*.075,-u*.26,u*.15,u*.27);c.strokeRect(-u*.075,-u*.26,u*.15,u*.27);oval(c,u*.035,-u*.12,2,2,'#846451');c.restore();
 c.strokeStyle='#ebd79d';c.lineWidth=h*.024;c.beginPath();c.moveTo(w*.65,h*.38);c.bezierCurveTo(w*.61,h*.44,w*.76,h*.48,w*.67,h*.57);c.stroke();
 c.fillStyle='#bbdf94';c.fillRect(0,h*.8,w,h*.2);
 for(let i=0;i<15;i++){const x=w*(i+.5)/15,y=h*(.77+(i%3)*.055);c.strokeStyle='#73a85d';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-15);c.stroke();oval(c,x+3,y-17,5,5,i%2?'#f5a9bf':'#fff2af');}
}
function splat(c,x,y,r,color){oval(c,x,y,r,r*.65,color);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;oval(c,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.55,r*.45,r*.35,color);}}
// One continuous pool spans the play area, stationary while players jump.
export function drawPuddles(c,w,h,bodies,time){
 const x=w*.5,y=h*.83,rx=w*.49,ry=h*.135;
 c.save();c.beginPath();
 for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,r=1+.025*Math.sin(a*7)+.015*Math.cos(a*11);const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;if(i===0)c.moveTo(px,py);else c.lineTo(px,py);}
 c.closePath();c.fillStyle='#956548';c.fill();c.strokeStyle='#70513e';c.lineWidth=5;c.stroke();
 oval(c,x,y-ry*.1,rx*.94,ry*.75,'#b5835e');
 for(let i=0;i<7;i++){const xx=w*(.08+i*.14),yy=y+Math.sin(i*2)*ry*.4;c.strokeStyle=i%2?'#cd9d74':'#dfb88e';c.lineWidth=3;c.beginPath();c.ellipse(xx,yy,w*.047,ry*.12,0,.2,Math.PI*1.1);c.stroke();}
 for(let i=0;i<5;i++){const xx=w*(.13+i*.18),yy=y+ry*.35;oval(c,xx,yy,5+Math.sin(time*1.8+i)*2,3,'#d8ac82');}c.restore();
}
export function drawPuddleEffects(c,w,h,party,bodies,reduced=false){
 const icons=['💦','🌈','🦆','🫧','🌼','🐸','⭐','🍮','🦋','🧦','🎉','🐳'];
 for(const e of party.effects){const k=e.life/2.2;c.save();c.globalAlpha=Math.min(1,(1-k)*2);const x=e.x*w,y=e.y*h;
  c.strokeStyle=PALETTE[e.variant%6];c.lineWidth=5*(1-k)+1;c.beginPath();c.ellipse(x,y,(45+e.life*100)*(e.together?1.4:1),10+e.life*20,0,0,Math.PI*2);c.stroke();
  // Scalloped mud sheets give each landing a distinct splash silhouette.
  const progress=Math.min(1,e.life/.65),height=Math.sin(progress*Math.PI)*h*(e.style===1?.23:.13)*(e.together?1.3:1)*(reduced?.4:1);
  if(height>0){const reach=h*([.22,.10,.34,.18,.3,.22][e.style])*(.3+progress);c.fillStyle=e.style===4?'#bd8a60':'#a66e4d';c.beginPath();c.moveTo(x-reach,y);
    for(let j=0;j<=12;j++){const xx=x-reach+j*reach/6,peak=(j%2?.4:1)*(.65+.35*Math.sin(j*1.7+e.seed));c.lineTo(xx,y-height*peak);}
    c.lineTo(x+reach,y);c.closePath();c.fill();}
  c.font=`${Math.round(h*.065)}px sans-serif`;c.textAlign='center';
  for(let j=0;j<(reduced?2:5);j++){const a=Math.PI+(j+1)*Math.PI/6,r=(reduced?45:60+e.life*65);c.fillText(icons[e.variant],x+Math.cos(a)*r,y+Math.sin(a)*r-e.life*30);}c.restore();
 }
 for(const d of party.drops){c.save();c.globalAlpha=Math.min(1,(1.6-d.life)*3);c.translate(d.x*w,d.y*h);c.rotate(d.angle+(reduced?0:d.life*d.spin));if(d.shape===0)splat(c,0,0,d.r*h,d.color);else oval(c,0,0,d.r*h,d.r*h*(d.shape===1?1.9:.65),d.color);c.restore();}
 for(const s of party.splats){const b=bodies.find(b=>b.id===s.id),p=b?.anchors[s.anchor];if(!p)continue;c.save();c.globalAlpha=Math.min(1,5-s.life);splat(c,(p.x+s.dx)*w,(p.y+s.dy)*h+s.life*s.life*.25,s.r*h,s.color);c.restore();}
}
