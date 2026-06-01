import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Tent, Users, Gamepad2, Loader2, Plus, GraduationCap, Megaphone } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

export default function MyCampPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const {
    joined,
    current,
    events,
    announcements,
    loading,
    error,
    fetchJoined,
    fetchGroup,
    fetchGroupEvents,
    fetchAnnouncements,
  } = useCampStore();

  const activeId = groupId ? Number(groupId) : joined[0]?.id;
  const activeCampEvents = events.filter((ev) =>
    ['registration', 'playing', 'draft'].includes(ev.status)
  );

  useEffect(() => {
    fetchJoined();
  }, [fetchJoined]);

  useEffect(() => {
    if (!groupId && joined.length > 0) {
      navigate(`/camp/${joined[0].id}`, { replace: true });
    }
  }, [groupId, joined, navigate]);

  useEffect(() => {
    if (activeId && !Number.isNaN(activeId)) {
      fetchGroup(activeId);
      fetchGroupEvents(activeId);
      fetchAnnouncements(activeId);
    }
  }, [activeId, fetchGroup, fetchGroupEvents, fetchAnnouncements]);

  if (!groupId && joined.length === 0 && !loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Tent className="w-14 h-14 text-primary mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">尚未加入体验营</h1>
        <p className="text-foreground-muted mb-6">向老师索取 6 位营团邀请码后加入</p>
        <Link
          to="/camp/join"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-semibold"
        >
          <Plus className="w-4 h-4" />
          加入体验营
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">我的体验营</h1>
          <p className="text-sm text-foreground-muted mt-1">商业体验营 / 夏令营</p>
        </div>
        <Link
          to="/camp/join"
          className="text-sm text-primary hover:underline"
        >
          加入另一个营团
        </Link>
      </div>

      {joined.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {joined.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => navigate(`/camp/${g.id}`)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                g.id === activeId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-subtle'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading && !current ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : current ? (
        <>
          {/* 公告 */}
          {announcements.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Megaphone className="w-4 h-4 text-primary" />
                最新公告
              </h3>
              <div className="space-y-2">
                {announcements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-lg text-sm ${
                      a.is_pinned ? 'border border-primary/30 bg-primary/5' : 'bg-background-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.title}</p>
                      {a.is_pinned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">置顶</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-2">{current.name}</h2>
            {current.description && (
              <p className="text-sm text-foreground-muted mb-4">{current.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
              {current.teacher_username && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  教师：{current.teacher_username}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {current.member_count} 名学员
              </span>
              <span>状态：{current.status === 'active' ? '进行中' : '已结束'}</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              营内商赛活动
            </h3>
            <p className="text-sm text-foreground-muted mb-4">
              教师发起商赛后，在此查看房间码，或前往
              <Link to="/games" className="text-primary mx-1">商赛大厅</Link>
              输入 <strong>4 位房间码</strong> 加入对局。
            </p>
            {activeCampEvents.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">
                暂无进行中的商赛，请等待教师发布
              </p>
            ) : (
              <ul className="space-y-3">
                {activeCampEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-background-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        房间码（4 位）· {ev.status} · {ev.participant_count} 人
                      </p>
                    </div>
                    <Link
                      to="/games"
                      className="font-mono text-xl font-bold text-primary hover:underline"
                      title="前往商赛大厅输入房间码"
                    >
                      {ev.room_code}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
