// Bounded cosmetic feedback, independent of scoring and tracking.
export class RunnerEffects {
 constructor(reduced=false){this.reduced=reduced;this.reset();}
 reset(){this.particles=[];this.labels=[];this.flights=[];this.hit=0;this.gold=0;this.celebration=0;this.burstIn=0;this.burstIndex=0;}
 burst(x,y,colors,count=26){for(let i=0;i<(this.reduced?6:count);i++){const a=i/count*Math.PI*2,s=.07+(i%5)*.025;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.2,age:0,color:colors[i%colors.length],size:3+i%3});}this.particles=this.particles.slice(-320);}
 emit(e){const x=.52+e.lane*.13,y=.66;
 if(e.type==='star'){this.gold=.7;this.burst(x,y,['#fff6b7','#ffcf48','#ffed86']);this.flights.push({x,y,age:0});this.labels.push({x,y,age:0,text:'+1 STAR',color:'#fff3a4'});}
 if(e.type==='hit'){this.hit=.7;this.burst(x,y,['#ffbb83','#ffddc4','#fff2ce'],18);this.labels.push({x:.5,y:.43,age:0,text:'BONK! Jump over logs',color:'#ffe2c2'});}
 if(e.type==='clear')this.labels.push({x,y:.48,age:0,text:'SUPER JUMP!',color:'#b8ffd8'});
 if(e.type==='finish'){this.celebration=8;this.burstIn=0;}
 this.labels=this.labels.slice(-6);this.flights=this.flights.slice(-12);
 }
 step(dt,paused=false){if(paused)return;dt=Math.max(0,Math.min(.05,dt));this.hit=Math.max(0,this.hit-dt);this.gold=Math.max(0,this.gold-dt);
 for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.10*dt;}this.particles=this.particles.filter(p=>p.age<p.life);
 for(const p of this.labels)p.age+=dt;this.labels=this.labels.filter(p=>p.age<1.5);
 for(const p of this.flights)p.age+=dt;this.flights=this.flights.filter(p=>p.age<.85);
 if(this.celebration>0){this.celebration=Math.max(0,this.celebration-dt);this.burstIn-=dt;if(this.burstIn<=0){const n=this.burstIndex++;this.burst([.18,.82,.32,.68][n%4],.13+(n%3)*.065,['#ffe27b','#98f5d0','#ff9fbc','#bcb2ff'],44);this.burstIn=this.reduced?1.2:.42;}}
 }
 draw(ctx,w,h){ctx.clearRect(0,0,w,h);ctx.save();
 if(this.hit){ctx.globalAlpha=this.hit*.3;ctx.fillStyle='#ff935f';const edge=Math.max(8,w*.018);ctx.fillRect(0,0,w,edge);ctx.fillRect(0,h-edge,w,edge);ctx.fillRect(0,0,edge,h);ctx.fillRect(w-edge,0,edge,h);ctx.globalAlpha=1;}
 if(this.gold){ctx.strokeStyle='#ffe68c';ctx.globalAlpha=this.gold;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(w*.52,h*.69,w*(.045+(.7-this.gold)*.1),h*.07,0,0,Math.PI*2);ctx.stroke();}
 for(const p of this.particles){ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x*w,p.y*h,p.size,p.size);}
 for(const p of this.flights){const t=Math.min(1,p.age/.85),e=1-(1-t)**3,x=(p.x*(1-e)+.065*e)*w,y=(p.y*(1-e)+.16*e)*h-Math.sin(t*Math.PI)*h*.12;ctx.globalAlpha=1;ctx.fillStyle='#ffdf63';ctx.strokeStyle='#fff6c5';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:17;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();}
 ctx.textAlign='center';ctx.font='bold '+Math.max(18,Math.min(30,w*.025))+'px sans-serif';ctx.lineWidth=5;ctx.strokeStyle='#23463d';for(const p of this.labels){ctx.globalAlpha=Math.min(1,(1.5-p.age)*2);const x=p.x*w,y=(p.y-p.age*(this.reduced?.01:.055))*h;ctx.strokeText(p.text,x,y);ctx.fillStyle=p.color;ctx.fillText(p.text,x,y);}
 ctx.restore();ctx.globalAlpha=1;
 }
}
