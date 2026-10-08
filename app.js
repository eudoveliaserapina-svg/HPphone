(() => {
'use strict';

let S = Store.load();
const $app = document.getElementById('app');
let stack = [];
let beforeBack = null;
let timers = [];

/* ---------- 小工具 ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const q = (el, s) => el.querySelector(s);
const charById = id => CHARACTERS.find(c => c.id === id);
const save = () => Store.save(S);
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
const stopSpeak = () => { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} };
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function applyTheme() { document.documentElement.setAttribute('data-theme', S.theme || 'common'); }
function toast(msg) {
  const box = document.getElementById('toasts');
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg; box.appendChild(d);
  setTimeout(() => d.remove(), 2800);
}

/* ---------- 路由 ---------- */
function render() {
  timers.forEach(clearInterval); timers = []; beforeBack = null; stopSpeak();
  const cur = stack[stack.length - 1];
  const sc = SCREENS[cur.name](cur.p || {});
  $app.innerHTML = '<div class="screen">' + sc.html + '</div>';
  if (sc.mount) sc.mount($app.firstChild);
}
const go = (name, p) => { stack.push({ name, p: p || {} }); render(); };
const replace = (name, p) => { stack.pop(); stack.push({ name, p: p || {} }); render(); };
const root = (name, p) => { stack = [{ name, p: p || {} }]; render(); };

function back() {
  if (beforeBack) { const f = beforeBack; beforeBack = null; if (f() === false) return; }
  if (stack.length > 1) { stack.pop(); render(); return; }
  if (stack[0].name === 'home') { root('lock'); return; }
  logout();
}
function logout() {
  if (!confirm('退出登录?会清除本机保存的 API Key,下次登录会重新播放入学通知书。游戏进度会保留。')) return;
  S.api.key = ''; S.seenLetter = false; save(); root('login');
}
document.addEventListener('click', e => { if (e.target.closest('[data-back]')) back(); });

/* 每个页面顶部都有醒目的返回/退出键 */
function header(title, right) {
  const label = stack.length > 1 ? '‹ 返回' : (stack[0].name === 'home' ? '🔒 锁屏' : '✕ 退出');
  return `<header class="bar"><button class="back" data-back>${label}</button><h1>${esc(title)}</h1><div class="bar-r">${right || ''}</div></header>`;
}
const avatar = (c, cls) => `<div class="av ${cls || ''}" style="background:${c.color}">${esc(c.name[0])}</div>`;

/* ---------- 关系值 ---------- */
function rel(id) { if (!S.rel[id]) S.rel[id] = { intimacy: 10, trust: 20 }; return S.rel[id]; }
function applyDelta(c, d) {
  const r = rel(c.id); const msgs = [];
  ['intimacy', 'trust'].forEach(k => {
    if (k === 'intimacy' && c.role === 'staff') return;
    let v = parseInt(d && d[k], 10);
    if (!v || isNaN(v)) return;
    v = Math.max(-5, Math.min(5, v));
    const nv = Math.max(0, Math.min(100, r[k] + v)); const real = nv - r[k];
    if (!real) return;
    r[k] = nv;
    msgs.push(`${c.name}对你的${k === 'intimacy' ? '亲密度' : '信任度'}${real > 0 ? '提升x' + real : '下降x' + Math.abs(real)}`);
  });
  save(); msgs.forEach(toast);
}

/* ---------- 流程 ---------- */
function next() {
  if (!S.api.key) return replace('login');
  if (!S.card.name) return replace('card');
  if (!S.seenLetter) return replace('letter');
  if (!S.house) return replace('sort', { first: true });
  root('lock');
}
function boot() {
  applyTheme(); stack = [{ name: 'login' }];
  if (S.api.key && S.card.name && S.seenLetter && S.house) root('lock'); else next();
}

/* ---------- 表单工具 ---------- */
function fieldHtml(f, val) {
  const [k, label, type, opts] = f; const v = val == null ? '' : val;
  let input;
  if (type === 'textarea') input = `<textarea data-k="${k}">${esc(v)}</textarea>`;
  else if (type === 'select') input = `<select data-k="${k}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  else if (type === 'grade') input = `<select data-k="${k}">${GRADES.map((g, i) => `<option value="${i + 1}" ${(+v || 1) === i + 1 ? 'selected' : ''}>${g}</option>`).join('')}</select>`;
  else input = `<input data-k="${k}" type="${type === 'number' ? 'number' : 'text'}" value="${esc(v)}">`;
  return `<label class="field"><span>${label}</span>${input}</label>`;
}
function collect(el, keys) {
  const out = {};
  keys.forEach(k => { const n = q(el, `[data-k="${k}"]`); if (n) out[k] = n.value.trim(); });
  return out;
}

/* ---------- 桌面小组件:今日课程 ---------- */
function scheduleWidget() {
  const d = new Date(); const rows = DAY_PLAN[d.getDay()];
  const now = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  let cur = -1; rows.forEach((r, i) => { if (r[0] <= now) cur = i; });
  return `<div class="widget"><h3>今日课程 · 周${WEEK[d.getDay()]}</h3>` +
    rows.map((r, i) => `<div class="slot ${i === cur ? 'now' : ''}"><time>${r[0]}</time><span>${r[1]}</span></div>`).join('') + '</div>';
}

/* ---------- 语音 ---------- */
function primeSpeech() { try { if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {} }
function speak(text, c, loud) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  const v = speechSynthesis.getVoices().find(x => /zh[-_]CN/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^zh/i.test(x.lang));
  if (v) u.voice = v;
  u.pitch = c.pitch; u.rate = c.rate; u.volume = loud ? 1 : 0.55;
  speechSynthesis.speak(u);
}

/* ================= 页面 ================= */
const APPS = [
  ['chat', '💬', '聊天'], ['phone', '📞', '电话'], ['calendar', '📅', '日历'], ['memo', '📝', '备忘录'],
  ['companion', '🕯️', '陪伴'], ['theater', '🎭', '剧场'], ['games', '🎲', '游戏'], ['todo', '✅', '待办'],
  ['job', '🧹', '兼职'], ['music', '🎵', '歌曲'], ['map', '🗺️', '地图'], ['forum', '📰', '论坛'],
  ['cup', '🏆', '学院杯'], ['divine', '🔮', '占卜'], ['owl', '🦉', '猫头鹰邮箱'], ['look', '🎨', '外观'],
  ['shop', '🛍️', '购物'], ['hat', '🎩', '分院帽'], ['set', '⚙️', '设置']
];
const READY = ['chat', 'phone', 'calendar', 'look', 'hat', 'set'];
const ROUTE = { chat: 'chat', phone: 'phone', calendar: 'calendar', look: 'look', hat: 'hat', set: 'settings' };

const SCREENS = {};

/* --- 登录(填 Key) --- */
SCREENS.login = () => ({
  html: `<div class="scroll pad"><h1 class="title">霍格沃茨<br>小手机</h1>
    <p class="soft">一部属于你的魔法手机。先填写你自己的 AI 接口,就能开始玩。</p>
    ${fieldHtml(['base', 'API 地址', 'text'], S.api.base)}
    ${fieldHtml(['model', '模型名', 'text'], S.api.model)}
    ${fieldHtml(['key', 'API Key', 'text'], S.api.key).replace('type="text"', 'type="password"')}
    <button class="btn big" id="go">进入霍格沃茨</button>
    <p class="tip">Key 只保存在这台设备的浏览器里,请求直接从你的浏览器发给 AI 服务,不会经过我们的服务器。</p></div>`,
  mount(el) {
    q(el, '#go').onclick = () => {
      const v = collect(el, ['base', 'model', 'key']);
      if (!v.key) return toast('请先填写 API Key');
      S.api = { base: v.base || 'https://api.deepseek.com/v1', model: v.model || 'deepseek-chat', key: v.key };
      save(); next();
    };
  }
});

/* --- 新建角色卡(简版) --- */
SCREENS.card = () => ({
  html: header('创建你的角色') + `<div class="scroll">
    ${fieldHtml(CARD_FIELDS[0], S.card.name)}
    ${fieldHtml(CARD_FIELDS[3], S.card.gender)}
    ${fieldHtml(CARD_FIELDS[5], S.card.grade || 1)}
    ${fieldHtml(CARD_FIELDS[4], S.card.age || 11)}
    <p class="tip">外貌、魔杖、背景等可以进入游戏后在「设置」里补充。</p>
    <button class="btn big" id="ok">收下通知书</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = () => {
      const v = collect(el, ['name', 'gender', 'grade', 'age']);
      if (!v.name) return toast('请填写名字');
      S.card = Object.assign({}, S.card, v); save(); next();
    };
  }
});

