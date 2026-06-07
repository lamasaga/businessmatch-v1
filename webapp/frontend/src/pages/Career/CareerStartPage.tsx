import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Bot, Target, BookOpen, Swords } from 'lucide-react';
import { useCareerStore } from '../../stores/careerStore';

const features = [
  { icon: Bot, title: 'AI 生涯导师', desc: 'Hermes 全程陪伴，定制学习计划与赛后复盘' },
  { icon: Target, title: '五维能力雷达', desc: '财务、市场、战略、协作、伦理全面追踪' },
  { icon: BookOpen, title: '知识图谱', desc: '48 个商业概念节点，系统构建思维框架' },
  { icon: Swords, title: '实战商赛', desc: '12 种赛制，从回合制到实时经营全覆盖' },
];

export default function CareerStartPage() {
  const navigate = useNavigate();
  const { careerActive, startCareer } = useCareerStore();

  useEffect(() => {
    if (careerActive) {
      navigate('/career', { replace: true });
    }
  }, [careerActive, navigate]);

  const onStart = async () => {
    await startCareer();
    navigate('/career');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up py-8">
      <header className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles className="w-8 h-8 text-background" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">开启你的商业探索赛季</h1>
        <p className="text-foreground-muted leading-relaxed max-w-md mx-auto">
          所有学习活动将汇入同一成长档案：知识图谱、课程学习、日常活动、商赛对局、成就认证。
        </p>
      </header>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
          <Bot className="w-4 h-4 text-primary" />
          你将获得
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-4 rounded-xl bg-background-secondary/50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-primary text-background font-semibold flex items-center justify-center gap-2 glow-button"
        >
          开启生涯 · 进入第 1 赛季
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-xs text-foreground-muted">
          未登录可本地体验，登录后数据将同步到云端
        </p>
      </div>
    </div>
  );
}
