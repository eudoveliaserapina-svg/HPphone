/* ===== 日常橙光剧情(第一版:大礼堂 + 德拉科 / 赫敏 / 卢娜) =====
   入口:地图 → 点地点 → 「进入日常剧情」,或点弹窗里的在场人物。
   要开放新地点:在 SCENE_LOCS 里加一项(bg = 背景图文件名,放在 index.html 旁边;缺图会自动用渐变占位)。
   fixed = 测试用的固定在场人物;不写 fixed 就用地图原来的 whereIs 规则。
   存档:S.scenes[地点id] = { key, cast, log, cur }。只新增这一个字段,旧存档不受影响。 */
const SCENE_LOCS = {
  hall: {
    bg: 'scene-hall.jpg',
    fixed: ['draco', 'hermione', 'luna'],
    desc: '霍格沃茨的大礼堂:四张长长的学院长桌,高高的天花板映着外面的天空,半空中悬浮着蜡烛,教师席在最前方。'
  }
};
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

/* 进入场景:和地图的“前往”一样记一笔“今天去过”,然后跳转 */
function sceneEnter(locId, focus) {
  const l = LOCATIONS.find(x => x.id === locId), d = World.now();
  (S.visited[dkey()] = S.visited[dkey()] || []).push({ id: l.id, name: l.name, time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) });
  save(); go('scene', { loc: locId, focus: focus || '' });
}

/* 兜底:AI 的旁白里如果出现“你…… / 玩家名……”这种替玩家写动作和心理的句子,直接删掉。
   这是辅助手段,主要还是靠提示词。 */
function sceneStripAgency(text, name) {
  const sents = String(text || '').match(/[^。！？!?…\n]+[。！？!?…]*/g) || [];
  const nm = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const head = new RegExp('^[\\s「“"]*(你' + (nm ? '|' + nm : '') + ')');
  const inner = /你(心想|心里|觉得|感到|感觉|不禁|忍不住|下意识|脸红|心跳|的表情)/;
  return sents.filter(s => !head.test(s) && !inner.test(s)).join('').trim();
}

