import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompetitionStore } from '../../stores/competitionStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Trophy, ArrowRight, Play, Loader2,
  Crown, MapPin
} from 'lucide-react';

export default function GameLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuthStore();
  const {
    currentEvent, myParticipant, isOrganizer,
    getMyStatus, startEvent, loading, error
  } = useCompetitionStore();
  useState(false);

  const eventId = Number(id);

  useEffect(() => {
    getMyStatus(eventId);
  }, [eventId, getMyStatus]);

  // Auto-refresh every 3 seconds during registration/playing
  useEffect(() => {
    if (!currentEvent) return;
    if (currentEvent.status === 'registration' || currentEvent.status === 'playing') {
      const interval = setInterval(() => {
        getMyStatus(eventId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentEvent?.status, eventId, getMyStatus]);

  const isTechVenture = currentEvent?.game_config_id?.startsWith('techventure');

  useEffect(() => {
    if (isTechVenture) {
      navigate(`/games/${eventId}/techventure/lobby`, { replace: true });
    }
  }, [isTechVenture, eventId, navigate]);

  const gameRoute = isTechVenture
    ? `/games/${eventId}/techventure`
    : `/games/${eventId}/play`;

  const handleStart = async () => {
    try {
      await startEvent(eventId);
      navigate(gameRoute);
    } catch {
      // error handled in store
    }
  };

  const handleEnterGame = () => {
    navigate(gameRoute);
  };

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isPlaying = currentEvent.status === 'playing';
  isOrganizer;
  const canStart = isOrganizer && currentEvent.status === 'registration';
  const canEnter = myParticipant && (isPlaying || currentEvent.status === 'finished');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{currentEvent.title}</h1>
        <p className="text-foreground-muted mt-1">{currentEvent.description || '商赛比赛大厅'}</p>
      </div>

      {/* Room Code */}
      <div className="glass-card p-6 mb-6 text-center">
        <p className="text-sm text-foreground-muted mb-2">房间码</p>
        <div className="text-4xl font-mono font-bold text-primary tracking-[0.5em]">
          {currentEvent.room_code}
        </div>
        <p className="text-xs text-foreground-muted mt-3">
          分享此房间码让其他选手加入
        </p>
      </div>

      {/* Status & Info */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {currentEvent.config?.rounds || 10}
            </p>
            <p className="text-xs text-foreground-muted mt-1">总回合</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              ¥{(currentEvent.config?.initial_capital || 50000).toLocaleString()}
            </p>
            <p className="text-xs text-foreground-muted mt-1">初始资金</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {currentEvent.participant_count || 0}
            </p>
            <p className="text-xs text-foreground-muted mt-1">已加入</p>
          </div>
        </div>
      </div>

      {/* Participant Status */}
      {myParticipant && (
        <div className="glass-card p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            我的状态
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-foreground-muted">现金</p>
              <p className="text-lg font-bold text-foreground">¥{myParticipant.cash.toLocaleString()}</p>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-foreground-muted">总资产</p>
              <p className="text-lg font-bold text-foreground">¥{myParticipant.total_assets.toLocaleString()}</p>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-foreground-muted">当前城市</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4 text-primary" />
                {myParticipant.current_city}
              </p>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-foreground-muted">库存</p>
              <p className="text-lg font-bold text-foreground">
                {Object.values(myParticipant.inventory || {}).reduce((a, b) => a + b, 0)} 件
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {canStart && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3.5 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                开始比赛
              </>
            )}
          </button>
        )}

        {canEnter && (
          <button
            onClick={handleEnterGame}
            className="w-full py-3.5 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            {isPlaying ? '进入比赛' : '查看结果'}
          </button>
        )}

        {currentEvent.status === 'registration' && !myParticipant && (
          <div className="text-center py-4 text-foreground-muted">
            <p>您尚未加入这场比赛</p>
            <p className="text-sm mt-1">返回大厅输入房间码 {currentEvent.room_code} 加入</p>
          </div>
        )}

        {currentEvent.status === 'finished' && !myParticipant && (
          <div className="text-center py-4 text-foreground-muted">
            <p>比赛已结束</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
