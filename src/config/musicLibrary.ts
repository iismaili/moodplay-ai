import type { MusicTrack } from '../types/index.ts';

export const TRACK_LICENSE =
  'Bu depoda üretilmiş kısa sentetik döngü. Telifli eser değildir; proje içi kullanım için serbesttir.';

export const DEFAULT_TRACKS: MusicTrack[] = [
  {
    id: 'happy-oyun-havasi',
    title: 'Oyun Havası',
    src: '/music/happy-oyun-havasi.wav',
    expression: 'happy',
    license: TRACK_LICENSE,
  },
  {
    id: 'happy-parilti',
    title: 'Parıltı',
    src: '/music/happy-parilti.wav',
    expression: 'happy',
    license: TRACK_LICENSE,
  },
  {
    id: 'brow-neseli',
    title: 'Neşeyi Yükselt',
    src: '/music/brow-neseli.wav',
    expression: 'brow_furrow',
    license: TRACK_LICENSE,
  },
  {
    id: 'surprised-surpriz',
    title: 'Sürpriz Efekti',
    src: '/music/surprised-surpriz.wav',
    expression: 'surprised',
    license: TRACK_LICENSE,
  },
  {
    id: 'neutral-hafif',
    title: 'Hafif Hareket',
    src: '/music/neutral-hafif.wav',
    expression: 'neutral',
    license: TRACK_LICENSE,
  },
];
