/* 桌面图标(线条风格 SVG) */
const ICONS = {
  chat: '<path d="M8 12h32v20H22l-8 7v-7H8z"/><path d="M15 20h18M15 26h11"/>',
  phone: '<path d="M14 8l6 2 2 8-4 3a22 22 0 0 0 10 10l3-4 8 2 2 6c-1 6-8 8-14 5A32 32 0 0 1 9 22C6 16 8 9 14 8z"/>',
  calendar: '<rect x="8" y="11" width="32" height="29" rx="4"/><path d="M8 20h32M16 7v8M32 7v8"/><circle cx="24" cy="30" r="2.5" fill="currentColor"/>',
  memo: '<path d="M12 8h20l6 6v26H12z"/><path d="M18 22h14M18 29h14M18 36h8"/>',
  companion: '<path d="M19 22h10v18H19z"/><path d="M24 8c4 5 4 8 0 10-4-2-4-5 0-10z"/><path d="M14 40h20"/>',
  theater: '<path d="M8 12h20v14a10 10 0 0 1-20 0z"/><circle cx="14" cy="19" r="1.5" fill="currentColor"/><circle cx="22" cy="19" r="1.5" fill="currentColor"/><path d="M13 27q4 4 8 0M30 18h10v12a8 8 0 0 1-14 5"/>',
  games: '<rect x="9" y="9" width="30" height="30" rx="6"/><circle cx="18" cy="18" r="2.2" fill="currentColor"/><circle cx="30" cy="18" r="2.2" fill="currentColor"/><circle cx="24" cy="24" r="2.2" fill="currentColor"/><circle cx="18" cy="30" r="2.2" fill="currentColor"/><circle cx="30" cy="30" r="2.2" fill="currentColor"/>',
  todo: '<rect x="9" y="9" width="30" height="30" rx="5"/><path d="M16 24l6 6 11-12"/>',
  job: '<path d="M38 8L23 24"/><path d="M18 22l8 8-10 10c-6 0-8-4-8-8z"/><path d="M14 34l6 6"/>',
  music: '<path d="M19 34V12l18-4v22"/><circle cx="14" cy="34" r="5"/><circle cx="32" cy="30" r="5"/>',
  map: '<path d="M8 12l11-4 10 4 11-4v28l-11 4-10-4-11 4z"/><path d="M19 8v28M29 12v28"/>',
  forum: '<rect x="9" y="8" width="30" height="32" rx="3"/><path d="M15 16h18M15 23h18M15 30h11"/>',
  cup: '<path d="M14 8h20v12a10 10 0 0 1-20 0z"/><path d="M14 12H8q0 8 7 9M34 12h6q0 8-7 9M24 30v8M16 40h16"/>',
  divine: '<circle cx="24" cy="21" r="13"/><path d="M12 36h24l-3 6H15z"/><path d="M18 17q3-4 8-3"/>',
  owl: '<rect x="7" y="12" width="34" height="24" rx="3"/><path d="M7 15l17 13 17-13"/>',
  look: '<path d="M24 7C14 7 7 14 7 23s7 18 15 18c3 0 4-2 3-4s0-4 3-4h6c4 0 7-3 7-7C41 14 34 7 24 7z"/><circle cx="16" cy="22" r="2" fill="currentColor"/><circle cx="24" cy="15" r="2" fill="currentColor"/><circle cx="32" cy="22" r="2" fill="currentColor"/>',
  shop: '<path d="M10 16h28l-2 24H12z"/><path d="M18 20v-6a6 6 0 0 1 12 0v6"/>',
  hat: '<path d="M6 38h36M12 38c2-4 6-6 8-14l4-16c3 6 6 12 8 18 2 5 5 8 6 12"/>',
  set: '<circle cx="24" cy="24" r="6"/><path d="M24 7v6M24 35v6M7 24h6M35 24h6M12 12l4 4M32 32l4 4M36 12l-4 4M16 32l-4 4"/>'
};
const svgIcon = k => `<svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[k]}</svg>`;
