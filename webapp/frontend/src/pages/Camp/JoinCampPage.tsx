import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tent, Loader2 } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

export default function JoinCampPage() {
  const navigate = useNavigate();
  const { joinCamp, loading, error, clearError } = useCampStore();
  const [code, setCode] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (code.trim().length !== 6) return;
    try {
      const group = await joinCamp(code);
      navigate(`/camp/${group.id}`);
    } catch {
      /* store */
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Tent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">加入体验营</h1>
            <p className="text-sm text-foreground-muted">输入教师提供的 6 位营团邀请码</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-foreground-muted block mb-2">营团邀请码（6 位）</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="例如 A1B2C3"
              className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border-subtle font-mono text-lg tracking-widest text-center uppercase"
              maxLength={6}
            />
            <p className="text-xs text-foreground-muted mt-2">
              与商赛 4 位房间码不同：先入营，再在「商赛大厅」输入房间码参加活动。
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            确认加入
          </button>
        </form>
      </div>
    </div>
  );
}
