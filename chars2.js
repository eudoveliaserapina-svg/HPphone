/* 新增角色:来自《主要角色 AI 人设卡》的另外 7 位。
   学生(哈利、罗恩、金妮、纳威)有亲密度和信任度;其余(邓布利多、小天狼星)和教职工一样只有信任度。
   伏地魔不是手机联系人(只会出现在主线剧情里),所以不在这里。
   map:这个角色会出现在哪些地图地点。不写 = 按地图原来的随机规则;[] = 不会出现在城堡的任何地点(只能在手机上联系);['hall'] = 只会出现在大礼堂。
   详细人设在 persona.js 里(按学年变化),这里的 persona 只是兜底。 */
(function () {
  const NEW_CHARS = [
    { id: 'harry', name: '哈利·波特', role: 'student', house: 'gryffindor', color: '#c0582b', pitch: 1.0, rate: 1.0,
      persona: '格兰芬多学生,勇敢、固执、重视朋友和公平,不喜欢被当成象征。', extra: { voice: 'benjamin', postLikely: 0.4, cheerful: false, likes: ['sweets', 'prank'], dislikes: [] } },
    { id: 'ron', name: '罗恩·韦斯莱', role: 'student', house: 'gryffindor', color: '#d9843b', pitch: 0.95, rate: 1.05,
      persona: '格兰芬多学生,幽默、忠诚、爱吃爱开玩笑,自尊心容易受伤。', extra: { voice: 'alex', postLikely: 0.6, cheerful: true, likes: ['sweets', 'prank'], dislikes: ['book'] } },
    { id: 'ginny', name: '金妮·韦斯莱', role: 'student', house: 'gryffindor', color: '#c2415d', pitch: 1.2, rate: 1.05,
      persona: '格兰芬多学生,勇敢、独立、有主见,擅长魁地奇和施咒。', extra: { voice: 'bella', postLikely: 0.5, cheerful: true, likes: ['prank', 'sweets', 'jewelry'], dislikes: [] } },
    { id: 'neville', name: '纳威·隆巴顿', role: 'student', house: 'gryffindor', color: '#5f8a4a', pitch: 1.0, rate: 0.95,
      persona: '格兰芬多学生,擅长草药学,早期缺乏自信,善良忠诚努力。', extra: { voice: 'benjamin', postLikely: 0.3, cheerful: false, likes: ['sweets', 'book'], dislikes: [] } },
    { id: 'dumbledore', name: '阿不思·邓布利多', role: 'staff', house: null, title: '霍格沃茨校长', color: '#6a4fa3', pitch: 0.85, rate: 0.9, map: ['hall'],
      persona: '霍格沃茨校长,温和、委婉、爱用幽默和谜语引导对话,喜欢甜食。', extra: { voice: 'charles', postLikely: 0, cheerful: true, likes: ['sweets', 'book'], dislikes: [] } },
    { id: 'sirius', name: '小天狼星·布莱克', role: 'staff', house: null, title: '哈利的教父 | 掠夺者之一', color: '#3a3f4f', pitch: 0.9, rate: 1.0, map: [],
      persona: '哈利的教父,叛逆、机智、忠诚,熟人面前幽默亲昵。', extra: { voice: 'charles', postLikely: 0, cheerful: true, likes: ['prank', 'sweets'], dislikes: [] } }
  ];
  NEW_CHARS.forEach(n => {
    if (CHARACTERS.some(c => c.id === n.id)) return;              /* 已经有同 id 的角色就不重复加 */
    const ex = n.extra; delete n.extra;
    CHAR_EXTRA[n.id] = ex;
    CHARACTERS.push(Object.assign(n, ex));
  });
})();
