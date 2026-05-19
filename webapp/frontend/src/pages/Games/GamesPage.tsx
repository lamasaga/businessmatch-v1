import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitionStore } from '../../stores/competitionStore';
import {
  Trophy, Plus, Search, Users, Clock, ArrowRight,
  TrendingUp, MapPin, Zap
} from 'lucide-react';

export default function GamesPage() {
  const navigate = useNavigate();
  const { events, fetchEvents, joinEvent, loading } = useCompetitionStore();
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'my'>('public');

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleJoin = async () => {
    if (!roomCode || roomCode.length !== 4) {
      setJoinError('请输入4位房间码');
      return;
    }
    setJoinError('');
    try {
      await joinEvent(roomCode);
      // Find the event we just joined
      const joinedEvent = events.find(e => e.room_code === roomCode);
      if (joinedEvent) {
        navigate(`/games/${joinedEvent.id}/lobby`);
      }
    } catch (err: any) {
      setJoinError(err.message || '加入失败');
    }
  };

  const myEvents = events.filter(e =>
    e.status === 'playing' || e.status === 'registration'
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">商赛大厅</h1>
          <p className="text-foreground-muted mt-1">加入比赛，体验真实商业竞争</p>
        </div>
        <a
          href={import.meta.env.VITE_ORGANIZER_URL || 'http://localhost:5174'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 border border-primary/40 text-primary rounded-xl font-semibold hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          组织者控制台
        </a>
      </div>

      {/* Join by room code */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">输入房间码加入比赛</h3>
            <p className="text-sm text-foreground-muted">向组织者获取4位数字房间码</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              maxLength={4}
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                setJoinError('');
              }}
              placeholder="0000"
              className="w-24 px-4 py-2.5 text-center text-lg font-mono tracking-widest bg-background-secondary border border-border-subtle rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleJoin}
              disabled={loading || roomCode.length !== 4}
              className="px-6 py-2.5 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              加入
            </button>
          </div>
        </div>
        {joinError && (
          <p className="mt-3 text-sm text-danger">{joinError}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('public')}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === 'public'
              ? 'text-primary border-b-2 border-primary'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          公开比赛
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeTab === 'my'
              ? 'text-primary border-b-2 border-primary'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          我的比赛
        </button>
      </div>

      {/* Events List */}
      {activeTab === 'public' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/games/${event.id}/lobby`)}
              className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  event.status === 'playing'
                    ? 'bg-success/10 text-success'
                    : event.status === 'registration'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-foreground-muted/10 text-foreground-muted'
                }`}>
                  {event.status === 'playing' ? '进行中' : event.status === 'registration' ? '报名中' : '已结束'}
                </span>
              </div>

              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <p className="text-sm text-foreground-muted mb-4 line-clamp-2">
                {event.description || '暂无描述'}
              </p>

              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {event.participant_count || 0}/{event.max_players}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {event.config?.rounds || 10}回合
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  ¥{(event.config?.initial_capital || 50000).toLocaleString()}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs font-mono text-primary">房间码: {event.room_code}</span>
                <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Trophy className="w-12 h-12 mx-auto text-foreground-muted/30 mb-4" />
              <p className="text-foreground-muted">暂无公开比赛</p>
              <p className="text-sm text-foreground-muted/60 mt-1">输入房间码加入比赛或等待组织者创建</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myEvents.length > 0 ? myEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/games/${event.id}/lobby`)}
              className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  event.status === 'playing'
                    ? 'bg-success/10 text-success'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {event.status === 'playing' ? '进行中' : '报名中'}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{event.title}</h3>
              <p className="text-sm text-foreground-muted mb-3">{event.description || '暂无描述'}</p>
              <div className="text-xs font-mono text-primary">房间码: {event.room_code}</div>
            </div>
          )) : (
            <div className="col-span-full text-center py-16">
              <MapPin className="w-12 h-12 mx-auto text-foreground-muted/30 mb-4" />
              <p className="text-foreground-muted">您还没有参加任何比赛</p>
              <p className="text-sm text-foreground-muted/60 mt-1">输入房间码加入一场比赛</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
