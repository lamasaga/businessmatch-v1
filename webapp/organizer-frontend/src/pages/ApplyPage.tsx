import { useState, type FormEvent } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useOrganizerStore } from '../stores/organizerStore';

export default function ApplyPage() {
  const { applyOrganizer, loading, error } = useOrganizerStore();
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await applyOrganizer(orgName, phone || undefined);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">申请组织者</h1>
            <p className="text-sm text-foreground-muted">首次使用需创建组织者档案</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">机构 / 班级名称</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
              placeholder="例如：XX 中学商赛社"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">联系电话（选填）</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || !orgName}
            className="w-full py-3 bg-primary text-background rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '提交申请'}
          </button>
        </form>
      </div>
    </div>
  );
}
