import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitionStore } from '../../stores/competitionStore';
import { ArrowLeft, Plus, Loader2, Settings, Users, Coins, Package, Truck, Clock } from 'lucide-react';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { createEvent, loading, error } = useCompetitionStore();

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      navigate(`/games/${event.id}/lobby`);
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/games')}
          className="p-2 hover:bg-background-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">创建比赛</h1>
          <p className="text-foreground-muted text-sm">设置比赛参数并生成房间码</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            基本信息
          </h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">比赛标题</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例如：春季商赛挑战赛"
              className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="比赛说明..."
              rows={3}
              className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">最大人数</label>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-foreground-muted" />
              <input
                type="number"
                min={2}
                max={200}
                value={formData.max_players}
                onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 50 })}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Game Settings */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            游戏参数
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">回合数</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground-muted" />
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={formData.rounds}
                  onChange={(e) => setFormData({ ...formData, rounds: parseInt(e.target.value) || 10 })}
                  className="flex-1 px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">初始资金</label>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-foreground-muted" />
                <input
                  type="number"
                  min={10000}
                  max={100000}
                  step={10000}
                  value={formData.initial_capital}
                  onChange={(e) => setFormData({ ...formData, initial_capital: parseInt(e.target.value) || 50000 })}
                  className="flex-1 px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">库存上限</label>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-foreground-muted" />
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={formData.inventory_limit}
                  onChange={(e) => setFormData({ ...formData, inventory_limit: parseInt(e.target.value) || 20 })}
                  className="flex-1 px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">移动成本</label>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-foreground-muted" />
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={100}
                  value={formData.move_cost}
                  onChange={(e) => setFormData({ ...formData, move_cost: parseInt(e.target.value) || 1000 })}
                  className="flex-1 px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !formData.title}
          className="w-full py-3.5 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Plus className="w-5 h-5" />
              创建比赛
            </>
          )}
        </button>
      </form>
    </div>
  );
}
