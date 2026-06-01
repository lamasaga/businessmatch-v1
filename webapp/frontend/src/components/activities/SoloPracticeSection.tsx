import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitionStore } from '../../stores/competitionStore';
import { useTechVentureStore } from '../../stores/techventureStore';
import { Bot, Briefcase, Play, Sparkles, Loader2 } from 'lucide-react';

type Props = {
  onError?: (message: string) => void;
};

export default function SoloPracticeSection({ onError }: Props) {
  const navigate = useNavigate();
  const { startPractice, loading } = useCompetitionStore();
  const tvStore = useTechVentureStore();
  const [tvLoading, setTvLoading] = useState(false);

  const reportError = (msg: string) => {
    onError?.(msg);
  };

  const handleStartFstrading = async () => {
    try {
      const event = await startPractice();
      navigate(`/games/${event.id}/play`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '练习局创建失败';
      reportError(message);
    }
  };

  const handleStartTechVenture = async () => {
    setTvLoading(true);
    try {
      const result = await tvStore.startPractice();
      sessionStorage.setItem('bizsim_practice_return', '/activities');
      navigate(`/games/${result.event_id}/techventure`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'TechVenture 练习创建失败';
      reportError(message);
    } finally {
      setTvLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 border border-accent-teal/20 bg-accent-teal/5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-teal/20 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-accent-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              FStrading · 单人练习
              <Sparkles className="w-4 h-4 text-accent-teal" />
            </h3>
            <p className="text-sm text-foreground-muted mt-1">
              长三角六城即时商战：3 名 AI 交易员与你共同买卖，物价由供需驱动
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartFstrading}
            disabled={loading}
            className="px-6 py-2.5 bg-accent-teal text-background rounded-xl font-semibold hover:bg-accent-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始练习
          </button>
        </div>
      </div>

      <div className="glass-card p-6 border border-purple-500/20 bg-purple-500/5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              创想大赢家 · 单人练习
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h3>
            <p className="text-sm text-foreground-muted mt-1">
              4 轮策略商赛：三城布局 + 四条路线 + BQI 评分，与 5 支 AI 队伍对决
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartTechVenture}
            disabled={tvLoading}
            className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-500/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {tvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始练习
          </button>
        </div>
      </div>
    </div>
  );
}
