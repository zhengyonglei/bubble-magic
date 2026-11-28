import {RunnerAudio} from './runner-audio.js?v=runner-10';
import {RunnerEffects} from './runner-effects.js?v=runner-10';
import {Runner,PlayerLock,Movement,courseCue} from './runner-core.js?v=runner-10';
import {appearance,drawTracking,TrackingDiagnostics} from './runner-tracking.js?v=runner-10';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
let game=new Runner(),active=false,paused=false,mode='demo',worker=null,stream=null,busy=false,ready=false,stamp=0,lastCapture=0,session=0;
let lock=new PlayerLock(),movement=new Movement(),motion={},lastPose=0,last=performance.now(),faces=[];
const diagnostics=new TrackingDiagnostics();
let detected=[],selectedIndex=-1,outlineStamp=0;
const audio=new RunnerAudio();
const effects=new RunnerEffects(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
const held=new Set();let w=0,h=0;
function clearInput(){held.clear();motion={};}
function stopCamera(){audio.stop();session++;lock.reset();detected=[];selectedIndex=-1;drawTracking($('tracking-overlay').getContext('2d'),[],-1,false,480,360);worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;ready=false;busy=false;motion={};$('camera-view').hidden=true;}
function begin(){audio.unlock();stopCamera();diagnostics.reset();effects.reset();movement=new Movement();lastPose=0;lastCapture=0;stamp=0;game=new Runner();active=true;paused=false;mode='demo';clearInput();$('welcome').hidden=true;$('finish').hidden=true;$('controls').hidden=false;$('pause').textContent='Pause';canvas.focus();}
$('demo').onclick=begin;$('again').onclick=()=>mode==='camera'?startCamera():begin();
$('stop-camera').onclick=()=>{stopCamera();mode='demo';clearInput();};
$('select').onclick=()=>{selectedIndex=-1;lock.reset();movement=new Movement();motion={};lastPose=0;};
$('runner-sound').onclick=()=>{audio.enabled=!audio.enabled;if(audio.enabled)audio.unlock();else audio.stop();$('runner-sound').textContent=audio.enabled?'Sound on':'Sound off';$('runner-sound').setAttribute('aria-pressed',String(audio.enabled));};
$('pause').onclick=()=>{if(!active)return;paused=!paused;if(paused)audio.stop();clearInput();$('pause').textContent=paused?'Resume':'Pause';if(!paused)canvas.focus();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('message').textContent='Fullscreen unavailable. You can use the browser fullscreen command.';}};
function action(a){if(!active||paused||mode==='camera')return;if(a==='left')game.lane=Math.max(-1,game.lane-1);if(a==='right')game.lane=Math.min(1,game.lane+1);if(a==='jump')game.hop();}
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump'};
window.addEventListener('keydown',e=>{const a=keys[e.code];if(!a||!active||e.target.tagName==='BUTTON'||e.target.tagName==='A')return;e.preventDefault();if(!e.repeat)action(a);held.add(e.code);});
window.addEventListener('keyup',e=>held.delete(e.code));
document.querySelectorAll('[data-action]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(`pointer:${e.pointerId}:${b.dataset.action}`);action(b.dataset.action);};const end=e=>held.delete(`pointer:${e.pointerId}:${b.dataset.action}`);b.onpointerup=end;b.onpointercancel=end;b.onlostpointercapture=end;});
function suspend(){audio.stop();clearInput();if(active){paused=true;$('pause').textContent='Resume';}if(mode==='camera'){lock.wait('Paused — checking your saved player when you return.');lastPose=0;}}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();stream?.getVideoTracks().forEach(t=>t.enabled=!document.hidden);});window.addEventListener('pagehide',stopCamera);
function heldAction(a){return [...held].some(k=>keys[k]===a||k.endsWith(':'+a));}
async function startCamera(){
  begin();mode='camera';$('camera-view').hidden=false;lock=new PlayerLock();movement=new Movement();lastPose=0;const token=session;
  $('tracking').textContent='Opening camera and loading the movement model…';
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
    if(token!==session){s.getTracks().forEach(t=>t.stop());return;}stream=s;$('video').srcObject=s;await $('video').play();
    if(token!==session)return;
    worker=new Worker('./vision-worker.js?v=runner-10');
    worker.onerror=()=>{ready=false;motion={};$('tracking').textContent='Tracking unavailable. Stop camera to use controls.';};
    worker.onmessage=({data})=>{
      if(token!==session){data.frame?.close();return;}
      if(data.type==='ready'){diagnostics.delegate=data.delegate||'unknown';ready=true;$('tracking').textContent=lock.reason;}
      if(data.type==='error'){busy=false;ready=false;motion={};$('tracking').textContent=data.message;}
      if(data.type==='result'){
        busy=false;
        if(token!==session||paused||document.hidden){data.frame?.close();return;}
        let features=[];try{if(data.frame){cap.drawImage(data.frame,0,0,480,360);const pixels=cap.getImageData(0,0,480,360);features=data.landmarks.map(p=>appearance(pixels,p));}}catch{}finally{data.frame?.close();}
        detected=data.landmarks;outlineStamp=performance.now();selectedIndex=-1;
        const now=performance.now();diagnostics.sample(now,data.ms,now-data.stamp);
        // Discard late inference instead of letting an old pose control a new frame.
        if(now-data.stamp>700){motion={};lock.wait('Camera processing is slow — trail paused until a fresh frame arrives.','slow-frame');}
        else{const b=lock.update(data.landmarks,now,features);if(b)selectedIndex=b.index;motion=b?movement.update(b,now):{};if(b){lastPose=now;game.lane=motion.lane;if(motion.jump)game.hop();}}
        $('tracking').textContent=lock.reason;drawTracking($('tracking-overlay').getContext('2d'),detected,selectedIndex,lock.waiting,480,360);
      }
    };
    worker.postMessage({type:'init',players:4,cutout:false});
  }catch(e){if(token===session){stopCamera();mode='demo';$('message').textContent='Camera unavailable. Keyboard and touch controls are ready.';game.message='Camera unavailable. Keyboard and touch controls are ready.';}}
}
$('camera').onclick=startCamera;
const capture=document.createElement('canvas');capture.width=480;capture.height=360;const cap=capture.getContext('2d');
async function infer(now){
  if(!ready||busy||paused||document.hidden||now-lastCapture<100||$('video').readyState<2)return;
  busy=true;lastCapture=now;const current=worker,token=session;
  try{cap.drawImage($('video'),0,0,480,360);const frame=await createImageBitmap(capture);if(token!==session||current!==worker){frame.close();return;}current.postMessage({type:'frame',frame,timestamp:Math.max(now,stamp+.01)},[frame]);stamp=now;}catch{busy=false;motion={};}
}

