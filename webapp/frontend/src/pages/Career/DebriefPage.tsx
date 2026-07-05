import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Bot, Target, ChevronRight, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useCareerStore } from '../../stores/careerStore';
import AthenaPanel from '../../components/platform/AthenaPanel';

export default function DebriefPage() {
  const { matchId } = useParams();
  const numericId = Number(matchId);
  const { fetchDebrief } = useCareerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDebrief>>>(null);

  useEffect(() => {
    if (!matchId || matchId === 'demo' || !Number.isFinite(numericId) || numericId <= 0) {
      setLoading(false);
      setError('请选择一场已结束的对局查看复盘');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const debrief = await fetchDebrief(numericId);
      if (cancelled) return;
      if (!debrief) {
        setError('无法加载该场复盘，请确认您已参与此比赛');
      }
      setData(debrief);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, numericId, fetchDebrief]);

  if (matchId === 'demo') {
    return <Navigate to="/career" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-foreground-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        加载复盘中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="max-w-lg mx-auto space-y-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-foreground-muted">{error || '暂无复盘数据'}</p>
        <Link to="/career" className="inline-flex text-primary text-sm font-medium">
          返回生涯中枢
        </Link>
      </section>
    );
  }

  const d = data;

  return (
    <section className="space-y-8 animate-fade-in-up">
      <header>
        <p className="text-sm text-primary flex items-center gap-2">
          <Bot className="w-4 h-4" />
          赛后复盘 · 规则模板
        </p>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{d.match_title}</h1>
        <p className="text-foreground-muted text-sm mt-1">
          名次 {d.rank || '—'} / {d.total_teams || '—'} · +{d.rewards.xp} XP · +{d.rewards.gold} 金币
        </p>
      </header>

      <article className="glass-card p-6 border-l-2 border-primary">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          战报摘要
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

      <article className="glass-card p-6">
        <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-accent-teal" />
          下一步建议
        </h2>
        <ul className="space-y-3">
          {d.suggestions.map((s) => (
            <li key={s} className="text-sm text-foreground-secondary">{s}</li>
          ))}
        </ul>
      </article>

      <div className="flex justify-end">
        <Link
          to="/career"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium"
        >
          返回生涯中枢
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <AthenaPanel floating />
    </section>
  );
}
