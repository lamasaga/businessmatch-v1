import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Factory, CheckCircle2, Loader2, Users, Clock,
} from 'lucide-react';

interface OpsLobbyTeam {
  team_id: number;
  team_name: string;
  product_name?: string;
  category?: string;
  target_segment?: string;
  has_positioned: boolean;
}

interface OpsLobbyData {
  match_status: string;
  phase: string;
  title: string;
  room_code: string;
  my_team_id: number | null;
  my_team_name: string | null;
  teams: OpsLobbyTeam[];
}

const PHASE_LABEL: Record<string, string> = {
  registration: '报名中',
  positioning: '产品定位',
  auction_a: '拍卖A · 基础资源',
  operation_round_1: '运营第1轮',
  operation_round_2: '运营第2轮',
  operation_round_3: '运营第3轮',
  auction_b: '拍卖B · 战略资源',
  operation_round_4: '运营第4轮',
  operation_round_5: '运营第5轮',
  operation_round_6: '运营第6轮',
  auction: '资源竞价',
  finished: '已结束',
  paused: '已暂停',
};

export default function OpsLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const [lobby, setLobby] = useState<OpsLobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLobby = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      const data = res.data.data;
      setLobby({
        match_status: data.match_status,
        phase: data.phase,
        title: data.team?.team_name ? '生产经营销售赛' : 'OPS 比赛',
        room_code: '', // state API 不返回 room_code，从 competitions API 获取
        my_team_id: data.team?.team_id ?? null,
        my_team_name: data.team?.team_name ?? null,
        teams: [], // 从 screen API 或单独接口获取
      });
      // 同时获取 screen 数据来展示队伍列表
      const screenRes = await api.get(`/api/v1/ops/events/${eventId}/screen`);
      const screenData = screenRes.data.data;
      if (screenData) {
        const teamRows = screenData.teams?.length
          ? screenData.teams
          : (screenData.ranking || []);
        setLobby((prev) =>
          prev
            ? {
                ...prev,
                room_code: screenData.room_code || '',
                title: screenData.title || prev.title,
                teams: teamRows.map((r: { id?: number; team_id?: number; team_name: string; product_name?: string; category?: string; target_segment?: string }) => ({
                  team_id: r.team_id ?? r.id ?? 0,
                  team_name: r.team_name,
                  product_name: r.product_name,
                  category: r.category,
                  target_segment: r.target_segment,
                  has_positioned: Boolean(r.product_name),
                })),
              }
            : null
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '加载大厅失败');
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

  useEffect(() => {
    if (!lobby) return;
    const interval = setInterval(fetchLobby, 4000);
    return () => clearInterval(interval);
  }, [lobby, fetchLobby]);

  // 比赛进行中时自动跳转到游戏页面
  useEffect(() => {
    if (lobby && lobby.phase !== 'registration' && lobby.my_team_id) {
      navigate(`/games/${eventId}/ops`, { replace: true });
    }
  }, [lobby, eventId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error && !lobby) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!lobby) return null;

  const hasTeam = lobby.my_team_id !== null;
  const isWaiting = lobby.match_status === 'registration' || lobby.match_status === 'draft';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Factory className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold">{lobby.title || '生产经营销售赛'}</h1>
        <p className="text-foreground-muted mt-2">
          OPS · 6 轮运营决策 + 双拍卖
        </p>
        {lobby.room_code && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-mono">
            房间码: {lobby.room_code}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isWaiting ? 'bg-yellow-400 animate-pulse' : 'bg-success animate-pulse'
            }`}
          />
          <span className="text-sm font-medium">
            {isWaiting ? '等待组织者开始比赛' : PHASE_LABEL[lobby.phase] || lobby.phase}
          </span>
        </div>
        {hasTeam && lobby.my_team_name ? (
          <span className="text-sm text-blue-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            已加入: {lobby.my_team_name}
          </span>
        ) : (
          <span className="text-sm text-yellow-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            等待分配队伍
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Teams */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-400" />
          参赛队伍
        </h2>
        {lobby.teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-foreground-muted/30 mb-4" />
            <p className="text-foreground-muted">暂无队伍信息</p>
            <p className="text-sm text-foreground-muted/60 mt-1">比赛开始后将显示队伍列表</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lobby.teams.map((team) => {
              const isMine = team.team_id === lobby.my_team_id;
              return (
                <div
                  key={team.team_id}
                  className={`glass-card p-4 transition-all ${
                    isMine
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          isMine
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-background-secondary text-foreground-muted'
                        }`}
                      >
                        {team.team_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {team.team_name}
                          {isMine && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-normal">
                              我的队伍
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-foreground-muted mt-0.5">
                          {team.product_name || '产品定位中...'}
                        </p>
                      </div>
                    </div>
                    {isMine && <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Waiting hint */}
      {isWaiting && hasTeam && (
        <div className="mt-8 glass-card p-6 text-center border-blue-500/20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="font-medium">已就位，等待组织者开始比赛</p>
          <p className="text-sm text-foreground-muted mt-1">
            组织者开始比赛后将自动进入
          </p>
        </div>
      )}

      {!hasTeam && (
        <div className="mt-8 glass-card p-6 text-center">
          <p className="text-foreground-muted">您尚未分配队伍</p>
          <p className="text-sm text-foreground-muted/60 mt-1">
            请确认已成功加入比赛，等待组织者分配队伍
          </p>
        </div>
      )}
    </div>
  );
}
