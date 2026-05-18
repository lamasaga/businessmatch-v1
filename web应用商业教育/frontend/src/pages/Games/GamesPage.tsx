import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  Plus,
  Users,
  Clock,
  Trophy,
  Swords,
  TrendingUp,
  Flame,
  Globe,
  Leaf,
  Scale,
  Gavel,
  BookOpen,
  Search,
  Bot,
  Sparkles,
} from 'lucide-react';
import { GAME_MODES_AI } from '../../data/mockPlatform';

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  players: string;
  duration: string;
  difficulty: string;
  category: string;
}

const gameModes: GameMode[] = [
  {
    id: 'turn-based',
    name: '回合制策略商赛',
    description: '四轮回合制竞技，选择路线并投资技术、用户匹配与品牌展示',
    icon: Swords,
    color: 'from-blue-500 to-indigo-500',
    players: '4-10队',
    duration: '40-60分钟',
    difficulty: '中等',
    category: '策略',
  },
  {
    id: 'real-time',
    name: '实时经营挑战',
    description: '持续运转的经营模拟，决策即时生效，随机事件不断发生',
    icon: TrendingUp,
    color: 'from-cyan-500 to-blue-500',
    players: '1人',
    duration: '30-45分钟',
    difficulty: '中等',
    category: '经营',
  },
  {
    id: 'auction',
    name: '拍卖交易大厅',
    description: '公开喊价与密封报价并存的金融模拟，体验价格发现与风险控制',
    icon: Gavel,
    color: 'from-amber-500 to-orange-500',
    players: '4-8人',
    duration: '20-30分钟',
    difficulty: '中等',
    category: '金融',
  },
  {
    id: 'supply-chain',
    name: '产业链角色扮演',
    description: '供应商、制造商、分销商、零售商四组对抗，体验信息不对称与谈判',
    icon: Scale,
    color: 'from-pink-500 to-rose-500',
    players: '16人',
    duration: '40-60分钟',
    difficulty: '困难',
    category: '协作',
  },
  {
    id: 'case-study',
    name: '案例推演决策',
    description: '真实企业改编互动案例，面对关键决策点，每个选择影响剧情分支',
    icon: BookOpen,
    color: 'from-indigo-500 to-violet-500',
    players: '1人',
    duration: '1-2天/决策',
    difficulty: '困难',
    category: '决策',
  },
  {
    id: 'investor',
    name: '投资人对决',
    description: '创业者 vs 投资人双阵营对抗，体验路演、估值谈判与条款博弈',
    icon: Trophy,
    color: 'from-violet-500 to-purple-500',
    players: '8-16人',
    duration: '60-90分钟',
    difficulty: '困难',
    category: '投融资',
  },
  {
    id: 'survival',
    name: '创业生存战',
    description: '现金流断裂即出局，没有排名只有生死，训练风险意识与危机决策',
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    players: '4-8人',
    duration: '30-45分钟',
    difficulty: '困难',
    category: '生存',
  },
  {
    id: 'macro',
    name: '宏观经济沙盘',
    description: '引入通胀、紧缩、政策调控等宏观变量，理解宏观对微观的影响',
    icon: Globe,
    color: 'from-sky-500 to-cyan-500',
    players: '4-10队',
    duration: '45-60分钟',
    difficulty: '困难',
    category: '宏观',
  },
  {
    id: 'esg',
    name: 'ESG 可持续经营',
    description: '引入环保、社会、治理三维指标，企业价值不再只看利润',
    icon: Leaf,
    color: 'from-emerald-500 to-green-500',
    players: '4-8队',
    duration: '40-60分钟',
    difficulty: '困难',
    category: 'ESG',
  },
  {
    id: 'global-trade',
    name: '跨国贸易博弈',
    description: '面对汇率波动、关税壁垒、文化差异与地缘政治风险',
    icon: Globe,
    color: 'from-indigo-500 to-blue-500',
    players: '4-8队',
    duration: '45-60分钟',
    difficulty: '专家',
    category: '贸易',
  },
];

const categories = ['全部', '策略', '经营', '金融', '协作', '决策', '投融资', '生存', '宏观', 'ESG', '贸易'];

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = gameModes.filter((game) => {
    const matchesCategory = activeCategory === '全部' || game.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight">
            <Gamepad2 className="w-8 h-8 text-primary" />
            商赛大厅
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">12 种赛制 · 排位赛 · 练习赛 · 赛后复盘</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-background font-semibold hover:bg-primary/90 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          创建对局
        </button>
      </header>

      {/* Search & Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索商赛模式..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-background'
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Game Modes Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {filteredGames.map((game) => {
          const Icon = game.icon;
          const ai = GAME_MODES_AI[game.id];
          return (
            <div
              key={game.id}
              className="glass-card p-6 hover:bg-background-hover/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground">{game.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-background-secondary text-[10px] text-foreground-muted font-medium">
                      {game.category}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed mb-3">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {game.players}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {game.duration}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        game.difficulty === '简单'
                          ? 'bg-success/10 text-success'
                          : game.difficulty === '中等'
                          ? 'bg-warning/10 text-warning'
                          : game.difficulty === '困难'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-purple-500/10 text-purple-400'
                      }`}
                    >
                      {game.difficulty}
                    </span>
                  </div>
                  {ai && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {ai.demia && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 inline-flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3" /> Demia
                        </span>
                      )}
                      {ai.rival && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 inline-flex items-center gap-1 font-medium">
                          <Bot className="w-3 h-3" /> Rival
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap gap-2">
                {ai?.demia && (
                  <Link
                    to={`/games/${game.id}/play`}
                    className="flex-1 min-w-[100px] text-center py-2.5 rounded-lg bg-cyan-600/90 text-white text-xs font-semibold hover:bg-cyan-600 transition-colors"
                  >
                    AI 对局
                  </Link>
                )}
                {ai?.rival && (
                  <Link
                    to={`/games/${game.id}/practice`}
                    className="flex-1 min-w-[100px] text-center py-2.5 rounded-lg bg-orange-600/90 text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                  >
                    谈判练习
                  </Link>
                )}
                <Link
                  to={`/games/${game.id}`}
                  className="flex-1 min-w-[80px] text-center py-2.5 rounded-lg border border-border-subtle text-xs hover:bg-background-hover transition-colors text-foreground-secondary"
                >
                  房间
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="text-center py-20">
          <Gamepad2 className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
          <p className="text-foreground-muted">没有找到匹配的商赛模式</p>
        </div>
      )}
    </section>
  );
}
