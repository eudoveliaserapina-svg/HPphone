/* ===== 日常橙光剧情(视觉小说版) =====
   入口:地图 → 点地点 → 「进入日常剧情」(或点弹窗里的在场人物)。
   进场:先是一段旁白(扫一眼:这里有什么、谁在做什么),然后只能点 AI 准备好的选项,不能自己输入。
   画面:整屏背景 + 底部窄窄的半透明对话框(点一下翻页,太长会分到下一个框)+ 顶部「回顾」。
   立绘:角色第一次开口时才出现;背景图 scene-<地点>.jpg、立绘 sprite-<角色id>.png 放在 index.html 旁边,缺图自动用占位。
   要开放新地点:在 SCENE_LOCS 里加一项。fixed = 测试用固定在场人物,不写就用地图的 whereIs 规则。
   存档:S.scenes[地点id] = { key, cast, log, cur, focus },只新增这一个字段,旧存档不受影响。
   节奏:日常剧情要短。去找谁就只和谁说话,其他人默认不出现;每一段最多 3 句。 */
const SCENE_LOCS = {
  hall:       { bg: 'scene-hall.jpg',       desc: '霍格沃茨的大礼堂:四张长长的学院长桌,高高的天花板映着外面的天空,半空中悬浮着蜡烛,教师席在最前方。' },
  library:    { bg: 'scene-library.jpg',    desc: '霍格沃茨图书馆:高耸的书架一排排延伸进昏暗处,铜灯投下暖黄的光,空气里有旧纸的味道,管理员的目光盯着每一张桌子。' },
  potions:    { bg: 'scene-potions.jpg',    desc: '城堡地下的魔药教室:石墙潮湿阴凉,一排排坩埚冒着细细的烟,架子上的玻璃罐里泡着各种古怪的药材。' },
  transfig:   { bg: 'scene-transfig.jpg',   desc: '变形术教室:整齐的课桌,黑板上留着没擦干净的咒语笔记,窗台上摆着几件被变成别的东西的小摆件。' },
  greenhouse: { bg: 'scene-greenhouse.jpg', desc: '温室:玻璃穹顶下潮湿温热,一排排花盆里长着叫不出名字的植物,有的在轻轻摆动。' },
  owlery:     { bg: 'scene-owlery.jpg',     desc: '猫头鹰棚屋:高处的石塔,没有玻璃的拱窗灌进风,横梁上落着各色猫头鹰,地上铺着干草和散落的羽毛。' },
  pitch:      { bg: 'scene-pitch.jpg',      desc: '魁地奇球场:开阔的草地,两端立着高高的金色球门环,四周是木制看台,风很大。' },
  lake:       { bg: 'scene-lake.jpg',       desc: '黑湖岸边:湖面又深又静,远处是群山的剪影,偶尔有巨大的触手在水面划出一圈波纹。' },
  room:       { bg: 'scene-room.jpg',       desc: '有求必应屋:房间会按需要变化,此刻像一间堆满杂物、光线朦胧的大屋子,角落里似乎有什么在发微光。' }
};
var SCENE_TYPE_MS = 26;      /* 打字机速度(毫秒/字) */
const SCENE_PAGE = 50;       /* 一个对话框最多放多少字 */
const sceneOn = id => !!SCENE_LOCS[id];

/* 这个地点此刻谁在场。夜里没有人。非开放地点和地图原规则完全一样。 */
function sceneCast(locId, slot) {
  if (slot < 0) return [];
  const cfg = SCENE_LOCS[locId];
  if (cfg && cfg.fixed) return cfg.fixed.map(charById).filter(Boolean);
  return CHARACTERS.filter(c => (!c.map || c.map.indexOf(locId) >= 0) && whereIs(c, slot) === locId);   /* c.map 限制角色能出现的地点 */
}
const sceneShort = c => { const p = c.name.split('·'); return c.role === 'staff' ? p[p.length - 1] : p[0]; };
const sceneRelLine = c => { const r = rel(c.id); return c.role === 'staff' ? `信任度 ${r.trust}/100(教职工没有亲密度)` : `亲密度 ${r.intimacy}/100,信任度 ${r.trust}/100`; };

