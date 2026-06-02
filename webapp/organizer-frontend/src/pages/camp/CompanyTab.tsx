import { useEffect, useState } from 'react';
import { Building2, Users, Crown, Shuffle, X } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';
import type { CampCompany, CompanyRole } from '../../types/camp';

interface Props {
  groupId: number;
}

const ROLE_LABELS: Record<CompanyRole, string> = {
  ceo: 'CEO',
  product: '产品经理',
  marketing: '营销总监',
  finance: '财务官',
  research: '调研员',
  design: '设计师',
};

const ROLE_ICONS: Record<CompanyRole, string> = {
  ceo: '👑',
  product: '📱',
  marketing: '📢',
  finance: '💰',
  research: '🔍',
  design: '🎨',
};

const SUB_TABS = [
  { id: 'companies', label: '公司列表' },
  { id: 'roles', label: '角色模板' },
] as const;

export default function CompanyTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('companies');

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {activeSubTab === 'companies' && <CompanyList groupId={groupId} />}
      {activeSubTab === 'roles' && <RoleTemplateEditor groupId={groupId} />}
    </div>
  );
}

function CompanyList({ groupId }: Props) {
  const { companies, fetchCompanies } = useCampStore();
  const [editingCompany, setEditingCompany] = useState<CampCompany | null>(null);

  useEffect(() => {
    fetchCompanies(groupId);
  }, [groupId, fetchCompanies]);

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <div key={company.id} className="glass-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold">{company.name}</h4>
                  {company.slogan && <p className="text-sm text-foreground-muted">{company.slogan}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {company.members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background-secondary/50 text-sm">
                    <span>{ROLE_ICONS[m.role] || '👤'}</span>
                    <span className={m.role === 'ceo' ? 'font-medium text-amber-400' : ''}>{m.username}</span>
                    <span className="text-xs text-foreground-muted">{ROLE_LABELS[m.role]}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-foreground-muted">
                <span>🪙 {company.coin_balance}</span>
                <span>🏆 {company.total_score}</span>
                <span>📦 {company.work_count}</span>
              </div>
            </div>
            <button
              onClick={() => setEditingCompany(company)}
              className="px-3 py-1.5 rounded-lg border border-border-subtle text-sm hover:bg-background-hover shrink-0"
            >
              调整角色
            </button>
          </div>
        </div>
      ))}
      {companies.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Users className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-foreground-muted">暂无公司数据</p>
        </div>
      )}

      {editingCompany && (
        <RoleEditModal company={editingCompany} groupId={groupId} onClose={() => setEditingCompany(null)} />
      )}
    </div>
  );
}

function RoleEditModal({ company, groupId, onClose }: { company: CampCompany; groupId: number; onClose: () => void }) {
  const { updateCompanyRoles } = useCampStore();
  const [assignments, setAssignments] = useState<Record<number, CompanyRole>>(() => {
    const map: Record<number, CompanyRole> = {};
    company.members.forEach((m) => { map[m.user_id] = m.role; });
    return map;
  });

  const allRoles = Object.keys(ROLE_LABELS) as CompanyRole[];

  const handleSave = async () => {
    const roles = Object.entries(assignments).map(([userId, role]) => ({
      user_id: Number(userId),
      role,
    }));
    await updateCompanyRoles(groupId, company.id, roles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">调整角色 — {company.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-background-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {company.members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3">
              <span className="text-sm flex-1">{member.username}</span>
              <select
                value={assignments[member.user_id] || ''}
                onChange={(e) => {
                  setAssignments((prev) => ({ ...prev, [member.user_id]: e.target.value as CompanyRole }));
                }}
                className="px-3 py-2 rounded-lg bg-background border border-border-subtle text-sm"
              >
                <option value="">未分配</option>
                {allRoles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">取消</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">保存</button>
        </div>
      </div>
    </div>
  );
}

function RoleTemplateEditor({ groupId }: Props) {
  return (
    <div className="glass-card p-5">
      <h4 className="font-medium mb-4">角色模板配置</h4>
      <div className="space-y-2">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50">
            <div className="flex items-center gap-3">
              <span className="text-lg">{ROLE_ICONS[role as CompanyRole]}</span>
              <span className="text-sm font-medium">{label}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-background border border-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
