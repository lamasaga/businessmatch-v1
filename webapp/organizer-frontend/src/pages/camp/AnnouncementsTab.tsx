import { useEffect, useState } from 'react';
import { Plus, Pin, Trash2, X, Loader2, Megaphone } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

interface Props {
  groupId: number;
}

export default function AnnouncementsTab({ groupId }: Props) {
  const { announcements, loading, fetchAnnouncements, createAnnouncement, deleteAnnouncement, pinAnnouncement } = useCampStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements(groupId);
  }, [groupId, fetchAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await createAnnouncement(groupId, { title: title.trim(), content: content.trim() });
      setTitle('');
      setContent('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-muted">
          共 {announcements.length} 条公告
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-background text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          发布公告
        </button>
      </div>

      {/* 发布公告弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-lg bg-background-secondary rounded-2xl border border-border-subtle p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">发布公告</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-background-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">标题</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：本周六下午有班级正式赛"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
                required
              />
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="请输入公告内容..."
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border-subtle text-sm"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                发布
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 公告列表 */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Megaphone className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-foreground-muted">暂无公告</p>
            <p className="text-xs text-foreground-muted mt-1">点击「发布公告」发送第一条通知</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`glass-card p-4 ${a.is_pinned ? 'border-primary/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.title}</p>
                    {a.is_pinned && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                        置顶
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-muted mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-foreground-muted mt-2">{formatDate(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => pinAnnouncement(groupId, a.id)}
                    className={`p-2 rounded-lg hover:bg-background-hover ${
                      a.is_pinned ? 'text-primary' : 'text-foreground-muted'
                    }`}
                    title={a.is_pinned ? '取消置顶' : '置顶'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('确定删除这条公告？')) {
                        deleteAnnouncement(groupId, a.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-background-hover text-foreground-muted hover:text-danger"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
