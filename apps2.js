/* ===== 游戏 ===== */
function reward() {
  const k = dkey(), n = S.rewards[k] || 0;
  if (n >= 5) return toast('今天的游戏奖励已经领满了');
  S.rewards[k] = n + 1; addCoins(KNUT_PER_SICKLE); if (S.house) addPoints(S.house, 2); toast('获胜!+1 银西可,学院 +2 分');
}
SCREENS.games = () => ({
  html: header('游戏') + `<div class="walletbar">💰 ${coinText(S.coins)}</div><div class="scroll">
    ${[['frog', '🐸', '巧克力蛙', '花 1 银西可抽一张巫师卡,集齐它们'], ['chess', '♞', '巫师棋(简化版)', '先连成一线的人获胜'], ['snap', '💥', '爆炸牌', '翻牌,别翻到会爆炸的那张'], ['quid', '🧹', '小魁地奇', '20 秒内抓住金色飞贼']].map(g =>
      `<button class="row" data-g="${g[0]}"><span style="font-size:34px">${g[1]}</span><span class="grow"><b>${g[2]}</b><small style="white-space:normal">${g[3]}</small></span></button>`).join('')}
    <p class="tip">获胜可以得到钱币并为学院加分,每天最多领 5 次奖励。</p></div>`,
  mount(el) { el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go('g_' + b.dataset.g)); }
});

SCREENS.g_frog = () => {
  const own = Object.keys(S.frogs).length;
  return {
    html: header('巧克力蛙') + `<div class="walletbar">💰 ${coinText(S.coins)}</div><div class="scroll"><div class="card" style="text-align:center"><div style="font-size:56px">🐸</div><p>每只 1 银西可,里面有一张巫师卡。</p><button class="btn big" id="draw">抽一只(1 银西可)</button></div>
      <h3 class="serif">我的卡册 ${own}/${FROGS.length}</h3>${FROGS.map(f => `<div class="row ${S.frogs[f[0]] ? '' : 'dimrow'}"><span class="tag rar-${f[1]}">${f[1]}</span><span class="grow">${S.frogs[f[0]] ? esc(f[0]) : '？？？'}</span><span>${S.frogs[f[0]] ? '×' + S.frogs[f[0]] : ''}</span></div>`).join('')}</div>`,
    mount(el) {
      q(el, '#draw').onclick = () => {
        if (S.coins < KNUT_PER_SICKLE) return toast('钱不够');
        addCoins(-KNUT_PER_SICKLE); const tot = FROGS.reduce((a, f) => a + FROG_WEIGHT[f[1]], 0); let x = Math.random() * tot, hit = FROGS[0];
        for (const f of FROGS) { x -= FROG_WEIGHT[f[1]]; if (x <= 0) { hit = f; break; } }
        S.frogs[hit[0]] = (S.frogs[hit[0]] || 0) + 1; save();
        modalOpen(`<div style="text-align:center"><div style="font-size:48px">🃏</div><span class="tag rar-${hit[1]}">${hit[1]}</span><h3 class="serif">${esc(hit[0])}</h3><p class="soft">巧克力蛙蹦走了。</p><button class="btn big" data-close>收下</button></div>`).querySelector('[data-close]').onclick = e => { e.target.closest('.modal').remove(); render(); };
      };
    }
  };
};

SCREENS.g_chess = () => ({
  html: header('巫师棋(简化版)') + `<div class="scroll"><p class="soft">你执 ♘,对手执 ♞。先连成一线的人获胜。</p><div class="ttt" id="bd"></div><p id="msg" style="text-align:center;font-weight:700;min-height:28px"></p><button class="btn big" id="re">再来一局</button></div>`,
  mount(el) {
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]; let b, over;
    const won = p => L.some(l => l.every(i => b[i] === p));
    function reset() { b = Array(9).fill(''); over = false; draw(''); }
    function draw(m) { q(el, '#bd').innerHTML = b.map((v, i) => `<button data-i="${i}">${v === 'x' ? '♘' : v === 'o' ? '♞' : ''}</button>`).join(''); q(el, '#msg').textContent = m;
      el.querySelectorAll('#bd button').forEach(c => c.onclick = () => move(+c.dataset.i)); }
    function bot() {
      const find = p => { for (const l of L) { const v = l.map(i => b[i]); if (v.filter(x => x === p).length === 2 && v.includes('')) return l[v.indexOf('')]; } return -1; };
      let i = find('o'); if (i < 0) i = find('x'); if (i < 0 && !b[4]) i = 4; if (i < 0) { const f = b.map((v, k) => v ? -1 : k).filter(k => k >= 0); i = f[Math.floor(Math.random() * f.length)]; } b[i] = 'o';
    }
    function move(i) {
      if (over || b[i]) return; b[i] = 'x';
      if (won('x')) { over = true; draw('你赢了!'); return reward(); }
      if (!b.includes('')) { over = true; return draw('平局'); }
      bot(); if (won('o')) { over = true; return draw('对手赢了'); }
      if (!b.includes('')) { over = true; return draw('平局'); } draw('');
    }
    q(el, '#re').onclick = reset; reset();
  }
});

