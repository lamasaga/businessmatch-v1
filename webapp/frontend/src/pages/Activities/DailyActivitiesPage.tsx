import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Flame, Bot, ArrowRight, Gamepad2 } from 'lucide-react';
import { DAILY_HABITS } from '../../data/mockPlatform';
import { useCareerStore } from '../../stores/careerStore';
import SoloPracticeSection from '../../components/activities/SoloPracticeSection';

export default function DailyActivitiesPage() {
  const { completedQuests, completeQuest } = useCareerStore();
  const [practiceError, setPracticeError] = useState('');
  const completedCount = completedQuests.length;
  const totalCount = DAILY_HABITS.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
            <Flame className="w-8 h-8 text-orange-400" />
            日常活动
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">
            单人赛事练习与习惯打卡，积累生涯经验
          </p>
        </div>
      </header>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-5 h-5 text-accent-teal" />
          <h2 className="text-lg font-semibold text-foreground">单人赛事练习</h2>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          无需房间码，随时开局；与 AI 对手对战，赛后经验计入生涯（低权重）。
        </p>
        <SoloPracticeSection onError={setPracticeError} />
        {practiceError && (
          <p className="mt-3 text-sm text-danger">{practiceError}</p>
        )}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">习惯打卡</h2>
            <p className="text-sm text-foreground-muted mt-0.5">图谱 · 课程 · 谈判等轻量任务（演示）</p>
          </div>
          <div className="glass-card px-5 py-3 flex items-center gap-4 shrink-0">
            <div>
              <p className="text-xs text-foreground-muted">今日进度</p>
              <p className="text-lg font-bold text-foreground">
                {completedCount}/{totalCount}
              </p>
            </div>
            <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="space-y-3 list-none p-0">
          {DAILY_HABITS.map((q) => {
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
                      <span
                        className={`font-semibold text-sm ${
                          done ? 'text-foreground-muted line-through' : 'text-foreground'
                        }`}
                      >
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

        <div className="glass-card p-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">连续打卡</p>
                <p className="text-xs text-foreground-muted">连续完成习惯任务</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-orange-400">
              5<span className="text-sm text-foreground-muted font-normal">天</span>
            </span>
          </div>
        </div>
      </section>

      <p className="text-center pb-4">
        <Link
          to="/career"
          className="text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center gap-1"
        >
          返回生涯中枢 <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
    </div>
  );
}
