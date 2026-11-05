import { FIXED_CHORDS } from './constants';

export type Bind = {
  key: string;
  bind: string;
  value?: number;
  keys?: string;
  str?: boolean;
  int?: boolean;
};

export type Bindings = {
  hotkeys: Bind[];
  hotstrings: Bind[];
};

export type MidiNote = {
  note_id?: number;
  pitch: number;
  start_time: number;
  duration?: number;
  velocity?: number;
  mute?: number;
  probability?: number;
  velocity_deviation?: number;
  release_velocity?: number;
};

export type NoteSpec = {
  pitch: number;
  start_time: number;
  duration: number;
  velocity?: number;
  mute?: number;
  probability?: number;
  velocity_deviation?: number;
  release_velocity?: number;
};

export type LiveClip = {
  id: number;
  path: string;
  get: (property: string) => unknown;
  set: (property: string, ...args: unknown[]) => unknown;
  call: (func: string, ...args: unknown[]) => unknown;
  getcount: (child: string) => number;
};

export type ClipScale = {
  tonicPc: number;
  intervals: readonly number[];
};

export type FixedQuality = keyof typeof FIXED_CHORDS;
