import {Round,REWARDS,clamp,handHits,rewardLevel,matchPoses} from './game-core.js?v=0.3.0';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d'),video=$('input-video');
const frameCanvas=document.createElement('canvas'),frameCtx=frameCanvas.getContext('2d');
const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d');
const capture=document.createElement('canvas'),captureCtx=capture.getContext('2d');
const BUILD='0.3.0';
const art={};for(const [name,file] of Object.entries({garden:'garden-ai-v1.jpg',cactus:'cactus-ai-v1.png',butterfly:'butterfly-ai-v1.png'})){const img=new Image();img.src=new URL('./assets/'+file,import.meta.url).href;art[name]=img;}
const artReady=name=>art[name].complete&&art[name].naturalWidth>0;
let W=1280,H=720,source='none',phase='home',mode='gentle',round=null;
let worker=null,workerReady=false,busy=false,stream=null,objectURL=null,sample=null,epoch=0;
let players=[],hands=[],lastResult=0,lastInference=0,lastVideoTime=-1,frameCount=0,renderFrames=0;
let inferMs=0,trackFPS=0,renderFPS=0,delegate='none',lastError='',modelTimer=null;
let nextPlayerId=1,targets=[],particles=[],labels=[],targetId=0,spawnClock=0,spawnCount=0;
let totalPops=0,manualPause=false,recoveryUntil=0,previousActive=false;
let pointer={x:.74,y:.5,active:false},mousePrev=null,sound=false,audio=null,lastTone=0;
let lastTick=performance.now(),fpsSince=lastTick,toastTimer=null,trailClock=0;
let config={players:2,cutout:true,quality:'balanced',hazards:false,height:'auto'};
let sessionConfig={...config};
const colors=['#c8a7ee','#98d9d2','#f6b6c9','#f1d49b','#a9c9f1'];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe($('stage'));
function status(text,error=false){$('status').textContent=text;$('status').hidden=!text;$('status').classList.toggle('error',error);}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
function setMode(value){mode=value;config.hazards=mode==='challenge';$('hazards').checked=config.hazards;document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('settings-button').onclick=()=>{$('settings').showModal();updateDiagnostics();};
for(const id of ['players','quality','cutout','hazards','height'])$(id).onchange=()=>{config[id]=$(id).type==='checkbox'?$(id).checked:id==='players'?Number($(id).value):$(id).value;};
$('reset-rewards').onclick=()=>{totalPops=0;updateRewards();toast('A fresh dress-up adventure!');};
$('sound').onclick=()=>{sound=!sound;if(sound){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();} $('sound').innerHTML=`♫ <span>Sound ${sound?'on':'off'}</span>`;$('sound').setAttribute('aria-label',`Turn sound ${sound?'off':'on'}`);};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').innerHTML=`⛶ <span>${document.fullscreenElement?'Exit fullscreen':'Fullscreen'}</span>`;});
function tone(star=false,cactus=false){if(!sound||!audio||audio.state!=='running'||performance.now()-lastTone<45)return;lastTone=performance.now();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(cactus?180:star?880:520+Math.random()*220,t);o.frequency.exponentialRampToValueAtTime(cactus?90:star?1320:900,t+.1);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.18);}
function imageRect(){const iw=frameCanvas.width||640,ih=frameCanvas.height||480;const height=H-106;const s=Math.min(W/iw,height/ih);return {x:(W-iw*s)/2,y:0,w:iw*s,h:ih*s};}
function screenPoint(p){const r=imageRect();return {x:(r.x+(1-p.x)*r.w)/W,y:(r.y+p.y*r.h)/H};}
function stopMedia(){epoch++;clearTimeout(modelTimer);modelTimer=null;worker?.terminate();worker=null;workerReady=false;busy=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;video.removeAttribute('src');video.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;sample=null;players=[];hands=[];lastResult=0;lastVideoTime=-1;frameCtx.clearRect(0,0,frameCanvas.width,frameCanvas.height);}
function home(){stopMedia();source='none';phase='home';manualPause=false;round=null;targets=[];particles=[];labels=[];status('');$('welcome').hidden=false;$('hud').hidden=true;$('results').hidden=true;$('ready-bar').hidden=true;$('play-controls').hidden=true;$('pause').textContent='Pause';$('sky-label')?.removeAttribute('hidden');}
function fail(message){lastError=message;home();status(message,true);updateDiagnostics();}
function baseSession(type){stopMedia();source=type;phase='loading';sessionConfig={...config};targets=[];particles=[];labels=[];round=null;manualPause=false;lastError='';delegate='none';inferMs=0;trackFPS=0;$('welcome').hidden=true;$('results').hidden=true;$('hud').hidden=false;$('ready-bar').hidden=true;$('play-controls').hidden=false;$('pause').hidden=true;$('score').textContent='0';$('time').textContent='1:00';$('pop-count').textContent='Practice first';$('combo').textContent='Find your hands';$('source-badge').textContent=type==='camera'?'LIVE CAMERA':type==='video'?'LOCAL VIDEO':type==='sample'?'SAMPLE PHOTO · NOT LIVE':'MOUSE DEMO · SIMULATED';return epoch;}
function ready(){phase='ready';$('ready-bar').hidden=false;$('pause').hidden=true;status('');if(source==='demo'){$('ready-title').textContent='Your pointer is a magic hand';$('ready-description').textContent='Move to pop practice bubbles. No camera needed.';}else{$('ready-title').textContent='Find your hands';$('ready-description').textContent='Only players in view. Stand side by side, then start.';}$('start-round').disabled=source!=='demo';spawnClock=0;}
function launchWorker(token){
  worker=new Worker(new URL('./vision-worker.js',import.meta.url));
  modelTimer=setTimeout(()=>{if(token===epoch)fail('The model took too long to load. Check your internet connection, then retry Camera or Video.');},90000);
  worker.onerror=event=>{if(token===epoch)fail(`This browser could not start tracking. Try current Chrome. ${event.message||''}`);};
  worker.onmessage=({data})=>{
    if(token!==epoch){data.frame?.close();return;}
    if(data.type==='status')status(data.message);
    if(data.type==='ready'){clearTimeout(modelTimer);delegate=data.delegate;workerReady=true;busy=false;ready();}
    if(data.type==='error')fail(data.message);
    if(data.type==='result'){
      busy=false;lastResult=performance.now();inferMs=data.ms;frameCount++;
      try {
        frameCanvas.width=data.frame.width;frameCanvas.height=data.frame.height;
        frameCtx.globalCompositeOperation='source-over';frameCtx.clearRect(0,0,frameCanvas.width,frameCanvas.height);frameCtx.drawImage(data.frame,0,0);
        if(sessionConfig.cutout){
          if(data.mask){maskCanvas.width=data.width;maskCanvas.height=data.height;maskCtx.putImageData(new ImageData(data.mask,data.width,data.height),0,0);frameCtx.globalCompositeOperation='destination-in';frameCtx.drawImage(maskCanvas,0,0,frameCanvas.width,frameCanvas.height);frameCtx.globalCompositeOperation='source-over';}
          else frameCtx.clearRect(0,0,frameCanvas.width,frameCanvas.height);
        }
        updatePlayers(data.landmarks,lastResult);
      } catch(error){fail(`Could not draw the camera cutout: ${error.message}`);}
      finally{data.frame.close();}
    }
  };
  worker.postMessage({type:'init',players:sessionConfig.players,cutout:sessionConfig.cutout});
}
$('camera').onclick=async()=>{
  if(!navigator.mediaDevices?.getUserMedia){status('Camera access needs HTTPS or localhost and a supported browser.',true);return;}
  const token=baseSession('camera');status('Allow the camera in your browser to begin.');
  try {
    const requested=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30},facingMode:'user'},audio:false});
    if(token!==epoch){requested.getTracks().forEach(t=>t.stop());return;}
    stream=requested;video.srcObject=stream;await video.play();
    if(token!==epoch)return;
    stream.getVideoTracks()[0].onended=()=>{if(token===epoch)fail('Camera disconnected. Connect it and try again.');};
    launchWorker(token);
  }catch(error){if(token===epoch)fail(error.name==='NotAllowedError'?'Camera permission was not granted. Allow it in browser settings, or try the mouse demo.':error.name==='NotFoundError'?'No camera found on this computer. Try the mouse demo or a local video.':`Camera unavailable: ${error.message}`);}
};
$('demo').onclick=()=>{baseSession('demo');pointer.active=false;mousePrev=null;ready();};
$('video-button').onclick=()=>$('video-file').click();
$('video-file').onchange=async()=>{
  const file=$('video-file').files[0];$('video-file').value='';if(!file)return;
  const token=baseSession('video');status('Opening your video locally…');objectURL=URL.createObjectURL(file);video.src=objectURL;video.loop=true;
  video.onerror=()=>{if(token===epoch)fail('This video format could not be opened. Try an MP4 with H.264 video.');};
  try{await video.play();if(token===epoch)launchWorker(token);}catch(error){if(token===epoch)fail(`Could not play this video: ${error.message}`);}
};
$('vision-check').onclick=async()=>{
  $('settings').close();const token=baseSession('sample');status('Loading Google’s sample pose photo…');
  try {const img=new Image();img.crossOrigin='anonymous';img.src='https://storage.googleapis.com/mediapipe-assets/pose.jpg';await img.decode();if(token!==epoch)return;sample=img;launchWorker(token);}catch(error){if(token===epoch)fail(`Sample image unavailable: ${error.message}`);}
};
function updatePlayers(poses,now){
  const fresh=poses.filter(p=>p[11]&&p[12]&&(p[11].visibility??1)>.3&&(p[12].visibility??1)>.3);
  const previous=players.filter(p=>now-p.seen<350);
  const matched=matchPoses(previous,fresh);
  players=matched.map(({pose,old,x,y})=>{
    const smooth=old?pose.map((p,i)=>({...p,x:old.pose[i].x*.25+p.x*.75,y:old.pose[i].y*.25+p.y*.75})):pose;
    return {id:old?.id??nextPlayerId++,cx:x,cy:y,pose:smooth,seen:now,stable:old?old.stable+1:1};
  });
  const prevHands=hands;hands=[];
  for(const player of players)for(const joint of [15,16]){
    const p=player.pose[joint];if((p.visibility??1)<.45||player.stable<2)continue;
    const point=screenPoint(p),id=`${player.id}:${joint}`,old=prevHands.find(h=>h.id===id);
    hands.push({...point,id,r:mode==='gentle'?.026:.019,confidence:p.visibility??1,seen:now,prev:old?{x:old.x,y:old.y,time:old.seen}:null});
  }
  if(phase==='ready'){$('start-round').disabled=hands.length===0;$('ready-title').textContent=players.length?`${players.length} player${players.length>1?'s':''} in view`:'Looking for players…';}
}
async function requestFrame(now){
  if(!workerReady||busy||document.hidden||phase==='ended'||phase==='home'||manualPause)return;
  const interval=sessionConfig.quality==='light'?100:66;
  if(now-lastInference<interval)return;
  const input=sample||video;
  if(!sample&&(video.readyState<2||video.currentTime===lastVideoTime))return;
  const iw=sample?.naturalWidth||video.videoWidth,ih=sample?.naturalHeight||video.videoHeight;if(!iw||!ih)return;
  busy=true;lastInference=now;lastVideoTime=video.currentTime;const token=epoch;
  const width=sessionConfig.quality==='light'?480:640;
  if(capture.width!==width||capture.height!==Math.round(width*ih/iw)){capture.width=width;capture.height=Math.round(width*ih/iw);}
  captureCtx.drawImage(input,0,0,capture.width,capture.height);
  try{const bitmap=await createImageBitmap(capture);if(token!==epoch){bitmap.close();return;}worker.postMessage({type:'frame',frame:bitmap,timestamp:now},[bitmap]);}
  catch(error){if(token===epoch){busy=false;fail(`Frame processing failed: ${error.message}`);}}
}
function startRound(){round=new Round(mode);phase='playing';targets=[];particles=[];labels=[];spawnClock=1;spawnCount=1;manualPause=false;previousActive=false;mousePrev=null;$('ready-bar').hidden=true;$('results').hidden=true;$('pause').hidden=false;$('pause').textContent='Pause';status('');canvas.focus();}
$('start-round').onclick=startRound;$('again').onclick=startRound;
$('stop').onclick=home;$('finish').onclick=home;
$('pause').onclick=()=>{manualPause=!manualPause;mousePrev=null;hands.forEach(h=>h.prev=null);$('pause').textContent=manualPause?'Resume':'Pause';};
canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/W,y:(e.clientY-r.top)/H,active:true};};
canvas.onpointerleave=()=>{pointer.active=false;mousePrev=null;};
canvas.onkeydown=e=>{if(source!=='demo')return;const d={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];if(d){e.preventDefault();pointer.x=clamp(pointer.x+d[0],0,1);pointer.y=clamp(pointer.y+d[1],0,.8);pointer.active=true;}};
document.addEventListener('visibilitychange',()=>{mousePrev=null;hands=[];if(document.hidden){stream?.getVideoTracks().forEach(t=>t.enabled=false);video.pause();}else{stream?.getVideoTracks().forEach(t=>t.enabled=true);if(source==='camera'||source==='video')video.play().catch(()=>fail('Video paused. Reopen the camera or video.'));}});
window.addEventListener('pagehide',stopMedia);