/* --- 入学通知书(只在登录后第一次播放) --- */
SCREENS.letter = () => {
  const c = S.card;
  return {
    html: header('猫头鹰送来了一封信') + `<div class="scroll"><div class="stage" id="stage">
      <div class="env" id="env"><div class="body"></div><div class="paper"></div><div class="flap"></div><div class="seal">H</div></div>
      <p class="soft hint-tap" id="hint">点一下信封</p></div></div>`,
    mount(el) {
      const env = q(el, '#env');
      env.onclick = () => {
        if (env.classList.contains('open')) return;
        env.classList.add('open'); q(el, '#hint').style.visibility = 'hidden';
        setTimeout(() => {
          q(el, '#stage').innerHTML = `<div class="letter">
            <h2>霍格沃茨魔法学校</h2>
            <p>亲爱的 ${esc(c.name)}:</p>
            <p>我们很高兴地通知你,你已被录取,将在九月一日进入霍格沃茨学习魔法。随信附有所需书籍与用品的清单。</p>
            <p>开学列车将在九月一日上午从国王十字车站发车。请务必准时,并带上你的猫头鹰、猫或蟾蜍(三选一)。</p>
            <p style="text-align:right">副校长 敬上</p>
            <button class="btn big" id="cont">前往分院</button></div>`;
          q(el, '#cont').onclick = () => { S.seenLetter = true; save(); next(); };
        }, 1700);
      };
    }
  };
};

