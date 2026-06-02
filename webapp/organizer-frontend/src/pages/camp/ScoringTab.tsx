import { useEffect, useState } from 'react';
import { Trophy, BarChart3, Star, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';
import type { CampAward, TaskSubmission } from '../../types/camp';

interface Props {
  groupId: number;
}

const SUB_TABS = [
  { id: 'scoring', label: '评分管理' },
  { id: 'awards', label: '奖项管理' },
] as const;

export default function ScoringTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('scoring');

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {activeSubTab === 'scoring' && <ScoringManager groupId={groupId} />}
      {activeSubTab === 'awards' && <AwardManager groupId={groupId} />}
    </div>
  );
}

function ScoringManager({ groupId }: Props) {
  const { tasks, submissions, fetchTasks, fetchSubmissions, reviewSubmission } = useCampStore();
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [reviewingSub, setReviewingSub] = useState<TaskSubmission | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchTasks(groupId);
  }, [groupId, fetchTasks]);

  useEffect(() => {
    if (selectedTask) {
      fetchSubmissions(groupId, { task_id: selectedTask });
    }
  }, [groupId, selectedTask, fetchSubmissions]);

  const handleReview = async () => {
    if (!reviewingSub) return;
    const dimensions = Object.entries(scores).map(([dimId, score]) => ({
      dimension_id: Number(dimId),
      score,
      comment: comment || undefined,
    }));
    await reviewSubmission(groupId, reviewingSub.id, dimensions);
    setReviewingSub(null);
    setScores({});
    setComment('');
    fetchSubmissions(groupId, { task_id: selectedTask! });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => setSelectedTask(task.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              selectedTask === task.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border-subtle text-foreground-muted hover:bg-background-hover'
            }`}
          >
            {task.title}
          </button>
        ))}
      </div>

      {selectedTask && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-foreground-muted text-left">
                <th className="px-4 py-3 font-medium">提交者</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">评分</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {submissions.filter((s) => s.task_id === selectedTask).map((sub) => (
                <tr key={sub.id} className="border-b border-border-subtle/50">
                  <td className="px-4 py-3">{sub.submitter_name || `提交 #${sub.id}`}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      sub.status === 'featured' ? 'bg-amber-500/15 text-amber-400' :
                      sub.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>
                      {sub.status === 'featured' ? '精选' : sub.status === 'reviewed' ? '已评' : '待评'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{sub.score != null ? `⭐ ${sub.score}` : '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setReviewingSub(sub); setScores({}); setComment(''); }}
                      className="text-xs px-2 py-1 rounded bg-primary/15 text-primary"
                    >
                      {sub.status === 'pending' ? '去评分' : '重新评分'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewingSub(null)} />
          <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <h3 className="font-semibold mb-4">评分 — {reviewingSub.submitter_name || `提交 #${reviewingSub.id}`}</h3>
            <div className="space-y-4">
              <div className="glass-card p-4">
                <p className="text-sm text-foreground-muted mb-2">综合评分</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScores({ 0: s })}
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
              <div className="flex justify-end gap-3">
                <button onClick={() => setReviewingSub(null)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">取消</button>
                <button onClick={handleReview} className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">提交评分</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AwardManager({ groupId }: Props) {
  const { awards, fetchAwards, createAward, deleteAward, calculateWinners } = useCampStore();
  const [showModal, setShowModal] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);

  useEffect(() => {
    fetchAwards(groupId);
  }, [groupId, fetchAwards]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createAward(groupId, {
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      icon: 'Trophy',
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium"
        >
          <Trophy className="w-4 h-4" />
          新建奖项
        </button>
        <button
          onClick={async () => { await calculateWinners(groupId); setShowCeremony(true); }}
          className="px-4 py-2 rounded-lg border border-border-subtle text-sm"
        >
          开始颁奖
        </button>
      </div>

      <div className="space-y-3">
        {awards.map((award) => (
          <div key={award.id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400" />
              <div>
                <p className="font-medium">{award.name}</p>
                <p className="text-sm text-foreground-muted">{award.description || '暂无描述'}</p>
              </div>
            </div>
            <button
              onClick={() => deleteAward(groupId, award.id)}
              className="p-2 hover:bg-background-hover rounded-lg text-danger"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {awards.length === 0 && (
          <p className="text-sm text-foreground-muted text-center py-8">暂无奖项</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <form onSubmit={handleCreate} className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-6 space-y-4">
            <h3 className="font-semibold">新建奖项</h3>
            <input name="name" placeholder="奖项名" required className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle" />
            <textarea name="description" placeholder="描述" rows={2} className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle resize-none" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">取消</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">创建</button>
            </div>
          </form>
        </div>
      )}

      {showCeremony && (
        <AwardCeremonyModal awards={awards} onClose={() => setShowCeremony(false)} />
      )}
    </div>
  );
}

function AwardCeremonyModal({ awards, onClose }: { awards: CampAward[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = awards[step];
  const isLast = step === awards.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-8 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-background-hover rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <p className="text-sm text-foreground-muted mb-2">Step {step + 1} / {awards.length}</p>
        <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{current?.name}</h3>
        <p className="text-sm text-foreground-muted mb-6">{current?.description}</p>

        {!revealed ? (
          <div className="py-8">
            <button
              onClick={() => setRevealed(true)}
              className="px-8 py-3 rounded-xl bg-primary text-background font-semibold text-lg animate-pulse"
            >
              🥁 揭晓获奖者
            </button>
          </div>
        ) : (
          <div className="py-4 animate-in fade-in zoom-in duration-500">
            <p className="text-lg text-foreground-muted mb-2">获奖者是...</p>
            <p className="text-3xl font-bold text-amber-400 mb-4">待定</p>
            <div className="text-4xl mb-4">🎉</div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-foreground-muted disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>
          <button
            onClick={() => {
              if (isLast) { onClose(); }
              else { setStep(step + 1); setRevealed(false); }
            }}
            disabled={!revealed}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
          >
            {isLast ? '完成' : '下一步'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
