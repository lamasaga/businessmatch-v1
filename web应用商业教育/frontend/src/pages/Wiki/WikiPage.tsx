import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Search,
  BookOpen,
  TrendingUp,
  ChevronRight,
  Tag,
} from 'lucide-react';

interface WikiCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  articleCount: number;
}

interface WikiArticlePreview {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  viewCount: number;
}

const categories: WikiCategory[] = [
  { id: 'classics', name: '经济学经典', icon: BookOpen, color: 'from-amber-500 to-orange-500', articleCount: 15 },
  { id: 'micro', name: '微观经济学', icon: TrendingUp, color: 'from-blue-500 to-indigo-500', articleCount: 23 },
  { id: 'macro', name: '宏观经济学', icon: Network, color: 'from-emerald-500 to-teal-500', articleCount: 18 },
  { id: 'game-theory', name: '博弈论', icon: Network, color: 'from-violet-500 to-purple-500', articleCount: 12 },
  { id: 'finance', name: '金融学', icon: TrendingUp, color: 'from-cyan-500 to-blue-500', articleCount: 20 },
  { id: 'management', name: '管理学', icon: BookOpen, color: 'from-pink-500 to-rose-500', articleCount: 16 },
];

const featuredArticles: WikiArticlePreview[] = [
  {
    id: 'wealth-of-nations',
    title: '《国富论》导读',
    excerpt: '亚当·斯密的传世之作，奠定了现代经济学的基础。从劳动分工到看不见的手，理解财富的本质...',
    category: '经济学经典',
    tags: ['亚当·斯密', '古典经济学', '劳动分工'],
    viewCount: 3420,
  },
  {
    id: 'division-of-labor',
    title: '劳动分工理论',
    excerpt: '斯密以别针厂为例，说明分工如何将日产量从1枚提升到4800枚。理解专业化如何创造效率...',
    category: '经济学经典',
    tags: ['效率', '专业化', '生产理论'],
    viewCount: 2850,
  },
  {
    id: 'wage-theory',
    title: '工资理论',
    excerpt: '自然工资与市场工资的决定机制。工资是劳动的报酬，受劳动力供需、生活必需品价格影响...',
    category: '微观经济学',
    tags: ['工资', '劳动力市场', '收入分配'],
    viewCount: 2100,
  },
  {
    id: 'invisible-hand',
    title: '看不见的手',
    excerpt: '个人追求私利的行为，如何通过市场机制促进社会整体福利。市场自我调节的哲学基础...',
    category: '经济学经典',
    tags: ['市场机制', '自由主义', '福利经济学'],
    viewCount: 4560,
  },
  {
    id: 'supply-demand',
    title: '供需法则',
    excerpt: '市场价格由供给与需求的交点决定。理解弹性、均衡、剩余等核心概念...',
    category: '微观经济学',
    tags: ['价格', '市场均衡', '弹性'],
    viewCount: 3890,
  },
  {
    id: 'nash-equilibrium',
    title: '纳什均衡',
    excerpt: '博弈论中的核心概念：在已知他人策略的情况下，没有任何一方能单独改变策略而获得更好结果...',
    category: '博弈论',
    tags: ['博弈论', '策略', '均衡'],
    viewCount: 1950,
  },
];

export default function WikiPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  const filteredArticles = featuredArticles.filter((article) => {
    const matchesCategory = activeCategory === '全部' || article.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          知识图谱
        </h1>
        <p className="text-foreground-muted max-w-xl mx-auto">
          交互式商业知识百科，从国富论到现代经济学，构建完整的商业思维体系
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索知识文章..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-lg"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setActiveCategory('全部')}
          className={`p-4 rounded-xl text-center transition-all ${
            activeCategory === '全部'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
          }`}
        >
          <BookOpen className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-medium">全部</div>
          <div className="text-xs opacity-70">{featuredArticles.length}篇</div>
        </button>
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`p-4 rounded-xl text-center transition-all ${
                activeCategory === cat.name
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
              }`}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">{cat.name}</div>
              <div className="text-xs opacity-70">{cat.articleCount}篇</div>
            </button>
          );
        })}
      </div>

      {/* Knowledge Graph Preview */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">知识关联图谱</h2>
          <button className="text-sm text-primary hover:underline">查看完整图谱</button>
        </div>
        <div className="h-64 bg-background-secondary rounded-xl border border-border-subtle flex items-center justify-center relative overflow-hidden">
          {/* Simple visual representation of a knowledge graph */}
          <svg viewBox="0 0 800 300" className="w-full h-full">
            {/* Nodes */}
            <circle cx="400" cy="150" r="30" fill="#6366f1" opacity="0.8" />
            <text x="400" y="155" textAnchor="middle" fill="white" fontSize="12">国富论</text>
            
            <circle cx="200" cy="80" r="25" fill="#22c55e" opacity="0.7" />
            <text x="200" y="85" textAnchor="middle" fill="white" fontSize="10">劳动分工</text>
            
            <circle cx="600" cy="80" r="25" fill="#f59e0b" opacity="0.7" />
            <text x="600" y="85" textAnchor="middle" fill="white" fontSize="10">看不见的手</text>
            
            <circle cx="150" cy="200" r="22" fill="#3b82f6" opacity="0.7" />
            <text x="150" y="204" textAnchor="middle" fill="white" fontSize="9">工资理论</text>
            
            <circle cx="650" cy="200" r="22" fill="#ec4899" opacity="0.7" />
            <text x="650" y="204" textAnchor="middle" fill="white" fontSize="9">财富积累</text>
            
            <circle cx="300" cy="250" r="20" fill="#06b6d4" opacity="0.6" />
            <text x="300" y="254" textAnchor="middle" fill="white" fontSize="9">供需法则</text>
            
            <circle cx="500" cy="250" r="20" fill="#8b5cf6" opacity="0.6" />
            <text x="500" y="254" textAnchor="middle" fill="white" fontSize="9">比较优势</text>
            
            {/* Edges */}
            <line x1="400" y1="150" x2="200" y2="80" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
            <line x1="400" y1="150" x2="600" y2="80" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
            <line x1="400" y1="150" x2="150" y2="200" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
            <line x1="400" y1="150" x2="650" y2="200" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
            <line x1="200" y1="80" x2="150" y2="200" stroke="#22c55e" strokeWidth="1.5" opacity="0.3" />
            <line x1="600" y1="80" x2="650" y2="200" stroke="#f59e0b" strokeWidth="1.5" opacity="0.3" />
            <line x1="150" y1="200" x2="300" y2="250" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" />
            <line x1="650" y1="200" x2="500" y2="250" stroke="#ec4899" strokeWidth="1.5" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">
          {activeCategory === '全部' ? '推荐文章' : activeCategory}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              to={`/wiki/${article.id}`}
              className="glass-card p-6 hover:bg-background-hover/50 transition-all duration-300 group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {article.category}
                </span>
                <span className="text-xs text-foreground-muted flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {article.viewCount}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed mb-4 line-clamp-2">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-background-hover text-xs text-foreground-muted flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
                <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
          <p className="text-foreground-muted">没有找到匹配的文章</p>
        </div>
      )}
    </div>
  );
}
