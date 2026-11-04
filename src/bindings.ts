import { FIXED_CHORDS } from './constants';
import type { Bindings } from './sharedTypes';

export const BINDINGS: Bindings = {
  hotkeys: [{ key: '`', bind: 'cliploop', keys: '^j' }],
  hotstrings: [
    { key: 'chord', bind: 'chord' },
    { key: 'chord7', bind: 'chord7' },
    { key: 'chord9', bind: 'chord9' },
    ...Object.keys(FIXED_CHORDS).map(key => ({ key, bind: key })),
  ],
};
