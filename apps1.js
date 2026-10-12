/* ===== 共用小工具 ===== */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (arr, r) => arr[Math.floor((r || Math.random)() * arr.length)];
function coinText(k) {
  const g = Math.floor(k / KNUT_PER_GALLEON), s = Math.floor((k % KNUT_PER_GALLEON) / KNUT_PER_SICKLE), n = k % KNUT_PER_SICKLE;
  return `${g} 金加隆 ${s} 银西可 ${n} 纳特`;
}
function priceText(k) { return k >= KNUT_PER_GALLEON ? (k / KNUT_PER_GALLEON).toFixed(1).replace('.0', '') + ' 金加隆' : k >= KNUT_PER_SICKLE ? Math.round(k / KNUT_PER_SICKLE) + ' 银西可' : k + ' 纳特'; }
function addCoins(k) { S.coins = Math.max(0, S.coins + k); save(); }
const gradeNum = () => +S.card.grade || 1;
const aiOk = () => { if (!S.api.key) { toast('还没有填写 API Key'); return false; } return true; };
const idToName = id => (charById(id) || { name: id }).name;
function nudge(c, key, v) {  /* 本地直接调整关系值(购物、兼职等用) */
  const r = rel(c.id); if (key === 'intimacy' && c.role === 'staff') return;
  const nv = Math.max(0, Math.min(100, r[key] + v)); const real = nv - r[key]; if (!real) return;
  r[key] = nv; save(); toast(`${c.name}对你的${key === 'intimacy' ? '亲密度' : '信任度'}${real > 0 ? '提升x' + real : '下降x' + Math.abs(real)}`);
}
function addPoints(house, n) {
  const d = World.now(), k = d.getFullYear() + '-' + (d.getMonth() + 1);
  S.bonus[k] = S.bonus[k] || {}; S.bonus[k][house] = (S.bonus[k][house] || 0) + n; save();
}
function fileToDataUrl(file, maxW, maxH, quality) {
  return new Promise((ok, bad) => {
    const fr = new FileReader();
    fr.onerror = () => bad(new Error('读取图片失败'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => bad(new Error('这个文件不是图片'));
      im.onload = () => {
        const k = Math.min(1, maxW / im.width, maxH / im.height);
        const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', quality));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
const modalOpen = html => { const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="sheet">${html}</div>`; $app.appendChild(m); m.addEventListener('click', e => { if (e.target === m) m.remove(); }); return m; };

/* ===== 学院杯 ===== */
function cupStandings(y, m, upto) {
  const tot = {}; Object.keys(HOUSES).forEach(h => tot[h] = 0);
  for (let d = 1; d <= upto; d++) { const r = rng(`${y}-${m}-${d}-cup`); Object.keys(HOUSES).forEach(h => { tot[h] += Math.floor(r() * 13); }); }
  const b = S.bonus[y + '-' + m] || {}; Object.keys(b).forEach(h => { tot[h] += b[h]; });
  return tot;
}
function cupWidget() {
  const n = World.now(); const t = cupStandings(n.getFullYear(), n.getMonth() + 1, n.getDate());
  const max = Math.max(...Object.values(t), 1);
  return `<div class="widget wd cupw"><div class="wd-l"><small>${n.getMonth() + 1}月 · 学院杯</small><div class="wd-big" style="font-size:20px">${HOUSES[Object.keys(t).sort((a, b) => t[b] - t[a])[0]].name}</div><small>目前领先</small></div>
    <div class="wd-r">${Object.keys(t).sort((a, b) => t[b] - t[a]).map(h => `<div class="slot"><span style="width:56px">${HOUSES[h].name}</span><i class="mini" style="width:${Math.round(t[h] / max * 70)}px"></i><time>${t[h]}</time></div>`).join('')}</div></div>`;
}
SCREENS.cup = () => {
  const n = World.now(), y = n.getFullYear(), m = n.getMonth() + 1, last = new Date(y, m, 0).getDate();
  const t = cupStandings(y, m, n.getDate()), order = Object.keys(t).sort((a, b) => t[b] - t[a]), max = Math.max(...Object.values(t), 1);
  const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y, pt = cupStandings(py, pm, new Date(py, pm, 0).getDate());
  const pc = Object.keys(pt).sort((a, b) => pt[b] - pt[a])[0];
  return {
    html: header('学院杯') + `<div class="scroll">
      ${n.getDate() === last ? `<div class="card" style="text-align:center"><div style="font-size:42px">🏆</div><b class="serif" style="font-size:22px">本月学院杯冠军:${HOUSES[order[0]].name}!</b></div>`
        : `<p class="soft">本月冠军将在 ${m} 月 ${last} 日公布。分数每天刷新。</p>`}
      <div class="card">${order.map((h, i) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between"><b>${i + 1}. ${HOUSES[h].name}${h === S.house ? '(你的学院)' : ''}</b><span>${t[h]} 分</span></div>
        <div class="meterbar"><i style="width:${Math.round(t[h] / max * 100)}%"></i></div></div>`).join('')}</div>
      <p class="soft">上个月(${pm}月)的冠军:${HOUSES[pc].name}</p>
      <p class="tip">在游戏、兼职里表现好,会为你的学院加分;被抓到违规则会扣分。</p></div>`
  };
};

/* ===== 聊天:私聊 / 群聊 / 朋友圈 ===== */
const CHAT_TABS = [['dm', '私聊'], ['group', '群聊'], ['moment', '朋友圈']];
SCREENS.chat = p => {
  const tab = p.tab || 'dm';
  S.fav = S.fav || {};
  const tabs = `<div class="tabs">${CHAT_TABS.map(t => `<button class="${t[0] === tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'dm') {
    const list = CHARACTERS.slice().sort((a, b) => (S.fav[b.id] ? 1 : 0) - (S.fav[a.id] ? 1 : 0));
    body = list.map(c => {
      const r = rel(c.id); const h = S.chats[c.id] || []; const last = [...h].reverse().find(m => m.r !== 'note');
      const sub = c.role === 'staff' ? c.title : HOUSES[c.house].name + ' | 学生';
      return `<div class="contact" data-id="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>${sub}</small>
        <small>${last ? esc(last.c) : (c.role === 'staff' ? '' : '亲密度 ' + r.intimacy + ' · ') + '信任度 ' + r.trust}</small></span>
        <button class="star ${S.fav[c.id] ? 'on' : ''}" data-star="${c.id}">${S.fav[c.id] ? '★' : '☆'}</button></div>`;
    }).join('');
  } else if (tab === 'group') {
    body = `<div style="padding:12px 16px"><button class="btn big" id="newg" style="margin:0">＋ 新建群聊</button></div>` +
      (S.groups.length ? S.groups.map(g => `<div class="contact" data-gid="${g.id}"><div class="av" style="background:var(--t0)">👥</div><span class="grow"><b>${esc(g.name)}</b>
        <small>${g.members.map(idToName).join('、')}</small><small>${g.msgs.length ? esc(g.msgs[g.msgs.length - 1].c) : '还没有消息'}</small></span></div>`).join('') : '<p class="tip" style="padding:0 16px">还没有群聊,拉一个吧。</p>');
  } else {
    body = `<div style="padding:12px 16px;display:flex;gap:8px"><button class="btn" id="newm" style="flex:1">发动态</button><button class="btn ghost" id="refm" style="flex:1">刷新朋友圈</button></div>` +
      (S.moments.length ? S.moments.slice().reverse().map(m => {
        const au = m.author === 'me' ? { name: S.card.name || '我', color: 'var(--t1)' } : charById(m.author);
        return `<div class="moment"><div class="av" style="width:44px;height:44px;font-size:18px;background:${au.color}">${esc(au.name[0])}</div><div class="grow"><b>${esc(au.name)}</b><div class="mtext">${esc(m.text)}</div>
          <small class="soft">${esc(m.time)}</small>${(m.likes && m.likes.length) ? `<div class="mlikes">♥ ${m.likes.map(idToName).join('、')}</div>` : ''}
          ${(m.comments || []).map(c => `<div class="mcm"><b>${esc(c.from === 'me' ? (S.card.name || '我') : idToName(c.from))}</b>:${esc(c.text)}</div>`).join('')}</div></div>`;
      }).join('') : '<p class="tip" style="padding:0 16px">朋友圈还是空的,点“刷新”看看大家在做什么。</p>');
  }
  return {
    html: header('聊天') + tabs + `<div class="scroll flush">${body}</div>`,
    mount(el) {
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { stack[stack.length - 1].p = { tab: b.dataset.tab }; render(); });
      el.querySelectorAll('.contact[data-id]').forEach(r => r.onclick = e => {
        const st = e.target.closest('[data-star]');
        if (st) { S.fav[st.dataset.star] = !S.fav[st.dataset.star]; save(); render(); return; }
        go('chatroom', { id: r.dataset.id });
      });
      el.querySelectorAll('.contact[data-gid]').forEach(r => r.onclick = () => go('groupchat', { gid: r.dataset.gid }));
      const ng = q(el, '#newg'); if (ng) ng.onclick = () => go('groupnew');
      const nm = q(el, '#newm'); if (nm) nm.onclick = () => go('momentnew');
      const rf = q(el, '#refm'); if (rf) rf.onclick = async () => {
        if (!aiOk()) return; rf.disabled = true; rf.textContent = '刷新中…';
        try {
          const pool = CHARACTERS.filter(c => c.role === 'student' || Math.random() < 0.3).sort(() => Math.random() - 0.5).slice(0, 2);
          const j = await AI.json(S.api, '你要为哈利·波特同人手机的朋友圈生成动态。每个角色发一条符合人设的短动态(10 到 40 字),贴近当下的校园生活。格式:{"posts":[{"id":"角色id","text":"内容"}]}',
            '角色:\n' + pool.map(c => `${c.id}(${c.name}):${c.persona}`).join('\n'));
          (j.posts || []).forEach(x => { if (charById(x.id) && x.text) S.moments.push({ author: x.id, text: x.text, time: World.now().toLocaleString('zh-CN', { hour12: false }).slice(5, 16), likes: [], comments: [] }); });
          save(); render();
        } catch (e) { toast(e.message); rf.disabled = false; rf.textContent = '刷新朋友圈'; }
      };
    }
  };
};

SCREENS.groupnew = () => ({
  html: header('新建群聊') + `<div class="scroll"><label class="field"><span>群名</span><input id="gn" placeholder="比如:深夜八卦小分队"></label>
    <p class="soft">选择成员(至少 2 位)</p>${CHARACTERS.map(c => `<label class="row"><input type="checkbox" value="${c.id}" style="width:22px;height:22px">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b></span></label>`).join('')}
    <button class="btn big" id="ok">创建</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = () => {
      const ms = [...el.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value), name = q(el, '#gn').value.trim();
      if (!name) return toast('给群起个名字吧'); if (ms.length < 2) return toast('至少选 2 位成员');
      S.groups.push({ id: 'g' + Date.now(), name, members: ms, msgs: [] }); save(); back();
    };
  }
});

SCREENS.groupchat = p => {
  const g = S.groups.find(x => x.id === p.gid);
  const bub = m => m.r === 'user' ? `<div class="brow me"><div class="b me">${esc(m.c)}</div>${meAvatar('sm')}</div>` : `<div class="brow">${avatar(charById(m.from), 'sm')}<div><div class="gname">${esc(idToName(m.from))}</div><div class="b you">${esc(m.c)}</div></div></div>`;
  return {
    html: header(g.name) + `<div class="msgs" id="ms">${g.msgs.map(bub).join('')}</div><form class="composer" id="f"><input id="t" placeholder="在群里说点什么…" autocomplete="off"><button class="btn">发送</button></form>`,
    mount(el) {
      const ms = q(el, '#ms'), t = q(el, '#t'); let busy = false; const down = () => { ms.scrollTop = ms.scrollHeight; }; down();
      q(el, '#f').onsubmit = async e => {
        e.preventDefault(); const v = t.value.trim(); if (!v || busy) return; if (!aiOk()) return;
        busy = true; t.value = ''; const um = { r: 'user', c: v }; g.msgs.push(um); ms.insertAdjacentHTML('beforeend', bub(um)); save(); down();
        ms.insertAdjacentHTML('beforeend', '<div class="brow" id="typing"><div class="b you">…</div></div>'); down();
        try {
          const mem = g.members.map(charById);
          const j = await AI.json(S.api, `你在为哈利·波特同人手机里的群聊「${g.name}」生成成员的回复。玩家角色:${S.card.name}(${S.card.gender || ''},${GRADES[gradeNum() - 1]},${HOUSES[S.house] ? HOUSES[S.house].name : ''})。
成员及人设:\n${mem.map(c => `${c.id}(${c.name}):${c.persona}`).join('\n')}
各成员当前与玩家关系:${mem.map(c => `${c.name}亲密度${rel(c.id).intimacy}/信任度${rel(c.id).trust}`).join(';')}
${playerCtx()}
让 1 到 3 位最合适的成员回复,每条 1 到 2 句,像群聊,可以互相接话。
关系变化 changes 默认必须是空数组 []。只有玩家这句话真的触动了某位成员(明显让他开心、感动、被冒犯或被冷落)时,才给那一位成员 ±1 到 3 的变化,一次最多 1 位;普通闲聊、寒暄、玩笑一律不给变化。教职工 intimacy 必须为 0。
格式:{"messages":[{"from":"角色id","text":"内容"}],"changes":[{"id":"角色id","intimacy":0,"trust":0}]}`,
            g.msgs.slice(-12).map(m => (m.r === 'user' ? '玩家' : idToName(m.from)) + ':' + m.c).join('\n'));
          const ty = q(el, '#typing'); if (ty) ty.remove();
          (j.messages || []).forEach(x => { if (!g.members.includes(x.from) || !x.text) return; const m = { r: 'ai', from: x.from, c: x.text }; g.msgs.push(m); ms.insertAdjacentHTML('beforeend', bub(m)); });
          const ch = (j.changes || []).filter(x => charById(x.id) && (+x.intimacy || +x.trust)).slice(0, 1);
          const said = new Set((j.messages || []).map(x => x.from));
          ch.forEach(x => applyDelta(charById(x.id), x)); said.forEach(id => { if (charById(id) && !ch.some(x => x.id === id)) applyDelta(charById(id), {}); });
          save(); down();
        } catch (err) { const ty = q(el, '#typing'); if (ty) ty.remove(); toast(err.message); }
        busy = false;
      };
    }
  };
};

SCREENS.momentnew = () => ({
  html: header('发动态') + `<div class="scroll"><textarea id="mt" placeholder="分享此刻的心情…" style="min-height:160px"></textarea><button class="btn big" id="ok">发布</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = async () => {
      const text = q(el, '#mt').value.trim(); if (!text) return toast('写点什么吧');
      const m = { author: 'me', text, time: World.now().toLocaleString('zh-CN', { hour12: false }).slice(5, 16), likes: [], comments: [] };
      S.moments.push(m); save(); toast('已发布'); back();
      if (!S.api.key) return;
      try {
        const pool = CHARACTERS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        const j = await AI.json(S.api, `玩家(${S.card.name})发了一条朋友圈。请让下面的角色按人设和与玩家的关系决定是否点赞、评论(评论 5 到 25 字)。
${pool.map(c => `${c.id}(${c.name}):${c.persona};亲密度${rel(c.id).intimacy}/信任度${rel(c.id).trust}`).join('\n')}
同时评估关系变化(-5~5 的整数,教职工 intimacy 为 0)。格式:{"likes":["角色id"],"comments":[{"from":"角色id","text":"内容"}],"changes":[{"id":"角色id","intimacy":0,"trust":0}]}`, text);
        m.likes = (j.likes || []).filter(charById); m.comments = (j.comments || []).filter(x => charById(x.from) && x.text);
        (j.changes || []).forEach(x => { const c = charById(x.id); if (c) applyDelta(c, x); }); save();
        toast('朋友圈有新动静了');
      } catch (e) { /* 静默失败 */ }
    };
  }
});

/* ===== 设置:角色卡(头像/立绘)、接口、语音 ===== */
SCREENS.settings = () => {
  const imgBox = (k, label) => `<div class="imgbox"><div class="imgprev ${k}" id="pv_${k}">${S.card[k] ? `<img src="${S.card[k]}">` : '<span class="soft">未上传</span>'}</div>
    <label class="btn ghost" style="display:inline-block;margin:6px 0 0">上传${label}<input type="file" accept="image/*" data-up="${k}" hidden></label></div>`;
  return {
    html: header('设置') + `<div class="scroll">
    <div class="card"><h3>角色卡</h3><div class="imgrow">${imgBox('avatarImg', '头像')}${imgBox('portrait', '立绘')}</div>
      ${CARD_FIELDS.filter(f => f[0] !== 'avatar').map(f => fieldHtml(f, S.card[f[0]])).join('')}
      <label class="field"><span>AI 从立绘识别的外貌(可手动修改)</span><textarea data-k="look">${esc(S.card.look || '')}</textarea></label>
      <button class="btn ghost big" id="seeit">让 AI 看看我的立绘</button>
      <p class="soft">学院:${S.house ? HOUSES[S.house].name : '未分院'}(在「分院帽」里更改)</p>
      <button class="btn big" id="sc">保存角色卡</button></div>
    <div class="card"><h3>角色头像</h3><p class="soft">给每个角色传一张头像,聊天、陪伴、通话里都会显示。</p>
      ${CHARACTERS.map(c => `<div class="row">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b></span><label class="btn ghost" style="margin:0;padding:6px 12px">上传<input type="file" accept="image/*" data-cimg="${c.id}" hidden></label></div>`).join('')}</div>
    <div class="card"><h3>游戏时间</h3><p class="soft" id="wl">${World.label()}</p>
      <label class="field"><span>时间流速(游戏里的一天 = 现实多少分钟)</span><select id="wd">${[20, 30, 40, 60].map(n => `<option value="${n}" ${S.world && S.world.dayMin === n ? 'selected' : ''}>${n} 分钟</option>`).join('')}</select></label>
      <button class="btn ghost big" id="wsl">睡到明天早上 7 点</button><button class="btn ghost big" id="wh">快进 1 小时</button><button class="btn ghost big" id="wp">${World.isPaused() ? '继续时间' : '暂停时间'}</button>
      <p class="soft">时间只在小手机页面打开时流动,关掉页面就暂停。</p></div>
    <div class="card"><h3>AI 接口(聊天用)</h3>${fieldHtml(['b_base', '接口地址', 'text'], S.api.base)}${fieldHtml(['b_model', '模型名', 'text'], S.api.model)}
      ${fieldHtml(['b_key', 'API Key', 'text'], S.api.key).replace('type="text"', 'type="password"')}<button class="btn big" id="sa">保存</button></div>
    <div class="card"><h3>识图模型(看立绘用,可选)</h3><p class="soft">需要支持图片输入的模型。留空接口地址和 Key 则沿用上面的聊天接口。</p>
      ${fieldHtml(['v_base', '接口地址', 'text'], S.vision.base)}${fieldHtml(['v_model', '模型名', 'text'], S.vision.model)}${fieldHtml(['v_key', 'API Key', 'text'], S.vision.key).replace('type="text"', 'type="password"')}<button class="btn big" id="sv">保存</button></div>
    <div class="card"><h3>角色语音(ElevenLabs)</h3>
      <p class="soft">目前只有「陪伴」会让角色开口。每个角色填一个 Voice ID,留空就是不发声。注意:ElevenLabs 免费账号不能通过 API 使用“声音库”里的声音,只能用你自己 Voice Design 做出来的声音。</p>
      ${fieldHtml(['t_key', 'ElevenLabs API Key', 'text'], S.tts.key).replace('type="text"', 'type="password"')}
      <label class="field"><span>语音模型</span><select id="t_model"><option value="eleven_multilingual_v2" ${S.tts.model === 'eleven_multilingual_v2' ? 'selected' : ''}>eleven_multilingual_v2(音质最好)</option><option value="eleven_flash_v2_5" ${S.tts.model === 'eleven_flash_v2_5' ? 'selected' : ''}>eleven_flash_v2_5(更快更便宜)</option></select></label>
      <label class="row"><input type="checkbox" id="t_en" ${S.tts.english ? 'checked' : ''} style="width:22px;height:22px"><span class="grow">用英文朗读(角色会同时给出英文版,声音读英文;文字仍显示中文)</span></label>
      <label class="field"><span>稳定度 ${S.tts.stability}(越低越有情绪,越高越平稳)</span><input id="t_st" type="range" min="0" max="1" step="0.05" value="${S.tts.stability}"></label>
      <label class="field"><span>相似度 ${S.tts.similarity}</span><input id="t_si" type="range" min="0" max="1" step="0.05" value="${S.tts.similarity}"></label>
      ${CHARACTERS.map(c => `<label class="field"><span>${esc(c.name)} 的 Voice ID</span><input data-voice="${c.id}" value="${esc(voiceId(c))}" placeholder="留空 = 不发声"></label>`).join('')}
      <button class="btn big" id="st">保存语音设置</button><button class="btn ghost big" id="tt">试听德拉科的声音</button></div>
    <div class="card"><h3>存档(不含 API Key)</h3><textarea id="ta" placeholder="导出的内容会出现在这里;导入时把存档粘贴到这里"></textarea>
      <button class="btn big" id="ex">导出存档</button><button class="btn big ghost" id="im">导入存档</button></div>
    <div class="card"><h3>账号</h3><button class="btn big danger" id="lo">退出登录(清除 Key)</button></div></div>`,
    mount(el) {
      const val = k => (q(el, `[data-k="${k}"]`) || {}).value;
      el.querySelectorAll('[data-up]').forEach(inp => inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return; const k = inp.dataset.up;
        try {
          S.card[k] = await fileToDataUrl(f, k === 'avatarImg' ? 256 : 720, k === 'avatarImg' ? 256 : 1280, k === 'avatarImg' ? 0.8 : 0.72);
          if (!save()) toast('图片太大,浏览器存不下,换一张小一点的'); else { q(el, '#pv_' + k).innerHTML = `<img src="${S.card[k]}">`; toast('已上传'); }
        } catch (e) { toast(e.message); }
      });
      el.querySelectorAll('[data-cimg]').forEach(inp => inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try { S.charImg = S.charImg || {}; S.charImg[inp.dataset.cimg] = await fileToDataUrl(f, 192, 192, 0.8); if (!save()) toast('图片太大,存不下'); else { toast('已更新头像'); render(); } } catch (e) { toast(e.message); }
      });
      q(el, '#wd').onchange = e => { World.setDayMin(+e.target.value); toast('已改为 1 天 = ' + e.target.value + ' 分钟'); };
      q(el, '#wsl').onclick = () => { World.sleep(); q(el, '#wl').textContent = World.label(); toast('你睡了一觉'); };
      q(el, '#wh').onclick = () => { World.advance(60); q(el, '#wl').textContent = World.label(); };
      q(el, '#wp').onclick = () => { if (World.isPaused()) World.resume(); else World.pause(); q(el, '#wp').textContent = World.isPaused() ? '继续时间' : '暂停时间'; };
      q(el, '#seeit').onclick = async () => {
        if (!S.card.portrait) return toast('先上传立绘');
        const cfg = { base: S.vision.base || S.api.base, key: S.vision.key || S.api.key, model: S.vision.model };
        const b = q(el, '#seeit'); b.disabled = true; b.textContent = 'AI 正在看…';
        try {
          const t = await AI.vision(cfg, S.card.portrait, '请用中文简洁描述这张角色立绘的外貌:发色发型、眼睛、肤色、体型、穿着和气质,80 字以内,只描述看到的内容。');
          S.card.look = t; save(); q(el, '[data-k="look"]').value = t; toast('已识别,可以手动修改');
        } catch (e) { toast(e.message); }
        b.disabled = false; b.textContent = '让 AI 看看我的立绘';
      };
      q(el, '#sc').onclick = () => {
        const keys = CARD_FIELDS.filter(f => f[0] !== 'avatar').map(f => f[0]).concat('look'); const v = {};
        keys.forEach(k => { v[k] = (val(k) || '').trim(); });
        if (!v.name) return toast('名字不能为空'); S.card = Object.assign({}, S.card, v); save(); toast('角色卡已保存');
      };
      q(el, '#sa').onclick = () => { const key = val('b_key').trim(); if (!key) return toast('Key 不能为空'); S.api = { base: val('b_base').trim(), model: val('b_model').trim(), key }; save(); toast('已保存'); };
      q(el, '#sv').onclick = () => { S.vision = { base: val('v_base').trim(), model: val('v_model').trim(), key: val('v_key').trim() }; save(); toast('已保存'); };
      const saveTts = () => {
        const voices = {}; el.querySelectorAll('[data-voice]').forEach(i => { if (i.value.trim()) voices[i.dataset.voice] = i.value.trim(); });
        S.tts = { key: val('t_key').trim(), english: q(el, '#t_en').checked, model: q(el, '#t_model').value, stability: +q(el, '#t_st').value, similarity: +q(el, '#t_si').value, voices }; save();
      };
      q(el, '#st').onclick = () => { saveTts(); toast('语音设置已保存'); };
      q(el, '#tt').onclick = async () => {
        saveTts(); primeSpeech(); const d = charById('draco'), b = q(el, '#tt'); b.disabled = true; b.textContent = '生成中…';
        try { const r = await speak(S.tts.english ? "Well, you actually came. Don't just stand there. Come and sit down." : '哼,你居然真的来了。别站在那儿,过来坐吧。', d); toast(r === 'nokey' ? '先填好 Key 和德拉科的 Voice ID' : r === 'blocked' ? '被系统拦下了,再点一次' : '正在播放'); } catch (e) { toast(e.message); }
        b.disabled = false; b.textContent = '试听德拉科的声音';
      };
      q(el, '#ex').onclick = () => {
        const data = JSON.stringify(Object.assign({}, S, { api: Object.assign({}, S.api, { key: '' }), vision: Object.assign({}, S.vision, { key: '' }), tts: Object.assign({}, S.tts, { key: '' }) }));
        const ta = q(el, '#ta'); ta.value = data; ta.select(); toast('已导出,复制保存即可');
      };
      q(el, '#im').onclick = () => {
        try {
          const o = JSON.parse(q(el, '#ta').value); if (!o || typeof o !== 'object' || !o.card) throw new Error('bad');
          S = Object.assign(Store.defaults(), o, { api: S.api, vision: S.vision, tts: Object.assign({}, o.tts || {}, { key: S.tts.key }) }); save(); applyTheme(); toast('导入成功'); render();
        } catch (e) { toast('存档格式不对,没有导入'); }
      };
      q(el, '#lo').onclick = logout;
    }
  };
};

/* ===== 备忘录 ===== */
function checkMemos() {
  const now = World.now().getTime(); let hit = false;
  S.memos.forEach(m => { if (m.at && !m.fired && m.at <= now) { m.fired = true; hit = true; toast('📝 备忘录提醒:' + (m.title || m.body.slice(0, 20))); } });
  if (hit) save();
}
SCREENS.memo = () => ({
  html: header('备忘录', '<button class="btn" id="add" style="padding:6px 14px">＋</button>') + `<div class="scroll flush">${S.memos.length ? S.memos.slice().reverse().map(m =>
    `<div class="contact" data-id="${m.id}"><span class="grow"><b>${esc(m.title || '无标题')}</b><small>${esc(m.body)}</small>${m.at ? `<small>⏰ ${new Date(m.at).toLocaleString('zh-CN', { hour12: false }).slice(5, 16)}${m.fired ? '(已提醒)' : ''}</small>` : ''}</span></div>`).join('') : '<p class="tip" style="padding:16px">还没有备忘录。点右上角的 ＋ 新建。</p>'}
    <p class="tip" style="padding:0 16px">提醒会在你打开小手机时弹出;网页没法在后台推送通知。</p></div>`,
  mount(el) { q(el, '#add').onclick = () => go('memoedit', {}); el.querySelectorAll('.contact').forEach(r => r.onclick = () => go('memoedit', { id: r.dataset.id })); }
});
SCREENS.memoedit = p => {
  const m = S.memos.find(x => x.id === p.id) || { id: 'm' + Date.now(), title: '', body: '' };
  const dt = m.at ? new Date(m.at - new Date(m.at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  return {
    html: header('编辑备忘录') + `<div class="scroll"><label class="field"><span>标题</span><input id="ti" value="${esc(m.title)}"></label><label class="field"><span>内容</span><textarea id="bo" style="min-height:160px">${esc(m.body)}</textarea></label>
      <label class="field"><span>提醒时间(可不填)</span><input id="at" type="datetime-local" value="${dt}"></label><button class="btn big" id="ok">保存</button>${p.id ? '<button class="btn big danger" id="del">删除</button>' : ''}</div>`,
    mount(el) {
      q(el, '#ok').onclick = () => {
        m.title = q(el, '#ti').value.trim(); m.body = q(el, '#bo').value.trim(); if (!m.title && !m.body) return toast('写点内容吧');
        const a = q(el, '#at').value; const at = a ? new Date(a).getTime() : 0; if (at !== m.at) m.fired = false; m.at = at;
        if (!S.memos.includes(m)) S.memos.push(m); save(); back();
      };
      const d = q(el, '#del'); if (d) d.onclick = () => { S.memos = S.memos.filter(x => x !== m); save(); back(); };
    }
  };
};

/* ===== 每日待办 ===== */
function todayTodos() {
  const k = dkey();
  if (!S.todos[k]) {
    const r = rng(k + 'todo'), subs = DAY_PLAN[World.now().getDay()].map(x => x[1]).filter(x => SUBJECTS.includes(x)); const list = [];
    (subs.length ? subs.slice(0, 2) : [pick(SUBJECTS, r)]).forEach(s => list.push({ t: pick(['完成{c}的作业', '复习{c}的笔记', '预习{c}的下一章'], r).replace('{c}', s), done: false }));
    const c = CHARACTERS[Math.floor(r() * CHARACTERS.length)];
    list.push({ t: `和${c.name}的约定:傍晚在${pick(LOCATIONS, r).name}见面`, done: false });
    if (r() < 0.14) { const boss = pick(JOBS.filter(j => !j.grey && j.place === '城堡'), r); list.push({ t: `临时委托:${boss.boss}需要人手(${boss.desc})`, done: false, reward: 87 }); }
    S.todos[k] = list; save();
  }
  return S.todos[k];
}
SCREENS.todo = () => {
  const list = todayTodos();
  return {
    html: header('每日待办') + `<div class="scroll"><p class="soft">${World.now().getMonth() + 1}月${World.now().getDate()}日 · 每天会刷新</p>${list.map((t, i) => `<label class="row todo ${t.done ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${t.done ? 'checked' : ''} style="width:22px;height:22px"><span class="grow">${esc(t.t)}${t.reward ? `<small style="color:var(--today)">完成可得 ${priceText(t.reward)}</small>` : ''}</span></label>`).join('')}
      <div style="display:flex;gap:8px;margin-top:12px"><input id="nt" placeholder="自己加一条…"><button class="btn" id="ad">添加</button></div></div>`,
    mount(el) {
      el.querySelectorAll('input[data-i]').forEach(c => c.onchange = () => {
        const t = list[+c.dataset.i]; t.done = c.checked; if (t.done && t.reward && !t.paid) { t.paid = true; addCoins(t.reward); toast('获得 ' + priceText(t.reward)); } save(); render();
      });
      q(el, '#ad').onclick = () => { const v = q(el, '#nt').value.trim(); if (v) { list.push({ t: v, done: false, custom: true }); save(); render(); } };
    }
  };
};

/* ===== 兼职 ===== */
SCREENS.job = () => {
  const k = dkey(), done = S.jobsDone[k] || 0, wk = [0, 6].includes(World.now().getDay()), g = gradeNum();
  const card = j => `<div class="card"><b>${j.name}</b><div class="soft">${j.place} · ${j.boss} · 报酬 ${priceText(j.pay)}</div><p style="margin:6px 0">${j.desc}</p>
    <button class="btn" data-job="${j.id}">接下这份活</button></div>`;
  const normal = JOBS.filter(j => !j.grey && (j.place === '城堡' || (g >= 4 && wk)));
  const grey = JOBS.filter(j => j.grey && g >= j.grade);
  return {
    html: header('兼职') + `<div class="scroll"><p class="soft">今天已做 ${done}/2 份。${g < 4 ? '四年级之前只能在城堡里做勤工俭学。' : (wk ? '周末可以去霍格莫德村。' : '霍格莫德村的兼职只在周六日开放。')}</p>
      ${normal.map(card).join('')}${grey.length ? `<h3 class="serif" style="margin-top:20px">灰色产业</h3><p class="soft">教授不知道,学生之间也只有少数人知道。有被抓到的风险。</p>${grey.map(card).join('')}` : ''}</div>`,
    mount(el) {
      el.querySelectorAll('[data-job]').forEach(b => b.onclick = () => {
        if ((S.jobsDone[k] || 0) >= 2) return toast('今天太累了,明天再来吧');
        const j = JOBS.find(x => x.id === b.dataset.job); S.jobsDone[k] = (S.jobsDone[k] || 0) + 1;
        if (j.grey && Math.random() < 0.3) {
          addPoints(S.house || 'gryffindor', -5); nudge(charById('mcgonagall'), 'trust', -3); save();
          modalOpen(`<h3>被抓到了!</h3><p>你在“${j.name}”时被巡逻的教师逮个正着,没拿到报酬,学院被扣了 5 分。</p><button class="btn big" data-close>唉</button>`).querySelector('[data-close]').onclick = e => e.target.closest('.modal').remove();
        } else {
          addCoins(j.pay); if (S.house) addPoints(S.house, j.grey ? 0 : 1); const c = j.staff && charById(j.staff); if (c) nudge(c, 'trust', 2);
          modalOpen(`<h3>干完了</h3><p>${j.name}:你拿到了 ${priceText(j.pay)}。</p><button class="btn big" data-close>收下</button>`).querySelector('[data-close]').onclick = e => { e.target.closest('.modal').remove(); render(); };
        }
      });
    }
  };
};

/* ===== 购物 / 仓库 ===== */
SCREENS.shop = p => {
  const tab = p.tab || 'buy';
  const tabs = `<div class="tabs"><button class="${tab === 'buy' ? 'on' : ''}" data-tab="buy">商店</button><button class="${tab === 'bag' ? 'on' : ''}" data-tab="bag">仓库</button></div>`;
  const body = tab === 'buy' ? ITEMS.map(i => `<div class="row"><span style="font-size:30px">${i.emoji}</span><span class="grow"><b>${i.name}</b> <span class="tag">${CAT_NAME[i.cat]}</span><small style="white-space:normal">${i.desc}</small></span><button class="btn" data-buy="${i.id}">${priceText(i.price)}</button></div>`).join('')
    : (Object.keys(S.inv).filter(k => S.inv[k] > 0).map(k => { const i = ITEMS.find(x => x.id === k); return `<div class="row"><span style="font-size:30px">${i.emoji}</span><span class="grow"><b>${i.name}</b> ×${S.inv[k]}<small>${CAT_NAME[i.cat]}</small></span><button class="btn" data-give="${k}">送人</button></div>`; }).join('') || '<p class="tip">仓库是空的,去商店逛逛。</p>');
  return {
    html: header('购物') + `<div class="walletbar">💰 ${coinText(S.coins)}</div>${tabs}<div class="scroll">${body}</div>`,
    mount(el) {
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { stack[stack.length - 1].p = { tab: b.dataset.tab }; render(); });
      el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const i = ITEMS.find(x => x.id === b.dataset.buy); if (S.coins < i.price) return toast('钱不够'); addCoins(-i.price); S.inv[i.id] = (S.inv[i.id] || 0) + 1; save(); toast('已放入仓库:' + i.name); render(); });
      el.querySelectorAll('[data-give]').forEach(b => b.onclick = () => {
        const i = ITEMS.find(x => x.id === b.dataset.give);
        const m = modalOpen(`<h3>把 ${i.emoji}${i.name} 送给谁?</h3>${CHARACTERS.map(c => `<button class="row" data-to="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b></span></button>`).join('')}`);
        m.querySelectorAll('[data-to]').forEach(t => t.onclick = async () => {
          const c = charById(t.dataset.to); m.remove(); S.inv[i.id]--; save();
          const like = c.likes.includes(i.cat), dis = c.dislikes.includes(i.cat);
          nudge(c, 'trust', like ? 2 : dis ? -1 : 1); nudge(c, 'intimacy', like ? 3 : dis ? -2 : 1);
          let line = '';
          if (S.api.key) { try { line = await AI.text(S.api, `你扮演哈利·波特同人里的「${c.name}」。人设:${c.persona}。玩家送了你「${i.name}」(${CAT_NAME[i.cat]}),你${like ? '很喜欢' : dis ? '不太喜欢' : '觉得还行'}。用一句话回应,符合人设。`, '(收到礼物)'); } catch (e) {} }
          modalOpen(`<h3>${esc(c.name)}</h3><p>${esc(line || (like ? '这个……我很喜欢,谢谢。' : dis ? '……你送这个干什么?' : '哦,谢谢。'))}</p><button class="btn big" data-close>好的</button>`).querySelector('[data-close]').onclick = e => { e.target.closest('.modal').remove(); render(); };
        });
      });
    }
  };
};

/* ===== 地图 ===== */
function whereIs(c, slot) {
  const r = rng(dkey() + c.id + slot), hallSlots = [0, 2, 4];
  if (hallSlots.includes(slot)) return r() < 0.9 ? 'hall' : pick(LOCATIONS, r).id;
  if (c.role === 'staff') return c.id === 'snape' ? (slot === 5 ? 'potions' : 'potions') : (slot === 5 ? 'library' : 'transfig');
  if (slot === 1 || slot === 3) return pick(['potions', 'transfig', 'greenhouse', 'library'], r);
  return pick(['library', 'pitch', 'lake', 'room', 'owlery', 'hall'], r);
}
function currentSlot() { const d = World.now(), t = d.getHours() * 60 + d.getMinutes(); let s = -1; SLOTS.forEach((x, i) => { const [h, m] = x[0].split(':'); if (t >= +h * 60 + +m) s = i; }); return t >= 22 * 60 ? -1 : s; }
SCREENS.map = () => {
  const slot = currentSlot(), vis = S.visited[dkey()] || [];
  const nodes = LOCATIONS.map(l => `<g class="node" data-loc="${l.id}"><circle cx="${l.x}" cy="${l.y}" r="5.2" fill="${vis.some(v => v.id === l.id) ? 'var(--today)' : 'var(--t0)'}" stroke="var(--glyph)" stroke-width="1"/><text x="${l.x}" y="${l.y + 1.6}" text-anchor="middle" font-size="5" fill="var(--glyph)">${vis.some(v => v.id === l.id) ? '✓' : '·'}</text><text x="${l.x}" y="${l.y + 10.5}" text-anchor="middle" font-size="4.2" fill="var(--ink)">${l.name}</text></g>`).join('');
  return {
    html: header('霍格沃茨地图') + `<div class="scroll"><p class="soft">${slot < 0 ? '夜深了,大家都回宿舍休息了。你仍然可以自己去城堡里探索,只是不太建议。' : `现在是「${SLOTS[slot][1]}」时段。点一个地点看看有谁在。每天都会刷新。`}</p>
      <svg viewBox="0 0 100 110" class="mapsvg"><path d="M10 40 L30 10 L50 22 L70 8 L92 38 L96 70 L82 100 L28 100 L6 70Z" fill="var(--surface2)" stroke="var(--line)" stroke-width="1.2"/>${nodes}</svg>
      <div class="card"><h3>今天去过的地方</h3>${vis.length ? vis.map(v => `<div>${esc(v.time)} · ${esc(v.name)}</div>`).join('') : '<span class="soft">还没有去过任何地方。角色们会注意到你去了哪里。</span>'}</div></div>`,
    mount(el) {
      el.querySelectorAll('.node').forEach(n => n.onclick = () => {
        const l = LOCATIONS.find(x => x.id === n.dataset.loc);
        const who = slot < 0 ? [] : sceneCast(l.id, slot);
        const m = modalOpen(`<h3>${l.name}</h3>${who.length ? who.map(c => `<div class="row" data-who="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>${pick(l.acts, rng(dkey() + c.id + slot + 'a'))}</small></span></div>`).join('') : '<p class="soft">这里现在没有人。</p>'}
          ${slot < 0 ? '<p class="soft" style="font-size:12px;margin:2px 0 8px">夜深了,不太建议在城堡里乱逛……</p>' : ''}${sceneOn(l.id) ? '<button class="btn big" id="sc">进入日常剧情</button>' : ''}<button class="btn big" id="go">前往${l.name}</button><button class="btn big ghost" data-close>算了</button>`);
        m.querySelector('[data-close]').onclick = () => m.remove();
        if (sceneOn(l.id)) { m.querySelector('#sc').onclick = () => { m.remove(); sceneEnter(l.id); }; m.querySelectorAll('[data-who]').forEach(r => r.onclick = () => { m.remove(); sceneEnter(l.id, r.dataset.who); }); }
        m.querySelector('#go').onclick = () => {
          const d = World.now(); (S.visited[dkey()] = S.visited[dkey()] || []).push({ id: l.id, name: l.name, time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }); save(); m.remove();
          toast('你来到了' + l.name + (who.length ? ',' + who[0].name + '也在这里' : '')); render();
        };
      });
    }
  };
};