/* --- 分院测试 --- */
SCREENS.sort = p => {
  let i = 0; const picks = [];
  return {
    html: header('分院帽') + '<div class="scroll" id="box"></div>',
    mount(el) {
      const box = q(el, '#box');
      beforeBack = () => { if (!picks.length) return true; picks.pop(); i--; draw(); return false; };
      function draw() {
        beforeBack = () => { if (!picks.length) return true; picks.pop(); i--; draw(); return false; };
        const Q = QUESTIONS[i];
        box.innerHTML = `<p class="soft">第 ${i + 1} / ${QUESTIONS.length} 题</p><h2 class="serif">${Q.q}</h2>` +
          Q.o.map((o, n) => `<button class="opt" data-n="${n}">${o[0]}</button>`).join('');
        box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          picks.push(Q.o[+b.dataset.n][1]); i++;
          if (i >= QUESTIONS.length) finish(); else draw();
        });
      }
      function finish() {
        beforeBack = null;
        const score = {}; picks.forEach(h => score[h] = (score[h] || 0) + 1);
        const max = Math.max(...Object.values(score));
        const top = Object.keys(score).filter(h => score[h] === max);
        const h = top[Math.floor(Math.random() * top.length)];
        S.sortedAt = Date.now();
        if (p.first || !S.house) {
          S.house = h; save();
          box.innerHTML = `<div class="result"><p class="soft">分院帽喊道——</p><h2 class="serif">${HOUSES[h].name}!</h2><p>${HOUSES[h].blurb}</p>
            <button class="btn big" id="enter">进入小手机</button></div>`;
          q(box, '#enter').onclick = () => root('lock');
        } else if (h === S.house) {
          save();
          box.innerHTML = `<div class="result"><p class="soft">分院帽再次喊道——</p><h2 class="serif">${HOUSES[h].name}!</h2><p>你仍然属于${HOUSES[h].name}。</p>
            <button class="btn big" id="ok">好的</button></div>`;
          q(box, '#ok').onclick = back;
        } else {
          save();
          box.innerHTML = `<div class="result"><p class="soft">这一次,分院帽想把你分进——</p><h2 class="serif">${HOUSES[h].name}</h2>
            <p>要转入${HOUSES[h].name},还是留在${HOUSES[S.house].name}?</p>
            <button class="btn big" id="yes">转入${HOUSES[h].name}</button>
            <button class="btn big ghost" id="no">留在${HOUSES[S.house].name}</button></div>`;
          q(box, '#yes').onclick = () => { S.house = h; save(); toast('你现在是' + HOUSES[h].name + '的学生'); back(); };
          q(box, '#no').onclick = back;
        }
      }
      draw();
    }
  };
};

