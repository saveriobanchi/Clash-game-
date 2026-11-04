import { A } from './dom';

/** Kenney Casino Audio samples (CC0) + Web Audio synthesis for cues and the ambient score. */
const SAMPLES = {
  chip: ['chip-lay-1', 'chip-lay-2', 'chip-lay-3'],
  chips: ['chips-stack-1', 'chips-stack-2', 'chips-stack-3', 'chips-handle-1', 'chips-handle-2'],
  collide: ['chips-collide-1', 'chips-collide-2'],
  card: ['card-place-1', 'card-place-2', 'card-place-3'],
  slide: ['card-slide-1', 'card-slide-2', 'card-slide-3', 'card-slide-4'],
  shove: ['card-shove-1', 'card-shove-2'],
  fan: ['card-fan-1'],
} as const;
type SampleName = keyof typeof SAMPLES;

class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  buffers = new Map<string, AudioBuffer>();
  sfxOn = true;
  musicOn = true;
  private musicTimer = 0;
  private reverb!: ConvolverNode;

  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.5 : 0; this.musicBus.connect(this.master);
    this.reverb = this.ctx.createConvolver(); this.reverb.buffer = this.impulse(3.2); 
    const wet = this.ctx.createGain(); wet.gain.value = 0.35; this.reverb.connect(wet); wet.connect(this.master);
    for (const list of Object.values(SAMPLES)) for (const n of list) void this.fetch(n);
    if (this.musicOn) this.startMusic();
  }
  private impulse(sec: number): AudioBuffer {
    const c = this.ctx!; const len = c.sampleRate * sec; const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
  private async fetch(n: string): Promise<void> {
    try {
      const r = await fetch(A(`sfx/${n}.mp3`));
      const buf = await this.ctx!.decodeAudioData(await r.arrayBuffer());
      this.buffers.set(n, buf);
    } catch { /* sample unavailable */ }
  }
  setVolume(v: number): void { if (this.master) this.master.gain.value = v; }
  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.4);
    if (on) this.startMusic();
  }
  play(name: SampleName, vol = 0.7, rate = 1): void {
    if (!this.ctx || !this.sfxOn) return;
    const list = SAMPLES[name];
    const buf = this.buffers.get(list[Math.floor(Math.random() * list.length)]);
    if (!buf) return;
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.sfxBus); s.start();
  }
  /** A single synthesized note. */
  tone(freq: number, dur = 0.15, type: OscillatorType = 'triangle', vol = 0.2, when = 0, wet = false, slide = 0): void {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.sfxBus); if (wet) g.connect(this.reverb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur = 0.2, vol = 0.15, freq = 1200, when = 0, q = 1): void {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t);
  }
  // ---- cues ----
  click(): void { this.tone(1800, 0.03, 'square', 0.04); }
  tick(i = 0): void { this.tone(900 + (i % 5) * 60, 0.025, 'square', 0.05); }
  reelStop(i: number): void { this.noise(0.08, 0.25, 300 + i * 40, 0, 2); this.tone(110 + i * 8, 0.12, 'sine', 0.18); }
  win(level = 1): void {
    const base = [220, 261.6, 329.6, 440, 523.3, 659.3];
    const n = Math.min(6, 2 + level);
    for (let i = 0; i < n; i++) this.tone(base[i] * 2, 0.35, 'triangle', 0.12, i * 0.07, true);
    this.play('chips', 0.6);
  }
  bigWin(): void {
    const chord = [110, 164.8, 220, 261.6, 329.6, 440];
    chord.forEach((f, i) => { this.tone(f, 2.4, 'sawtooth', 0.035, i * 0.03, true); this.tone(f * 2, 1.6, 'triangle', 0.06, 0.3 + i * 0.09, true); });
    for (let i = 0; i < 10; i++) this.tone(1318 + (i % 3) * 200, 0.5, 'sine', 0.05, 0.5 + i * 0.11, true);
    this.play('collide', 0.8);
  }
  lose(): void { this.tone(146.8, 0.5, 'sine', 0.22, 0, true, 0.5); this.tone(155.6, 0.5, 'triangle', 0.08, 0.02, true, 0.5); }
  doom(): void { this.tone(55, 1.4, 'sawtooth', 0.12, 0, true, 0.6); this.noise(0.8, 0.3, 140, 0, 0.7); }
  heartbeat(): void { this.tone(60, 0.12, 'sine', 0.4); this.tone(55, 0.14, 'sine', 0.32, 0.18); }
  coin(): void { this.tone(2093, 0.12, 'square', 0.04); this.tone(2637, 0.2, 'square', 0.03, 0.06); }
  whoosh(): void { this.noise(0.35, 0.18, 800, 0, 0.5); }
  soul(): void { [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.08, i * 0.12, true)); }

  // ---- generative ambient score: slow minor organ chords, a far bell, candle crackle ----
  private startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    const chords = [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64], [57, 60, 64, 67], [48, 52, 55, 60], [50, 53, 57, 60], [52, 55, 59, 64]];
    let step = 0;
    const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const play = () => {
      if (!this.ctx || !this.musicOn) { this.musicTimer = 0; return; }
      const c = this.ctx, t = c.currentTime + 0.05, dur = 7.5;
      const chord = chords[step % chords.length];
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(900, t + dur / 2); lp.frequency.linearRampToValueAtTime(400, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 2.5); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
      lp.connect(g); g.connect(this.musicBus); g.connect(this.reverb);
      for (const m of [chord[0] - 12, ...chord]) for (const det of [-6, 6]) {
        const o = c.createOscillator(); o.type = m < chord[0] ? 'sine' : 'sawtooth'; o.frequency.value = midi(m - 12); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + dur + 2);
      }
      // a distant bell
      if (step % 2 === 0) {
        const note = chord[Math.floor(Math.random() * chord.length)] + 12;
        for (const [mul, v] of [[1, 0.05], [2.76, 0.02], [5.4, 0.01]] as const) {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = midi(note) * mul;
          const bg = c.createGain(); const bt = t + 1.5 + Math.random() * 3;
          bg.gain.setValueAtTime(0, bt); bg.gain.linearRampToValueAtTime(v, bt + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, bt + 4);
          o.connect(bg); bg.connect(this.musicBus); bg.connect(this.reverb); o.start(bt); o.stop(bt + 4.2);
        }
      }
      step++;
      this.musicTimer = window.setTimeout(play, dur * 1000);
    };
    play();
  }
}
export const sfx = new Audio();
