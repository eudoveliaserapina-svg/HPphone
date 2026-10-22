/* ===== 多区域地图:霍格沃茨 / 霍格莫德 / 对角巷(含古灵阁) / 玩家的庄园 =====
   出入规则(都在 PLACES.areaStatus 里,想改规则只改这里):
   - 霍格沃茨:上学期间。放假时学校是空的,玩家在家。
   - 霍格莫德:严格按原著——三年级以上(PLACE_CFG.HOGSMEADE_MIN_GRADE),只有上学期间的周六、周日。
   - 对角巷:只有周六、周日。DIAGON_IN_TERM = true 表示上学期间的周末也能去;改成 false 就只有假期的周末能去。
   - 庄园:只有假期可以回去。名字是玩家的姓氏 + 庄园(「克莱尔·沙菲特」→「沙菲特庄园」)。
   - 古灵阁在对角巷里,可以取钱、存钱。
   假期 = 暑假(6/25–8/31)、圣诞假(12/19–1/3)、复活节假(复活节前后两周)。
   在场规则:假期里学生都回家了,教职工也不在;周末白天学生可能出现在霍格莫德(三年级以上)或对角巷。 */
const PLACE_CFG = { HOGSMEADE_MIN_GRADE: 3, DIAGON_IN_TERM: true, VAULT_START_GALLEONS: 20 };

