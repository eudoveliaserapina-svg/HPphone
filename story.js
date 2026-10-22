/* ===== 主线剧情(视觉小说) =====
   和日常剧情的区别:
   - 按原著事件推进,每章有固定的大纲,一步一步演完,不删减、不改结局;玩家是原创角色,是同学/目击者/参与者。
   - 不限句数:每一段 4~8 句,可以多个角色轮流说话;每个步骤至少演 min 段(默认 2),AI 觉得演完了才进入下一步。
   - 只演一次,按顺序:上一章没演完,下一章不会开放。章节到了原著里的日期才解锁(游戏里的日期)。
   - 演完的章节会写进角色的记忆里("你和玩家一起经历了……")。
   - 随时可以点左上角“返回”离开,进度会保存,从地图上的「主线剧情」继续。
   - 玩家只能点选项,不能自己输入;AI 不替玩家决定行动、想法、情绪、台词。
   章节写在 STORY_CHAPTERS 里。现在有第一学年的 8 章;其它学年用同样的格式往后加。
   steps 里每一项是字符串,或 { t: 文字, bg: 这一步的背景 }。 */
const STORY_CHAPTERS = [
  { id: 'y1-train', grade: 1, m: 9, d: 1, title: '九又四分之三站台', place: '国王十字车站 · 霍格沃茨特快', bg: 'train',
    intro: '开学第一天。穿过站台的砖墙,登上红色的霍格沃茨特快。',
    setting: '蒸汽火车喷着白烟,站台上挤满送行的家长、猫头鹰和行李车。',
    cast: ['harry', 'ron', 'hermione', 'draco', 'neville'], extras: ['韦斯莱夫人', '推车的女巫', '克拉布', '高尔', '海格'],
    note: '分院还没有进行:不要提到玩家的学院,玩家是刚入学的新生。',
    summary: '一起坐上九又四分之三站台的霍格沃茨特快,在车上见到了哈利、罗恩、赫敏、纳威和德拉科',
    steps: [
      '玩家来到国王十字车站,在九号和十号站台之间找到通往九又四分之三站台的入口;红色的蒸汽火车、送行的家长、猫头鹰和行李车。',
      '玩家上车找座位。车厢几乎都满了;纳威·隆巴顿到处找他丢了的蟾蜍,赫敏·格兰杰一间一间车厢地帮他找,还熟练地说自己已经试过几个咒语。',
      '玩家来到哈利和罗恩所在的包厢(被邀请进去):罗恩的旧外套和老鼠斑斑,哈利额头上的闪电伤疤;推车女巫送来巧克力蛙、比比多味豆和南瓜馅饼,他们聊起魁地奇和各自的家庭。',
      '德拉科·马尔福带着克拉布和高尔来到包厢,傲慢地自我介绍,嘲笑罗恩的姓和家境,向哈利伸出手说可以教他分辨“谁值得交往”,哈利拒绝了他。格兰芬多和斯莱特林的第一次对立由此埋下。',
      { t: '夜幕降临,火车停靠霍格莫德车站。大家换上长袍,听见海格的大嗓门“一年级新生,到这边来!”,坐上小船横渡黑湖,第一次看见灯火通明的霍格沃茨城堡。', bg: 'lake' }
    ] },
  { id: 'y1-sorting', grade: 1, m: 9, d: 1, title: '分院仪式', place: '霍格沃茨大礼堂', bg: 'hall',
    intro: '分院帽落在头上的那一刻。',
    setting: '成千上万支悬浮的蜡烛,四张长长的学院长桌,天花板映着夜空。',
    cast: ['mcgonagall', 'dumbledore', 'snape', 'harry', 'ron', 'hermione', 'draco', 'neville'], extras: ['分院帽', '近乎无头的尼克', '奇洛教授', '海格'],
    note: '玩家最终被分入「{house}」,和玩家资料里的学院一致,不能分到别的学院。',
    summary: '一起参加了分院仪式和开学宴会,玩家被分进{house}',
    steps: [
      '麦格教授在门厅迎接新生,说明分院仪式:四个学院各有荣誉与规矩,学院杯、学分与处罚;请新生整理好仪容。',
      '新生列队走进大礼堂:悬浮的蜡烛,四张长桌,天花板映着夜空,教师席在最前方。分院帽唱出它的歌。',
      '麦格教授按名单依次点名分院:赫敏很快被分进格兰芬多;德拉科的头发刚碰到帽子,帽子立刻喊出斯莱特林;纳威磨蹭了很久才被分进格兰芬多。轮到玩家时,分院帽在玩家耳边低语、权衡,最后喊出玩家所在的学院;随后哈利和罗恩也分进了格兰芬多。',
      '开学宴会:餐盘里凭空出现丰盛的食物,幽灵们飘进来(近乎无头的尼克),大家互相认识;哈利觉得伤疤刺痛,他以为是教师席上斯内普的目光。',
      '邓布利多起立致辞:禁林对所有学生禁止入内;三楼右侧的走廊,对不想死得很痛苦的人禁止入内。大家唱校歌(每个人各唱各的调);之后级长带着各自学院的新生去休息室。'
    ] },
  { id: 'y1-flying', grade: 1, m: 9, d: 12, title: '第一节飞行课', place: '魁地奇球场旁的草坪', bg: 'pitch',
    intro: '纳威的记忆球,和哈利的第一次飞行。',
    setting: '星期四的下午,草坪上整齐地摆着一排旧扫帚。',
    cast: ['harry', 'ron', 'hermione', 'draco', 'neville', 'mcgonagall'], extras: ['霍琦夫人', '伍德', '克拉布', '高尔'],
    note: '一年级的格兰芬多和斯莱特林一起上飞行课。如果玩家不是这两个学院的,玩家是在相邻草坪上自己的飞行课上,隔着不远看见这一幕,不要写成玩家站在他们的队伍里。',
    summary: '一起见证了第一节飞行课:纳威摔断手腕,哈利接住记忆球后被选进魁地奇队',
    steps: [
      '一年级学生在扫帚旁站成一排。霍琦夫人(只用旁白转述)要求右手伸出扫帚上方,喊“起来”:赫敏的扫帚只是滚了一下,哈利的第一次就跳进了手里,德拉科也成功了。',
      '霍琦夫人纠正大家的握法。纳威太紧张,在哨声之前扫帚就冲天而起,他从高处摔下来摔断了手腕;霍琦夫人带他去医疗翼,临走警告:都不许飞,否则不等说完“魁地奇”就被开除。',
      '德拉科捡起纳威掉在地上的记忆球,骑上扫帚在半空举着炫耀,嘲弄纳威;哈利不顾赫敏的劝阻,骑上扫帚追了上去。',
      '德拉科把记忆球扔向远处;哈利俯冲追球,在离地几英尺处接住,稳稳落地。',
      '麦格教授冲了过来,叫走哈利。大家以为他要被开除,其实她把他带去见伍德,选进了格兰芬多魁地奇队;德拉科的得意变成了错愕。'
    ] },
  { id: 'y1-halloween', grade: 1, m: 10, d: 31, title: '万圣节的巨怪', place: '大礼堂 · 地下走廊 · 女生盥洗室', bg: 'hall',
    intro: '宴会上,奇洛教授冲了进来。',
    setting: '万圣节的大礼堂悬浮着南瓜灯,空气里是烤南瓜的甜香。',
    cast: ['hermione', 'harry', 'ron', 'mcgonagall', 'snape', 'dumbledore'], extras: ['奇洛教授', '帕瓦蒂·佩蒂尔', '巨怪', '级长'],
    summary: '万圣节那晚亲历了巨怪闯进城堡,哈利、罗恩救了赫敏,三个人从此成了朋友',
    steps: [
      { t: '万圣节宴会上,赫敏却不在座位上:她因为罗恩那句“难怪没人受得了她”,躲在女生盥洗室里哭。帕瓦蒂把这件事告诉了哈利和罗恩。', bg: 'hall' },
      { t: '奇洛教授冲进大礼堂,脸色惨白,喊“巨怪……在地下室……”,然后晕了过去,全场尖叫。邓布利多用魔杖喷出爆响让大家安静,命令级长带各学院学生回宿舍,教师们去地下室检查。', bg: 'hall' },
      { t: '玩家随人群往宿舍走。哈利想起赫敏不知道这件事,和罗恩悄悄离队去找她;途中哈利看见斯内普独自朝三楼走去。玩家只能留意到这些,不能替哈利和罗恩行动。', bg: 'corridor' },
      { t: '女生盥洗室里,巨怪拖着木棒闯入,砸烂了洗手池,赫敏吓得缩在角落。哈利和罗恩用声音引开它;罗恩想起漂浮咒,用“羽加迪姆勒维奥萨”把木棒从巨怪手里升起来,砸在它头上,巨怪昏倒。', bg: 'corridor' },
      { t: '麦格教授、斯内普和奇洛赶到。赫敏撒谎说是她自己去找巨怪,哈利和罗恩是来救她的;麦格教授扣了赫敏五分,又给哈利和罗恩各加五分。从这天起,三个人成了朋友。', bg: 'corridor' }
    ] },
  { id: 'y1-quidditch', grade: 1, m: 11, d: 9, title: '第一场魁地奇比赛', place: '魁地奇球场', bg: 'pitch',
    intro: '哈利是百年来最年轻的找球手。',
    setting: '看台上挤满了人,绿色和红金色的旗帜在风里翻飞。',
    cast: ['harry', 'ron', 'hermione', 'draco', 'snape', 'neville'], extras: ['李·乔丹', '伍德', '海格', '奇洛教授', '克拉布', '高尔'],
    summary: '一起在看台上看完了哈利的第一场魁地奇比赛,他的扫帚突然失控,赫敏点燃了斯内普的袍子',
    steps: [
      '比赛当天:格兰芬多对斯莱特林,哈利是百年来最年轻的找球手。看台上学院旗帜、狮子与蛇的口号;赫敏、罗恩、纳威、海格坐在一起;斯内普担任裁判。',
      '比赛开始:李·乔丹(只用旁白转述)的解说,游走球和鬼飞球在空中穿梭,哈利在高处寻找金色飞贼。',
      '哈利的扫帚突然疯狂颠簸,想把他甩下去;看台上一片骚动。赫敏发现斯内普死死盯着哈利,嘴里念念有词,以为是他在施咒。',
      '赫敏冲向教师席,撞翻了奇洛教授,用蓝色的火苗点燃斯内普袍子的下摆;斯内普慌忙扑火,视线移开,哈利的扫帚恢复了正常。',
      '哈利俯冲追上金色飞贼,几乎把它吞了下去,落地后吐了出来,格兰芬多获胜。斯莱特林队脸色难看;罗恩坚持说那一定是斯内普干的。'
    ] },
  { id: 'y1-forest', grade: 1, m: 5, d: 22, title: '禁林里的夜晚', place: '城堡走廊 · 海格的小屋 · 禁林', bg: 'corridor',
    intro: '深夜,被费尔奇抓到的人要被罚去禁林。',
    setting: '夜里的城堡走廊空荡荡的,只有火把的光。',
    cast: ['harry', 'hermione', 'draco', 'neville', 'mcgonagall'], extras: ['海格', '牙牙', '费尔奇', '费伦泽', '独角兽'],
    note: '玩家是被一起罚去禁林的人之一(深夜没睡、在城堡里被费尔奇抓到)。玩家为什么这么晚还在外面,由选项让玩家自己决定(三个选项,选哪个都会被抓到)。',
    summary: '一起被罚进禁林,看到了被杀的独角兽和喝它血的黑影,哈利被半人马费伦泽救下',
    steps: [
      { t: '深夜,玩家在城堡里被费尔奇抓到。用选项让玩家决定自己为什么这么晚还在外面(三个选项)。哈利、赫敏、纳威(以及早被抓到的德拉科)也被带到麦格教授面前;麦格教授宣布每人扣五十分,并罚他们当晚去禁林。', bg: 'corridor' },
      { t: '在海格的小屋前集合。海格带着獒犬“牙牙”,说禁林里有一只独角兽受了重伤,他们要沿着银色的血迹找它;德拉科嘟囔着害怕,吓得发抖。', bg: 'forest' },
      { t: '分成两组:哈利和德拉科带着牙牙一组,玩家、赫敏、纳威跟着海格一组,分头进入林子深处。', bg: 'forest' },
      { t: '玩家这一组远远看见天空升起红色火花,那是哈利他们的求救信号(玩家不在哈利那一组,不会亲眼看见独角兽被害)。哈利那边:死去的独角兽,披斗篷的黑影在吸它的血,朝哈利逼近,伤疤剧痛;德拉科和牙牙吓得逃跑。', bg: 'forest' },
      { t: '半人马费伦泽出现救走了哈利,告诉他喝独角兽的血能保命,却会被诅咒一生,而此刻有人想用它复活。海格带着大家回到小屋,哈利脸色惨白。', bg: 'forest' }
    ] },
  { id: 'y1-hospital', grade: 1, m: 6, d: 10, title: '医疗翼里的真相', place: '医疗翼', bg: 'hospital',
    intro: '哈利昏迷了三天,醒来的时候床边堆满了糖果。',
    setting: '医疗翼里安静明亮,哈利床边堆着各种糖果和卡片。',
    cast: ['harry', 'ron', 'hermione', 'dumbledore'], extras: ['庞弗雷夫人', '海格', '奇洛教授', '伏地魔(只提及)', '尼可·勒梅'],
    note: '地下密室里发生的事(哈利、罗恩、赫敏闯关,哈利独自面对奇洛)玩家没有亲眼看见,只能从哈利、罗恩、赫敏和邓布利多的话里听到。',
    summary: '去医疗翼看望了昏迷后醒来的哈利,听邓布利多解释了魔法石和爱的保护',
    steps: [
      '玩家听说哈利昏迷了三天,来到医疗翼。哈利刚醒,床边堆满糖果;庞弗雷夫人叮嘱不能一次吃太多。',
      '邓布利多来看哈利:魔法石已经被毁,尼可·勒梅和妻子会安详地离世;奇洛死了,伏地魔逃走了但没有彻底消失;哈利母亲的爱在他身上留下了保护。',
      '罗恩和赫敏也来了,讲了各自闯过的关卡;海格送来一本相册,里面是哈利父母的照片。'
    ] },
  { id: 'y1-cup', grade: 1, m: 6, d: 21, title: '学年终宴与学院杯', place: '霍格沃茨大礼堂', bg: 'hall',
    intro: '斯莱特林的绿色旗帜挂满了大礼堂。',
    setting: '大礼堂里挂满了斯莱特林的绿色和银色旗帜。',
    cast: ['dumbledore', 'mcgonagall', 'snape', 'harry', 'ron', 'hermione', 'neville', 'draco'], extras: ['海格', '庞弗雷夫人'],
    note: '学院杯积分:斯莱特林 472,拉文克劳 426,赫奇帕奇 352,格兰芬多 312;最后的加分是罗恩 50、赫敏 50、哈利 60、纳威 10,格兰芬多反超到 482。玩家的学院是「{house}」,请写出玩家学院在这一刻的情绪,但不要替玩家决定情绪,用选项让玩家表达。',
    summary: '一起参加了学年终宴,看着邓布利多把学院杯判给格兰芬多',
    steps: [
      '终宴上,邓布利多宣布本学年的学院杯积分,斯莱特林以 472 分领先,大礼堂里挂满了绿色旗帜。',
      '邓布利多颁发最后的加分:罗恩的精彩棋局 50 分,赫敏的冷静逻辑 50 分,哈利的勇气 60 分,纳威勇敢地对朋友说“不” 10 分;格兰芬多反超到 482 分。',
      '邓布利多挥了一下魔杖,大礼堂的旗帜在转眼间变成红金色;斯莱特林长桌一片死寂,德拉科脸色铁青,格兰芬多的桌子爆发出欢呼。',
      { t: '第二天,九又四分之三站台上,同学们互相告别、约好暑假写信,哈利回到了姨妈家。第一学年结束。', bg: 'train' }
    ] }
];