/* --- 锁屏(整块上推解锁,没有淡入淡出) --- */
SCREENS.lock = () => {
  const h = SCREENS.home();
  const d = new Date();
  return {
    html: h.html + `<div class="lockov" id="ov">
      <div class="top"><button class="back" data-back>✕ 退出</button></div>
      <div><div class="clock" id="clk"></div><div class="date" id="dt"></div></div>
      <div class="swipe"><b>⌃</b>上滑解锁<div class="bar-line"></div></div></div>`,
    mount(el) {
      h.mount(el);
      const ov = q(el, '#ov');
      const tick = () => {
        const n = new Date();
        q(el, '#clk').textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes());
        q(el, '#dt').textContent = `${n.getMonth() + 1}月${n.getDate()}日 星期${WEEK[n.getDay()]}`;
      };
      tick(); every(tick, 1000);
      let y0 = null, dy = 0;
      ov.addEventListener('pointerdown', e => {
        if (e.target.closest('[data-back]')) return;
        y0 = e.clientY; dy = 0; ov.style.transition = 'none'; ov.setPointerCapture(e.pointerId);
      });
      ov.addEventListener('pointermove', e => {
        if (y0 == null) return;
        dy = Math.min(0, e.clientY - y0); ov.style.transform = `translateY(${dy}px)`;
      });
      const end = () => {
        if (y0 == null) return; y0 = null;
        ov.style.transition = 'transform .26s ease-out';
        if (dy < -window.innerHeight * 0.22) {
          ov.style.transform = 'translateY(-100%)';
          setTimeout(() => { ov.remove(); stack = [{ name: 'home', p: {} }]; }, 270);
        } else ov.style.transform = 'translateY(0)';
      };
      ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
      ov.addEventListener('click', e => { if (!e.target.closest('[data-back]') && Math.abs(dy) < 4) toast('向上滑动解锁'); });
    }
  };
};

/* --- 桌面 --- */
SCREENS.home = () => ({
  html: `<div class="home"><div class="statusbar" style="padding-top:calc(env(safe-area-inset-top,0px) + 6px)"><span>${HOUSES[S.house] ? HOUSES[S.house].name : '霍格沃茨'}</span><span id="st"></span></div>
    ${scheduleWidget()}
    <div class="grid">${APPS.map(a => `<button class="app ${READY.includes(a[0]) ? '' : 'dim'}" data-app="${a[0]}"><span class="ic">${a[1]}</span>${a[2]}</button>`).join('')}</div>
    <p class="tip" style="text-align:center;margin-top:22px">灰色的软件还在建设中</p></div>`,
  mount(el) {
    const t = () => { const n = new Date(); const s = q(el, '#st'); if (s) s.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes()); };
    t(); every(t, 30000);
    el.querySelectorAll('[data-app]').forEach(b => b.onclick = () => {
      const id = b.dataset.app;
      if (!READY.includes(id)) return toast('这个软件还在建设中');
      go(ROUTE[id]);
    });
    /* 桌面自带返回键:锁屏 */
    {
      const lockBtn = document.createElement('button');
      lockBtn.className = 'back'; lockBtn.dataset.back = '1'; lockBtn.textContent = '🔒 锁屏';
      lockBtn.style.cssText = 'position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:5;min-width:0';
      el.appendChild(lockBtn);
    }
  }
});

/* --- 聊天列表 --- */
SCREENS.chat = () => ({
  html: header('聊天') + `<div class="scroll">${CHARACTERS.map(c => {
    const r = rel(c.id); const h = S.chats[c.id] || []; const last = [...h].reverse().find(m => m.r !== 'note');
    return `<button class="row" data-id="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b> <span class="tag">${c.role === 'staff' ? '教职工' : HOUSES[c.house].name}</span>
      <small>${last ? esc(last.c) : '还没有消息'}</small><small>${c.role === 'staff' ? '' : '亲密度 ' + r.intimacy + '  '}信任度 ${r.trust}</small></span></button>`;
  }).join('')}<p class="tip">群聊、朋友圈会在后续版本加入。</p></div>`,
  mount(el) { el.querySelectorAll('.row').forEach(b => b.onclick = () => go('chatroom', { id: b.dataset.id })); }
});

