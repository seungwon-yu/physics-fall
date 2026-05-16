// Lightweight WebAudio synth — no asset files needed.
let ctx: AudioContext | null = null;
let muted = false;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.04;
}
export function isMuted() { return muted; }

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, attack = 0.005) {
  if (muted) return;
  const c = getCtx(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function playDrop() { tone(220, 0.12, "sine", 0.08); }
export function playBounce(strength = 1) {
  tone(120 + Math.random() * 40, 0.06, "sine", Math.min(0.06, 0.02 * strength));
}
export function playMerge(level: number) {
  const base = 300 + level * 60;
  tone(base, 0.18, "triangle", 0.18);
  setTimeout(() => tone(base * 1.5, 0.16, "sine", 0.12), 40);
}
export function playCombo(n: number) {
  const base = 500 + n * 80;
  tone(base, 0.12, "square", 0.08);
  setTimeout(() => tone(base * 1.25, 0.14, "triangle", 0.1), 60);
}
export function playGameOver() {
  [400, 320, 240, 160].forEach((f, i) => setTimeout(() => tone(f, 0.25, "sawtooth", 0.12), i * 120));
}

// Cozy ambient loop: gentle arpeggio every 4s.
export function startMusic() {
  const c = getCtx(); if (!c) return;
  if (musicTimer != null) return;
  musicGain = c.createGain();
  musicGain.gain.value = muted ? 0 : 0.04;
  musicGain.connect(c.destination);
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  let i = 0;
  const tick = () => {
    if (!musicGain) return;
    const c2 = getCtx(); if (!c2) return;
    const o = c2.createOscillator();
    const g = c2.createGain();
    o.type = "sine";
    o.frequency.value = notes[i % notes.length];
    g.gain.setValueAtTime(0, c2.currentTime);
    g.gain.linearRampToValueAtTime(1, c2.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 1.2);
    o.connect(g).connect(musicGain);
    o.start();
    o.stop(c2.currentTime + 1.3);
    i++;
  };
  musicTimer = window.setInterval(tick, 650);
}
export function stopMusic() {
  if (musicTimer != null) { clearInterval(musicTimer); musicTimer = null; }
  musicGain?.disconnect();
  musicGain = null;
}

export function resume() { getCtx()?.resume(); }
