import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Users, PlayCircle, CheckCircle2, ChevronRight, Loader2,
} from 'lucide-react';
import { useOrganizerStore } from '../stores/organizerStore';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  playing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, events, fetchStats, fetchEvents, loading } = useOrganizerStore();

  useEffect(() => {
    fetchStats();
    fetchEvents();
  }, [fetchStats, fetchEvents]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">控制台</h1>
        <p className="text-foreground-muted text-sm mt-1">管理正式赛场次与现场控场</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="累计办赛" value={stats.total_events_hosted} icon={Trophy} />
          <StatCard label="累计参赛人次" value={stats.total_participants} icon={Users} />
          <StatCard label="进行中" value={stats.active_events} icon={PlayCircle} />
          <StatCard label="已结束" value={stats.finished_events} icon={CheckCircle2} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">我的比赛</h2>
        <button
          type="button"
          onClick={() => navigate('/events/create')}
          className="text-sm text-primary hover:underline"
        >
          创建新比赛
        </button>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card p-12 text-center text-foreground-muted">
          <p>暂无比赛，点击侧栏「创建比赛」开始</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => navigate(`/events/${ev.id}`)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-primary">{ev.room_code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ev.title}</p>
                <p className="text-sm text-foreground-muted mt-0.5">
                  {STATUS_LABEL[ev.status] || ev.status} · {ev.participant_count ?? 0} 人 · 第{' '}
                  {ev.current_round}/{String(ev.config?.rounds ?? 10)} 回合
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Trophy;
}) {
  return (
    <div className="glass-card p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-foreground-muted mt-1">{label}</p>
    </div>
  );
}
