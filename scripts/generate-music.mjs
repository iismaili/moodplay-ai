import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 22050;
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'music');

function midi(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function envelope(time, duration) {
  const attack = 0.02;
  const release = 0.06;
  if (time < 0 || time > duration) return 0;
  if (time < attack) return time / attack;
  if (time > duration - release) return Math.max(0, (duration - time) / release);
  return 1;
}

function tone(frequency, duration, brightness) {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const fundamental = Math.sin(2 * Math.PI * frequency * time);
    const second = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.28;
    const third = Math.sin(2 * Math.PI * frequency * 3 * time) * brightness;
    samples[index] = (fundamental + second + third) * envelope(time, duration) * 0.32;
  }
  return samples;
}

function sequence(notes, gap = 0.03) {
  const gapLength = Math.floor(sampleRate * gap);
  const parts = notes.map((note) => tone(midi(note.midi), note.duration, note.brightness));
  const total = parts.reduce((sum, part) => sum + part.length + gapLength, 0);
  const mixed = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    mixed.set(part, offset);
    offset += part.length + gapLength;
  }
  return mixed;
}

function writeWav(fileName, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2);
  }
  writeFileSync(join(root, fileName), buffer);
}

const bright = 0.12;
const soft = 0.04;
mkdirSync(root, { recursive: true });

writeWav(
  'happy-oyun-havasi.wav',
  sequence([
    [72, 0.16],
    [76, 0.16],
    [79, 0.16],
    [84, 0.22],
    [79, 0.16],
    [76, 0.16],
    [81, 0.16],
    [84, 0.28],
  ].map(([midiNote, duration]) => ({ midi: midiNote, duration, brightness: bright }))),
);

writeWav(
  'happy-parilti.wav',
  sequence([
    [76, 0.14],
    [79, 0.14],
    [84, 0.14],
    [88, 0.24],
    [84, 0.14],
    [81, 0.14],
    [79, 0.14],
    [76, 0.28],
  ].map(([midiNote, duration]) => ({ midi: midiNote, duration, brightness: bright }))),
);

writeWav(
  'brow-neseli.wav',
  sequence([
    [65, 0.12],
    [69, 0.12],
    [72, 0.18],
    [67, 0.12],
    [72, 0.12],
    [76, 0.22],
    [74, 0.12],
    [72, 0.24],
  ].map(([midiNote, duration]) => ({ midi: midiNote, duration, brightness: bright }))),
);

writeWav(
  'surprised-surpriz.wav',
  sequence([
    [79, 0.08],
    [86, 0.18],
    [84, 0.08],
    [91, 0.2],
    [88, 0.1],
    [84, 0.1],
    [79, 0.22],
  ].map(([midiNote, duration]) => ({ midi: midiNote, duration, brightness: bright }))),
);

writeWav(
  'neutral-hafif.wav',
  sequence(
    [
      [60, 0.28],
      [64, 0.28],
      [67, 0.28],
      [64, 0.28],
      [62, 0.28],
      [65, 0.28],
      [69, 0.36],
    ].map(([midiNote, duration]) => ({ midi: midiNote, duration, brightness: soft })),
    0.05,
  ),
);
