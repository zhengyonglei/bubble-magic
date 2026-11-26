export const LEVELS={
 easy:{label:'Easy',interval:1.1,max:5,speed:.018,drift:.018,radius:.052,hazardEvery:0},
 medium:{label:'Medium',interval:.72,max:8,speed:.034,drift:.035,radius:.044,hazardEvery:7},
 hard:{label:'Hard',interval:.43,max:12,speed:.055,drift:.055,radius:.037,hazardEvery:4}
};
export const GAMES={
 bubbles:{title:'Bubble Magic',icon:'🫧',description:'Reach for floating bubbles and make them pop.',verb:'popped',noun:'bubbles'},
 fruit:{title:'Fruit Slice',icon:'🍉',description:'Sweep your hands through flying fruit. Make a juicy rainbow!',verb:'sliced',noun:'fruit'},
 pets:{title:'Cats & Dogs Catch',icon:'🐱',description:'Hold both hands out and move the basket between them to catch falling friends.',verb:'caught',noun:'friends'}
};
export function isHazard(level,count,enabled=true){const n=LEVELS[level].hazardEvery;return enabled&&n>0&&count%n===n-1;}
export function moveTarget(t,dt,game,level){const p=LEVELS[level];t.life+=dt;if(game==='pets'){t.y+=dt*p.speed*1.8;t.x+=dt*(t.vx+Math.sin(t.life*2+t.seed)*p.drift*.3);t.vx*=Math.exp(-dt*1.5);}else if(game==='fruit'){t.vy+=dt*p.speed*.65;t.y+=t.vy*dt;t.x+=t.vx*dt;}else{const k=t.type==='cactus'?.35:1;t.y-=dt*p.speed*k;t.x+=dt*(t.vx+Math.cos(t.life*2+t.seed)*p.drift*.5)*k;}if(t.x<.08||t.x>.92){t.x=Math.max(.08,Math.min(.92,t.x));t.vx=-t.vx;}}
export function canSlice(hand,now){return hand.prev&&now-hand.prev.time<250&&Math.hypot(hand.x-hand.prev.x,hand.y-hand.prev.y)>.002;}

export function bubbleSize(index){return [.78,1,1.3,1,.78,1.3][index%6];}
export function swipeCut(hand,target,width,height){const a=hand.prev||hand;const dx=(hand.x-a.x)*width,dy=(hand.y-a.y)*height;const angle=Math.atan2(dy,dx);const nx=-Math.sin(angle),ny=Math.cos(angle);const radius=target.r*height;const offset=Math.max(-radius*.7,Math.min(radius*.7,(a.x-target.x)*width*nx+(a.y-target.y)*height*ny));return {angle,offset,nx,ny};}

// Shared radii keep rendering, collision and sliced halves consistent.
export function fruitSize(kind){return [1.4,1.2,2.15][kind];}
export function basketGeometry(hand,width,height){return {x:hand.x*width,rim:hand.y*height,halfWidth:Math.max(44,Math.min(72,hand.bodyWidth?hand.bodyWidth*width*.45:height*.085)),depth:Math.max(44,Math.min(72,hand.bodyWidth?hand.bodyWidth*width*.45:height*.085))};}
export function basketContact(target,hand,width,height,now){
 if(!target.prev||now-hand.seen>350||hand.confidence<.45)return null;
 const b=basketGeometry(hand,width,height),radius=target.r*height;
 const previousHand=hand.prev&&now-hand.prev.time<250&&Math.hypot(hand.x-hand.prev.x,hand.y-hand.prev.y)<.25?hand.prev:hand;
 const oldBottom=(target.prev.y+target.r)*height-previousHand.y*height;
 const bottom=(target.y+target.r)*height-b.rim;
 // Catch only a falling animal crossing the open top, never a side swipe.
 if(target.y>target.prev.y&&oldBottom<=0&&bottom>=0){
  const fraction=-oldBottom/(bottom-oldBottom||1);
  const x=(target.prev.x+(target.x-target.prev.x)*fraction)*width;
  const basketX=(previousHand.x+(hand.x-previousHand.x)*fraction)*width;
  if(Math.abs(x-basketX)<=b.halfWidth-radius*.55)return 'catch';
 }
 const dx=Math.abs(target.x*width-b.x),y=target.y*height;
 const oldX=(target.prev.x-previousHand.x)*width,newX=target.x*width-b.x;
 const sweptSide=(oldX< -b.halfWidth&&newX>=-b.halfWidth)||(oldX>b.halfWidth&&newX<=b.halfWidth);
 if(y+radius>b.rim&&y-radius<b.rim+b.depth&&((dx>b.halfWidth-radius&&dx<b.halfWidth+radius)||sweptSide))return 'bounce';
 return null;
}

export function playerBaskets(hands){
 const grouped=new Map();const baskets=[];
 for(const h of hands){if(h.playerId==null){baskets.push(h);continue;}if(!grouped.has(h.playerId))grouped.set(h.playerId,[]);grouped.get(h.playerId).push(h);}
 for(const [id,pair] of grouped){
  if(pair.length!==2)continue;
  const [a,b]=pair,previous=a.prev&&b.prev?{x:(a.prev.x+b.prev.x)/2,y:(a.prev.y+b.prev.y)/2,time:Math.min(a.prev.time,b.prev.time)}:null;
  baskets.push({id:'basket:'+id,playerId:id,x:(a.x+b.x)/2,y:(a.y+b.y)/2,bodyWidth:a.bodyWidth,r:0,seen:Math.min(a.seen,b.seen),confidence:Math.min(a.confidence,b.confidence),prev:previous});
 }
 return baskets;
}
export function crownGeometry(points,width,height){
 const nose=points[0],left=points[2],right=points[5],earL=points[7],earR=points[8];
 const shoulder=Math.hypot((points[11].x-points[12].x)*width,(points[11].y-points[12].y)*height);
 const eyes=left&&right&&Math.hypot((left.x-right.x)*width,(left.y-right.y)*height)>2;
 const earSpan=earL&&earR?Math.hypot((earL.x-earR.x)*width,(earL.y-earR.y)*height):0;
 const faceWidth=Math.max(16,Math.min(shoulder*.9||100,Math.max(earSpan,eyes?Math.hypot((left.x-right.x)*width,(left.y-right.y)*height)*2.3:shoulder*.5)));
 const eyeY=eyes?(left.y+right.y)*height/2:nose.y*height-faceWidth*.18;
 const bottom=eyeY-faceWidth*.62,h=faceWidth*.72;
 return {x:eyes?(left.x+right.x)*width/2:nose.x*width,y:bottom-h/2,width:faceWidth*1.35,height:h};
}