/* ---- 章节状态 ---- */
const STORY = (() => {
  const st = () => (S.story = S.story || { done: {}, cur: null });
  /* 这一章的日期(游戏里的日历日):九月以后属于这一学年的上半年,一月以后属于下半年 */
  const when = ch => { const Y = 1990 + ch.grade, y = ch.m >= 9 ? Y : Y + 1; return gameDay(new Date(y, ch.m - 1, ch.d)); };
  const inGame = ch => !S.world || 1990 + ch.grade >= S.world.year0;          /* 起点之前的学年不用补 */
  const list = () => STORY_CHAPTERS.filter(inGame);
  const pending = () => list().find(ch => !st().done[ch.id]) || null;
  function status() {
    const ch = pending(); if (!ch) return { state: 'none' };
    if (gameDay() < when(ch)) return { state: 'waiting', ch };
    return { state: st().cur && st().cur.id === ch.id ? 'inprogress' : 'ready', ch };
  }
  const houseName = () => (HOUSES[S.house] && HOUSES[S.house].name) || '自己的学院';
  const fill = t => String(t || '').replace(/\{house\}/g, houseName());
  /* 演完的章节,写进在场角色的记忆 */
  function memory(c) {
    return STORY_CHAPTERS.filter(ch => st().done[ch.id] && (ch.cast.indexOf(c.id) >= 0)).slice(-3)
      .map(ch => '你和玩家一起经历了主线事件「' + ch.title + '」:' + fill(ch.summary));
  }
  return { st, when, list, pending, status, memory, fill };
})();