function playerZone(index){
  if(source==='demo')return {x:.5,y:.43,w:.65,h:.48};
  const p=players[index%Math.max(1,players.length)]?.pose;
  if(!p)return {x:.5,y:.45,w:.6,h:.45};
  const l=screenPoint(p[11]),r=screenPoint(p[12]),head=screenPoint(p[0]);
  const width=clamp(Math.abs(l.x-r.x)*2.8,.18,.55);
  const upper=clamp(head.y-.05,.15,.63),lower=clamp((l.y+r.y)/2+.25,upper+.1,.73);
  return {x:clamp((l.x+r.x)/2,width/2+.06,1-width/2-.06),y:(upper+lower)/2,w:width,h:lower-upper};
}
function spawn(now,practice=false){
  const zone=playerZone(spawnCount),star=!practice&&spawnCount%7===6;
  const cactus=mode==='challenge'&&config.hazards&&spawnCount%4===1&&targets.filter(t=>t.type==='cactus').length<2&&now>recoveryUntil;
  const type=cactus?'cactus':star?'star':'bubble',r=mode==='gentle'?.047:.036;
  let t;
  for(let attempt=0;attempt<15;attempt++){
    let y=zone.y+(Math.random()-.5)*zone.h;
    if(config.height==='low')y=clamp(y+.12,.3,.72);
    t={id:++targetId,x:clamp(zone.x+(Math.random()-.5)*zone.w,.09,.91),y:clamp(y,.18,.72),r,type,life:0,ttl:practice?12:mode==='gentle'?11:9,color:colors[spawnCount%colors.length],vx:(Math.random()<.5?-1:1)*(mode==='gentle'?.028:.055),seed:Math.random()*6};
    if(targets.every(o=>Math.hypot((o.x-t.x)*W,(o.y-t.y)*H)>(o.r+t.r)*H+15)&&(!cactus||hands.every(h=>Math.hypot((h.x-t.x)*W,(h.y-t.y)*H)>H*(r+h.r)+45)))break;
    t=null;
  }
  if(t){targets.push(t);spawnCount++;}
}
function burst(t,points){const x=t.x*W,y=t.y*H;for(let i=0;i<(reduceMotion?5:15);i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0,ttl:.5+Math.random()*.4,color:t.type==='star'?'#d5a141':t.color,r:2+Math.random()*4});}if(points)labels.push({x,y,text:`+${points}`,life:0});tone(t.type==='star',t.type==='cactus');}
function updateRewards(){document.querySelectorAll('[data-reward]').forEach(el=>{const n=Number(el.dataset.reward),earned=totalPops>=n;el.classList.toggle('earned',earned);el.querySelector('small').textContent=earned?'Unlocked together':`${Math.min(totalPops,n)} / ${n} bubbles`;});const next=REWARDS.find(r=>r.at>totalPops);$('reward-caption').textContent=next?`${next.at-totalPops} pops until your next surprise`:'Your magic wardrobe is complete!';}
function endRound(){phase='ended';$('pause').hidden=true;$('results').hidden=false;$('final-score').textContent=round.score.toLocaleString();$('final-pops').textContent=round.pops;$('final-rewards').textContent=rewardLevel(totalPops)?`${rewardLevel(totalPops)} dress-up reward${rewardLevel(totalPops)>1?'s':''} ready for the next round.`:'A few more pops next time unlock sparkle bracelets.';status('');}
function step(dt,now){
  if(source==='demo'){
    hands=pointer.active?[{...pointer,id:'mouse',r:mode==='gentle'?.026:.019,confidence:1,seen:now,prev:mousePrev}]:[];
    mousePrev=pointer.active?{x:pointer.x,y:pointer.y,time:now}:null;
  }else if(now-lastResult>350){hands=[];if(now-lastResult>600)players=[];}
  const present=source==='demo'||hands.length>0;
  const active=present&&!manualPause&&!document.hidden&&!$('settings').open;
  if(active&&!previousActive){recoveryUntil=now+1000;hands.forEach(h=>h.prev=null);}
  previousActive=active;
  if(phase==='playing'){
    if(manualPause)status('Paused. Take a breath, then press Resume.');
    else if(!present)status('Step back into view with your hands visible. The clock is paused.');
    else status('');
    round.tick(dt,active);
    if(round.finished){endRound();return;}
    $('score').textContent=round.score.toLocaleString();$('pop-count').textContent=`${round.pops} bubble${round.pops===1?'':'s'} popped`;
    const seconds=Math.ceil(round.remaining);$('time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    $('combo').textContent=round.multiplier>1?`${round.multiplier}× sparkle streak!`:(mode==='challenge'?'Avoid cacti · −20 points':'Butterfly hands · pop together');
  }
  if((phase==='ready'||phase==='playing')&&active){
    spawnClock+=dt;const practice=phase==='ready',interval=practice?1.3:mode==='gentle'?.75:.52;
    if(spawnClock>=interval&&targets.length<(practice?4:9)){spawnClock=0;spawn(now,practice);}
    for(const t of targets){t.life+=dt;const speed=t.type==='cactus'?.35:1;t.y-=dt*(mode==='gentle'?.026:.045)*speed;t.x+=dt*(t.vx+Math.cos(t.life*2+t.seed)*.018)*speed;if(t.x<.08||t.x>.92){t.x=clamp(t.x,.08,.92);t.vx=-t.vx;}}
    const hit=targets.filter(t=>hands.some(h=>{
      // Convert x to height units so collision circles stay circular on wide displays.
      const hh={...h,x:h.x*W/H,prev:h.prev?{...h.prev,x:h.prev.x*W/H}:null};
      return handHits(hh,{...t,x:t.x*W/H},now);
    })).filter(t=>t.type!=='cactus'||now>recoveryUntil).sort((a,b)=>(a.type==='cactus'?-1:0)-(b.type==='cactus'?-1:0));
    for(const t of hit){
      if(practice){burst(t,0);continue;}
      const outcome=round.hit(t);if(!outcome)continue;
      burst(t,outcome.points);
      if(outcome.cactus){toast('Ouch! Cactus −'+outcome.penalty+' points. Combo reset.');}
      else {const old=rewardLevel(totalPops);totalPops++;updateRewards();if(rewardLevel(totalPops)>old)toast(`✦ ${REWARDS[old].name} for everyone!`);}
    }
    const ids=new Set(hit.map(t=>t.id));targets=targets.filter(t=>!ids.has(t.id)&&t.life<t.ttl&&t.y>.1);
  }
  trailClock+=dt;
  if(active&&!reduceMotion&&trailClock>.05){trailClock=0;for(const h of hands)particles.push({x:h.x*W,y:h.y*H,vx:(Math.random()-.5)*15,vy:12,life:0,ttl:.4,color:'#d79eea',r:2+Math.random()*2});}
  for(const p of particles){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;}particles=particles.filter(p=>p.life<p.ttl).slice(-200);
  labels.forEach(l=>{l.life+=dt;l.y-=dt*40;});labels=labels.filter(l=>l.life<.8);
}

function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function star(x,y,r,fill,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();}
function background(t){
  if(artReady('garden')){const img=art.garden;const scale=Math.max(W/img.naturalWidth,H/img.naturalHeight);ctx.drawImage(img,(W-img.naturalWidth*scale)/2,(H-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);if(phase==='home'){const wash=ctx.createLinearGradient(0,0,W,0);wash.addColorStop(0,'#f8f5ffdd');wash.addColorStop(.5,'#f8f5ff99');wash.addColorStop(1,'#f8f5ff00');ctx.fillStyle=wash;ctx.fillRect(0,0,W,H);}return;}

  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#e6f4ff');g.addColorStop(.55,'#eee5ff');g.addColorStop(1,'#c8f1dc');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Distant rainbow and soft cloud islands frame the open play area.
  ctx.save();ctx.globalAlpha=.28;ctx.lineWidth=12;for(const [i,color] of ['#f29db7','#ffd587','#e6e69c','#91d8bd','#a2bff0'].entries()){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(W*.77,H*.63,H*.48-i*12,Math.PI,Math.PI*2);ctx.stroke();}ctx.restore();
  for(let i=0;i<4;i++){const x=W*(.1+i*.27)+(reduceMotion?0:Math.sin(t*.15+i)*12),y=H*(.15+(i%2)*.07);ellipse(x,y,48,14,'#ffffff88');ellipse(x-19,y-9,23,19,'#ffffff88');ellipse(x+12,y-14,28,24,'#ffffff88');}
  const glow=ctx.createRadialGradient(W*.77,H*.35,0,W*.77,H*.35,W*.42);glow.addColorStop(0,'#fff6e9aa');glow.addColorStop(1,'#fff6e900');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  for(let i=0;i<22;i++){const x=((i*137.9)%1000)/1000*W,y=((i*71.3)%680)/1000*H+.05*H;star(x,y+(reduceMotion?0:Math.sin(t*.4+i)*5),i%3===0?4:2,'#b4a0cf45',t*.03);}
  ctx.fillStyle='#d4e7e2';ctx.beginPath();ctx.moveTo(0,H*.83);ctx.bezierCurveTo(W*.18,H*.60,W*.38,H*.96,W*.63,H*.79);ctx.bezierCurveTo(W*.84,H*.61,W*.92,H*.79,W,H*.72);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle='#dfece3';ctx.beginPath();ctx.moveTo(0,H*.88);ctx.bezierCurveTo(W*.2,H*.77,W*.38,H*.73,W*.55,H*.89);ctx.bezierCurveTo(W*.78,H*.98,W*.9,H*.68,W,H*.81);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  // Storybook trees, mushrooms and flowers stay around the edges.
  for(const side of [0,1]){const x=side?W-22:22;ctx.fillStyle='#a68cbd';ctx.beginPath();ctx.roundRect(x-7,H*.48,14,H*.43,7);ctx.fill();ellipse(x,H*.46,65,83,'#b6d7cb');ellipse(x+(side?-25:25),H*.4,51,61,'#c6e3d2');ellipse(x,H*.32,42,52,'#d8e9d6');for(let j=0;j<5;j++)ellipse(x+Math.sin(j*3)*30,H*(.34+j*.034),5,5,'#f5c9db');}
  for(let i=0;i<7;i++){const x=W*(i+.5)/7,y=H*(.91+Math.sin(i*2)*.035);ctx.fillStyle='#fff3db';ctx.beginPath();ctx.roundRect(x-4,y-10,8,22,4);ctx.fill();ctx.fillStyle=i%2?'#bd9bdd':'#edacba';ctx.beginPath();ctx.ellipse(x,y-10,17,13,0,Math.PI,Math.PI*2);ctx.fill();ellipse(x-6,y-16,3,2,'#fff8eb');ellipse(x+5,y-19,2,2,'#fff8eb');}
  for(let i=0;i<12;i++){const x=(i+.4)*W/12,y=H*.85+Math.sin(i*2)*20;ctx.strokeStyle='#a1beb4';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+16);ctx.quadraticCurveTo(x+6,y+5,x,y-8);ctx.stroke();ellipse(x-5,y+5,5,2.5,'#aec9b9');for(let p=0;p<5;p++)ellipse(x+Math.cos(p*1.256)*5,y-9+Math.sin(p*1.256)*5,3.5,3.5,i%2?'#f6e8d9':'#f8f3fc');ellipse(x,y-9,2,2,'#d3b67c');}
}
function bubble(x,y,r,color,kind='bubble',alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  const g=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.05,x,y,r);g.addColorStop(0,'#ffffff75');g.addColorStop(.65,color+'35');g.addColorStop(.9,color+'85');g.addColorStop(1,color+'cc');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffffcc';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.86,3.6,4.9);ctx.strokeStyle='#ffffffed';ctx.lineWidth=Math.max(3,r*.055);ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.88,.4,1.3);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ellipse(x-r*.35,y-r*.52,r*.12,r*.065,'#ffffffdd');
  if(kind==='star')star(x,y,r*.43,'#d4a344',-.1);
  ctx.restore();
}
function cactus(x,y,r){if(artReady('cactus')){ctx.save();ellipse(x,y,r,r,'#fff4dbe6');ctx.strokeStyle='#d69e60';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.drawImage(art.cactus,x-r*.76,y-r*.9,r*1.52,r*1.8);ctx.restore();return;}ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff5df';ctx.strokeStyle='#d69e60';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.lineCap='round';ctx.strokeStyle='#399c73';ctx.lineWidth=r*.26;ctx.beginPath();ctx.moveTo(0,r*.48);ctx.lineTo(0,-r*.43);ctx.moveTo(0,r*.06);ctx.lineTo(-r*.43,r*.06);ctx.lineTo(-r*.43,-r*.2);ctx.moveTo(0,-r*.07);ctx.lineTo(r*.42,-r*.07);ctx.lineTo(r*.42,-r*.36);ctx.stroke();ctx.strokeStyle='#dcf5ae';ctx.lineWidth=1.5;for(const [a,b] of [[-.1,-.32],[.1,.22],[-.42,-.1],[.42,-.3]]){ctx.beginPath();ctx.moveTo(a*r,b*r);ctx.lineTo((a+.09)*r,(b-.09)*r);ctx.stroke();}ellipse(-r*.1,-r*.02,2,2,'#164d42');ellipse(r*.1,-r*.02,2,2,'#164d42');ellipse(0,r*.14,3,4,'#164d42');for(let i=0;i<5;i++)ellipse(Math.cos(i*1.26)*r*.12,-r*.6+Math.sin(i*1.26)*r*.1,r*.1,r*.1,'#ed82ad');ellipse(0,-r*.6,r*.06,r*.06,'#ffe394');ctx.restore();}
function butterfly(x,y,t,index){if(artReady('butterfly')){const flap=reduceMotion?1:.8+.2*Math.sin(t*9+index);ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2+index)*.12);ctx.drawImage(art.butterfly,-32*flap,-22,64*flap,44);ctx.restore();return;}ctx.save();ctx.translate(x,y);const flap=reduceMotion?1:.7+.3*Math.sin(t*9+index);ctx.shadowColor='#d394ff';ctx.shadowBlur=12;for(const side of [-1,1]){ellipse(side*11*flap,-7,12*flap,14,index%2?'#6ddbc9':'#c2a0fa');ellipse(side*9*flap,9,9*flap,10,index%2?'#b6f5e2':'#ffb7d9');ellipse(side*13*flap,-9,4*flap,5,'#ffffffbb');}ctx.shadowBlur=0;ellipse(0,1,3,13,'#64517f');ctx.strokeStyle='#64517f';ctx.lineWidth=1.5;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(side*3,-20,side*7,-18);ctx.stroke();}ctx.restore();}
function welcomeArt(t){
  const x=W*.75,y=H*.4,s=Math.min(W*.25,H*.38);
  if(W<850)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(-.08);ctx.strokeStyle='#c7b5e244';ctx.lineWidth=1;ctx.setLineDash([4,9]);ctx.beginPath();ctx.ellipse(0,0,s*1.02,s*.8,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  bubble(x-s*.38,y-s*.16+Math.sin(t)*6,s*.57,'#bb9be8');bubble(x+s*.43,y+s*.2+Math.sin(t+.7)*8,s*.38,'#91d3ca','star');bubble(x+s*.35,y-s*.64+Math.sin(t+.3)*7,s*.23,'#f0bdcb');bubble(x-s*.6,y+s*.66,s*.18,'#a7c5ed');
  star(x-s*.9,y-s*.56,17,'#d8b560',.1);star(x+s*.75,y-s*.2,11,'#b395cb',.2);
  // A friendly garden sprite gives the welcome screen a little personality.
  const by=y+s*.62;ellipse(x+s*.02,by+s*.24,s*.35,s*.075,'#a8a0b622');
  ctx.save();ctx.translate(x,by);ctx.rotate(Math.sin(t*.6)*.03);ellipse(0,0,s*.22,s*.25,'#fffaf0');ellipse(-s*.15,-s*.15,s*.075,s*.16,'#fffaf0');ellipse(s*.15,-s*.15,s*.075,s*.16,'#fffaf0');ellipse(-s*.07,-s*.03,3,4,'#5c506c');ellipse(s*.07,-s*.03,3,4,'#5c506c');ellipse(-s*.12,s*.025,7,4,'#f0c2ca');ellipse(s*.12,s*.025,7,4,'#f0c2ca');ctx.strokeStyle='#8f798d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,s*.015,s*.045,.15,Math.PI-.15);ctx.stroke();ctx.restore();
  ctx.font='500 13px "DM Sans",sans-serif';ctx.fillStyle='#9284a5';ctx.textAlign='center';ctx.fillText('A whole world of wonder, with you in it.',x,H*.75);ctx.textAlign='left';
}
function fakePlayers(t){
  const count=sessionConfig.players;const list=[];
  for(let i=0;i<count;i++){
    const cx=count===1?.5:i===0?.35:.68,cy=i===0?.52:.57,scale=i===0?1:.8;
    const pose=Array.from({length:33},()=>({x:cx,y:cy}));
    pose[0]={x:cx,y:cy-.18*scale};pose[11]={x:cx-.055*scale,y:cy-.07*scale};pose[12]={x:cx+.055*scale,y:cy-.07*scale};
    pose[15]={x:cx-.14*scale,y:cy-.12*scale+Math.sin(t+i)*.025};pose[16]={x:cx+.14*scale,y:cy-.2*scale+Math.sin(t*.8+i)*.025};
    if(i===0&&pointer.active)pose[16]={x:pointer.x,y:pointer.y};
    list.push({pose,screen:true,id:i,scale});
  }
  return list;
}
function mapped(p,i){return p.screen?p.pose[i]:screenPoint(p.pose[i]);}
function drawAvatar(p){const head=mapped(p,0),l=mapped(p,11),r=mapped(p,12),a=mapped(p,15),b=mapped(p,16),cx=head.x*W,sy=(l.y+r.y)*H/2,bw=Math.abs(l.x-r.x)*W;ctx.save();ctx.strokeStyle=p.id===0?'#b5a2d2':'#8fc1b4';ctx.lineWidth=Math.max(18,bw*.3);ctx.lineCap='round';for(const [shoulder,hand] of [[l,a],[r,b]]){ctx.beginPath();ctx.moveTo(shoulder.x*W,shoulder.y*H);ctx.lineTo(hand.x*W,hand.y*H);ctx.stroke();ellipse(hand.x*W,hand.y*H,ctx.lineWidth*.5,ctx.lineWidth*.5,'#f6d7c2');}ctx.fillStyle=p.id===0?'#b5a2d2':'#8fc1b4';ctx.beginPath();ctx.roundRect(cx-bw*.68,sy-8,bw*1.36,H*.22*p.scale,[bw*.45,bw*.45,16,16]);ctx.fill();ellipse(cx,head.y*H,bw*.42,bw*.46,'#f6dcc8');ellipse(cx-bw*.13,head.y*H-2,2.4,3,'#67536a');ellipse(cx+bw*.13,head.y*H-2,2.4,3,'#67536a');ctx.strokeStyle='#a47879';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,head.y*H+3,bw*.1,.15,Math.PI-.15);ctx.stroke();ctx.restore();}
function wearables(p,behind,t){const level=rewardLevel(totalPops),l=mapped(p,11),r=mapped(p,12),head=mapped(p,0),cx=(l.x+r.x)*W/2,sy=(l.y+r.y)*H/2,bw=clamp(Math.abs(l.x-r.x)*W,40,200);ctx.save();
  if(behind&&level>=3){for(const side of [-1,1]){ctx.save();ctx.translate(cx+side*bw*.3,sy+bw*.45);ctx.rotate(side*(.35+Math.sin(t*2)*.06));ctx.fillStyle='#d5b3ebaa';ctx.strokeStyle='#b69ace';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(side*bw*.55,-bw*.2,bw*.72,bw*.95,side*.4,0,Math.PI*2);ctx.fill();ctx.stroke();ellipse(side*bw*.6,bw*.65,bw*.5,bw*.55,'#efc3ddbb');star(side*bw*.62,-bw*.25,9,'#fff0c6');ctx.restore();}}
  if(!behind&&level>=2){const x=head.x*W,y=head.y*H-bw*.53;ctx.translate(x,y);ctx.rotate(clamp(Math.atan(((r.y-l.y)*H)/((r.x-l.x)*W || 1)),-.3,.3));ctx.fillStyle='#edc76c';ctx.strokeStyle='#c99d44';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-bw*.36,0);ctx.lineTo(-bw*.44,-bw*.29);ctx.lineTo(-bw*.17,-bw*.15);ctx.lineTo(0,-bw*.42);ctx.lineTo(bw*.17,-bw*.15);ctx.lineTo(bw*.44,-bw*.29);ctx.lineTo(bw*.36,0);ctx.closePath();ctx.fill();ctx.stroke();star(0,-bw*.17,6,'#fffae5');ctx.setTransform(Math.min(devicePixelRatio||1,2),0,0,Math.min(devicePixelRatio||1,2),0,0);}
  if(!behind&&level>=1)for(const joint of [15,16]){if(!p.screen&&(p.pose[joint].visibility??1)<.45)continue;const h=mapped(p,joint),x=h.x*W,y=h.y*H;ctx.strokeStyle='#e7bc66';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y,12,7,-.3,0,Math.PI*2);ctx.stroke();for(let i=0;i<3;i++)star(x+Math.cos(t*2+i*2.1)*21,y+Math.sin(t*2+i*2.1)*18,4,'#fff2bd',t);}
  ctx.restore();
}
function draw(now){const t=now/1000;background(t);
  if(phase==='home'){welcomeArt(t);return;}
  const visiblePlayers=source==='demo'?fakePlayers(t):players;
  visiblePlayers.forEach(p=>wearables(p,true,t));
  if(source==='demo')visiblePlayers.forEach(drawAvatar);
  else if(lastResult&&now-lastResult<600){const r=imageRect();ctx.save();ctx.translate(r.x+r.w,r.y);ctx.scale(-1,1);ctx.globalAlpha=phase==='ended'?.35:1;ctx.drawImage(frameCanvas,0,0,r.w,r.h);ctx.restore();}
  visiblePlayers.forEach(p=>wearables(p,false,t));
  for(const target of targets){const x=target.x*W,y=target.y*H,r=target.r*H*(1+Math.sin(t*2+target.seed)*.025);if(target.type==='cactus')cactus(x,y,r);else bubble(x,y,r,target.color,target.type,Math.min(1,(target.ttl-target.life)/1.2));}
  for(const p of particles){ctx.globalAlpha=1-p.life/p.ttl;ellipse(p.x,p.y,p.r,p.r,p.color);}ctx.globalAlpha=1;
  for(const l of labels){ctx.globalAlpha=1-l.life/.8;ctx.font='600 25px Outfit,sans-serif';ctx.textAlign='center';ctx.fillStyle='#75609c';ctx.fillText(l.text,l.x,l.y);}ctx.globalAlpha=1;ctx.textAlign='left';
  hands.forEach((h,i)=>butterfly(h.x*W,h.y*H,t,i));
  if(source==='demo'){ctx.font='500 12px "DM Sans",sans-serif';ctx.fillStyle='#88749c';ctx.textAlign='center';ctx.fillText('MOUSE DEMO · Illustrated players, not camera tracking',W/2,H-145);ctx.textAlign='left';}
}
function diagnosticData(){return {build:BUILD,source,state:phase,mode,model:'MediaPipe Pose Landmarker Lite / tasks-vision 0.10.21',delegate,players:source==='demo'?'simulated':players.length,hands:hands.length,cutout:sessionConfig.cutout,processing:sessionConfig.quality,inferenceMs:Math.round(inferMs),trackingFPS:trackFPS,renderFPS,frameAgeMs:lastResult?Math.round(performance.now()-lastResult):null,cameraSize:source==='camera'?`${video.videoWidth}×${video.videoHeight}`:null,browser:navigator.userAgent,secureContext:window.isSecureContext,lastError,privacy:'No camera frames recorded or uploaded. No video filename included.'};}
function updateDiagnostics(){$('diagnostics').textContent=JSON.stringify(diagnosticData(),null,2);}
$('copy-diagnostics').onclick=async()=>{const text=JSON.stringify(diagnosticData(),null,2);try{await navigator.clipboard.writeText(text);$('copy-diagnostics').textContent='Copied!';setTimeout(()=>$('copy-diagnostics').textContent='Copy diagnostics',2000);}catch{$('diagnostics-copy').hidden=false;$('diagnostics-copy').value=text;$('diagnostics-copy').select();}};
function loop(now){const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;renderFrames++;requestFrame(now);step(dt,now);draw(now);if(now-fpsSince>1000){trackFPS=Math.round(frameCount*1000/(now-fpsSince));renderFPS=Math.round(renderFrames*1000/(now-fpsSince));frameCount=renderFrames=0;fpsSince=now;if($('settings').open)updateDiagnostics();}requestAnimationFrame(loop);}
resize();requestAnimationFrame(loop);
