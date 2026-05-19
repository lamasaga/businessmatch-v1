import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOHBStore } from '../../stores/ohbStore';
import {
  Rocket, Users, ClipboardList, Building2,
  ChevronRight, Sparkles, Target, BarChart3
} from 'lucide-react';

const STAGE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  IDEATE: { label: '创意孵化', color: 'bg-purple-100 text-purple-700', desc: '验证想法，找到市场切入点' },
  VALIDATE: { label: '市场验证', color: 'bg-blue-100 text-blue-700', desc: '测试需求，获取首批用户反馈' },
  BUILD: { label: '产品构建', color: 'bg-amber-100 text-amber-700', desc: '开发MVP，迭代核心功能' },
  LAUNCH: { label: '正式发布', color: 'bg-green-100 text-green-700', desc: '上线产品，获取真实用户' },
  SCALE: { label: '规模扩张', color: 'bg-rose-100 text-rose-700', desc: '增长用户，优化商业模式' },
};

export default function OHBPage() {
  const navigate = useNavigate();
  const { company, employees, tasks, loading, fetchCompany } = useOHBStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    // Demo: 加载id=1的公司
    fetchCompany(1).catch(() => {});
  }, [fetchCompany]);

  const stage = company ? STAGE_INFO[company.stage] : null;

  // const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="w-20 h-20 bg-background-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">一人公司孵化器</h1>
        <p className="text-foreground-muted mb-8">从零开始，组建你的AI员工团队，将想法变成真实的商业成果</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/80 transition-colors"
        >
          + 创建我的第一家公司
        </button>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background-card rounded-2xl p-8 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">创建公司</h2>
              <input
                type="text"
                placeholder="公司名称，如：智创未来"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-border-subtle rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-border-subtle rounded-xl hover:bg-background-hover"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    try {
                      const id = await useOHBStore.getState().createCompany(companyName);
                      await fetchCompany(id);
                      setShowCreateModal(false);
                      setCompanyName('');
                    } catch (err: any) {
                      alert('创建失败: ' + (err.message || '未知错误'));
                    }
                  }}
                  disabled={!companyName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/80 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            {stage && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${stage.color}`}>
                {stage.label}
              </span>
            )}
          </div>
          <p className="text-foreground-muted">{company.description || '暂无描述'}</p>
          {stage && <p className="text-sm text-foreground-muted mt-1">{stage.desc}</p>}
        </div>
        <div className="flex items-center gap-2 bg-background-secondary px-4 py-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">模拟模式</span>
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-card rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-background-secondary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-foreground-muted">AI 员工</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
        </div>
        <div className="bg-background-card rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-background-secondary rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-warning" />
            </div>
            <span className="text-sm text-foreground-muted">进行中任务</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{inProgressTasks}</p>
        </div>
        <div className="bg-background-card rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-background-secondary rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm text-foreground-muted">已完成</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
        </div>
        <div className="bg-background-card rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-background-secondary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-info" />
            </div>
            <span className="text-sm text-foreground-muted">累计营收</span>
          </div>
          <p className="text-2xl font-bold text-foreground">¥{company.total_revenue.toFixed(0)}</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/ohb/talent')}
          className="bg-background-card rounded-xl border border-border-subtle p-6 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-background-secondary rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">人才市场</h3>
          <p className="text-sm text-foreground-muted">雇佣新的 AI 员工，扩展团队能力</p>
        </button>

        <button
          onClick={() => navigate('/ohb/missions')}
          className="bg-background-card rounded-xl border border-border-subtle p-6 text-left hover:border-warning/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-background-secondary rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-warning" />
            </div>
            <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-warning transition-colors" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">任务中心</h3>
          <p className="text-sm text-foreground-muted">查看看板，管理任务进度</p>
        </button>

        <button
          onClick={() => navigate('/ohb/bmc')}
          className="bg-background-card rounded-xl border border-border-subtle p-6 text-left hover:border-info/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-background-secondary rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-info" />
            </div>
            <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-info transition-colors" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">商业模式画布</h3>
          <p className="text-sm text-foreground-muted">编辑和完善你的商业模型</p>
        </button>
      </div>

      {/* 员工状态 */}
      <div className="bg-background-card rounded-xl border border-border-subtle p-6 mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">团队状态</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {employees.map((emp) => {
            const statusColors = {
              idle: 'bg-success/10 text-success border-success/20',
              busy: 'bg-warning/10 text-warning border-warning/20',
              offline: 'bg-background-secondary text-foreground-muted border-border-subtle',
            };
            const statusLabels = { idle: '待机中', busy: '工作中', offline: '离线' };
            return (
              <div
                key={emp.id}
                className="border border-border-subtle rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/ohb/employee/${emp.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{emp.avatar_emoji}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{emp.codename}</p>
                    <p className="text-xs text-foreground-muted">{emp.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[emp.status]}`}>
                    {statusLabels[emp.status]}
                  </span>
                  <span className="text-xs text-foreground-muted">Lv.{emp.level}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近任务 */}
      <div className="bg-background-card rounded-xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">最近任务</h2>
          <button
            onClick={() => navigate('/ohb/missions')}
            className="text-sm text-primary hover:text-blue-700 font-medium"
          >
            查看全部 →
          </button>
        </div>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => {
            const priorityColors: Record<string, string> = {
              urgent: 'border-danger bg-danger/10',
              high: 'border-warning bg-warning/10',
              normal: 'border-border-subtle',
              low: 'border-border-subtle',
            };
            const statusLabels: Record<string, string> = {
              pending: '待办',
              in_progress: '进行中',
              review: '验收中',
              completed: '已完成',
              rejected: '已驳回',
            };
            const assignee = employees.find((e) => e.id === task.assignee_id);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${priorityColors[task.priority] || 'border-border-subtle'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background-secondary text-foreground-muted">
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-muted truncate">{task.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {assignee && (
                    <div className="flex items-center gap-1 text-sm text-foreground-muted">
                      <span>{assignee.avatar_emoji}</span>
                      <span>{assignee.codename}</span>
                    </div>
                  )}
                  {task.progress > 0 && (
                    <div className="w-24">
                      <div className="w-full bg-background-hover rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-foreground-muted text-right mt-0.5">{task.progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-foreground-muted text-center py-8">暂无任务，去任务中心创建一个吧</p>
          )}
        </div>
      </div>
    </div>
  );
}
