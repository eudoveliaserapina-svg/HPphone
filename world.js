/* 世界时钟:游戏里的日期和时间,不再读手机的真实时钟。
   时间只保存为“从起点经过的游戏分钟数”,日期、星期都由它推算。 */
const World = (() => {
  const DAY = 1440;
  let last = null, savedAt = 0, timer = null, paused = false;

  /* 没有存档时按角色卡的年级定起点:一年级 = 1991 年 9 月 1 日(和哈利同一年入学) */
  function init() {
    if (S.world && S.world.year0) { if (!S.world.dayMin) S.world.dayMin = 40; return; }
    const g = Math.min(7, Math.max(1, +(S.card && S.card.grade) || 1));
    S.world = { year0: 1990 + g, min: 0, dayMin: 40 };
    S.sortedAt = 0; S.mailAt = {};          /* 旧存档里按真实时间记的冷却全部作废 */
    Store.save(S);
  }
  const baseMs = () => Date.UTC(S.world.year0, 8, 1, 7, 0, 0);
  /* 把“游戏分钟数”变成一个 Date,它的年月日时分(本地字段)就是游戏里的时间 */
  function at(min) {
    init(); const d = new Date(baseMs() + Math.floor(min) * 60000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
  }
  const min = () => { init(); return S.world.min; };
  const now = () => at(min());
  const label = () => { const d = now(); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function advance(m) { init(); S.world.min += m; Store.save(S); }
  function sleep() {            /* 睡到第二天早上 7:00 */
    const d = now(); let add = 7 * 60 - (d.getHours() * 60 + d.getMinutes()); if (add <= 0) add += DAY; advance(add); return add;
  }
  function setDayMin(n) { init(); S.world.dayMin = Math.max(5, +n || 40); Store.save(S); }
  function start() {
    if (timer) return; last = performance.now();
    timer = setInterval(() => {
      const t = performance.now();
      /* 只在游戏开始后、页面可见、没有手动暂停时走时间 */
      if (!document.hidden && !paused && S.card && S.card.name && S.house) {
        const dt = Math.min(3, (t - last) / 1000);
        init(); S.world.min += dt * (DAY / (S.world.dayMin * 60));
        if (t - savedAt > 10000) { Store.save(S); savedAt = t; }
      }
      last = t;
    }, 500);
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(S); last = performance.now(); });
    window.addEventListener('pagehide', () => Store.save(S));
  }
  return { init, at, min, now, label, advance, sleep, setDayMin, start, pause: () => { paused = true; }, resume: () => { paused = false; }, isPaused: () => paused, DAY };
})();
