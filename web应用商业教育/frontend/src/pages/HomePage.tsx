import { Link } from 'react-router-dom';
import {
  Gamepad2,
  GraduationCap,
  Network,
  BookOpen,
  ArrowRight,
  Trophy,
  Users,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: Gamepad2,
    title: '商赛模拟',
    description: '10种经典商赛模式，从回合制策略到实时经营，体验真实商业博弈',
    link: '/games',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: GraduationCap,
    title: '精品课程',
    description: '覆盖小学到大学的分级商业课程，理论与实践相结合',
    link: '/courses',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Network,
    title: '知识图谱',
    description: '交互式商业知识Wiki，从国富论到现代经济学，构建完整知识体系',
    link: '/wiki',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: BookOpen,
    title: '国富论游戏',
    description: '基于亚当·斯密经典理论，在工坊经营中理解分工、工资与财富',
    link: '/wealth-of-nations',
    color: 'from-amber-500 to-orange-500',
  },
];

const stats = [
  { icon: Trophy, value: '10+', label: '商赛模式' },
  { icon: Users, value: '50+', label: '精品课程' },
  { icon: BookOpen, value: '200+', label: '知识文章' },
  { icon: TrendingUp, value: '10K+', label: '活跃学员' },
];

export default function HomePage() {
  return (
    <div className="space-y-16 animate-fade-in-up">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-primary font-medium">商业模拟教育平台 v1.0</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          在<span className="text-gradient">游戏</span>中学习商业
          <br />
          在<span className="text-gradient">实践</span>中理解经济
        </h1>

        <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
          融合博弈论、系统动力学与行为经济学，打造沉浸式商业教育体验。
          从亚当·斯密的国富论到现代创业实战，让经济学变得可触摸、可体验。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/games"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-semibold glow-button"
          >
            <Gamepad2 className="w-5 h-5" />
            开始商赛
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/wealth-of-nations"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border-subtle hover:bg-background-hover transition-colors font-semibold"
          >
            <BookOpen className="w-5 h-5" />
            体验国富论
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card p-6 text-center hover:bg-background-hover/50 transition-colors"
            >
              <Icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-foreground-muted mt-1">{stat.label}</div>
            </div>
          );
        })}
      </section>

      {/* Features */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">核心功能</h2>
          <p className="text-foreground-muted mt-2">四大模块，构建完整商业教育生态</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.link}
                className="group glass-card p-8 hover:bg-background-hover/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                  {feature.title}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-foreground-secondary leading-relaxed">{feature.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5" />
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">准备好开始你的商业之旅了吗？</h2>
          <p className="text-foreground-muted max-w-xl mx-auto">
            无论你是学生、教师还是商业爱好者，这里都有适合你的内容。
            从基础知识到高阶策略，一步步构建你的商业思维。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-semibold glow-button"
            >
              免费注册
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border-subtle hover:bg-background-hover transition-colors font-semibold"
            >
              浏览课程
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
