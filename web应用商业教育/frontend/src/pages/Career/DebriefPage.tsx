import { Link, useParams } from 'react-router-dom';
import { Bot, BookOpen, Target, ChevronRight, TrendingUp, Award } from 'lucide-react';
import { DEBRIEF_MOCK } from '../../data/mockPlatform';
import AthenaPanel from '../../components/platform/AthenaPanel';

export default function DebriefPage() {
  const { matchId } = useParams();
  const d = DEBRIEF_MOCK;

  return (
    <section className="space-y-8 animate-fade-in-up">
      <header>
        <p className="text-sm text-primary flex items-center gap-2">
          <Bot className="w-4 h-4" />
          赛后复盘 · {matchId === 'demo' ? '最近对局' : matchId}
        </p>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{d.matchTitle}</h1>
        <p className="text-foreground-muted text-sm mt-1">
          名次 {d.rank} / {d.totalTeams} · 结构化反馈
        </p>
      </header>

      <article className="glass-card p-6 border-l-2 border-primary">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          AI 战报
        </h2>
        <p className="text-foreground-secondary leading-relaxed text-sm">{d.narrative}</p>
      </article>

      <article className="glass-card p-6">
        <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide">关键事实</h2>
        <ul className="space-y-3">
          {d.facts.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-foreground-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </article>

      <article className="grid md:grid-cols-2 gap-6">
        <section className="glass-card p-6">
          <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent-teal" />
            知识链接
          </h2>
          <ul className="space-y-3">
            {d.knowledgeLinks.map((k) => (
              <li key={k.id} className="text-sm p-4 rounded-xl bg-background-secondary/50">
                <Link to="/wiki" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  {k.title}
                </Link>
                <p className="text-foreground-muted mt-1 text-xs">{k.why}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="glass-card p-6">
          <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4 text-accent-rose" />
            反思问题
          </h2>
          <ol className="space-y-3">
            {d.reflectionQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground-secondary">
                <span className="text-primary font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                {q}
              </li>
            ))}
          </ol>
        </section>
      </article>

      <article className="glass-card p-6">
        <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          下一步推荐
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-background-secondary/50">
            <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">任务</p>
            <p className="text-sm text-foreground mt-1">{d.suggestedNext.quest}</p>
          </div>
          <div className="p-4 rounded-xl bg-background-secondary/50">
            <p className="text-[10px] text-accent-teal uppercase tracking-wider font-semibold">练习</p>
            <p className="text-sm text-foreground mt-1">{d.suggestedNext.practice}</p>
          </div>
          <div className="p-4 rounded-xl bg-background-secondary/50">
            <p className="text-[10px] text-accent-rose uppercase tracking-wider font-semibold">商赛</p>
            <p className="text-sm text-foreground mt-1">{d.suggestedNext.game}</p>
          </div>
        </div>
        <Link
          to="/career"
          className="mt-5 inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors text-sm"
        >
          返回生涯中枢 <ChevronRight className="w-4 h-4" />
        </Link>
      </article>

      <AthenaPanel floating={false} defaultOpen />
    </section>
  );
}
