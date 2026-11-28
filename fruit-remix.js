import {fruitSize} from './game-modes.js?v=0.13.0';
export class FruitRemix {
 constructor(){this.clock=0;this.nextWave=.4;this.wave=0;this.lastZone=-1;this.lastSide=null;this.swipes=new Map();this.banner='Ready, set, slice!';this.bannerUntil=2;}
 update(dt,elapsed,aspect,aimY=.42,random=Math.random,playerCount=1,duration=60){
  this.clock+=dt;if(this.clock<this.nextWave)return [];
  const people=Math.max(1,Math.min(4,Math.floor(playerCount)||1));
  const stage=duration>60?elapsed%50:elapsed,finale=elapsed>=duration-10,base=finale?8:stage<15?4:stage<35?5:6,count=base+2*(people-1);
  this.wave++;
  this.banner=finale?'FRUIT SHOWER!':stage<15?'Little bunches, big swipes!':stage<35?'Find your rhythm!':'Juicy combos!';this.bannerUntil=this.clock+1.4;
  const result=[];let delay=0;
  while(result.length<count){
   const remaining=count-result.length,size=remaining<=3?remaining:remaining===4?2:random()<.55?2:3;
   const zone=this.lastZone<0?Math.floor(random()*3):(this.lastZone+1+Math.floor(random()*2))%3;
   this.lastZone=zone;
   const left=this.lastSide===null?random()<.5:random()<.6?!this.lastSide:this.lastSide;this.lastSide=left;
   const profile=Math.floor(random()*3),entryY=[.40,.61,.78][profile]+(random()-.5)*.08;
   const centerX=[.27,.50,.73][zone],centerY=Math.max(.24,Math.min(.50,aimY+(random()-.5)*.20));
   const flight=1.25+random()*.45;
   for(let j=0;j<size;j++){
    const i=result.length,fruit=(this.wave+i)%3,r=.046*fruitSize(fruit),x=left?-(r*aspect*1.3+.02):1+r*aspect*1.3+.02;
    const y=entryY+(j-(size-1)/2)*.025;
    const apexY=Math.max(.24,Math.min(y-.06,centerY+(j-(size-1)/2)*.035));
    const aimX=Math.max(.23,Math.min(.77,centerX+(j-(size-1)/2)*.045));
    const apexTime=flight+(j-(size-1)/2)*.04,gravity=2*(y-apexY)/(apexTime*apexTime);
    result.push({x,y,vx:(aimX-x)/apexTime,vy:-gravity*apexTime,gravity,tossed:true,ttl:10,fruit,r,type:'fruit',life:0,seed:random()*6,spin:(random()-.5)*3,rotation:random()*6,color:['#ff686b','#ffb340','#ef557a'][fruit],remix:true,launchDelay:delay,cluster:this.wave+':'+delay});
   }
   delay+=(finale?.6:people>2?.7:.85)+random()*.2;
  }
  this.nextWave=this.clock+delay+.25;
  return result;
 }
 hit(handId,target,now){
  const angle=target.cut?.angle??0,old=this.swipes.get(handId);
  const continuous=old&&now-old.last<180&&now-old.start<850&&Math.cos(angle-old.angle)>.15;
  const swipe=continuous?old:{start:now,last:now,angle,count:0,ids:new Set()};
  if(swipe.ids.has(target.id))return {bonus:0,count:swipe.count};
  swipe.ids.add(target.id);swipe.count++;swipe.last=now;swipe.angle=angle;this.swipes.set(handId,swipe);
  for(const [id,s] of this.swipes)if(now-s.last>1000)this.swipes.delete(id);
  return {bonus:swipe.count===3?30:swipe.count>3?15:0,count:swipe.count};
 }
}
// Draw fresh cut surfaces inside the original swipe-aligned half silhouettes.
export function drawJuicyHalf(ctx,s,reduced=false){
 ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle+(reduced?0:s.side*s.life*1.8));
 const r=s.r;ctx.beginPath();ctx.rect(-r*1.5,s.side<0?-r*1.5:s.offset,r*3,s.side<0?r*1.5+s.offset:r*1.5-s.offset);ctx.clip();
 const disk=(radius,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();};
 disk(r,['#dc4f49','#fba52d','#4b9d65'][s.fruit]);disk(r*.88,['#fff1bc','#ffe4a0','#f4efba'][s.fruit]);disk(r*.78,['#ffedce','#ffa832','#f46175'][s.fruit]);
 if(s.fruit===1){ctx.strokeStyle='#ffeac4';ctx.lineWidth=2;for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.77,Math.sin(a)*r*.77);ctx.stroke();}}
 else{ctx.fillStyle=s.fruit===2?'#532e47':'#886044';for(let i=0;i<(s.fruit===2?9:4);i++){const a=i*2.4;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.53,Math.sin(a)*r*.53,r*.035,r*.065,a,0,Math.PI*2);ctx.fill();}}
 ctx.restore();
}
export function remixSliceSound(audio,combo=false){
 const t=audio.currentTime,buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.13),audio.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
 const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(2200,t);filter.frequency.exponentialRampToValueAtTime(500,t+.13);gain.gain.setValueAtTime(.12,t);gain.gain.exponentialRampToValueAtTime(.001,t+.14);src.connect(filter).connect(gain).connect(audio.destination);src.start(t);src.stop(t+.15);
 if(combo)for(let i=0;i<3;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=[660,880,1100][i];g.gain.setValueAtTime(.035,t+i*.045);g.gain.exponentialRampToValueAtTime(.001,t+.3+i*.045);o.connect(g).connect(audio.destination);o.start(t+i*.045);o.stop(t+.35+i*.045);}
}
export const REMIX_TRAILS=[
 {color:'#37deef',shape:'circle',name:'Cyan'},
 {color:'#ff807d',shape:'diamond',name:'Coral'},
 {color:'#ffce57',shape:'star',name:'Gold'},
 {color:'#bb85ff',shape:'cross',name:'Violet'}
];
// Session-local positional roster. Reserve a style during brief detection gaps.
export class RemixRoster {
 constructor(){this.tracks=[];this.nextId=1;}
 update(poses,now){
  this.tracks=this.tracks.filter(p=>now-p.seen<=1500);
  const detections=poses.filter(p=>[11,12,23,24].every(i=>p[i]&&(p[i].visibility??1)>.45)).map(pose=>({pose,cx:(pose[11].x+pose[12].x)/2,cy:(pose[11].y+pose[12].y)/2}));
  const pairs=[];for(const t of this.tracks)for(const [i,p] of detections.entries()){const d=Math.hypot(t.cx-p.cx,t.cy-p.cy);if(d<.20)pairs.push({t,i,d});}pairs.sort((a,b)=>a.d-b.d);
  const used=new Set(),matched=new Set();
  for(const {t,i} of pairs){if(used.has(i)||matched.has(t.id))continue;used.add(i);matched.add(t.id);const p=detections[i];if(now-t.seen>250&&!t.joined)t.since=now;Object.assign(t,p,{seen:now,stable:t.stable+1});if(now-t.since>=900)t.joined=true;}
  for(const [i,p] of detections.entries()){if(used.has(i)||this.tracks.length>=4)continue;const slot=[0,1,2,3].find(s=>!this.tracks.some(t=>t.slot===s));this.tracks.push({...p,id:'remix-'+this.nextId++,slot,since:now,seen:now,stable:1,joined:false});}
  return this.tracks.filter(t=>t.joined&&t.seen===now);
 }
}
