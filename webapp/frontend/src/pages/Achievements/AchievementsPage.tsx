import { Award, Lock, Star, TrendingUp, Shield, Zap } from 'lucide-react';
import { ACHIEVEMENTS } from '../../data/mockPlatform';

const rarityConfig: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  common: { icon: Star, color: 'text-slate-400', label: '普通', bg: 'bg-slate-500/8' },
  rare: { icon: TrendingUp, color: 'text-blue-400', label: '稀有', bg: 'bg-blue-500/8' },
  epic: { icon: Shield, color: 'text-purple-400', label: '史诗', bg: 'bg-purple-500/8' },
};

export default function AchievementsPage() {
  const earnedCount = ACHIEVEMENTS.filter(a => a.earned).length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <section className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
            <Award className="w-8 h-8 text-rose-400" />
            成就中心
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">徽章收集 · 微证书 · 赛季通行证</p>
        </div>
        <div className="glass-card px-5 py-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-foreground-muted">已获得</p>
            <p className="text-lg font-bold text-foreground">{earnedCount}/{totalCount}</p>
          </div>
          <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all"
              style={{ width: `${(earnedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <ul className="grid md:grid-cols-2 gap-3 list-none p-0">
        {ACHIEVEMENTS.map((a) => {
          const config = rarityConfig[a.rarity];
          void config.icon;
          return (
            <li
              key={a.id}
              className={`glass-card p-5 flex gap-4 ${a.earned ? '' : 'opacity-50'} transition-all hover:opacity-100`}
            >
              <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                {a.earned ? (
                  <Award className={`w-6 h-6 ${config.color}`} />
                ) : (
                  <Lock className="w-5 h-5 text-foreground-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground text-sm">{a.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium uppercase tracking-wider`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted">{a.desc}</p>
              </div>
              {a.earned && (
                <Zap className="w-4 h-4 text-primary/40 flex-shrink-0" />
              )}
            </li>
          );
        })}
      </ul>

      <section className="glass-card p-6">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">赛季通行证</h2>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/5 border border-primary/10">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">2026 春季赛季通行证</p>
            <p className="text-xs text-foreground-muted mt-0.5">完成赛季任务解锁限定徽章与称号</p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">进行中</span>
        </div>
      </section>
    </section>
  );
}
