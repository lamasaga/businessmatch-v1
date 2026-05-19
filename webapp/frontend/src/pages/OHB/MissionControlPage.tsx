import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOHBStore } from '../../stores/ohbStore';
import {
  ArrowLeft, Plus, Play, CheckCircle,
  Clock, Flag
} from 'lucide-react';

const COLUMNS = [
  { id: 'pending', title: '待办', color: 'bg-background-secondary', border: 'border-border-subtle', icon: Clock },
  { id: 'in_progress', title: '进行中', color: 'bg-background-secondary', border: 'border-border-subtle', icon: Play },
  { id: 'review', title: '验收中', color: 'bg-background-secondary', border: 'border-border-subtle', icon: Flag },
  { id: 'completed', title: '已完成', color: 'bg-background-secondary', border: 'border-border-subtle', icon: CheckCircle },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-danger bg-danger/10',
  high: 'text-warning bg-warning/10',
  normal: 'text-foreground-muted bg-background-secondary',
  low: 'text-primary bg-background-secondary',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
};

export default function MissionControlPage() {
  const navigate = useNavigate();
  const { company, employees, tasks, createTask, updateTask, fetchTasks } = useOHBStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'normal',
    task_type: 'custom',
  });

  const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  const handleCreateTask = async () => {
    if (!company || !newTask.title || !newTask.assignee_id) return;
    await createTask(company.id, {
      title: newTask.title,
      description: newTask.description,
      assignee_id: Number(newTask.assignee_id),
      priority: newTask.priority,
      task_type: newTask.task_type,
    });
    await fetchTasks(company.id);
    setShowCreate(false);
    setNewTask({ title: '', description: '', assignee_id: '', priority: 'normal', task_type: 'custom' });
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ohb')}
            className="p-2 hover:bg-background-hover rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">任务控制中心</h1>
            <p className="text-sm text-foreground-muted">管理 AI 员工的任务分配与进度跟踪</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      {/* 看板 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.id);
          const Icon = col.icon;
          return (
            <div key={col.id} className={`${col.color} rounded-xl p-4 min-h-[400px]`}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-foreground-muted" />
                <h3 className="font-semibold text-foreground-secondary">{col.title}</h3>
                <span className="text-xs bg-background-card px-2 py-0.5 rounded-full text-foreground-muted">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {colTasks.map((task) => {
                  const assignee = employees.find((e) => e.id === task.assignee_id);
                  return (
                    <div
                      key={task.id}
                      className="bg-background-card rounded-lg p-4 shadow-sm border border-border-subtle hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <div className="flex gap-1">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(task.id, 'in_progress')}
                              className="p-1 hover:bg-background-secondary rounded"
                              title="开始执行"
                            >
                              <Play className="w-3.5 h-3.5 text-primary" />
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusChange(task.id, 'completed')}
                              className="p-1 hover:bg-background-secondary rounded"
                              title="标记完成"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-success" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-medium text-foreground text-sm mb-1">{task.title}</h4>
                      <p className="text-xs text-foreground-muted mb-3 line-clamp-2">{task.description}</p>

                      <div className="flex items-center justify-between">
                        {assignee && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{assignee.avatar_emoji}</span>
                            <span className="text-xs text-foreground-muted">{assignee.codename}</span>
                          </div>
                        )}
                        {task.progress > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-background-hover rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-foreground-muted">{task.progress}%</span>
                          </div>
                        )}
                      </div>

                      {task.student_rating && (
                        <div className="mt-2 pt-2 border-t border-border-subtle flex items-center gap-1">
                          <span className="text-xs text-foreground-muted">评分:</span>
                          <span className="text-xs text-amber-500">
                            {'⭐'.repeat(task.student_rating)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-foreground-muted text-sm">
                    暂无任务
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 新建任务弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-2xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-bold text-foreground mb-4">新建任务</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">任务标题</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="例如：竞品分析报告"
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">任务描述</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="描述任务的具体要求和期望交付物..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">指派给</label>
                  <select
                    value={newTask.assignee_id}
                    onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">选择员工</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.avatar_emoji} {emp.codename} - {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">优先级</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">低</option>
                    <option value="normal">普通</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 border border-border-subtle rounded-lg hover:bg-background-secondary"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title || !newTask.assignee_id}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 disabled:opacity-50"
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
