import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Settings, Users, Coins, Clock } from 'lucide-react';
import { useOrganizerStore } from '../stores/organizerStore';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { createEvent, loading, error } = useOrganizerStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    max_players: 50,
    rounds: 10,
    initial_capital: 50000,
    inventory_limit: 20,
    move_cost: 1000,
    decision_time: 60,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const event = await createEvent({
        title: formData.title,
        description: formData.description,
        max_players: formData.max_players,
        config: {
          rounds: formData.rounds,
          initial_capital: formData.initial_capital,
          inventory_limit: formData.inventory_limit,
          move_cost: formData.move_cost,
          decision_time: formData.decision_time,
        },
      });
      navigate(`/events/${event.id}`);
    } catch {
      /* store */
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 hover:bg-background-hover rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">创建比赛</h1>
          <p className="text-sm text-foreground-muted">生成 4 位房间码供学生加入</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <section className="glass-card p-6 space-y-4">
          <h3 className="font-semibold">游戏参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field icon={Clock} label="回合数">
              <input
                type="number"
                min={3}
                max={20}
                value={formData.rounds}
                onChange={(e) =>
                  setFormData({ ...formData, rounds: parseInt(e.target.value, 10) || 10 })
                }
                className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-lg"
              />
            </Field>
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
          </div>
        </section>

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
