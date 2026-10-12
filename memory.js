/* ===== 跨应用记忆 =====
   聊天、群聊、电话、写信、日常剧情的记录仍然各存各的(S.chats / S.groups / S.mail / S.scenes),
   但角色每次回复前,都会拿到一份“你记得的近况”:自己所在群聊的最近对话、和玩家最近的私聊、
   最近的信、最近在地图地点的日常剧情里说过的话。这样在群聊里聊过的事,私聊时角色就知道。
   实现方式:包一层 AI.ask,聊天/电话/写信/陪伴都不用改;群聊和日常剧情在各自的提示词里调用 crossMemoryLines。 */
function crossMemoryLines(c, mode, opt) {
  opt = opt || {};
  const out = [];
  const who = m => m.r === 'user' ? '玩家' : idToName(m.from);
  /* 1. 自己是成员的群聊(当前正在聊的那个群不用重复,它的记录本来就在提示词里) */
  (S.groups || []).filter(g => g.members.indexOf(c.id) >= 0 && g.id !== opt.skipGroup && g.msgs && g.msgs.length).forEach(g => {
    out.push('群聊「' + g.name + '」里最近的对话(你是群成员,都看到了):' + g.msgs.slice(-8).map(m => who(m) + ':' + String(m.c).slice(0, 50)).join(' / '));
  });
  /* 2. 和玩家最近的私聊(私聊模式本身就带着聊天记录,不用重复) */
  if (mode !== 'chat') {
    const h = (S.chats[c.id] || []).filter(m => m.r === 'user' || m.r === 'assistant').slice(-4);
    if (h.length) out.push('你和玩家最近私聊过:' + h.map(m => (m.r === 'user' ? '玩家' : '你') + ':' + String(m.c).slice(0, 40)).join(' / '));
  }
  /* 3. 最近的信 */
  if (mode !== 'letter') {
    const ml = (S.mail || []).filter(m => m.from === c.id).slice(-1)[0];
    if (ml) out.push('你们最近的一封信(' + (ml.dir === 'in' ? '你寄给玩家的' : '玩家寄给你的') + '):' + String(ml.text).slice(0, 60));
  }
  /* 4. 最近在日常剧情里说过的话 */
  if (!opt.skipScene) {
    const ev = [];
    Object.keys(S.scenes || {}).forEach(id => {
      if (id === opt.skipLoc) return;      /* 当前地点的剧情本来就在提示词里 */
      const sc = S.scenes[id], l = LOCATIONS.find(x => x.id === id);
      (sc.log || []).forEach((e, i, arr) => {
        if (e.k !== 'b') return;
        const mine = (e.l || (e.d || []).map(x => ({ who: x.who, t: x.t }))).filter(x => x.who === c.id);
        if (!mine.length) return;
        let u = ''; for (let k = i - 1; k >= 0; k--) { if (arr[k].k === 'u') { u = arr[k].t; break; } if (arr[k].k !== 'd') break; }
        ev.push({ key: sc.key || '', i, loc: l ? l.name : id, u, t: mine[mine.length - 1].t });
      });
    });
    ev.sort((a, b) => a.key === b.key ? a.i - b.i : (a.key < b.key ? -1 : 1));
    ev.slice(-2).forEach(e => out.push('最近在' + e.loc + '的日常里' + (e.u ? ',玩家选择了「' + e.u + '」' : '') + ',你说过:「' + e.t.slice(0, 40) + '」'));
  }
  return out;
}
function crossMemory(c, mode, opt) {
  const l = crossMemoryLines(c, mode, opt);
  return l.length ? '【你记得的近况,来自群聊、私聊、信件、日常剧情等不同场合。像真的记得一样自然地用上;被问到相关的事要答得出来;不要逐条复述,也不要编造这里没有的细节】\n' + l.join('\n') : '';
}
/* 多人场合(群聊、日常剧情)用:每人一行 */
function crossMemoryMulti(chars, mode, opt) {
  return chars.map(c => { const l = crossMemoryLines(c, mode, opt); return l.length ? c.name + '记得:' + l.join(';') : ''; }).filter(Boolean).join('\n');
}

(function () {
  const ask = AI.ask;
  AI.ask = function (o) {
    try {
      if (o && o.char) {
        const m = crossMemory(o.char, o.mode);
        if (m) o = Object.assign({}, o, { extra: (o.extra ? o.extra + '\n' : '') + m });
      }
    } catch (e) { /* 记忆读取失败不能影响聊天本身 */ }
    return ask.call(AI, o);
  };
})();
