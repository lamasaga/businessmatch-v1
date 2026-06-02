import { useEffect, useState } from 'react';
import { Coins, Trophy, ShoppingBag, Settings, Activity, X } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

interface Props {
  groupId: number;
}

const SUB_TABS = [
  { id: 'grant', label: '发放与扣除', icon: Coins },
  { id: 'transactions', label: '交易记录', icon: Activity },
  { id: 'rules', label: '规则配置', icon: Settings },
  { id: 'shop', label: '营团商城', icon: ShoppingBag },
  { id: 'leaderboard', label: '排行榜', icon: Trophy },
] as const;

export default function CoinEconomyTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('grant');

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      {activeSubTab === 'grant' && <CoinGrantPanel groupId={groupId} />}
      {activeSubTab === 'transactions' && <TransactionList groupId={groupId} />}
      {activeSubTab === 'rules' && <CoinRuleEditor groupId={groupId} />}
      {activeSubTab === 'shop' && <ShopEditor groupId={groupId} />}
      {activeSubTab === 'leaderboard' && <CoinLeaderboard groupId={groupId} />}
    </div>
  );
}

function CoinGrantPanel({ groupId }: Props) {
  const { grantCoins, deductCoins } = useCampStore();
  const [mode, setMode] = useState<'grant' | 'deduct'>('grant');
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim() || amount <= 0) return;
    try {
      if (mode === 'grant') {
        await grantCoins(groupId, [{ entity_type: 'user', entity_id: 1 }], amount, reason);
      } else {
        await deductCoins(groupId, [{ entity_type: 'user', entity_id: 1 }], amount, reason);
      }
      setMessage(`${mode === 'grant' ? '发放' : '扣除'}成功`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      setMessage((err as { message?: string }).message || '操作失败');
    }
  };

  const templates = [
    { label: '入营奖励', amount: 100 },
    { label: '任务完成', amount: 50 },
    { label: '竞赛获胜', amount: 200 },
    { label: '主动发言', amount: 5 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('grant')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === 'grant' ? 'bg-primary text-background' : 'border border-border-subtle'
          }`}
        >
          发放营币
        </button>
        <button
          onClick={() => setMode('deduct')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === 'deduct' ? 'bg-danger text-background' : 'border border-border-subtle'
          }`}
        >
          扣除营币
        </button>
      </div>

      {mode === 'grant' && (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.label}
              onClick={() => { setAmount(t.amount); setReason(t.label); }}
              className="px-2.5 py-1 rounded-lg bg-background border border-border-subtle text-xs hover:bg-background-hover"
            >
              {t.label} +{t.amount}
            </button>
          ))}
        </div>
      )}

      <div className="glass-card p-5 space-y-4">
        <div>
          <label className="text-sm text-foreground-muted block mb-1">金额</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              className="w-32 px-4 py-2 rounded-xl bg-background border border-border-subtle"
            />
            <span>🪙</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-foreground-muted block mb-1">理由</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：任务完成奖励"
            className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle"
          />
        </div>
        {message && <p className="text-sm text-primary">{message}</p>}
        <button
          onClick={handleSubmit}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === 'deduct' ? 'bg-danger text-background' : 'bg-primary text-background'
          }`}
        >
          确认{mode === 'grant' ? '发放' : '扣除'}
        </button>
      </div>
    </div>
  );
}

function TransactionList({ groupId }: Props) {
  const { coinTransactions, fetchCoinTransactions } = useCampStore();

  useEffect(() => {
    fetchCoinTransactions(groupId);
  }, [groupId, fetchCoinTransactions]);

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-foreground-muted text-left">
            <th className="px-4 py-3 font-medium">时间</th>
            <th className="px-4 py-3 font-medium">对象</th>
            <th className="px-4 py-3 font-medium">金额</th>
            <th className="px-4 py-3 font-medium">理由</th>
          </tr>
        </thead>
        <tbody>
          {coinTransactions.map((tx) => (
            <tr key={tx.id} className="border-b border-border-subtle/50">
              <td className="px-4 py-3 text-foreground-muted">{new Date(tx.created_at).toLocaleString('zh-CN')}</td>
              <td className="px-4 py-3">{tx.entity_type === 'group' ? '公司' : '个人'} #{tx.entity_id}</td>
              <td className={`px-4 py-3 font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-danger'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </td>
              <td className="px-4 py-3 text-foreground-muted">{tx.description || '-'}</td>
            </tr>
          ))}
          {coinTransactions.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-foreground-muted">暂无交易记录</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CoinRuleEditor({ groupId }: Props) {
  const { coinRules, fetchCoinRules, updateCoinRule } = useCampStore();

  useEffect(() => {
    fetchCoinRules(groupId);
  }, [groupId, fetchCoinRules]);

  return (
    <div className="glass-card p-5 space-y-3">
      {coinRules.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50">
          <div>
            <p className="text-sm font-medium">{rule.name}</p>
            <p className="text-xs text-foreground-muted">{rule.trigger_type} · {rule.amount} 🪙</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule.is_active}
              onChange={async (e) => {
                await updateCoinRule(groupId, rule.id, { is_active: e.target.checked });
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-background border border-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>
      ))}
      {coinRules.length === 0 && (
        <p className="text-sm text-foreground-muted text-center py-4">暂无规则</p>
      )}
    </div>
  );
}

function ShopEditor({ groupId }: Props) {
  const { shopItems, fetchShopItems } = useCampStore();

  useEffect(() => {
    fetchShopItems(groupId);
  }, [groupId, fetchShopItems]);

  return (
    <div className="space-y-3">
      {shopItems.map((item) => (
        <div key={item.id} className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-foreground-muted">{item.description || '无描述'}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{item.price} 🪙</p>
            <p className="text-xs text-foreground-muted">库存: {item.stock === -1 ? '∞' : item.stock}</p>
          </div>
        </div>
      ))}
      {shopItems.length === 0 && (
        <div className="glass-card p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-foreground-muted">暂无商品</p>
        </div>
      )}
    </div>
  );
}

function CoinLeaderboard({ groupId }: Props) {
  const { coinLeaderboard, fetchCoinLeaderboard } = useCampStore();
  const [type, setType] = useState('company');

  useEffect(() => {
    fetchCoinLeaderboard(groupId, type);
  }, [groupId, type, fetchCoinLeaderboard]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setType('company')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            type === 'company' ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle'
          }`}
        >
          按公司
        </button>
        <button
          onClick={() => setType('user')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            type === 'user' ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle'
          }`}
        >
          按个人
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-foreground-muted text-left">
              <th className="px-4 py-3 font-medium">排名</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">营币</th>
            </tr>
          </thead>
          <tbody>
            {coinLeaderboard.map((entry) => (
              <tr key={`${entry.entity_type}-${entry.entity_id}`} className="border-b border-border-subtle/50">
                <td className="px-4 py-3">
                  {entry.rank <= 3 ? (
                    <span className="text-lg">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                  ) : (
                    entry.rank
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{entry.entity_name}</td>
                <td className="px-4 py-3 text-primary font-bold">{entry.balance}</td>
              </tr>
            ))}
            {coinLeaderboard.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-foreground-muted">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