SCREENS.g_snap = () => ({
  html: header('爆炸牌') + `<div class="scroll"><p class="soft">12 张牌里有 1 张会爆炸。你和对手轮流翻牌,翻到的人输。</p><div class="snapg" id="bd"></div><p id="msg" style="text-align:center;font-weight:700;min-height:28px"></p><button class="btn big" id="re">再来一局</button></div>`,
  mount(el) {
    let bomb, shown, over;
    function reset() { bomb = Math.floor(Math.random() * 12); shown = {}; over = false; draw(''); }
    function draw(m) { q(el, '#bd').innerHTML = Array.from({ length: 12 }, (_, i) => `<button data-i="${i}" class="${shown[i] ? 'open' : ''}">${shown[i] || '🂠'}</button>`).join(''); q(el, '#msg').textContent = m;
      el.querySelectorAll('#bd button').forEach(c => c.onclick = () => flip(+c.dataset.i)); }
    function flip(i) {
      if (over || shown[i]) return;
      if (i === bomb) { shown[i] = '💥'; over = true; return draw('你翻到了爆炸牌,输了'); }
      shown[i] = '💨'; const free = Array.from({ length: 12 }, (_, k) => k).filter(k => !shown[k]);
      const o = free[Math.floor(Math.random() * free.length)];
      if (o === bomb) { shown[o] = '💥'; over = true; draw('对手翻到了爆炸牌,你赢了!'); return reward(); } shown[o] = '💨'; draw('对手翻了一张,轮到你');
    }
    q(el, '#re').onclick = reset; reset();
  }
});

SCREENS.g_quid = () => ({
  html: header('小魁地奇') + `<div class="scroll"><p class="soft">20 秒内点中金色飞贼,抓到 8 次以上算赢。</p><div class="arena" id="ar"><button id="sn" style="display:none">✨</button></div>
    <p id="msg" style="text-align:center;font-weight:700">得分 <span id="sc">0</span> · 剩余 <span id="tm">20</span> 秒</p><button class="btn big" id="st">开始</button></div>`,
  mount(el) {
    const ar = q(el, '#ar'), sn = q(el, '#sn'); let score = 0, left = 20, run = false, mv = null;
    const jump = () => { sn.style.left = Math.random() * 80 + '%'; sn.style.top = Math.random() * 78 + '%'; };
    sn.onclick = () => { if (!run) return; score++; q(el, '#sc').textContent = score; jump(); };
    q(el, '#st').onclick = () => {
      if (run) return; run = true; score = 0; left = 20; q(el, '#sc').textContent = 0; sn.style.display = 'block'; jump();
      mv = every(() => { if (run) jump(); }, 700);
      const t = every(() => {
        left--; q(el, '#tm').textContent = left;
        if (left <= 0) { run = false; clearInterval(t); clearInterval(mv); sn.style.display = 'none'; q(el, '#msg').innerHTML = score >= 8 ? `你抓到了 ${score} 次飞贼,赢了!` : `只抓到 ${score} 次,下次加油`; if (score >= 8) reward(); }
      }, 1000);
    };
  }
});

/* ===== 占卜 ===== */
SCREENS.divine = () => {
  const done = S.divined[dkey()];
  return {
    html: header('占卜') + `<div class="scroll">${done ? `<div class="card"><h3 class="serif">今天的占卜:${esc(done.method)}</h3><p><b>${esc(done.sym)}</b></p><p>${esc(done.text)}</p></div><p class="soft">每天只能占卜一次,明天再来吧。</p>`
      : `<p class="soft">每天选一种方式。结果由占卜师解读。</p>${[['tea', '🍵', '茶叶占卜'], ['ball', '🔮', '水晶球占卜'], ['tarot', '🃏', '塔罗牌占卜']].map(m => `<button class="row" data-m="${m[0]}"><span style="font-size:34px">${m[1]}</span><span class="grow"><b>${m[2]}</b></span></button>`).join('')}`}</div>`,
    mount(el) {
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
        if (!aiOk()) return; const m = b.dataset.m; let sym, name;
        if (m === 'tea') { name = '茶叶占卜'; sym = [0, 1, 2].map(() => pick(TEA_SYMBOLS)).filter((v, i, a) => a.indexOf(v) === i).join('、'); }
        else if (m === 'ball') { name = '水晶球占卜'; sym = pick(BALL_SYMBOLS); }
        else { name = '塔罗牌占卜'; sym = pick(TAROT) + (Math.random() < 0.5 ? '(正位)' : '(逆位)'); }
        b.disabled = true; toast('占卜师正在凝视……');
        try {
          const text = await AI.text(S.api, '你是霍格沃茨的占卜学教授,语气神秘、略带夸张和含糊其辞,但最终给出对玩家今天有一点启发的解读。120 字以内,中文。', `玩家:${S.card.name}。占卜方式:${name}。显现的征兆:${sym}。请解读。`);
          S.divined[dkey()] = { method: name, sym, text }; save(); render();
        } catch (e) { toast(e.message); b.disabled = false; }
      });
    }
  };
};