/* 进入场景:和地图的“前往”一样记一笔“今天去过”,然后跳转。进场永远先是旁白,所以不需要指定人物。 */
function sceneEnter(locId) {
  const st = typeof PLACES !== 'undefined' ? PLACES.locStatus(locId) : { ok: true };
  if (!st.ok) return toast(st.why);                                  /* 出入规则:不是周末/不是假期/年级不够 都进不去 */
  const l = LOCATIONS.find(x => x.id === locId), d = World.now(), cfg = SCENE_LOCS[locId] || {};
  (S.visited[dkey()] = S.visited[dkey()] || []).push({ id: l.id, name: l.name, time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) });
  save(); go(cfg.action === 'bank' ? 'bank' : 'scene', { loc: locId });   /* 古灵阁直接进银行 */
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

/* 解析 AI 返回的 JSON。角色只能是在场的人;选项最多 4 个;who 类型的选项必须指向在场角色。
   角色名认得很宽:id、中文名、姓或名、英文名(Draco / Draco Malfoy)都行。 */
function sceneWho(v, cast) {
  v = String(v || '').trim(); if (!v || v === '旁白' || v === 'narrator' || v === 'narration') return '';
  const lv = v.toLowerCase();
  const c = cast.find(x => x.id === v || x.id === lv) || cast.find(x => x.name === v || x.name.indexOf(v) >= 0 || v.indexOf(sceneShort(x)) >= 0 || lv.indexOf(x.id) >= 0);
  return c ? c.id : null;                     /* null = 不在场的人,丢掉这一句 */
}
function sceneParse(text, cast) {
  let j = null; const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { j = JSON.parse(text.slice(a, b + 1)); } catch (e) { /* 兜底 */ } }
  const raw = j || { lines: [{ who: '', text: String(text).trim() }] };
  const arr = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.dialogue) ? raw.dialogue : [];
  const lines = [];
  arr.forEach(l => {
    const t = String((l && (l.text || l.t || l.content || l.line)) || '').trim(); if (!t) return;
    const w = sceneWho(l && (l.who || l.speaker || l.name || l.role), cast); if (w === null) return;
    lines.push({ who: w, t });
  });
  const cs = [];
  (Array.isArray(raw.choices) ? raw.choices : []).forEach(c => {
    const t = String((c && (c.text || c.t)) || c || '').trim(); if (!t || typeof c === 'number') return;
    let k = c && c.kind ? String(c.kind) : 'self', w = '';
    if (k === 'who') { const r = sceneWho(c.who || c.target, cast); if (r) w = r; else k = 'self'; }
    if (k !== 'who' && k !== 'talk') k = 'self';
    cs.push({ t, k, who: w });
  });
  return { lines, cs: cs.slice(0, 4), rel: raw.rel && typeof raw.rel === 'object' ? raw.rel : {}, allow: raw.allow_others === true, topic: String(raw.topic || '').trim().slice(0, 12) };
}

/* 节奏控制。开场只有旁白;去找谁就只有谁说话(其他人除非 AI 标了“必要”,最多插一句);
   一段最多 3 句:1 句旁白 + 这位角色最多 2 句话。裁剪时优先保住“话”,不会再出现只剩动作描写的情况。 */
