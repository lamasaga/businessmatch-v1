import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOHBStore } from '../../stores/ohbStore';
import {
  Rocket, Users, ClipboardList, TrendingUp, Building2,
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

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">一人公司孵化器</h1>
        <p className="text-gray-500 mb-8">从零开始，组建你的AI员工团队，将想法变成真实的商业成果</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          + 创建我的第一家公司
        </button>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">创建公司</h2>
              <input
                type="text"
                placeholder="公司名称，如：智创未来"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    useOHBStore.getState().createCompany(companyName).then((id) => {
                      fetchCompany(id);
                      setShowCreateModal(false);
                    });
                  }}
                  disabled={!companyName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
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
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            {stage && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${stage.color}`}>
                {stage.label}
              </span>
            )}
          </div>
          <p className="text-gray-500">{company.description || '暂无描述'}</p>
          {stage && <p className="text-sm text-gray-400 mt-1">{stage.desc}</p>}
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">模拟模式</span>
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">AI 员工</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">进行中任务</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">已完成</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">累计营收</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">¥{company.total_revenue.toFixed(0)}</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/ohb/talent')}
          className="bg-white rounded-xl border border-gray-100 p-6 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">人才市场</h3>
          <p className="text-sm text-gray-400">雇佣新的 AI 员工，扩展团队能力</p>
        </button>

        <button
          onClick={() => navigate('/ohb/missions')}
          className="bg-white rounded-xl border border-gray-100 p-6 text-left hover:border-amber-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-amber-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">任务中心</h3>
          <p className="text-sm text-gray-400">查看看板，管理任务进度</p>
        </button>

        <button
          onClick={() => navigate('/ohb/bmc')}
          className="bg-white rounded-xl border border-gray-100 p-6 text-left hover:border-purple-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">商业模式画布</h3>
          <p className="text-sm text-gray-400">编辑和完善你的商业模型</p>
        </button>
      </div>

      {/* 员工状态 */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">团队状态</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {employees.map((emp) => {
            const statusColors = {
              idle: 'bg-green-100 text-green-700 border-green-200',
              busy: 'bg-amber-100 text-amber-700 border-amber-200',
              offline: 'bg-gray-100 text-gray-600 border-gray-200',
            };
            const statusLabels = { idle: '待机中', busy: '工作中', offline: '离线' };
            return (
              <div
                key={emp.id}
                className="border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/ohb/employee/${emp.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{emp.avatar_emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{emp.codename}</p>
                    <p className="text-xs text-gray-400">{emp.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[emp.status]}`}>
                    {statusLabels[emp.status]}
                  </span>
                  <span className="text-xs text-gray-400">Lv.{emp.level}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近任务 */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">最近任务</h2>
          <button
            onClick={() => navigate('/ohb/missions')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部 →
          </button>
        </div>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => {
            const priorityColors: Record<string, string> = {
              urgent: 'border-red-400 bg-red-50',
              high: 'border-orange-400 bg-orange-50',
              normal: 'border-gray-200',
              low: 'border-gray-100',
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
                className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${priorityColors[task.priority] || 'border-gray-200'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{task.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {assignee && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <span>{assignee.avatar_emoji}</span>
                      <span>{assignee.codename}</span>
                    </div>
                  )}
                  {task.progress > 0 && (
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 text-right mt-0.5">{task.progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-gray-400 text-center py-8">暂无任务，去任务中心创建一个吧</p>
          )}
        </div>
      </div>
    </div>
  );
}