/* ===== 猫头鹰邮箱 ===== */
async function maybeLetters() {
  if (!S.api.key) return; S.mailAt = S.mailAt || {}; const now = World.min(), DAY = 1440;
  for (const c of contactList()) {
    const r = rel(c.id), last = S.mailAt[c.id] || 0;
    const ok = c.role === 'staff' ? r.trust >= 50 && now - last > 3 * DAY : (r.intimacy >= 35 && now - last > 3 * DAY) || (c.cheerful && r.intimacy >= 15 && now - last > 4 * DAY);
    if (!ok) continue;
    S.mailAt[c.id] = now; save();
    try {
      const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: r, hist: [{ r: 'user', c: '(你想主动给玩家写一封信,说说近况,或者问候一下。)' }], api: S.api, mode: 'letter', extra: playerCtx() });
      S.mail.push({ id: 'l' + now + c.id, from: c.id, dir: 'in', time: World.now().toLocaleString('zh-CN', { hour12: false }).slice(0, 16), text: out.reply, read: false }); save(); toast('🦉 ' + c.name + '给你寄来了一封信');
    } catch (e) { S.mailAt[c.id] = last; save(); break; }
  }
}
SCREENS.owl = p => {
  maybeLetters().then(() => { if (stack[stack.length - 1].name === 'owl') { /* 有新信时下次进入可见 */ } });
  const tab = p.tab || 'in', list = S.mail.filter(m => m.dir === tab).slice().reverse();
  return {
    html: header('猫头鹰邮箱', '<button class="btn" id="wr" style="padding:6px 12px">写信</button>') + `<div class="tabs"><button class="${tab === 'in' ? 'on' : ''}" data-tab="in">收件箱</button><button class="${tab === 'out' ? 'on' : ''}" data-tab="out">已寄出</button></div>
      <div class="scroll flush">${list.length ? list.map(m => `<div class="contact" data-id="${m.id}"><span class="grow"><b>${m.dir === 'in' ? esc(idToName(m.from)) : '寄给 ' + esc(idToName(m.from))} ${m.dir === 'in' && !m.read ? '<span class="tag" style="background:var(--today);color:#fff">新</span>' : ''}</b><small>${esc(m.text)}</small><small>${esc(m.time)}</small></span></div>`).join('') : `<p class="tip" style="padding:16px">${tab === 'in' ? '还没有收到信。和角色的关系变好以后,他们会主动给你寄信。' : '你还没有寄出过信。'}</p>`}</div>`,
    mount(el) {
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { stack[stack.length - 1].p = { tab: b.dataset.tab }; render(); });
      q(el, '#wr').onclick = () => go('owlwrite');
      el.querySelectorAll('.contact').forEach(r => r.onclick = () => {
        const m = S.mail.find(x => x.id === r.dataset.id); m.read = true; save();
        modalOpen(`<h3>${m.dir === 'in' ? '来自 ' : '寄给 '}${esc(idToName(m.from))}</h3><div class="letter" style="font-size:16px;padding:14px">${esc(m.text).replace(/\n/g, '<br>')}</div><button class="btn big" data-close>关上</button>`).querySelector('[data-close]').onclick = e => { e.target.closest('.modal').remove(); render(); };
      });
    }
  };
};
SCREENS.owlwrite = () => ({
  html: header('写信') + `<div class="scroll"><label class="field"><span>寄给</span><select id="to">${contactList().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <textarea id="tx" style="min-height:200px" placeholder="展信佳……"></textarea><button class="btn big" id="ok">交给猫头鹰</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = async () => {
      const text = q(el, '#tx').value.trim(), c = charById(q(el, '#to').value); if (!text) return toast('信还是空的'); if (!aiOk()) return;
      const b = q(el, '#ok'); b.disabled = true; b.textContent = '猫头鹰出发了……';
      const t = World.now().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);
      S.mail.push({ id: 'o' + Date.now(), from: c.id, dir: 'out', time: t, text, read: true }); save();
      try {
        const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: [{ r: 'user', c: '(玩家寄来一封信,请你回信)\n' + text }], api: S.api, mode: 'letter', extra: playerCtx() });
        S.mail.push({ id: 'r' + Date.now(), from: c.id, dir: 'in', time: t, text: out.reply, read: false }); applyDelta(c, out); save(); toast('🦉 收到了回信'); back();
      } catch (e) { toast(e.message); b.disabled = false; b.textContent = '交给猫头鹰'; }
    };
  }
});

/* ===== 论坛 ===== */
const boardList = () => [['house', S.house ? HOUSES[S.house].name + '学院论坛' : '学院论坛'], ['school', '校园论坛']];
SCREENS.forum = p => {
  const bd = p.board || 'house', posts = (S.forum[bd + ':' + (bd === 'house' ? S.house : 'all')] || []).slice().reverse();
  const key = bd + ':' + (bd === 'house' ? S.house : 'all');
  const author = x => x.author === 'me' ? (x.anon ? '匿名巫师(你)' : S.card.name) : x.anon ? '匿名巫师' : idToName(x.author);
  /* 不是联系人、已经登场、没有匿名的同学,旁边显示“加为联系人” */
  const addBtn = x => (x.author !== 'me' && !x.anon && charById(x.author) && avail(charById(x.author)) && !isContact(x.author)) ? ` <button class="btn ghost" data-addc="${x.author}" style="padding:2px 10px;font-size:12px;margin:0">加为联系人</button>` : '';
  return {
    html: header('论坛', '<button class="btn" id="np" style="padding:6px 12px">发帖</button>') + `<div class="tabs">${boardList().map(b => `<button class="${b[0] === bd ? 'on' : ''}" data-b="${b[0]}">${b[1]}</button>`).join('')}</div>
      <div class="scroll"><button class="btn ghost big" id="rf" style="margin:0 0 12px">刷新帖子</button><p class="tip" style="margin-top:0">${bd === 'house' ? '只有本学院的人看得到这里。' : '全校可见。'}</p>
      ${posts.length ? posts.map(x => `<div class="card post" data-pid="${x.id}"><b>${esc(x.title)}</b><div class="soft" style="font-size:13px">${esc(author(x))} · ${esc(x.time)}${addBtn(x)}</div><p style="white-space:pre-wrap">${esc(x.text)}</p>
        ${(x.replies || []).slice(0, 2).map(r => `<div class="mcm"><b>${esc(author(r))}</b>${addBtn(r)}:${esc(r.text)}</div>`).join('')}
        <div class="more" style="display:none">${(x.replies || []).slice(2).map(r => `<div class="mcm"><b>${esc(author(r))}</b>${addBtn(r)}:${esc(r.text)}</div>`).join('')}</div>
        ${(x.replies || []).length > 2 ? `<button class="btn ghost" data-more style="margin:6px 6px 0 0">点开查看(${x.replies.length - 2})</button>` : ''}<button class="btn ghost" data-rp style="margin-top:6px">跟帖</button></div>`).join('') : '<p class="tip">还没有帖子。点“刷新帖子”看看大家在聊什么,或者自己发一个。</p>'}</div>`,
    mount(el) {
      el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { stack[stack.length - 1].p = { board: b.dataset.b }; render(); });
      q(el, '#np').onclick = () => go('forumnew', { board: bd });
      el.querySelectorAll('[data-addc]').forEach(b => b.onclick = () => { const id = b.dataset.addc; if (addContact(id)) { toast('已把' + idToName(id) + '加为联系人(聊天、电话、陪伴里都能找到)'); render(); } });
      el.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { const m = b.parentNode.querySelector('.more'); const open = m.style.display === 'none'; m.style.display = open ? 'block' : 'none'; b.textContent = open ? '收起' : '点开查看'; });
      el.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => {
        const pid = b.closest('.post').dataset.pid;
        const m = modalOpen(`<h3>跟帖</h3><textarea id="rt" style="min-height:100px"></textarea><label class="row" style="margin-top:8px"><input type="checkbox" id="an" style="width:22px;height:22px"><span>匿名</span></label><button class="btn big" id="ok">发送</button>`);
        m.querySelector('#ok').onclick = () => {
          const t = m.querySelector('#rt').value.trim(); if (!t) return toast('写点内容'); const post = (S.forum[key] || []).find(x => x.id === pid);
          post.replies.push({ author: 'me', anon: m.querySelector('#an').checked, text: t, time: '刚刚' }); save(); m.remove(); render();
        };
      });
      q(el, '#rf').onclick = async () => {
        if (!aiOk()) return; const b = q(el, '#rf'); b.disabled = true; b.textContent = '刷新中…';
        const pool = availChars().filter(c => c.role === 'student' && c.postLikely > 0 && (bd === 'school' || c.house === S.house));
        const posters = pool.filter(c => Math.random() < c.postLikely + 0.2);
        const commenters = availChars().filter(c => c.role === 'student' && (bd === 'school' || c.house === S.house));
        try {
          if (!posters.length) { toast('今天论坛有点冷清'); } else {
            const j = await AI.json(S.api, `你在为哈利·波特同人手机的${bd === 'house' ? HOUSES[S.house].name + '学院' : '全校'}论坛生成帖子。每位发帖人按人设发 1 个帖子(标题 + 内容 20~80 字),并为每个帖子生成 1~3 条其他人的跟帖(跟帖人只能来自可跟帖名单,可以是匿名)。性格不爱发帖的人不要发。
发帖人:\n${posters.map(c => `${c.id}(${c.name}):${c.persona}`).join('\n')}
可跟帖名单:${commenters.map(c => c.id + '(' + c.name + ')').join('、')}
格式:{"posts":[{"id":"发帖人id","anon":false,"title":"","text":"","replies":[{"id":"跟帖人id","anon":false,"text":""}]}]}`, '生成现在的论坛内容');
            (S.forum[key] = S.forum[key] || []);
            (j.posts || []).forEach(x => { if (!charById(x.id) || !x.text) return; S.forum[key].push({ id: 'p' + Date.now() + x.id, author: x.id, anon: !!x.anon, title: x.title || '(无标题)', text: x.text, time: '刚刚', replies: (x.replies || []).filter(r => charById(r.id) && r.text).map(r => ({ author: r.id, anon: !!r.anon, text: r.text, time: '刚刚' })) }); });
            save();
          }
        } catch (e) { toast(e.message); }
        render();
      };
    }
  };
};
SCREENS.forumnew = p => ({
  html: header('发帖') + `<div class="scroll"><label class="field"><span>标题</span><input id="ti"></label><label class="field"><span>内容</span><textarea id="tx" style="min-height:160px"></textarea></label>
    <label class="row"><input type="checkbox" id="an" style="width:22px;height:22px"><span>匿名发布</span></label><button class="btn big" id="ok">发布</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = async () => {
      const ti = q(el, '#ti').value.trim(), tx = q(el, '#tx').value.trim(); if (!ti || !tx) return toast('标题和内容都要写');
      const key = p.board + ':' + (p.board === 'house' ? S.house : 'all'); const post = { id: 'p' + Date.now(), author: 'me', anon: q(el, '#an').checked, title: ti, text: tx, time: '刚刚', replies: [] };
      (S.forum[key] = S.forum[key] || []).push(post); save(); back();
      if (!S.api.key) return;
      try {
        const cs = availChars().filter(c => c.role === 'student' && (p.board === 'school' || c.house === S.house)).sort(() => Math.random() - 0.5).slice(0, 3);
        const j = await AI.json(S.api, `论坛里有人发了帖,请 1~3 位同学按人设跟帖(10~40 字,可以是匿名,可以只在评论里吐槽)。${post.anon ? '发帖人是匿名的,大家不知道是谁。' : '发帖人是' + S.card.name + '。'}\n可跟帖:\n${cs.map(c => `${c.id}(${c.name}):${c.persona}`).join('\n')}\n格式:{"replies":[{"id":"角色id","anon":false,"text":""}]}`, ti + '\n' + tx);
        post.replies = (j.replies || []).filter(r => charById(r.id) && r.text).map(r => ({ author: r.id, anon: !!r.anon, text: r.text, time: '刚刚' })); save(); toast('你的帖子有人回复了');
      } catch (e) { /* 静默 */ }
    };
  }
});

