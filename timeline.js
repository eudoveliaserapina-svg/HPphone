/* ===== 时间线 / 年级 / 联系人 =====
   1. 玩家年级:角色卡上的起始年级 + 游戏里经过的学年数。玩家永远和哈利、赫敏同年级、同龄(一年级 11 岁,七年级 17 岁)。
   2. 角色出场:每个角色只在原著里出现的年份区间内出现(CAST_WINDOW,数字是“哈利那一届”的年级)。
      比哈利小一级的金妮、卢娜,要等到第 2 学年才入学;塞德里克第 3 学年才登场,第 4 学年结束后不再出现;
      小天狼星第 3 到第 5 学年;邓布利多第 1 到第 6 学年。想调整就改下面这张表。
   3. 联系人:一开始只有「哈利、罗恩、赫敏」和自己学院的同学。其他学院的学生在学院论坛 / 校园论坛里「加为联系人」;
      教职工在地图剧情里和你说过话后自动留下联系方式。联系人会同时出现在聊天、电话、陪伴、写信、群聊里。
   4. 教师和学生分开:教职工不会被安排“重做作业”之类只有学生才会遇到的事。
   5. 时间流逝:每次和角色说话都会记下游戏日期;“睡一觉”跳了很多天之后再聊,角色知道过去了多久。 */
const CAST_WINDOW = {
  draco: [1, 7], harry: [1, 7], ron: [1, 7], hermione: [1, 7], neville: [1, 7], snape: [1, 7], mcgonagall: [1, 7],
  dumbledore: [1, 6], ginny: [2, 7], luna: [2, 7], cedric: [3, 4], sirius: [3, 5]
};
const TRIO = ['harry', 'ron', 'hermione'];

function curGrade() {
  const d = World.now(), Y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  const y0 = S.world && S.world.year0 ? S.world.year0 : Y, base = +(S.card && S.card.grade) || 1;
  return Math.max(1, Math.min(7, base + (Y - y0)));
}
const playerAge = () => 10 + curGrade();
function avail(c) { const w = CAST_WINDOW[c.id]; if (!w) return true; const g = curGrade(); return g >= w[0] && g <= w[1]; }
const availChars = () => CHARACTERS.filter(avail);
const unavailNames = () => CHARACTERS.filter(c => !avail(c)).map(c => c.name.split('·')[0]);

/* ---- 联系人 ---- */
function contactIds() {
  if (S.contacts) return S.contacts;
  if (!S.house) return TRIO.slice();                      /* 还没分院:只有哈利三人(先不保存) */
  const set = new Set(TRIO);
  CHARACTERS.forEach(c => { if (c.role === 'student' && c.house === S.house && avail(c)) set.add(c.id); });
  /* 旧存档:已经聊过、写过信的人继续保留 */
  CHARACTERS.forEach(c => { if (((S.chats && S.chats[c.id]) || []).some(m => m.r !== 'note') || (S.mail || []).some(m => m.from === c.id)) set.add(c.id); });
  S.contacts = Array.from(set); if (typeof save === 'function') save();
  return S.contacts;
}
const contactList = () => contactIds().map(charById).filter(c => c && avail(c));
const isContact = id => contactIds().indexOf(id) >= 0;
function addContact(id) {
  const c = charById(id); if (!c || !avail(c)) return false;
  if (isContact(id)) return false;
  S.contacts.push(id); if (typeof save === 'function') save(); return true;
}

/* ---- 教师和学生各自的活动文字(地图弹窗里“在做什么”) ---- */
const STAFF_ACTS = {
  hall: ['在教师席上用餐', '和同事低声交谈', '扫视着学生们的长桌'],
  library: ['在书架间查资料', '整理要归还的书', '批改学生的论文'],
  potions: ['检查坩埚里的药剂', '批改作业', '整理药材柜'],
  transfig: ['批改变形术作业', '准备下一节课', '整理讲台'],
  greenhouse: ['检查植物的长势', '给大型植物换盆', '指导学生修剪'],
  owlery: ['给同事寄信', '喂猫头鹰', '查看送来的信'],
  pitch: ['监督训练', '检查球场设施', '在看台上观看'],
  lake: ['在湖边散步', '独自看着湖面', '巡视湖岸'],
  room: ['路过时留意着异常', '巡视四周', '整理资料'],
  broomsticks: ['喝一杯黄油啤酒', '和熟人聊天', '坐在靠窗的位置休息']
};
function actFor(c, l, slot) {
  const arr = c.role === 'staff' ? (STAFF_ACTS[l.id] || ['处理事务', '巡视四周', '整理资料']) : l.acts;
  return pick(arr, rng(dkey() + c.id + slot + 'a'));
}

/* ---- 时间流逝:记下和每个角色上次说话的游戏日期 ---- */
const gameDay = d => Math.floor(Date.UTC((d || World.now()).getFullYear(), (d || World.now()).getMonth(), (d || World.now()).getDate()) / 86400000);
function markTalk(ids) { S.seen = S.seen || {}; const t = gameDay(); ids.forEach(id => { S.seen[id] = t; }); }
function gapDays(c) { const t0 = S.seen && S.seen[c.id]; return t0 == null ? 0 : gameDay() - t0; }
function gapSpan(days) { return days < 7 ? days + ' 天' : days < 60 ? days + ' 天(约 ' + Math.round(days / 7) + ' 周)' : '约 ' + Math.round(days / 30) + ' 个月'; }
function gapWhen(c) { const d = new Date(S.seen[c.id] * 86400000); return d.getUTCFullYear() + '年' + (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日'; }
function gapText(c) {
  const n = gapDays(c); if (n < 1) return '';
  return '【时间已经过去】你和玩家上一次联系是 ' + gapWhen(c) + ',距今已经过去 ' + gapSpan(n) + '(现在是 ' + World.label() + ')。聊天记录里的内容都是那时候的事,不是刚刚发生的。你要自然地意识到时间过去了:可以问候、提到这段时间季节、课程、节日的变化,但不要编造重大事件,也不要假装只隔了一天。';
}
function gapLines(chars) { return chars.map(c => { const n = gapDays(c); return n >= 1 ? c.name + '上次和玩家联系是 ' + gapWhen(c) + ',距今 ' + gapSpan(n) : ''; }).filter(Boolean).join(';'); }

/* 给所有 AI 提示词用的时间线提醒:不提前出现还没登场的角色和事件 */
function timelineGuard() {
  const g = curGrade(), un = unavailNames();
  return '【时间线】现在是游戏里的 ' + World.label() + '(第 ' + g + ' 学年;玩家和哈利、赫敏同年级、同龄,' + playerAge() + ' 岁)。只能写这个时间点之前已经发生的原著事件,不要提到之后才会发生的事。' + (un.length ? '这些角色现在还没有登场(或已经不在了),不要让他们出现、说话或被当作在场:' + un.join('、') + '。' : '');
}
