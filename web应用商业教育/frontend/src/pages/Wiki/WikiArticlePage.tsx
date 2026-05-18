import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Tag,
  ChevronLeft,
  Share2,
  Bookmark,
  Lightbulb,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { wikiService } from '../../services/wikiService';
import type { KnowledgeCard } from '../../types';

const DIFFICULTY_LABELS = ['', '入门', '基础', '进阶', '高阶', '专家'];

export default function WikiArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<KnowledgeCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    wikiService
      .getArticle(id)
      .then(setArticle)
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-foreground-muted">加载知识卡片...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
        <p className="text-foreground-muted">{error || '知识卡片不存在'}</p>
        <Link to="/wiki" className="text-primary hover:underline mt-2 inline-block text-sm">
          返回知识图谱
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
        <Link to="/wiki" className="hover:text-primary transition-colors">知识图谱</Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span>{article.discipline}</span>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span>{article.category}</span>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-foreground">{article.title}</span>
      </div>

      {/* Article Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {article.discipline}
          </span>
          <span className="px-3 py-1 rounded-full bg-background-secondary text-foreground-muted text-sm">
            {article.category}
          </span>
          <span className="px-3 py-1 rounded-full bg-background-secondary text-foreground-muted text-sm">
            难度：{DIFFICULTY_LABELS[article.difficulty] || '入门'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{article.title}</h1>
        <p className="text-foreground-muted mb-4">{article.subtitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          {article.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-background-hover text-xs flex items-center gap-1 text-foreground-muted"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Definition */}
          <section className="glass-card p-6">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              定义
            </h2>
            <p className="text-foreground-secondary leading-relaxed">{article.definition}</p>
          </section>

          {/* Explanation */}
          {article.explanation && (
            <section className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">解释</h2>
              <div className="text-foreground-secondary leading-relaxed whitespace-pre-line">
                {article.explanation}
              </div>
            </section>
          )}

          {/* Analogy */}
          {article.analogy && (
            <section className="glass-card p-6 border-l-2 border-accent-teal bg-accent-teal/5">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-accent-teal">💡</span>
                类比
              </h2>
              <p className="text-foreground-secondary leading-relaxed italic">{article.analogy}</p>
            </section>
          )}

          {/* Examples */}
          {article.examples && article.examples.length > 0 && (
            <section className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">案例</h2>
              <div className="space-y-3">
                {article.examples.map((ex, i) => (
                  <div key={i} className="p-4 rounded-xl bg-background-secondary/50">
                    <p className="text-sm text-foreground-secondary leading-relaxed">{ex}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Related Cards */}
          {article.related_cards && article.related_cards.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                关联知识
              </h3>
              <div className="space-y-2">
                {article.related_cards.map((related) => (
                  <Link
                    key={related.id}
                    to={`/wiki/${related.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary/50 hover:bg-background-hover transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {related.title}
                      </p>
                      <p className="text-[10px] text-foreground-muted">{related.discipline}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Prereqs & Extensions */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              知识链接
            </h3>
            {article.prerequisites && article.prerequisites.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">前置知识</p>
                <div className="flex flex-wrap gap-2">
                  {article.prerequisites.map((pre) => (
                    <span key={pre} className="text-xs px-2 py-1 rounded-full bg-background-secondary text-foreground-muted">
                      {pre}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {article.extensions && article.extensions.length > 0 && (
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">延伸学习</p>
                <div className="flex flex-wrap gap-2">
                  {article.extensions.map((ext) => (
                    <span key={ext} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-foreground mb-4">学习路径</h3>
            <div className="space-y-3">
              <Link
                to="/wealth-of-nations"
                className="block p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <p className="text-sm font-medium text-primary">体验国富论游戏</p>
                <p className="text-xs text-foreground-muted mt-1">在工坊经营中理解分工与工资</p>
              </Link>
              <Link
                to="/games"
                className="block p-3 rounded-xl bg-background-secondary/50 hover:bg-background-hover transition-colors"
              >
                <p className="text-sm font-medium text-foreground">参加商赛模拟</p>
                <p className="text-xs text-foreground-muted mt-1">将理论应用于实践</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
