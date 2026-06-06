/** 平台静态数据 */

export const PLATFORM_VERSION = 'v2.1.0';

export const FIVE_DOMAINS = [
  {
    id: 'atlas',
    name: '知识图谱',
    code: 'Atlas',
    color: 'from-violet-500 to-purple-600',
    desc: '48 个商业概念节点，构建系统知识框架',
    path: '/wiki',
  },
  {
    id: 'academy',
    name: '课程学院',
    code: 'Academy',
    color: 'from-emerald-500 to-teal-600',
    desc: '微课、案例分析与单元测验',
    path: '/courses',
  },
  {
    id: 'quest',
    name: '日常活动',
    code: 'Activities',
    color: 'from-amber-500 to-orange-600',
    desc: '单人赛事练习、习惯打卡与连续奖励',
    path: '/activities',
  },
  {
    id: 'arena',
    name: '商赛大厅',
    code: 'Arena',
    color: 'from-blue-500 to-indigo-600',
    desc: '12 种赛制，赛季排位与联赛',
    path: '/games',
  },
  {
    id: 'credenti',
    name: '成就中心',
    code: 'Credenti',
    color: 'from-rose-500 to-pink-600',
    desc: '徽章、微证书与赛季通行证',
    path: '/achievements',
  },
] as const;

export const AI_PILLARS = [
  {
    id: 'hermes',
    name: 'Hermes',
    title: 'AI 生涯导师',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    desc: '引导生涯规划、复盘对局与日常反思',
  },
  {
    id: 'tyche',
    name: 'Tyche',
    title: '市场叙事智能体',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    desc: '模拟消费者需求、舆论变化与市场波动',
  },
  {
    id: 'rival',
    name: 'Rival',
    title: '谈判对手',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    desc: '多轮策略型人机对战与谈判练习',
  },
] as const;

export const DEMO_CAREER = {
  level: 8,
  title: '策略分析师',
  season: '2026-S1',
  seasonDaysLeft: 42,
  xp: 3280,
  nextLevelXp: 4000,
  streak: 5,
  graphProgress: 18,
  graphTotal: 48,
  abilities: {
    financial: 72,
    marketing: 65,
    strategic: 78,
    collaborative: 58,
    ethical: 70,
  },
  weeklyPlan: [
    { day: '周一', tasks: ['完成图谱节点「供需关系」', '日常活动 ×1'] },
    { day: '周三', tasks: ['课程单元：定价策略', '谈判练习 15 分钟'] },
    { day: '周五', tasks: ['回合制教学对局', '阅读赛后复盘'] },
  ],
  narrative:
    '第 3 章 · 你从「旁观者」走向「洞察者」：在回合制商赛中决策一致率 92%，静默策略室的书面分析两次被队长采纳。导师建议下月尝试「投资人对决」以锻炼口头表达。',
};

export const DAILY_HABITS = [
  {
    id: 'q1',
    title: '阅读概念卡「价格弹性」',
    domain: 'Atlas',
    xp: 40,
    done: true,
    hermesHint: '想一想：奶茶涨价 10%，销量下降多少算「弹性大」？',
  },
  {
    id: 'q2',
    title: '完成课程小节测验（≥70 分）',
    domain: 'Academy',
    xp: 80,
    done: false,
    hermesHint: '链接到高中段「商战策略」第 3 单元',
  },
  {
    id: 'q3',
    title: 'Rival 谈判练习：产业链 3 轮',
    domain: 'Rival',
    xp: 60,
    done: false,
    hermesHint: '练习模式不计入排位，可放心试错',
  },
];

/** @deprecated 使用 DAILY_HABITS */
export const DAILY_QUESTS = DAILY_HABITS;

export const ACHIEVEMENTS = [
  { id: 'a1', name: '启程者', desc: '开启生涯模式', rarity: 'common', earned: true },
  { id: 'a2', name: '图谱开拓者', desc: '点亮 15 个知识节点', rarity: 'rare', earned: true },
  { id: 'a3', name: '逆风翻盘', desc: '末位回合后夺冠', rarity: 'epic', earned: false },
  { id: 'a4', name: '谈判学徒', desc: '完成 5 次谈判练习', rarity: 'rare', earned: false },
  { id: 'a5', name: '诚信先锋', desc: 'Ethos 分连续优秀', rarity: 'epic', earned: true },
];

