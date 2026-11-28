// Original, softly plucked pentatonic music. No downloads or autoplay.
export class GardenMusic {
  constructor(context) {
    this.context=context; this.bus=context.createGain();
    this.bus.gain.value=0; this.bus.connect(context.destination);
    this.next=0; this.beat=0; this.playing=false;
  }
  update(playing,game='bubbles') {
    const c=this.context;
    playing=playing&&c.state==='running';
    if(!playing){this.bus.gain.value=0;this.playing=false;return;}
    if(!this.playing){this.next=c.currentTime+.03;this.playing=true;}
    this.bus.gain.value=.18;
    const melodies={puddles:[60,64,67,64,69,67,64,62],bubbles:[72,76,79,81,79,76,74,67],fruit:[72,79,76,81,79,74,76,67],pets:[76,74,72,67,72,79,76,74]};
    const notes=melodies[game]||melodies.bubbles,interval=game==='fruit'?.26:.36;
    // Do not replay a backlog after a suspended tab or a long frame.
    if(this.next<c.currentTime)this.next=c.currentTime+.03;
    while(this.next<c.currentTime+.12){
      this.note(notes[this.beat%notes.length],this.next,.3,.25);
      if(this.beat%4===0)this.note([48,53,55,48][Math.floor(this.beat/4)%4],this.next,.7,.2);
      this.next+=interval;this.beat++;
    }
  }
  note(midi,time,length,volume) {
    const c=this.context,o=c.createOscillator(),g=c.createGain();
    o.type='sine';o.frequency.setValueAtTime(440*2**((midi-69)/12),time);
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.015);
    g.gain.exponentialRampToValueAtTime(.001,time+length);
    o.connect(g);g.connect(this.bus);o.onended=()=>{o.disconnect();g.disconnect();};
    o.start(time);o.stop(time+length+.02);
  }
}
