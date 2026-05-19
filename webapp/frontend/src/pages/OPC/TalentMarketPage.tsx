import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useopcStore } from '../../stores/opcStore';
import { ArrowLeft, Plus, Briefcase, Search, Filter } from 'lucide-react';

const AVAILABLE_ROLES = [
  {
    codename: 'BA-01',
    name: '商业分析师',
    emoji: '📊',
    role_type: 'strategist',
    desc: '市场调研、竞品分析、商业模式验证',
    skills: ['市场调研', '竞品分析', '数据建模', 'TAM/SAM估算'],
    price: 0,
  },
  {
    codename: 'DEV-01',
    name: '全栈工程师',
    emoji: '💻',
    role_type: 'worker',
    desc: '前后端开发、API设计、数据库架构',
    skills: ['React/Vue', 'Python/Node', '数据库设计', 'DevOps'],
    price: 0,
  },
  {
    codename: 'DES-01',
    name: 'UI/UX设计师',
    emoji: '🎨',
    role_type: 'worker',
    desc: '界面设计、品牌视觉、交互原型',
    skills: ['Figma', '品牌设计', '交互设计', '设计系统'],
    price: 0,
  },
  {
    codename: 'MKT-01',
    name: '增长黑客',
    emoji: '🚀',
    role_type: 'worker',
    desc: '社媒运营、内容营销、用户增长',
    skills: ['社媒运营', 'SEO/SEM', '内容营销', '数据分析'],
    price: 0,
  },
  {
    codename: 'COPY-01',
    name: '文案策划师',
    emoji: '✍️',
    role_type: 'worker',
    desc: '品牌文案、营销内容、产品描述',
    skills: ['品牌文案', '社媒内容', '邮件营销', 'SEO文案'],
    price: 0,
  },
  {
    codename: 'FIN-01',
    name: '财务顾问',
    emoji: '💰',
    role_type: 'advisor',
    desc: '财务建模、成本分析、定价策略',
    skills: ['财务建模', '定价策略', '成本分析', '融资规划'],
    price: 0,
  },
];

export default function TalentMarketPage() {
  const navigate = useNavigate();
  const { company, employees, hireEmployee, fetchEmployees } = useopcStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [hiring, setHiring] = useState<string | null>(null);

  const hiredCodes = new Set(employees.map((e) => e.codename));

  const filtered = AVAILABLE_ROLES.filter((r) => {
    if (filter !== 'all' && r.role_type !== filter) return false;
    if (search && !r.name.includes(search) && !r.codename.includes(search)) return false;
    return !hiredCodes.has(r.codename);
  });

  const handleHire = async (role: typeof AVAILABLE_ROLES[0]) => {
    if (!company) return;
    setHiring(role.codename);
    await hireEmployee(company.id, {
      codename: role.codename,
      name: role.name,
      avatar_emoji: role.emoji,
      role_type: role.role_type,
      level: 1,
      skills: role.skills.map((s) => ({ name: s, level: 2, category: 'core' })),
    });
    await fetchEmployees(company.id);
    setHiring(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/opc')}
          className="p-2 hover:bg-background-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">人才市场</h1>
          <p className="text-sm text-foreground-muted">雇佣 AI 员工，组建你的创业团队</p>
        </div>
      </div>

      {/* 已雇佣团队 */}
      {employees.length > 0 && (
        <div className="bg-background-card rounded-xl border border-border-subtle p-6 mb-6">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">
            当前团队 ({employees.length}人)
          </h2>
          <div className="flex flex-wrap gap-3">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
              >
                <span>{emp.avatar_emoji}</span>
                <span className="text-sm font-medium text-primary">{emp.codename}</span>
                <span className="text-xs text-primary">Lv.{emp.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="搜索角色..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-foreground-muted" />
          {[
            { key: 'all', label: '全部' },
            { key: 'strategist', label: '策略' },
            { key: 'worker', label: '执行' },
            { key: 'advisor', label: '顾问' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-foreground-muted hover:bg-background-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 角色卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((role) => (
          <div
            key={role.codename}
            className="bg-background-card rounded-xl border border-border-subtle p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{role.emoji}</span>
                <div>
                  <h3 className="font-bold text-foreground">{role.codename}</h3>
                  <p className="text-sm text-foreground-muted">{role.name}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-background-secondary text-foreground-muted capitalize">
                {role.role_type}
              </span>
            </div>

            <p className="text-sm text-foreground-muted mb-4">{role.desc}</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {role.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2 py-1 rounded-md bg-background-secondary text-foreground-muted border border-border-subtle"
                >
                  {skill}
                </span>
              ))}
            </div>

            <button
              onClick={() => handleHire(role)}
              disabled={hiring === role.codename || !company}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 bg-primary text-white hover:bg-primary/80"
            >
              {hiring === role.codename ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  雇佣
                </>
              )}
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-foreground-muted">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>没有可雇佣的角色了，团队已满员或筛选条件无匹配</p>
          </div>
        )}
      </div>
    </div>
  );
}