/* 解析 AI 返回的 JSON;角色只能是在场的人 */
function sceneParse(text, cast) {
  let j = null; const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { j = JSON.parse(text.slice(a, b + 1)); } catch (e) { /* 兜底 */ } }
  const raw = j || { narration: String(text).trim() };
  const who = v => {
    v = String(v || '').trim(); if (!v) return '';
    let c = cast.find(x => x.id === v);
    if (!c) c = cast.find(x => x.name === v || x.name.indexOf(v) >= 0 || v.indexOf(sceneShort(x)) >= 0);
    return c ? c.id : '';
  };
  let dl = Array.isArray(raw.dialogue) ? raw.dialogue : [];
  if (!dl.length && raw.speaker && raw.line) dl = [{ who: raw.speaker, text: raw.line }];
  const dlg = dl.map(d => ({ who: who(d && (d.who || d.speaker)), t: String((d && (d.text || d.t || d.line)) || '').trim() })).filter(d => d.who && d.t).slice(0, 3);
  const cs = (Array.isArray(raw.choices) ? raw.choices : []).map(x => String((x && x.text) || x || '').trim()).filter(Boolean).slice(0, 4);
  const rl = raw.rel && typeof raw.rel === 'object' ? raw.rel : {};
  return { narr: String(raw.narration || '').trim(), dlg, cs, rel: rl };
}

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
    '你是一部哈利·波特同人「日常橙光文游」的叙事者。你只负责环境和在场角色,玩家由玩家自己控制。',
    `现在是游戏世界里的:${World.label()}(第 ${g} 学年,故事发生在原著时间线上;只写这个时间点之前已经发生的事,不预知未来)。`,
    `地点:${loc.name}。${cfg.desc || ''}时段:${night ? '深夜' : SLOTS[slot][1]}。`,
    `玩家角色:${me}`,
    playerCtx(),
    '在场角色(只有他们可以说话和行动):\n' + castTxt,
    pairs.length ? '在场角色之间的关系:\n' + pairs.join('\n') : '',
    night ? '现在是宵禁后的深夜,没有任何你可以扮演的角色在场。只写环境与气氛,可以有细微的悬念(远处的声响、画像的低语),但不要让玩家被抓或受伤,不要引入有名有姓的新角色;dialogue 必须是空数组,rel 为空对象。' : '',
    '规则:',
    '1. 绝不替玩家决定或描写玩家的行动、想法、情绪、表情、身体反应、选择或台词。旁白里不要以“你”或玩家的名字作主语;玩家上一步选择的内容,只当作已经发生的事实,让在场角色看到并回应,不要扩写它。',
    '2. 在场角色的言行必须符合各自的人设、与玩家的关系值和原著时间线;关系变好不会抹掉他们的缺点、立场和说话习惯;不要反复使用同一套口头禅、动作和情绪反应。',
    '3. 只有「在场角色」可以说话;不要引入有名有姓的新角色,也不要让不在场的角色出场。',
    '4. 这里只是日常小场景:不改写原著的重要事件,不引入大事件或重大的原创剧情。',
    '5. 玩家是学生,互动保持适龄、非露骨,不写亲密的身体接触。',
    '6. 每一轮:narration 写 60~160 字(环境、气氛、角色的动作和神态);dialogue 最多 3 条,每条是一位在场角色说的话(不超过 60 字);choices 给出 3~4 个玩家可以选的下一步(每个 10~30 字,走向各不相同),写成玩家能做的动作或能说的话,例如“走过去问德拉科在看什么”,不要写成已经发生的事。',
    '7. rel:只有玩家上一步真的触动了某位角色,才给出变化(整数,一般 1~3,极少数 5,可以为负);普通寒暄一律 0。教职工只有 trust。',
    '只输出一个 JSON,不要代码块:{"narration":"","dialogue":[{"who":"角色id","text":""}],"choices":["","",""],"rel":{"角色id":{"intimacy":0,"trust":0}}}'
  ].filter(Boolean).join('\n');
}

/* 把最近的剧情记录整理成对话:AI 的历史也用同样的 JSON 格式,避免它跑偏 */
function sceneMsgs(sys, log) {
  const out = [];
  const push = (role, c) => { if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + c; else out.push({ role, content: c }); };
  log.slice(-14).forEach(e => {
    if (e.k === 'd') push('user', '(' + e.t + ')');
    else if (e.k === 'u') push('user', (e.f ? '玩家自己写下的行动或台词:' : '玩家选择:') + e.t);
    else if (e.k === 'b') push('assistant', JSON.stringify({ narration: e.n, dialogue: (e.d || []).map(x => ({ who: x.who, text: x.t })), choices: e.cs || [] }));
  });
  if (!out.length || out[out.length - 1].role !== 'user') push('user', '(请接着写下一幕)');
  return [{ role: 'system', content: sys }].concat(out);
}

