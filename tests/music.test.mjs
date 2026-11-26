import test from 'node:test';
import assert from 'node:assert/strict';
import {GardenMusic} from '../music.js';
function audio(){
 const notes=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 return {notes,currentTime:0,state:'running',destination:{},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator(){const o={frequency:param(),connect(){},disconnect(){},start(at){this.at=at;},stop(at){this.end=at;}};notes.push(o);return o;}};
}
test('music schedules bounded notes, mutes immediately and avoids a suspended-tab backlog',()=>{
 const c=audio(),m=new GardenMusic(c);m.update(false);assert.equal(c.notes.length,0);
 m.update(true);assert.equal(c.notes.length,2);assert.ok(m.bus.gain.value>0);
 for(let i=0;i<20;i++)m.update(true);assert.equal(c.notes.length,2);
 m.update(false);assert.equal(m.bus.gain.value,0);
 c.currentTime=3600;m.update(true,'fruit');assert.ok(c.notes.length<=4);
 for(const n of c.notes.slice(2)){assert.ok(n.at>=3600);assert.ok(n.end>n.at);}
 c.state='suspended';m.update(true);assert.equal(m.bus.gain.value,0);
});
test('each game produces a finite looping melody',()=>{
 for(const game of ['bubbles','fruit','pets']){
  const c=audio(),m=new GardenMusic(c);
  for(let i=0;i<600;i++){c.currentTime=i/10;m.update(true,game);}
  assert.ok(c.notes.length>100&&c.notes.length<400);
  for(const n of c.notes){assert.ok(Number.isFinite(n.at)&&Number.isFinite(n.end));n.onended();}
 }
});
