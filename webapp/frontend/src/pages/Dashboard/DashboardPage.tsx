import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  User,
  Trophy,
  BookOpen,
  Gamepad2,
  Star,
  TrendingUp,
  Clock,
  Award,
  Zap,
  ArrowRight,
} from 'lucide-react';

const mockStats = {
  gamesPlayed: 12,
  gamesWon: 3,
  coursesCompleted: 5,
  totalStudyTime: 48,
  experience: 1250,
  nextLevelExp: 2000,
  level: 5,
};

const mockBadges = [
  { id: '1', name: '初出茅庐', icon: 'Star', description: '完成第一场商赛', earnedAt: '2026-04-01' },
  { id: '2', name: '策略大师', icon: 'Trophy', description: '赢得 3 场商赛', earnedAt: '2026-04-15' },
  { id: '3', name: '勤奋学子', icon: 'BookOpen', description: '完成 5 门课程', earnedAt: '2026-05-01' },
];

const mockRecentGames = [
  { id: '1', name: '回合制策略商赛 #42', type: '回合制', result: '第 2 名', date: '2026-05-10' },
  { id: '2', name: '实时经营挑战 #18', type: '实时', result: '存活', date: '2026-05-08' },
  { id: '3', name: '创业生存战 #7', type: '生存', result: '出局', date: '2026-05-05' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

  useEffect(() => {
    document.title = '个人中心 - 商识唯智';
  }, []);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-background-secondary flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-foreground-muted" />
          </div>
          <p className="text-foreground-muted mb-4">请先登录</p>
          <Link to="/login" className="px-6 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Profile Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <User className="w-10 h-10 text-background" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{user.username}</h1>
            <p className="text-foreground-muted text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
                {user.role === 'student' ? '学生' : user.role === 'teacher' ? '教师' : '管理员'}
              </span>
              <span className="px-3 py-1 rounded-full bg-background-secondary text-foreground-muted text-xs font-semibold">
                Lv.{mockStats.level}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground-muted">经验值</span>
            <span className="text-foreground font-medium">
              {mockStats.experience} / {mockStats.nextLevelExp} XP
            </span>
          </div>
          <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all"
              style={{ width: `${(mockStats.experience / mockStats.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Gamepad2, label: '参与对局', value: mockStats.gamesPlayed },
          { icon: Trophy, label: '获胜次数', value: mockStats.gamesWon },
          { icon: BookOpen, label: '完成课程', value: mockStats.coursesCompleted },
          { icon: Clock, label: '学习时长', value: `${mockStats.totalStudyTime}h` },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card p-5 text-center card-hover">
              <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-foreground-muted mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-warning" />
              获得徽章
            </h2>
            <Link to="/achievements" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-background-secondary/50"
              >
                <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground text-sm">{badge.name}</h3>
                  <p className="text-xs text-foreground-muted">{badge.description}</p>
                </div>
                <span className="text-[10px] text-foreground-muted">{badge.earnedAt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Games */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              最近对局
            </h2>
            <Link to="/games" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockRecentGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 rounded-xl bg-background-secondary/50"
              >
                <div>
                  <h3 className="font-medium text-foreground text-sm">{game.name}</h3>
                  <p className="text-xs text-foreground-muted">
                    {game.type} · {game.date}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    game.result.includes('名') && !game.result.includes('出局')
                      ? 'bg-success/10 text-success'
                      : game.result === '出局'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {game.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 flex items-center justify-center ring-1 ring-accent-teal/10">
            <Zap className="w-6 h-6 text-accent-teal" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">继续学习</p>
            <p className="text-xs text-foreground-muted mt-0.5">你还有 2 个课程单元和 1 项日常活动待完成</p>
          </div>
          <Link to="/career" className="px-5 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors">
            去生涯中枢
          </Link>
        </div>
      </div>
    </div>
  );
}
