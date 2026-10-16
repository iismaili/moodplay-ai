import type { MusicTrack } from '../types/index.ts';

export const TRACK_LICENSE = 'Proje içi kullanım.';

export const DEFAULT_TRACKS: MusicTrack[] = [
  {
    id: 'happy-erik-dali',
    title: 'Erik Dalı',
    src: '/music/erikdali.mp3',
    expression: 'happy',
    license: TRACK_LICENSE,
  },
  {
    id: 'brow-cendere',
    title: 'Cendere',
    src: '/music/cendere.mp3',
    expression: 'brow_furrow',
    license: TRACK_LICENSE,
  },
  {
    id: 'disgust-ajdar-nane',
    title: 'Ajdar - Nane Nane',
    src: '/music/ajdarnane.mp3',
    expression: 'disgust',
    license: TRACK_LICENSE,
  },
  {
    id: 'sad-uzgun',
    title: 'Üzgün',
    src: '/music/uzgun.mp3',
    expression: 'sad',
    license: TRACK_LICENSE,
  },
  {
    id: 'neutral-sakin',
    title: 'Sakin',
    src: '/music/sakin.mp3',
    expression: 'neutral',
    license: TRACK_LICENSE,
  },
  {
    id: 'surprised-erik-dali',
    title: 'Erik Dalı',
    src: '/music/erikdali.mp3',
    expression: 'surprised',
    license: TRACK_LICENSE,
  },
];
