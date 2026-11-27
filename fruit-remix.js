import {fruitLaunch,fruitSize} from './game-modes.js?v=0.13.0';
export class FruitRemix {
 constructor(){this.clock=0;this.nextWave=.4;this.wave=0;this.swipes=new Map();this.banner='Ready, set, slice!';this.bannerUntil=2;}
 update(dt,elapsed,aspect,aimY=.42,random=Math.random){
  this.clock+=dt;if(this.clock<this.nextWave)return [];
  const finale=elapsed>=50,count=finale?7:elapsed<15?3:elapsed<35?4:5;
  this.nextWave=this.clock+(finale?2.3:3.6);this.wave++;
  this.banner=finale?'FRUIT SHOWER!':elapsed<15?'Sweep through a whole wave!':elapsed<35?'Find your rhythm!':'Juicy combos!';this.bannerUntil=this.clock+1.4;
  return Array.from({length:count},(_,i)=>{
   const fruit=(this.wave+i)%3,r=.046*fruitSize(fruit),left=this.wave%2;
   const launch=fruitLaunch('easy',left,r,Math.max(.26,Math.min(.55,aimY+(i-(count-1)/2)*.035)),random,aspect);
   return {...launch,x:launch.x+(left?-1:1)*i*.045,y:launch.y+i*.012,gravity:.36,fruit,r,type:'fruit',life:0,seed:random()*6,spin:(random()-.5)*3,rotation:random()*6,color:['#ff686b','#ffb340','#ef557a'][fruit],remix:true};
  });
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
