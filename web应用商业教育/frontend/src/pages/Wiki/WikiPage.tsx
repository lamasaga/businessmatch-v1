import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Search,
  BookOpen,
  Tag,
  Lightbulb,
  Filter,
  LayoutGrid,
  Share2,
} from 'lucide-react';
import { wikiService } from '../../services/wikiService';
import type { KnowledgeCard, KnowledgeGraphData } from '../../types';
import KnowledgeGraph from '../../components/KnowledgeGraph';

const DISCIPLINE_COLORS: Record<string, string> = {
  '经济学': 'from-blue-500 to-indigo-500',
  '商学': 'from-emerald-500 to-teal-500',
  '管理学': 'from-amber-500 to-orange-500',
};

const DIFFICULTY_LABELS = ['', '入门', '基础', '进阶', '高阶', '专家'];

export default function WikiPage() {
  const [articles, setArticles] = useState<KnowledgeCard[]>([]);
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [disciplines, setDisciplines] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiscipline, setActiveDiscipline] = useState<string>('全部');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [arts, graph, discs] = await Promise.all([
        wikiService.getArticles(),
        wikiService.getGraph(),
        wikiService.getDisciplines(),
      ]);
      setArticles(arts);
      setGraphData(graph);
      setDisciplines(discs);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredArticles = articles.filter((a) => {
    const matchesDiscipline = activeDiscipline === '全部' || a.discipline === activeDiscipline;
    const matchesCategory = activeCategory === '全部' || a.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiscipline && matchesCategory && matchesSearch;
  });

  const categories = activeDiscipline !== '全部'
    ? (disciplines[activeDiscipline] || [])
    : Array.from(new Set(articles.map((a) => a.category)));

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 mb-2">
          <Network className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">知识图谱</h1>
        <p className="text-foreground-muted max-w-lg mx-auto text-sm">
          {articles.length > 0
            ? `已收录 ${articles.length} 张知识卡片，涵盖经济学、商学、管理学三大领域`
            : '交互式商业知识百科，构建完整的商业思维体系'}
        </p>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索知识卡片..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-foreground-muted" />
        <div className="flex flex-wrap gap-2">
          {['全部', ...Object.keys(disciplines)].map((d) => (
            <button
              key={d}
              onClick={() => {
                setActiveDiscipline(d);
                setActiveCategory('全部');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeDiscipline === d
                  ? 'bg-primary text-background'
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-border-subtle mx-1">|</span>
            {['全部', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === c
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'bg-background-secondary text-foreground-muted hover:bg-background-hover'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowGraph(!showGraph)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              showGraph ? 'bg-primary/15 text-primary' : 'bg-background-secondary text-foreground-muted'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            图谱视图
          </button>
        </div>
      </div>

      {/* Interactive Knowledge Graph */}
      {showGraph && graphData.nodes.length > 0 && (
        <div className="glass-card p-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              知识关联图谱
            </h2>
            <span className="text-[10px] text-foreground-muted">
              {graphData.nodes.length} 节点 · {graphData.edges.length} 关系
            </span>
          </div>
          <KnowledgeGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={(id) => setSelectedNodeId(selectedNodeId === id ? null : id)}
            selectedNodeId={selectedNodeId}
            height={420}
          />
        </div>
      )}

      {/* Articles Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            知识卡片
          </h2>
          <span className="text-xs text-foreground-muted">
            {filteredArticles.length} 张
          </span>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-3 bg-background-secondary rounded w-1/3 mb-3" />
                <div className="h-5 bg-background-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-background-secondary rounded w-full mb-4" />
                <div className="h-3 bg-background-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={`/wiki/${article.id}`}
                className="glass-card p-5 hover:bg-background-hover/30 transition-all duration-300 group card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${DISCIPLINE_COLORS[article.discipline] || 'from-slate-500 to-zinc-500'} opacity-20 flex items-center justify-center`}>
                    <BookOpen className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-secondary text-foreground-muted font-medium">
                    {DIFFICULTY_LABELS[article.difficulty] || '入门'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {article.discipline}
                  </span>
                  <span className="text-[10px] text-foreground-muted">{article.category}</span>
                </div>

                <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed mb-3">
                  {article.subtitle}
                </p>

                <div className="flex flex-wrap gap-1">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-background-secondary text-foreground-muted flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredArticles.length === 0 && !loading && (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
            <p className="text-foreground-muted">没有找到匹配的知识卡片</p>
          </div>
        )}
      </div>
    </div>
  );
}
