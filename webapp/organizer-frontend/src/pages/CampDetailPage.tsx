import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, Loader2, Users, Gamepad2, Plus, RefreshCw, ChevronRight,
} from 'lucide-react';
import { useCampStore } from '../stores/campStore';
import { useOrganizerStore } from '../stores/organizerStore';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  playing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
};

export default function CampDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { current, fetchDetail, updateCamp, loading, error } = useCampStore();
  const { events, fetchEvents, loading: eventsLoading } = useOrganizerStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!Number.isNaN(groupId)) {
      fetchDetail(groupId);
      fetchEvents(groupId);
    }
  }, [groupId, fetchDetail, fetchEvents]);

  const copyCode = () => {
    if (current?.invite_code) {
      navigator.clipboard?.writeText(current.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCode = async () => {
    if (!window.confirm('确定重置营团邀请码？旧码将失效。')) return;
    await updateCamp(groupId, { reset_invite_code: true });
    await fetchDetail(groupId);
  };

  const closeCamp = async () => {
    if (!window.confirm('确定结束该体验营招募？学生已入营不受影响，但无法再凭旧码入营。')) return;
    await updateCamp(groupId, { status: 'closed' });
    await fetchDetail(groupId);
  };

  if (loading && !current) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!current) {
    return <p className="text-foreground-muted">{error || '体验营不存在'}</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 hover:bg-background-hover rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{current.name}</h1>
          {current.description && (
            <p className="text-sm text-foreground-muted mt-1">{current.description}</p>
          )}
          <p className="text-xs text-foreground-muted mt-1">
            状态：{current.status === 'active' ? '招募中' : '已结束'}
            {' · '}{current.member_count} 名学员 · {current.event_count} 场商赛
          </p>
        </div>
        {current.status === 'active' && (
          <button
            type="button"
            onClick={closeCamp}
            className="text-sm px-3 py-2 rounded-lg border border-border-subtle text-foreground-muted hover:bg-background-hover shrink-0"
          >
            结束招募
          </button>
        )}
      </div>

      <div className="glass-card p-6 mb-6">
        <p className="text-sm text-foreground-muted mb-2">营团邀请码（6 位，学生入营用）</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-bold text-primary tracking-widest">
            {current.invite_code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm"
          >
            <Copy className="w-4 h-4" />
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={resetCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-sm text-foreground-muted hover:bg-background-hover"
          >
            <RefreshCw className="w-4 h-4" />
            重置邀请码
          </button>
        </div>
        <p className="text-xs text-foreground-muted mt-3">
          与商赛 4 位房间码不同：学生先凭此码入营，再在商赛活动使用房间码加入对局。
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" />
          营内商赛
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/events/create?groupId=${groupId}`)}
          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />
          发起商赛活动
        </button>
      </div>

      {eventsLoading && events.length === 0 ? (
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto my-8" />
      ) : events.length === 0 ? (
        <div className="glass-card p-8 text-center text-foreground-muted text-sm mb-8">
          暂无商赛，点击「发起商赛活动」创建
        </div>
      ) : (
        <div className="space-y-3 mb-8">
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

      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        成员名册（{current.members.length}）
      </h2>
      {current.members.length === 0 ? (
        <p className="text-sm text-foreground-muted">尚无学员加入，请将邀请码发给学生</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-foreground-muted text-left">
                <th className="px-4 py-3 font-medium">用户名</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">加入时间</th>
              </tr>
            </thead>
            <tbody>
              {current.members.map((m) => (
                <tr key={m.user_id} className="border-b border-border-subtle/50 last:border-0">
                  <td className="px-4 py-3">{m.username}</td>
                  <td className="px-4 py-3">{m.role === 'student' ? '学员' : m.role}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {new Date(m.joined_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