/* ---- 只在主线里用到的背景(不在地图上):放 scene-<id>.jpg 可以换成你的图 ---- */
Object.assign(SCENE_LOCS, {
  train:    { bg: 'scene-train.jpg',    look: ['train', '#a33b3b'] },
  corridor: { bg: 'scene-corridor.jpg', look: ['corridor', '#d98a3a'] },
  forest:   { bg: 'scene-forest.jpg',   look: ['forest', '#2d5a3a'] },
  hospital: { bg: 'scene-hospital.jpg', look: ['hospital', '#cfd8dc'] }
});

/* ---- 提示词 ---- */
function storySystem(ch, cast, s) {
  const c = S.card, g = curGrade();
  const me = `${c.name || '玩家'}${c.gender ? '(' + c.gender + ')' : ''},${GRADES[g - 1]}(${playerAge()} 岁)${S.house ? '、' + HOUSES[S.house].name + '学生' : ''}。外貌:${c.look || c.appearance || '未设定'}`;
  const castTxt = cast.map(x => `- ${x.id}|${x.name}:${PERSONA.has(x.id) ? x.personaCore() : x.persona}\n  与玩家的关系:${sceneRelLine(x)}`).join('\n');
  const pairs = [];
  for (let i = 0; i < cast.length; i++) for (let k = i + 1; k < cast.length; k++) { const t = PERSONA.pair(cast[i].id, cast[k].id); if (t) pairs.push(`- ${sceneShort(cast[i])}与${sceneShort(cast[k])}:${t}`); }
  const stepT = x => typeof x === 'string' ? x : x.t;
  const steps = ch.steps.map((x, i) => `${i + 1}. ${stepT(x)}${i === s.step ? '   ←【当前步骤】' : i < s.step ? '(已演完)' : ''}`).join('\n');
  const mn = ch.min || 2, mx = ch.max || 5;
  const mem = typeof crossMemoryMulti === 'function' ? crossMemoryMulti(cast, 'scene', {}) : '';
  return [
    '你是一部哈利·波特同人「乙女向橙光文游」的【主线剧情】叙事者。画面是视觉小说:你写的内容会被拆成一句一句,显示在屏幕底部的对话框里;玩家只能点击你给出的选项,不能自由输入。',
    `游戏里现在是:${World.label()}。本章事件发生在原著的 ${ch.m} 月 ${ch.d} 日。`,
    `本章:《${ch.title}》。地点:${ch.place}。${ch.setting}`,
    `玩家角色:${me}`,
    ch.note ? '本章特别说明:' + STORY.fill(ch.note) : '',
    '出场角色(只有他们可以说话):\n' + castTxt,
    pairs.length ? '出场角色之间的关系:\n' + pairs.join('\n') : '',
    mem ? '出场角色记得的近况(只有和当前剧情直接相关时才用):\n' + mem : '',
    '【这是主线剧情,必须完整】本章按原著的事实推进,不能删减、跳过或改写事件的经过和结果。玩家是原创角色,在事件里是同学、目击者或参与者:可以影响小细节、各人对玩家的态度、玩家自己的遭遇,但事件本身必须和原著一致。',
    '本章大纲(按顺序,一步一步演完。不要跳步,不要提前写后面的步骤,不要提前剧透后面的内容):\n' + steps,
    `当前步骤已经演了 ${s.beats} 段。每一步至少演 ${mn} 段、最多 ${mx} 段:这一步的关键内容都演完了,progress 才写 "next"(整章最后一步演完写 "end");还没演完写 "stay"。不要为了赶进度而省略细节,主线剧情要写得充分,不要缩水。`,
    s.step === 0 && s.beats === 0 ? '这是本章的开场:先用旁白交代时间、地点和气氛,再进入第一步。' : '',
    '每一段:lines 写 4~8 条。旁白(who 为空)每条不超过 90 字;角色说的话,who 填角色 id,每条不超过 70 字,可以多位出场角色轮流说话。表里没有的原著人物(' + (ch.extras || []).join('、') + ')只能用旁白转述,who 留空。',
    '规则:',
    '1. 绝不替玩家决定或描写玩家的行动、想法、情绪、表情、身体反应、选择或台词。旁白不要以“你”或玩家的名字作主语;玩家上一步选择的内容当作已经发生的事实,让角色看到并回应,不要扩写它。',
    '2. 角色的言行必须符合各自的人设、与玩家的关系值和原著时间线;不要反复使用同一套口头禅、动作和情绪反应。',
    '3. 玩家是学生,互动保持适龄、非露骨。分清身份:教师不会被要求重做作业、被罚抄,那是学生才会遇到的事。',
    '4. 选项 2~4 个,每个 8~28 字,走向不同,写成玩家能做的事或能说的话(kind 为 say 或 do),不要写成已经发生的事;选项不能改变原著事件的结果。',
    '5. rel:只有玩家上一步真的触动了某位角色,才给出变化(整数,一般 1~3,可为负),普通寒暄一律为空。',
    '只输出一个 JSON,不要代码块:{"lines":[{"who":"","text":"旁白"},{"who":"角色id","text":"这位角色说的话"}],"choices":[{"text":"选项","kind":"say|do"}],"progress":"stay|next|end","rel":{"角色id":{"intimacy":0,"trust":0}}}'
  ].filter(Boolean).join('\n');
}

