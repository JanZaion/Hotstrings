export const FIXED_CHORDS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  aug: [0, 4, 8],
  dim: [0, 3, 6],
  pow: [0, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  aug7: [0, 4, 8, 10],
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  dim9: [0, 3, 6, 9, 14],
  aug9: [0, 4, 8, 10, 14],
} as const;

export const MAJOR_FAMILY = {
  3: FIXED_CHORDS.major,
  4: FIXED_CHORDS.major7,
  5: FIXED_CHORDS.major9,
} as const;

export const GRID_BEATS: Record<number, number> = {
  0: 1,
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
  7: 0.5,
  8: 0.25,
  9: 0.125,
};

const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LOCRIAN = [0, 1, 3, 5, 6, 8, 10];
const WHOLE_TONE = [0, 2, 4, 6, 8, 10];
const HALF_WHOLE = [0, 1, 3, 4, 6, 7, 9, 10];
const WHOLE_HALF = [0, 2, 3, 5, 6, 8, 9, 11];
const MINOR_BLUES = [0, 3, 5, 6, 7, 10];
const MINOR_PENT = [0, 3, 5, 7, 10];
const MAJOR_PENT = [0, 2, 4, 7, 9];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
const HARMONIC_MAJOR = [0, 2, 4, 5, 7, 8, 11];
const DORIAN_SHARP4 = [0, 2, 3, 6, 7, 9, 10];
const PHRYGIAN_DOM = [0, 1, 4, 5, 7, 8, 10];
const MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];
const LYDIAN_AUG = [0, 2, 4, 6, 8, 9, 11];
const LYDIAN_DOM = [0, 2, 4, 6, 7, 9, 10];
const ALTERED = [0, 1, 3, 4, 6, 8, 10];
const EIGHT_TONE_SPANISH = [0, 1, 3, 4, 5, 6, 8, 10];
const SPANISH_HEPTATONIC = [0, 1, 3, 4, 5, 8, 10];
const BHAIRAV = [0, 1, 4, 5, 7, 8, 11];
const HUNGARIAN_MINOR = [0, 2, 3, 6, 7, 8, 11];
const HIRAJOSHI = [0, 2, 3, 7, 8];
const IN_SEN = [0, 1, 5, 7, 10];
const IWATO = [0, 1, 5, 6, 10];
const KUMOI = [0, 2, 3, 7, 9];
const PELOG_SELISIR = [0, 1, 3, 7, 8];
const PELOG_TEMBUNG = [0, 2, 3, 7, 10];
const MESSIAEN_3 = [0, 2, 3, 4, 6, 7, 8, 10, 11];
const MESSIAEN_4 = [0, 1, 2, 5, 6, 7, 8, 11];
const MESSIAEN_5 = [0, 1, 5, 6, 7, 11];
const MESSIAEN_6 = [0, 2, 4, 5, 6, 8, 10, 11];
const MESSIAEN_7 = [0, 1, 2, 3, 5, 6, 7, 8, 9, 11];

export const SCALE_INTERVALS: Record<string, readonly number[]> = {
  major: IONIAN,
  minor: AEOLIAN,
  dorian: DORIAN,
  mixolydian: MIXOLYDIAN,
  lydian: LYDIAN,
  phrygian: PHRYGIAN,
  locrian: LOCRIAN,
  'whole tone': WHOLE_TONE,
  'half-whole dim.': HALF_WHOLE,
  'half-whole diminished': HALF_WHOLE,
  'whole-half dim.': WHOLE_HALF,
  'whole-half diminished': WHOLE_HALF,
  'whole-half': WHOLE_HALF,
  'minor blues': MINOR_BLUES,
  'minor pentatonic': MINOR_PENT,
  'major pentatonic': MAJOR_PENT,
  'harmonic minor': HARMONIC_MINOR,
  'harmonic major': HARMONIC_MAJOR,
  'dorian #4': DORIAN_SHARP4,
  'phrygian dominant': PHRYGIAN_DOM,
  'melodic minor': MELODIC_MINOR,
  'lydian augmented': LYDIAN_AUG,
  'lydian dominant': LYDIAN_DOM,
  'super locrian': ALTERED,
  altered: ALTERED,
  '8-tone spanish': EIGHT_TONE_SPANISH,
  'spanish heptatonic': SPANISH_HEPTATONIC,
  bhairav: BHAIRAV,
  'double harmonic major': BHAIRAV,
  'hungarian minor': HUNGARIAN_MINOR,
  hirajoshi: HIRAJOSHI,
  'in-sen': IN_SEN,
  iwato: IWATO,
  kumoi: KUMOI,
  'flat three pentatonic': KUMOI,
  'pelog selisir': PELOG_SELISIR,
  pelog: PELOG_SELISIR,
  'pelog tembung': PELOG_TEMBUNG,
  'messiaen 3': MESSIAEN_3,
  "messiaen's mode #3": MESSIAEN_3,
  'messiaen 4': MESSIAEN_4,
  "messiaen's mode #4": MESSIAEN_4,
  'messiaen 5': MESSIAEN_5,
  "messiaen's mode #5": MESSIAEN_5,
  'messiaen 6': MESSIAEN_6,
  "messiaen's mode #6": MESSIAEN_6,
  'messiaen 7': MESSIAEN_7,
  "messiaen's mode #7": MESSIAEN_7,
};

export const SCALE_ALIASES: Record<string, string> = {
  diminished: 'half-whole diminished',
  hirojoshi: 'hirajoshi',
  spanish: 'phrygian dominant',
  'minor gypsy': 'hungarian minor',
};
