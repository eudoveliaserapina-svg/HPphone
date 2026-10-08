/* 本地存档:全部存在玩家自己浏览器的 localStorage 里。 */
const Store = (() => {
  const KEY = 'hogwarts-phone-v1';
  const defaults = () => ({
    v: 1,
    api: { base: 'https://api.deepseek.com/v1', key: '', model: 'deepseek-chat' },
    card: {}, seenLetter: false, house: null, sortedAt: 0,
    theme: 'common', rel: {}, chats: {}
  });
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        return Object.assign(d, o, { api: Object.assign(d.api, o.api || {}) });
      }
    } catch (e) { /* 读取失败就用默认值 */ }
    return d;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { console.warn('存档失败', e); }
  }
  return { load, save, defaults };
})();