const PLACES = (() => {
  const day = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const weekend = d => d.getDay() === 0 || d.getDay() === 6;
  /* 复活节(格里高利历算法) */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  /* 现在是不是假期,是哪一个 */
  function holiday(d) {
    d = d || World.now(); const m = d.getMonth(), dt = d.getDate();
    if ((m === 5 && dt >= 25) || m === 6 || m === 7) return '暑假';
    if ((m === 11 && dt >= 19) || (m === 0 && dt <= 3)) return '圣诞假期';
    const e = day(easter(d.getFullYear())), t = day(d), D = 86400000;
    if (t >= e - 6 * D && t <= e + 7 * D) return '复活节假期';
    return '';
  }
  /* 玩家当前年级:角色卡上的年级 + 游戏里经过的学年数 */
  function grade() {
    const d = World.now(), Y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    return curGrade();
  }
  /* 姓氏:「克莱尔·沙菲特」→ 沙菲特;「林夏」→ 林(单字姓后面加“家”) */
  function surname() {
    const nm = String((S.card && S.card.name) || '').trim(); if (!nm) return '家族';
    const parts = nm.split(/[·・\s]+/).filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 1];
    const two = ['欧阳', '司马', '上官', '诸葛', '夏侯', '皇甫', '尉迟', '公孙', '慕容', '令狐'];
    return two.indexOf(nm.slice(0, 2)) >= 0 ? nm.slice(0, 2) : nm.slice(0, 1);
  }
  const manorName = () => { const s = surname(); return s.length === 1 ? s + '家庄园' : s + '庄园'; };

  const AREAS = [
    { id: 'hogwarts', name: () => '霍格沃茨', night: '夜深了,大家都回宿舍休息了。你仍然可以自己去城堡里探索,只是不太建议。', hint: '夜深了,不太建议在城堡里乱逛……',
      shape: 'M10 40 L30 10 L50 22 L70 8 L92 38 L96 70 L82 100 L28 100 L6 70Z' },
    { id: 'hogsmeade', name: () => '霍格莫德', night: '夜里的村子很安静,店铺都打烊了,只有零星的灯火。', hint: '夜深了,店铺都打烊了……',
      shape: 'M8 30 Q50 6 92 30 L96 80 Q50 104 4 80Z M10 58 Q50 44 90 58 L90 64 Q50 50 10 64Z' },
    { id: 'diagon', name: () => '对角巷', night: '夜里的对角巷几乎没有人,橱窗里的灯还亮着。', hint: '夜深了,街上几乎没有人……',
      shape: 'M6 20 L70 10 L94 40 L60 62 L94 92 L30 100 L10 70 L40 44Z' },
    { id: 'manor', name: () => manorName(), night: '夜里的庄园静悄悄的。', hint: '夜深了,庄园里静悄悄的……',
      shape: 'M10 30 L50 8 L90 30 L90 96 L10 96Z M30 70 a20 16 0 1 0 40 0 a20 16 0 1 0 -40 0Z' }
  ];
  const A = id => AREAS.find(a => a.id === id);

  /* ---- 新增地点 ---- */
  const NEW_LOCS = [
    { id: 'honeydukes', area: 'hogsmeade', name: '蜂蜜公爵', x: 26, y: 32, acts: ['挑选糖果', '盯着橱窗里的巧克力蛙', '被店员推荐新口味'] },
    { id: 'broomsticks', area: 'hogsmeade', name: '三把扫帚', x: 72, y: 32, acts: ['喝一杯黄油啤酒', '在角落的座位休息', '听邻桌聊天'] },
    { id: 'zonkos', area: 'hogsmeade', name: '佐科笑话店', x: 22, y: 70, acts: ['试用整人道具', '在货架间闲逛', '被喷了一脸颜料'] },
    { id: 'hogshead', area: 'hogsmeade', name: '猪头酒吧', x: 76, y: 70, acts: ['在昏暗的角落坐着', '压低兜帽', '不想被人认出来'] },
    { id: 'shack', area: 'hogsmeade', name: '尖叫棚屋', x: 50, y: 92, acts: ['远远看着棚屋', '听说里面闹鬼', '在围栏外停留'] },
    { id: 'gringotts', area: 'diagon', name: '古灵阁', x: 50, y: 20, acts: ['排队等柜员', '看妖精称量金币', '核对金库账目'] },
    { id: 'ollivanders', area: 'diagon', name: '奥利凡德魔杖店', x: 22, y: 46, acts: ['试一根魔杖', '看着墙上的盒子', '听老板讲魔杖的来历'] },
    { id: 'flourish', area: 'diagon', name: '丽痕书店', x: 78, y: 46, acts: ['翻看会动的书', '在书架间找书', '被一本咬人的书吓到'] },
    { id: 'malkins', area: 'diagon', name: '摩金夫人长袍店', x: 22, y: 74, acts: ['量尺寸', '试穿新长袍', '看橱窗里的礼服'] },
    { id: 'fortescue', area: 'diagon', name: '福特斯鸠冰淇淋店', x: 78, y: 74, acts: ['吃冰淇淋', '在遮阳伞下休息', '挑新口味'] },
    { id: 'leaky', area: 'diagon', name: '破釜酒吧', x: 50, y: 92, acts: ['喝点东西休息', '在角落等人', '看着客人进进出出'] },
    { id: 'manor_hall', area: 'manor', name: '庄园前厅', x: 50, y: 30, acts: ['在楼梯边站一会儿', '看墙上的画像', '听着老房子的声响'] },
    { id: 'manor_garden', area: 'manor', name: '庄园花园', x: 24, y: 72, acts: ['在树篱间散步', '坐在喷泉边', '看着玫瑰园发呆'] },
    { id: 'manor_study', area: 'manor', name: '庄园书房', x: 76, y: 52, acts: ['翻看旧书', '在壁炉边看信', '整理书桌'] },
    { id: 'manor_room', area: 'manor', name: '我的房间', x: 62, y: 82, acts: ['躺在床上发呆', '整理行李', '看窗外的花园'] }
  ];
  LOCATIONS.forEach(l => { if (!l.area) l.area = 'hogwarts'; });
  NEW_LOCS.forEach(n => { if (!LOCATIONS.some(l => l.id === n.id)) LOCATIONS.push(n); });
  const ids = area => LOCATIONS.filter(l => l.area === area).map(l => l.id);

  /* ---- 出入规则 ---- */
  function areaStatus(id) {
    const d = World.now(), hol = holiday(d), g = grade();
    if (id === 'hogwarts') return hol ? { ok: false, why: '放假了,霍格沃茨空荡荡的。回家看看吧。' } : { ok: true };
    if (id === 'manor') return hol ? { ok: true } : { ok: false, why: manorName() + '只有放假才能回去。' };
    if (id === 'hogsmeade') {
      if (g < PLACE_CFG.HOGSMEADE_MIN_GRADE) return { ok: false, why: '三年级以后才能去霍格莫德(现在是' + GRADES[g - 1] + ')。' };
      if (hol) return { ok: false, why: '放假期间学校不组织去霍格莫德。' };
      if (!weekend(d)) return { ok: false, why: '只有周六、周日可以去霍格莫德。' };
      return { ok: true };
    }
    if (id === 'diagon') {
      if (!weekend(d)) return { ok: false, why: '只有周六、周日可以去对角巷。' };
      if (!hol && !PLACE_CFG.DIAGON_IN_TERM) return { ok: false, why: '上学期间不能离开学校去对角巷。' };
      return { ok: true };
    }
    return { ok: true };
  }
  const locStatus = locId => { const l = LOCATIONS.find(x => x.id === locId); return l ? areaStatus(l.area || 'hogwarts') : { ok: true }; };
  const defaultArea = () => areaStatus('hogwarts').ok ? 'hogwarts' : 'manor';

  /* ---- 谁在哪:假期学生回家、教职工不在;周末白天学生可能在霍格莫德或对角巷 ---- */
  const _whereIs = whereIs;
  whereIs = function (c, slot) {
    const d = World.now(), r = rng(dkey() + c.id + slot + 'pl'), hol = holiday(d), wk = weekend(d), day = slot >= 1 && slot <= 3;
    if (hol) return wk && day && c.role === 'student' && r() < 0.3 ? pick(ids('diagon'), r) : 'away';
    if (wk && day) {
      if (c.role === 'student' && grade() >= PLACE_CFG.HOGSMEADE_MIN_GRADE && r() < 0.4) return pick(ids('hogsmeade'), r);
      if (c.role === 'staff' && r() < 0.12) return 'broomsticks';
      if (PLACE_CFG.DIAGON_IN_TERM && c.role === 'student' && r() < 0.08) return pick(ids('diagon'), r);
    }
    /* 原规则会从 LOCATIONS 里随机挑,现在 LOCATIONS 里有别的区域的地点了:挑到城堡以外的就换回城堡里的 */
    const w = _whereIs(c, slot), l = LOCATIONS.find(x => x.id === w);
    return l && l.area !== 'hogwarts' ? pick(ids('hogwarts'), r) : w;
  };

  return { AREAS, A, areaStatus, locStatus, defaultArea, holiday, weekend, grade, manorName, surname, ids, easter,
    areaName: id => A(id).name(), nightHint: loc => (A((loc && loc.area) || 'hogwarts') || AREAS[0]).hint };
})();