/* --- 聊天室 --- */
SCREENS.chatroom = p => {
  const c = charById(p.id);
  const bubble = m => m.r === 'note' ? `<div class="note">${esc(m.c)}</div>` : `<div class="b ${m.r === 'user' ? 'me' : 'you'}">${esc(m.c)}</div>`;
  const meters = () => { const r = rel(c.id); return (c.role === 'staff' ? '' : `<span>亲密度 ${r.intimacy}<i style="width:${r.intimacy * 0.6}px"></i></span>`) + `<span>信任度 ${r.trust}<i style="width:${r.trust * 0.6}px"></i></span>`; };
  return {
    html: header(c.name) + `<div class="meters" id="mt">${meters()}</div><div class="msgs" id="ms">${(S.chats[c.id] || []).map(bubble).join('')}</div>
      <form class="composer" id="f"><input id="t" placeholder="说点什么…" autocomplete="off"><button class="btn">发送</button></form>`,
    mount(el) {
      const ms = q(el, '#ms'), t = q(el, '#t'); let busy = false;
      const down = () => { ms.scrollTop = ms.scrollHeight; }; down();
      const push = m => { (S.chats[c.id] = S.chats[c.id] || []).push(m); ms.insertAdjacentHTML('beforeend', bubble(m)); save(); down(); };
      q(el, '#f').onsubmit = async e => {
        e.preventDefault(); const v = t.value.trim(); if (!v || busy) return;
        busy = true; t.value = ''; push({ r: 'user', c: v });
        ms.insertAdjacentHTML('beforeend', '<div class="b you" id="typing">…</div>'); down();
        try {
          const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: S.chats[c.id], api: S.api, mode: 'chat' });
          const ty = q(el, '#typing'); if (ty) ty.remove();
          push({ r: 'assistant', c: out.reply }); applyDelta(c, out); q(el, '#mt').innerHTML = meters();
        } catch (err) { const ty = q(el, '#typing'); if (ty) ty.remove(); toast(err.message); }
        busy = false;
      };
    }
  };
};

/* --- 电话:选人 --- */
SCREENS.phone = () => ({
  html: header('电话') + `<div class="scroll"><p class="soft">一次只能和一个人通话。可以直接打字,角色会用声音回答你。</p>${CHARACTERS.map(c =>
    `<button class="row" data-id="${c.id}">${avatar(c)}<span class="grow"><b>${esc(c.name)}</b><small>点击拨打</small></span><span style="font-size:24px">📞</span></button>`).join('')}</div>`,
  mount(el) { el.querySelectorAll('.row').forEach(b => b.onclick = () => { primeSpeech(); go('call', { id: b.dataset.id }); }); }
});

