import { Link, useNavigate } from 'react-router-dom';
import { Compass, ChevronRight, Play, BookOpen, Sparkles, Target, Award } from 'lucide-react';
import { SHOWCASE_STEPS, FIVE_DOMAINS } from '../../data/mockPlatform';
import { useCareerStore } from '../../stores/careerStore';

export default function ShowcasePage() {
  const navigate = useNavigate();
  const { enableDemoMode } = useCareerStore();

  const goStep = (path: string) => {
    enableDemoMode();
    navigate(path);
  };

  return (
    <section className="space-y-10 animate-fade-in-up max-w-4xl mx-auto">
      <header className="text-center space-y-4 py-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <Compass className="w-8 h-8 text-background" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">新手指引</h1>
        <p className="text-foreground-muted max-w-md mx-auto">
          7 个步骤带你快速熟悉平台核心功能，预计 10 分钟
        </p>
      </header>

      <article className="glass-card p-6 md:p-8">
        <h2 className="font-bold text-foreground mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          推荐体验顺序
        </h2>
        <ol className="space-y-3 list-none p-0">
          {SHOWCASE_STEPS.map((s) => (
            <li key={s.step} className="flex gap-4 p-4 rounded-xl bg-background-secondary/50 hover:bg-background-hover/50 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 group-hover:bg-primary group-hover:text-background transition-colors">
                {s.step}
              </span>
              <span className="flex-1">
                <p className="font-semibold text-foreground text-sm">{s.title}</p>
                <p className="text-sm text-foreground-muted mt-1 leading-relaxed">{s.script}</p>
                <button
                  type="button"
                  onClick={() => goStep(s.path)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  前往体验 <ChevronRight className="w-3 h-3" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </article>

      <article className="grid md:grid-cols-2 gap-6">
        <section className="glass-card p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            五大领域
          </h3>
          <ul className="text-sm space-y-3">
            {FIVE_DOMAINS.map((d) => (
              <li key={d.id} className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-1.5 bg-gradient-to-r ${d.color}`} />
                <div>
                  <Link to={d.path} className="font-medium text-foreground hover:text-primary transition-colors">
                    {d.name}
                  </Link>
                  <p className="text-foreground-muted text-xs mt-0.5">{d.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="glass-card p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            核心特色
          </h3>
          <ul className="space-y-4">
            {[
              { title: 'Hermes AI 导师', desc: '个性化生涯规划与赛后复盘' },
              { title: 'Tyche 市场叙事', desc: '真实市场舆论与消费者行为' },
              { title: 'Rival 谈判对手', desc: '策略型人机对战与多轮谈判' },
              { title: '赛季成长体系', desc: '经验等级、徽章、通行证' },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <Award className="w-4 h-4 text-accent-teal mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <p className="text-center">
        <button
          type="button"
          onClick={() => goStep('/career')}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-background font-semibold glow-button"
        >
          <Play className="w-5 h-5" />
          一键开启体验
        </button>
      </p>
    </section>
  );
}
