const LIST_PATCHER = 'Hotstrings';

export function openList() {
  for (let obj: Maxobj | null = patcher.firstobject; obj; obj = obj.nextobject as Maxobj | null) {
    const sub = obj.subpatcher();
    if (sub && sub.name === LIST_PATCHER) {
      sub.message('front');
      return;
    }
  }
  post(`openList: no [${LIST_PATCHER}] subpatcher\n`);
}
