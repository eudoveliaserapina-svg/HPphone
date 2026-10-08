/* 调用 OpenAI 兼容接口(DeepSeek 等)。请求直接从玩家浏览器发出,key 不经过任何服务器。 */
const AI = (() => {
  function cardText(card, house) {
    const bits = [];
    if (card.name) bits.push('名字:' + card.name);
    if (card.gender) bits.push('性别:' + card.gender);
    if (card.grade) bits.push('年级:' + GRADES[(+card.grade || 1) - 1]);
    if (house) bits.push('学院:' + HOUSES[house].name);
    ['family:家族', 'appearance:外貌', 'skill:擅长', 'bio:背景'].forEach(p => {
      const [k, label] = p.split(':');
      if (card[k]) bits.push(label + ':' + card[k]);
    });
    return bits.join(';');
  }

  function system(o) {
    const c = o.char, r = o.rel, staff = c.role === 'staff';
    const relText = staff
      ? `你与玩家的信任度为 ${r.trust}/100(教职工对学生只有信任度,没有亲密度)。`
      : `你与玩家的亲密度为 ${r.intimacy}/100,信任度为 ${r.trust}/100。`;
    const style = o.mode === 'call'
      ? '这是电话通话:口语化,最多两句话,不要写括号动作或旁白。'
      : '这是手机聊天:像发消息一样自然,1 到 3 句,不要旁白。';
    return [
      `你正在一个哈利·波特同人手机应用里扮演「${c.name}」。`,
      `人设:${c.persona}`,
      `玩家角色:${cardText(o.card, o.house)}`,
      `现在是:${new Date().toLocaleString('zh-CN')}`,
      relText,
      '规则:',
      '1. 始终保持角色,不要提到自己是 AI 或在扮演。',
      '2. ' + style,
      '3. 根据玩家这句话评估关系变化:友善、尊重、让你开心则上升;冒犯、敷衍、触碰底线则下降;普通寒暄可为 0。变化必须符合你的人设,范围是 -5 到 5 的整数。',
      staff ? '4. 你是教职工,intimacy 必须为 0,只有 trust 会变化。' : '',
      '只输出一个 JSON 对象,不要代码块,格式:{"reply":"你说的话","intimacy":整数,"trust":整数}'
    ].filter(Boolean).join('\n');
  }

  function parse(text) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        const j = JSON.parse(text.slice(a, b + 1));
        if (j && typeof j.reply === 'string') return j;
      } catch (e) { /* 落到下面的兜底 */ }
    }
    return { reply: text.trim(), intimacy: 0, trust: 0 };
  }

  async function ask(o) {
    const api = o.api;
    if (!api.key) throw new Error('还没有填写 API Key');
    const msgs = [{ role: 'system', content: system(o) }]
      .concat(o.hist.filter(m => m.r === 'user' || m.r === 'assistant').slice(-16)
        .map(m => ({ role: m.r, content: m.c })));
    const url = api.base.replace(/\/+$/, '') + '/chat/completions';
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.key },
        body: JSON.stringify({ model: api.model, messages: msgs, temperature: 1.0 })
      });
    } catch (e) {
      throw new Error('网络请求失败:检查 API 地址,或该接口不允许浏览器直接调用(跨域)');
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('接口返回 ' + res.status + (res.status === 401 ? '(Key 不对或已失效)' : '') + ' ' + t.slice(0, 80));
    }
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('接口没有返回内容');
    return parse(text);
  }

  return { ask };
})();
