import { cliploop, loc } from './actions/arrangementView';
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
} from './actions/chords';
import {
  af,
  amp,
  ana,
  apan,
  arack,
  arp,
  ash,
  band,
  beat,
  cab,
  cc,
  cheq,
  chordmidi,
  colis,
  comp,
  corp,
  del,
  dri,
  drumb,
  drumr,
  echo,
  elec,
  ens,
  eq3,
  eq8,
  eros,
  exta,
  exti,
  fdel,
  gate,
  glue,
  grain,
  high,
  hyb,
  imp,
  irack,
  lim,
  loop,
  low,
  mbd,
  meld,
  mrack,
  nlen,
  notch,
  od,
  op,
  ped,
  phas,
  pit,
  rand,
  red,
  reso,
  roar,
  samp,
  sat,
  sca,
  shif,
  simp,
  spec,
  sres,
  stime,
  ten,
  tube,
  tun,
  ut,
  vel,
  verb,
  vin,
  voc,
  wav,
} from './actions/devices';
import { doub, fit, half, inv, rev } from './actions/midiClip';
import { volup, voldown } from './actions/mixer';
import { chainLeft, chainRight, col, exp, first, last, sol, unsol } from './actions/rack';

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
void volup;
void voldown;
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
void first;
void last;
void chainLeft;
void chainRight;
void col;
void exp;
void sol;
void unsol;
void ana;
void colis;
void dri;
void drumr;
void elec;
void exti;
void imp;
void irack;
void meld;
void op;
void samp;
void simp;
void ten;
void wav;
void amp;
void arack;
void af;
void apan;
void ash;
void beat;
void cab;
void cheq;
void ens;
void comp;
void corp;
void del;
void drumb;
void tube;
void echo;
void eq8;
void low;
void high;
void notch;
void band;
void eq3;
void eros;
void exta;
void fdel;
void gate;
void glue;
void grain;
void hyb;
void lim;
void loop;
void mbd;
void od;
void ped;
void phas;
void red;
void reso;
void verb;
void roar;
void sat;
void shif;
void sres;
void stime;
void spec;
void tun;
void ut;
void vin;
void voc;
void arp;
void cc;
void chordmidi;
void mrack;
void nlen;
void pit;
void rand;
void sca;
void vel;