/* ===== 歌曲:小手机里自带的播放器(网页读不到别的软件正在播的歌) ===== */
const MUS = { el: new Audio(), title: '', lrc: [], cover: '' };
function parseLrc(t) { const out = []; t.split(/\r?\n/).forEach(l => { const m = [...l.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]; const text = l.replace(/\[[^\]]*\]/g, '').trim(); m.forEach(x => out.push({ t: +x[1] * 60 + +x[2], s: text })); }); return out.filter(x => x.s).sort((a, b) => a.t - b.t); }
SCREENS.music = () => ({
  html: header('歌曲') + `<div class="scroll"><div class="musicbox"><div class="cover" id="cv">${MUS.cover ? `<img src="${MUS.cover}">` : '🎵'}</div><h3 class="serif" id="ti" style="margin:10px 0 0">${esc(MUS.title || '还没有选歌')}</h3>
      <div class="lyric" id="ly"><span class="prev"></span><b class="cur">${MUS.lrc.length ? '' : '导入歌词后,这里会实时显示'}</b><span class="nxt"></span></div>
      <input type="range" id="sk" min="0" max="1000" value="0" style="margin:8px 0"><div style="display:flex;justify-content:center;gap:16px"><button class="btn" id="pp">${MUS.el.paused ? '▶ 播放' : '⏸ 暂停'}</button></div></div>
    <label class="btn ghost big" style="display:block;text-align:center">选择歌曲文件<input type="file" accept="audio/*" id="fa" hidden></label>
    <label class="btn ghost big" style="display:block;text-align:center">导入歌词(.lrc)<input type="file" accept=".lrc,.txt" id="fl" hidden></label>
    <label class="btn ghost big" style="display:block;text-align:center">设置封面<input type="file" accept="image/*" id="fc" hidden></label>
    <p class="tip">网页读取不到手机别的软件正在播放的歌,所以在这里选一首本机的歌来听。离开这个页面后歌曲会继续播放。</p></div>`,
  mount(el) {
    const a = MUS.el, ly = q(el, '#ly'), sk = q(el, '#sk');
    const line = () => {
      if (!document.body.contains(sk)) return; if (a.duration) sk.value = Math.round(a.currentTime / a.duration * 1000);
      if (!MUS.lrc.length) return; let i = -1; MUS.lrc.forEach((x, k) => { if (a.currentTime >= x.t) i = k; });
      q(el, '.prev').textContent = i > 0 ? MUS.lrc[i - 1].s : ''; q(el, '.cur').textContent = i >= 0 ? MUS.lrc[i].s : ''; q(el, '.nxt').textContent = MUS.lrc[i + 1] ? MUS.lrc[i + 1].s : '';
    };
    a.ontimeupdate = line; line();
    sk.oninput = () => { if (a.duration) a.currentTime = sk.value / 1000 * a.duration; };
    q(el, '#pp').onclick = () => { if (!a.src) return toast('先选一首歌'); if (a.paused) { a.play(); q(el, '#pp').textContent = '⏸ 暂停'; } else { a.pause(); q(el, '#pp').textContent = '▶ 播放'; } };
    q(el, '#fa').onchange = e => { const f = e.target.files[0]; if (!f) return; a.src = URL.createObjectURL(f); MUS.title = f.name.replace(/\.[^.]+$/, ''); MUS.lrc = []; a.play().catch(() => {}); render(); };
    q(el, '#fl').onchange = async e => { const f = e.target.files[0]; if (!f) return; MUS.lrc = parseLrc(await f.text()); toast(MUS.lrc.length ? '歌词已导入' : '没有读到带时间的歌词'); render(); };
    q(el, '#fc').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { MUS.cover = await fileToDataUrl(f, 400, 400, 0.8); render(); } catch (x) { toast(x.message); } };
  }
});

