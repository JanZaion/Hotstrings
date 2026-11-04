import type { LiveClip } from './sharedTypes';

const detailClip = new LiveAPI() as unknown as LiveClip;

function getDetailClip() {
  detailClip.path = 'live_set view detail_clip';
  if (!detailClip.id || detailClip.id == 0) {
    return null;
  }
  return detailClip;
}

export function cliploop() {
  const clip = getDetailClip();
  if (!clip) {
    return;
  }
  clip.set('looping', 1);
}
