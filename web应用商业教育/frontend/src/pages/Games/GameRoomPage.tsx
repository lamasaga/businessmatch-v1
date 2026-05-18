import { useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  Users,
  Clock,
  Settings,
  Play,
  UserCheck,
  UserX,
  Crown,
  MessageSquare,
  Send,
} from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  avatar?: string;
  isReady: boolean;
  isHost: boolean;
  team?: string;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

const mockParticipants: Participant[] = [
  { id: '1', username: '玩家一号', isReady: true, isHost: true, team: 'A队' },
  { id: '2', username: '商业新星', isReady: true, isHost: false, team: 'B队' },
  { id: '3', username: '策略大师', isReady: false, isHost: false, team: 'C队' },
  { id: '4', username: '等待加入...', isReady: false, isHost: false },
];

const mockChat: ChatMessage[] = [
  { id: '1', username: '系统', message: '房间已创建，等待玩家加入...', timestamp: '14:30' },
  { id: '2', username: '玩家一号', message: '大家好，准备好了吗？', timestamp: '14:32' },
  { id: '3', username: '商业新星', message: '准备好了！这次我要选TECH路线', timestamp: '14:33' },
];

export default function GameRoomPage() {
  const { id } = useParams<{ id: string }>();
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);

  const gameMode = id === 'turn-based' ? '回合制策略商赛' : '商赛模式';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Room Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                等待中
              </span>
              <span className="text-sm text-foreground-muted">房间号: #8842</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{gameMode}</h1>
            <p className="text-foreground-muted text-sm mt-1">第 1 轮 / 共 4 轮</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-hover">
              <Users className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm text-foreground">
                3 / 4 人
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-hover">
              <Clock className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm text-foreground">10:00</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-background-hover transition-colors">
              <Settings className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Participants */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              参与者
            </h2>
            <div className="space-y-3">
              {mockParticipants.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    p.username === '等待加入...'
                      ? 'border border-dashed border-border-subtle'
                      : 'bg-background-hover/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {p.username[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.username}</span>
                      {p.isHost && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">
                          <Crown className="w-3 h-3" />
                          房主
                        </span>
                      )}
                      {p.team && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {p.team}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isReady ? (
                      <span className="flex items-center gap-1 text-success text-sm">
                        <UserCheck className="w-4 h-4" />
                        已准备
                      </span>
                    ) : p.username !== '等待加入...' ? (
                      <span className="flex items-center gap-1 text-foreground-muted text-sm">
                        <UserX className="w-4 h-4" />
                        未准备
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsReady(!isReady)}
              className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
                isReady
                  ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                  : 'bg-primary text-white hover:bg-primary/90 glow-button'
              }`}
            >
              {isReady ? '取消准备' : '准备就绪'}
            </button>
            <button className="flex-1 py-4 rounded-xl bg-background-secondary border border-border-subtle text-foreground font-semibold hover:bg-background-hover transition-colors flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              开始游戏
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="glass-card p-6 flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            房间聊天
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {mockChat.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">{msg.username}</span>
                  <span className="text-xs text-foreground-muted">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-foreground-secondary">{msg.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-background-hover border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary text-sm"
            />
            <button className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