/* ===== 陪伴 ===== */
SCREENS.companion = () => ({
  html: header('陪伴') + `<div class="scroll"><p class="soft">选一位角色,安静地待一会儿。可以点一点他,或者说点什么。</p>${contactList().map(c => `<button class="row" data-id="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b></span></button>`).join('')}</div>`,
  mount(el) { el.querySelectorAll('.row').forEach(b => b.onclick = () => { primeSpeech(); go('companionroom', { id: b.dataset.id }); }); }
});
SCREENS.companionroom = p => {
  const c = charById(p.id); let sec = 0, busy = false, last = 0, lastText = '';
  const ready = () => S.tts.key && voiceId(c);
  return {
    html: header('陪伴 · ' + c.name) + `<div class="callbody">${avatar(c, 'xl').replace('class="av ', 'id="tap" class="av ')}<h2 style="margin:6px 0 0">${esc(c.name)}</h2><div class="soft" id="tm">00:00</div>
      <div class="cap" id="cap">轻轻点一下头像试试……</div><button class="replay" id="rp" style="display:none">🔊 播放声音</button>
      <div class="soft" id="vs" style="font-size:13px;min-height:20px">${ready() ? '' : '还没有给这个角色配置声音(设置 → 角色语音),现在只有文字'}</div></div>
      <form class="composer" id="f"><input id="t" placeholder="说点什么…" autocomplete="off"><button class="btn">发送</button></form>`,
    mount(el) {
      const cap = q(el, '#cap'), vs = q(el, '#vs'), rp = q(el, '#rp');
      every(() => { sec++; q(el, '#tm').textContent = pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60); }, 1000);
      beforeBack = () => { stopSpeak(); if (sec >= 300) nudge(c, c.role === 'staff' ? 'trust' : 'intimacy', 1); return true; };
      async function voice() {
        if (!ready() || !lastText) return; vs.textContent = '正在生成声音…'; rp.style.display = 'none';
        try { const r = await speak(lastText, c); vs.textContent = r === 'blocked' ? '系统拦下了自动播放,点“播放声音”收听' : ''; rp.style.display = 'inline-block'; }
        catch (e) { vs.textContent = e.message; }
      }
      async function say(userText, mode) {
        if (busy || !aiOk()) return; busy = true;
        try {
          const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: [{ r: 'user', c: userText }], api: S.api, mode, extra: playerCtx(), wantEn: !!(S.tts.english && ready()) });
          const en = S.tts.english && out.en ? String(out.en) : '';
          cap.innerHTML = esc(out.reply) + (en ? `<div class="soft" style="font-size:14px;margin-top:6px">${esc(en)}</div>` : '');
          lastText = en || out.reply; applyDelta(c, out); busy = false; await voice();
        } catch (e) { toast(e.message); }
        busy = false;
      }
      rp.onclick = () => { primeSpeech(); voice(); };
      q(el, '#tap').onclick = () => { if (Date.now() - last < 2500) return; last = Date.now(); primeSpeech(); say('(玩家轻轻戳了戳你)', 'touch'); };
      q(el, '#f').onsubmit = e => { e.preventDefault(); const v = q(el, '#t').value.trim(); if (!v) return; q(el, '#t').value = ''; primeSpeech(); say(v, 'chat'); };
    }
  };
};

