/* ===== 日常橙光剧情(视觉小说版) =====
   入口:地图 → 点地点 → 「进入日常剧情」(或点弹窗里的在场人物)。
   进场:先是一段旁白(扫一眼:这里有什么、谁在做什么),然后只能点 AI 准备好的选项,不能自己输入。
   画面:整屏背景 + 底部窄窄的半透明对话框(点一下翻页,太长会分到下一个框)+ 顶部「回顾」。
   立绘:角色第一次开口时才出现;背景图 scene-<地点>.jpg、立绘 sprite-<角色id>.png 放在 index.html 旁边,缺图自动用占位。
   要开放新地点:在 SCENE_LOCS 里加一项。fixed = 测试用固定在场人物,不写就用地图的 whereIs 规则。
   存档:S.scenes[地点id] = { key, cast, log, cur },只新增这一个字段,旧存档不受影响。 */
const SCENE_LOCS = {
  hall: {
    bg: 'scene-hall.jpg',
    fixed: ['draco', 'hermione', 'luna'],
    desc: '霍格沃茨的大礼堂:四张长长的学院长桌,高高的天花板映着外面的天空,半空中悬浮着蜡烛,教师席在最前方。'
  }
};
var SCENE_TYPE_MS = 26;      /* 打字机速度(毫秒/字) */
const SCENE_PAGE = 50;       /* 一个对话框最多放多少字 */
const sceneOn = id => !!SCENE_LOCS[id];

/* 这个地点此刻谁在场。夜里没有人。非开放地点和地图原规则完全一样。 */
function sceneCast(locId, slot) {
  if (slot < 0) return [];
  const cfg = SCENE_LOCS[locId];
  if (cfg && cfg.fixed) return cfg.fixed.map(charById).filter(Boolean);
  return CHARACTERS.filter(c => whereIs(c, slot) === locId);
}
const sceneShort = c => { const p = c.name.split('·'); return c.role === 'staff' ? p[p.length - 1] : p[0]; };
const sceneRelLine = c => { const r = rel(c.id); return c.role === 'staff' ? `信任度 ${r.trust}/100(教职工没有亲密度)` : `亲密度 ${r.intimacy}/100,信任度 ${r.trust}/100`; };

/* 进入场景:和地图的“前往”一样记一笔“今天去过”,然后跳转。进场永远先是旁白,所以不需要指定人物。 */
function sceneEnter(locId) {
  const l = LOCATIONS.find(x => x.id === locId), d = World.now();
  (S.visited[dkey()] = S.visited[dkey()] || []).push({ id: l.id, name: l.name, time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) });
  save(); go('scene', { loc: locId });
}

/* 文字太长就分成多个对话框:按句子装,装不下换下一个框 */
function scenePages(text, max) {
  max = max || SCENE_PAGE;
  const sents = String(text || '').match(/[^。！？!?…\n]+[。！？!?…”」』）)]*/g) || [];
  const pages = []; let cur = '';
  sents.forEach(s => {
    s = s.trim(); if (!s) return;
    while (s.length > max) { if (cur) { pages.push(cur); cur = ''; } pages.push(s.slice(0, max)); s = s.slice(max); }
    if (cur && (cur + s).length > max) { pages.push(cur); cur = s; } else cur += s;
  });
  if (cur) pages.push(cur);
  return pages.length ? pages : [''];
}

/* 兜底:旁白里如果出现“你…… / 玩家名……”这种替玩家写动作和心理的句子,直接删掉。辅助手段,主要靠提示词。 */
function sceneStripAgency(text, name) {
  const sents = String(text || '').match(/[^。！？!?…\n]+[。！？!?…]*/g) || [];
  const nm = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const head = new RegExp('^[\\s「“"]*(你' + (nm ? '|' + nm : '') + ')');
  const inner = /你(心想|心里|觉得|感到|感觉|不禁|忍不住|下意识|脸红|心跳|的表情)/;
  return sents.filter(s => !head.test(s) && !inner.test(s)).join('').trim();
}

