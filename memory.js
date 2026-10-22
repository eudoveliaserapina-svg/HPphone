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
  /* 5. 一起经历过的主线剧情 */
  if (typeof STORY !== 'undefined' && STORY.memory) STORY.memory(c).forEach(t => out.push(t));
  return out;
}
/* 玩家这句话和这些记忆有关系吗?只有明确提到(群、刚才、上次、记得……),或者说到了记忆里出现过的词,才把记忆交给 AI。
   这样平时的聊天不会被无关的群聊内容带偏。 */
const CROSS_CUES = /群|刚才|刚刚|之前|上次|昨天|前天|那天|说过|聊过|记得|提过|告诉过|信里|你们|大家|他们|她们|那件事|那个事/;
const CROSS_STOP = ['你们', '我们', '什么', '今天', '怎么', '这个', '那个', '可以', '不是', '没有', '知道', '一个', '还是', '就是', '自己', '时候', '因为', '所以', '如果', '但是', '已经', '你好', '谢谢', '觉得', '喜欢', '现在', '真的', '一下', '有点', '一起'];
function crossRelevant(userText, lines) {
  const t = String(userText || ''); if (!t) return false;
  if (CROSS_CUES.test(t)) return true;
  const mem = lines.join(''), q = t.replace(/[\s,。!?!?、…“”"「」:;:;,.~~—-]/g, '');
  for (let i = 0; i < q.length - 1; i++) { const g = q.substr(i, 2); if (CROSS_STOP.indexOf(g) < 0 && mem.indexOf(g) >= 0) return true; }
  return false;
}
function crossMemory(c, mode, opt) {
  const l = crossMemoryLines(c, mode, opt);
  return l.length ? '【背景记忆】以下是你在别的场合经历过的事。只有当玩家这句话明确提到、或和它直接相关时才用上,要答得出来;无关就完全忽略,不要主动把它们塞进回答。无论如何,你的回复必须先直接回应玩家刚说的这句话。\n' + l.join('\n') : '';
}
/* 多人场合(群聊、日常剧情)用:每人一行 */
function crossMemoryMulti(chars, mode, opt) {
  return chars.map(c => { const l = crossMemoryLines(c, mode, opt); return l.length ? c.name + '记得:' + l.join(';') : ''; }).filter(Boolean).join('\n');
}

(function () {
  const ask = AI.ask, json = AI.json;
  AI.ask = function (o) {
    let id = null;
    try {
      if (o && o.char) {
        id = o.char.id;
        const last = (o.hist || []).slice().reverse().find(x => x.r === 'user');
        const mem = last && crossRelevant(last.c, crossMemoryLines(o.char, o.mode)) ? crossMemory(o.char, o.mode) : '';
        /* 时间线提醒 + 距离上次联系过了多久(睡一觉跳了很多天之后,角色要知道) */
        const add = [timelineGuard(), gapText(o.char), mem].filter(Boolean).join('\n');
        if (add) o = Object.assign({}, o, { extra: (o.extra ? o.extra + '\n' : '') + add });
      }
    } catch (e) { /* 读取失败不能影响聊天本身 */ }
    const p = ask.call(AI, o);
    return id ? p.then(r => { try { markTalk([id]); } catch (e) { /* ignore */ } return r; }) : p;
  };
  /* 朋友圈、论坛、群聊这些一次生成多个角色内容的请求:同样带上时间线提醒 */
  AI.json = function (cfg, system) {
    const rest = Array.prototype.slice.call(arguments, 2);
    let sys = system; try { sys = system + '\n' + timelineGuard(); } catch (e) { /* ignore */ }
    return json.apply(AI, [cfg, sys].concat(rest));
  };
})();
