import { cliploop, loc } from './arrangementView';
import { BINDINGS } from './bindings';
import {
  aug,
  aug7,
  aug9,
  chord,
  chord7,
  chord9,
  dim,
  dim7,
  dim9,
  down,
  lead,
  major,
  major7,
  major9,
  minor,
  minor7,
  minor9,
  pow,
  sus2,
  sus4,
  up,
} from './chords';
import { doub, fit, half, inv, rev } from './midiClip';

autowatch = 1;
inlets = 1;
outlets = 1;

function loadbang() {
  sendBinds();
}

function bang() {
  sendBinds();
}

function sendBinds() {
  outlet(0, JSON.stringify(BINDINGS));
}

void loadbang;
void bang;
void cliploop;
void loc;
void chord;
void chord7;
void chord9;
void major;
void minor;
void sus2;
void sus4;
void aug;
void dim;
void pow;
void major7;
void minor7;
void dim7;
void aug7;
void major9;
void minor9;
void dim9;
void aug9;
void lead;
void up;
void down;
void doub;
void half;
void fit;
void inv;
void rev;