/* 解析 AI 返回的 JSON。角色只能是在场的人;选项最多 4 个;who 类型的选项必须指向在场角色 */
function sceneParse(text, cast) {
  let j = null; const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { j = JSON.parse(text.slice(a, b + 1)); } catch (e) { /* 兜底 */ } }
  const raw = j || { lines: [{ who: '', text: String(text).trim() }] };
  const who = v => {
    v = String(v || '').trim(); if (!v || v === '旁白' || v === 'narrator') return '';
    let c = cast.find(x => x.id === v);
    if (!c) c = cast.find(x => x.name === v || x.name.indexOf(v) >= 0 || v.indexOf(sceneShort(x)) >= 0);
    return c ? c.id : null;                     /* null = 不在场的人,丢掉这一句 */
  };
  const lines = [];
  (Array.isArray(raw.lines) ? raw.lines : []).forEach(l => {
    const t = String((l && (l.text || l.t)) || '').trim(); if (!t) return;
    const w = who(l && l.who); if (w === null) return;
    lines.push({ who: w, t });
  });
  const cs = [];
  (Array.isArray(raw.choices) ? raw.choices : []).forEach(c => {
    const t = String((c && (c.text || c.t)) || c || '').trim(); if (!t || typeof c === 'number') return;
    let k = c && c.kind ? String(c.kind) : 'self', w = '';
    if (k === 'who') { const r = who(c.who || c.target); if (r) w = r; else k = 'self'; }
    if (k !== 'who' && k !== 'talk') k = 'self';
    cs.push({ t, k, who: w });
  });
  return { lines, cs: cs.slice(0, 4), rel: raw.rel && typeof raw.rel === 'object' ? raw.rel : {} };
}

/* 旧版存档里的记录格式也能读 */
const sceneBeatLines = e => e.l || [{ who: '', t: e.n || '' }].concat((e.d || []).map(x => ({ who: x.who, t: x.t })));
const sceneChoiceOf = c => typeof c === 'string' ? { t: c, k: 'self', who: '' } : c;

