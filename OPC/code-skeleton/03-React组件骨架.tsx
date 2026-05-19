/**
 * OPC React 组件骨架
 * 可直接复制到前端项目中使用
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPCStore } from '@/stores/opcStore';

// ============ 类型定义 ============

interface Company {
  id: string;
  name: string;
  slug: string;
  stage: 'IDEATE' | 'VALIDATE' | 'BUILD' | 'LAUNCH' | 'SCALE';
  status: string;
  totalRevenue: number;
  totalCost: number;
}

interface AIEmployee {
  id: string;
  codename: string;
  name: string;
  avatarEmoji: string;
  roleType: string;
  level: number;
  status: 'idle' | 'busy' | 'offline';
  tasksCompleted: number;
  avgRating: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string;
  progress: number;
  deadline?: string;
}

// ============ AI员工局主页面 ============

export const AgencyPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { employees, fetchEmployees, hireEmployee, currentCompany } = useOPCStore();
  
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const [showHireModal, setShowHireModal] = useState(false);
  
  useEffect(() => {
    if (companyId) {
      fetchEmployees(companyId);
    }
  }, [companyId, fetchEmployees]);
  
  const handleHire = async (roleType: string, name: string) => {
    if (!companyId) return;
    await hireEmployee(companyId, roleType, name);
    setShowHireModal(false);
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">AI 员工局</h1>
          <p className="text-gray-500 mt-1">
            {currentCompany?.name} · {employees.length} 名员工
          </p>
        </div>
        <button
          onClick={() => setShowHireModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 雇佣新员工
        </button>
      </div>
      
      {/* 员工网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onClick={() => setSelectedEmployee(employee)}
          />
        ))}
      </div>
      
      {/* 员工详情抽屉 */}
      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
      
      {/* 雇佣弹窗 */}
      {showHireModal && (
        <HireEmployeeModal
          onHire={handleHire}
          onClose={() => setShowHireModal(false)}
        />
      )}
    </div>
  );
};

// ============ 员工卡片组件 ============

interface EmployeeCardProps {
  employee: AIEmployee;
  onClick: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onClick }) => {
  const statusColors = {
    idle: 'bg-green-100 text-green-800',
    busy: 'bg-yellow-100 text-yellow-800',
    offline: 'bg-gray-100 text-gray-800',
  };
  
  const levelStars = '⭐'.repeat(employee.level);
  
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{employee.avatarEmoji}</span>
          <div>
            <h3 className="font-semibold text-lg">{employee.codename}</h3>
            <p className="text-gray-500 text-sm">{employee.name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[employee.status]}`}>
          {employee.status === 'idle' ? '待机中' : employee.status === 'busy' ? '工作中' : '离线'}
        </span>
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">等级</span>
          <span>{levelStars}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">完成任务</span>
          <span className="font-medium">{employee.tasksCompleted}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">平均评分</span>
          <span className="font-medium">{employee.avgRating.toFixed(1)}/5.0</span>
        </div>
      </div>
    </div>
  );
};

// ============ 任务看板组件 ============

interface TaskBoardProps {
  companyId: string;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ companyId }) => {
  const { tasks, fetchTasks, createTask } = useOPCStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  useEffect(() => {
    fetchTasks(companyId);
  }, [companyId, fetchTasks]);
  
  const columns = [
    { id: 'pending', title: '待办', color: 'bg-gray-100' },
    { id: 'in_progress', title: '进行中', color: 'bg-blue-50' },
    { id: 'review', title: '验收中', color: 'bg-yellow-50' },
    { id: 'completed', title: '已完成', color: 'bg-green-50' },
  ];
  
  const getTasksByStatus = (status: string) => 
    tasks.filter(t => t.status === status);
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">任务看板</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + 新建任务
        </button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className={`${column.color} rounded-lg p-4`}>
            <h3 className="font-semibold mb-3">
              {column.title} ({getTasksByStatus(column.id).length})
            </h3>
            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ 任务卡片组件 ============

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const priorityColors = {
    urgent: 'border-red-400',
    high: 'border-orange-400',
    normal: 'border-gray-200',
    low: 'border-gray-100',
  };
  
  return (
    <div className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${priorityColors[task.priority as keyof typeof priorityColors]} cursor-pointer hover:shadow-md`}>
      <h4 className="font-medium text-sm mb-2">{task.title}</h4>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{task.progress}%</span>
        {task.deadline && (
          <span>截止: {new Date(task.deadline).toLocaleDateString()}</span>
        )}
      </div>
      {task.progress > 0 && task.progress < 100 && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// ============ Zustand Store 骨架 ============

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OPCState {
  companies: Company[];
  employees: AIEmployee[];
  tasks: Task[];
  currentCompany: Company | null;
  
  // Actions
  fetchEmployees: (companyId: string) => Promise<void>;
  hireEmployee: (companyId: string, roleType: string, name: string) => Promise<void>;
  fetchTasks: (companyId: string) => Promise<void>;
  createTask: (companyId: string, data: Partial<Task>) => Promise<void>;
}

export const useOPCStore = create<OPCState>()(
  persist(
    (set, get) => ({
      companies: [],
      employees: [],
      tasks: [],
      currentCompany: null,
      
      fetchEmployees: async (companyId: string) => {
        const response = await fetch(`/api/v1/opc/companies/${companyId}/employees`);
        const data = await response.json();
        set({ employees: data.data });
      },
      
      hireEmployee: async (companyId: string, roleType: string, name: string) => {
        const response = await fetch(`/api/v1/opc/companies/${companyId}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_type: roleType, name }),
        });
        const data = await response.json();
        set((state) => ({ employees: [...state.employees, data.data] }));
      },
      
      fetchTasks: async (companyId: string) => {
        const response = await fetch(`/api/v1/opc/companies/${companyId}/tasks`);
        const data = await response.json();
        set({ tasks: data.data });
      },
      
      createTask: async (companyId: string, data: Partial<Task>) => {
        const response = await fetch(`/api/v1/opc/companies/${companyId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        set((state) => ({ tasks: [...state.tasks, result.data] }));
      },
    }),
    {
      name: 'opc-store',
      partialize: (state) => ({ currentCompany: state.currentCompany }),
    }
  )
);
