import { FIXED_CHORDS } from './constants';
import type { Bindings } from './sharedTypes';

export const BINDINGS: Bindings = {
  hotkeys: [{ key: '`', bind: 'cliploop', keys: '^j' }],
  hotstrings: [
    { key: 'chord', bind: 'chord' },
    { key: 'chord7', bind: 'chord7' },
    { key: 'chord9', bind: 'chord9' },
    ...Object.keys(FIXED_CHORDS).map(key => ({ key, bind: key })),
    { key: 'lead', bind: 'lead' },
    { key: 'up', bind: 'up' },
    { key: 'down', bind: 'down' },
    { key: 'doub', bind: 'doub' },
    { key: 'half', bind: 'half' },
    { key: 'fit', bind: 'fit' },
    { key: 'inv', bind: 'inv' },
    { key: 'rev', bind: 'rev' },
    { key: 'loc', bind: 'loc', str: true },
  ],
};