export const GAME_MODES_AI = {
  'turn-based': { tyche: true, rival: false, hermesDebrief: true },
  'supply-chain': { tyche: false, rival: true, hermesDebrief: true },
  'auction': { tyche: true, rival: true, hermesDebrief: true },
  'macro': { tyche: true, rival: false, hermesDebrief: true },
  'esg': { tyche: true, rival: false, hermesDebrief: true },
  'investor': { tyche: false, rival: true, hermesDebrief: true },
} as Record<string, { tyche: boolean; rival: boolean; hermesDebrief: boolean }>;

export const POP_SEGMENTS = [
  { id: 'genz', name: 'Z 世代都市青年', satisfaction: 68, trend: '+8', mood: '讨论性价比与环保' },
  { id: 'family', name: '郊区家庭客群', satisfaction: 52, trend: '-3', mood: '担忧质量下降' },
  { id: 'biz', name: '中小企业采购方', satisfaction: 61, trend: '+2', mood: '观望政策补贴' },
];

export const RIVAL_NEGOTIATION_SCRIPT = [
  { role: 'rival', text: '我们最多接受单价 ¥42，且交货期不能短于 14 天。你们若坚持 10 天，需要加 8% 加急费。' },
  { role: 'user', text: '我们可以接受 12 天交期，但单价希望压在 ¥40，并锁定三季度量。' },
  { role: 'rival', text: '三季度量可以谈，但 ¥40 会挤压我们的毛利。若你们承担部分物流，我可以回到 ¥41。' },
  { role: 'hermes', text: '（导师提示）注意：对方第二次让步了物流条件——你可以追问「承担多少比例」而不是立刻接受单价。' },
];

export const DEBRIEF_MOCK = {
  matchTitle: '回合制策略商赛 #8842',
  rank: 2,
  totalTeams: 6,
  facts: [
    '第 3 轮在「品牌展示」投入不足，导致 Z 世代 POP 满意度下滑 12%',
    '第 4 轮调整路线后，细分市场份额回升，但为时已晚',
    '决策一致率 89%，高于班级均值 67%',
  ],
  knowledgeLinks: [
    { id: 'supply-demand', title: '供需关系', why: '降价策略触发了价格敏感人群' },
    { id: 'brand', title: '品牌资产', why: '展示投入与情感 POP 评分相关' },
  ],
  reflectionQuestions: [
    '第 3 轮你选择维持 TECH 路线时，是否注意到 Demia 舆情中「家庭客群」的不满？',
    '若重来，你会把多少预算从 TECH 转向 Show？理由是什么？',
    '本次对局中，哪一项决策最符合你的性格优势？',
  ],
  suggestedNext: {
    quest: '完成「品牌资产」概念卡',
    practice: '产业链 Rival 谈判 · Normal',
    game: '品牌造物坊（教学对局）',
  },
  narrative:
    '战报摘要：你在技术与用户匹配之间找到了平衡点，但品牌叙事稍晚一步。Z 世代客群已讨论「性价比」，家庭客群在等待质量信号——这正是下一场练习的重点。',
};

export const SHOWCASE_STEPS = [
  {
    step: 1,
    title: '平台概览',
    path: '/',
    script: '学、练、赛、证、馈五大模块形成完整成长闭环。',
  },
  {
    step: 2,
    title: '生涯中枢',
    path: '/career',
    script: '注册后开启生涯：经验等级、五维能力雷达、赛季计划。所有模块活动汇入同一成长档案。',
  },
  {
    step: 3,
    title: '日常活动',
    path: '/activities',
    script: '单人赛事练习与习惯打卡；完成后导师轻反思。与图谱、课程、营内商赛形成日循环。',
  },
  {
    step: 4,
    title: '商赛对局',
    path: '/games/turn-based/play',
    script: '多种赛制可选：回合制策略、实时经营、拍卖交易、产业链谈判等。部分模式嵌入 AI 人群模拟。',
  },
  {
    step: 5,
    title: '谈判练习',
    path: '/games/supply-chain/practice',
    script: '个人练习模式：可对话 AI 对手，多轮还价，不计排位。适合产业链、拍卖、融资场景。',
  },
  {
    step: 6,
    title: '赛后复盘',
    path: '/career/debrief/demo',
    script: '对局结束后结构化复盘：关键事实、概念链接、反思题、下一步推荐。',
  },
  {
    step: 7,
    title: '学习路线',
    path: '/showcase',
    script: '完整的学习路径与功能总览，帮助你快速上手平台。',
  },
];
