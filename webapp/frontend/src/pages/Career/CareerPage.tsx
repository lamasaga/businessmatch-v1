import { Link, Navigate } from 'react-router-dom';
import {
  Sparkles,
  Flame,
  Target,
  ChevronRight,
  Network,
  Award,
  Gamepad2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useCareerStore } from '../../stores/careerStore';
import { DEMO_CAREER, FIVE_DOMAINS } from '../../data/mockPlatform';
import AbilityRadar from '../../components/platform/AbilityRadar';
import AthenaPanel from '../../components/platform/AthenaPanel';

export default function CareerPage() {
  const { careerActive } = useCareerStore();
  const c = DEMO_CAREER;

  if (!careerActive) {
    return <Navigate to="/career/start" replace />;
  }

  const xpPct = (c.xp / c.nextLevelXp) * 100;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            生涯模式 · {c.season}
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1 tracking-tight">商业探索者</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Lv.{c.level} {c.title} · 赛季剩余 {c.seasonDaysLeft} 天 · 连续打卡 {c.streak} 天
          </p>
        </div>
        <Link
          to="/career/debrief/demo"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/15 transition-colors"
        >
          查看最近复盘
          <ChevronRight className="w-4 h-4" />
        </Link>
      </header>

      <section className="grid lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 glass-card p-6 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
            <Target className="w-4 h-4 text-primary" />
            本周计划
          </h2>
          <ul className="space-y-3">
            {c.weeklyPlan.map((day) => (
              <li key={day.day} className="p-4 rounded-xl bg-background-secondary/50">
                <p className="font-medium text-foreground text-sm">{day.day}</p>
                <ul className="mt-2 space-y-1.5">
                  {day.tasks.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-foreground-secondary">
                      <span className="w-1 h-1 rounded-full bg-primary/60" />
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground-muted border-l-2 border-primary/40 pl-3 italic leading-relaxed">
            {c.narrative}
          </p>
        </article>

        <article className="glass-card p-6 space-y-5">
          <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">经验与图谱</h2>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-muted">{c.xp} / {c.nextLevelXp} XP</span>
              <span className="text-primary font-semibold">Lv.{c.level}</span>
            </div>
            <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
              <span
                className="block h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary/50">
            <span className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Network className="w-4 h-4 text-accent-teal" />
              知识图谱
            </span>
            <span className="text-sm font-semibold text-foreground">{c.graphProgress}/{c.graphTotal}</span>
          </div>
          <AbilityRadar />
        </article>
      </section>

      <section>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">快捷入口</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {FIVE_DOMAINS.map((d) => (
            <Link
              key={d.id}
              to={d.path}
              className="glass-card p-4 card-hover group"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${d.color} opacity-20 flex items-center justify-center mb-2`}>
                <Zap className="w-4 h-4 text-foreground" />
              </div>
              <p className="text-[10px] text-foreground-muted uppercase tracking-wider">{d.code}</p>
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{d.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link to="/quests" className="glass-card p-5 flex items-center gap-4 hover:bg-background-hover/50 transition-colors card-hover">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <span>
            <p className="font-semibold text-sm">今日任务</p>
            <p className="text-xs text-foreground-muted">完成赚经验 + 导师反思</p>
          </span>
        </Link>
        <Link to="/games" className="glass-card p-5 flex items-center gap-4 hover:bg-background-hover/50 transition-colors card-hover">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
          </div>
          <span>
            <p className="font-semibold text-sm">商赛大厅</p>
            <p className="text-xs text-foreground-muted">排位赛、练习赛随时开</p>
          </span>
        </Link>
        <Link to="/achievements" className="glass-card p-5 flex items-center gap-4 hover:bg-background-hover/50 transition-colors card-hover">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-rose-400" />
          </div>
          <span>
            <p className="font-semibold text-sm">成就徽章</p>
            <p className="text-xs text-foreground-muted">徽章与赛季通行证</p>
          </span>
        </Link>
      </section>

      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-teal" />
            近期成长
          </h2>
          <span className="text-xs text-foreground-muted">近 7 天</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '对局场次', value: '5' },
            { label: '课程完成', value: '3' },
            { label: '知识节点', value: '7' },
            { label: '获得经验', value: '840' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl bg-background-secondary/50">
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-foreground-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <AthenaPanel floating />
    </div>
  );
}
