const LIST_PATCHER = 'Hotstrings';

function findList() {
  for (let obj: Maxobj | null = patcher.firstobject; obj; obj = obj.nextobject as Maxobj | null) {
    const sub = obj.subpatcher();
    if (sub && sub.name === LIST_PATCHER) {
      return sub;
    }
  }
  return null;
}

export function openList() {
  const sub = findList();
  if (!sub) {
    post(`openList: no [${LIST_PATCHER}] subpatcher\n`);
    return;
  }
  sub.message('front');
}

export function closeList() {
  const sub = findList();
  if (sub) {
    sub.wind.visible = false;
  }
}
