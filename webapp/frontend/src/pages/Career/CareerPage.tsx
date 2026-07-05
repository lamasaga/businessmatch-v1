import { useEffect } from 'react';
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
  Coins,
  Gem,
  Home,
  Lock,
} from 'lucide-react';
import { useCareerStore } from '../../stores/careerStore';
import { FIVE_DOMAINS } from '../../data/mockPlatform';
import AbilityRadar from '../../components/platform/AbilityRadar';
import AthenaPanel from '../../components/platform/AthenaPanel';

export default function CareerPage() {
  const { profile, recentMatches, loading, error, careerActive, fetchProfile, fetchRecentMatches } = useCareerStore();

  useEffect(() => {
    void fetchProfile();
    void fetchRecentMatches(5);
  }, [fetchProfile, fetchRecentMatches]);

  if (!careerActive) {
    return <Navigate to="/career/start" replace />;
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-foreground-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">加载生涯档案中…</p>
        </div>
      </div>
    );
  }

  // 有 profile 用 profile，否则用 fallback 时已经构建好的数据
  const p = profile;
  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-center px-4">
        <p className="text-foreground-muted text-sm">{error || '暂无生涯数据'}</p>
        <button
          type="button"
          onClick={() => void fetchProfile()}
          className="text-sm text-primary font-medium hover:underline"
        >
          重试加载
        </button>
      </div>
    );
  }

  const latestMatchId = recentMatches[0]?.match_id;
  const debriefTo = latestMatchId ? `/career/debrief/${latestMatchId}` : '/games';

  const xpPct = p.user.next_level_xp > 0
    ? (p.user.experience / p.user.next_level_xp) * 100
    : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            生涯模式 · {p.profile.season}
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1 tracking-tight">{p.profile.title}</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Lv.{p.user.level} {p.user.username} · {p.stats.total_matches} 场对局 · 连续打卡 0 天
          </p>
          {error && (
            <p className="text-xs text-amber-500 mt-1">数据同步中，部分信息可能不是最新</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-medium">
            <Coins className="w-4 h-4" />
            {p.user.gold}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-sm font-medium">
            <Gem className="w-4 h-4" />
            {p.user.diamond}
          </div>
          <Link
            to={debriefTo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/15 transition-colors"
          >
            {latestMatchId ? '查看最近复盘' : '去商赛大厅'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <section className="grid lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 glass-card p-6 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
            <Target className="w-4 h-4 text-primary" />
            本周计划
          </h2>
          <ul className="space-y-3">
            <li className="p-4 rounded-xl bg-background-secondary/50">
              <p className="font-medium text-foreground text-sm">周一</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  完成图谱节点「供需关系」
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  日常活动 ×1
                </li>
              </ul>
            </li>
            <li className="p-4 rounded-xl bg-background-secondary/50">
              <p className="font-medium text-foreground text-sm">周三</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  课程单元：定价策略
                </li>
              </ul>
            </li>
            <li className="p-4 rounded-xl bg-background-secondary/50">
              <p className="font-medium text-foreground text-sm">周五</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  回合制教学对局
                </li>
              </ul>
            </li>
          </ul>
          <p className="text-sm text-foreground-muted border-l-2 border-primary/40 pl-3 leading-relaxed">
            近 7 日参与 {p.resources.total_matches_7d} 场 · 获得 {p.resources.total_earned_7d} XP。
            {p.stats.practice_count > 0 && ` 练习 ${p.stats.practice_count} 场`}
            {p.stats.official_count > 0 && ` · 正式 ${p.stats.official_count} 场`}
          </p>
        </article>

        <article className="glass-card p-6 space-y-5">
          <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">经验与图谱</h2>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-muted">{p.user.experience} / {p.user.next_level_xp} XP</span>
              <span className="text-primary font-semibold">Lv.{p.user.level}</span>
            </div>
            <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
              <span
                className="block h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                style={{ width: `${Math.min(xpPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="flex items-center gap-2 text-sm text-amber-500">
                <Coins className="w-4 h-4" />
                金币
              </span>
              <span className="text-sm font-semibold text-foreground">{p.user.gold}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <span className="flex items-center gap-2 text-sm text-cyan-500">
                <Gem className="w-4 h-4" />
                钻石
              </span>
              <span className="text-sm font-semibold text-foreground">{p.user.diamond}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary/50">
            <span className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Network className="w-4 h-4 text-accent-teal" />
              近 7 日 XP
            </span>
            <span className="text-sm font-semibold text-foreground">{p.resources.total_earned_7d}</span>
          </div>
          <AbilityRadar radar={p.radar} />
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

      <section className="grid md:grid-cols-4 gap-4">
        <Link to="/activities" className="glass-card p-5 flex items-center gap-4 hover:bg-background-hover/50 transition-colors card-hover">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <span>
            <p className="font-semibold text-sm">日常活动</p>
            <p className="text-xs text-foreground-muted">单人练习与习惯打卡</p>
          </span>
        </Link>
        <Link to="/games" className="glass-card p-5 flex items-center gap-4 hover:bg-background-hover/50 transition-colors card-hover">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
          </div>
          <span>
            <p className="font-semibold text-sm">商赛大厅</p>
            <p className="text-xs text-foreground-muted">房间码加入教师对局</p>
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

        {/* 家园入口 - 加锁占位 */}
        <div
          className="glass-card p-5 flex items-center gap-4 opacity-70 cursor-not-allowed relative overflow-hidden"
          title={p.homestead.unlock_hint}
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-2">
              我的家园
              <Lock className="w-3 h-3 text-foreground-muted" />
            </p>
            <p className="text-xs text-foreground-muted truncate">
              {p.homestead.total_slots} 个槽位待解锁 · {p.homestead.unlock_hint}
            </p>
          </span>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-teal" />
            近期成长
          </h2>
          <span className="text-xs text-foreground-muted">近 7 天</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: '对局场次', value: String(p.resources.total_matches_7d) },
            { label: '金币余额', value: String(p.user.gold) },
            { label: '钻石余额', value: String(p.user.diamond) },
            { label: '近 7 日 XP', value: String(p.resources.total_earned_7d) },
            { label: '累计经验', value: String(p.stats.total_xp_earned) },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl bg-background-secondary/50">
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-foreground-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {recentMatches.length > 0 && (
        <section className="glass-card p-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">近期对局</h2>
          <ul className="space-y-2">
            {recentMatches.map((m) => (
              <li key={m.match_id}>
                <Link
                  to={`/career/debrief/${m.match_id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border-subtle px-4 py-3 hover:bg-background-hover/50 transition-colors"
                >
                  <span className="font-medium text-sm text-foreground">{m.match_title}</span>
                  <span className="text-xs text-foreground-muted">
                    {m.match_kind === 'practice' ? '练习' : '正式'} · 第 {m.final_rank || '—'} 名
                  </span>
                  <span className="text-xs text-primary ml-auto">+{m.xp_earned} XP</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AthenaPanel floating />
    </div>
  );
}
