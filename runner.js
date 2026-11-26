import {Runner,PlayerLock,Movement} from './runner-core.js';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
let game=new Runner(),active=false,paused=false,mode='demo',worker=null,stream=null,busy=false,ready=false,stamp=0,lastCapture=0,session=0;
let lock=new PlayerLock(),movement=new Movement(),motion={},lastPose=0,last=performance.now(),faces=[];
const held=new Set();let w=0,h=0;
function clearInput(){held.clear();motion={};}
function stopCamera(){session++;worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;ready=false;busy=false;motion={};$('camera-view').hidden=true;}
function begin(){stopCamera();game=new Runner();active=true;paused=false;mode='demo';clearInput();$('welcome').hidden=true;$('finish').hidden=true;$('controls').hidden=false;$('pause').textContent='Pause';canvas.focus();}
$('demo').onclick=begin;$('again').onclick=begin;
$('stop-camera').onclick=()=>{stopCamera();mode='demo';clearInput();};
$('select').onclick=()=>{lock.reset();movement=new Movement();motion={};lastPose=0;};
$('pause').onclick=()=>{if(!active)return;paused=!paused;clearInput();$('pause').textContent=paused?'Resume':'Pause';if(!paused)canvas.focus();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('message').textContent='Fullscreen unavailable. You can use the browser fullscreen command.';}};
function action(a){if(!active||paused||mode==='camera')return;if(a==='left')game.lane=Math.max(-1,game.lane-1);if(a==='right')game.lane=Math.min(1,game.lane+1);if(a==='jump')game.hop();}
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'move',KeyW:'move',ArrowDown:'duck',KeyS:'duck'};
window.addEventListener('keydown',e=>{const a=keys[e.code];if(!a||!active||e.target.tagName==='BUTTON'||e.target.tagName==='A')return;e.preventDefault();if(!e.repeat)action(a);held.add(e.code);});
window.addEventListener('keyup',e=>held.delete(e.code));
document.querySelectorAll('[data-action]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(`pointer:${e.pointerId}:${b.dataset.action}`);action(b.dataset.action);};const end=e=>held.delete(`pointer:${e.pointerId}:${b.dataset.action}`);b.onpointerup=end;b.onpointercancel=end;b.onlostpointercapture=end;});
function suspend(){clearInput();if(active){paused=true;$('pause').textContent='Resume';}if(mode==='camera'){lock.reset();movement=new Movement();lastPose=0;}}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();stream?.getVideoTracks().forEach(t=>t.enabled=!document.hidden);});window.addEventListener('pagehide',stopCamera);
function heldAction(a){return [...held].some(k=>keys[k]===a||k.endsWith(':'+a));}
$('camera').onclick=async()=>{
  begin();mode='camera';$('camera-view').hidden=false;lock=new PlayerLock();movement=new Movement();lastPose=0;const token=session;
  $('tracking').textContent='Opening camera and loading the movement model…';
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
    if(token!==session){s.getTracks().forEach(t=>t.stop());return;}stream=s;$('video').srcObject=s;await $('video').play();
    if(token!==session)return;
    worker=new Worker('./vision-worker.js');
    worker.onerror=()=>{ready=false;motion={};$('tracking').textContent='Tracking unavailable. Stop camera to use controls.';};
    worker.onmessage=({data})=>{
      if(data.type==='ready'){ready=true;$('tracking').textContent=lock.reason;}
      if(data.type==='error'){busy=false;ready=false;motion={};$('tracking').textContent=data.message;}
      if(data.type==='result'){
        data.frame?.close();busy=false;
        if(paused||document.hidden)return;
        const now=performance.now();
        // Discard late inference instead of letting an old pose control a new frame.
        if(now-data.stamp>450){motion={};lock.blocked=true;lock.reason='Tracking too slow. Select again or use controls.';}
        else{const b=lock.update(data.landmarks,now);motion=b?movement.update(b,now):{};if(b){lastPose=now;game.lane=motion.lane;if(motion.jump)game.hop();}}
        $('tracking').textContent=lock.reason;
      }
    };
    worker.postMessage({type:'init',players:4,cutout:false});
  }catch(e){if(token===session){stopCamera();mode='demo';$('message').textContent='Camera unavailable. Keyboard and touch controls are ready.';game.message='Camera unavailable. Keyboard and touch controls are ready.';}}
};
const capture=document.createElement('canvas');capture.width=480;capture.height=360;const cap=capture.getContext('2d');
async function infer(now){
  if(!ready||busy||paused||document.hidden||now-lastCapture<100||$('video').readyState<2)return;
  busy=true;lastCapture=now;const current=worker,token=session;
  try{cap.drawImage($('video'),0,0,480,360);const frame=await createImageBitmap(capture);if(token!==session||current!==worker){frame.close();return;}current.postMessage({type:'frame',frame,timestamp:Math.max(now,stamp+.01)},[frame]);stamp=now;}catch{busy=false;motion={};}
}

