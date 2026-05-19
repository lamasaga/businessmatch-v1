import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOPCStore } from '../../stores/opcStore';
import { ArrowLeft, Edit3, Check } from 'lucide-react';

const BMC_BLOCKS = [
  { key: 'customer_segments', label: '客户细分', desc: '谁是你的目标客户？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'value_propositions', label: '价值主张', desc: '你为客户提供什么价值？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'channels', label: '渠道通路', desc: '如何触达客户？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'customer_relationships', label: '客户关系', desc: '如何维护客户关系？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'revenue_streams', label: '收入来源', desc: '如何赚钱？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'key_resources', label: '核心资源', desc: '你需要什么关键资源？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'key_activities', label: '关键业务', desc: '你必须做什么？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'key_partnerships', label: '重要合作', desc: '谁是你的合作伙伴？', color: 'bg-background-secondary border-border-subtle' },
  { key: 'cost_structure', label: '成本结构', desc: '你的主要成本是什么？', color: 'bg-background-secondary border-border-subtle' },
];

export default function BMCPage() {
  const navigate = useNavigate();
  const { company, fetchCompany } = useOPCStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bmc, setBmc] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCompany(1).catch(() => {});
  }, [fetchCompany]);

  useEffect(() => {
    if (company?.business_model_canvas) {
      setBmc(company.business_model_canvas as Record<string, string>);
    }
  }, [company]);

  const handleSave = (key: string) => {
    const updated = { ...bmc, [key]: editValue };
    setBmc(updated);
    setEditing(null);
    // Demo: 本地保存，实际应调用API
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/opc')}
          className="p-2 hover:bg-background-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">商业模式画布</h1>
          <p className="text-sm text-foreground-muted">用9宫格梳理你的商业逻辑</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BMC_BLOCKS.map((block) => (
          <div
            key={block.key}
            className={`${block.color} rounded-xl border p-5 min-h-[160px]`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">{block.label}</h3>
              {editing === block.key ? (
                <button
                  onClick={() => handleSave(block.key)}
                  className="p-1 bg-background-card rounded-md shadow-sm hover:shadow"
                >
                  <Check className="w-4 h-4 text-success" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(block.key);
                    setEditValue(bmc[block.key] || '');
                  }}
                  className="p-1 hover:bg-background-hover rounded-md"
                >
                  <Edit3 className="w-4 h-4 text-foreground-muted" />
                </button>
              )}
            </div>

            {editing === block.key ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={block.desc}
                rows={4}
                autoFocus
                className="w-full px-3 py-2 bg-background-card rounded-lg border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className={`text-sm ${bmc[block.key] ? 'text-foreground-secondary' : 'text-foreground-muted italic'}`}>
                {bmc[block.key] || block.desc}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 画布完成度 */}
      <div className="mt-8 bg-background-card rounded-xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground-muted">画布完成度</span>
          <span className="text-sm font-bold text-primary">
            {Object.values(bmc).filter((v) => v && v.trim()).length} / 9
          </span>
        </div>
        <div className="w-full bg-background-secondary rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all"
            style={{
              width: `${(Object.values(bmc).filter((v) => v && v.trim()).length / 9) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