/* 这一段演完以后,章节走到哪一步 */
function storyAdvance(s, ch, progress) {
  s.beats++;
  const mn = ch.min || 2, mx = ch.max || 5, want = progress === 'next' || progress === 'end';
  if ((want && s.beats >= mn) || s.beats >= mx) {
    if (s.step >= ch.steps.length - 1) return 'end';
    s.step++; s.beats = 0; return 'next';
  }
  return 'stay';
}
const storyStepBg = (ch, i) => { const x = ch.steps[Math.min(i, ch.steps.length - 1)]; return (x && typeof x !== 'string' && x.bg) || ch.bg; };
const storyDateText = ch => ch.m + '月' + ch.d + '日';

/* ---- 画面 ---- */
SCREENS.story = p => {
  const ch = STORY_CHAPTERS.find(x => x.id === p.id), stt = STORY.st();
  if (!stt.cur || stt.cur.id !== ch.id || !Array.isArray(stt.cur.log)) {
    stt.cur = { id: ch.id, step: 0, beats: 0, log: [{ k: 'd', t: '主线《' + ch.title + '》开始:' + World.label() }], cur: null }; save();
  }
  const s = stt.cur;
  const cast = () => ch.cast.map(charById).filter(Boolean);
  return {
    html: `<div class="vn" id="vn">
      <div class="vn-bg" id="bg"></div><div class="vn-shade"></div><div class="vn-dim"></div>
      <div class="vn-top"><button class="vn-btn" data-back>‹ 返回</button><div class="vn-place">${esc(ch.title)}<small>${esc(ch.place)}</small></div><button class="vn-btn" id="blog">回顾</button></div>
      <div class="vn-stage" id="stage"></div>
      <div class="vn-choices" id="chs"></div>
      <div class="vn-box narr" id="box"><div class="vn-name" id="nm" style="display:none"></div><div class="vn-text" id="tx"></div><div class="vn-next" id="nx" style="visibility:hidden">▼</div></div>
      <div class="vn-log" id="log"><div id="lgb"></div></div>
    </div>`,
    mount(el) {
      const vn = q(el, '#vn'), bg = q(el, '#bg'), box = q(el, '#box'), nm = q(el, '#nm'), tx = q(el, '#tx'), nx = q(el, '#nx');
      const stage = q(el, '#stage'), chs = q(el, '#chs'), lg = q(el, '#log'), lgb = q(el, '#lgb');
      let busy = false, alive = true, typing = false, tmr = null, pages = [], pi = 0, stageKey = '', bgKey = '';
      const setBg = id => { if (id === bgKey) return; bgKey = id; const cfg = SCENE_LOCS[id] || {}; bg.style.backgroundImage = (cfg.bg ? `url('${cfg.bg}'),` : '') + sceneFallbackBg(id); };
      setBg(storyStepBg(ch, s.step));
      beforeBack = () => { alive = false; clearTimeout(tmr); save(); return true; };

      function typeOut(text) {
        clearTimeout(tmr); typing = true; nx.style.visibility = 'hidden'; let i = 0;
        const stepT = () => { if (!alive) return; i++; tx.textContent = text.slice(0, i); if (i >= text.length) { typing = false; nx.style.visibility = 'visible'; } else tmr = setTimeout(stepT, SCENE_TYPE_MS); };
        tx.textContent = ''; stepT();
      }
      function showLine() {
        const cur = s.cur, ln = cur.lines[cur.li], c = ln.who ? charById(ln.who) : null;
        pages = scenePages(ln.t); pi = 0;
        nm.style.display = c ? 'block' : 'none'; if (c) { nm.textContent = c.name; nm.style.background = c.color; }
        box.className = 'vn-box ' + (c ? 'said' : 'narr');
        updateStage(); typeOut(pages[0]);
      }
      /* 立绘:角色第一次开口时淡入,说话的亮,其他人暗一点;同时最多 3 位 */
      function updateStage() {
        const cur = s.cur, ids = [];
        cur.lines.slice(0, cur.li + 1).forEach(l => { if (l.who && ids.indexOf(l.who) < 0) ids.push(l.who); });
        const shown = ids.slice(-3), sk = shown.join(',');
        if (sk !== stageKey) { stageKey = sk; stage.innerHTML = shown.map(id => sceneSprite(charById(id))).join(''); stage.className = 'vn-stage n' + shown.length; setTimeout(() => stage.querySelectorAll('.vn-sp').forEach(x => x.classList.add('in')), 30); }
        const spk = cur.lines[cur.li].who;
        stage.querySelectorAll('.vn-sp').forEach(x => x.classList.toggle('dim', !!spk && x.dataset.id !== spk));
      }
      function advance() {
        if (busy || !s.cur || vn.classList.contains('choosing')) return;
        if (typing) { clearTimeout(tmr); tx.textContent = pages[pi]; typing = false; nx.style.visibility = 'visible'; return; }
        if (pi < pages.length - 1) { pi++; typeOut(pages[pi]); return; }
        if (s.cur.li < s.cur.lines.length - 1) { s.cur.li++; save(); showLine(); return; }
        s.cur.end ? showEnd() : showChoices();
      }
      function showChoices() {
        const cs = s.cur.cs;
        vn.classList.add('choosing'); nx.style.visibility = 'hidden';
        chs.innerHTML = cs.map((c, i) => `<button class="vn-opt" data-i="${i}">${esc(c.t)}</button>`).join('');
        chs.querySelectorAll('.vn-opt[data-i]').forEach(b => b.onclick = e => { e.stopPropagation(); const c = cs[+b.dataset.i]; vn.classList.remove('choosing'); chs.innerHTML = ''; step(c.t); });
      }
      /* 整章演完:点一下才算完成,然后回到地图 */
      function showEnd() {
        vn.classList.add('choosing'); nx.style.visibility = 'hidden';
        chs.innerHTML = `<button class="vn-opt" id="vend">本章完 · 回到地图</button>`;
        q(chs, '#vend').onclick = e => { e.stopPropagation(); stt.done[ch.id] = gameDay(); stt.cur = null; if (typeof markTalk === 'function') markTalk(ch.cast); save(); toast('主线《' + ch.title + '》完成'); back(); };
      }
      function waiting() { nm.style.display = 'none'; box.className = 'vn-box narr'; clearTimeout(tmr); typing = false; tx.textContent = '……'; nx.style.visibility = 'hidden'; }

      async function step(userText) {
        if (busy || !aiOk()) return;
        busy = true;
        const pend = userText ? { k: 'u', t: userText } : null;
        if (pend) s.log.push(pend);
        const prev = s.cur, snap = { step: s.step, beats: s.beats }; waiting();
        const rollback = () => { if (pend) { const i = s.log.indexOf(pend); if (i >= 0) s.log.splice(i, 1); } s.step = snap.step; s.beats = snap.beats; };
        try {
          const cs = cast();
          let r = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            const msgs = sceneMsgs(storySystem(ch, cs, s), s.log);
            if (attempt) msgs[msgs.length - 1].content += '\n(上一版没有写出有效的内容。请按要求重写这一段。)';
            const text = await AI.raw(S.api, msgs, 0.95);
            if (!alive) { rollback(); save(); busy = false; return; }
            r = sceneParse(text, cs);
            r.lines = r.lines.map(l => l.who ? l : { who: '', t: sceneStripAgency(l.t, S.card.name) }).filter(l => l.t).slice(0, 10);
            if (r.lines.length >= 2) break;
          }
          if (!r.lines.length) throw new Error('AI 没有返回可用的内容,再试一次');
          const res = storyAdvance(s, ch, r.progress);
          r.cs = r.cs.slice(0, 4); if (!r.cs.length && res !== 'end') r.cs = [{ t: '继续', k: 'self', who: '' }, { t: '再看看周围的情形', k: 'self', who: '' }];
          s.log.push({ k: 'b', l: r.lines, cs: r.cs }); s.log = s.log.slice(-60);
          s.cur = { lines: r.lines, cs: r.cs, li: 0, end: res === 'end' };
          if (userText) Object.keys(r.rel).forEach(id => { const c = charById(id); if (c && ch.cast.indexOf(id) >= 0) applyDelta(c, r.rel[id]); });
          save(); busy = false;
          setBg(storyStepBg(ch, s.step)); showLine();
        } catch (e) {
          rollback(); save(); busy = false;
          if (!alive) return;
          toast(e.message); s.cur = prev;
          if (prev) { showLine(); const c = s.cur; c.li = c.lines.length - 1; showLine(); clearTimeout(tmr); pages = scenePages(c.lines[c.li].t); pi = pages.length - 1; tx.textContent = pages[pi]; typing = false; c.end ? showEnd() : showChoices(); }
          else { vn.classList.add('choosing'); tx.textContent = '没能接上剧情。'; chs.innerHTML = '<button class="vn-opt" id="retry">重试</button>'; q(chs, '#retry').onclick = ev => { ev.stopPropagation(); vn.classList.remove('choosing'); chs.innerHTML = ''; step(null); }; }
        }
      }

      /* 回顾:从上方落下来;还没读到的内容不会提前出现 */
      function logHtml() {
        const cur = s.cur; let lastB = -1; s.log.forEach((e, i) => { if (e.k === 'b') lastB = i; });
        const h = s.log.map((e, i) => {
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

      if (s.cur) { showLine(); } else step(null);
    }
  };
};
