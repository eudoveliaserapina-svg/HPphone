/* 本地存档:全部存在玩家自己浏览器的 localStorage 里。 */
const Store = (() => {
  const KEY = 'hogwarts-phone-v1';
  const defaults = () => ({
    v: 2,
    api: { base: 'https://api.siliconflow.cn/v1', key: '', model: 'deepseek-ai/DeepSeek-V3' },
    vision: { base: '', key: '', model: '' },
    tts: { key: '', model: 'eleven_multilingual_v2', stability: 0.5, similarity: 0.75, english: true, voices: {} },
    world: null, card: {}, seenLetter: false, house: null, sortedAt: 0, theme: 'common',
    rel: {}, chats: {}, fav: {}, charImg: {}, cool: {},
    coins: 986, inv: {}, frogs: {}, rewards: {},
    memos: [], todos: {}, visited: {}, bonus: {}, jobsDone: {}, divined: {},
    forum: {}, moments: [], groups: [], mail: [], plays: []
  });
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        const m = Object.assign(d, o);
        ['api', 'vision', 'tts'].forEach(k => { m[k] = Object.assign(defaults()[k], (o && o[k]) || {}); });
        return m;
      }
    } catch (e) { /* 读取失败就用默认值 */ }
    return d;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; }
    catch (e) { console.warn('存档失败', e); return false; }
  }
  return { load, save, defaults };
})();