/* --- 通话界面 --- */
SCREENS.call = p => {
  const c = charById(p.id);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let st = p.incoming ? 'ringing' : 'dialing', sec = 0, muted = false, spk = false, busy = false; const hist = [];
  return {
    html: header('通话') + `<div class="callbody ${st === 'connected' ? '' : 'ringing'}" id="cb">${avatar(c, 'xl')}<h2 style="margin:6px 0 0">${esc(c.name)}</h2>
      <div class="soft" id="cs"></div><div class="cap" id="cap">&nbsp;</div></div>
      <div class="ctrls" id="ct"></div>
      <form class="composer" id="cf" style="display:none"><input id="ci" placeholder="打字回复…" autocomplete="off"><button class="btn">发送</button></form>`,
    mount(el) {
      const cs = q(el, '#cs'), cap = q(el, '#cap'), ct = q(el, '#ct'), cf = q(el, '#cf'), ci = q(el, '#ci');
      const mmss = () => pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
      const btn = (act, ic, label, cls) => `<button class="cbtn ${cls || ''}" data-act="${act}"><span class="c">${ic}</span>${label}</button>`;
      function draw() {
        q(el, '#cb').classList.toggle('ringing', st !== 'connected');
        cs.textContent = st === 'ringing' ? '来电…' : st === 'dialing' ? '正在呼叫…' : mmss();
        cf.style.display = st === 'connected' ? 'flex' : 'none';
        ct.innerHTML = st === 'ringing' ? btn('hang', '✕', '挂断', 'red') + btn('answer', '✆', '接听', 'green')
          : st === 'dialing' ? btn('hang', '✕', '挂断', 'red')
          : btn('mute', muted ? '🔇' : '🔈', '静音', muted ? 'on' : '') + btn('spk', '📢', '免提', spk ? 'on' : '')
            + (SR ? btn('mic', '🎙', '说话') : '') + btn('hang', '✕', '挂断', 'red');
      }
      function say(text) { if (st !== 'connected') return; cap.textContent = text; if (!muted) speak(text, c, spk); }
      async function turn(userText, hidden) {
        if (busy) return; busy = true;
        const h = hist.concat([{ r: 'user', c: userText }]);
        if (!hidden) hist.push({ r: 'user', c: userText });
        try {
          const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: h, api: S.api, mode: 'call' });
          if (st !== 'connected') { busy = false; return; }
          hist.push({ r: 'assistant', c: out.reply }); say(out.reply); applyDelta(c, out);
        } catch (err) { toast(err.message); }
        busy = false;
      }
      function connect() {
        st = 'connected'; sec = 0; draw(); every(() => { sec++; cs.textContent = mmss(); }, 1000);
        turn('(电话接通了,请你自然地先开口说话)', true);
      }
      beforeBack = () => {
        stopSpeak();
        const wasOn = st === 'connected'; st = 'ended';
        if (wasOn && sec > 0) { (S.chats[c.id] = S.chats[c.id] || []).push({ r: 'note', c: '通话 ' + mmss() }); save(); }
        return true;
      };
      ct.onclick = e => {
        const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
        if (a === 'hang') back();
        else if (a === 'answer') { primeSpeech(); connect(); }
        else if (a === 'mute') { muted = !muted; if (muted) stopSpeak(); draw(); }
        else if (a === 'spk') { spk = !spk; draw(); toast(spk ? '免提已开(音量调大)' : '免提已关'); }
        else if (a === 'mic' && SR) {
          const r = new SR(); r.lang = 'zh-CN';
          r.onresult = ev => { const t = ev.results[0][0].transcript; ci.value = ''; cap.textContent = '你:' + t; turn(t); };
          r.onerror = () => toast('没能听清,可以直接打字');
          try { r.start(); toast('请说话…'); } catch (err) { toast('麦克风不可用,可以直接打字'); }
        }
      };
      cf.onsubmit = e => { e.preventDefault(); const v = ci.value.trim(); if (!v) return; ci.value = ''; cap.textContent = '你:' + v; turn(v); };
      draw();
      if (st === 'dialing') setTimeout(() => { if (st === 'dialing') connect(); }, 2000);
    }
  };
};

/* --- 日历(读取内置的 HP 节日表) --- */
SCREENS.calendar = () => {
  const n = new Date(); let y = n.getFullYear(), m = n.getMonth() + 1;
  return {
    html: header('日历') + `<div class="scroll"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <button class="btn" id="pv">‹</button><b class="serif" id="ym" style="font-size:20px"></b><button class="btn" id="nx">›</button></div>
      <div class="cal" id="cal"></div><div id="hl" style="margin-top:16px"></div></div>`,
    mount(el) {
      function draw() {
        q(el, '#ym').textContent = `${y}年${m}月`;
        const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
        const hols = HOLIDAYS.filter(h => h.m === m);
        let s = WEEK.map(w => `<div class="h">${w}</div>`).join('') + '<div class="d empty"></div>'.repeat(first);
        for (let d = 1; d <= days; d++) {
          const isT = y === n.getFullYear() && m === n.getMonth() + 1 && d === n.getDate();
          s += `<div class="d ${isT ? 'today' : ''} ${hols.some(h => h.d === d) ? 'hol' : ''}">${d}</div>`;
        }
        q(el, '#cal').innerHTML = s;
        q(el, '#hl').innerHTML = hols.length ? hols.sort((a, b) => a.d - b.d).map(h => `<div class="card">${m}月${h.d}日<br><b>${h.name}</b></div>`).join('') : '<p class="soft">这个月没有特别的日子。</p>';
      }
      q(el, '#pv').onclick = () => { m--; if (m < 1) { m = 12; y--; } draw(); };
      q(el, '#nx').onclick = () => { m++; if (m > 12) { m = 1; y++; } draw(); };
      draw();
    }
  };
};

