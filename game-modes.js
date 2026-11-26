export const LEVELS={
 easy:{label:'Easy',interval:1.1,max:5,speed:.018,drift:.018,radius:.052,hazardEvery:0},
 medium:{label:'Medium',interval:.72,max:8,speed:.034,drift:.035,radius:.044,hazardEvery:7},
 hard:{label:'Hard',interval:.43,max:12,speed:.055,drift:.055,radius:.037,hazardEvery:4}
};
export const GAMES={
 bubbles:{title:'Bubble Magic',icon:'🫧',description:'Reach for floating bubbles and make them pop.',verb:'popped',noun:'bubbles'},
 fruit:{title:'Fruit Slice',icon:'🍉',description:'Sweep your hands through flying fruit. Make a juicy rainbow!',verb:'sliced',noun:'fruit'},
 pets:{title:'Cats & Dogs Catch',icon:'🐱',description:'Catch the falling friends with your hands before they float away.',verb:'caught',noun:'friends'}
};
export function isHazard(level,count,enabled=true){const n=LEVELS[level].hazardEvery;return enabled&&n>0&&count%n===n-1;}
export function moveTarget(t,dt,game,level){const p=LEVELS[level];t.life+=dt;if(game==='pets'){t.y+=dt*p.speed*1.8;t.x+=Math.sin(t.life*2+t.seed)*dt*p.drift*.3;}else if(game==='fruit'){t.vy+=dt*p.speed*.65;t.y+=t.vy*dt;t.x+=t.vx*dt;}else{const k=t.type==='cactus'?.35:1;t.y-=dt*p.speed*k;t.x+=dt*(t.vx+Math.cos(t.life*2+t.seed)*p.drift*.5)*k;}if(t.x<.08||t.x>.92){t.x=Math.max(.08,Math.min(.92,t.x));t.vx=-t.vx;}}
export function canSlice(hand,now){return hand.prev&&now-hand.prev.time<250&&Math.hypot(hand.x-hand.prev.x,hand.y-hand.prev.y)>.002;}

export function bubbleSize(index){return [.78,1,1.3,1,.78,1.3][index%6];}
export function swipeCut(hand,target,width,height){const a=hand.prev||hand;const dx=(hand.x-a.x)*width,dy=(hand.y-a.y)*height;const angle=Math.atan2(dy,dx);const nx=-Math.sin(angle),ny=Math.cos(angle);const radius=target.r*height;const offset=Math.max(-radius*.7,Math.min(radius*.7,(a.x-target.x)*width*nx+(a.y-target.y)*height*ny));return {angle,offset,nx,ny};}
