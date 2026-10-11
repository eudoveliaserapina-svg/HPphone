/* 第二批功能的数据:角色的声音/喜好、商品、地点、兼职、卡牌、占卜 */
const CHAR_EXTRA = {
  draco:      { voice: 'alex',     postLikely: 0.7, cheerful: false, likes: ['jewelry', 'potion'], dislikes: ['prank'] },
  hermione:   { voice: 'anna',     postLikely: 0.6, cheerful: false, likes: ['book', 'potion'],    dislikes: ['prank'] },
  luna:       { voice: 'bella',    postLikely: 0.5, cheerful: true,  likes: ['prank', 'sweets', 'jewelry'], dislikes: [] },
  cedric:     { voice: 'benjamin', postLikely: 0.4, cheerful: true,  likes: ['sweets', 'book'],    dislikes: [] },
  snape:      { voice: 'charles',  postLikely: 0,   cheerful: false, likes: ['potion', 'book'],    dislikes: ['prank', 'sweets'] },
  mcgonagall: { voice: 'diana',    postLikely: 0,   cheerful: false, likes: ['book', 'sweets'],    dislikes: ['prank'] }
};
CHARACTERS.forEach(c => Object.assign(c, CHAR_EXTRA[c.id]));

const KNUT_PER_SICKLE = 29, KNUT_PER_GALLEON = 493;

/* cat: sweets 糖果 / potion 药剂 / jewelry 饰品 / prank 恶作剧 / book 书 */
const ITEMS = [
  { id: 'beans', name: '比比多味豆', cat: 'sweets', price: 29, emoji: '🍬', desc: '什么味道都有,包括呕吐味。' },
  { id: 'frogchoc', name: '巧克力蛙', cat: 'sweets', price: 58, emoji: '🐸', desc: '会蹦。' },
  { id: 'licorice', name: '甘草魔杖', cat: 'sweets', price: 15, emoji: '🍭', desc: '甜得发齁。' },
  { id: 'focus', name: '提神剂', cat: 'potion', price: 145, emoji: '🧪', desc: '考试周的救星。' },
  { id: 'calm', name: '安神药水', cat: 'potion', price: 116, emoji: '🫗', desc: '喝完很想睡觉。' },
  { id: 'silverring', name: '银质小戒指', cat: 'jewelry', price: 493, emoji: '💍', desc: '刻着细小的星星。' },
  { id: 'brooch', name: '古董胸针', cat: 'jewelry', price: 740, emoji: '📿', desc: '据说有些年头了。' },
  { id: 'book1', name: '《魔法典故》旧书', cat: 'book', price: 290, emoji: '📖', desc: '页边有前任主人的批注。' },
  { id: 'extear', name: '伸缩耳', cat: 'prank', price: 87, emoji: '👂', desc: '偷听神器,请勿被抓。' },
  { id: 'dungbomb', name: '臭弹', cat: 'prank', price: 44, emoji: '💣', desc: '效果拔群。' },
  { id: 'firework', name: '韦斯莱烟火', cat: 'prank', price: 203, emoji: '🎆', desc: '请在室外使用。' }
];
const CAT_NAME = { sweets: '糖果', potion: '药剂', jewelry: '饰品', prank: '恶作剧道具', book: '书' };

/* 城堡地点(x,y 为示意地图上的位置) */
const LOCATIONS = [
  { id: 'hall',       name: '大礼堂',       x: 50, y: 52, acts: ['在长桌边吃饭', '和朋友聊天', '翻看今天的报纸'] },
  { id: 'library',    name: '图书馆',       x: 22, y: 28, acts: ['埋头写论文', '在书架间找书', '被管理员瞪了一眼'] },
  { id: 'potions',    name: '魔药教室',     x: 22, y: 78, acts: ['熬制药剂', '收拾坩埚', '被要求重做作业'] },
  { id: 'transfig',   name: '变形术教室',   x: 78, y: 28, acts: ['练习变形咒', '整理羽毛笔', '在课桌前记笔记'] },
  { id: 'greenhouse', name: '温室',         x: 80, y: 62, acts: ['给植物换盆', '修剪枝叶', '研究新的种子'] },
  { id: 'owlery',     name: '猫头鹰棚屋',   x: 50, y: 14, acts: ['给家里寄信', '喂猫头鹰', '看着天空发呆'] },
  { id: 'pitch',      name: '魁地奇球场',   x: 82, y: 84, acts: ['练习飞行', '观看训练', '检查扫帚'] },
  { id: 'lake',       name: '黑湖',         x: 50, y: 88, acts: ['在湖边散步', '看湖面冒泡', '一个人待着'] },
  { id: 'room',       name: '有求必应屋',   x: 14, y: 54, acts: ['在里面做点秘密的事', '练习咒语', '似乎在躲谁'] }
];
const SLOTS = [['07:00', '早餐'], ['09:00', '上午'], ['12:30', '午餐'], ['14:00', '下午'], ['18:30', '晚餐'], ['20:00', '晚间']];

