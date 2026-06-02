import { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Copy, RefreshCw, LayoutDashboard, Gamepad2, Users,
  ClipboardList, Building2, Coins, Trophy,
} from 'lucide-react';
import { useCampStore } from '../stores/campStore';

// Lazy load tab components for performance
const OverviewTab = lazy(() => import('./camp/OverviewTab'));
const TaskCenterTab = lazy(() => import('./camp/TaskCenterTab'));
const CompanyTab = lazy(() => import('./camp/CompanyTab'));
const CoinEconomyTab = lazy(() => import('./camp/CoinEconomyTab'));
const ScoringTab = lazy(() => import('./camp/ScoringTab'));
const EventsTab = lazy(() => import('./camp/EventsTab'));
const MemberManagementTab = lazy(() => import('./camp/MemberManagementTab'));

const TABS = [
  { id: 'overview', label: '概览', icon: LayoutDashboard, component: OverviewTab },
  { id: 'tasks', label: '任务中心', icon: ClipboardList, component: TaskCenterTab },
  { id: 'companies', label: '公司管理', icon: Building2, component: CompanyTab },
  { id: 'coins', label: '营币经济', icon: Coins, component: CoinEconomyTab },
  { id: 'scoring', label: '评分评奖', icon: Trophy, component: ScoringTab },
  { id: 'events', label: '营内商赛', icon: Gamepad2, component: EventsTab },
  { id: 'members', label: '成员管理', icon: Users, component: MemberManagementTab },
] as const;

type TabId = typeof TABS[number]['id'];

function TabFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

export default function CampDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { current, fetchDetail, updateCamp, loading, error } = useCampStore();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!Number.isNaN(groupId)) {
      fetchDetail(groupId);
    }
  }, [groupId, fetchDetail]);

  const copyCode = () => {
    if (current?.invite_code) {
      navigator.clipboard?.writeText(current.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCode = async () => {
    if (!window.confirm('确定重置营团邀请码？旧码将失效。')) return;
    await updateCamp(groupId, { reset_invite_code: true });
    await fetchDetail(groupId);
  };

  const closeCamp = async () => {
    if (!window.confirm('确定结束该体验营招募？学生已入营不受影响，但无法再凭旧码入营。')) return;
    await updateCamp(groupId, { status: 'closed' });
    await fetchDetail(groupId);
  };

  if (loading && !current) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!current) {
    return <p className="text-foreground-muted">{error || '体验营不存在'}</p>;
  }

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? OverviewTab;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 hover:bg-background-hover rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{current.name}</h1>
          {current.description && (
            <p className="text-sm text-foreground-muted mt-1">{current.description}</p>
          )}
          <p className="text-xs text-foreground-muted mt-1">
            状态：{current.status === 'active' ? '招募中' : '已结束'}
            {' · '}{current.member_count} 名学员 · {current.event_count} 场商赛
          </p>
        </div>
        {current.status === 'active' && (
          <button
            type="button"
            onClick={closeCamp}
            className="text-sm px-3 py-2 rounded-lg border border-border-subtle text-foreground-muted hover:bg-background-hover shrink-0"
          >
            结束招募
          </button>
        )}
      </div>

      {/* Invite Code Banner */}
      <div className="glass-card p-5 mb-6">
        <p className="text-sm text-foreground-muted mb-2">营团邀请码（6 位，学生入营用）</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-bold text-primary tracking-widest">
            {current.invite_code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm"
          >
            <Copy className="w-4 h-4" />
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={resetCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-sm text-foreground-muted hover:bg-background-hover"
          >
            <RefreshCw className="w-4 h-4" />
            重置邀请码
          </button>
        </div>
        <p className="text-xs text-foreground-muted mt-3">
          与商赛 4 位房间码不同：学生先凭此码入营，再在商赛活动使用房间码加入对局。
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-subtle mb-6 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border-subtle'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Suspense fallback={<TabFallback />}>
        <ActiveComponent groupId={groupId} />
      </Suspense>
    </div>
  );
}
