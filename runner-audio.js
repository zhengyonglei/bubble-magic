// Original, quiet wooden bump. Initialized only from a player gesture.
export class RunnerAudio {
 constructor(create=()=>new (window.AudioContext||window.webkitAudioContext)()){this.create=create;this.context=null;this.enabled=true;this.voices=new Set();}
 unlock(){if(!this.enabled)return;try{this.context??=this.create();this.context.resume()?.catch(()=>{});}catch{this.context=null;}}
 bump(){const c=this.context;if(!this.enabled||!c||c.state!=='running')return;try{
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='triangle';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(85,t+.12);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(c.destination);
  this.voices.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};o.start(t);o.stop(t+.15);
 }catch{/* Audio must never interrupt gameplay. */}}
 stop(){for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();}
}
