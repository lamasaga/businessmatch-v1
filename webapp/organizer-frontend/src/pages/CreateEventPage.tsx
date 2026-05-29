import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Users, Coins, Clock, Briefcase, Zap } from 'lucide-react';
import { useOrganizerStore } from '../stores/organizerStore';

type GamePreset = 'rts' | 'techventure';

const PRESET_META: Record<GamePreset, { label: string; subtitle: string; game_config_id: string; game_type: string }> = {
  rts: { label: '浮生记 RTS', subtitle: '六城十品即时倒卖 · 5 秒 tick', game_config_id: 'trading-v2-rts', game_type: 'trading' },
  techventure: { label: '创想大赢家', subtitle: '4 轮三城策略 · 队伍制 · BQI 评分', game_config_id: 'techventure-v1', game_type: 'techventure' },
};

const RTS_DURATION_OPTIONS = [
  { key: 'short', label: '快速局', minutes: 8 },
  { key: 'standard', label: '标准局', minutes: 10 },
  { key: 'long', label: '完整局', minutes: 12 },
] as const;

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get('groupId');
  const teachingGroupId = groupIdParam ? Number(groupIdParam) : undefined;
  const { createEvent, loading, error } = useOrganizerStore();

  const [gamePreset, setGamePreset] = useState<GamePreset>('rts');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    max_players: 50,
    duration_preset: 'standard' as 'short' | 'standard' | 'long',
    initial_capital: 50000,
  });

  const preset = PRESET_META[gamePreset];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const config: Record<string, unknown> =
        gamePreset === 'rts'
          ? {
              mode: 'rts',
              duration_preset: formData.duration_preset,
              initial_capital: formData.initial_capital,
            }
          : { rounds: 4 };

      const event = await createEvent({
        title: formData.title,
        description: formData.description,
        max_players: formData.max_players,
        game_config_id: preset.game_config_id,
        game_type: preset.game_type,
        config,
        teaching_group_id: teachingGroupId,
      });

      if (teachingGroupId) {
        navigate(
          gamePreset === 'techventure'
            ? `/events/${event.id}/techventure`
            : `/events/${event.id}`
        );
      } else if (gamePreset === 'techventure') {
        navigate(`/events/${event.id}/techventure`);
      } else {
        navigate(`/events/${event.id}`);
      }
    } catch {
      /* store handles error */
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(teachingGroupId ? `/camps/${teachingGroupId}` : '/')}
          className="p-2 hover:bg-background-hover rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {teachingGroupId ? '发起营内商赛' : '创建比赛'}
          </h1>
          <p className="text-sm text-foreground-muted">{preset.label} · {preset.subtitle}</p>
        </div>
      </div>

      {teachingGroupId ? (
        <p className="mb-4 text-sm text-foreground-muted rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          本场商赛将关联当前体验营；学生入营后使用生成的 <strong className="text-primary font-mono">4 位房间码</strong> 加入（与 6 位营团码不同）。
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Game type selector */}
        <section className="glass-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            选择赛制
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGamePreset('rts')}
              className={`p-4 rounded-xl border text-left transition-colors ${
                gamePreset === 'rts'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border-subtle hover:border-primary/40'
              }`}
            >
              <Zap className={`w-5 h-5 mb-2 ${gamePreset === 'rts' ? 'text-emerald-400' : 'text-foreground-muted'}`} />
              <p className="font-semibold">浮生记 RTS</p>
              <p className="text-xs text-foreground-muted mt-1">六城十品即时倒卖 · 5 秒 tick</p>
            </button>
            <button
              type="button"
              onClick={() => setGamePreset('techventure')}
              className={`p-4 rounded-xl border text-left transition-colors ${
                gamePreset === 'techventure'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-border-subtle hover:border-primary/40'
              }`}
            >
              <Briefcase className={`w-5 h-5 mb-2 ${gamePreset === 'techventure' ? 'text-purple-400' : 'text-foreground-muted'}`} />
              <p className="font-semibold">创想大赢家</p>
              <p className="text-xs text-foreground-muted mt-1">4 轮三城策略 · 队伍制 · BQI 评分</p>
            </button>
          </div>
        </section>

        {/* Basic info */}
        <section className="glass-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            基本信息
          </h3>
          <input
            type="text"
            required
            placeholder="比赛标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
          />
          <textarea
            placeholder="比赛说明（选填）"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
          />
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-foreground-muted" />
            <input
              type="number"
              min={2}
              max={200}
              value={formData.max_players}
              onChange={(e) =>
                setFormData({ ...formData, max_players: parseInt(e.target.value, 10) || 50 })
              }
              className="flex-1 px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl"
            />
            <span className="text-sm text-foreground-muted">最大人数</span>
          </div>
        </section>

        {/* RTS-specific settings */}
        {gamePreset === 'rts' && (
          <section className="glass-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              比赛时长
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {RTS_DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration_preset: opt.key })}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    formData.duration_preset === opt.key
                      ? 'border-primary bg-primary/10'
                      : 'border-border-subtle hover:border-primary/40'
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs text-foreground-muted mt-1">{opt.minutes} 分钟</p>
                </button>
              ))}
            </div>
            <Field icon={Coins} label="初始资金">
              <input
                type="number"
                step={10000}
                value={formData.initial_capital}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initial_capital: parseInt(e.target.value, 10) || 50000,
                  })
                }
                className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-lg"
              />
            </Field>
          </section>
        )}

        {/* TechVenture-specific info */}
        {gamePreset === 'techventure' && (
          <section className="glass-card p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-400" />
              TechVenture 赛制说明
            </h3>
            <ul className="text-sm text-foreground-muted space-y-1.5">
              <li>· 固定 4 轮决策，每轮 8 分钟提交窗口</li>
              <li>· 每队选择一条策略路线（技术 / 用户 / 品牌 / 破局奇兵）</li>
              <li>· 三座城市布局（南京 / 合肥 / 杭州），分配 Tech / Fit / Show 投入</li>
              <li>· BQI 综合评分 + 加权排名 → 最终冠军</li>
              <li>· 创建后在控场页面建队，学生加入后选择队伍</li>
            </ul>
          </section>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || !formData.title}
          className="w-full py-3.5 bg-primary text-background rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Plus className="w-5 h-5" />
              创建并进入控场
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1 mb-2">
        <Icon className="w-4 h-4 text-foreground-muted" />
        {label}
      </label>
      {children}
    </div>
  );
}
