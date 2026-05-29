import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tent, Plus, Loader2, Users, Gamepad2, ChevronRight } from 'lucide-react';
import { useCampStore } from '../stores/campStore';

export default function CampListPage() {
  const navigate = useNavigate();
  const { camps, fetchMine, loading, error } = useCampStore();

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">我的体验营</h1>
          <p className="text-foreground-muted text-sm mt-1">创建营团、分发邀请码、发起营内商赛</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/camps/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          创建体验营
        </button>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {loading && camps.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : camps.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Tent className="w-12 h-12 text-primary mx-auto mb-4 opacity-70" />
          <p className="text-foreground-muted mb-4">还没有体验营，创建第一个营团开始</p>
          <button
            type="button"
            onClick={() => navigate('/camps/create')}
            className="text-primary text-sm font-medium hover:underline"
          >
            创建体验营
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {camps.map((camp) => (
            <button
              key={camp.id}
              type="button"
              onClick={() => navigate(`/camps/${camp.id}`)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Tent className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{camp.name}</p>
                <p className="text-sm text-foreground-muted mt-0.5 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {camp.member_count} 人
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    {camp.event_count} 场商赛
                  </span>
                  <span className="font-mono text-primary">{camp.invite_code}</span>
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
