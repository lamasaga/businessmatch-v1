import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOHBStore } from '../../stores/ohbStore';
import { ArrowLeft, Building2, Save, Edit3, Check } from 'lucide-react';

const BMC_BLOCKS = [
  { key: 'customer_segments', label: '客户细分', desc: '谁是你的目标客户？', color: 'bg-blue-50 border-blue-200' },
  { key: 'value_propositions', label: '价值主张', desc: '你为客户提供什么价值？', color: 'bg-green-50 border-green-200' },
  { key: 'channels', label: '渠道通路', desc: '如何触达客户？', color: 'bg-amber-50 border-amber-200' },
  { key: 'customer_relationships', label: '客户关系', desc: '如何维护客户关系？', color: 'bg-purple-50 border-purple-200' },
  { key: 'revenue_streams', label: '收入来源', desc: '如何赚钱？', color: 'bg-rose-50 border-rose-200' },
  { key: 'key_resources', label: '核心资源', desc: '你需要什么关键资源？', color: 'bg-cyan-50 border-cyan-200' },
  { key: 'key_activities', label: '关键业务', desc: '你必须做什么？', color: 'bg-indigo-50 border-indigo-200' },
  { key: 'key_partnerships', label: '重要合作', desc: '谁是你的合作伙伴？', color: 'bg-teal-50 border-teal-200' },
  { key: 'cost_structure', label: '成本结构', desc: '你的主要成本是什么？', color: 'bg-orange-50 border-orange-200' },
];

export default function BMCPage() {
  const navigate = useNavigate();
  const { company, fetchCompany } = useOHBStore();
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
          onClick={() => navigate('/ohb')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商业模式画布</h1>
          <p className="text-sm text-gray-400">用9宫格梳理你的商业逻辑</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BMC_BLOCKS.map((block) => (
          <div
            key={block.key}
            className={`${block.color} rounded-xl border p-5 min-h-[160px]`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">{block.label}</h3>
              {editing === block.key ? (
                <button
                  onClick={() => handleSave(block.key)}
                  className="p-1 bg-white rounded-md shadow-sm hover:shadow"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(block.key);
                    setEditValue(bmc[block.key] || '');
                  }}
                  className="p-1 hover:bg-white/50 rounded-md"
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
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
                className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className={`text-sm ${bmc[block.key] ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                {bmc[block.key] || block.desc}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 画布完成度 */}
      <div className="mt-8 bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">画布完成度</span>
          <span className="text-sm font-bold text-blue-600">
            {Object.values(bmc).filter((v) => v && v.trim()).length} / 9
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{
              width: `${(Object.values(bmc).filter((v) => v && v.trim()).length / 9) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
