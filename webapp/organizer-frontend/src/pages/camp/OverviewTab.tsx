import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Calendar, ClipboardList, Clock, MapPin,
  CheckCircle2, Circle, Plus, Coins, Dices, Image, Gamepad2,
  Megaphone, Activity,
} from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

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

function getItemStatus(start: string, end: string): 'upcoming' | 'ongoing' | 'finished' {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm).getTime();
  const endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em).getTime();
  const nowMs = now.getTime();
  if (nowMs < startMs) return 'upcoming';
  if (nowMs > endMs) return 'finished';
  return 'ongoing';
}

const QUICK_ACTIONS = [
  { id: 'task', label: '发布任务', icon: Plus, tab: 'tasks' },
  { id: 'coin', label: '发放营币', icon: Coins, tab: 'coins' },
  { id: 'gallery', label: '查看画廊', icon: Image, tab: 'tasks' },
  { id: 'match', label: '进入控场', icon: Gamepad2, tab: 'events' },
];

export default function OverviewTab({ groupId }: Props) {
  const navigate = useNavigate();
  const {
    dashboard, fetchDashboard,
    agenda, fetchAgenda,
    announcements, fetchAnnouncements,
    pendingReviewCount, fetchPendingReviewCount,
  } = useCampStore();

  useEffect(() => {
    fetchDashboard(groupId);
    fetchAgenda(groupId);
    fetchAnnouncements(groupId);
    fetchPendingReviewCount(groupId);
  }, [groupId, fetchDashboard, fetchAgenda, fetchAnnouncements, fetchPendingReviewCount]);

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    navigate(`/camps/${groupId}?tab=${action.tab}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const sortedAgenda = [...agenda].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: '成员数', value: dashboard?.member_count ?? 0, color: 'text-primary' },
          { icon: Building2, label: '已组建公司', value: dashboard?.company_count ?? 0, color: 'text-emerald-400' },
          { icon: Calendar, label: '当前天数', value: `Day ${dashboard?.current_day ?? 1}`, color: 'text-amber-400' },
          { icon: ClipboardList, label: '进行中任务', value: dashboard?.active_task_count ?? 0, color: 'text-purple-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-foreground-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 今日议程 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          今日议程
        </h3>
        <div className="space-y-3">
          {sortedAgenda.map((item) => {
            const status = getItemStatus(item.start_time, item.end_time);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  status === 'ongoing'
                    ? 'border border-primary/30 bg-primary/5'
                    : status === 'finished'
                      ? 'opacity-50'
                      : 'bg-background-secondary/50'
                }`}
              >
                {status === 'finished' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : status === 'ongoing' ? (
                  <Circle className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <Circle className="w-5 h-5 text-foreground-muted shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-foreground-muted">{item.start_time}</span>
                    <span className="font-medium text-sm">{item.title}</span>
                    {status === 'ongoing' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">进行中</span>
                    )}
                  </div>
                  {item.location && (
                    <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {sortedAgenda.length === 0 && (
            <p className="text-sm text-foreground-muted text-center py-4">暂无今日议程</p>
          )}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">快捷操作</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle text-sm hover:bg-background-hover transition-colors"
            >
              <action.icon className="w-4 h-4 text-primary" />
              {action.label}
              {action.id === 'gallery' && pendingReviewCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-danger/15 text-danger">{pendingReviewCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 最新公告 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-primary" />
          最新公告
        </h3>
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg border ${
                  a.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border-subtle/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{a.content}</p>
                  </div>
                  {a.is_pinned && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">置顶</span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted mt-1.5">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">暂无公告</p>
        )}
      </div>

      {/* 最近活动 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          最近活动
        </h3>
        {dashboard?.recent_events && dashboard.recent_events.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-foreground-muted">{STATUS_LABEL[ev.status] || ev.status}</p>
                </div>
                <span className="text-xs text-foreground-muted shrink-0">{formatDate(ev.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">暂无活动</p>
        )}
      </div>
    </div>
  );
}