SCREENS.scene = p => {
  const loc = LOCATIONS.find(x => x.id === p.loc), cfg = SCENE_LOCS[p.loc] || {};
  S.scenes = S.scenes || {};
  const slot0 = currentSlot(), key = dkey() + '|' + slot0;
  let sc = S.scenes[p.loc];
  /* 同一天同一时段再次进入 = 接着上次;换了时段 = 新的一幕(保留之前的剧情记录给 AI 参考) */
  if (!sc || sc.key !== key) {
    sc = S.scenes[p.loc] = { key, cast: sceneCast(p.loc, slot0).map(c => c.id), log: ((sc && sc.log) || []).slice(-30), cur: null };
    sc.log.push({ k: 'd', t: `新的一幕:${World.label()},${loc.name},${slot0 < 0 ? '深夜' : SLOTS[slot0][1] + '时段'}` });
    save();
  }
  const focusC = p.focus && sc.cast.indexOf(p.focus) >= 0 ? charById(p.focus) : null;
  const FALLBACK = sc.cast.length ? ['先留意一下周围的动静', '主动和在场的人打个招呼'] : ['沿着走廊再往前走走', '在原地安静地听一会儿'];
  return {
    html: `<header class="bar"><button class="back" data-back>‹ 返回小手机</button><h1>${esc(loc.name)}</h1><div class="bar-r"><small class="soft">${slot0 < 0 ? '深夜' : SLOTS[slot0][1]}</small></div></header>
      <div class="sc">
        <div class="sc-stage ${slot0 < 0 ? 'night' : ''}" style="background-image:${cfg.bg ? `url('${cfg.bg}'),` : ''}linear-gradient(160deg,#8a7658,#3a2d20)">
          <div class="sc-chips" id="chips"></div>${slot0 < 0 ? '<div class="sc-hint">夜深了,不太建议在城堡里乱逛……</div>' : ''}<div class="sc-fig" id="fig"></div></div>
        <div class="sc-text" id="txt"></div>
        <div class="sc-choices" id="chs"></div>
        <div class="sc-tools"><button id="bp">👥 人物</button><button id="bl">📜 回顾</button><button id="bf">✎ 自己写</button></div>
        <form class="composer" id="fm" style="display:none"><input id="ft" placeholder="写下你想做的事,或想说的话…" autocomplete="off"><button class="btn">发送</button></form>
      </div>`,
    mount(el) {
      const chips = q(el, '#chips'), fig = q(el, '#fig'), txt = q(el, '#txt'), chs = q(el, '#chs'), fm = q(el, '#fm'), ft = q(el, '#ft');
      let busy = false, err = false, alive = true;
      const cast = () => sc.cast.map(charById).filter(Boolean);
      beforeBack = () => { alive = false; save(); return true; };   /* 离开时存档;还没回来的 AI 结果会被丢弃 */

      function draw() {
        const cs = cast(), cur = sc.cur;
        chips.innerHTML = cs.length ? '<span>在场</span>' + cs.map(c => `<button class="chip" data-id="${c.id}">${esc(sceneShort(c))}</button>`).join('') : `<span>${slot0 < 0 ? '这里没有别人' : '这里现在没有人'}</span>`;
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => talkTo(b.dataset.id));
        const sp = cur && cur.dlg && cur.dlg.length ? charById(cur.dlg[cur.dlg.length - 1].who) : null;
        fig.innerHTML = sp && !busy ? `<div class="sprite" style="--c:${sp.color}"><span class="ph">${esc(sp.name[0])}</span><img src="sprite-${sp.id}.png" alt="" onerror="this.style.display='none'"></div><div class="sc-name">${esc(sp.name)}</div>` : '';
        let h = '';
        if (busy) h = '<p class="soft sc-wait">剧情展开中……</p>';
        else if (!cur) h = err ? '<p class="soft sc-wait">没能接上剧情。</p><button class="btn big" id="retry">重试</button>' : '';
        else {
          if (cur.act) h += `<p class="you-say">▶ ${esc(cur.act)}</p>`;
          if (cur.narr) h += `<p class="nar">${esc(cur.narr).replace(/\n/g, '<br>')}</p>`;
          cur.dlg.forEach(d => { const c = charById(d.who); if (c) h += `<div class="sc-line" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${esc(d.t)}</span></div>`; });
        }
        txt.innerHTML = h; txt.scrollTop = 0;
        const rt = q(txt, '#retry'); if (rt) rt.onclick = () => step(null);
        chs.innerHTML = !busy && cur ? cur.cs.map((c, i) => `<button class="sc-opt" data-i="${i}">${esc(c)}</button>`).join('') : '';
        chs.querySelectorAll('.sc-opt').forEach(b => b.onclick = () => step(cur.cs[+b.dataset.i], false));
      }

      async function step(userText, free) {
        if (busy || !aiOk()) return;
        busy = true; err = false;
        const pend = userText ? { k: 'u', t: userText, f: !!free } : null;
        if (pend) sc.log.push(pend);
        draw();
        const rollback = () => { if (pend) { const i = sc.log.indexOf(pend); if (i >= 0) sc.log.splice(i, 1); } };
        try {
          const cs = cast();
          const text = await AI.raw(S.api, sceneMsgs(sceneSystem(loc, cfg, cs, slot0), sc.log), 0.9);
          if (!alive) { rollback(); save(); busy = false; return; }
          const r = sceneParse(text, cs);
          r.narr = sceneStripAgency(r.narr, S.card.name);
          sc.log.push({ k: 'b', n: r.narr, d: r.dlg, cs: r.cs });
          sc.log = sc.log.slice(-40);
          sc.cur = { narr: r.narr, dlg: r.dlg, cs: r.cs.length ? r.cs : FALLBACK, act: userText || '' };
          if (userText) Object.keys(r.rel).forEach(id => { const c = charById(id); if (c && sc.cast.indexOf(id) >= 0) applyDelta(c, r.rel[id]); });
          save();
        } catch (e) {
          rollback(); save();
          if (alive) { toast(e.message); err = true; }
        }
        busy = false; if (alive) draw();
      }
      const talkTo = id => { const c = charById(id); if (c) step('去找' + c.name + '说话', false); };

      q(el, '#bp').onclick = () => {
        const slot = currentSlot(), cs = cast();
        const others = CHARACTERS.filter(c => sc.cast.indexOf(c.id) < 0);
        const where = c => { if (slot < 0) return '回宿舍休息了'; const id = whereIs(c, slot); if (id === p.loc) return '也在这附近'; const l = LOCATIONS.find(x => x.id === id); return '现在在' + (l ? l.name : '城堡的某处'); };
        const m = modalOpen(`<h3>在场(点一下去找TA)</h3>${cs.length ? cs.map(c => `<button class="row" data-id="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>去和${esc(sceneShort(c))}互动</small></span></button>`).join('') : '<p class="soft">现在没有人在这里。</p>'}
          <h3>可以去找谁</h3>${others.map(c => `<div class="row" data-w="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>${esc(where(c))}</small></span></div>`).join('')}
          <button class="btn big ghost" data-close>关闭</button>`);
        m.querySelector('[data-close]').onclick = () => m.remove();
        m.querySelectorAll('button.row').forEach(b => b.onclick = () => { m.remove(); talkTo(b.dataset.id); });
        m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const c = charById(b.dataset.w); toast(c.name.split('·')[0] + ' ' + where(c) + '(去地图上找TA)'); });
      };
      q(el, '#bl').onclick = () => {
        const rows = sc.log.map(e => e.k === 'd' ? `<p class="soft" style="text-align:center;font-size:12px">—— ${esc(e.t)} ——</p>`
          : e.k === 'u' ? `<p class="you-say">▶ ${esc(e.t)}</p>`
          : `<p class="nar">${esc(e.n).replace(/\n/g, '<br>')}</p>` + (e.d || []).map(d => { const c = charById(d.who); return c ? `<div class="sc-line" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${esc(d.t)}</span></div>` : ''; }).join('')).join('');
        const m = modalOpen(`<h3>剧情回顾</h3>${rows || '<p class="soft">还没有内容。</p>'}<button class="btn big ghost" data-close>关闭</button>`);
        m.querySelector('[data-close]').onclick = () => m.remove();
      };
      q(el, '#bf').onclick = () => { fm.style.display = fm.style.display === 'none' ? 'flex' : 'none'; if (fm.style.display === 'flex') ft.focus(); };
      fm.onsubmit = e => { e.preventDefault(); const v = ft.value.trim(); if (!v) return; ft.value = ''; fm.style.display = 'none'; step(v, true); };

      draw();
      if (!sc.cur) step(focusC ? '去找' + focusC.name + '说话' : null, false);
      else if (focusC) step('去找' + focusC.name + '说话', false);
    }
  };
};
