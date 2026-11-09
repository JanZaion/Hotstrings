import { BINDINGS } from './bindings';
import { FIXED_CHORDS, NATIVE_DEVICES } from './constants';

export type ListItem = {
  key: string;
  desc: string;
};

export type ListSection = {
  title: string;
  items: ListItem[];
};

const HOTKEY_DESC: Record<string, string> = {
  '`': 'Loop the open clip',
  '^Space': 'Play or stop from the start marker',
  '^!Left': 'Nudge the selected device left',
  '^!Right': 'Nudge the selected device right',
};

const HOTSTRING_DESC: Record<string, string> = {
  chord: 'Diatonic triad from the clip scale',
  chord7: 'Diatonic 7th from the clip scale',
  chord9: 'Diatonic 9th from the clip scale',
  chord11: 'Diatonic 11th from the clip scale',
  chord13: 'Diatonic 13th from the clip scale',
  bass1: 'Bass on each beat',
  bass2: 'Eighth-note bass',
  bass3: 'Triplet bass',
  bass4: 'Offbeat 16th bass',
  bass5: 'Syncopated bass pattern',
  bass6: 'Second syncopated bass pattern',
  lead: 'Voice-lead selected chords',
  up: 'Arpeggiate selection up',
  down: 'Arpeggiate selection down',
  dearp: 'Collapse an arp into block chords',
  doub: 'Double selected note lengths',
  half: 'Halve selected note lengths',
  fit: 'Fit selected notes to the clip',
  inv: 'Invert selected notes',
  rev: 'Reverse selected notes',
  first: 'Select the first chain',
  last: 'Select the last chain',
  col: 'Collapse devices in the chain',
  exp: 'Expand devices in the chain',
  sol: 'Solo the selected effect',
  unsol: 'Unsolo chain effects',
  loc: 'Drop a locator, loc name to label it',
  clip: 'New MIDI clip, clip n for n bars',
  '=': 'Raise track volume, = n for track n',
  '-': 'Lower track volume, - n for track n',
  headroom: 'Drop volume on all regular tracks',
  heat: 'Raise volume on all regular tracks',
  low: 'EQ Eight lowpass',
  high: 'EQ Eight highpass',
  notch: 'EQ Eight notch',
  band: 'EQ Eight bandpass',
  eq: 'EQ Eight',
};

const INSTRUMENT_KEYS = [
  'ana',
  'colis',
  'dri',
  'drumr',
  'elec',
  'exti',
  'imp',
  'irack',
  'meld',
  'op',
  'samp',
  'simp',
  'ten',
  'wav',
] as const;

const MIDI_KEYS = ['arp', 'cc', 'chordmidi', 'mrack', 'nlen', 'pit', 'rand', 'sca', 'vel'] as const;

const CHORD_KEYS = [
  'chord',
  'chord7',
  'chord9',
  'chord11',
  'chord13',
  ...Object.keys(FIXED_CHORDS),
  'lead',
  'up',
  'down',
  'dearp',
] as const;

const BASS_KEYS = ['bass1', 'bass2', 'bass3', 'bass4', 'bass5', 'bass6'] as const;
const CLIP_KEYS = ['doub', 'half', 'fit', 'inv', 'rev'] as const;
const RACK_KEYS = ['first', 'last', 'col', 'exp', 'sol', 'unsol'] as const;
const MIXER_KEYS = ['=', '-', 'headroom', 'heat'] as const;
const ARRANGE_KEYS = ['loc', 'clip'] as const;
const EQ_KEYS = ['eq', 'low', 'high', 'notch', 'band'] as const;

function displayHotkey(key: string) {
  return key.replaceAll('^', 'Ctrl+').replaceAll('!', 'Alt+').replaceAll('#', 'Win+');
}

function itemDesc(key: string, bind: string) {
  if (HOTSTRING_DESC[key]) {
    return HOTSTRING_DESC[key];
  }
  if (key in NATIVE_DEVICES) {
    return NATIVE_DEVICES[key as keyof typeof NATIVE_DEVICES];
  }
  if (bind in NATIVE_DEVICES) {
    return NATIVE_DEVICES[bind as keyof typeof NATIVE_DEVICES];
  }
  return bind;
}

function itemsFor(keys: readonly string[]) {
  const byKey = new Map(BINDINGS.hotstrings.map(bind => [bind.key, bind]));
  const items: ListItem[] = [];
  for (const key of keys) {
    const bind = byKey.get(key);
    if (!bind) {
      continue;
    }
    items.push({ key, desc: itemDesc(key, bind.bind) });
  }
  return items;
}

export function hotstringSections() {
  const used = new Set<string>();
  const sections: ListSection[] = [];

  function add(title: string, items: ListItem[]) {
    if (items.length === 0) {
      return;
    }
    sections.push({ title, items });
    for (const item of items) {
      used.add(item.key);
    }
  }

  add(
    'Hotkeys',
    BINDINGS.hotkeys.map(bind => ({
      key: displayHotkey(bind.key),
      desc: HOTKEY_DESC[bind.key] ?? bind.bind,
    }))
  );
  add('Chords', itemsFor(CHORD_KEYS));
  add('Bass', itemsFor(BASS_KEYS));
  add('Clip', itemsFor(CLIP_KEYS));
  add('Arrangement', itemsFor(ARRANGE_KEYS));
  add('Mixer', itemsFor(MIXER_KEYS));
  add('Rack', itemsFor(RACK_KEYS));
  add('EQ', itemsFor(EQ_KEYS));
  add('Instruments', itemsFor(INSTRUMENT_KEYS));
  const midi = new Set<string>(MIDI_KEYS);
  const instruments = new Set<string>(INSTRUMENT_KEYS);
  add(
    'Audio effects',
    itemsFor(Object.keys(NATIVE_DEVICES).filter(key => !instruments.has(key) && !midi.has(key)))
  );
  add('MIDI effects', itemsFor(MIDI_KEYS));

  const leftover = BINDINGS.hotstrings
    .filter(bind => !used.has(bind.key))
    .map(bind => ({ key: bind.key, desc: itemDesc(bind.key, bind.bind) }));
  add('Other', leftover);
  return sections;
}