// Small software 3D renderer: world-space meshes, perspective projection and painter ordering.
// No WebGL dependency, textures, shadows, or high-DPI buffers on older integrated GPUs.
function project([x,y,z]){const d=z+7;return [w*.56+x*w*.8/d,h*.39+(2.8-y)*w*.8/d];}
function face(vertices,color){if(vertices.some(v=>v[2]<-5.5))return;faces.push({vertices,color,z:vertices.reduce((n,v)=>n+v[2],0)/vertices.length});}
function box(x,y,z,sx,sy,sz,color){
 const v=[[-1,0,-1],[1,0,-1],[1,1,-1],[-1,1,-1],[-1,0,1],[1,0,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*sx/2,y+b*sy,z+c*sz/2]);
 [[0,1,2,3],[1,5,6,2],[4,0,3,7],[3,2,6,7],[5,4,7,6]].forEach((ids,i)=>face(ids.map(j=>v[j]),color[i%color.length]));
}
function tree(x,z,n){box(x,0,z,.35,3.2,.35,['#8f7051','#796345']);const y=2.4+(n%3)*.35;box(x,y,z,2.1,1.1,1.9,['#2d7860','#286951','#469674']);box(x+.3,y+1,z,1.4,.7,1.4,['#5aa877','#418d65']);}
function draw(){
 const r=canvas.getBoundingClientRect();if(w!==Math.round(r.width)||h!==Math.round(r.height)){w=canvas.width=Math.round(r.width);h=canvas.height=Math.round(r.height);}
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#bce8dd');sky.addColorStop(.65,'#eff7c9');sky.addColorStop(1,'#87ba78');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#ffffce';ctx.beginPath();ctx.arc(w*.76,h*.23,45,0,Math.PI*2);ctx.fill();
 for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#85c3a5':'#9fd1ad';ctx.beginPath();ctx.ellipse(i*w/7,h*.44,160,90+(i%3)*25,0,0,Math.PI*2);ctx.fill();}
 faces=[];const travel=game.distance;
 ctx.fillStyle='#77af79';ctx.beginPath();[[-60,0,-5],[60,0,-5],[60,0,100],[-60,0,100]].forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();
 for(let i=0;i<24;i++){const z=i*4-travel%4;face([[-2.5,.01,z],[2.5,.01,z],[2.5,.01,z+4],[-2.5,.01,z+4]],i%2?'#e4cd91':'#ecd79c');for(const x of [-.75,.75])box(x,.02,z,.035,.015,2.7,['#fff1bc']);}
 for(let i=0;i<26;i++){const z=i*4-travel%4;tree(-4-(i%3)*1.3,z,i);tree(4+(i%4)*.9,z+2,i+1);if(i%2===0){box(-3,.02,z,.6,.25,.7,['#e6b5cc']);box(3,.02,z+1,.5,.35,.5,['#ffdf8a']);}}
 for(const item of game.items){const z=item.z-travel;if(item.done||z<-.7||z>85)continue;const x=item.lane*1.5;
   if(item.kind==='star'){const a=performance.now()/650;box(x,.8+Math.sin(a+item.z)*.12,z,.38,.45,.2,['#ffdc57','#eab64c','#fff49b']);}
   if(item.kind==='log'){box(x,0,z,1.18,.6,.65,['#a97548','#875e3e','#c4945c']);box(x,.6,z,.8,.1,.3,['#bfd875']);}
   if(item.kind==='arch'){box(x-.59,0,z,.16,2,.2,['#528466']);box(x+.59,0,z,.16,2,.2,['#528466']);box(x,1.4,z,1.4,.65,.6,['#407952','#619454','#89ad64']);}
 }
 const y=game.height(),x=game.x,duck=game.duck,walk=active&&!paused&&(heldAction('move')||motion.moving)?Math.sin(travel*3)*.16:0;
 box(x,.015,0,.8,.02,.5,['#5c805a']);
 box(x-.19,.08+y+walk,0,.22,.5,.25,['#455c72','#374f66']);box(x+.19,.08+y-walk,0,.22,.5,.25,['#455c72','#374f66']);
 box(x,.55+y,0,.67,duck?.32:.65,.4,['#f3946b','#d77f5e','#ffb287']);
 box(x-.47,.55+y-walk,0,.2,duck?.25:.55,.22,['#f5cda2']);box(x+.47,.55+y+walk,0,.2,duck?.25:.55,.22,['#f5cda2']);
 const head=(duck?.88:1.26)+y;box(x,head,0,.55,.5,.48,['#f5d6ae','#e0bb92']);box(x,head+.43,0,.78,.12,.65,['#efd077','#d8b961']);box(x,head+.54,.03,.48,.15,.43,['#e3bd67']);box(x, .64+y,-.25,.4,duck?.2:.4,.2,['#6b927b','#547b64']);
 faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();f.vertices.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();}
}
function frame(now){const dt=(now-last)/1000;last=now;
 if(mode==='camera'&&active)infer(now);
 const trackingPause=mode==='camera'&&(!ready||!lock.target||lock.blocked||now-lastPose>450);
 if(active){game.step(dt,{moving:mode==='camera'?!!motion.moving:heldAction('move'),duck:mode==='camera'?!!motion.duck:heldAction('duck'),paused:paused||trackingPause});
 $('stars').textContent=game.stars;$('progress').value=game.distance;$('distance').textContent=`${Math.floor(game.distance)} / 350 m`;
 const message=paused?'Adventure paused. Take your time.':trackingPause?'Trail paused — waiting for your selected player.':game.message;if($('message').textContent!==message)$('message').textContent=message;
 if(game.finished){active=false;clearInput();stopCamera();$('finish').hidden=false;$('controls').hidden=true;$('result').textContent=`You explored 350 metres and brought home ${game.stars} garden stars. Every step counts!`;}}
 draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