function sceneSystem(loc, cfg, cast, slot) {
  const c = S.card, g = PERSONA.grade(), night = slot < 0;
  const me = `${c.name || '玩家'}${c.gender ? '(' + c.gender + ')' : ''},${GRADES[Math.min(7, g) - 1]}${S.house ? '、' + HOUSES[S.house].name + '学生' : ''}。外貌:${c.look || c.appearance || '未设定'}`;
  const castTxt = cast.length
    ? cast.map(x => `- ${x.id}|${x.name}:${PERSONA.has(x.id) ? x.personaCore() : x.persona}\n  与玩家的关系:${sceneRelLine(x)}`).join('\n')
    : '(此刻没有任何可以扮演的角色在场)';
  const pairs = [];
  for (let i = 0; i < cast.length; i++) for (let k = i + 1; k < cast.length; k++) {
    const t = PERSONA.pair(cast[i].id, cast[k].id);
    pairs.push(`- ${sceneShort(cast[i])}与${sceneShort(cast[k])}:${t || '没有特别设定,按各自的性格自然相处,不要凭空发明亲密或仇恨。'}`);
  }
  return [
    '你是一部哈利·波特同人「乙女向橙光文游」日常小场景的叙事者。画面是视觉小说:你写的内容会被拆成一句一句,显示在屏幕底部的对话框里;玩家只能点击你给出的选项,不能自由输入。',
    `现在是游戏世界里的:${World.label()}(第 ${g} 学年,故事发生在原著时间线上;只写这个时间点之前已经发生的事,不预知未来)。`,
    `地点:${loc.name}。${cfg.desc || ''}时段:${night ? '深夜' : SLOTS[slot][1]}。`,
    `玩家角色:${me}`,
    playerCtx(),
    '在场角色(只有他们可以说话和行动):\n' + castTxt,
    pairs.length ? '在场角色之间的关系:\n' + pairs.join('\n') : '',
    '本轮写什么:',
    night
      ? '- 现在是宵禁后的深夜,没有任何你可以扮演的角色在场。如果最后一条消息是“新的一幕”(开场):只用旁白(who 为空)写 2~4 条,用“目光所及……”这类镜头式写法交代走廊或这个地点深夜的样子,以及一两处值得留意的细节(远处的声响、画像的低语、月光下的物件)。不要让玩家被抓或受伤,不要引入有名有姓的新角色。选项全部是 kind=self。之后玩家做出选择时,把选择当作已经发生的事实,只写环境的变化,选项依然全部是 self。'
      : [
        '- 如果最后一条消息是“新的一幕”,这是【开场】:只用旁白(who 为空)写 2~4 条,每条不超过 70 字,用“目光所及……”“视线里……”这类镜头式写法,交代:这个地点此刻的样子;在场的每位角色各自在做什么(要点名);一两件值得留意的小物件。不要让任何角色说话,不要写玩家做了什么、想了什么、感受如何。选项:对每位在场角色各给一个 kind=who 的选项(例如“走向德拉科,看看他在做什么”),最多 3 个;还有空位就给一个 kind=self 的选项(玩家自己做点别的,例如“在长桌边找个位置坐下”“翻看桌上的报纸”),总数不超过 4。',
        '- 否则,玩家刚刚做出了选择(消息里“玩家选择:”后面就是选项原文)。把它当作已经发生的事实,不要扩写玩家的动作,只写世界和角色的回应:先用 1~2 条旁白写环境,或角色自己的动作和神态,再让相关的在场角色说话(who 填角色 id,每条不超过 70 字,共 2~5 条)。选项 3~4 个,kind 可以是 talk(继续和刚才那位角色交谈,写成玩家要说的话或要做的事)、who(转向另一位在场角色,需要 who 字段)、self(玩家自己去做别的事)。'
      ].join('\n'),
    '规则:',
    '1. 绝不替玩家决定或描写玩家的行动、想法、情绪、表情、身体反应、选择或台词。旁白不要以“你”或玩家的名字作主语。选项是供玩家挑选的候选行动或台词,每个 8~24 字,写成玩家能做的事或能说的话,不要写成已经发生的事。',
    '2. 在场角色的言行必须符合各自的人设、与玩家的关系值和原著时间线;关系变好不会抹掉他们的缺点、立场和说话习惯;不要反复使用同一套口头禅、动作和情绪反应。',
    '3. 只有「在场角色」可以说话;不要引入有名有姓的新角色,也不要让不在场的角色出场。',
    '4. 这里只是日常小场景:不改写原著的重要事件,不引入大事件或重大的原创剧情。',
    '5. 玩家是学生,互动保持适龄、非露骨,不写亲密的身体接触。',
    '6. rel:只有玩家上一步真的触动了某位角色,才给出变化(整数,一般 1~3,极少数 5,可以为负);普通寒暄和开场一律为空。教职工只有 trust。',
    '只输出一个 JSON,不要代码块:{"lines":[{"who":"","text":"旁白"},{"who":"角色id","text":"这位角色说的话"}],"choices":[{"text":"选项","kind":"who|talk|self","who":"kind 为 who 时填角色id"}],"rel":{"角色id":{"intimacy":0,"trust":0}}}'
  ].filter(Boolean).join('\n');
}

/* 把最近的剧情记录整理成对话:AI 自己的历史也用同样的 JSON 格式,避免它跑偏 */
function sceneMsgs(sys, log) {
  const out = [];
  const push = (role, c) => { if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + c; else out.push({ role, content: c }); };
  log.slice(-14).forEach(e => {
    if (e.k === 'd') push('user', '(' + e.t + ')');
    else if (e.k === 'u') push('user', '玩家选择:' + e.t);
    else if (e.k === 'b') push('assistant', JSON.stringify({ lines: sceneBeatLines(e).map(x => ({ who: x.who, text: x.t })), choices: (e.cs || []).map(sceneChoiceOf).map(c => ({ text: c.t, kind: c.k, who: c.who })) }));
  });
  if (!out.length || out[out.length - 1].role !== 'user') push('user', '(请接着写下一幕)');
  return [{ role: 'system', content: sys }].concat(out);
}

