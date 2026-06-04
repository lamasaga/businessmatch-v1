import { Link } from 'react-router-dom';
import {
  Gamepad2,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Flame,
  TrendingUp,
  Users,
  Target,
  BookOpen,
  Tent,
} from 'lucide-react';
import { FIVE_DOMAINS } from '../data/mockPlatform';
import { useCareerStore } from '../stores/careerStore';
import { isCampPhase1 } from '../lib/campPhase';

const quickActionsCamp = [
  { icon: Tent, label: '我的体验营', desc: '查看营团与营内商赛', path: '/camp', color: 'text-primary' },
  { icon: Gamepad2, label: '商赛大厅', desc: '输入 4 位房间码加入对局', path: '/games', color: 'text-blue-400' },
  { icon: Flame, label: '日常活动', desc: '单人赛事练习与习惯打卡', path: '/activities', color: 'text-orange-400' },
  { icon: Target, label: '生涯中枢', desc: '成长进度与赛后复盘', path: '/career', color: 'text-amber-400' },
];

const quickActionsDefault = [
  { icon: Target, label: '生涯中枢', desc: '查看本周计划与成长进度', path: '/career', color: 'text-primary' },
  { icon: Flame, label: '日常活动', desc: '单人练习与习惯打卡', path: '/activities', color: 'text-orange-400' },
  { icon: Gamepad2, label: '商赛大厅', desc: '加入对局或创建房间', path: '/games', color: 'text-blue-400' },
  { icon: BookOpen, label: '课程学院', desc: '系统化商业知识学习', path: '/courses', color: 'text-emerald-400' },
];

const recentUpdates = [
  { title: '体验营商赛活动支持浮生记与创想大赢家', date: '今日', tag: '体验营' },
  { title: '教师端可创建营团并分发 6 位邀请码', date: '今日', tag: '教师' },
  { title: '学生入营后通过房间码加入现场对局', date: '本周', tag: '流程' },
];

const recentUpdatesDefault = [
  { title: '回合制策略赛新赛季开启', date: '今日', tag: '赛事' },
  { title: '新增「博弈论基础」课程单元', date: '昨日', tag: '课程' },
  { title: '产业链谈判 AI 对手难度调整', date: '2天前', tag: '更新' },
];

export default function HomePage() {
  const { careerActive } = useCareerStore();
  const camp = isCampPhase1;
  const quickActions = camp ? quickActionsCamp : quickActionsDefault;
  const updates = camp ? recentUpdates : recentUpdatesDefault;
  const domains = camp
    ? FIVE_DOMAINS.filter((d) => d.path !== '/wiki')
    : FIVE_DOMAINS;

  return (
    <section className="space-y-10 animate-fade-in-up">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background-card to-background-secondary border border-border-subtle p-8 md:p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-teal/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/15 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold tracking-wide uppercase">
              {camp ? '2026 商业体验营' : '2026 春季赛季'}
            </span>
          </span>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mb-4">
            {camp ? (
              <>
                加入体验营
                <br />
                <span className="text-gradient">在商赛中成长</span>
              </>
            ) : (
              <>
                探索商业世界
                <br />
                <span className="text-gradient">从模拟开始</span>
              </>
            )}
          </h1>
          <p className="text-base md:text-lg text-foreground-muted max-w-lg leading-relaxed mb-8">
            {camp
              ? '向老师索取 6 位营团邀请码入营；教师发起商赛后，在商赛大厅输入 4 位房间码即可加入现场对局。'
              : '融合课程学习、实战商赛与 AI 辅助训练，打造系统化的商业思维成长路径。'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {camp ? (
              <>
                <Link
                  to="/camp/join"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-semibold glow-button text-sm"
                >
                  <Tent className="w-4 h-4" />
                  加入体验营
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-subtle text-foreground-secondary font-medium hover:bg-background-hover transition-colors text-sm"
                >
                  <Gamepad2 className="w-4 h-4" />
                  商赛大厅
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={careerActive ? '/career' : '/career/start'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-semibold glow-button text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {careerActive ? '进入生涯中枢' : '开启生涯'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-subtle text-foreground-secondary font-medium hover:bg-background-hover transition-colors text-sm"
                >
                  <Gamepad2 className="w-4 h-4" />
                  快速开始对局
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="glass-card p-5 card-hover group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-background-secondary flex items-center justify-center ${action.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-semibold text-foreground text-sm">{action.label}</p>
              <p className="text-xs text-foreground-muted mt-1">{action.desc}</p>
            </Link>
          );
        })}
      </section>

      {!camp && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">五大核心领域</h2>
            <Link to="/wiki" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {domains.map((d) => (
              <Link
                key={d.id}
                to={d.path}
                className="glass-card p-4 card-hover group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${d.color} opacity-5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2`} />
                <p className="text-[10px] font-mono text-foreground-muted uppercase tracking-wider">{d.code}</p>
                <p className="text-sm font-bold text-foreground mt-1 group-hover:text-primary transition-colors">{d.name}</p>
                <p className="text-[11px] text-foreground-muted mt-1.5 leading-relaxed">{d.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-5">{camp ? '体验营指引' : '平台数据'}</h2>
          {camp ? (
            <ol className="space-y-4 text-sm text-foreground-secondary list-decimal list-inside">
              <li>向教师索取 <strong className="text-primary font-mono">6 位</strong> 营团邀请码，在「加入体验营」页面入营</li>
              <li>在「我的体验营」查看营团与进行中的商赛活动</li>
              <li>教师发布商赛后，在「商赛大厅」输入 <strong className="text-primary font-mono">4 位</strong> 房间码进入对局</li>
            </ol>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Gamepad2, label: '商赛模式', value: '12' },
                  { icon: GraduationCap, label: '课程单元', value: '56' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <article key={s.label} className="text-center p-4 rounded-xl bg-background-secondary/50">
                      <Icon className="w-6 h-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">{s.label}</p>
                    </article>
                  );
                })}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-background-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">本周活跃学员</p>
                    <p className="text-xs text-foreground-muted">3,284 人参与了对局与学习</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="glass-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-5">最近动态</h2>
          <div className="space-y-4">
            {updates.map((u, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground-secondary leading-snug">{u.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-foreground-muted">{u.date}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-secondary text-foreground-muted">{u.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            to={camp ? '/camp/join' : '/showcase'}
            className="mt-5 block w-full text-center py-2.5 rounded-lg border border-border-subtle text-xs text-foreground-secondary hover:bg-background-hover transition-colors"
          >
            {camp ? '立即加入体验营' : '查看新手指引'}
          </Link>
        </section>
      </div>

      {!camp && (
        <section className="glass-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">加入学习社区</h2>
                <p className="text-sm text-foreground-muted mt-0.5">与学员一起交流商业思维</p>
              </div>
            </div>
            <Link
              to="/showcase"
              className="px-5 py-2.5 rounded-xl bg-background-secondary border border-border-subtle text-sm font-medium hover:bg-background-hover transition-colors"
            >
              了解平台
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