/* --- 分院帽(每周只能测一次) --- */
SCREENS.hat = () => {
  const left = S.sortedAt + 7 * 864e5 - Date.now();
  const ok = left <= 0;
  const when = new Date(S.sortedAt + 7 * 864e5);
  return {
    html: header('分院帽') + `<div class="scroll"><div class="result"><div style="font-size:64px">🎩</div>
      <p class="soft">你现在是</p><h2 class="serif">${S.house ? HOUSES[S.house].name : '未分院'}</h2>
      ${ok ? '<p>想让分院帽再看你一次吗?</p><button class="btn big" id="re">重新测试</button>'
           : `<p class="soft">每周只能测试一次。下次可测试:${when.getMonth() + 1}月${when.getDate()}日 ${pad2(when.getHours())}:${pad2(when.getMinutes())}</p>`}</div></div>`,
    mount(el) { const b = q(el, '#re'); if (b) b.onclick = () => replace('sort', { first: false }); }
  };
};

/* --- 外观 --- */
SCREENS.look = () => ({
  html: header('外观') + `<div class="scroll">${Object.keys(THEMES).map(k =>
    `<button class="row" data-k="${k}"><span class="swatch">${THEMES[k].sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><span class="grow"><b>${THEMES[k].name}</b></span><span>${S.theme === k ? '✓' : ''}</span></button>`).join('')}</div>`,
  mount(el) { el.querySelectorAll('.row').forEach(b => b.onclick = () => { S.theme = b.dataset.k; save(); applyTheme(); render(); }); }
});

/* --- 设置:角色卡 / 接口 / 存档 --- */
SCREENS.settings = () => ({
  html: header('设置') + `<div class="scroll">
    <div class="card"><h3>角色卡</h3>${CARD_FIELDS.map(f => fieldHtml(f, S.card[f[0]])).join('')}
      <p class="soft">学院:${S.house ? HOUSES[S.house].name : '未分院'}(在「分院帽」里更改)</p>
      <button class="btn big" id="sc">保存角色卡</button></div>
    <div class="card"><h3>AI 接口</h3>${fieldHtml(['base', 'API 地址', 'text'], S.api.base)}${fieldHtml(['model', '模型名', 'text'], S.api.model)}
      ${fieldHtml(['key', 'API Key', 'text'], S.api.key).replace('type="text"', 'type="password"')}<button class="btn big" id="sa">保存接口设置</button></div>
    <div class="card"><h3>存档(不含 API Key)</h3><textarea id="ta" placeholder="导出的内容会出现在这里;导入时把存档粘贴到这里"></textarea>
      <button class="btn big" id="ex">导出存档</button><button class="btn big ghost" id="im">导入存档</button></div>
    <div class="card"><h3>账号</h3><button class="btn big danger" id="lo">退出登录(清除 Key)</button></div></div>`,
  mount(el) {
    q(el, '#sc').onclick = () => { const v = collect(el, CARD_FIELDS.map(f => f[0])); if (!v.name) return toast('名字不能为空'); S.card = Object.assign({}, S.card, v); save(); toast('角色卡已保存'); };
    q(el, '#sa').onclick = () => {
      const base = q(el, 'input[data-k="base"]').value.trim(), model = q(el, 'input[data-k="model"]').value.trim(), key = q(el, 'input[data-k="key"]').value.trim();
      if (!key) return toast('Key 不能为空'); S.api = { base, model, key }; save(); toast('接口设置已保存');
    };
    q(el, '#ex').onclick = () => {
      const data = JSON.stringify(Object.assign({}, S, { api: { base: S.api.base, model: S.api.model, key: '' } }));
      const ta = q(el, '#ta'); ta.value = data; ta.select(); toast('已导出,复制保存即可');
    };
    q(el, '#im').onclick = () => {
      try {
        const o = JSON.parse(q(el, '#ta').value);
        if (!o || typeof o !== 'object' || !o.card) throw new Error('bad');
        S = Object.assign(Store.defaults(), o, { api: S.api }); save(); applyTheme(); toast('导入成功'); render();
      } catch (e) { toast('存档格式不对,没有导入'); }
    };
    q(el, '#lo').onclick = logout;
  }
});

boot();
})();