/* ---- 画面素材 ---- */
/* 没有背景图时用的占位:大礼堂的简笔画(夜空天花板、悬浮蜡烛、长桌),其它地点用渐变 */
function sceneFallbackBg(locId) {
  if (locId !== 'hall') return 'linear-gradient(180deg,#2b2540,#5b4a6e 55%,#3a2d3d)';
  let candles = '';
  [[40, 70], [110, 40], [180, 85], [250, 45], [320, 80], [75, 130], [150, 140], [225, 125], [300, 150], [355, 115], [20, 170], [200, 190], [120, 205], [280, 210]]
    .forEach(p => { candles += `<circle cx="${p[0]}" cy="${p[1]}" r="16" fill="url(#gl)"/><rect x="${p[0] - 1.5}" y="${p[1]}" width="3" height="9" fill="#f4ead2"/><ellipse cx="${p[0]}" cy="${p[1] - 2}" rx="2" ry="3.5" fill="#ffd36b"/>`; });
  let stars = ''; for (let i = 0; i < 40; i++) stars += `<circle cx="${(i * 97) % 390}" cy="${(i * 53) % 230}" r="${(i % 3) * 0.4 + 0.5}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1030"/><stop offset="1" stop-color="#37305e"/></linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#54402f"/><stop offset="1" stop-color="#2c211a"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2b22"/><stop offset="1" stop-color="#18110e"/></linearGradient>
    <radialGradient id="gl"><stop offset="0" stop-color="#ffe6a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe6a0" stop-opacity="0"/></radialGradient></defs>
    <rect width="390" height="844" fill="url(#sky)"/>${stars}
    <rect y="250" width="390" height="250" fill="url(#wall)"/>
    <path d="M30 470 V340 Q55 290 80 340 V470Z M155 470 V320 Q180 262 205 320 V470Z M280 470 V340 Q305 290 330 340 V470Z" fill="#6f8fcf" opacity=".42"/>
    <rect x="0" y="250" width="390" height="10" fill="#1f1610"/>
    <rect y="500" width="390" height="344" fill="url(#floor)"/>
    <path d="M118 548 H272 L330 700 H60Z" fill="#6a4a30"/><path d="M60 700 H330 L370 844 H20Z" fill="#573b27"/>
    <path d="M0 610 H92 L58 844 H0Z M390 610 H298 L332 844 H390Z" fill="#5d4129"/>
    <path d="M0 610 H20 V640 H0Z M370 610 H390 V640 H370Z" fill="#7b5738"/>${candles}</svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
}
/* 立绘占位:半身剪影;有 sprite-角色id.png 就自动盖上去 */
function sceneSprite(c) {
  return `<div class="vn-sp" data-id="${c.id}" style="--c:${c.color}"><svg viewBox="0 0 100 170" preserveAspectRatio="xMidYMax meet"><defs><linearGradient id="g-${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.color}" stop-opacity=".96"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs><circle cx="50" cy="44" r="25" fill="url(#g-${c.id})" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/><path d="M6 170 C6 118 28 90 50 90 C72 90 94 118 94 170 Z" fill="url(#g-${c.id})" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/></svg><img src="sprite-${c.id}.png" alt="" onload="this.parentNode.querySelector('svg').style.display='none'" onerror="this.style.display='none'"></div>`;
}

SCREENS.scene = p => {
  const loc = LOCATIONS.find(x => x.id === p.loc), cfg = SCENE_LOCS[p.loc] || {};
  S.scenes = S.scenes || {};
  const slot0 = currentSlot(), key = dkey() + '|' + slot0;
  let sc = S.scenes[p.loc];
  /* 同一天同一时段再次进入 = 接着上次;换了时段 = 新的一幕(之前的剧情记录留给 AI 参考) */
  if (!sc || sc.key !== key) {
    sc = S.scenes[p.loc] = { key, cast: sceneCast(p.loc, slot0).map(c => c.id), log: ((sc && sc.log) || []).slice(-30), cur: null };
    sc.log.push({ k: 'd', t: `新的一幕:${World.label()},${loc.name},${slot0 < 0 ? '深夜' : SLOTS[slot0][1] + '时段'}` });
    save();
  }
  if (sc.cur && !Array.isArray(sc.cur.lines)) sc.cur = null;      /* 旧版格式的进度直接作废 */
  return {
    html: `<div class="vn ${slot0 < 0 ? 'night' : ''}" id="vn">
      <div class="vn-bg" id="bg"></div><div class="vn-shade"></div><div class="vn-dim"></div>
      <div class="vn-top"><button class="vn-btn" data-back>‹ 返回小手机</button>
        <div class="vn-place">${esc(loc.name)} · ${slot0 < 0 ? '深夜' : SLOTS[slot0][1]}${slot0 < 0 ? '<small>夜深了,不太建议在城堡里乱逛……</small>' : ''}</div>
        <button class="vn-btn" id="blog">回顾</button></div>
      <div class="vn-stage" id="stage"></div>
      <div class="vn-choices" id="chs"></div>
      <div class="vn-box narr" id="box"><div class="vn-name" id="nm" style="display:none"></div><div class="vn-text" id="tx"></div><div class="vn-next" id="nx" style="visibility:hidden">▼</div></div>
      <div class="vn-log" id="log"><div id="lgb"></div></div>
    </div>`,
    mount(el) {
      const vn = q(el, '#vn'), bg = q(el, '#bg'), box = q(el, '#box'), nm = q(el, '#nm'), tx = q(el, '#tx'), nx = q(el, '#nx');
      const stage = q(el, '#stage'), chs = q(el, '#chs'), lg = q(el, '#log'), lgb = q(el, '#lgb');
      let busy = false, alive = true, typing = false, tmr = null, pages = [], pi = 0, stageKey = '';
      const cast = () => sc.cast.map(charById).filter(Boolean);
      bg.style.backgroundImage = (cfg.bg ? `url('${cfg.bg}'),` : '') + sceneFallbackBg(p.loc);
      beforeBack = () => { alive = false; clearTimeout(tmr); save(); return true; };   /* 离开时存档;还没回来的 AI 结果会被丢弃 */

      /* --- 文字:一个框一个框地显示,带打字机效果 --- */
      function typeOut(text) {
        clearTimeout(tmr); typing = true; nx.style.visibility = 'hidden'; let i = 0;
        const stepT = () => { if (!alive) return; i++; tx.textContent = text.slice(0, i); if (i >= text.length) { typing = false; nx.style.visibility = 'visible'; } else tmr = setTimeout(stepT, SCENE_TYPE_MS); };
        tx.textContent = ''; stepT();
      }
      function showLine() {
        const cur = sc.cur, ln = cur.lines[cur.li], c = ln.who ? charById(ln.who) : null;
        pages = scenePages(ln.t); pi = 0;
        nm.style.display = c ? 'block' : 'none'; if (c) { nm.textContent = c.name; nm.style.background = c.color; }
        box.className = 'vn-box ' + (c ? 'said' : 'narr');
        updateStage(); typeOut(pages[0]);
      }
      /* 立绘:角色第一次开口才出现,说话的亮,其他人暗一点 */
      function updateStage() {
        const cur = sc.cur, ids = [];
        cur.lines.slice(0, cur.li + 1).forEach(l => { if (l.who && ids.indexOf(l.who) < 0) ids.push(l.who); });
        const sk = ids.join(',');
        if (sk !== stageKey) { stageKey = sk; stage.innerHTML = ids.map(id => sceneSprite(charById(id))).join(''); stage.className = 'vn-stage n' + ids.length; setTimeout(() => stage.querySelectorAll('.vn-sp').forEach(s => s.classList.add('in')), 30); }
        const spk = cur.lines[cur.li].who;
        stage.querySelectorAll('.vn-sp').forEach(s => s.classList.toggle('dim', !!spk && s.dataset.id !== spk));
      }
      function advance() {
        if (busy || !sc.cur || vn.classList.contains('choosing')) return;
        if (typing) { clearTimeout(tmr); tx.textContent = pages[pi]; typing = false; nx.style.visibility = 'visible'; return; }
        if (pi < pages.length - 1) { pi++; typeOut(pages[pi]); return; }
        if (sc.cur.li < sc.cur.lines.length - 1) { sc.cur.li++; save(); showLine(); return; }
        showChoices();
      }
      function showChoices() {
        const cs = sc.cur.cs;
        vn.classList.add('choosing'); nx.style.visibility = 'hidden';
        chs.innerHTML = cs.map((c, i) => `<button class="vn-opt" data-i="${i}">${esc(c.t)}</button>`).join('');
        chs.querySelectorAll('.vn-opt').forEach(b => b.onclick = e => { e.stopPropagation(); const c = cs[+b.dataset.i]; vn.classList.remove('choosing'); chs.innerHTML = ''; step(c.t); });
      }
      function waiting(on) { nm.style.display = 'none'; box.className = 'vn-box narr'; if (on) { clearTimeout(tmr); typing = false; tx.textContent = '……'; nx.style.visibility = 'hidden'; } }

      /* --- 向 AI 要下一段 --- */
      async function step(userText) {
        if (busy || !aiOk()) return;
        busy = true;
        const pend = userText ? { k: 'u', t: userText } : null;
        if (pend) sc.log.push(pend);
        const prev = sc.cur; waiting(true);
        const rollback = () => { if (pend) { const i = sc.log.indexOf(pend); if (i >= 0) sc.log.splice(i, 1); } };
        try {
          const cs = cast();
          const text = await AI.raw(S.api, sceneMsgs(sceneSystem(loc, cfg, cs, slot0), sc.log), 0.9);
          if (!alive) { rollback(); save(); busy = false; return; }
          const r = sceneParse(text, cs);
          if (!userText) r.lines = r.lines.filter(l => !l.who);      /* 开场只有旁白:就算 AI 让角色开口,也丢掉 */
          r.lines = r.lines.map(l => l.who ? l : { who: '', t: sceneStripAgency(l.t, S.card.name) }).filter(l => l.t);
          if (!r.lines.length) throw new Error('AI 没有返回可用的内容,再试一次');
          if (!r.cs.length) r.cs = cs.slice(0, 3).map(c => ({ t: '去找' + sceneShort(c) + '说话', k: 'who', who: c.id })).concat([{ t: '环顾四周,看看还有什么', k: 'self', who: '' }]).slice(0, 4);
          sc.log.push({ k: 'b', l: r.lines, cs: r.cs });
          sc.log = sc.log.slice(-40);
          sc.cur = { lines: r.lines, cs: r.cs, li: 0 };
          if (userText) Object.keys(r.rel).forEach(id => { const c = charById(id); if (c && sc.cast.indexOf(id) >= 0) applyDelta(c, r.rel[id]); });
          save(); busy = false; showLine();
        } catch (e) {
          rollback(); save(); busy = false;
          if (!alive) return;
          toast(e.message); sc.cur = prev;
          if (prev) { showLine(); advanceToEnd(); } else retryButton();
        }
      }
      /* 失败后回到上一段的选项,不用重读 */
      function advanceToEnd() { const cur = sc.cur; cur.li = cur.lines.length - 1; showLine(); clearTimeout(tmr); pages = scenePages(cur.lines[cur.li].t); pi = pages.length - 1; tx.textContent = pages[pi]; typing = false; showChoices(); }
      function retryButton() { vn.classList.add('choosing'); tx.textContent = '没能接上剧情。'; chs.innerHTML = '<button class="vn-opt" id="retry">重试</button>'; q(chs, '#retry').onclick = e => { e.stopPropagation(); vn.classList.remove('choosing'); chs.innerHTML = ''; step(null); }; }

      /* --- 回顾:从上方落下来。还没读到的内容不会提前出现 --- */
      function logHtml() {
        const cur = sc.cur; let lastB = -1; sc.log.forEach((e, i) => { if (e.k === 'b') lastB = i; });
        const h = sc.log.map((e, i) => {
          if (e.k === 'd') return `<div class="lg-d">—— ${esc(e.t)} ——</div>`;
          if (e.k === 'u') return `<div class="lg-u">▶ ${esc(e.t)}</div>`;
          let ls = sceneBeatLines(e); if (i === lastB && cur) ls = ls.slice(0, cur.li + 1);
          return ls.map(l => { const c = l.who ? charById(l.who) : null; return c ? `<div class="lg-c" style="--c:${c.color}"><b>${esc(c.name)}</b>${esc(l.t)}</div>` : `<div class="lg-n">${esc(l.t)}</div>`; }).join('');
        }).join('');
        return h || '<div class="lg-d">还没有内容</div>';
      }
      q(el, '#blog').onclick = e => {
        e.stopPropagation();
        if (lg.classList.contains('open')) { lg.classList.remove('open'); return; }
        lgb.innerHTML = logHtml(); lg.classList.add('open'); lg.scrollTop = lg.scrollHeight;
      };

      vn.onclick = e => { if (e.target.closest('.vn-top, .vn-opt, .vn-log')) return; advance(); };

      if (sc.cur) showLine(); else step(null);
    }
  };
};
