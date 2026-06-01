import { useEffect } from 'react';
import { Users, Gamepad2, Activity, Calendar, Megaphone, ChevronRight } from 'lucide-react';
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

export default function OverviewTab({ groupId }: Props) {
  const { dashboard, fetchDashboard, current } = useCampStore();

  useEffect(() => {
    fetchDashboard(groupId);
  }, [groupId, fetchDashboard]);

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

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard?.member_count ?? 0}</p>
              <p className="text-xs text-foreground-muted">成员数</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard?.active_event_count ?? 0}</p>
              <p className="text-xs text-foreground-muted">进行中商赛</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard?.weekly_active_count ?? 0}</p>
              <p className="text-xs text-foreground-muted">本周活跃人次</p>
            </div>
          </div>
        </div>
      </div>

      {/* 营团码快捷区 */}
      {current && (
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground-muted mb-1">营团邀请码（学生入营用）</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-primary tracking-widest">
                  {current.invite_code}
                </span>
                <span className="text-xs text-foreground-muted">
                  {current.status === 'active' ? '招募中' : '已结束'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground-muted">
                状态：<span className="text-foreground">{current.status === 'active' ? '招募中' : '已结束'}</span>
              </p>
              <p className="text-sm text-foreground-muted">
                成员：<span className="text-foreground">{current.member_count} 人</span>
              </p>
              <p className="text-sm text-foreground-muted">
                商赛：<span className="text-foreground">{current.event_count} 场</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 最新公告 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-primary" />
          最新公告
        </h3>
        {dashboard?.recent_announcements && dashboard.recent_announcements.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recent_announcements.map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg border ${
                  a.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border-subtle/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{a.content}</p>
                  </div>
                  {a.is_pinned && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                      置顶
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted mt-1.5">
                  {formatDate(a.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">暂无公告</p>
        )}
      </div>

      {/* 最近活动时间线 */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-primary" />
          最近活动
        </h3>
        {dashboard?.recent_events && dashboard.recent_events.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {STATUS_LABEL[ev.status] || ev.status}
                  </p>
                </div>
                <span className="text-xs text-foreground-muted shrink-0">
                  {formatDate(ev.created_at)}
                </span>
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
