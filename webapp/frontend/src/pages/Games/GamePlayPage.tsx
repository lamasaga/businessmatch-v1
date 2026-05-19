import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Bot, ChevronRight, Sparkles, Swords } from 'lucide-react';
import PopPanel from '../../components/platform/PopPanel';

export default function GamePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [round, setRound] = useState(3);

  const finishRound = () => {
    if (round >= 4) {
      navigate('/career/debrief/demo');
    } else {
      setRound((r) => r + 1);
    }
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <header className="glass-card p-6 flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">商赛对局</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">回合制策略商赛</h1>
          <p className="text-sm text-foreground-muted mt-1">第 {round} / 4 轮 · 教学对局</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI 人群模拟
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-foreground-muted font-medium">
            排位：无局内提示
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 glass-card p-6 space-y-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-foreground">本轮决策</h2>
          <div className="grid grid-cols-3 gap-3">
            {['技术投入', '用户匹配', '品牌展示'].map((label) => (
              <label key={label} className="p-4 rounded-xl border border-border-subtle cursor-pointer hover:border-primary/40 transition-colors bg-background-secondary/30">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <input type="range" className="w-full mt-3 accent-primary" defaultValue={50} />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={finishRound}
            className="w-full py-3.5 rounded-xl bg-primary text-background font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {round >= 4 ? '结束对局 · 查看复盘' : '提交并查看市场反应'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </article>
        <PopPanel />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link to={`/games/${id}/practice`} className="text-orange-300 hover:text-orange-200 flex items-center gap-1 font-medium transition-colors">
          <Bot className="w-4 h-4" /> 谈判练习
        </Link>
        <Link to="/games" className="text-foreground-muted hover:text-foreground transition-colors">
          返回商赛大厅
        </Link>
      </div>
    </section>
  );
}