function sceneShape(r, userText, focus) {
  const all = r.lines;
  if (!userText) { r.lines = all.filter(l => !l.who).slice(0, 2); return r; }
  let extra = 0;
  let kept = all.filter(l => { if (!l.who || l.who === focus) return true; if (r.allow && extra < 1) { extra++; return true; } return false; });
  if (!kept.length) kept = all.slice(0, 2);
  let out;
  if (focus) {
    const nar = kept.filter(l => !l.who).slice(0, 1), mine = kept.filter(l => l.who === focus).slice(0, 2), ex = kept.filter(l => l.who && l.who !== focus).slice(0, 1);
    out = kept.filter(l => nar.indexOf(l) >= 0 || mine.indexOf(l) >= 0 || ex.indexOf(l) >= 0);
  } else {
    const nar = kept.filter(l => !l.who).slice(0, 2), ex = kept.filter(l => l.who).slice(0, 1);
    out = kept.filter(l => nar.indexOf(l) >= 0 || ex.indexOf(l) >= 0);
  }
  r.lines = (out.length ? out : kept).slice(0, 3);
  return r;
}
/* 两段话像不像(按相邻两个字比较),用来发现“车轱辘话” */
function sceneSim(a, b) {
  const g = t => { t = String(t).replace(/[\s,。!?!?、…“”"「」『』:;:;,.~~—-]/g, ''); const o = {}; for (let i = 0; i < t.length - 1; i++) o[t.substr(i, 2)] = 1; return o; };
  const x = g(a), y = g(b), kx = Object.keys(x), ky = Object.keys(y);
  if (!kx.length || !ky.length) return 0;
  let n = 0; kx.forEach(k => { if (y[k]) n++; });
  return n / (kx.length + ky.length - n);
}
/* 这一段合格吗?不合格就返回原因,会让 AI 重写一次 */
function sceneCheck(r, userText, focus, log) {
  if (!userText || !focus) return '';
  const c = charById(focus), mine = r.lines.filter(l => l.who === focus);
  if (!mine.length) return `没有写出${c ? c.name : '这位角色'}说的话,只有动作和神态。必须有至少一条 who 为 ${focus} 的台词,直接回应玩家刚才的选择。`;
  const now = mine.map(l => l.t).join('');
  const before = []; log.forEach(e => { if (e.k === 'b') sceneBeatLines(e).forEach(l => { if (l.who === focus) before.push(l.t); }); });
  const rec = before.slice(-4);
  if (rec.some(t => sceneSim(now, t) > 0.45)) return '和前面说过的话太像了(车轱辘话)。换一个新的话头,不要再用相同的内容和句式。';
  return '';
}

/* 旧版存档里的记录格式也能读 */
const sceneBeatLines = e => e.l || [{ who: '', t: e.n || '' }].concat((e.d || []).map(x => ({ who: x.who, t: x.t })));
const sceneChoiceOf = c => typeof c === 'string' ? { t: c, k: 'self', who: '' } : c;

function sceneSystem(loc, cfg, cast, slot, focus, talk) {
  const c = S.card, g = PERSONA.grade(), night = slot < 0, hog = !loc.area || loc.area === 'hogwarts';
  const me = `${c.name || '玩家'}${c.gender ? '(' + c.gender + ')' : ''},${GRADES[Math.min(7, g) - 1]}${S.house ? '、' + HOUSES[S.house].name + '学生' : ''}。外貌:${c.look || c.appearance || '未设定'}`;
  const castTxt = cast.length
    ? cast.map(x => `- ${x.id}|${x.name}:${PERSONA.has(x.id) ? x.personaCore() : x.persona}\n  与玩家的关系:${sceneRelLine(x)}`).join('\n')
    : '(此刻没有任何可以扮演的角色在场)';
  const pairs = [];
  for (let i = 0; i < cast.length; i++) for (let k = i + 1; k < cast.length; k++) {
    const t = PERSONA.pair(cast[i].id, cast[k].id);
    pairs.push(`- ${sceneShort(cast[i])}与${sceneShort(cast[k])}:${t || '没有特别设定,按各自的性格自然相处,不要凭空发明亲密或仇恨。'}`);
  }
  const mem = typeof crossMemoryMulti === 'function' ? crossMemoryMulti(cast, 'scene', { skipLoc: loc.id }) : '';
  return [
    '你是一部哈利·波特同人「乙女向橙光文游」日常小场景的叙事者。画面是视觉小说:你写的内容会被拆成一句一句,显示在屏幕底部的对话框里;玩家只能点击你给出的选项,不能自由输入。',
    `现在是游戏世界里的:${World.label()}(第 ${g} 学年,故事发生在原著时间线上;只写这个时间点之前已经发生的事,不预知未来)。`,
    `地点:${loc.name}(${typeof PLACES !== 'undefined' ? PLACES.areaName(loc.area || 'hogwarts') : '霍格沃茨'})。${cfg.desc || ''}时段:${night ? '深夜' : SLOTS[slot][1]}。`,
    `玩家角色:${me}`,
    playerCtx(),
    '在场角色(只有他们可以说话和行动):\n' + castTxt,
    pairs.length ? '在场角色之间的关系:\n' + pairs.join('\n') : '',
    mem ? '在场角色记得的近况(来自群聊、私聊、别处的日常剧情;只有和当前话题直接相关时才用,无关就完全忽略,不要逐条复述):\n' + mem : '',
    focus && charById(focus) ? `当前交谈对象:${charById(focus).name}(id:${focus})。这一轮只写他/她和玩家之间的互动。` : '',
    talk && talk.topics.length ? `这段交谈已经聊过的话题:${talk.topics.join('、')}。不要再回到这些话题,每一轮都要换新的话头(可以从对方的另一面入手:家人、功课、别的人、眼前正在发生的事、对玩家的态度)。` : '',
    talk ? `这是和他/她的第 ${talk.n} 次来回。` + (talk.n >= 3 ? '这段交谈到此为止:让他/她用一句话或一个动作自然收尾(有事要走、被叫走、转回自己的事、懒得再聊),选项里不要再给 talk,改给 self,或 who 去找别人。' : '') : '',
    '本轮写什么(日常剧情要短,宁可少写,不要凑字数):',
    night
      ? `- 现在是${hog ? '宵禁后的' : ''}深夜,没有任何你可以扮演的角色在场。如果最后一条消息是“新的一幕”(开场):只用旁白(who 为空)写 1~2 条,用“目光所及……”这类镜头式写法交代这个地点深夜的样子,加一处值得留意的细节(${hog ? '远处的声响、画像的低语、月光下的物件' : '打烊的店铺、远处的灯火、风声'})。不要让玩家被抓或受伤,不要引入有名有姓的新角色。选项全部是 kind=self。之后玩家做出选择时,把选择当作已经发生的事实,用 1~2 条旁白写环境的变化,选项依然全部是 self。`
      : [
        '- 如果最后一条消息是“新的一幕”,这是【开场】:只用旁白(who 为空)写 1~2 条,合计不超过 110 字,用“目光所及……”这类镜头式写法交代:这个地点此刻的样子(一笔带过);在场的角色各自在做什么(每人一句,在场超过 3 位时只挑 3 位写);至多一件值得留意的小物件。不要让任何角色说话,不要写玩家做了什么、想了什么、感受如何。选项:对写进旁白的每位角色各给一个 kind=who 的选项(例如“走向德拉科,看看他在做什么”),最多 3 个;还有空位就给一个 kind=self 的选项(玩家自己做点别的,例如“在长桌边找个位置坐下”),总数不超过 4。在场没有任何角色时(比如玩家自己的庄园),选项全部是 kind=self,给 3 个,写成玩家在这个地方可以做的事。',
        '- 否则,玩家刚刚做出了选择(消息里“玩家选择:”后面就是选项原文),把它当作已经发生的事实,不要扩写玩家的动作。按选项类型写,每一段最多 3 条 lines:',
        '  · 去找某位角色(who):0~1 条旁白(他/她的动作神态)+ 1~2 条【这一位角色】的话,每条不超过 40 字。其他在场角色不出现、不插话、不被提起;只有玩家的举动直接牵涉到某个人时,才可以让那个人说一句,并把 allow_others 设为 true。',
        '  · 继续交谈(talk):还是同一位角色,1~2 条话,不超过 40 字。必须往前推进:接住玩家刚说的,给出新的信息、新的反应或新的话头;前面已经说过的内容、用过的句式和口头禅不要再出现。',
        '  · 自己做事(self):1~2 条旁白写结果,通常没有人说话。',
        '  选项 2~3 个:talk(继续和当前这位角色交谈,写成玩家要说的话或要做的事)、self(玩家去做别的事,或结束这场交谈),需要时再加一个 who(转向另一位在场角色,必须有 who 字段)。'
      ].join('\n'),
    '规则:',
    '1. 绝不替玩家决定或描写玩家的行动、想法、情绪、表情、身体反应、选择或台词。旁白不要以“你”或玩家的名字作主语。选项是供玩家挑选的候选行动或台词,每个 8~24 字,写成玩家能做的事或能说的话,不要写成已经发生的事。',
    '2. 在场角色的言行必须符合各自的人设、与玩家的关系值和原著时间线;关系变好不会抹掉他们的缺点、立场和说话习惯;不要反复使用同一套口头禅、动作和情绪反应。',
    '3. 只有「在场角色」可以说话;不要引入有名有姓的新角色,也不要让不在场的角色出场。',
    '4. 这里只是日常小场景:不改写原著的重要事件,不引入大事件或重大的原创剧情。',
    '5. 玩家是学生,互动保持适龄、非露骨,不写亲密的身体接触。',
    '6. 角色的话必须直接回应玩家刚选的那句话或动作(哪怕是嘴硬、反问、挖苦地回应),不能自说自话,也不能无视对方。角色的爱好和标志性话题(比如魁地奇)在一段交谈里最多提一次。',
    '7. 在“去找某位角色(who)”和“继续交谈(talk)”的轮次,lines 里必须有至少一条这位角色说的话(who 填角色 id,例如 draco,不要填名字);旁白只写一条,不超过 40 字,不要只有动作和神态。',
    '8. rel:只有玩家上一步真的触动了某位角色,才给出变化(整数,一般 1~3,极少数 5,可以为负);普通寒暄和开场一律为空。教职工只有 trust。',
    '只输出一个 JSON,不要代码块:{"lines":[{"who":"","text":"旁白"},{"who":"角色id","text":"这位角色说的话"}],"choices":[{"text":"选项","kind":"who|talk|self","who":"kind 为 who 时填角色id"}],"allow_others":false,"topic":"本轮话题,不超过 8 个字","rel":{"角色id":{"intimacy":0,"trust":0}}}'
  ].filter(Boolean).join('\n');
}

/* 把最近的剧情记录整理成对话:AI 自己的历史也用同样的 JSON 格式,避免它跑偏 */
function sceneMsgs(sys, log) {
  const out = [];
  const push = (role, c) => { if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + c; else out.push({ role, content: c }); };
  log.slice(-8).forEach(e => {
    if (e.k === 'd') push('user', '(' + e.t + ')');
    else if (e.k === 'u') push('user', '玩家选择:' + e.t);
    else if (e.k === 'b') push('assistant', JSON.stringify({ lines: sceneBeatLines(e).map(x => ({ who: x.who, text: x.t })), choices: (e.cs || []).map(sceneChoiceOf).map(c => ({ text: c.t, kind: c.k, who: c.who })) }));
  });
  if (!out.length || out[out.length - 1].role !== 'user') push('user', '(请接着写下一幕)');
  return [{ role: 'system', content: sys }].concat(out);
}

/* ---- 画面素材 ---- */
/* 没有背景图时用的占位:每个地点一张简笔画。放 scene-<地点id>.jpg 就会自动换成你的图 */
function sceneFallbackBg(locId) {
  const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const gl = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const rnd = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  let defs = '', body = '';
  if (locId === 'hall') {
    let candles = '', stars = '';
    [[40, 70], [110, 40], [180, 85], [250, 45], [320, 80], [75, 130], [150, 140], [225, 125], [300, 150], [355, 115], [20, 170], [200, 190], [120, 205], [280, 210]]
      .forEach(p => { candles += `<circle cx="${p[0]}" cy="${p[1]}" r="16" fill="url(#gl)"/><rect x="${p[0] - 1.5}" y="${p[1]}" width="3" height="9" fill="#f4ead2"/><ellipse cx="${p[0]}" cy="${p[1] - 2}" rx="2" ry="3.5" fill="#ffd36b"/>`; });
    for (let i = 0; i < 40; i++) stars += `<circle cx="${(i * 97) % 390}" cy="${(i * 53) % 230}" r="${(i % 3) * 0.4 + 0.5}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`;
    defs = g('sky', '#0b1030', '#37305e') + g('wall', '#54402f', '#2c211a') + g('floor', '#3a2b22', '#18110e') + gl('gl', '#ffe6a0');
    body = `<rect width="390" height="844" fill="url(#sky)"/>${stars}<rect y="250" width="390" height="250" fill="url(#wall)"/>
      <path d="M30 470 V340 Q55 290 80 340 V470Z M155 470 V320 Q180 262 205 320 V470Z M280 470 V340 Q305 290 330 340 V470Z" fill="#6f8fcf" opacity=".42"/>
      <rect y="500" width="390" height="344" fill="url(#floor)"/><path d="M118 548 H272 L330 700 H60Z" fill="#6a4a30"/><path d="M60 700 H330 L370 844 H20Z" fill="#573b27"/>
      <path d="M0 610 H92 L58 844 H0Z M390 610 H298 L332 844 H390Z" fill="#5d4129"/>${candles}`;
  } else if (locId === 'library') {
    let sh = '';
    for (let r = 0; r < 6; r++) { const y = 70 + r * 100; sh += `<rect x="0" y="${y + 66}" width="390" height="9" fill="#2a1a10"/>`; for (let i = 0; i < 26; i++) { const h = 38 + rnd(r * 40 + i) * 26; sh += `<rect x="${i * 15 + 2}" y="${y + 66 - h}" width="${10 + rnd(i + r) * 3}" height="${h}" fill="hsl(${15 + Math.floor(rnd(i * 3 + r) * 40)},${35 + Math.floor(rnd(i + 9) * 25)}%,${20 + Math.floor(rnd(i + r * 7) * 18)}%)"/>`; } }
    defs = g('a', '#2a1b12', '#4b3321') + gl('l', '#ffd98a');
    body = `<rect width="390" height="844" fill="url(#a)"/>${sh}<circle cx="95" cy="610" r="90" fill="url(#l)"/><circle cx="300" cy="610" r="90" fill="url(#l)"/><rect x="40" y="650" width="310" height="14" fill="#6b4a2d"/><rect x="60" y="664" width="12" height="150" fill="#4a3220"/><rect x="318" y="664" width="12" height="150" fill="#4a3220"/><rect x="88" y="598" width="14" height="52" fill="#8a6a3d"/><rect x="293" y="598" width="14" height="52" fill="#8a6a3d"/>`;
  } else if (locId === 'potions') {
    let jars = '', br = '';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) jars += `<rect x="${12 + i * 54}" y="${150 + r * 120}" width="30" height="42" rx="6" fill="hsl(${90 + Math.floor(rnd(i + r * 7) * 120)},45%,38%)" opacity=".8"/>`;
    for (let r = 0; r < 14; r++) br += `<rect y="${r * 40}" width="390" height="2" fill="#0d1512" opacity=".5"/>`;
    defs = g('a', '#16211d', '#2d3b34') + gl('gr', '#7dff9a');
    body = `<rect width="390" height="844" fill="url(#a)"/>${br}${jars}<rect y="520" width="390" height="324" fill="#141b18"/><circle cx="110" cy="640" r="100" fill="url(#gr)"/><circle cx="300" cy="700" r="110" fill="url(#gr)"/><ellipse cx="110" cy="670" rx="70" ry="52" fill="#0e0e10"/><ellipse cx="300" cy="730" rx="80" ry="58" fill="#0e0e10"/><ellipse cx="110" cy="640" rx="56" ry="14" fill="#6dd98a"/><ellipse cx="300" cy="700" rx="64" ry="16" fill="#6dd98a"/>`;
  } else if (locId === 'transfig') {
    let desks = '';
    for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) desks += `<rect x="${24 + i * 120 - r * 6}" y="${560 + r * 62}" width="${100 + r * 12}" height="${14 + r * 2}" fill="#7a5a3a"/><rect x="${34 + i * 120 - r * 6}" y="${574 + r * 62}" width="8" height="${28 + r * 3}" fill="#5a4129"/>`;
    defs = g('a', '#3b3a4a', '#6b6258') + g('f', '#5a4531', '#2e2218') + g('s', '#9ec4ee', '#d8e8f7');
    body = `<rect width="390" height="844" fill="url(#a)"/><rect x="40" y="90" width="150" height="220" rx="60" fill="url(#s)" opacity=".85"/><rect x="40" y="90" width="150" height="220" rx="60" fill="none" stroke="#2a2118" stroke-width="8"/><rect x="215" y="120" width="150" height="190" fill="#25382f" stroke="#6b4a2d" stroke-width="8"/><path d="M232 160 H340 M232 195 H320 M232 230 H345 M232 265 H300" stroke="#e8ecd8" stroke-width="2.5" opacity=".6"/><rect y="500" width="390" height="344" fill="url(#f)"/>${desks}`;
  } else if (locId === 'greenhouse') {
    let pl = '', gr = '';
    for (let i = 0; i < 9; i++) gr += `<path d="M${i * 46} 0 V844" stroke="#cfe9d8" stroke-width="2" opacity=".35"/>`;
    for (let r = 0; r < 14; r++) gr += `<path d="M0 ${r * 62} H390" stroke="#cfe9d8" stroke-width="2" opacity=".3"/>`;
    for (let i = 0; i < 7; i++) { const x = 30 + i * 52, y = 560 + (i % 2) * 70; pl += `<rect x="${x - 18}" y="${y}" width="36" height="40" fill="#8a5a3a"/><ellipse cx="${x}" cy="${y - 20}" rx="${26 + rnd(i) * 10}" ry="${34 + rnd(i + 4) * 24}" fill="hsl(${100 + Math.floor(rnd(i + 2) * 50)},50%,${30 + Math.floor(rnd(i + 5) * 14)}%)"/>`; }
    defs = g('a', '#bfe3c8', '#5f9e6f');
    body = `<rect width="390" height="844" fill="url(#a)"/><path d="M60 0 L150 0 L260 844 L140 844Z M220 0 L290 0 L390 700 L330 700Z" fill="#fff" opacity=".13"/>${gr}<rect y="620" width="390" height="224" fill="#4a3a2a"/>${pl}`;
  } else if (locId === 'owlery') {
    let ow = '';
    for (let i = 0; i < 8; i++) { const x = 40 + i * 44, y = 330 + (i % 3) * 70; ow += `<rect x="${x - 26}" y="${y + 24}" width="52" height="5" fill="#5a4129"/><ellipse cx="${x}" cy="${y}" rx="14" ry="20" fill="hsl(${25 + Math.floor(rnd(i) * 20)},${20 + Math.floor(rnd(i + 3) * 25)}%,${50 + Math.floor(rnd(i + 8) * 30)}%)"/><circle cx="${x - 5}" cy="${y - 8}" r="3.5" fill="#ffd36b"/><circle cx="${x + 5}" cy="${y - 8}" r="3.5" fill="#ffd36b"/>`; }
    defs = g('sk', '#f3b184', '#6f8fcf') + g('w', '#5b5a63', '#3b3a42');
    body = `<rect width="390" height="844" fill="url(#w)"/><path d="M40 330 V150 Q120 40 200 150 V330Z M230 330 V190 Q290 100 350 190 V330Z" fill="url(#sk)"/><rect y="300" width="390" height="12" fill="#4a3624"/>${ow}<rect y="640" width="390" height="204" fill="#8a7447"/><path d="M0 700 L390 690 M0 760 L390 770" stroke="#b39a60" stroke-width="3" opacity=".6"/>`;
  } else if (locId === 'pitch') {
    let st = '';
    for (let i = 0; i < 12; i++) st += `<rect x="${i * 34}" y="${430 - (i % 3) * 8}" width="34" height="${60 + (i % 3) * 8}" fill="hsl(${i % 2 ? 350 : 45},55%,38%)"/>`;
    defs = g('sk', '#6fb4ee', '#d6ecf8') + g('gr', '#4f9b4a', '#2f6a30');
    body = `<rect width="390" height="844" fill="url(#sk)"/><ellipse cx="90" cy="150" rx="70" ry="22" fill="#fff" opacity=".7"/><ellipse cx="290" cy="220" rx="80" ry="24" fill="#fff" opacity=".6"/>${st}<rect y="490" width="390" height="354" fill="url(#gr)"/><path d="M0 560 H390 M0 650 H390 M0 760 H390" stroke="#fff" stroke-width="2" opacity=".18"/><path d="M70 470 V280 M195 470 V240 M320 470 V280" stroke="#e8c350" stroke-width="5"/><circle cx="70" cy="262" r="26" fill="none" stroke="#e8c350" stroke-width="5"/><circle cx="195" cy="222" r="30" fill="none" stroke="#e8c350" stroke-width="5"/><circle cx="320" cy="262" r="26" fill="none" stroke="#e8c350" stroke-width="5"/>`;
  } else if (locId === 'lake') {
    let rp = '';
    for (let i = 0; i < 9; i++) rp += `<path d="M${30 + (i % 3) * 110} ${520 + i * 34} q40 -9 80 0" stroke="#fff" stroke-width="2" fill="none" opacity=".3"/>`;
    defs = g('sk', '#2b2a58', '#e3a082') + g('lk', '#3d5a85', '#15233d');
    body = `<rect width="390" height="844" fill="url(#sk)"/><path d="M0 400 L60 330 L110 380 L180 300 L250 370 L310 320 L390 390 V470 H0Z" fill="#1d1c3a"/><path d="M280 330 V280 L292 262 L304 280 V330 M310 330 V292 L320 274 L330 292 V330" fill="#15142c"/><rect y="460" width="390" height="384" fill="url(#lk)"/>${rp}<path d="M0 760 Q100 720 200 770 T390 750 V844 H0Z" fill="#1c2a1f"/>`;
  } else {   /* room:有求必应屋 */
    let st = '', dust = '';
    for (let i = 0; i < 22; i++) st += `<rect x="${rnd(i) * 340}" y="${560 + rnd(i + 5) * 220}" width="${24 + rnd(i + 9) * 50}" height="${30 + rnd(i + 13) * 90}" fill="hsl(${250 + Math.floor(rnd(i) * 40)},18%,${10 + Math.floor(rnd(i + 3) * 10)}%)"/>`;
    for (let i = 0; i < 30; i++) dust += `<circle cx="${rnd(i + 20) * 390}" cy="${rnd(i + 40) * 700}" r="${0.8 + rnd(i) * 1.6}" fill="#ffe8b0" opacity="${0.2 + rnd(i + 7) * 0.5}"/>`;
    defs = g('a', '#1b1433', '#3a2a55') + gl('d', '#ffcf7a');
    body = `<rect width="390" height="844" fill="url(#a)"/><circle cx="195" cy="420" r="210" fill="url(#d)" opacity=".55"/><path d="M110 640 V380 Q195 250 280 380 V640Z" fill="#ffd98a" opacity=".5"/><path d="M110 640 V380 Q195 250 280 380 V640Z" fill="none" stroke="#6b4a8a" stroke-width="8"/>${dust}${st}<rect y="780" width="390" height="64" fill="#120d22"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
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
        <div class="vn-place">${esc(loc.name)} · ${slot0 < 0 ? '深夜' : SLOTS[slot0][1]}${slot0 < 0 ? '<small>' + esc(typeof PLACES !== 'undefined' ? PLACES.nightHint(loc) : '夜深了,不太建议在城堡里乱逛……') + '</small>' : ''}</div>
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
        chs.querySelectorAll('.vn-opt').forEach(b => b.onclick = e => { e.stopPropagation(); const c = cs[+b.dataset.i]; vn.classList.remove('choosing'); chs.innerHTML = ''; step(c.t, c); });
      }
      function waiting(on) { nm.style.display = 'none'; box.className = 'vn-box narr'; if (on) { clearTimeout(tmr); typing = false; tx.textContent = '……'; nx.style.visibility = 'hidden'; } }

      /* --- 向 AI 要下一段 --- */
      async function step(userText, choice) {
        if (busy || !aiOk()) return;
        busy = true;
        const focus = choice ? (choice.k === 'who' ? choice.who : choice.k === 'talk' ? (sc.focus || '') : '') : '';
        /* 这段交谈的进度:第几次来回、聊过什么话题 */
        const talk = !choice || !focus ? null : choice.k === 'who' || !sc.talk || sc.talk.who !== focus ? { who: focus, n: 1, topics: [] } : { who: focus, n: sc.talk.n + 1, topics: sc.talk.topics.slice() };
        const pend = userText ? { k: 'u', t: userText } : null;
        if (pend) sc.log.push(pend);
        const prev = sc.cur; waiting(true);
        const rollback = () => { if (pend) { const i = sc.log.indexOf(pend); if (i >= 0) sc.log.splice(i, 1); } };
        try {
          const cs = cast();
          let r = null, why = '';
          for (let attempt = 0; attempt < 2; attempt++) {
            const msgs = sceneMsgs(sceneSystem(loc, cfg, cs, slot0, focus, talk), sc.log);
            if (attempt) msgs[msgs.length - 1].content += '\n(上一版不合格:' + why + '请重写这一段。)';
            const text = await AI.raw(S.api, msgs, 1.0);
            if (!alive) { rollback(); save(); busy = false; return; }
            r = sceneShape(sceneParse(text, cs), userText, focus);
            r.lines = r.lines.map(l => l.who ? l : { who: '', t: sceneStripAgency(l.t, S.card.name) }).filter(l => l.t);
            why = sceneCheck(r, userText, focus, sc.log.slice(0, sc.log.length - (pend ? 1 : 0)));
            if (!why) break;                       /* 第二次还不合格也照用,不再卡住玩家 */
          }
          if (!r.lines.length) throw new Error('AI 没有返回可用的内容,再试一次');
          /* 交谈到第 3 次来回就该收尾:不再给“继续聊”的选项 */
          if (talk && talk.n >= 3) {
            r.cs = r.cs.filter(c => c.k !== 'talk');
            if (!r.cs.some(c => c.k === 'who')) r.cs = r.cs.concat(cs.filter(c => c.id !== focus).slice(0, 2).map(c => ({ t: '去找' + sceneShort(c) + '说话', k: 'who', who: c.id }))).slice(0, 4);
          }
          if (!r.cs.length) {
            const others = cs.filter(c => c.id !== focus).slice(0, 2).map(c => ({ t: '去找' + sceneShort(c) + '说话', k: 'who', who: c.id }));
            r.cs = others.concat([{ t: focus ? '转身去做自己的事' : '环顾四周,看看还有什么', k: 'self', who: '' }]);
          }
          sc.log.push({ k: 'b', l: r.lines, cs: r.cs });
          sc.log = sc.log.slice(-40);
          sc.cur = { lines: r.lines, cs: r.cs, li: 0 }; sc.focus = focus;
          sc.talk = talk ? { who: focus, n: talk.n, topics: talk.topics.concat(r.topic ? [r.topic] : []).slice(-6) } : null;
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
