import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useopcStore } from '../../stores/opcStore';
import { ArrowLeft, Briefcase, Award } from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employees, tasks, fetchCompany } = useopcStore();

  useEffect(() => {
    fetchCompany(1).catch(() => {});
  }, [fetchCompany]);

  const employee = employees.find((e) => e.id === Number(id));
  const employeeTasks = tasks.filter((t) => t.assignee_id === Number(id));

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-foreground-muted">员工不存在</p>
        <button onClick={() => navigate('/opc')} className="text-primary mt-4">
          返回仪表盘
        </button>
      </div>
    );
  }

  const statusColors = {
    idle: 'bg-success/10 text-success',
    busy: 'bg-warning/10 text-warning',
    offline: 'bg-background-secondary text-foreground-muted',
  };
  const statusLabels = { idle: '待机中', busy: '工作中', offline: '离线' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/opc')}
        className="flex items-center gap-2 text-foreground-muted hover:text-foreground-secondary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="bg-background-card rounded-2xl border border-border-subtle p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-background-secondary rounded-2xl flex items-center justify-center text-5xl">
            {employee.avatar_emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              <span className="text-sm text-foreground-muted">{employee.codename}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[employee.status]}`}>
                {statusLabels[employee.status]}
              </span>
            </div>
            <p className="text-foreground-muted capitalize mb-4">{employee.role_type}</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">Lv.{employee.level}</p>
                <p className="text-xs text-foreground-muted mt-1">等级</p>
              </div>
              <div className="bg-background-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{employee.tasks_completed}</p>
                <p className="text-xs text-foreground-muted mt-1">完成任务</p>
              </div>
              <div className="bg-background-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {employee.satisfaction_score > 0 ? employee.satisfaction_score.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-foreground-muted mt-1">平均评分</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 技能 */}
      <div className="bg-background-card rounded-2xl border border-border-subtle p-6 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          技能矩阵
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {employee.skills.map((skill: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between bg-background-secondary rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-foreground-secondary">{skill.name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < skill.level ? 'bg-primary' : 'bg-background-hover'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 任务历史 */}
      <div className="bg-background-card rounded-2xl border border-border-subtle p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          任务历史 ({employeeTasks.length})
        </h2>
        <div className="space-y-3">
          {employeeTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border-subtle hover:shadow-sm transition-shadow"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="text-sm text-foreground-muted">{task.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  task.status === 'completed' ? 'bg-success/10 text-success' :
                  task.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                  'bg-background-secondary text-foreground-muted'
                }`}>
                  {task.status === 'completed' ? '已完成' :
                   task.status === 'in_progress' ? '进行中' :
                   task.status === 'pending' ? '待办' : task.status}
                </span>
                {task.student_rating && (
                  <span className="text-warning text-sm">{'⭐'.repeat(task.student_rating)}</span>
                )}
              </div>
            </div>
          ))}
          {employeeTasks.length === 0 && (
            <p className="text-foreground-muted text-center py-8">暂无任务记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
