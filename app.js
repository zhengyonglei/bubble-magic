import {LEVELS,GAMES,isHazard,moveTarget,canSlice,bubbleSize,swipeCut,fruitSize,basketContact,basketGeometry,playerBaskets,crownGeometry,fruitLaunch} from './game-modes.js?v=0.9.1';
import {Round,REWARDS,clamp,handHits,rewardLevel,matchPoses} from './game-core.js?v=0.9.1';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d'),video=$('input-video');
const frameCanvas=document.createElement('canvas'),frameCtx=frameCanvas.getContext('2d');
const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d');
const capture=document.createElement('canvas'),captureCtx=capture.getContext('2d');
const BUILD='0.9.1';
const art={};for(const [name,file] of Object.entries({cat:'cat-full-body-ai-v1.png',dog:'dog-full-body-ai-v1.png',props:'hand-props-ai-v1.png',atlas:'game-atlas-ai-v1.png',garden:'garden-ai-v1.jpg',cactus:'cactus-ai-v1.png',butterfly:'butterfly-ai-v1.png'})){const img=new Image();img.src=new URL('./assets/'+file,import.meta.url).href;art[name]=img;}
const SPRITES={bubble:0,star:1,apple:2,orange:3,melon:4,cat:5,dog:6,butterfly:7,cactus:8,crown:9,wings:10,bracelet:11,mascot:12,adult:13,child:14,sparkles:15};
function sprite(name,x,y,w,h=w,alpha=1){if(!artReady('atlas'))return false;const cell=art.atlas.naturalWidth/4,n=SPRITES[name];ctx.save();ctx.globalAlpha*=alpha;const crop={crown:[1,2.04,1,.75],wings:[2,2.06,1,.8],bracelet:[3,2.1,1,.68],adult:[1,2.86,1,1.14],child:[2,2.9,1,1.1]}[name]||[n%4,Math.floor(n/4),1,1];ctx.drawImage(art.atlas,crop[0]*cell,crop[1]*cell,crop[2]*cell,crop[3]*cell,x-w/2,y-h/2,w,h);ctx.restore();return true;}
const artReady=name=>art[name].complete&&art[name].naturalWidth>0;
let selectedGame='bubbles',difficulty='easy';
const level=()=>selectedGame==='bubbles'?{label:'Bubble party',interval:.28,max:20,speed:.04,drift:.035,radius:.043}:LEVELS[difficulty];
let W=1280,H=720,source='none',phase='home',mode='gentle',round=null;
let worker=null,workerReady=false,busy=false,stream=null,objectURL=null,sample=null,epoch=0;
let players=[],hands=[],lastResult=0,lastInference=0,lastVideoTime=-1,frameCount=0,renderFrames=0;
let inferMs=0,trackFPS=0,renderFPS=0,delegate='none',lastError='',modelTimer=null;
let nextPlayerId=1,targets=[],particles=[],labels=[],targetId=0,spawnClock=0,spawnCount=0;
let readyClock=0,hazardClock=0,caughtPets=[],popRings=[];const fingers=new Map();
let slices=[],previewRewards=false;const swipeTrails=new Map();
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
function setMode(value){difficulty=value;mode=value==='easy'?'gentle':'challenge';config.hazards=value!=='easy';$('hazards').checked=config.hazards;$('hazards').disabled=value==='easy';$('level-note').textContent=value==='easy'?'Easy: no cacti. Try Medium or Hard for obstacles.':'Cacti appear during scored rounds, even with one player.';document.querySelectorAll('[data-mode]').forEach(button=>{const selected=button.dataset.mode===value;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
function chooseGame(id){selectedGame=id;if(id==='bubbles')setMode('easy');document.querySelector('.mode-picker').hidden=id==='bubbles';$('level-note').hidden=id==='bubbles';$('demo').textContent='Play with mouse or touch';$('suite-menu').hidden=true;$('welcome').hidden=false;$('welcome-title').textContent=GAMES[id].title;$('game-description').textContent=GAMES[id].description;canvas.setAttribute('aria-label',GAMES[id].title+' play area. Move your pointer in mouse demo.');document.querySelector('.sky-label').textContent=GAMES[id].title;}
function mainMenu(){home();document.querySelector('.sky-label').textContent='PLAY GARDEN';$('welcome').hidden=true;$('suite-menu').hidden=false;}
document.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>chooseGame(button.dataset.game));$('all-games').onclick=mainMenu;$('choose-game').onclick=mainMenu;
function setPlayers(n){config.players=Number(n);$('players').value=String(n);document.querySelectorAll('[data-players]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.players)===config.players)));}
document.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>setPlayers(b.dataset.players));
$('preview-rewards').onchange=()=>{previewRewards=$('preview-rewards').checked;toast(previewRewards?'Reward preview on — score and unlocks unchanged.':'Showing earned rewards.');};
$('settings-button').onclick=()=>{$('settings').showModal();updateDiagnostics();};
for(const id of ['players','quality','cutout','hazards','height'])$(id).onchange=()=>{config[id]=$(id).type==='checkbox'?$(id).checked:id==='players'?Number($(id).value):$(id).value;};
$('players').onchange=()=>setPlayers($('players').value);
$('reset-rewards').onclick=()=>{totalPops=0;updateRewards();toast('A fresh dress-up adventure!');};
$('sound').onclick=()=>{sound=!sound;if(sound){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();} $('sound').innerHTML=`♫ <span>Sound ${sound?'on':'off'}</span>`;$('sound').setAttribute('aria-label',`Turn sound ${sound?'off':'on'}`);};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').innerHTML=`⛶ <span>${document.fullscreenElement?'Exit fullscreen':'Fullscreen'}</span>`;});
function tone(star=false,cactus=false){if(!sound||!audio||audio.state!=='running'||performance.now()-lastTone<45)return;lastTone=performance.now();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(cactus?180:star?880:520+Math.random()*220,t);o.frequency.exponentialRampToValueAtTime(cactus?90:star?1320:900,t+.1);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.18);}
function imageRect(){const iw=frameCanvas.width||640,ih=frameCanvas.height||480;const height=H-106;const s=Math.min(W/iw,height/ih);return {x:(W-iw*s)/2,y:0,w:iw*s,h:ih*s};}
function screenPoint(p){const r=imageRect();return {x:(r.x+(1-p.x)*r.w)/W,y:(r.y+p.y*r.h)/H};}
function stopMedia(){epoch++;clearTimeout(modelTimer);modelTimer=null;worker?.terminate();worker=null;workerReady=false;busy=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;video.removeAttribute('src');video.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;sample=null;players=[];hands=[];lastResult=0;lastVideoTime=-1;frameCtx.clearRect(0,0,frameCanvas.width,frameCanvas.height);}
function home(){$('stage').classList.toggle('in-session',false);fingers.clear();swipeTrails.clear();popRings=[];stopMedia();source='none';phase='home';manualPause=false;round=null;targets=[];particles=[];labels=[];slices=[];status('');$('welcome').hidden=false;$('hud').hidden=true;$('results').hidden=true;$('ready-bar').hidden=true;$('play-controls').hidden=true;$('pause').textContent='Pause';$('sky-label')?.removeAttribute('hidden');}
function fail(message){lastError=message;home();status(message,true);updateDiagnostics();}
function baseSession(type){if(selectedGame==='bubbles')setMode('easy');$('stage').classList.toggle('in-session',true);fingers.clear();popRings=[];stopMedia();source=type;phase='loading';sessionConfig={...config};targets=[];particles=[];labels=[];slices=[];round=null;manualPause=false;lastError='';delegate='none';inferMs=0;trackFPS=0;$('suite-menu').hidden=true;$('welcome').hidden=true;$('results').hidden=true;$('hud').hidden=false;$('ready-bar').hidden=true;$('play-controls').hidden=false;$('pause').hidden=true;$('score').textContent='0';$('time').textContent='1:00';$('pop-count').textContent='Get ready…';$('combo').textContent='Find your hands';$('session-rules').textContent=level().label+' · '+(config.players===1?'Solo':'Together')+' · '+(config.hazards&&difficulty!=='easy'?'Cacti on':'No obstacles');$('source-badge').textContent=type==='camera'?'LIVE CAMERA':type==='video'?'LOCAL VIDEO':type==='sample'?'SAMPLE PHOTO · NOT LIVE':'MOUSE / TOUCH · NO CAMERA';return epoch;}
function ready(){phase='ready';readyClock=0;$('ready-bar').hidden=false;$('pause').hidden=true;status('');if(source==='demo'){$('ready-title').textContent='Your pointer is a magic hand';$('ready-description').textContent=GAMES[selectedGame].description+' The round starts automatically in 3 seconds.';}else{$('ready-title').textContent='Find your hands';$('ready-description').textContent=(sessionConfig.players===1?'Solo play: keep your head and hands in view.':'Play together: stand side by side. One shared score.');}$('start-round').disabled=source!=='demo';spawnClock=0;}
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
    hands.push({...point,id,playerId:player.id,bodyWidth:Math.hypot((screenPoint(player.pose[11]).x-screenPoint(player.pose[12]).x),(screenPoint(player.pose[11]).y-screenPoint(player.pose[12]).y)*H/W),r:mode==='gentle'?.026:.019,confidence:p.visibility??1,seen:now,prev:old?{x:old.x,y:old.y,time:old.seen}:null});
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
function startRound(){swipeTrails.clear();popRings=[];hazardClock=0;caughtPets=[];round=new Round(mode);phase='playing';targets=[];particles=[];labels=[];slices=[];spawnClock=1;spawnCount=1;readyClock=0;manualPause=false;previousActive=false;mousePrev=null;$('ready-bar').hidden=true;$('results').hidden=true;$('pause').hidden=false;$('pause').textContent='Pause';status('');canvas.focus();}
$('start-round').onclick=startRound;$('again').onclick=startRound;
$('stop').onclick=home;$('finish').onclick=home;
$('pause').onclick=()=>{manualPause=!manualPause;mousePrev=null;hands.forEach(h=>h.prev=null);$('pause').textContent=manualPause?'Resume':'Pause';};
function pointerPosition(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/W,y:(e.clientY-r.top)/H};}
canvas.onpointerdown=e=>{if(source!=='demo')return;e.preventDefault();const point=pointerPosition(e);if(e.pointerType==='mouse'){pointer={...point,active:true};return;}canvas.setPointerCapture?.(e.pointerId);fingers.set(e.pointerId,{...point,id:'finger:'+e.pointerId,direct:true,time:performance.now(),prev:null});};
canvas.onpointermove=e=>{if(source!=='demo')return;const point=pointerPosition(e);if(e.pointerType==='mouse'){pointer={...point,active:true};return;}const old=fingers.get(e.pointerId);if(old){e.preventDefault();fingers.set(e.pointerId,{...old,...point,time:performance.now(),prev:old.prev||{x:old.x,y:old.y,time:old.time}});}};
canvas.onpointerup=e=>{const finger=fingers.get(e.pointerId);if(finger){e.preventDefault();finger.released=true;}};
canvas.onpointercancel=e=>fingers.delete(e.pointerId);
canvas.onlostpointercapture=e=>{const f=fingers.get(e.pointerId);if(f&&!f.released)fingers.delete(e.pointerId);};
canvas.onpointerleave=e=>{if(e.pointerType==='mouse'){pointer.active=false;mousePrev=null;}};
canvas.onkeydown=e=>{if(source!=='demo')return;const d={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];if(d){e.preventDefault();pointer.x=clamp(pointer.x+d[0],0,1);pointer.y=clamp(pointer.y+d[1],0,.8);pointer.active=true;}};
document.addEventListener('visibilitychange',()=>{mousePrev=null;hands=[];if(document.hidden){fingers.clear();stream?.getVideoTracks().forEach(t=>t.enabled=false);video.pause();}else{stream?.getVideoTracks().forEach(t=>t.enabled=true);if(source==='camera'||source==='video')video.play().catch(()=>fail('Video paused. Reopen the camera or video.'));}});
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
  if(selectedGame==='bubbles'){
    const r=level().radius*bubbleSize(spawnCount),left=spawnCount%2===0,zone=playerZone(spawnCount);
    targets.push({id:++targetId,x:left?-r*H/W-.015:1+r*H/W+.015,y:clamp(zone.y+(Math.random()-.5)*zone.h,.24,.68),r,type:spawnCount%7===6?'star':'bubble',life:0,ttl:16,color:colors[spawnCount%colors.length],vx:(left?1:-1)*(.075+Math.random()*.035),vy:0,seed:Math.random()*6,blown:true});spawnCount++;return;
  }

  const zone=playerZone(spawnCount),star=!practice&&spawnCount%7===6;
  const cactus=!practice&&config.hazards&&difficulty!=='easy'&&hazardClock>=(difficulty==='hard'?3:4)&&targets.filter(t=>t.type==='cactus').length<2&&now>recoveryUntil;
  const type=cactus?'cactus':selectedGame==='fruit'?'fruit':selectedGame==='pets'?(spawnCount%2?'cat':'dog'):star?'star':'bubble',r=level().radius*(selectedGame==='bubbles'&&!cactus?bubbleSize(spawnCount):selectedGame==='fruit'&&!cactus?fruitSize(spawnCount%3):selectedGame==='pets'&&!cactus?1.6:1);
  const petBaskets=playerBaskets(hands);const fittedRadius=type==='cat'||type==='dog'?Math.min(r,...petBaskets.map(h=>basketGeometry(h,W,H).halfWidth*.95/H)):r;
  if(selectedGame==='fruit'){
    targets.push({id:++targetId,r,type,life:0,fruit:spawnCount%3,color:colors[spawnCount%colors.length],seed:Math.random()*6,...fruitLaunch(difficulty,spawnCount,r,zone.y,Math.random,H/W)});spawnCount++;if(cactus)hazardClock=0;return;
  }
  let t;
  for(let attempt=0;attempt<15;attempt++){
    let y=zone.y+(Math.random()-.5)*zone.h;
    if(config.height==='low')y=clamp(y+.12,.3,.72);
    t={id:++targetId,x:clamp(zone.x+(Math.random()-.5)*zone.w,.09,.91),y:selectedGame==='pets'?Math.max(.13,zone.y-zone.h/2):selectedGame==='fruit'?Math.min(.72,zone.y+zone.h/2):clamp(y,.18,.72),r:fittedRadius,type,life:0,ttl:selectedGame==='pets'?20:practice?12:14,color:colors[spawnCount%colors.length],vx:(Math.random()<.5?-1:1)*level().drift,vy:-level().speed*2.6,fruit:spawnCount%3,seed:Math.random()*6};
    if(targets.every(o=>Math.hypot((o.x-t.x)*W,(o.y-t.y)*H)>(o.r+t.r)*H+15)&&(!cactus||hands.every(h=>Math.hypot((h.x-t.x)*W,(h.y-t.y)*H)>H*(r+h.r)+45)))break;
    t=null;
  }
  if(t){targets.push(t);spawnCount++;if(cactus)hazardClock=0;}
}
function burst(t,points){const x=t.x*W,y=t.y*H;if(selectedGame==='bubbles')popRings.push({x,y,r:t.r*H,life:0,color:t.color});for(let i=0;i<(reduceMotion?5:selectedGame==='bubbles'?32:15);i++){const a=Math.random()*Math.PI*2,s=selectedGame==='bubbles'?80+Math.random()*160:25+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0,ttl:.5+Math.random()*.4,color:t.type==='star'?'#d5a141':t.color,r:2+Math.random()*4});}if(t.type==='fruit')for(const side of [-1,1])slices.push({x,y,vx:(t.cut?.nx??1)*side*85,vy:(t.cut?.ny??0)*side*85-25,life:0,fruit:t.fruit,r:t.r*H,side,angle:t.cut?.angle??Math.PI/2,offset:t.cut?.offset??0});if(points)labels.push({x,y,text:`+${points}`,life:0});tone(t.type==='star',t.type==='cactus');}
function updateRewards(){document.querySelectorAll('[data-reward]').forEach(el=>{const n=Number(el.dataset.reward),earned=totalPops>=n;el.classList.toggle('earned',earned);el.querySelector('progress').value=Math.min(totalPops,n);el.querySelector('small').textContent=earned?'Unlocked together':`${Math.min(totalPops,n)} / ${n} catches`;});const next=REWARDS.find(r=>r.at>totalPops);$('reward-caption').textContent=next?`${next.name}: ${Math.min(totalPops,next.at)} / ${next.at} collected together`:'Your magic wardrobe is complete!';}
function endRound(){phase='ended';$('pause').hidden=true;$('results').hidden=false;$('final-score').textContent=round.score.toLocaleString();$('final-pops').textContent=round.pops;$('final-rewards').textContent=rewardLevel(totalPops)?`${rewardLevel(totalPops)} dress-up reward${rewardLevel(totalPops)>1?'s':''} ready for the next round.`:'A few more pops next time unlock sparkle bracelets.';status('');}
function step(dt,now){
  if(source==='demo'){
    hands=pointer.active?[{...pointer,id:'mouse',direct:true,r:mode==='gentle'?.026:.019,confidence:1,seen:now,prev:mousePrev}]:[];
    hands.push(...[...fingers.values()].map(f=>({...f,r:.025,confidence:1,seen:now})));
    for(const [id,f] of fingers){if(f.released)fingers.delete(id);else f.prev=null;}
    mousePrev=pointer.active?{x:pointer.x,y:pointer.y,time:now}:null;
  }else if(now-lastResult>350){hands=[];if(now-lastResult>600)players=[];}
  const controls=selectedGame==='pets'?playerBaskets(hands):hands;
  const present=source==='demo'||controls.length>0;
  const active=present&&!manualPause&&!document.hidden&&!$('settings').open;
  if(active&&!previousActive){recoveryUntil=now+1000;hands.forEach(h=>{if(!h.direct)h.prev=null;});}
  previousActive=active;
  if(phase==='ready'){
    readyClock=active?readyClock+dt:0;
    $('ready-title').textContent=active?'Starting in '+Math.max(1,Math.ceil(3-readyClock))+'…':'Show your hands to start';
    $('ready-description').textContent=selectedGame==='pets'&&source!=='demo'?'Keep both hands visible. Your basket sits between them.':'Every catch earns points and dress-up rewards once the countdown ends.';
    $('pop-count').textContent='Get ready · scoring starts shortly';
    if(readyClock>=3)startRound();
  }
  if(phase==='playing'){
    if(manualPause)status('Paused. Take a breath, then press Resume.');
    else if(!present)status(selectedGame==='pets'?'Show both hands to hold your basket. The clock is paused.':'Step back into view with your hands visible. The clock is paused.');
    else status('');
    round.tick(dt,active);
    if(round.finished){$('time').textContent='0:00';endRound();return;}
    $('score').textContent=round.score.toLocaleString();$('pop-count').textContent=`${round.pops} ${round.pops===1?(selectedGame==='bubbles'?'bubble':selectedGame==='pets'?'friend':'fruit'):GAMES[selectedGame].noun} ${GAMES[selectedGame].verb}`;
    const seconds=Math.ceil(round.remaining);$('time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    $('combo').textContent=round.multiplier>1?`${round.multiplier}× sparkle streak!`:(mode==='challenge'&&config.hazards?'Avoid cacti · −20 points':selectedGame==='fruit'?'Swipe to slice':selectedGame==='pets'?'Catch from above · one basket per player':'Reach to pop');
  }
  if(phase==='playing'&&active){
    hazardClock+=dt;
    spawnClock+=dt;const practice=phase==='ready',interval=practice?1.3:level().interval;
    if(spawnClock>=interval&&targets.length<level().max+(config.hazards&&difficulty!=='easy'&&hazardClock>=4?1:0)){spawnClock=0;spawn(now,practice);}
    for(const t of targets){t.prev={x:t.x,y:t.y};moveTarget(t,dt,selectedGame,difficulty);}
    const hit=targets.filter(t=>controls.some(h=>{
      if(t.tossed&&(t.life<.25||t.x*W<t.r*H||t.x*W>W-t.r*H))return false;
      if(selectedGame==='pets'&&t.type!=='cactus'){
        const contact=basketContact(t,h,W,H,now);
        if(contact==='catch'){caughtPets.push({type:t.type,r:t.r,startX:t.x-h.x,startY:t.y-h.y,hand:{...h},handId:h.id,life:0});return true;}
        if(contact==='bounce'&&now>(t.bounceUntil||0)){const side=(t.prev.x-(h.prev?.x??h.x))<0?-1:1;const b=basketGeometry(h,W,H);t.x=(b.x+side*(b.halfWidth+t.r*H+2))/W;t.vx=side*.16;t.bounceUntil=now+200;labels.push({x:t.x*W,y:t.y*H,text:'Boing!',life:0});}
        return false;
      }
      if(selectedGame==='fruit'&&t.type!=='cactus'&&!canSlice(h,now))return false;
      // Convert x to height units so collision circles stay circular on wide displays.
      const hh={...h,x:h.x*W/H,prev:h.prev?{...h.prev,x:h.prev.x*W/H}:null};
      const hit=handHits(hh,{...t,x:t.x*W/H},now);if(hit&&t.type==='fruit')t.cut=swipeCut(h,t,W,H);return hit;
    })).filter(t=>t.type!=='cactus'||now>recoveryUntil).sort((a,b)=>(a.type==='cactus'?-1:0)-(b.type==='cactus'?-1:0));
    for(const t of hit){
      if(practice){burst(t,0);continue;}
      const outcome=round.hit(t);if(!outcome)continue;
      burst(t,outcome.points);$('score').textContent=round.score.toLocaleString();
      if(outcome.cactus){toast('Ouch! Cactus −'+outcome.penalty+' points. Combo reset.');}
      else {const old=rewardLevel(totalPops);totalPops++;updateRewards();if(rewardLevel(totalPops)>old)toast(`✦ ${REWARDS[old].name} for everyone!`);}
    }
    const ids=new Set(hit.map(t=>t.id));targets=targets.filter(t=>!ids.has(t.id)&&t.life<t.ttl&&(t.tossed?t.y<1.3&&t.x>-t.r*H/W*2-.1&&t.x<1+t.r*H/W*2+.1:t.blown?t.x>-.25&&t.x<1.25&&t.y>.12&&t.y<.8:t.y>.07&&t.y<.83));
  }
  if(active){caughtPets.forEach(p=>{p.life+=dt;const h=controls.find(h=>h.id===p.handId);if(h)p.hand={...h};});caughtPets=caughtPets.filter(p=>p.life<2.4);}
  popRings.forEach(p=>p.life+=dt);popRings=popRings.filter(p=>p.life<.65);
  if(selectedGame==='fruit'){
    for(const [id,path] of swipeTrails){const fresh=path.filter(p=>now-p.time<(reduceMotion?130:500));if(fresh.length)swipeTrails.set(id,fresh);else swipeTrails.delete(id);}
    if(active)for(const h of hands){
      const path=swipeTrails.get(h.id)||[],last=path.at(-1);
      if(last&&Math.hypot(h.x-last.x,h.y-last.y)>.25&&!h.direct){swipeTrails.delete(h.id);continue;}
      if(!last||Math.hypot(h.x-last.x,h.y-last.y)>.001){if(!last&&h.prev&&now-h.prev.time<250)path.push({...h.prev});path.push({x:h.x,y:h.y,time:now});swipeTrails.set(h.id,path.slice(-30));}
    }
  }
  trailClock+=dt;
  if(active&&!reduceMotion&&trailClock>.05){trailClock=0;for(const h of hands)particles.push({x:h.x*W,y:h.y*H,vx:(Math.random()-.5)*15,vy:12,life:0,ttl:.4,color:'#d79eea',r:2+Math.random()*2});}
  for(const p of particles){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;}particles=particles.filter(p=>p.life<p.ttl).slice(-200);
  slices.forEach(s=>{s.life+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=220*dt;});slices=slices.filter(s=>s.life<.65);
  labels.forEach(l=>{l.life+=dt;l.y-=dt*40;});labels=labels.filter(l=>l.life<1.25);
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
function bubble(x,y,r,color,kind='bubble',alpha=1){if(sprite(kind==='star'?'star':'bubble',x,y,r*2.5,r*2.5,alpha))return;
  ctx.save();ctx.globalAlpha=alpha;
  const g=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.05,x,y,r);g.addColorStop(0,'#ffffff75');g.addColorStop(.65,color+'35');g.addColorStop(.9,color+'85');g.addColorStop(1,color+'cc');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffffcc';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.86,3.6,4.9);ctx.strokeStyle='#ffffffed';ctx.lineWidth=Math.max(3,r*.055);ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.88,.4,1.3);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ellipse(x-r*.35,y-r*.52,r*.12,r*.065,'#ffffffdd');
  if(kind==='star')star(x,y,r*.43,'#d4a344',-.1);
  ctx.restore();
}
function cactus(x,y,r){ctx.save();if(sprite('cactus',x,y,r*2.35)){}else if(artReady('cactus'))ctx.drawImage(art.cactus,x-r*.82,y-r,r*1.64,r*2);else{ctx.font=r*1.6+'px sans-serif';ctx.textAlign='center';ctx.fillText('🌵',x,y+r*.55);}ctx.strokeStyle='#d97735';ctx.lineWidth=2.5;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*r*.95,y-r*.4);ctx.lineTo(x+side*r*1.12,y-r*.55);ctx.stroke();}ctx.font='700 '+Math.max(10,r*.32)+'px sans-serif';ctx.textAlign='center';const label='HANDS OFF';ctx.fillStyle='#fff4e9';ctx.fillRect(x-r*1.1,y+r*.96,r*2.2,r*.46);ctx.fillStyle='#a84c20';ctx.fillText(label,x,y+r*1.3);ctx.restore();}
function fruitArt(x,y,r,kind=0){if(sprite(['apple','orange','melon'][kind],x,y,r*2.45))return;ctx.save();ellipse(x,y,r*.9,r,kind===0?'#f06c73':kind===1?'#ffb844':'#8ccf79');ctx.strokeStyle=kind===0?'#b73f50':kind===1?'#d98a32':'#4d9c67';ctx.lineWidth=2;ctx.stroke();ellipse(x-r*.27,y-r*.32,r*.14,r*.23,'#ffffff66');ctx.strokeStyle='#6c6950';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-r*.85);ctx.lineTo(x+r*.1,y-r*1.16);ctx.stroke();ellipse(x+r*.27,y-r,r*.26,r*.12,'#438e62');if(kind===2){ctx.strokeStyle='#4d9c67';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(x+side*r*.3,y,r*.2,r*.85,0,-1.2,1.2);ctx.stroke();}}ctx.restore();}
function petArt(x,y,r,type){if(artReady(type)){ctx.drawImage(art[type],x-r,y-r,r*2,r*2);return;}if(sprite(type,x,y,r*2.4))return;ctx.save();const cat=type==='cat',coat=cat?'#f2b984':'#ba997e';ctx.fillStyle=coat;for(const side of [-1,1]){if(cat){ctx.beginPath();ctx.moveTo(x+side*r*.3,y-r*.6);ctx.lineTo(x+side*r*.8,y-r*1.05);ctx.lineTo(x+side*r*.85,y);ctx.fill();}else ellipse(x+side*r*.75,y,r*.3,r*.65,'#826451');}ellipse(x,y,r*.78,r*.8,coat);ellipse(x,y+r*.27,r*.42,r*.3,'#fff1dd');for(const side of [-1,1])ellipse(x+side*r*.27,y-r*.08,r*.07,r*.09,'#584952');ellipse(x,y+r*.15,r*.1,r*.07,'#765568');ctx.strokeStyle='#765568';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y+r*.23,r*.17,0,Math.PI);ctx.stroke();ctx.restore();}
function drawBasket(h,front){
 const b=basketGeometry(h,W,H),r=b.halfWidth;
 ctx.save();ctx.translate(b.x,b.rim);
 if(front){ctx.beginPath();ctx.moveTo(-r*1.25,r*.25);ctx.bezierCurveTo(-r*.65,r*.95,r*.65,r*.95,r*1.25,r*.25);ctx.lineTo(r*1.4,r*2);ctx.lineTo(-r*1.4,r*2);ctx.closePath();ctx.clip();}
 if(artReady('props'))ctx.drawImage(art.props,art.props.naturalWidth/2,0,art.props.naturalWidth/2,art.props.naturalHeight,-r*1.25,-r*.35,r*2.5,r*2);
 else{ctx.font='100px sans-serif';ctx.fillText('🧺',-r,r);}
 ctx.restore();
}
function handProp(h,t,index){const x=h.x*W,y=h.y*H;if(selectedGame==='bubbles'){butterfly(x,y,t,index);return;}if(selectedGame==='fruit'){ctx.save();ctx.shadowColor='#6af9ff';ctx.shadowBlur=reduceMotion?0:18;ellipse(x,y,6,6,'#fffbea');ctx.restore();}}
function drawSwipeTrails(now){
 for(const path of swipeTrails.values())for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],fade=Math.max(0,1-(now-b.time)/(reduceMotion?130:500));
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=fade;ctx.shadowColor='#b765ff';ctx.shadowBlur=reduceMotion?0:16;
  ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.lineTo(b.x*W,b.y*H);ctx.strokeStyle='#b678ff';ctx.lineWidth=3+fade*10;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fffbea';ctx.lineWidth=1+fade*3;ctx.stroke();ctx.restore();
 }
}

