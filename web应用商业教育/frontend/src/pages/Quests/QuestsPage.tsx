import { CheckCircle2, Circle, Flame, Bot, ArrowRight } from 'lucide-react';
import { DAILY_QUESTS } from '../../data/mockPlatform';
import { useCareerStore } from '../../stores/careerStore';
import { Link } from 'react-router-dom';

export default function QuestsPage() {
  const { completedQuests, completeQuest } = useCareerStore();
  const completedCount = completedQuests.length;
  const totalCount = DAILY_QUESTS.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
            <Flame className="w-8 h-8 text-orange-400" />
            每日任务
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">习惯养成 · 经验奖励 · 导师反思</p>
        </div>
        <div className="glass-card px-5 py-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-foreground-muted">今日进度</p>
            <p className="text-lg font-bold text-foreground">{completedCount}/{totalCount}</p>
          </div>
          <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <ul className="space-y-3 list-none p-0">
        {DAILY_QUESTS.map((q) => {
          const done = completedQuests.includes(q.id);
          return (
            <li key={q.id} className={`glass-card p-5 transition-all ${done ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-4">
                {done ? (
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-6 h-6 text-foreground-muted flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm ${done ? 'text-foreground-muted line-through' : 'text-foreground'}`}>
                      {q.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-secondary text-foreground-muted font-medium">
                      {q.domain}
                    </span>
                  </div>
                  <span className="text-xs text-foreground-muted">+{q.xp} 经验</span>
                </div>
                {!done && (
                  <button
                    type="button"
                    onClick={() => completeQuest(q.id)}
                    className="px-4 py-2 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    完成
                  </button>
                )}
              </div>
              <p className="mt-3 ml-10 text-sm text-foreground-muted flex gap-2 items-start">
                <Bot className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary/60" />
                <span className="italic">{q.athenaHint}</span>
              </p>
            </li>
          );
        })}
      </ul>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">连续打卡</p>
              <p className="text-xs text-foreground-muted">连续 5 天完成每日任务</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-orange-400">5<span className="text-sm text-foreground-muted font-normal">天</span></span>
        </div>
      </div>

      <p className="text-center">
        <Link to="/career" className="text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center gap-1">
          返回生涯中枢 <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
    </div>
  );
}
