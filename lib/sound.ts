"use client";

import * as Tone from "tone";

export type SoundName = "select" | "correct" | "incorrect" | "finish" | "tick";

const STORAGE_KEY = "quiz-sound-muted";

let synth: Tone.PolySynth<Tone.Synth> | null = null;
let muted = false;
let initialized = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

/** useSyncExternalStore wiring: subscribe to mute-preference changes. */
export function subscribeMute(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** useSyncExternalStore wiring: current client value (lazily restored). */
export function getMutedSnapshot(): boolean {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    muted = window.localStorage.getItem(STORAGE_KEY) === "true";
  }
  return muted;
}

/** useSyncExternalStore wiring: server snapshot (unmuted default). */
export function getMutedServerSnapshot(): boolean {
  return false;
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
    emitChange();
  }
}

async function ensureSynth() {
  // Tone.start() must run after a user gesture; it resolves immediately
  // once the AudioContext is running.
  await Tone.start();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.15, release: 0.25 },
    }).toDestination();
    synth.volume.value = -14;
  }
}

const CHORDS: Record<SoundName, { notes: string[]; duration: string; gap?: number }> = {
  // Soft UI click
  select: { notes: ["C5"], duration: "8n" },
  // Rising major arpeggio — reward
  correct: { notes: ["C5", "E5", "G5"], duration: "8n", gap: 0.15 },
  // Dissonant minor second — gentle "no"
  incorrect: { notes: ["E3", "F3"], duration: "8n" },
  // Low tick for low-time warning
  tick: { notes: ["A4"], duration: "16n" },
  // Short fanfare
  finish: { notes: ["G4", "C5", "E5", "G5"], duration: "8n", gap: 0.12 },
};

export async function playSound(name: SoundName) {
  if (muted) return;
  try {
    await ensureSynth();
    if (!synth) return;
    const chord = CHORDS[name];
    const now = Tone.now();
    if (chord.gap !== undefined) {
      chord.notes.forEach((note, i) => {
        synth!.triggerAttackRelease(note, chord.duration, now + i * chord.gap!);
      });
    } else {
      synth.triggerAttackRelease(chord.notes, chord.duration, now);
    }
  } catch {
    // Audio can fail on some browsers/devices — quiz must never break.
  }
}
