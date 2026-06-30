import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Users, CheckCircle2, Loader2, Briefcase, UserPlus, Clock, Rocket,
} from 'lucide-react';

interface TeamInfo {
  id: number;
  team_name: string;
  product_name?: string;
  member_count: number;
  members: string[];
}

interface LobbyData {
  match_status: string;
  title: string;
  room_code: string;
  my_team_id: number | null;
  has_open_round: boolean;
  teams: TeamInfo[];
}

export default function TechVentureLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const fetchLobby = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/techventure/events/${eventId}/lobby`);
      const data = res.data.data as LobbyData;
      setLobby(data);
      setError('');
      setLoading(false);
      if (data.has_open_round && data.my_team_id) {
        navigate(`/games/${eventId}/techventure`, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : '加载大厅失败'));
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => { fetchLobby(); }, [fetchLobby]);
  useEffect(() => {
    if (!lobby) return;
    const interval = setInterval(fetchLobby, 3000);
    return () => clearInterval(interval);
  }, [lobby, fetchLobby]);

  const handleJoinTeam = async (teamId: number) => {
    setJoining(true);
    setError('');
    try {
      await api.post(`/api/v1/techventure/events/${eventId}/join-team`, { team_id: teamId });
      await fetchLobby();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : '加入队伍失败'));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#1a0a2e]">
        <Loader2 className="w-8 h-8 text-tv-primary animate-spin" />
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
  const myTeam = lobby.teams.find((t) => t.id === lobby.my_team_id);
  const isPlaying = lobby.match_status === 'playing';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] to-[#0a0a0b] text-foreground">
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-center mb-8 pt-6">
          <div className="w-16 h-16 rounded-2xl bg-tv-primary/15 border border-tv-primary/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
            <Rocket className="w-8 h-8 text-tv-primary" />
          </div>
          <h1 className="text-2xl font-bold">{lobby.title}</h1>
          <p className="text-foreground-muted mt-2 text-sm">创想大赢家 · 4 轮策略迭代 + BQI 评分</p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tv-primary/10 border border-tv-primary/20 text-tv-primary text-sm font-mono">
            房间码: {lobby.room_code}
          </div>
        </div>

        <div className="rounded-2xl border border-tv-primary/20 bg-background-secondary/60 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-success animate-pulse' : 'bg-tv-pathfinder animate-pulse'}`} />
            <span className="text-sm font-medium">
              {isPlaying ? '比赛进行中' : '等待教师开始比赛'}
            </span>
          </div>
          {hasTeam && myTeam ? (
            <span className="text-sm text-tv-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {myTeam.team_name}
            </span>
          ) : (
            <span className="text-sm text-tv-pathfinder flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              请选择队伍
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <div className="rounded-2xl border border-tv-primary/20 bg-background-secondary/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-tv-primary" />
            可选队伍（{lobby.teams.length} 支）
          </h2>
          {lobby.teams.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">组织者尚未创建队伍</p>
          ) : (
            <div className="space-y-2">
              {lobby.teams.map((team) => {
                const isMine = team.id === lobby.my_team_id;
                return (
                  <div
                    key={team.id}
                    className={`rounded-xl border p-4 flex items-center justify-between ${
                      isMine ? 'border-tv-primary/40 bg-tv-primary/10' : 'border-border-subtle bg-background/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isMine ? 'bg-tv-primary/20 text-tv-primary' : 'bg-background-secondary text-foreground-muted'
                      }`}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {team.team_name}
                          {isMine && <span className="ml-2 text-[10px] text-tv-primary font-normal">我的队伍</span>}
                        </h3>
                        <p className="text-xs text-foreground-muted truncate">
                          {team.member_count} 名成员
                          {team.product_name ? ` · ${team.product_name}` : ''}
                        </p>
                      </div>
                    </div>
                    {isMine ? (
                      <CheckCircle2 className="w-5 h-5 text-tv-primary shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinTeam(team.id)}
                        disabled={joining}
                        className="px-4 py-2 rounded-xl bg-tv-primary/15 text-tv-primary text-sm font-medium hover:bg-tv-primary/25 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        加入
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasTeam && !lobby.has_open_round && (
          <div className="mt-8 rounded-2xl border border-tv-primary/20 bg-tv-primary/5 p-6 text-center">
            <Loader2 className="w-6 h-6 text-tv-primary animate-spin mx-auto mb-3" />
            <p className="font-medium">已就位，等待教师开放第一轮</p>
            <p className="text-sm text-foreground-muted mt-1">开轮后将自动进入数据仪表盘</p>
          </div>
        )}
      </div>
    </div>
  );
}