function welcomeArt(t){if(selectedGame!=='bubbles'&&W>=850){const x=W*.76,y=H*.39,r=Math.min(W*.07,H*.12);if(selectedGame==='fruit'){fruitArt(x-r*1.1,y-r*.6,r,0);fruitArt(x+r*.85,y+r*.4,r*.9,2);fruitArt(x-r*.8,y+r*1.5,r*.7,1);}else{petArt(x-r*.9,y-r*.4,r,'cat');petArt(x+r*.9,y+r*.6,r,'dog');}return;}
  const x=W*.75,y=H*.4,s=Math.min(W*.25,H*.38);
  if(W<850)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(-.08);ctx.strokeStyle='#c7b5e244';ctx.lineWidth=1;ctx.setLineDash([4,9]);ctx.beginPath();ctx.ellipse(0,0,s*1.02,s*.8,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  bubble(x-s*.38,y-s*.16+Math.sin(t)*6,s*.57,'#bb9be8');bubble(x+s*.43,y+s*.2+Math.sin(t+.7)*8,s*.38,'#91d3ca','star');bubble(x+s*.35,y-s*.64+Math.sin(t+.3)*7,s*.23,'#f0bdcb');bubble(x-s*.6,y+s*.66,s*.18,'#a7c5ed');
  star(x-s*.9,y-s*.56,17,'#d8b560',.1);star(x+s*.75,y-s*.2,11,'#b395cb',.2);
  if(artReady('atlas')){sprite('mascot',x,y+s*.65,s*.9,s*.9);return;}
  // A friendly garden sprite gives the welcome screen a little personality.
  const by=y+s*.62;ellipse(x+s*.02,by+s*.24,s*.35,s*.075,'#a8a0b622');
  ctx.save();ctx.translate(x,by);ctx.rotate(Math.sin(t*.6)*.03);ellipse(0,0,s*.22,s*.25,'#fffaf0');ellipse(-s*.15,-s*.15,s*.075,s*.16,'#fffaf0');ellipse(s*.15,-s*.15,s*.075,s*.16,'#fffaf0');ellipse(-s*.07,-s*.03,3,4,'#5c506c');ellipse(s*.07,-s*.03,3,4,'#5c506c');ellipse(-s*.12,s*.025,7,4,'#f0c2ca');ellipse(s*.12,s*.025,7,4,'#f0c2ca');ctx.strokeStyle='#8f798d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,s*.015,s*.045,.15,Math.PI-.15);ctx.stroke();ctx.restore();
  ctx.font='500 13px "DM Sans",sans-serif';ctx.fillStyle='#9284a5';ctx.textAlign='center';ctx.fillText('A whole world of wonder, with you in it.',x,H*.75);ctx.textAlign='left';
}
function mapped(p,i){return p.screen?p.pose[i]:screenPoint(p.pose[i]);}
function wearables(p,behind,t){const level=previewRewards?3:rewardLevel(totalPops),l=mapped(p,11),r=mapped(p,12),head=mapped(p,0),cx=(l.x+r.x)*W/2,sy=(l.y+r.y)*H/2,bw=clamp(Math.abs(l.x-r.x)*W,40,200);ctx.save();
  if(artReady('atlas')){if(behind&&level>=3)sprite('wings',cx,sy+bw*.65,bw*3,bw*2.5);if(!behind&&level>=2){const c=crownGeometry(p.pose.map((_,i)=>mapped(p,i)),W,H);sprite('crown',c.x,c.y,c.width,c.height);}if(!behind&&level>=1)for(const joint of [15,16]){if(!p.screen&&(p.pose[joint].visibility??1)<.45)continue;const h=mapped(p,joint);sprite('bracelet',h.x*W,h.y*H,44,35);}ctx.restore();return;}

  if(behind&&level>=3){for(const side of [-1,1]){ctx.save();ctx.translate(cx+side*bw*.3,sy+bw*.45);ctx.rotate(side*(.35+Math.sin(t*2)*.06));ctx.fillStyle='#d5b3ebaa';ctx.strokeStyle='#b69ace';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(side*bw*.55,-bw*.2,bw*.72,bw*.95,side*.4,0,Math.PI*2);ctx.fill();ctx.stroke();ellipse(side*bw*.6,bw*.65,bw*.5,bw*.55,'#efc3ddbb');star(side*bw*.62,-bw*.25,9,'#fff0c6');ctx.restore();}}
  if(!behind&&level>=2){const c=crownGeometry(p.pose.map((_,i)=>mapped(p,i)),W,H),x=c.x,y=c.y+c.height/2;ctx.translate(x,y);ctx.rotate(clamp(Math.atan(((r.y-l.y)*H)/((r.x-l.x)*W || 1)),-.3,.3));ctx.fillStyle='#edc76c';ctx.strokeStyle='#c99d44';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-bw*.36,0);ctx.lineTo(-bw*.44,-bw*.29);ctx.lineTo(-bw*.17,-bw*.15);ctx.lineTo(0,-bw*.42);ctx.lineTo(bw*.17,-bw*.15);ctx.lineTo(bw*.44,-bw*.29);ctx.lineTo(bw*.36,0);ctx.closePath();ctx.fill();ctx.stroke();star(0,-bw*.17,6,'#fffae5');ctx.setTransform(Math.min(devicePixelRatio||1,2),0,0,Math.min(devicePixelRatio||1,2),0,0);}
  if(!behind&&level>=1)for(const joint of [15,16]){if(!p.screen&&(p.pose[joint].visibility??1)<.45)continue;const h=mapped(p,joint),x=h.x*W,y=h.y*H;ctx.strokeStyle='#e7bc66';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y,12,7,-.3,0,Math.PI*2);ctx.stroke();for(let i=0;i<3;i++)star(x+Math.cos(t*2+i*2.1)*21,y+Math.sin(t*2+i*2.1)*18,4,'#fff2bd',t);}
  ctx.restore();
}
function draw(now){const t=now/1000;background(t);
  if(phase==='home'){if($('suite-menu').hidden)welcomeArt(t);return;}
  const visiblePlayers=source==='demo'?[]:players;
  visiblePlayers.forEach(p=>wearables(p,true,t));
  if(source!=='demo'&&lastResult&&now-lastResult<600){const r=imageRect();ctx.save();ctx.translate(r.x+r.w,r.y);ctx.scale(-1,1);ctx.globalAlpha=phase==='ended'?.35:1;ctx.drawImage(frameCanvas,0,0,r.w,r.h);ctx.restore();}
  visiblePlayers.forEach(p=>wearables(p,false,t));
  for(const target of targets){const x=target.x*W,y=target.y*H,r=target.r*H*(1+Math.sin(t*2+target.seed)*.025);if(target.type==='cactus')cactus(x,y,r);else if(target.type==='fruit')fruitArt(x,y,r,target.fruit);else if(target.type==='cat'||target.type==='dog')petArt(x,y,r,target.type);else bubble(x,y,r,target.color,target.type,Math.min(1,(target.ttl-target.life)/1.2));}
  for(const s of slices){ctx.save();ctx.globalAlpha=1-s.life/.65;ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.beginPath();ctx.rect(-s.r*1.5,s.side<0?-s.r*1.5:s.offset,s.r*3,s.side<0?s.r*1.5+s.offset:s.r*1.5-s.offset);ctx.clip();ctx.rotate(-s.angle);fruitArt(0,0,s.r,s.fruit);ctx.restore();}
  for(const pop of popRings){ctx.save();ctx.globalAlpha=1-pop.life/.65;const radius=pop.r*(1+pop.life*(reduceMotion?.35:1.8));ctx.lineWidth=3*(1-pop.life/.65)+1;ctx.strokeStyle='#fff9e9';ctx.beginPath();ctx.arc(pop.x,pop.y,radius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=pop.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(pop.x,pop.y,radius*1.16,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;star(pop.x+Math.cos(a)*radius,pop.y+Math.sin(a)*radius,5*(1-pop.life/.65),'#fff3ab',a+pop.life);}ctx.restore();}
  for(const [i,p] of particles.entries()){ctx.globalAlpha=1-p.life/p.ttl;if(i%4===0&&artReady('atlas'))sprite('sparkles',p.x,p.y,p.r*5);else ellipse(p.x,p.y,p.r,p.r,p.color);}ctx.globalAlpha=1;
  for(const l of labels){ctx.globalAlpha=Math.min(1,(1.25-l.life)*2);ctx.font='800 38px Outfit,sans-serif';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';ctx.strokeStyle='#503376';ctx.strokeText(l.text,l.x,l.y);ctx.fillStyle='#fff3a4';ctx.fillText(l.text,l.x,l.y);}ctx.globalAlpha=1;ctx.textAlign='left';
  if(selectedGame==='fruit')drawSwipeTrails(now);
  if(selectedGame==='pets'){
    const baskets=new Map(playerBaskets(hands).map(h=>[h.id,h]));
    for(const pet of caughtPets)if(!baskets.has(pet.handId))baskets.set(pet.handId,pet.hand);
    for(const h of baskets.values()){
      drawBasket(h,false);
      for(const pet of caughtPets.filter(p=>p.handId===h.id)){
        const b=basketGeometry(h,W,H),progress=Math.min(1,pet.life/.65),ease=1-Math.pow(1-progress,2);
        // Descend at full size, then sit behind the front rim before fading.
        const x=b.x+pet.startX*W*(1-ease),y=b.rim+pet.startY*H*(1-ease)+b.depth*.32*ease;
        ctx.save();ctx.globalAlpha=Math.min(1,(2.4-pet.life)/.5);petArt(x,y,pet.r*H,pet.type);ctx.restore();
      }
      drawBasket(h,true);
    }
  }else hands.forEach((h,i)=>handProp(h,t,i));
  if(previewRewards){ctx.font='600 13px sans-serif';ctx.fillStyle='#644c85';ctx.textAlign='center';ctx.fillText('REWARD PREVIEW · score unchanged',W/2,35);ctx.textAlign='left';}
  if(source==='demo'){ctx.font='500 12px "DM Sans",sans-serif';ctx.fillStyle='#88749c';ctx.textAlign='center';ctx.fillText('MOUSE / TOUCH · Tap or swipe to play',W/2,H-145);ctx.textAlign='left';}
}
function diagnosticData(){return {build:BUILD,source,state:phase,game:selectedGame,difficulty,mode,model:'MediaPipe Pose Landmarker Lite / tasks-vision 0.10.21',delegate,players:source==='demo'?'simulated':players.length,hands:hands.length,cutout:sessionConfig.cutout,processing:sessionConfig.quality,inferenceMs:Math.round(inferMs),trackingFPS:trackFPS,renderFPS,frameAgeMs:lastResult?Math.round(performance.now()-lastResult):null,cameraSize:source==='camera'?`${video.videoWidth}×${video.videoHeight}`:null,browser:navigator.userAgent,secureContext:window.isSecureContext,lastError,privacy:'No camera frames recorded or uploaded. No video filename included.'};}
function updateDiagnostics(){$('diagnostics').textContent=JSON.stringify(diagnosticData(),null,2);}
$('copy-diagnostics').onclick=async()=>{const text=JSON.stringify(diagnosticData(),null,2);try{await navigator.clipboard.writeText(text);$('copy-diagnostics').textContent='Copied!';setTimeout(()=>$('copy-diagnostics').textContent='Copy diagnostics',2000);}catch{$('diagnostics-copy').hidden=false;$('diagnostics-copy').value=text;$('diagnostics-copy').select();}};
function loop(now){const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;renderFrames++;requestFrame(now);step(dt,now);draw(now);if(now-fpsSince>1000){trackFPS=Math.round(frameCount*1000/(now-fpsSince));renderFPS=Math.round(renderFrames*1000/(now-fpsSince));frameCount=renderFrames=0;fpsSince=now;if($('settings').open)updateDiagnostics();}requestAnimationFrame(loop);}
setMode('easy');setPlayers(1);updateRewards();mainMenu();resize();requestAnimationFrame(loop);