const JOBS = [
  { id: 'j1', name: '帮斯内普教授整理药材', place: '城堡', pay: 87,  boss: '斯内普教授', staff: 'snape', grade: 1, desc: '分类、称重、不许碰任何东西。' },
  { id: 'j2', name: '帮费尔奇打扫走廊',     place: '城堡', pay: 58,  boss: '费尔奇', grade: 1, desc: '擦盔甲、扫灰尘、被洛丽丝夫人盯着。' },
  { id: 'j3', name: '帮海格照顾动物',       place: '城堡', pay: 72,  boss: '海格', grade: 1, desc: '喂食、铲粪、小心被咬。' },
  { id: 'j4', name: '帮图书管理员整理图书', place: '城堡', pay: 65,  boss: '图书管理员', grade: 1, desc: '把还回来的书放回原位。' },
  { id: 'h1', name: '糖果店店员',           place: '霍格莫德村', pay: 160, boss: '店长', grade: 4, weekend: true, desc: '周末限定,看店、补货。' },
  { id: 'h2', name: '酒吧帮工',             place: '霍格莫德村', pay: 190, boss: '老板娘', grade: 4, weekend: true, desc: '端黄油啤酒,小费另算。' },
  { id: 'h3', name: '笑话店试验员',         place: '霍格莫德村', pay: 220, boss: '店长', grade: 4, weekend: true, desc: '试用新品,后果自负。' },
  { id: 'g1', name: '替同学代写魔药学作业', place: '学生之间', pay: 260, boss: '匿名', grade: 2, grey: true, desc: '教授不知道,学生里也只有少数人知道。' },
  { id: 'g2', name: '倒卖宵禁后的夜宵',     place: '学生之间', pay: 200, boss: '匿名', grade: 2, grey: true, desc: '从厨房偷运,被抓到会很麻烦。' },
  { id: 'g3', name: '替人在课上望风',       place: '学生之间', pay: 150, boss: '匿名', grade: 2, grey: true, desc: '收费,不问原因。' }
];

const FROGS = [
  ['阿不思·邓布利多', 'SSR'], ['梅林', 'SSR'], ['摩根勒菲', 'SR'], ['戈德里克·格兰芬多', 'SR'], ['罗伊纳·拉文克劳', 'SR'],
  ['赫尔加·赫奇帕奇', 'SR'], ['萨拉查·斯莱特林', 'SR'], ['尼可·勒梅', 'R'], ['鲁伯·海格', 'R'], ['米勒娃·麦格', 'R'],
  ['西弗勒斯·斯内普', 'R'], ['无名巫师甲', 'N'], ['无名巫师乙', 'N'], ['无名女巫', 'N'], ['迷路的预言家', 'N'], ['打瞌睡的画像', 'N']
];
const FROG_WEIGHT = { SSR: 3, SR: 12, R: 30, N: 55 };

const TEA_SYMBOLS = ['新月', '锚', '蛇', '钥匙', '飞鸟', '心形', '十字', '树', '眼睛', '山', '戒指', '蜘蛛'];
const BALL_SYMBOLS = ['雾里的人影', '远处的一盏灯', '半开的门', '水面的涟漪', '碎掉的镜子', '一只猫头鹰', '燃烧的羽毛', '缓缓转动的星'];
const TAROT = ['愚者', '魔术师', '女祭司', '皇后', '皇帝', '恋人', '战车', '力量', '隐者', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'];
const SUBJECTS = ['魔咒学', '变形术', '草药学', '魔药学', '黑魔法防御术', '魔法史', '天文学'];
