/**
 * Tone.js generative Dreamtime piano — runs during weekends per spec.
 * Authorized by: Cinematic UI spec Part V.3.
 */

import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;
let reverb: Tone.Reverb | null = null;
let volume: Tone.Volume | null = null;
let loopId: number | null = null;
let scheduled: number[] = [];

const PROG: Array<[string, ...string[]]> = [
  ['C4', 'E4', 'G4', 'B4'],  // Cmaj7
  ['F4', 'A4', 'C5', 'E5'],  // Fmaj7
  ['G4', 'B4', 'D5', 'F5'],  // G7
  ['A4', 'C5', 'E5', 'G5'],  // Am7
];

export async function startDreamtime(profitable = true): Promise<void> {
  if (synth) return;
  await Tone.start();
  volume = new Tone.Volume(-24).toDestination();
  reverb = new Tone.Reverb({ decay: 4, wet: 0.6 });
  await reverb.generate();
  reverb.connect(volume);
  synth = new Tone.PolySynth(Tone.Synth, {
    envelope: { attack: 0.04, decay: 0.2, sustain: 0.3, release: 1.5 },
    oscillator: { type: 'triangle' },
  });
  synth.connect(reverb);
  synth.volume.value = -8;

  // Simple arpeggiator looping through the 4 chords.
  let chordIdx = 0;
  let step = 0;
  loopId = window.setInterval(() => {
    if (!synth) return;
    const chord = PROG[chordIdx];
    const note = chord[step % chord.length];
    const dest = profitable ? note : note.replace(/\d/, m => String(Number(m) - 1));
    synth.triggerAttackRelease(dest, '2n', undefined, 0.4 + Math.random() * 0.3);
    step++;
    if (step % chord.length === 0) chordIdx = (chordIdx + 1) % PROG.length;
  }, 900);
}

export function stopDreamtime(): void {
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
  synth?.releaseAll();
  synth?.dispose();
  reverb?.dispose();
  volume?.dispose();
  synth = null;
  reverb = null;
  volume = null;
}

export function isDreamtime(now: Date = new Date()): boolean {
  const dow = now.getDay();
  return dow === 0 || dow === 6; // Saturday (6) or Sunday (0)
}
