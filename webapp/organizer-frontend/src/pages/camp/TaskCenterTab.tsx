import { useEffect, useState } from 'react';
import { Loader2, Plus, CalendarDays, ClipboardList, Image, BarChart3 } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';
import type { CampTask, TaskSubmission } from '../../types/camp';

interface Props {
  groupId: number;
}

const SUB_TABS = [
  { id: 'agenda', label: '议程编排', icon: CalendarDays },
  { id: 'tasks', label: '任务管理', icon: ClipboardList },
  { id: 'gallery', label: '作品画廊', icon: Image },
  { id: 'stats', label: '提交统计', icon: BarChart3 },
] as const;

type SubTabId = typeof SUB_TABS[number]['id'];

export default function TaskCenterTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('tasks');

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'agenda' && <AgendaPlanner groupId={groupId} />}
      {activeSubTab === 'tasks' && <TaskManager groupId={groupId} />}
      {activeSubTab === 'gallery' && <GalleryView groupId={groupId} />}
      {activeSubTab === 'stats' && <SubmissionStats groupId={groupId} />}
    </div>
  );
}

// ─── 议程编排 ───
function AgendaPlanner({ groupId }: Props) {
  const { agenda, fetchAgenda } = useCampStore();
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    fetchAgenda(groupId, selectedDay);
  }, [groupId, selectedDay, fetchAgenda]);

  const dayAgenda = agenda.filter((i) => i.day_number === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              selectedDay === d
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border-subtle text-foreground-muted hover:bg-background-hover'
            }`}
          >
            Day {d}
          </button>
        ))}
      </div>
      <div className="glass-card p-4">
        <h4 className="font-medium mb-3">Day {selectedDay} 议程</h4>
        <div className="space-y-2">
          {dayAgenda.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
              <span className="font-mono text-sm text-foreground-muted">{item.start_time}</span>
              <span className="text-sm font-medium">{item.title}</span>
              {item.location && <span className="text-xs text-foreground-muted">@{item.location}</span>}
            </div>
          ))}
          {dayAgenda.length === 0 && <p className="text-sm text-foreground-muted text-center py-4">暂无议程</p>}
        </div>
      </div>
    </div>
  );
}

// ─── 任务管理 ───
function TaskManager({ groupId }: Props) {
  const { tasks, fetchTasks, createTask, deleteTask, publishTask, closeTask } = useCampStore();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks(groupId);
  }, [groupId, fetchTasks]);

  const filtered = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await createTask(groupId, {
      title: fd.get('title') as string,
      task_type: fd.get('task_type') as string,
      day_number: Number(fd.get('day_number')),
      submit_type: fd.get('submit_type') as string,
      description: fd.get('description') as string,
    });
    setShowModal(false);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'draft', 'published', 'closed', 'scored'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                statusFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-subtle text-foreground-muted hover:bg-background-hover'
              }`}
            >
              {s === 'all' ? '全部' : s === 'draft' ? '草稿' : s === 'published' ? '已发布' : s === 'closed' ? '已截止' : '已评分'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} groupId={groupId} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-foreground-muted text-center py-8">暂无任务</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <form onSubmit={handleCreate} className="relative w-full max-w-lg bg-background-secondary rounded-2xl border border-border-subtle p-6 space-y-4">
            <h3 className="font-semibold">新建任务</h3>
            <input name="title" placeholder="任务标题" required className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle" />
            <div className="grid grid-cols-2 gap-3">
              <select name="task_type" className="px-4 py-2 rounded-xl bg-background border border-border-subtle">
                <option value="image">图片提交</option>
                <option value="text">文字提交</option>
                <option value="video">视频链接</option>
                <option value="vote">投票</option>
              </select>
              <select name="day_number" className="px-4 py-2 rounded-xl bg-background border border-border-subtle">
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                ))}
              </select>
            </div>
            <select name="submit_type" className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle">
              <option value="group">公司提交</option>
              <option value="user">个人提交</option>
            </select>
            <textarea name="description" placeholder="任务说明" rows={3} className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle resize-none" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">取消</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">创建</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, groupId }: { task: CampTask; groupId: number }) {
  const { publishTask, closeTask, deleteTask } = useCampStore();
  const statusColor: Record<string, string> = {
    draft: 'text-gray-400',
    published: 'text-emerald-400',
    closed: 'text-amber-400',
    scored: 'text-blue-400',
    archived: 'text-gray-400',
  };
  const statusLabel: Record<string, string> = {
    draft: '草稿', published: '已发布', closed: '已截止', scored: '已评分', archived: '已归档',
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{task.title}</span>
            <span className={`text-xs ${statusColor[task.status]}`}>{statusLabel[task.status]}</span>
            <span className="text-xs text-foreground-muted">Day {task.day_number}</span>
          </div>
          {task.description && <p className="text-sm text-foreground-muted mt-1">{task.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.status === 'draft' && (
            <>
              <button onClick={() => publishTask(groupId, task.id)} className="text-xs px-2 py-1 rounded bg-primary/15 text-primary">发布</button>
              <button onClick={() => deleteTask(groupId, task.id)} className="text-xs px-2 py-1 rounded text-danger">删除</button>
            </>
          )}
          {task.status === 'published' && (
            <button onClick={() => closeTask(groupId, task.id)} className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400">截止</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 作品画廊 ───
function GalleryView({ groupId }: Props) {
  const { submissions, fetchSubmissions, reviewSubmission, featureSubmission } = useCampStore();
  const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchSubmissions(groupId);
  }, [groupId, fetchSubmissions]);

  const handleReview = async () => {
    if (!selectedSub) return;
    const dimensions = Object.entries(scores).map(([dimId, score]) => ({
      dimension_id: Number(dimId),
      score,
      comment: comment || undefined,
    }));
    await reviewSubmission(groupId, selectedSub.id, dimensions);
    setSelectedSub(null);
    setScores({});
    setComment('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {submissions.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSub(sub)}
            className="glass-card p-4 text-left hover:bg-background-hover transition-colors"
          >
            <div className="aspect-video rounded-lg bg-background-secondary flex items-center justify-center mb-3">
              {sub.attachments ? (
                <img src={sub.attachments.split(',')[0]} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Image className="w-8 h-8 text-foreground-muted" />
              )}
            </div>
            <p className="text-sm font-medium truncate">{sub.submitter_name || `提交 #${sub.id}`}</p>
            <div className="flex items-center gap-2 mt-1">
              {sub.score != null && <span className="text-xs text-primary">⭐ {sub.score}</span>}
              {sub.status === 'featured' && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">精选</span>}
            </div>
          </button>
        ))}
        {submissions.length === 0 && <p className="text-sm text-foreground-muted text-center py-8 col-span-full">暂无作品</p>}
      </div>

      {selectedSub && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedSub(null)} />
          <div className="relative w-full max-w-md bg-background-secondary border-l border-border-subtle p-6 overflow-auto">
            <h3 className="text-lg font-bold mb-4">作品详情</h3>
            {selectedSub.attachments && (
              <img src={selectedSub.attachments.split(',')[0]} alt="" className="w-full rounded-lg mb-4" />
            )}
            <div className="space-y-3">
              <div className="glass-card p-3">
                <p className="text-sm text-foreground-muted">评分</p>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScores({ ...scores, 0: s })}
                      className={`w-10 h-10 rounded-lg text-sm font-medium ${
                        scores[0] === s ? 'bg-primary text-background' : 'bg-background border border-border-subtle'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写下点评..."
                rows={3}
                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => featureSubmission(groupId, selectedSub.id, selectedSub.status !== 'featured')} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
                  {selectedSub.status === 'featured' ? '取消精选' : '设为精选'}
                </button>
                <button onClick={handleReview} className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">提交评分</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 提交统计 ───
function SubmissionStats({ groupId }: Props) {
  const { submissions, tasks } = useCampStore();

  const stats = tasks.map((task) => {
    const taskSubs = submissions.filter((s) => s.task_id === task.id);
    return {
      ...task,
      subCount: taskSubs.length,
      avgScore: taskSubs.length > 0
        ? (taskSubs.reduce((sum, s) => sum + (s.score || 0), 0) / taskSubs.length).toFixed(1)
        : '-',
    };
  });

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-foreground-muted text-left">
            <th className="px-4 py-3 font-medium">任务</th>
            <th className="px-4 py-3 font-medium">提交数</th>
            <th className="px-4 py-3 font-medium">均分</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.id} className="border-b border-border-subtle/50">
              <td className="px-4 py-3">{s.title}</td>
              <td className="px-4 py-3">{s.subCount}</td>
              <td className="px-4 py-3">{s.avgScore}</td>
              <td className="px-4 py-3">{s.status}</td>
            </tr>
          ))}
          {stats.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-foreground-muted">暂无数据</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