/* ---- 剧情地点(日常橙光):背景和描述。古灵阁不是剧情,是银行。 ---- */
Object.assign(SCENE_LOCS, {
  honeydukes:   { bg: 'scene-honeydukes.jpg',   look: ['shop', '#e07aa8'],  desc: '蜂蜜公爵糖果店:货架上堆满五颜六色的糖果,蜂蜜色的灯光暖烘烘的,空气里全是甜味,角落里有一整面墙的巧克力蛙。' },
  broomsticks:  { bg: 'scene-broomsticks.jpg',  look: ['bar', '#d9953b'],   desc: '三把扫帚酒吧:挤满了说笑的巫师,木桌上摆着冒着泡沫的黄油啤酒,壁炉烧得很旺,老板娘在人群里穿梭。' },
  zonkos:       { bg: 'scene-zonkos.jpg',       look: ['shop', '#7ad04e'],  desc: '佐科笑话店:货架上摆满了会爆炸、会尖叫、会喷颜料的恶作剧道具,店里时不时传来一声怪响。' },
  hogshead:     { bg: 'scene-hogshead.jpg',     look: ['bar', '#6f6a5c'],   desc: '猪头酒吧:又小又暗,到处是灰尘和羊膻味,客人们披着兜帽低着头,没人想被认出来。' },
  shack:        { bg: 'scene-shack.jpg',        look: ['shack', '#8a7a63'], desc: '尖叫棚屋:山坡上摇摇欲坠的木屋,窗户钉着木板,传说里面闹鬼;只能站在围栏外远远看着。' },
  gringotts:    { bg: 'scene-gringotts.jpg',    look: ['bank', '#d8b24a'],  action: 'bank', desc: '古灵阁:白色大理石的银行,铜门高大,妖精们坐在高高的柜台后一丝不苟地称量金币。' },
  ollivanders:  { bg: 'scene-ollivanders.jpg',  look: ['shop', '#c9b27a'],  desc: '奥利凡德魔杖店:狭窄昏暗的店面,墙上堆到天花板的细长盒子积着薄灰,空气里有种说不清的魔力。' },
  flourish:     { bg: 'scene-flourish.jpg',     look: ['shop', '#8a6bb0'],  desc: '丽痕书店:书架高得望不到顶,有的书关在笼子里扑腾,梯子在书架间滑来滑去。' },
  malkins:      { bg: 'scene-malkins.jpg',      look: ['shop', '#5a7fb8'],  desc: '摩金夫人长袍店:明亮的店里挂满各色长袍,店员拿着软尺和别针忙个不停。' },
  fortescue:    { bg: 'scene-fortescue.jpg',    look: ['shop', '#f0b4c8'],  desc: '福特斯鸠冰淇淋店:街角的小店,门外摆着遮阳伞和小圆桌,各种颜色的冰淇淋在柜台后闪着光。' },
  leaky:        { bg: 'scene-leaky.jpg',        look: ['bar', '#a06a3a'],   desc: '破釜酒吧:光线昏暗的老酒吧,门口不起眼,穿过后院的砖墙就是对角巷;几位客人在角落里低声交谈。' },
  manor_hall:   { bg: 'scene-manor_hall.jpg',   look: ['manorhall', '#b9a27a'], desc: '你家庄园的前厅:高高的天花板,旋转的楼梯,墙上挂着家族的画像,一切都是你熟悉的样子。' },
  manor_garden: { bg: 'scene-manor_garden.jpg', look: ['garden', '#5f9e6f'],    desc: '你家庄园的花园:修剪整齐的树篱,喷泉,远处的玫瑰园,风里有青草和泥土的味道。' },
  manor_study:  { bg: 'scene-manor_study.jpg',  look: ['study', '#8a5a3a'],     desc: '你家庄园的书房:深色的橡木书桌,壁炉里的火噼啪作响,四面墙都是书架,桌上摊着没看完的信。' },
  manor_room:   { bg: 'scene-manor_room.jpg',   look: ['bedroom', '#9a8ac0'],   desc: '你在庄园里的房间:熟悉的床和书桌,窗外是自家的花园,一切都和你离开时一样。' }
});