// Deterministic voxel scenery, directional shading and distance haze.
const bark=['#80533b','#523c30','#b58350'],leaf=['#337d50','#20583e','#85b45d'],stone=['#9ea996','#7a8d7d','#c6c9a6'];
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function project([x,y,z]){const d=z+7,f=Math.min(w*.85,h*1.3);return [w*.52+x*f/d,h*.30+(3.2-y)*f/d];}
let avatarTransform=null;
function face(vertices,color){
 if(avatarTransform)vertices=vertices.map(avatarTransform);
 // Clip crossing polygons instead of dropping whole faces as they pass the camera.
 const near=-6.8,clipped=[];
 for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],insideA=a[2]>=near,insideB=b[2]>=near;if(insideA)clipped.push(a);if(insideA!==insideB){const t=(near-a[2])/(b[2]-a[2]);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),near]);}}
 if(clipped.length<3)return;faces.push({vertices:clipped,color,z:clipped.reduce((n,v)=>n+v[2],0)/clipped.length});
}
function box(x,y,z,sx,sy,sz,c){
 const v=[[-1,0,-1],[1,0,-1],[1,1,-1],[-1,1,-1],[-1,0,1],[1,0,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*sx/2,y+b*sy,z+c*sz/2]);
 face([v[0],v[1],v[2],v[3]],c[0]);
 face((x>0?[4,0,3,7]:[1,5,6,2]).map(i=>v[i]),c[1]||c[0]);
 face((y<3.2?[3,2,6,7]:[0,4,5,1]).map(i=>v[i]),c[2]||c[0]);
}
function tree(x,z,n){
 const tall=3.5+noise(n)*2.7,wide=1.8+noise(n+3)*1.5;
 face([[x-.4,.01,z-.5],[x+.5,.01,z-.5],[x+2,.01,z+1.2],[x+.6,.01,z+1.2]],'#3e7049');box(x,0,z,.5,tall,.5,bark);box(x,0,z,.95,.3,.8,bark);box(x+.4,tall*.65,z,.8,.22,.28,bark);
 box(x,tall-.9,z,wide,1.15,wide*.8,leaf);
 box(x-.35,tall+.05,z,wide*.77,.8,wide*.66,['#448c53','#2a6942','#9dc564']);
 box(x+.2,tall+.8,z,wide*.45,.55,wide*.44,['#5a9b57','#367347','#b4d47c']);
 if(n%3===0)box(x+.6,tall-1.65,z-.35,.11,1.2,.12,['#78a250','#477b41']);
}
function tuft(x,z,n){for(let j=0;j<3;j++)box(x+(j-1)*.19,0,z+j*.08,.12,.18+noise(n+j)*.3,.1,['#548e4b','#397549','#87b95c']);}
function mushroom(x,z,n){box(x,0,z,.13,.32,.13,['#efe5bc','#c7caa5']);box(x,.26,z,.5,.19,.43,n%2?['#dd7963','#a94f50','#ffb083']:['#a987d4','#7d64af','#d3b6ed']);box(x-.1,.45,z-.05,.12,.015,.12,['#fff3d0']);}
function star(x,y,z){
 const v=[];for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?.16:.36;v.push([x+Math.cos(a)*r,y+Math.sin(a)*r,z]);}
 for(let j=0;j<10;j++)face([[x,y,z-.1],v[j],v[(j+1)%10]],j%2?'#ffda57':'#fff1ab');
 face([[x-.5,y,z],[x-.45,y+.05,z],[x-.5,y+.15,z],[x-.55,y+.05,z]],'#fff8d4');
}
function ruin(z){for(const x of [-3.5,3.5]){box(x,0,z,1,3.6,1,stone);box(x,0,z,1.4,.35,1.4,stone);box(x,3.4,z,1.4,.4,1.4,stone);box(x,3.8,z,1.1,.15,1.1,leaf);}box(0,3.8,z,8,.6,1.2,stone);box(0,4.4,z,6,.2,1.3,leaf);for(const x of [-2,0,2])box(x,3.95,z-.62,.26,.25,.035,['#e0c875']);}
function destination(z){
 const gold=['#c99b3b','#98702e','#ffe39a'];
 box(0,0,z+2,9,.18,7,stone);
 // A deep teal doorway, open golden doors, and stepped temple roof.
 face([[-2.6,.18,z+4],[2.6,.18,z+4],[2.6,4.5,z+4],[-2.6,4.5,z+4]],'#143f4b');
 box(0,.18,z+3.9,4.6,.12,.4,['#b4ead6']);
 for(const side of [-1,1]){box(side*3,0,z,1.15,4.5,1.2,stone);box(side*3,.1,z,1.55,.3,1.5,gold);box(side*3,4.3,z,1.5,.4,1.5,gold);box(side*2.7,.2,z+1,.18,3.7,2,gold);box(side*4.2,0,z,.14,5,.14,gold);face([[side*4.2,4.8,z],[side*5.4,4.8,z],[side*5.4,3.6,z],[side*4.2,3.9,z]],side<0?'#e79bab':'#8adbc7');star(side*3,4.9,z);}
 box(0,4.5,z,7.5,.55,1.8,stone);box(0,5.05,z+.2,6,.4,2.1,gold);box(0,5.45,z+.4,4.4,.35,2.2,leaf);star(0,5.95,z+.2);
 for(let i=0;i<7;i++)box(-2.4+i*.8,.19,z-1,.75,.025,.45,[i%2?'#fff1af':'#c89b44']);
}
function explorer(x,y,walk){
 const pose=effects.pose();y+=pose.bounce;walk*=1-Math.min(1,effects.stumble/.3);
 const shadow=.5-y*.08;face([[x-shadow,.025,-.35],[x+shadow,.025,-.35],[x+shadow,.025,.4],[x-shadow,.025,.4]],'#49664d');
 avatarTransform=([vx,vy,vz])=>{const dy=vy-y-.15,c=Math.cos(pose.tilt),s=Math.sin(pose.tilt);return [vx,y+.15+dy*c+vz*s,vz*c-dy*s];};
 for(const side of [-1,1]){const stride=walk*side;
 box(x+side*.18,.13+y+Math.max(0,stride),stride,.23,.43,.25,['#335e69','#244651','#56838a']);
 box(x+side*.18,.05+y+Math.max(0,stride),stride-.1,.26,.16,.4,['#684938','#493b30','#9c7450']);
 box(x+side*(.43+pose.spread),.63+y+pose.spread*.6,-stride,.21,.36,.25,['#db9a4e','#ad7237','#f8c66e']);box(x+side*(.43+pose.spread*1.2),.48+y+pose.spread*.6,-stride,.18,.18,.2,['#efbf8f','#bc886a','#ffe0ad']);}
 box(x,.57+y,0,.65,.62,.39,['#e7ad55','#bc803e','#ffe096']);box(x,.57+y,-.015,.68,.09,.42,['#684d39','#4d3d31','#a88350']);
 const head=(1.24)+y;
 box(x,head,0,.5,.46,.45,['#dfaf82','#b88160','#f9d49f']);box(x,head+.26,-.24,.52,.2,.08,['#5c3c2c','#412e24','#815333']);
 box(x,head+.42,.01,.79,.10,.67,['#c29756','#987342','#ffe0a0']);box(x,head+.52,.04,.5,.18,.43,['#dbb574','#ae8c54','#ffe3a6']);box(x,head+.53,-.19,.5,.06,.025,['#638b77']);
 for(const side of [-1,1])box(x+side*.23,.71+y,-.22,.065,.42,.05,['#5a7560']);
 box(x,.69+y,-.30,.44,.43,.21,['#367f79','#275e60','#73ada0']);box(x,.72+y,-.42,.31,.17,.045,['#4b9990','#357970','#82b9a2']);box(x,.91+y,-.425,.08,.08,.03,['#edcf7e']);
 avatarTransform=null;
}
function draw(){
 const r=canvas.getBoundingClientRect();if(w!==Math.round(r.width)||h!==Math.round(r.height)){w=canvas.width=Math.round(r.width);h=canvas.height=Math.round(r.height);}
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#3e9fb0');sky.addColorStop(.38,'#c6e7ce');sky.addColorStop(1,'#426d4d');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#fef1bf';ctx.beginPath();ctx.arc(w*.69,h*.18,h*.055,0,Math.PI*2);ctx.fill();
 for(let layer=0;layer<3;layer++){ctx.fillStyle=['#8cbfb4','#72aa99','#5d9582'][layer];ctx.beginPath();ctx.moveTo(0,h*.48);for(let i=0;i<=16;i++)ctx.lineTo(i*w/16,h*(.27+layer*.045)-noise(i+layer*19)*h*.13);ctx.lineTo(w,h*.6);ctx.lineTo(0,h*.6);ctx.fill();}
 faces=[];const travel=game.distance,t=performance.now()/1000;
 // Ground is background, not a depth-sorted polygon that could hide distant objects.
 ctx.fillStyle='#497f51';ctx.beginPath();[[-90,0,-5],[90,0,-5],[90,0,110],[-90,0,110]].forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();
 const first=Math.floor(travel/3)-2;
 for(let i=0;i<30;i++){const n=first+i,z=n*3-travel;
 face([[-2.55,.025,z],[2.55,.025,z],[2.55,.025,z+3],[-2.55,.025,z+3]],'#9e956d');
 for(let lane=-1;lane<=1;lane++){const col=noise(n*7+lane)>.5?['#b5b092','#8f9279','#d1c9a7']:['#a6a58b','#858e77','#c4c1a0'];box(lane*1.5,.03,z+1.45,1.43,.045,2.86,col);if(n%4===0)box(lane*1.5+.38,.08,z+1.6,.18,.006,.65,['#929b79']);for(let q=0;q<3;q++){const px=lane*1.5-.55+noise(n*11+q)*1.1,pz=z+.2+noise(n*17+q)*2.5;face([[px,.081,pz],[px+.13,.081,pz],[px+.13,.081,pz+.16],[px,.081,pz+.16]],q%2?'#bbb899':'#dad0ae');}}
 for(const side of [-1,1]){box(side*2.48,.02,z+1.5,.22,.17,2.95,['#5c874f','#406a43','#8caf65']);if(i<20&&z>-.5&&n*3<342){tree(side*(3.4+noise(n+side)*2.8),z,n*3+side);tuft(side*(2.9+noise(n)*.5),z+.9,n);if(n%3===0)mushroom(side*3,z+1.8,n);}if(n%5===0)box(side*3.3,0,z,.7,.5,.8,stone);}}
 for(let k=0;k<4;k++){const z=(Math.max(0,Math.floor((travel-30)/45))+k)*45+30-travel;if(z>-8.5&&z<85&&z+travel<320)ruin(z);}
 if(350-travel<95)destination(350-travel);
 for(const item of game.items){const z=item.z-travel;if((item.done&&item.kind==='star')||z< -8.5||z>85)continue;const x=item.lane*1.5;
 if(item.kind==='star')star(x,1+Math.sin(t*2+item.z)*.12,z);
 if(item.kind==='log'&&item.fullWidth){box(0,0,z,4.9,.6,.65,bark);box(0,.6,z,4.6,.08,.5,leaf);for(const dx of [-2,-1,0,1,2]){box(dx,.08,z-.33,.05,.43,.015,['#513e30']);face([[dx-.16,.3,z-.34],[dx,.52,z-.34],[dx+.16,.3,z-.34]],'#ffe39a');}continue;}
 if(item.kind==='log'){box(x,0,z,1.22,.6,.65,bark);box(x,.6,z,.95,.09,.48,leaf);for(const dx of [-.4,0,.4])box(x+dx,.08,z-.33,.045,.43,.015,['#513e30']);box(x+.3,.62,z,.18,.18,.18,bark);}
 }
 const walk=active&&!paused?Math.sin(travel*3)*.17:0;explorer(game.x+(effects.reduced?0:Math.sin(effects.hit*35)*effects.hit*.08),game.height(),walk);
 faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();f.vertices.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();const fog=Math.min(.76,Math.max(0,(f.z-15)/100));if(fog){ctx.globalAlpha=fog;ctx.fillStyle='#c6e7ce';ctx.fill();ctx.globalAlpha=1;}}
 ctx.fillStyle='#fff0b0';for(let i=0;i<16;i++){const px=noise(i+90)*w+Math.sin(t*.3+i)*20,py=h*(.3+noise(i+130)*.5)+Math.sin(t+i)*9;ctx.globalAlpha=.25+noise(i)*.35;ctx.fillRect(px,py,2,2);}ctx.globalAlpha=1;
}
function frame(now){const dt=(now-last)/1000;last=now;
 if(mode==='camera'&&active){infer(now);if(outlineStamp&&now-outlineStamp>900){drawTracking($('tracking-overlay').getContext('2d'),[],-1,true,480,360);outlineStamp=0;}}
 if(mode==='camera'&&ready&&lock.target&&!lock.waiting&&now-lastPose>700)lock.wait('Waiting for a fresh camera frame…','stale');
 const trackingPause=mode==='camera'&&(!ready||!lock.target||lock.blocked||lock.waiting||now-lastPose>700);
 if(active&&mode==='camera'){diagnostics.state(paused?'manual':trackingPause?(ready?lock.code:'loading'):'locked',now);$('tracking-stats').textContent=diagnostics.summary();}
 if(active){game.step(dt,{moving:true,paused:paused||trackingPause});
 for(const event of game.events.splice(0)){effects.emit(event);if(event.type==='hit')audio.bump();}
 $('section-cue').textContent=courseCue(game.distance);$('section-cue').hidden=!$('section-cue').textContent;
 $('stars').textContent=game.stars;$('progress').value=game.distance;$('distance').textContent=`${Math.floor(game.distance)} / 350 m`;
 const message=paused?'Adventure paused. Take your time.':trackingPause?lock.reason:game.message;if($('message').textContent!==message)$('message').textContent=message;
 if(game.finished){$('section-cue').hidden=true;active=false;clearInput();stopCamera();$('finish').hidden=false;$('again').textContent=mode==='camera'?'Play again · select player':'Another adventure';$('controls').hidden=true;$('result').textContent=`You explored 350 metres and brought home ${game.stars} garden stars. Every step counts!`;}}
 effects.step(dt,document.hidden||paused||(active&&trackingPause));
 draw();const overlay=$('effects');if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h;}effects.draw(overlay.getContext('2d'),w,h);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$('copy-tracking').onclick=async()=>{const text=diagnostics.report();$('tracking-report').value=text;$('tracking-report').hidden=false;try{await navigator.clipboard.writeText(text);$('copy-tracking').textContent='Diagnostics copied';}catch{$('tracking-report').focus();$('tracking-report').select();$('copy-tracking').textContent='Select and copy the report below';}};
