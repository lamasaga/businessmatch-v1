import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Tent } from 'lucide-react';
import { useCampStore } from '../stores/campStore';

export default function CreateCampPage() {
  const navigate = useNavigate();
  const { createCamp, loading, error, clearError } = useCampStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!name.trim()) return;
    try {
      const camp = await createCamp({
        name: name.trim(),
        description: description.trim() || undefined,
        camp_start_at: campStart ? new Date(campStart).toISOString() : undefined,
        camp_end_at: campEnd ? new Date(campEnd).toISOString() : undefined,
      });
      navigate(`/camps/${camp.id}`);
    } catch {
      /* store */
    }
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 hover:bg-background-hover rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">创建体验营</h1>
          <p className="text-sm text-foreground-muted">系统将自动生成 6 位营团邀请码</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div>
          <label className="text-sm text-foreground-muted block mb-2">营团名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如 2026 暑期商业体验营"
            className="w-full px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle"
            required
          />
        </div>
        <div>
          <label className="text-sm text-foreground-muted block mb-2">简介（可选）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle resize-none"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground-muted block mb-2">开营日期（可选）</label>
            <input
              type="date"
              value={campStart}
              onChange={(e) => setCampStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle"
            />
          </div>
          <div>
            <label className="text-sm text-foreground-muted block mb-2">结营日期（可选）</label>
            <input
              type="date"
              value={campEnd}
              onChange={(e) => setCampEnd(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle"
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tent className="w-5 h-5" />}
          创建
        </button>
      </form>
    </div>
  );
}
