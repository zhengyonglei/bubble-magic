// Session-only appearance cues. No images or descriptors are saved or uploaded.
const visible=(p,i,min=.5)=>p?.[i]&&p[i].visibility>=min;
// Bounded numeric diagnostics only; no images, landmarks or appearance descriptors.
export class TrackingDiagnostics {
 reset(){this.frames=[];this.lastFrame=null;this.delegate='unknown';this.pauses={};this.current='loading';this.since=0;this.pauseMs=0;this.frameCount=0;}
 constructor(){this.reset();}
 sample(now,ms,age){this.frameCount++;this.frames.push({ms:Number.isFinite(ms)?ms:0,age:Math.max(0,age),interval:this.lastFrame===null?0:now-this.lastFrame});this.lastFrame=now;if(this.frames.length>60)this.frames.shift();}
 state(code,now){if(code===this.current)return;if(this.current!=='locked'&&this.current!=='loading'&&this.current!=='manual'&&this.current!=='select')this.pauseMs+=Math.max(0,now-this.since);if(!['locked','loading','manual','select'].includes(code))this.pauses[code]=(this.pauses[code]||0)+1;this.current=code;this.since=now;}
 summary(){const n=this.frames.length;if(!n)return 'Waiting for camera frames.';const ms=this.frames.reduce((v,f)=>v+f.ms,0)/n,intervals=this.frames.filter(f=>f.interval>0&&f.interval<2000),rate=intervals.length?1000/(intervals.reduce((v,f)=>v+f.interval,0)/intervals.length):0;return `${rate.toFixed(1)} tracking frames/s · ${Math.round(ms)} ms processing · ${this.current}`;}
 report(){return JSON.stringify({build:'runner-09',delegate:this.delegate,frames:this.frameCount,recent:this.summary(),maxRecentFrameAgeMs:Math.round(Math.max(0,...this.frames.map(f=>f.age))),pauseTransitionsByCause:this.pauses,completedTrackingPauseMs:Math.round(this.pauseMs),currentState:this.current},null,2);}
}
function histogram(image,points){
 const bins=new Array(66).fill(0);let count=0;
 for(const [nx,ny] of points){const x=Math.round(nx*image.width),y=Math.round(ny*image.height);if(x<0||y<0||x>=image.width||y>=image.height)continue;const k=(y*image.width+x)*4;const r=image.data[k],g=image.data[k+1],b=image.data[k+2],sum=r+g+b;if(sum<60){bins[64]++;count++;continue;}if(sum>720){bins[65]++;count++;continue;}// Soft colour bins avoid abrupt identity changes at quantization boundaries.
 const channels=[r,g,b].map(v=>3*v/sum),lo=channels.map(Math.floor),fraction=channels.map((v,i)=>v-lo[i]);
 for(let mask=0;mask<8;mask++){let weight=1;const cell=lo.map((v,i)=>{const high=(mask>>i)&1;weight*=high?fraction[i]:1-fraction[i];return Math.min(3,v+high);});bins[cell[0]*16+cell[1]*4+cell[2]]+=weight;}count++;}
 return count>=20?bins.map(v=>v/count):null;
}
function patch(image,p,top,bottom){
 if(![...top,...bottom].every(i=>visible(p,i)))return null;
 const points=[];for(let row=0;row<10;row++){const v=.15+row*.07;const l={x:p[top[0]].x*(1-v)+p[bottom[0]].x*v,y:p[top[0]].y*(1-v)+p[bottom[0]].y*v},r={x:p[top[1]].x*(1-v)+p[bottom[1]].x*v,y:p[top[1]].y*(1-v)+p[bottom[1]].y*v};for(let col=0;col<10;col++){const u=.2+col*.065;points.push([l.x*(1-u)+r.x*u,l.y*(1-u)+r.y*u]);}}
 return histogram(image,points);
}
export function appearance(image,p){
 if(!image?.data)return null;
 const shirt=patch(image,p,[11,12],[23,24]);if(!shirt)return null;
 const trousers=patch(image,p,[23,24],[25,26]);
 // Optional frontal-face colour cue. This is not a face-recognition embedding.
 let face=null;if([0,2,5,7,8].every(i=>visible(p,i,.7))){const left=Math.min(p[7].x,p[8].x),right=Math.max(p[7].x,p[8].x),width=right-left;const cy=(p[2].y+p[5].y)/2;if(width*image.width>=18&&p[0].x>left+width*.2&&p[0].x<right-width*.2){const points=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)points.push([left+width*(.2+x*.08),cy+width*(-.15+y*.06)]);face=histogram(image,points);}}
 return {shirt,trousers,face};
}
const distance=(a,b)=>a.reduce((v,n,i)=>v+Math.abs(n-b[i]),0)/2;
export function appearanceScore(a,b){
 if(!a?.shirt||!b?.shirt)return null;
 const shirt=distance(a.shirt,b.shirt);if(shirt>.42)return null;
 let sum=shirt*.7,weight=.7;
 if(a.trousers&&b.trousers){const d=distance(a.trousers,b.trousers);sum+=d*.25;weight+=.25;}
 if(a.face&&b.face){sum+=distance(a.face,b.face)*.05;weight+=.05;}
 return sum/weight;
}
const links=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]];
export function drawTracking(ctx,poses,selected,waiting,width,height){
 ctx.clearRect(0,0,width,height);ctx.lineJoin='round';ctx.lineCap='round';
 poses.forEach((p,index)=>{
 const points=p.filter(q=>q&&q.visibility>.45);if(points.length<4)return;
 const xy=q=>[(1-q.x)*width,q.y*height];const chosen=index===selected,color=chosen?(waiting?'#ffd166':'#61ff9c'):'#7ce8ff';
 ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=chosen?4:2;
 // Wide translucent strokes outline the detected limbs; narrow bones show joints.
 ctx.globalAlpha=.23;ctx.lineWidth=chosen?15:9;
 for(const [a,b] of links){if(!visible(p,a,.45)||!visible(p,b,.45))continue;ctx.beginPath();ctx.moveTo(...xy(p[a]));ctx.lineTo(...xy(p[b]));ctx.stroke();}
 ctx.globalAlpha=1;ctx.lineWidth=chosen?3:1.5;
 for(const [a,b] of links){if(!visible(p,a,.45)||!visible(p,b,.45))continue;ctx.beginPath();ctx.moveTo(...xy(p[a]));ctx.lineTo(...xy(p[b]));ctx.stroke();}
 if(visible(p,0,.45)){const [x,y]=xy(p[0]);const radius=Math.max(9,Math.abs((p[11]?.x??0)-(p[12]?.x??.1))*width*.28);ctx.beginPath();ctx.ellipse(x,y,radius,radius*1.2,0,0,Math.PI*2);ctx.stroke();}
 for(const i of [11,12,15,16,23,24,25,26,27,28])if(visible(p,i,.45)){ctx.beginPath();ctx.arc(...xy(p[i]),3,0,Math.PI*2);ctx.fill();}
 const xs=points.map(q=>(1-q.x)*width),ys=points.map(q=>q.y*height),x=Math.max(3,Math.min(...xs)-8),y=Math.max(18,Math.min(...ys)-9);
 ctx.font='bold 13px sans-serif';ctx.fillStyle='#103c39';ctx.fillRect(x,y-15,chosen?146:102,19);ctx.fillStyle=color;ctx.fillText(chosen?(waiting?'PLAYER · WAITING':'PLAYER · LOCKED'):'PERSON '+(index+1),x+4,y);
 });ctx.globalAlpha=1;
}
