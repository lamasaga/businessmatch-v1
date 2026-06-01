import { useEffect, useState } from 'react';
import { Plus, Calendar, Lock, Unlock, CheckCircle, Loader2, Trash2, X, BookOpen, Gamepad2, Trophy, BarChart3, FileText, MessageCircle, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';
import { getTemplateOptions, generateMilestonesFromTemplate, MILESTONE_TYPE_LABELS, SEASON_STATUS_LABELS } from '../../utils/seasonTemplates';

interface Props {
  groupId: number;
}

interface Season {
  id: number;
  title: string;
  description?: string;
  theme?: string;
  status: string;
  start_at?: string;
  end_at?: string;
  milestone_count: number;
  created_at: string;
}

interface SeasonMilestone {
  id: number;
  title: string;
  milestone_type: string;
  sequence_order: number;
  status: string;
}

export default function SeasonsTab({ groupId }: Props) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [milestones, setMilestones] = useState<SeasonMilestone[]>([]);

  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [templateId, setTemplateId] = useState('');

  const fetchSeasons = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Season[]>>(`/api/v1/seasons/by-group/${groupId}`);
      setSeasons(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async (seasonId: number) => {
    try {
      const res = await api.get<ApiResponse<{ milestones: SeasonMilestone[] }>>(`/api/v1/seasons/${seasonId}`);
      setMilestones(res.data.data?.milestones ?? []);
    } catch {
      setMilestones([]);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, [groupId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await api.post<ApiResponse<Season>>('/api/v1/seasons', {
        title: title.trim(),
        theme: theme.trim() || undefined,
      }, { params: { teaching_group_id: groupId } });
      const season = res.data.data!;

      // 如果从模板创建，自动添加里程碑
      if (templateId) {
        const templateMilestones = generateMilestonesFromTemplate(templateId);
        for (let i = 0; i < templateMilestones.length; i++) {
          await api.post(`/api/v1/seasons/${season.id}/milestones`, {
            ...templateMilestones[i],
            sequence_order: i + 1,
          });
        }
      }

      setTitle('');
      setTheme('');
      setTemplateId('');
      setShowCreate(false);
      fetchSeasons();
    } catch {
      /* handled by API error */
    }
  };

  const handlePublish = async (seasonId: number) => {
    if (!window.confirm('确定发布赛季？发布后学生端将可见。')) return;
    try {
      await api.post(`/api/v1/seasons/${seasonId}/publish`);
      fetchSeasons();
    } catch {
      /* handled */
    }
  };

  const handleUnlockMilestone = async (seasonId: number, milestoneId: number) => {
    try {
      await api.post(`/api/v1/seasons/${seasonId}/milestones/${milestoneId}/unlock`);
      fetchMilestones(seasonId);
    } catch {
      /* handled */
    }
  };

  const handleDeleteSeason = async (seasonId: number) => {
    if (!window.confirm('确定删除赛季？相关里程碑也将被删除。')) return;
    try {
      await api.delete(`/api/v1/seasons/${seasonId}`);
      fetchSeasons();
      if (selectedSeason?.id === seasonId) {
        setSelectedSeason(null);
        setMilestones([]);
      }
    } catch {
      /* handled */
    }
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen className="w-4 h-4" />;
      case 'practice_match': return <Gamepad2 className="w-4 h-4" />;
      case 'formal_match': return <Trophy className="w-4 h-4" />;
      case 'debrief': return <BarChart3 className="w-4 h-4" />;
      case 'assignment': return <FileText className="w-4 h-4" />;
      case 'discussion': return <MessageCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (selectedSeason) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSelectedSeason(null); setMilestones([]); }}
            className="p-2 hover:bg-background-hover rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-foreground-muted rotate-180" />
          </button>
          <div>
            <h3 className="text-lg font-bold">{selectedSeason.title}</h3>
            <p className="text-xs text-foreground-muted">
              {SEASON_STATUS_LABELS[selectedSeason.status]?.label || selectedSeason.status}
              {selectedSeason.theme && ` · ${selectedSeason.theme}`}
            </p>
          </div>
          {selectedSeason.status === 'draft' && (
            <button
              onClick={() => handlePublish(selectedSeason.id)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-primary text-background text-sm font-medium"
            >
              发布赛季
            </button>
          )}
        </div>

        {/* 里程碑时间线 */}
        <div className="space-y-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`glass-card p-4 ${
                m.status === 'unlocked' ? 'border-emerald-500/30' : ''
              } ${m.status === 'completed' ? 'border-primary/30 opacity-70' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`${MILESTONE_TYPE_LABELS[m.milestone_type]?.color || 'text-foreground-muted'}`}>
                  {getMilestoneIcon(m.milestone_type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {MILESTONE_TYPE_LABELS[m.milestone_type]?.label || m.milestone_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'locked' && (
                    <button
                      onClick={() => handleUnlockMilestone(selectedSeason.id, m.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <Unlock className="w-3 h-3" />
                      解锁
                    </button>
                  )}
                  {m.status === 'unlocked' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Unlock className="w-3 h-3" />
                      已解锁
                    </span>
                  )}
                  {m.status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle className="w-3 h-3" />
                      已完成
                    </span>
                  )}
                  {m.status === 'locked' && (
                    <Lock className="w-3 h-3 text-foreground-muted" />
                  )}
                </div>
              </div>
            </div>
          ))}
          {milestones.length === 0 && (
            <p className="text-sm text-foreground-muted text-center py-8">暂无里程碑</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-muted">
          共 {seasons.length} 个赛季
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-background text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          创建赛季
        </button>
      </div>

      {/* 创建赛季弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={handleCreate}
            className="relative w-full max-w-lg bg-background-secondary rounded-2xl border border-border-subtle p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">创建赛季</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 hover:bg-background-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">赛季名称</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：4周商赛入门"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
                required
              />
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">主题（可选）</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例如：长三角贸易"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
              />
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">选择模板（可选）</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateId('')}
                  className={`p-3 rounded-xl border text-left text-sm ${
                    templateId === '' ? 'border-primary bg-primary/10' : 'border-border-subtle hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium">空白赛季</p>
                  <p className="text-xs text-foreground-muted mt-0.5">从零开始编排</p>
                </button>
                {getTemplateOptions().map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`p-3 rounded-xl border text-left text-sm ${
                      templateId === t.id ? 'border-primary bg-primary/10' : 'border-border-subtle hover:border-primary/40'
                    }`}
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">{t.description} · {t.milestoneCount} 个里程碑</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-border-subtle text-sm"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 赛季列表 */}
      <div className="space-y-3">
        {seasons.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-foreground-muted">暂无赛季</p>
            <p className="text-xs text-foreground-muted mt-1">点击「创建赛季」开始编排教学节奏</p>
          </div>
        ) : (
          seasons.map((s) => (
            <div key={s.id} className="glass-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedSeason(s); fetchMilestones(s.id); }}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.title}</p>
                    <span className={`text-xs ${SEASON_STATUS_LABELS[s.status]?.color || ''}`}>
                      {SEASON_STATUS_LABELS[s.status]?.label || s.status}
                    </span>
                  </div>
                  {s.theme && <p className="text-xs text-foreground-muted mt-0.5">{s.theme}</p>}
                  <p className="text-xs text-foreground-muted mt-1">
                    {s.milestone_count} 个里程碑 · 创建于 {new Date(s.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setSelectedSeason(s); fetchMilestones(s.id); }}
                    className="p-2 hover:bg-background-hover rounded-lg text-foreground-muted"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {s.status === 'draft' && (
                    <button
                      onClick={() => handleDeleteSeason(s.id)}
                      className="p-2 hover:bg-background-hover rounded-lg text-foreground-muted hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
