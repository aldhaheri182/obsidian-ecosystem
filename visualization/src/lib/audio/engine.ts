/**
 * Audio engine — ambient drones + event SFX.
 * Authorized by: Cinematic UI spec Part V.
 *
 * Uses raw Web Audio API (no audio files). All sounds generated at runtime.
 * Audio context is created lazily (browsers require a user gesture).
 */

type Drone = 'orbit' | 'nexus' | 'city' | 'building' | 'agent' | 'none';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneNodes: AudioNode[] = [];
let currentDrone: Drone = 'none';

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Must be called after a user gesture (click, key). */
export function primeAudio(): void {
  ensureCtx();
}

export function setMasterVolume(v: number): void {
  if (!masterGain) return;
  masterGain.gain.value = Math.max(0, Math.min(1, v));
}

/** Switch ambient drone smoothly. */
export function setDrone(kind: Drone): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (kind === currentDrone) return;
  // Fade out existing
  for (const n of droneNodes) {
    try {
      (n as AudioScheduledSourceNode).stop(c.currentTime + 1);
    } catch {
      /* ignore */
    }
  }
  droneNodes = [];
  currentDrone = kind;
  if (kind === 'none') return;

  const baseFreq = kind === 'orbit' ? 65.41
    : kind === 'nexus' ? 82.41
    : kind === 'city' ? 98.00
    : kind === 'building' ? 110.00
    : 130.81;

  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = kind === 'city' ? 'triangle' : 'sine';
  o2.type = kind === 'city' ? 'triangle' : 'sine';
  o1.frequency.value = baseFreq;
  o2.frequency.value = baseFreq * 1.003; // slight detune

  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 1);

  o1.connect(gain);
  o2.connect(gain);
  gain.connect(masterGain);

  o1.start();
  o2.start();
  droneNodes.push(o1, o2);
}

/** Fire a transient SFX. */
export function playSfx(kind:
  | 'packet' | 'advancement' | 'override' | 'birth'
  | 'retirement' | 'owner' | 'market-open' | 'market-close'
  | 'emergency'): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const now = c.currentTime;
  switch (kind) {
    case 'packet': {
      const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.4;
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.1, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      src.connect(bp).connect(g).connect(masterGain);
      src.start(now);
      break;
    }
    case 'advancement': {
      [523, 659, 784].forEach((freq, i) => {
        const o = c.createOscillator();
        o.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);
        o.connect(g).connect(masterGain!);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.14);
      });
      break;
    }
    case 'override': {
      const bass = c.createOscillator();
      bass.frequency.value = 80;
      const bg = c.createGain();
      bg.gain.setValueAtTime(0.35, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      bass.connect(bg).connect(masterGain);
      bass.start(now);
      bass.stop(now + 0.2);

      const ping = c.createOscillator();
      ping.frequency.value = 1200;
      const pg = c.createGain();
      pg.gain.setValueAtTime(0.1, now);
      pg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      ping.connect(pg).connect(masterGain);
      ping.start(now);
      ping.stop(now + 0.08);
      break;
    }
    case 'birth': {
      const o = c.createOscillator();
      o.frequency.value = 1047;
      o.type = 'sine';
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.15, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o.connect(g).connect(masterGain);
      o.start(now);
      o.stop(now + 0.22);
      break;
    }
    case 'retirement': {
      const o = c.createOscillator();
      o.frequency.value = 262;
      o.type = 'sine';
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.2, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      o.connect(g).connect(masterGain);
      o.start(now);
      o.stop(now + 0.85);
      break;
    }
    case 'owner': {
      [330, 440].forEach((freq, i) => {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1);
        o.connect(g).connect(masterGain!);
        o.start(now + i * 0.08);
        o.stop(now + i * 0.08 + 0.12);
      });
      break;
    }
    case 'market-open':
    case 'market-close': {
      const o = c.createOscillator();
      o.frequency.value = kind === 'market-open' ? 880 : 587;
      const g = c.createGain();
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'market-open' ? 0.3 : 0.5));
      o.connect(g).connect(masterGain);
      o.start(now);
      o.stop(now + 0.6);
      break;
    }
    case 'emergency': {
      // Silence ambient, then deep sustained tone.
      if (masterGain) {
        masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        masterGain.gain.linearRampToValueAtTime(0.25, now + 2);
      }
      const o = c.createOscillator();
      o.frequency.value = 55;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now + 2);
      g.gain.linearRampToValueAtTime(0.4, now + 2.3);
      // Sustained, caller must stop via shutdown.
      o.connect(g).connect(masterGain!);
      o.start(now + 2);
      break;
    }
  }
}