/* ===== 剧场 ===== */
SCREENS.theater = () => ({
  html: header('剧场', '<button class="btn" id="nw" style="padding:6px 12px">新剧本</button>') + `<div class="scroll flush">${S.plays.length ? S.plays.slice().reverse().map(pl => `<div class="contact" data-id="${pl.id}"><span class="grow"><b>${esc(pl.title)}</b><small>${pl.len === 'long' ? '长剧场' : '短剧场'} · ${pl.ended ? '已完结' : '进行到第 ' + pl.turn + ' 幕'}</small><small>${esc(pl.setting.slice(0, 40))}</small></span><button class="star" data-del="${pl.id}">🗑</button></div>`).join('') : '<p class="tip" style="padding:16px">还没有剧本。写下你的设定,选好角色,开始一场自己的故事。</p>'}</div>`,
  mount(el) {
    q(el, '#nw').onclick = () => go('theaternew');
    el.querySelectorAll('.contact').forEach(r => r.onclick = e => {
      const d = e.target.closest('[data-del]'); if (d) { if (confirm('删除这个剧本和它的存档?')) { S.plays = S.plays.filter(x => x.id !== d.dataset.del); save(); render(); } return; }
      go('theaterplay', { id: r.dataset.id });
    });
  }
});
SCREENS.theaternew = () => ({
  html: header('新剧本') + `<div class="scroll"><label class="field"><span>剧本名</span><input id="ti"></label>
    <label class="field"><span>设定 / 背景(AI 会严格按它来写)</span><textarea id="se" style="min-height:140px" placeholder="例如:战后第三年,霍格沃茨重新开学,密室里传出新的动静……"></textarea></label>
    <label class="field"><span>我扮演的角色</span><input id="ro" value="${esc(S.card.name || '')}" placeholder="默认使用我的角色卡"></label>
    <p class="soft">参演角色</p>${contactList().map(c => `<label class="row"><input type="checkbox" value="${c.id}" style="width:22px;height:22px">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b></span></label>`).join('')}
    <label class="field"><span>长度</span><select id="ln"><option value="short">短剧场(约 8 幕)</option><option value="long">长剧场(约 20 幕)</option></select></label><button class="btn big" id="ok">开演</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = () => {
      const ti = q(el, '#ti').value.trim(), se = q(el, '#se').value.trim(), cast = [...el.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value);
      if (!ti || !se) return toast('剧本名和设定都要写'); if (!cast.length) return toast('至少选一位参演角色');
      const pl = { id: 't' + Date.now(), title: ti, setting: se, role: q(el, '#ro').value.trim() || S.card.name, cast, len: q(el, '#ln').value, log: [], turn: 0, ended: false, choices: [] };
      S.plays.push(pl); save(); replace('theaterplay', { id: pl.id });
    };
  }
});
SCREENS.theaterplay = p => {
  const pl = S.plays.find(x => x.id === p.id), total = pl.len === 'long' ? 20 : 8;
  const logHtml = () => pl.log.map(x => x.k === 'n' ? `<p class="nar">${esc(x.t).replace(/\n/g, '<br>')}</p>` : x.k === 'u' ? `<p class="you-say">▶ ${esc(x.t)}</p>` : `<div class="ending">🎬 ${esc(x.t)}</div>`).join('');
  return {
    html: header(pl.title, '<span class="soft" style="font-size:13px">自动存档</span>') + `<div class="scroll" id="lg">${logHtml()}</div><div id="ch" class="choices"></div>
      <form class="composer" id="f"><input id="t" placeholder="或者自己写下你的行动 / 台词…" autocomplete="off"><button class="btn">发送</button></form>`,
    mount(el) {
      const lg = q(el, '#lg'), ch = q(el, '#ch'), f = q(el, '#f'); let busy = false;
      const drawChoices = () => { ch.innerHTML = pl.ended ? '' : (pl.choices || []).map((c, i) => `<button class="opt" data-i="${i}">${esc(c)}</button>`).join(''); f.style.display = pl.ended ? 'none' : 'flex';
        ch.querySelectorAll('.opt').forEach(b => b.onclick = () => step(pl.choices[+b.dataset.i])); lg.scrollTop = lg.scrollHeight; };
      async function step(userText) {
        if (busy || !aiOk()) return; busy = true; ch.innerHTML = '<p class="soft" style="text-align:center">剧情展开中……</p>';
        if (userText) { pl.log.push({ k: 'u', t: userText }); lg.insertAdjacentHTML('beforeend', `<p class="you-say">▶ ${esc(userText)}</p>`); }
        const n = pl.turn + 1, cast = pl.cast.map(charById);
        const sys = `你是一部文字互动剧(类似橙光文游)的叙事者。
剧本《${pl.title}》。设定与背景(必须严格遵守,不得擅自改变其中的事实):${pl.setting}
玩家扮演:${pl.role}。玩家角色卡:${S.card.name},${S.card.gender || ''},${S.card.look || S.card.appearance || ''}
参演角色及人设:\n${cast.map(c => `${c.name}:${c.persona}`).join('\n')}
规则:每轮写 80~220 字的叙述,包含角色之间、角色与玩家之间合乎人设的对话;玩家的台词也由你代写,不要让玩家角色做出违背设定的事。
这是第 ${n}/${total} 幕。${n >= total ? '这一幕必须收束全部剧情并给出结局,choices 返回空数组。' : '剧情要朝着不同的可能结局推进,并给出 3 个玩家可选的行动或台词(每个 10~30 字,走向各不相同)。'}
格式:{"narration":"","choices":["","",""],"ending":null 或 "结局名称:一句话总结"}`;
        const hist = pl.log.slice(-14).map(x => x.k === 'u' ? { role: 'user', content: x.t } : { role: 'assistant', content: x.t });
        try {
          const text = await AI.raw(S.api, [{ role: 'system', content: sys }].concat(hist.length ? hist : [{ role: 'user', content: '(剧本开始,请写开场)' }]).concat(hist.length && hist[hist.length - 1].role === 'assistant' ? [{ role: 'user', content: '(继续)' }] : []));
          const a = text.indexOf('{'), b = text.lastIndexOf('}'); let j; try { j = JSON.parse(text.slice(a, b + 1)); } catch (e) { j = { narration: text, choices: [], ending: null }; }
          pl.turn = n; pl.log.push({ k: 'n', t: j.narration || text }); lg.insertAdjacentHTML('beforeend', `<p class="nar">${esc(j.narration || text).replace(/\n/g, '<br>')}</p>`);
          pl.choices = (j.choices || []).filter(Boolean).slice(0, 3);
          if (j.ending || n >= total) { pl.ended = true; pl.choices = []; const e = j.ending || '故事在这里画上句号'; pl.log.push({ k: 'e', t: e }); lg.insertAdjacentHTML('beforeend', `<div class="ending">🎬 ${esc(e)}</div>`); }
          save();
        } catch (e) { toast(e.message); if (userText) { pl.log.pop(); } }
        busy = false; drawChoices();
      }
      f.onsubmit = e => { e.preventDefault(); const v = q(el, '#t').value.trim(); if (!v) return; q(el, '#t').value = ''; step(v); };
      drawChoices(); if (!pl.log.length) step('');
    }
  };
};
