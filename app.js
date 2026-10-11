
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
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function applyTheme() {
  const t = S.theme || 'common', r = document.documentElement;
  r.setAttribute('data-theme', t);
  r.style.setProperty('--wp-lock', 'url("wp-lock-' + t + '.jpg")');
  r.style.setProperty('--wp-home', 'url("wp-home-' + t + '.jpg")');
}
/* 检查壁纸文件有没有传上来,缺了就明确提示 */
function checkAssets() {
  const t = S.theme || 'common', miss = [];
  ['wp-lock-' + t + '.jpg', 'wp-home-' + t + '.jpg'].forEach(f => { const im = new Image(); im.onerror = () => toast('缺少图片文件:' + f + '(要和 index.html 放在一起)'); im.src = f; });
}
const dkey = d => { d = d || World.now(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
function playerCtx() {
  const v = S.visited[dkey()] || [];
  return v.length ? '玩家今天去过:' + v.map(x => x.name + '(' + x.time + ')').join('、') + '。如果合适,可以自然地问起或评论。' : '';
}
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
const avatar = (c, cls) => (S.charImg && S.charImg[c.id])
  ? `<div class="av ${cls || ''}" style="background:url('${S.charImg[c.id]}') center/cover"></div>`
  : `<div class="av ${cls || ''}" style="background:${c.color}">${esc(c.name[0])}</div>`;
const meAvatar = cls => S.card.avatarImg
  ? `<div class="av ${cls || ''}" style="background:url('${S.card.avatarImg}') center/cover"></div>`
  : `<div class="av ${cls || ''}" style="background:var(--t1)">${esc((S.card.name || '我')[0])}</div>`;

/* ---------- 关系值 ---------- */
function rel(id) { if (!S.rel[id]) S.rel[id] = { intimacy: 10, trust: 20 }; return S.rel[id]; }
function applyDelta(c, d) {
  /* 冷却:刚变化过的角色,接下来两条消息里的小幅变化会被忽略,避免“每句话都加分” */
  S.cool = S.cool || {}; const cd = S.cool[c.id] || 0; S.cool[c.id] = Math.max(0, cd - 1);
  const r = rel(c.id); const msgs = []; let changed = false;
  ['intimacy', 'trust'].forEach(k => {
    if (k === 'intimacy' && c.role === 'staff') return;
    let v = parseInt(d && d[k], 10);
    if (!v || isNaN(v)) return;
    v = Math.max(-5, Math.min(5, v));
    if (cd > 0 && Math.abs(v) < 3) return;
    const nv = Math.max(0, Math.min(100, r[k] + v)); const real = nv - r[k];
    if (!real) return;
    r[k] = nv; changed = true;
    msgs.push(`${c.name}对你的${k === 'intimacy' ? '亲密度' : '信任度'}${real > 0 ? '提升x' + real : '下降x' + Math.abs(real)}`);
  });
  if (changed) S.cool[c.id] = 2;
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
  World.start(); applyTheme(); checkAssets(); stack = [{ name: 'login' }];
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

/* ---------- 桌面小组件(中号):今日课程 ---------- */
function scheduleWidget() {
  const d = World.now(); const rows = DAY_PLAN[d.getDay()];
  const now = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  let cur = -1; rows.forEach((r, i) => { if (r[0] <= now) cur = i; });
  const head = cur >= 0 ? rows[cur] : rows[0];
  const rest = rows.slice(cur + 1, cur + 4);
  return `<div class="widget wd"><div class="wd-l"><small>周${WEEK[d.getDay()]} · 今日课程</small>
    <span class="wd-tag">${cur >= 0 ? '现在' : '即将开始'}</span><div class="wd-big">${head[1].split(' · ')[0]}</div><small>${head[0]} 开始</small></div>
    <div class="wd-r">${rest.length ? rest.map(r => `<div class="slot"><time>${r[0]}</time><span>${r[1].split(' · ')[0]}</span></div>`).join('') : '<div class="slot"><span>今天没有更多安排了</span></div>'}</div></div>`;
}

/* ---------- 角色语音:ElevenLabs(每个角色一个 Voice ID)。不使用浏览器自带朗读。 ---------- */
const player = new Audio();
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const voiceCache = new Map();
const voiceId = c => (S.tts.voices && S.tts.voices[c.id]) || '';
const cleanForSpeech = t => String(t).replace(/[（(][^）)]*[）)]|\*[^*]*\*|【[^】]*】|[「」]/g, '').replace(/\s+/g, ' ').trim();
function primeSpeech() { /* iOS 要求在点击时“唤醒”音频播放器,之后才允许异步播放 */
  try { player.src = SILENT; const p = player.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function stopSpeak() { try { player.pause(); } catch (e) {} }
/* 返回:'ok' 已播放 / 'nokey' 没配置 / 'empty' 没有可读的话 / 'blocked' 被系统拦下(需要再点一下播放) */
async function speak(text, c) {
  if (!S.tts.key || !voiceId(c)) return 'nokey';
  const clean = cleanForSpeech(text); if (!clean) return 'empty';
  const ck = voiceId(c) + '|' + S.tts.model + '|' + clean; let url = voiceCache.get(ck);
  if (!url) {
    url = await AI.tts(S.tts, clean, voiceId(c)); voiceCache.set(ck, url);
    if (voiceCache.size > 30) { const k = voiceCache.keys().next().value; URL.revokeObjectURL(voiceCache.get(k)); voiceCache.delete(k); }
  }
  player.src = url; player.volume = 1;
  try { await player.play(); return 'ok'; } catch (e) { return 'blocked'; }
}

/* ================= 页面 ================= */
const APPS = [
  ['chat', '', '聊天'], ['phone', '', '电话'], ['calendar', '', '日历'], ['memo', '', '备忘录'],
  ['companion', '', '陪伴'], ['theater', '', '剧场'], ['games', '', '游戏'], ['todo', '', '待办'],
  ['job', '', '兼职'], ['music', '', '歌曲'], ['map', '', '地图'], ['forum', '', '论坛'],
  ['cup', '', '学院杯'], ['divine', '', '占卜'], ['owl', '', '猫头鹰邮箱'], ['look', '', '外观'],
  ['shop', '', '购物'], ['hat', '', '分院帽'], ['set', '', '设置']
];
const DOCK = ['chat', 'phone', 'owl', 'set'];
const PAGES = [
  ['calendar', 'memo', 'companion', 'theater', 'games', 'todo', 'job', 'music', 'map', 'forum', 'look', 'hat'],
  ['cup', 'divine', 'shop']
];
const ROUTE = { set: 'settings' };
const routeOf = id => ROUTE[id] || id;

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
    <p class="tip">选“一年级”,故事从 1991 年 9 月 1 日开始(和哈利、罗恩、赫敏同一年入学);选更高的年级,故事会从对应的那一年开始。外貌、魔杖、背景等可以进入游戏后在「设置」里补充。</p>
    <button class="btn big" id="ok">收下通知书</button></div>`,
  mount(el) {
    q(el, '#ok').onclick = () => {
      const v = collect(el, ['name', 'gender', 'grade', 'age']);
      if (!v.name) return toast('请填写名字');
      S.card = Object.assign({}, S.card, v); S.world = null; World.init(); save(); next();
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
        S.sortedAt = World.min();
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

/* --- 锁屏(壁纸 + 上滑解锁,整块上推,没有淡入淡出) --- */
SCREENS.lock = () => {
  const h = SCREENS.home();
  return {
    html: h.html + `<div class="lockov" id="ov">
      <div class="top"><button class="back" data-back>✕ 退出</button></div>
      <div class="lockmid"><div class="date" id="dt"></div><div class="clock" id="clk"></div></div>
      <div class="swipe"><b>⌃</b>上滑解锁<div class="bar-line"></div></div></div>`,
    mount(el) {
      h.mount(el);
      const ov = q(el, '#ov');
      const tick = () => {
        if (!q(el, '#clk')) return;
        const n = World.now();
        q(el, '#clk').textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes());
        q(el, '#dt').textContent = `${n.getMonth() + 1}月${n.getDate()}日 星期${WEEK[n.getDay()]}`;
      };
      tick(); every(tick, 1000);
      let y0 = null, dy = 0;
      ov.addEventListener('pointerdown', e => {
        if (e.target.closest('[data-back]')) return;
        y0 = e.clientY; dy = 0; ov.style.transition = 'none'; try { ov.setPointerCapture(e.pointerId); } catch (x) {}
      });
      ov.addEventListener('pointermove', e => {
        if (y0 == null) return;
        dy = Math.min(0, e.clientY - y0); ov.style.transform = `translateY(${dy}px)`;
      });
      const end = () => {
        if (y0 == null) return; y0 = null;
        ov.style.transition = 'transform .26s ease-out';
        if (dy < -window.innerHeight * 0.2) {
          ov.style.transform = 'translateY(-100%)';
          setTimeout(() => { ov.remove(); stack = [{ name: 'home', p: {} }]; }, 270);
        } else { ov.style.transform = 'translateY(0)'; if (Math.abs(dy) < 6) toast('向上滑动解锁'); }
      };
      ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
    }
  };
};

/* --- 桌面:左右滑动的多页 + 底部 Dock,和 iPhone 一样 --- */
const iconSrc = id => { const t = ICONIMG[S.theme || 'common']; return id === 'job' ? ICONIMG.job : (t && t[id]); };
const appBtn = (id, label) => { const src = iconSrc(id);
  return `<button class="app" data-app="${id}">${src ? `<span class="ic img"><img src="${src}" alt=""></span>` : `<span class="ic fb">${svgIcon(id)}</span>`}${label ? `<span class="lb">${APPS.find(a => a[0] === id)[2]}</span>` : ''}</button>`; };
SCREENS.home = () => {
  const n = World.now();
  return {
    html: `<div class="home">
      <div class="owlbar"><button class="back" data-back>🔒 锁屏</button><span id="st"></span></div>
      <div class="pager" id="pg">
        <section class="pg">${scheduleWidget()}<div class="grid">${PAGES[0].map(id => appBtn(id, 1)).join('')}</div></section>
        <section class="pg">${cupWidget()}<div class="grid">${PAGES[1].map(id => appBtn(id, 1)).join('')}</div></section>
      </div>
      <div class="dots" id="dots"><i class="on"></i><i></i></div>
      <div class="dock">${DOCK.map(id => appBtn(id, 0)).join('')}</div></div>`,
    mount(el) {
      const t = () => { const d = World.now(); const s2 = q(el, '#st'); if (s2) s2.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
      t(); every(t, 2000);
      every(() => { const w = q(el, '.widget.wd:not(.cupw)'); if (w) w.outerHTML = scheduleWidget(); }, 8000);
      el.querySelectorAll('[data-app]').forEach(b => b.onclick = () => go(routeOf(b.dataset.app)));
      const pg = q(el, '#pg'), dots = el.querySelectorAll('#dots i');
      pg.addEventListener('scroll', () => {
        const i = Math.round(pg.scrollLeft / pg.clientWidth);
        dots.forEach((d, k) => d.classList.toggle('on', k === i));
      }, { passive: true });
      dots.forEach((d, k) => d.onclick = () => pg.scrollTo({ left: k * pg.clientWidth, behavior: 'smooth' }));
    }
  };
};

/* --- 聊天室 --- */
SCREENS.chatroom = p => {
  const c = charById(p.id);
  const bubble = m => m.r === 'note' ? `<div class="note">${esc(m.c)}</div>` : m.r === 'user' ? `<div class="brow me"><div class="b me">${esc(m.c)}</div>${meAvatar('sm')}</div>` : `<div class="brow">${avatar(c, 'sm')}<div class="b you">${esc(m.c)}</div></div>`;
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
        ms.insertAdjacentHTML('beforeend', `<div class="brow" id="typing">${avatar(c, 'sm')}<div class="b you">…</div></div>`); down();
        try {
          const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: S.chats[c.id], api: S.api, mode: 'chat', extra: playerCtx() });
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
      function say(text) { if (st !== 'connected') return; cap.textContent = text; }
      async function turn(userText, hidden) {
        if (busy) return; busy = true;
        const h = hist.concat([{ r: 'user', c: userText }]);
        if (!hidden) hist.push({ r: 'user', c: userText });
        try {
          const out = await AI.ask({ char: c, card: S.card, house: S.house, rel: rel(c.id), hist: h, api: S.api, mode: 'call', extra: playerCtx() });
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
      cf.onsubmit = e => { e.preventDefault(); primeSpeech(); const v = ci.value.trim(); if (!v) return; ci.value = ''; cap.textContent = '你:' + v; turn(v); };
      draw();
      if (st === 'dialing') setTimeout(() => { if (st === 'dialing') connect(); }, 2000);
    }
  };
};

/* --- 日历(仿 iOS 系统日历,读取内置 HP 节日表) --- */
SCREENS.calendar = () => {
  const n = World.now(); let y = n.getFullYear(), m = n.getMonth() + 1;
  let sel = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return {
    html: header('日历') + `<div class="ios-cal"><div class="cal-head"><div><small id="yy"></small><b id="mm"></b></div>
      <div class="cal-nav"><button id="pv">‹</button><button id="td" class="today-btn">今天</button><button id="nx">›</button></div></div>
      <div class="cal-week">${WEEK.map(w => `<div>${w}</div>`).join('')}</div><div class="cal-grid" id="cg"></div><div class="cal-events" id="ev"></div></div>`,
    mount(el) {
      function events() {
        const hs = HOLIDAYS.filter(h => h.m === sel.getMonth() + 1 && h.d === sel.getDate());
        q(el, '#ev').innerHTML = `<h4>${sel.getMonth() + 1}月${sel.getDate()}日 星期${WEEK[sel.getDay()]}</h4>` +
          (hs.length ? hs.map(h => `<div class="evt"><i></i><div><b>${h.name}</b><small>全天</small></div></div>`).join('') : '<p class="soft" style="margin:0">无日程</p>');
      }
      function draw() {
        q(el, '#yy').textContent = y + '年'; q(el, '#mm').textContent = m + '月';
        const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
        const weeks = Math.ceil((first + days) / 7); let s = '';
        for (let i = 0; i < weeks * 7; i++) {
          const d = new Date(y, m - 1, 1 - first + i);
          const hol = HOLIDAYS.some(h => h.m === d.getMonth() + 1 && h.d === d.getDate());
          s += `<button class="cd ${d.getMonth() !== m - 1 ? 'dim' : ''} ${same(d, n) ? 'today' : ''} ${same(d, sel) ? 'sel' : ''} ${hol ? 'hol' : ''}" data-t="${d.getTime()}"><span class="n">${d.getDate()}</span><span class="dot"></span></button>`;
        }
        q(el, '#cg').innerHTML = s; events();
        el.querySelectorAll('.cd').forEach(b => b.onclick = () => { sel = new Date(+b.dataset.t); y = sel.getFullYear(); m = sel.getMonth() + 1; draw(); });
      }
      const step = k => { m += k; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } draw(); };
      q(el, '#pv').onclick = () => step(-1); q(el, '#nx').onclick = () => step(1);
      q(el, '#td').onclick = () => { sel = new Date(n.getFullYear(), n.getMonth(), n.getDate()); y = n.getFullYear(); m = n.getMonth() + 1; draw(); };
      let x0 = null; const g = q(el, '#cg');
      g.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      g.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
      draw();
    }
  };
};

/* --- 分院帽(每周只能测一次) --- */
SCREENS.hat = () => {
  const left = S.sortedAt + 7 * 1440 - World.min();
  const ok = left <= 0;
  const when = World.at(S.sortedAt + 7 * 1440);
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
