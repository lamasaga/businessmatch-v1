import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Users, CheckCircle2, Loader2, Briefcase, UserPlus, Clock,
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
      setLoading(false);

      if (data.has_open_round && data.my_team_id) {
        navigate(`/games/${eventId}/techventure`, { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '加载大厅失败');
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

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
    } catch (err: any) {
      setError(err?.response?.data?.message || '加入队伍失败');
    } finally {
      setJoining(false);
    }
  };

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
  const myTeam = lobby.teams.find((t) => t.id === lobby.my_team_id);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold">{lobby.title}</h1>
        <p className="text-foreground-muted mt-2">
          创想大赢家 · TechVenture
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-mono">
          房间码: {lobby.room_code}
        </div>
      </div>

      {/* Status bar */}
      <div className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            lobby.match_status === 'playing' ? 'bg-success animate-pulse' : 'bg-yellow-400 animate-pulse'
          }`} />
          <span className="text-sm font-medium">
            {lobby.match_status === 'playing' ? '比赛进行中' : '等待组织者开始比赛'}
          </span>
        </div>
        {hasTeam && myTeam ? (
          <span className="text-sm text-purple-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            已加入: {myTeam.team_name}
          </span>
        ) : (
          <span className="text-sm text-yellow-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            请选择队伍
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Teams */}
      {lobby.teams.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-foreground-muted/30 mb-4" />
          <p className="text-foreground-muted">组织者尚未创建队伍</p>
          <p className="text-sm text-foreground-muted/60 mt-1">请等待组织者在控场端建队</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            可选队伍（{lobby.teams.length} 支）
          </h2>
          {lobby.teams.map((team) => {
            const isMine = team.id === lobby.my_team_id;
            return (
              <div
                key={team.id}
                className={`glass-card p-5 transition-all ${
                  isMine
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        isMine ? 'bg-purple-500/20 text-purple-400' : 'bg-background-secondary text-foreground-muted'
                      }`}>
                        {team.team_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {team.team_name}
                          {team.product_name && (
                            <span className="text-xs text-foreground-muted font-normal">
                              · {team.product_name}
                            </span>
                          )}
                          {isMine && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-normal">
                              我的队伍
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-foreground-muted mt-0.5">
                          {team.member_count} 名成员
                          {team.members.length > 0 && ` · ${team.members.join('、')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isMine ? (
                    <CheckCircle2 className="w-6 h-6 text-purple-400 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoinTeam(team.id)}
                      disabled={joining}
                      className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {joining ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      加入
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Waiting hint */}
      {hasTeam && !lobby.has_open_round && (
        <div className="mt-8 glass-card p-6 text-center border-purple-500/20">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="font-medium">已就位，等待组织者开始比赛</p>
          <p className="text-sm text-foreground-muted mt-1">
            组织者开放第一轮后将自动进入比赛
          </p>
        </div>
      )}
    </div>
  );
}
