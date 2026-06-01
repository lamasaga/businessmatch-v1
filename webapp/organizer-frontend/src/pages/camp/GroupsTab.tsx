import { useEffect, useState } from 'react';
import { Plus, Users, Shuffle, Trash2, X, Loader2, Crown, User } from 'lucide-react';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';
import { useCampStore } from '../../stores/campStore';

interface Props {
  groupId: number;
}

interface CampGroup {
  id: number;
  name: string;
  color?: string;
  member_count: number;
  members: Array<{
    user_id: number;
    username: string;
    role: string;
  }>;
}

export default function GroupsTab({ groupId }: Props) {
  const { current } = useCampStore();
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAutoGroup, setShowAutoGroup] = useState(false);
  const [groupSize, setGroupSize] = useState(4);
  const [method, setMethod] = useState<'random' | 'join_order'>('random');
  const [ungroupedMembers, setUngroupedMembers] = useState<Array<{ user_id: number; username: string }>>([]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<CampGroup[]>>(`/api/v1/teaching-groups/${groupId}/groups`);
      setGroups(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [groupId]);

  // 计算未分组学员
  useEffect(() => {
    if (!current?.members) return;
    const groupedIds = new Set(groups.flatMap((g) => g.members.map((m) => m.user_id)));
    const ungrouped = current.members
      .filter((m) => !groupedIds.has(m.user_id))
      .map((m) => ({ user_id: m.user_id, username: m.username }));
    setUngroupedMembers(ungrouped);
  }, [current, groups]);

  const handleAutoGroup = async () => {
    try {
      await api.post(`/api/v1/teaching-groups/${groupId}/groups/auto-generate`, {
        group_size: groupSize,
        method,
      });
      setShowAutoGroup(false);
      fetchGroups();
    } catch {
      /* handled */
    }
  };

  const handleDeleteGroup = async (campGroupId: number) => {
    if (!window.confirm('确定删除该分组？成员将变为未分组状态。')) return;
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/groups/${campGroupId}`);
      fetchGroups();
    } catch {
      /* handled */
    }
  };

  const handleSetLeader = async (campGroupId: number, userId: number) => {
    try {
      await api.patch(`/api/v1/teaching-groups/${groupId}/groups/${campGroupId}/members/${userId}/role?role=leader`);
      fetchGroups();
    } catch {
      /* handled */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-muted">
          共 {groups.length} 个分组 · {ungroupedMembers.length} 人未分组
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoGroup(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-sm text-foreground-muted hover:bg-background-hover"
          >
            <Shuffle className="w-4 h-4" />
            自动分组
          </button>
        </div>
      </div>

      {/* 自动分组弹窗 */}
      {showAutoGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAutoGroup(false)} />
          <div className="relative w-full max-w-sm bg-background-secondary rounded-2xl border border-border-subtle p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">自动分组</h3>
              <button onClick={() => setShowAutoGroup(false)} className="p-2 hover:bg-background-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">每组人数</label>
              <input
                type="number"
                min={2}
                max={20}
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 4)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
              />
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-2">分配方式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('random')}
                  className={`p-3 rounded-xl border text-sm text-left ${
                    method === 'random' ? 'border-primary bg-primary/10' : 'border-border-subtle'
                  }`}
                >
                  <p className="font-medium">随机分配</p>
                </button>
                <button
                  onClick={() => setMethod('join_order')}
                  className={`p-3 rounded-xl border text-sm text-left ${
                    method === 'join_order' ? 'border-primary bg-primary/10' : 'border-border-subtle'
                  }`}
                >
                  <p className="font-medium">按加入顺序</p>
                </button>
              </div>
            </div>
            <p className="text-xs text-foreground-muted">
              待分组学员：{ungroupedMembers.length} 人
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAutoGroup(false)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
                取消
              </button>
              <button
                onClick={handleAutoGroup}
                disabled={ungroupedMembers.length === 0}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
              >
                确认分组
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未分组学员 */}
      {ungroupedMembers.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <p className="text-sm font-medium mb-2">未分组学员</p>
          <div className="flex flex-wrap gap-2">
            {ungroupedMembers.map((m) => (
              <span key={m.user_id} className="text-xs px-2 py-1 rounded-lg bg-background border border-border-subtle">
                {m.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 分组列表 */}
      {loading && groups.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="glass-card p-4"
              style={{ borderLeftColor: g.color || undefined, borderLeftWidth: g.color ? '3px' : undefined }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: g.color || '#666' }}
                  />
                  <p className="font-semibold">{g.name}</p>
                  <span className="text-xs text-foreground-muted">{g.member_count} 人</span>
                </div>
                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="p-1.5 hover:bg-background-hover rounded-lg text-foreground-muted hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {g.members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 text-sm">
                    {m.role === 'leader' ? (
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-foreground-muted" />
                    )}
                    <span className={m.role === 'leader' ? 'font-medium' : ''}>{m.username}</span>
                    {m.role === 'leader' && (
                      <span className="text-xs text-amber-400">组长</span>
                    )}
                    {m.role !== 'leader' && (
                      <button
                        onClick={() => handleSetLeader(g.id, m.user_id)}
                        className="text-xs text-foreground-muted hover:text-primary ml-auto"
                      >
                        设为组长
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="glass-card p-12 text-center col-span-full">
              <Users className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-foreground-muted">暂无分组</p>
              <p className="text-xs text-foreground-muted mt-1">使用「自动分组」快速创建小组</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
