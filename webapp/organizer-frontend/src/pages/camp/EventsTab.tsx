import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { useOrganizerStore } from '../../stores/organizerStore';

interface Props {
  groupId: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  playing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
};

export default function EventsTab({ groupId }: Props) {
  const navigate = useNavigate();
  const { events, fetchEvents, loading } = useOrganizerStore();

  useEffect(() => {
    fetchEvents(groupId);
  }, [groupId, fetchEvents]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-muted">
          共 {events.length} 场商赛
        </p>
        <button
          type="button"
          onClick={() => navigate(`/events/create?groupId=${groupId}`)}
          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />
          发起商赛活动
        </button>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Gamepad2 className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-foreground-muted">暂无商赛</p>
          <p className="text-xs text-foreground-muted mt-1">点击「发起商赛活动」创建第一场</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => navigate(
                ev.game_config_id?.startsWith('techventure')
                  ? `/events/${ev.id}/techventure`
                  : `/events/${ev.id}`
              )}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-primary">{ev.room_code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ev.title}</p>
                <p className="text-sm text-foreground-muted mt-0.5">
                  {STATUS_LABEL[ev.status] || ev.status} · {ev.participant_count ?? 0} 人
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
