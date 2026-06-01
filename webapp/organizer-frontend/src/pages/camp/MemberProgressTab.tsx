import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download, Loader2, Trophy, Clock, X } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

interface Props {
  groupId: number;
}

type SortField = 'username' | 'match_count' | 'total_xp' | 'last_active_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'normal' | 'attention' | 'newcomer';

const STATUS_CONFIG: Record<string, { label: string; dot: string; color: string }> = {
  active: { label: '🟢 积极', dot: 'bg-green-500', color: 'text-green-400' },
  normal: { label: '🟡 正常', dot: 'bg-yellow-500', color: 'text-yellow-400' },
  attention: { label: '🔴 需关注', dot: 'bg-red-500', color: 'text-red-400' },
  newcomer: { label: '⚪ 从未参赛', dot: 'bg-gray-400', color: 'text-gray-400' },
};

export default function MemberProgressTab({ groupId }: Props) {
  const { memberProgress, progressSummary, loading, fetchMemberProgress } = useCampStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('match_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  useEffect(() => {
    fetchMemberProgress(groupId);
  }, [groupId, fetchMemberProgress]);

  const filtered = useMemo(() => {
    let data = [...memberProgress];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((m) => m.username.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      data = data.filter((m) => m.status === statusFilter);
    }

    data.sort((a, b) => {
      let va: string | number | null = a[sortField];
      let vb: string | number | null = b[sortField];
      if (va === null) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb === null) vb = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return 0;
    });

    return data;
  }, [memberProgress, search, statusFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const exportCSV = () => {
    const headers = ['用户名', '加入时间', '参赛场次', '累计XP', '最近活跃', '状态'];
    const rows = filtered.map((m) => [
      m.username,
      new Date(m.joined_at).toLocaleDateString('zh-CN'),
      String(m.match_count),
      String(m.total_xp),
      m.last_active_at ? new Date(m.last_active_at).toLocaleDateString('zh-CN') : '—',
      STATUS_CONFIG[m.status]?.label || m.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `学员进度-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const selectedMember = memberProgress.find((m) => m.user_id === selectedUser);

  return (
    <div>
      {/* 状态概览 */}
      {progressSummary && (
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { key: 'active', label: '🟢 积极', count: progressSummary.active },
            { key: 'normal', label: '🟡 正常', count: progressSummary.normal },
            { key: 'attention', label: '🔴 需关注', count: progressSummary.attention },
            { key: 'newcomer', label: '⚪ 新入营', count: progressSummary.newcomer },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : (s.key as StatusFilter))}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                statusFilter === s.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-subtle text-foreground-muted hover:bg-background-hover'
              }`}
            >
              {s.label} {s.count}
            </button>
          ))}
        </div>
      )}

      {/* 搜索与导出 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索学员昵称..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background-secondary border border-border-subtle text-sm"
          />
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-sm text-foreground-muted hover:bg-background-hover"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      {/* 表格 */}
      {loading && memberProgress.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-foreground-muted text-left">
                <th className="px-4 py-3 font-medium">学员</th>
                <th className="px-4 py-3 font-medium">加入时间</th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('match_count')}
                >
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    参赛
                    {sortField === 'match_count' && (sortDir === 'desc' ? '↓' : '↑')}
                  </span>
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('total_xp')}
                >
                  <span className="flex items-center gap-1">
                    累计 XP
                    {sortField === 'total_xp' && (sortDir === 'desc' ? '↓' : '↑')}
                  </span>
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('last_active_at')}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    最近活跃
                    {sortField === 'last_active_at' && (sortDir === 'desc' ? '↓' : '↑')}
                  </span>
                </th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.user_id}
                  onClick={() => setSelectedUser(m.user_id)}
                  className="border-b border-border-subtle/50 last:border-0 hover:bg-background-hover/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{m.username}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {new Date(m.joined_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">{m.match_count}</td>
                  <td className="px-4 py-3">{m.total_xp}</td>
                  <td className="px-4 py-3 text-foreground-muted">{formatDate(m.last_active_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${STATUS_CONFIG[m.status]?.color || ''}`}>
                      {STATUS_CONFIG[m.status]?.label || m.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">
                    无匹配学员
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 学员详情抽屉 */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-md bg-background-secondary border-l border-border-subtle p-6 overflow-auto transform transition-transform duration-300 translate-x-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{selectedMember.username}</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-background-hover rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="glass-card p-4">
                <p className="text-sm text-foreground-muted">加入时间</p>
                <p className="font-medium">
                  {new Date(selectedMember.joined_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-foreground-muted">参赛统计</p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <p className="text-xl font-bold">{selectedMember.match_count}</p>
                    <p className="text-xs text-foreground-muted">参赛场次</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{selectedMember.total_xp}</p>
                    <p className="text-xs text-foreground-muted">累计 XP</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatDate(selectedMember.last_active_at)}</p>
                    <p className="text-xs text-foreground-muted">最近活跃</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-foreground-muted">状态</p>
                <p className={`mt-1 ${STATUS_CONFIG[selectedMember.status]?.color || ''}`}>
                  {STATUS_CONFIG[selectedMember.status]?.label || selectedMember.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
