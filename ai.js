/* 调用 OpenAI 兼容接口。请求直接从玩家浏览器发出,key 不经过任何服务器。 */
const AI = (() => {
  function cardText(card, house) {
    const bits = [];
    if (card.name) bits.push('名字:' + card.name);
    if (card.gender) bits.push('性别:' + card.gender);
    if (card.grade) bits.push('年级:' + GRADES[(+card.grade || 1) - 1]);
    if (house) bits.push('学院:' + HOUSES[house].name);
    [['family', '家族'], ['appearance', '外貌'], ['look', '从立绘看到的外貌'], ['skill', '擅长'], ['bio', '背景']].forEach(([k, label]) => {
      if (card[k]) bits.push(label + ':' + card[k]);
    });
    return bits.join(';');
  }

  function system(o) {
    const c = o.char, r = o.rel, staff = c.role === 'staff';
    const relText = staff
      ? `你与玩家的信任度为 ${r.trust}/100(教职工对学生只有信任度,没有亲密度)。`
      : `你与玩家的亲密度为 ${r.intimacy}/100,信任度为 ${r.trust}/100。`;
    const style = o.mode === 'call' ? '这是电话通话:口语化,最多两句话,不要写括号动作或旁白。'
      : o.mode === 'touch' ? '玩家正在陪伴你,并轻轻碰了碰你。用一句话做出符合人设的反应,可以带一点点动作描写。'
      : o.mode === 'letter' ? '这是写信:用信件的口吻,有称呼和落款,80 到 200 字。'
      : '这是手机聊天:像发消息一样自然,1 到 3 句,不要旁白。';
    return [
      `你正在一个哈利·波特同人手机应用里扮演「${c.name}」。`,
      `人设:${c.persona}`,
      `玩家角色:${cardText(o.card, o.house)}`,
      `现在是游戏世界里的:${World.label()}(故事发生在原著的时间线上)`,
      relText,
      o.extra || '',
      '规则:',
      '1. 始终保持角色,不要提到自己是 AI 或在扮演。',
      '2. ' + style,
      '3. 关系变化要克制:绝大多数普通对话(寒暄、闲聊、日常提问)的 intimacy 和 trust 都应该是 0。只有玩家这句话真的触动了你(明显让你开心、感动、被冒犯、被冷落,或符合/违背你的底线)才变化,幅度 1 到 3,极少数情况才到 5。不要每句话都加分或扣分。',
      staff ? '4. 你是教职工,intimacy 必须为 0,只有 trust 会变化。' : '',
      o.wantEn ? '5. 同时给出 en 字段:把 reply 里说出口的话译成自然的英文口语(符合你的人设和语气,英式口吻),不要包含动作描写。' : '',
      o.wantEn ? '只输出一个 JSON 对象,不要代码块,格式:{"reply":"你说的话(中文)","en":"同一句话的英文版","intimacy":整数,"trust":整数}'
        : '只输出一个 JSON 对象,不要代码块,格式:{"reply":"你说的话","intimacy":整数,"trust":整数}'
    ].filter(Boolean).join('\n');
  }

  function parse(text) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { /* 兜底 */ }
    }
    return null;
  }

  /* 通用:发送 messages,返回文本 */
  async function raw(cfg, messages, temperature) {
    if (!cfg.key) throw new Error('还没有填写 API Key');
    const url = cfg.base.replace(/\/+$/, '') + '/chat/completions';
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({ model: cfg.model, messages, temperature: temperature == null ? 1.0 : temperature })
      });
    } catch (e) {
      throw new Error('网络请求失败:检查接口地址,或该接口不允许浏览器直接调用(跨域)');
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('接口返回 ' + res.status + (res.status === 401 ? '(Key 不对或已失效)' : '') + ' ' + t.slice(0, 80));
    }
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('接口没有返回内容');
    return text;
  }

  /* 单个角色的对话 */
  async function ask(o) {
    const msgs = [{ role: 'system', content: system(o) }]
      .concat(o.hist.filter(m => m.r === 'user' || m.r === 'assistant').slice(-16).map(m => ({ role: m.r, content: m.c })));
    const text = await raw(o.api, msgs);
    const j = parse(text);
    if (j && typeof j.reply === 'string') return j;
    return { reply: text.trim(), intimacy: 0, trust: 0 };
  }

  /* 让模型直接输出 JSON(群聊、论坛、剧场等) */
  async function json(cfg, system, user) {
    const text = await raw(cfg, [{ role: 'system', content: system + '\n只输出一个 JSON,不要代码块,不要多余文字。' }, { role: 'user', content: user }]);
    const j = parse(text);
    if (!j) throw new Error('AI 没有返回正确的格式,再试一次');
    return j;
  }
  async function text(cfg, system, user) {
    return (await raw(cfg, [{ role: 'system', content: system }, { role: 'user', content: user }])).trim();
  }

  /* 识图:让模型看立绘并描述外貌 */
  async function vision(cfg, dataUrl, prompt) {
    if (!cfg.model) throw new Error('请先在设置里填写识图模型名');
    return (await raw(cfg, [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }], 0.3)).trim();
  }

  /* 语音合成:ElevenLabs。请求从玩家浏览器直接发出,返回可播放的 blob 地址 */
  async function tts(cfg, input, voiceId) {
    if (!cfg.key) throw new Error('还没有填写 ElevenLabs 的 API Key');
    if (!voiceId) throw new Error('这个角色还没有填写 Voice ID');
    let res;
    try {
      res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': cfg.key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: input, model_id: cfg.model || 'eleven_multilingual_v2',
          voice_settings: { stability: +cfg.stability || 0.5, similarity_boost: +cfg.similarity || 0.75 } })
      });
    } catch (e) { throw new Error('连不上 ElevenLabs(网络或跨域限制)'); }
    if (!res.ok) {
      const code = res.status; let why = '';
      try { const j = JSON.parse(await res.text()); const d = j.detail || j; why = (d.status || '') + (d.message ? ':' + d.message : ''); } catch (e) {}
      const lib = /library voices|paid_plan_required|not available for free/i.test(why + code);
      const hint = lib ? '这个声音来自声音库,免费账号不能通过 API 使用。请改用你自己用 Voice Design 做出来的声音,或升级套餐'
        : code === 401 ? 'Key 不对,或没有开 Text to Speech 权限,或额度用完了'
        : code === 404 ? '找不到这个声音:Voice ID 填错了,或者这个声音不在这个 Key 所属账号的“My Voices”里'
        : code === 422 ? 'Voice ID 的格式不对'
        : code === 402 ? '额度不足或套餐不支持这个声音'
        : code === 429 ? '请求太快或同时请求太多,稍等几秒再试' : '';
      throw new Error(('ElevenLabs ' + code + ' ' + hint + (why ? '(' + why.slice(0, 120) + ')' : '')).trim());
    }
    return URL.createObjectURL(await res.blob());
  }

  return { ask, raw, json, text, vision, tts };
})();