/* ---- 新地点的占位背景(按类型 + 主色画简笔画;放 scene-<id>.jpg 就会换成你的图) ---- */
const _fallbackBg = sceneFallbackBg;
sceneFallbackBg = function (locId) {
  const cfg = SCENE_LOCS[locId], lk = cfg && cfg.look;
  if (!lk) return _fallbackBg(locId);
  const kind = lk[0], ac = lk[1];
  const rnd = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const gl = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  let defs = '', body = '';
  if (kind === 'shop') {
    let sh = '';
    for (let r = 0; r < 5; r++) { const y = 110 + r * 100; sh += `<rect x="0" y="${y + 56}" width="390" height="8" fill="#2a1a10"/>`; for (let i = 0; i < 12; i++) sh += `<rect x="${10 + i * 32}" y="${y + 16 + rnd(r * 12 + i) * 10}" width="22" height="${30 + rnd(i + r) * 10}" rx="5" fill="${ac}" opacity="${0.35 + rnd(i * 3 + r) * 0.55}"/>`; }
    defs = g('a', '#3a2a24', '#6a4a3a') + gl('l', '#ffe3a0');
    body = `<rect width="390" height="844" fill="url(#a)"/>${sh}<circle cx="100" cy="90" r="80" fill="url(#l)"/><circle cx="300" cy="90" r="80" fill="url(#l)"/><rect y="640" width="390" height="204" fill="#2a1d16"/><rect x="30" y="610" width="330" height="40" fill="#7a5638"/><rect x="30" y="650" width="330" height="60" fill="#5a3f2a"/>`;
  } else if (kind === 'bar') {
    let mugs = '';
    for (let i = 0; i < 6; i++) mugs += `<rect x="${40 + i * 56}" y="${586 - (i % 2) * 6}" width="22" height="28" rx="4" fill="#d8a64a"/><rect x="${40 + i * 56}" y="${582 - (i % 2) * 6}" width="22" height="8" fill="#fff" opacity=".8"/>`;
    defs = g('a', '#241811', '#4a3222') + gl('f', ac);
    body = `<rect width="390" height="844" fill="url(#a)"/><path d="M0 120 H390 M0 220 H390 M0 320 H390" stroke="#1a110b" stroke-width="3" opacity=".6"/><rect x="130" y="260" width="130" height="150" rx="10" fill="#120c08"/><circle cx="195" cy="350" r="150" fill="url(#f)" opacity=".7"/><path d="M160 410 q35 -70 70 0Z" fill="${ac}"/><rect y="610" width="390" height="40" fill="#6a4a2d"/><rect y="650" width="390" height="194" fill="#2d1f15"/>${mugs}`;
  } else if (kind === 'shack') {
    defs = g('sk', '#10152e', '#3a3a5e') + gl('m', '#dfe6ff');
    body = `<rect width="390" height="844" fill="url(#sk)"/><circle cx="300" cy="110" r="70" fill="url(#m)"/><circle cx="300" cy="110" r="26" fill="#eef2ff"/><path d="M0 520 Q100 460 200 500 T390 470 V844 H0Z" fill="#1a2a1e"/><path d="M80 560 L100 440 L190 420 L290 440 L310 560Z" fill="#4a3a2a"/><path d="M60 440 L195 340 L330 440Z" fill="#2a1f16"/><rect x="150" y="480" width="40" height="50" fill="#0e0a07"/><path d="M0 700 H390 M20 660 V740 M80 660 V740 M140 660 V740 M200 660 V740 M260 660 V740 M320 660 V740 M370 660 V740" stroke="#6a5a42" stroke-width="5"/>`;
  } else if (kind === 'bank') {
    let col = '';
    for (let i = 0; i < 5; i++) col += `<rect x="${20 + i * 76}" y="120" width="34" height="520" fill="#e9e4d8"/><rect x="${14 + i * 76}" y="110" width="46" height="16" fill="#cfc8b8"/><rect x="${14 + i * 76}" y="636" width="46" height="16" fill="#cfc8b8"/>`;
    defs = g('a', '#c9c2b2', '#8a8574') + gl('c', '#ffe9a8');
    body = `<rect width="390" height="844" fill="url(#a)"/>${col}<circle cx="195" cy="90" r="120" fill="url(#c)" opacity=".7"/><rect y="640" width="390" height="204" fill="#5a5448"/><rect x="40" y="590" width="310" height="70" fill="${ac}"/><rect x="40" y="590" width="310" height="10" fill="#fff" opacity=".4"/>`;
  } else if (kind === 'manorhall') {
    defs = g('a', '#2b2433', '#5a4a52') + gl('c', '#ffe3a0') + g('f', '#4a3a30', '#1a120e');
    body = `<rect width="390" height="844" fill="url(#a)"/><circle cx="195" cy="120" r="110" fill="url(#c)"/><path d="M175 70 H215 L225 130 H165Z" fill="${ac}"/><path d="M60 140 H110 V520 H60Z M280 140 H330 V520 H280Z" fill="#6b5a4c"/><path d="M140 520 L195 330 L250 520Z" fill="#8a6a4a"/><path d="M110 700 L150 560 H240 L280 700Z" fill="#6a1f2a" opacity=".85"/><rect y="640" width="390" height="204" fill="url(#f)" opacity=".9"/><rect x="40" y="250" width="40" height="60" fill="#c8a860" opacity=".8"/><rect x="310" y="250" width="40" height="60" fill="#c8a860" opacity=".8"/>`;
  } else if (kind === 'garden') {
    let hedge = '';
    for (let i = 0; i < 9; i++) hedge += `<ellipse cx="${i * 48}" cy="${470 + rnd(i) * 20}" rx="40" ry="${40 + rnd(i + 3) * 14}" fill="hsl(${110 + Math.floor(rnd(i) * 30)},45%,${26 + Math.floor(rnd(i + 5) * 8)}%)"/>`;
    defs = g('sk', '#a9d4f0', '#eaf4fa') + g('gr', '#6aaa5a', '#2f6a30');
    body = `<rect width="390" height="844" fill="url(#sk)"/><ellipse cx="90" cy="130" rx="70" ry="22" fill="#fff" opacity=".7"/>${hedge}<rect y="500" width="390" height="344" fill="url(#gr)"/><ellipse cx="195" cy="650" rx="80" ry="26" fill="#9ec8e0"/><rect x="185" y="570" width="20" height="80" fill="#cfd8dc"/><path d="M40 760 q10 -30 20 0 M120 780 q10 -30 20 0 M300 770 q10 -30 20 0" stroke="${ac}" stroke-width="6" fill="none"/>`;
  } else if (kind === 'study') {
    let sh = '';
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) sh += `<rect x="${i * 14 + 6}" y="${60 + r * 90}" width="10" height="${42 + rnd(r * 12 + i) * 22}" fill="hsl(${15 + Math.floor(rnd(i + r * 5) * 30)},35%,${20 + Math.floor(rnd(i + r) * 14)}%)"/>`;
    defs = g('a', '#2a1b12', '#4b3321') + gl('f', '#ff9d4a');
    body = `<rect width="390" height="844" fill="url(#a)"/>${sh}<rect x="220" y="360" width="150" height="150" fill="#1a110b"/><circle cx="295" cy="470" r="110" fill="url(#f)" opacity=".75"/><path d="M270 510 q25 -60 50 0Z" fill="#ff8a2a"/><rect x="30" y="600" width="250" height="24" fill="#6b4a2d"/><rect x="50" y="624" width="16" height="140" fill="#4a3220"/><rect x="244" y="624" width="16" height="140" fill="#4a3220"/><rect y="760" width="390" height="84" fill="#1d130d"/>`;
  } else if (kind === 'train') {
    let seats = '';
    for (let i = 0; i < 2; i++) seats += `<rect x="${i * 250 + 10}" y="560" width="130" height="170" rx="14" fill="#8a2f2f"/><rect x="${i * 250 + 10}" y="520" width="130" height="50" rx="14" fill="#a33b3b"/>`;
    defs = g('a', '#3a2a24', '#5a4034') + g('s', '#9ac8f0', '#e6f3d8') + g('h', '#6aaa5a', '#3a7a3a');
    body = `<rect width="390" height="844" fill="url(#a)"/><rect x="60" y="120" width="270" height="300" rx="14" fill="url(#s)"/><path d="M60 330 Q130 270 200 320 T330 300 V420 H60Z" fill="url(#h)"/><rect x="60" y="120" width="270" height="300" rx="14" fill="none" stroke="#2a1d16" stroke-width="10"/><path d="M195 120 V420" stroke="#2a1d16" stroke-width="6"/>${seats}<rect y="740" width="390" height="104" fill="#2a1d16"/>`;
  } else if (kind === 'corridor') {
    let tc = '';
    [[60, 300], [330, 300], [95, 420], [295, 420]].forEach(p => { tc += `<circle cx="${p[0]}" cy="${p[1]}" r="46" fill="url(#f)"/><rect x="${p[0] - 3}" y="${p[1]}" width="6" height="26" fill="#4a3220"/><ellipse cx="${p[0]}" cy="${p[1] - 4}" rx="6" ry="11" fill="#ffb347"/>`; });
    defs = g('a', '#1a1a24', '#3a3a48') + gl('f', '#ffb347');
    body = `<rect width="390" height="844" fill="url(#a)"/><path d="M0 0 L120 250 V560 L0 844Z M390 0 L270 250 V560 L390 844Z" fill="#2a2a36"/><path d="M120 250 H270 V560 H120Z" fill="#101018"/><path d="M0 700 L120 560 H270 L390 700 V844 H0Z" fill="#26222a"/><path d="M60 140 Q195 20 330 140" stroke="#44445a" stroke-width="10" fill="none"/>${tc}`;
  } else if (kind === 'forest') {
    let tr = '';
    for (let i = 0; i < 12; i++) { const x = i * 36 - 10, h = 420 + rnd(i) * 300; tr += `<rect x="${x}" y="${844 - h}" width="${16 + rnd(i + 4) * 16}" height="${h}" fill="hsl(${130 + Math.floor(rnd(i) * 20)},25%,${8 + Math.floor(rnd(i + 2) * 8)}%)"/>`; }
    defs = g('a', '#0b1a14', '#1d3a2a') + gl('m', '#cfe8ff');
    body = `<rect width="390" height="844" fill="url(#a)"/><circle cx="290" cy="120" r="110" fill="url(#m)" opacity=".5"/>${tr}<path d="M0 700 Q200 660 390 710 V844 H0Z" fill="#0a120e"/><path d="M150 760 Q175 700 200 740" stroke="#cfe8ff" stroke-width="3" fill="none" opacity=".6"/>`;
  } else if (kind === 'hospital') {
    let beds = '';
    for (let i = 0; i < 3; i++) beds += `<rect x="${30 + i * 120}" y="540" width="100" height="150" rx="10" fill="#f4f6f8"/><rect x="${30 + i * 120}" y="520" width="100" height="40" rx="10" fill="#dfe6ee"/><rect x="${30 + i * 120}" y="640" width="100" height="14" fill="#b8c4d0"/>`;
    defs = g('a', '#e8eef4', '#c3cfdb') + gl('l', '#fff7d6');
    body = `<rect width="390" height="844" fill="url(#a)"/><rect x="40" y="110" width="110" height="200" rx="50" fill="#a9c8ea"/><rect x="240" y="110" width="110" height="200" rx="50" fill="#a9c8ea"/><circle cx="195" cy="200" r="150" fill="url(#l)" opacity=".7"/>${beds}<rect y="700" width="390" height="144" fill="#9aa8b6"/>`;
  } else {   /* bedroom */
    defs = g('a', '#3a3350', '#6a5f82') + g('s', '#8fb4e8', '#dbe8f8') + gl('l', '#ffe3a0');
    body = `<rect width="390" height="844" fill="url(#a)"/><rect x="230" y="110" width="120" height="190" rx="50" fill="url(#s)"/><rect x="230" y="110" width="120" height="190" rx="50" fill="none" stroke="#2a2118" stroke-width="7"/><rect x="30" y="540" width="250" height="110" rx="12" fill="${ac}"/><rect x="30" y="500" width="70" height="60" rx="10" fill="#fff" opacity=".85"/><rect y="650" width="390" height="194" fill="#3b2f2a"/><rect x="300" y="500" width="70" height="150" fill="#5a4129"/><circle cx="335" cy="470" r="60" fill="url(#l)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
};

/* ---- 地图页:区域标签 + 各区域的地点 ---- */
SCREENS.map = () => {
  const slot = currentSlot(), vis = S.visited[dkey()] || [];
  let cur = S.mapArea || 'hogwarts';
  if (!PLACES.areaStatus(cur).ok) cur = PLACES.defaultArea();
  S.mapArea = cur;
  const area = PLACES.A(cur), d = World.now(), hol = PLACES.holiday(d);
  const tabs = PLACES.AREAS.map(a => { const st = PLACES.areaStatus(a.id); return `<button class="area-tab ${a.id === cur ? 'on' : ''} ${st.ok ? '' : 'lock'}" data-area="${a.id}">${st.ok ? '' : '🔒 '}${esc(a.name())}</button>`; }).join('');
  const locked = PLACES.AREAS.filter(a => !PLACES.areaStatus(a.id).ok).map(a => `<div>🔒 ${esc(a.name())}:${esc(PLACES.areaStatus(a.id).why)}</div>`).join('');
  const nodes = LOCATIONS.filter(l => l.area === cur).map(l => `<g class="node" data-loc="${l.id}"><circle cx="${l.x}" cy="${l.y}" r="5.2" fill="${vis.some(v => v.id === l.id) ? 'var(--today)' : 'var(--t0)'}" stroke="var(--glyph)" stroke-width="1"/><text x="${l.x}" y="${l.y + 1.6}" text-anchor="middle" font-size="5" fill="var(--glyph)">${vis.some(v => v.id === l.id) ? '✓' : (l.id === 'gringotts' ? '$' : '·')}</text><text x="${l.x}" y="${l.y + 10.5}" text-anchor="middle" font-size="4.2" fill="var(--ink)">${esc(l.name)}</text></g>`).join('');
  /* 主线剧情:到了原著里的日期,按顺序一章一章开放 */
  const ss = typeof STORY !== 'undefined' ? STORY.status() : { state: 'none' };
  const banner = ss.state === 'ready' || ss.state === 'inprogress'
    ? `<div class="card story-card"><b>📖 主线剧情</b><div style="font-size:16px;margin:4px 0">${esc(ss.ch.title)} <small class="soft">${esc(ss.ch.place)}</small></div><p class="soft" style="margin:0 0 8px">${esc(ss.ch.intro)}</p><button class="btn big" id="story-go" style="margin:0">${ss.state === 'inprogress' ? '继续' : '开始'}</button></div>`
    : ss.state === 'waiting' ? `<p class="soft">📖 下一章主线:${esc(ss.ch.title)}(${ss.ch.m}月${ss.ch.d}日解锁)</p>` : '';
  const note = slot < 0 ? area.night : `现在是「${SLOTS[slot][1]}」时段。点一个地点看看有谁在。每天都会刷新。`;
  return {
    html: header('地图') + `<div class="area-tabs">${tabs}</div><div class="scroll">${banner}<p class="soft">📅 星期${WEEK[d.getDay()]}${PLACES.weekend(d) ? '(周末)' : ''}${hol ? ' · ' + hol : ''}<br>${esc(note)}</p>
      <svg viewBox="0 0 100 110" class="mapsvg"><path d="${area.shape}" fill="var(--surface2)" stroke="var(--line)" stroke-width="1.2" fill-rule="evenodd"/>${nodes}</svg>
      ${locked ? `<div class="soft area-why">${locked}</div>` : ''}
      <div class="card"><h3>今天去过的地方</h3>${vis.length ? vis.map(v => `<div>${esc(v.time)} · ${esc(v.name)}</div>`).join('') : '<span class="soft">还没有去过任何地方。角色们会注意到你去了哪里。</span>'}</div></div>`,
    mount(el) {
      const sg = q(el, '#story-go'); if (sg) sg.onclick = () => go('story', { id: ss.ch.id });
      el.querySelectorAll('.area-tab').forEach(b => b.onclick = () => {
        const st = PLACES.areaStatus(b.dataset.area);
        if (!st.ok) return toast(st.why);
        S.mapArea = b.dataset.area; save(); render();
      });
      el.querySelectorAll('.node').forEach(n => n.onclick = () => {
        const l = LOCATIONS.find(x => x.id === n.dataset.loc);
        const who = slot < 0 ? [] : sceneCast(l.id, slot);
        const m = modalOpen(`<h3>${esc(l.name)}</h3>${who.length ? who.map(c => `<div class="row" data-who="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>${actFor(c, l, slot)}</small></span></div>`).join('') : '<p class="soft">这里现在没有人。</p>'}
          ${slot < 0 ? `<p class="soft" style="font-size:12px;margin:2px 0 8px">${esc(PLACES.nightHint(l))}</p>` : ''}<button class="btn big" id="go">进入</button><button class="btn big ghost" data-close>算了</button>`);
        m.querySelector('[data-close]').onclick = () => m.remove();
        m.querySelectorAll('[data-who]').forEach(r => r.onclick = () => { m.remove(); sceneEnter(l.id); });
        m.querySelector('#go').onclick = () => { m.remove(); sceneEnter(l.id); };
      });
    }
  };
};

/* ---- 古灵阁:取钱、存钱 ---- */
SCREENS.bank = () => {
  if (S.vault == null) S.vault = PLACE_CFG.VAULT_START_GALLEONS * KNUT_PER_GALLEON;
  const G = KNUT_PER_GALLEON;
  return {
    html: header('古灵阁') + `<div class="walletbar" id="wal"></div><div class="scroll">
      <div class="card" style="text-align:center"><div style="font-size:48px">🏦</div><p class="soft" id="gob">妖精柜员从高高的柜台后面抬起头,上下打量了你一番。</p></div>
      <div class="card"><h3>你的金库</h3><div id="vb" style="font-size:20px;font-weight:700;margin-bottom:6px"></div>
        <h3>取钱</h3><div class="bank-row"><button class="btn" data-w="${G}">取 1 加隆</button><button class="btn" data-w="${5 * G}">取 5 加隆</button><button class="btn" data-w="${10 * G}">取 10 加隆</button><button class="btn" data-w="all">全部取出</button></div>
        <h3>存钱</h3><div class="bank-row"><button class="btn ghost" data-d="${G}">存 1 加隆</button><button class="btn ghost" data-d="${5 * G}">存 5 加隆</button><button class="btn ghost" data-d="all">全部存入</button></div>
        <h3>指定金额</h3><div class="bank-row"><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="金额(加隆,可以有小数)"><button class="btn" id="aw">取出</button><button class="btn ghost" id="ad">存入</button></div></div></div>`,
    mount(el) {
      const wal = q(el, '#wal'), vb = q(el, '#vb'), gob = q(el, '#gob');
      const draw = () => { wal.textContent = '💰 身上 ' + coinText(S.coins); vb.textContent = coinText(S.vault); };
      const say = t => { gob.textContent = t; };
      function withdraw(k) {
        k = Math.round(k); if (!(k > 0)) return toast('金额不对');
        if (k > S.vault) return say('“金库里没有这么多,先生/女士。”') || toast('金库里没有这么多');
        S.vault -= k; addCoins(k); draw(); say('妖精清点了一遍金币,推了过来:“请收好。”');
      }
      function deposit(k) {
        k = Math.round(k); if (!(k > 0)) return toast('金额不对');
        if (k > S.coins) return toast('身上的钱不够');
        S.vault += k; addCoins(-k); save(); draw(); say('妖精在账本上记了一笔:“已存入。”');
      }
      el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => withdraw(b.dataset.w === 'all' ? S.vault : +b.dataset.w));
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => deposit(b.dataset.d === 'all' ? S.coins : +b.dataset.d));
      q(el, '#aw').onclick = () => withdraw(parseFloat(q(el, '#amt').value) * G);
      q(el, '#ad').onclick = () => deposit(parseFloat(q(el, '#amt').value) * G);
      draw();
    }
  };
};
