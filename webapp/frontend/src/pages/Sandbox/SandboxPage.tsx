import { useEffect, useState, useCallback } from 'react';
import {
  Play, Pause, StepForward, RotateCcw, Save, Upload,
  ChevronDown, ChevronRight, Terminal, BarChart3, Bug,
  FileCode, Boxes, BrainCircuit, Newspaper, Trophy
} from 'lucide-react';
import { useSandboxStore } from '../../stores/sandboxStore';
import type { DebugLog, SandboxStanding } from '../../types/sandbox';

export default function SandboxPage() {
  const store = useSandboxStore();
  const [yamlEditorContent, setYamlEditorContent] = useState('');
  const [publishConfigId, setPublishConfigId] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [expandedDebugTypes, setExpandedDebugTypes] = useState<Set<string>>(new Set());
  const [rightPanelTab, setRightPanelTab] = useState<'market' | 'ai' | 'events' | 'logs'>('market');

  // 初始化：加载模板列表
  useEffect(() => {
    store.fetchTemplates();
    store.fetchSessions();
  }, []);

  // 同步 store 中的 configYaml 到编辑器
  useEffect(() => {
    if (store.configYaml) {
      setYamlEditorContent(store.configYaml);
    }
  }, [store.configYaml]);

  const handleCreateFromTemplate = useCallback(async (templateId: string) => {
    await store.createSession(templateId);
    store.setActiveTab('editor');
  }, [store]);

  const handleUpdateConfig = useCallback(() => {
    store.updateConfig(yamlEditorContent);
  }, [store, yamlEditorContent]);

  const handleStep = useCallback(async () => {
    await store.stepRun();
    await store.fetchDebugData();
  }, [store]);

  const handleReset = useCallback(async () => {
    await store.resetRun();
    setExpandedDebugTypes(new Set());
  }, [store]);

  const handlePublish = useCallback(async () => {
    if (!publishConfigId.trim()) return;
    try {
      await store.publishConfig(publishConfigId.trim(), '1.0.0');
      setShowPublishDialog(false);
      setPublishConfigId('');
      alert('发布成功！配置已保存到 content/game-configs/');
    } catch {
      // error handled by store
    }
  }, [store, publishConfigId]);

  const toggleDebugType = (type: string) => {
    setExpandedDebugTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const { currentSession, worldState, templates, debugLogs, lastStepResult, loading, error } = store;

  // 价格表格数据
  const priceTable = worldState?.prices || {};
  const cities = worldState?.cities_order || [];
  const products = worldState?.products || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 顶部导航栏 */}
      <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-accent-teal" />
          <h1 className="text-lg font-semibold">赛事工坊</h1>
          <span className="text-xs text-foreground-muted bg-accent-teal/10 px-2 py-0.5 rounded">
            Sandbox
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentSession && (
            <>
              <span className="text-sm text-foreground-muted">
                会话: <span className="font-mono text-foreground">{currentSession.session_id}</span>
              </span>
              <span className="text-sm text-foreground-muted">
                引擎: <span className="text-foreground">{currentSession.engine}</span>
              </span>
              <StatusBadge state={currentSession.run_state} />
            </>
          )}
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
          <button onClick={store.clearError} className="ml-2 underline">关闭</button>
        </div>
      )}

      <div className="mx-6 mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-foreground-secondary">
        <p className="font-medium text-foreground mb-1">非 Phase A 交付范围</p>
        <p className="text-xs sm:text-sm">
          赛事工坊已移出 Phase A 验收。本页为内部 MVP 骨架，日常改赛制请直接编辑{' '}
          <code className="font-mono">content/game-configs/*.yaml</code>。完整热试跑能力规划见 B4+ backlog（inspire/89-）。
        </p>
      </div>

      {/* 三栏主布局 */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* ========== 左栏：配置编辑器 ========== */}
        <div className="w-[380px] border-r border-border flex flex-col bg-surface">
          {/* 模板选择 */}
          <div className="p-4 border-b border-border">
            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2 block">
              选择模板
            </label>
            <select
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-teal"
              onChange={(e) => {
                if (e.target.value) handleCreateFromTemplate(e.target.value);
              }}
              value={currentSession?.config_id || ''}
            >
              <option value="">-- 选择赛事模板 --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.engine})
                </option>
              ))}
            </select>
          </div>

          {/* YAML 编辑器 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-foreground-muted flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5" />
                YAML 配置
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleUpdateConfig}
                  disabled={!currentSession || loading}
                  className="text-xs px-2 py-1 bg-accent-teal/10 text-accent-teal rounded hover:bg-accent-teal/20 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  应用
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full bg-[#1a1a2e] text-foreground p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none"
              value={yamlEditorContent}
              onChange={(e) => setYamlEditorContent(e.target.value)}
              placeholder={currentSession ? '在此编辑 YAML 配置...' : '请先选择模板创建会话'}
              spellCheck={false}
              disabled={!currentSession}
            />
          </div>

          {/* 底部操作 */}
          <div className="p-4 border-t border-border space-y-2">
            <button
              onClick={() => setShowPublishDialog(true)}
              disabled={!currentSession || loading}
              className="w-full text-sm px-3 py-2 bg-accent-teal text-white rounded-lg hover:bg-accent-teal/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              发布为正式配置
            </button>
          </div>
        </div>

        {/* ========== 中栏：预览与运行控制 ========== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 运行控制条 */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-surface">
            <div className="flex items-center gap-1">
              {currentSession?.run_state === 'running' ? (
                <button
                  onClick={() => store.pauseRun()}
                  disabled={loading}
                  className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                  title="暂停"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => store.startRun()}
                  disabled={!currentSession || currentSession.run_state === 'finished' || loading}
                  className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                  title="开始"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleStep}
                disabled={!currentSession || currentSession.run_state === 'finished' || loading}
                className="p-2 rounded-lg bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors"
                title="单步"
              >
                <StepForward className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                disabled={!currentSession || loading}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="重置"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-border" />

            {currentSession && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-foreground-muted">
                  步数: <span className="text-foreground font-mono">{currentSession.current_step}</span>
                  /{currentSession.total_steps}
                </span>
                <span className="text-foreground-muted">
                  阶段: <span className="text-foreground">{worldState?.phase || '-'}</span>
                </span>
                {worldState?.player && (
                  <span className="text-foreground-muted">
                    资产: <span className="text-foreground font-mono">¥{worldState.player.total_assets?.toLocaleString()}</span>
                  </span>
                )}
              </div>
            )}

            {loading && (
              <span className="text-xs text-foreground-muted animate-pulse ml-auto">处理中...</span>
            )}
          </div>

          {/* 世界状态预览 */}
          <div className="flex-1 overflow-auto p-4">
            {!currentSession ? (
              <EmptyState message="请从左侧面板选择一个赛事模板开始" />
            ) : !worldState || worldState.history_length === 0 ? (
              <EmptyState message="点击「开始」或「单步」运行赛事" />
            ) : (
              <div className="space-y-4">
                {/* 价格表格 */}
                <SectionCard title="市场价格" icon={<BarChart3 className="w-4 h-4" />}>
                  {cities.length > 0 && products.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-foreground-muted font-medium">城市</th>
                            {products.map(pid => (
                              <th key={pid} className="text-right py-2 px-2 text-foreground-muted font-medium">
                                {pid}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cities.map(city => (
                            <tr key={city} className="border-b border-border/50 hover:bg-surface/50">
                              <td className="py-2 px-2 font-medium">{city}</td>
                              {products.map(pid => (
                                <td key={pid} className="text-right py-2 px-2 font-mono">
                                  {priceTable[city]?.[pid] ?? '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-muted">暂无价格数据</p>
                  )}
                </SectionCard>

                {/* 排名 */}
                {worldState?.standings && worldState.standings.length > 0 && (
                  <SectionCard title="排名" icon={<Trophy className="w-4 h-4" />}>
                    <StandingsTable standings={worldState.standings} />
                  </SectionCard>
                )}

                {/* 最近事件 */}
                {lastStepResult?.events && lastStepResult.events.length > 0 && (
                  <SectionCard title="本步事件" icon={<Newspaper className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {lastStepResult.events.map((evt: any, i: number) => (
                        <div key={i} className="p-2 bg-yellow-500/5 border border-yellow-500/20 rounded text-xs">
                          <span className="font-medium text-yellow-400">{evt.name}</span>
                          <span className="text-foreground-muted ml-2">{evt.description}</span>
                          {evt.city && <span className="text-foreground-muted ml-2">@{evt.city}</span>}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== 右栏：调试面板 ========== */}
        <div className="w-[360px] border-l border-border flex flex-col bg-surface">
          {/* 调试标签 */}
          <div className="flex border-b border-border">
            {[
              { key: 'market' as const, label: '市场', icon: <Boxes className="w-3.5 h-3.5" /> },
              { key: 'ai' as const, label: 'AI', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
              { key: 'events' as const, label: '事件', icon: <Newspaper className="w-3.5 h-3.5" /> },
              { key: 'logs' as const, label: '日志', icon: <Bug className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setRightPanelTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                  rightPanelTab === tab.key
                    ? 'text-accent-teal border-b-2 border-accent-teal bg-accent-teal/5'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 调试内容 */}
          <div className="flex-1 overflow-auto p-3">
            {!currentSession ? (
              <EmptyState message="创建会话后查看调试数据" small />
            ) : debugLogs.length === 0 ? (
              <EmptyState message="运行至少一步后查看调试数据" small />
            ) : (
              <>
                {rightPanelTab === 'market' && <MarketDebug logs={debugLogs} />}
                {rightPanelTab === 'ai' && <AiDebug logs={debugLogs} />}
                {rightPanelTab === 'events' && <EventsDebug logs={debugLogs} />}
                {rightPanelTab === 'logs' && <LogsDebug logs={debugLogs} expandedTypes={expandedDebugTypes} onToggle={toggleDebugType} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 发布对话框 */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">发布赛事配置</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-foreground-muted block mb-1">配置 ID</label>
                <input
                  type="text"
                  value={publishConfigId}
                  onChange={(e) => setPublishConfigId(e.target.value)}
                  placeholder="如 mygame-v1"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-teal"
                />
                <p className="text-xs text-foreground-muted mt-1">将保存为 content/game-configs/{'{config_id}'}.yaml</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowPublishDialog(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-surface transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={!publishConfigId.trim() || loading}
                className="flex-1 px-3 py-2 rounded-lg bg-accent-teal text-white text-sm hover:bg-accent-teal/90 disabled:opacity-40 transition-colors"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 子组件 ==========

function StatusBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-gray-500/10 text-gray-400',
    running: 'bg-green-500/10 text-green-400',
    paused: 'bg-yellow-500/10 text-yellow-400',
    finished: 'bg-blue-500/10 text-blue-400',
  };
  const labels: Record<string, string> = {
    idle: '待机',
    running: '运行中',
    paused: '已暂停',
    finished: '已结束',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[state] || colors.idle}`}>
      {labels[state] || state}
    </span>
  );
}

function EmptyState({ message, small }: { message: string; small?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-foreground-muted ${small ? 'py-8' : 'py-20'}`}>
      <Boxes className={`${small ? 'w-8 h-8' : 'w-12 h-12'} mb-3 opacity-30`} />
      <p className={`${small ? 'text-xs' : 'text-sm'}`}>{message}</p>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StandingsTable({ standings }: { standings: SandboxStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 px-2 text-foreground-muted">排名</th>
            <th className="text-left py-1.5 px-2 text-foreground-muted">名称</th>
            <th className="text-right py-1.5 px-2 text-foreground-muted">现金</th>
            <th className="text-right py-1.5 px-2 text-foreground-muted">总资产</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(s => (
            <tr key={s.name} className={`border-b border-border/50 ${s.is_ai ? 'opacity-70' : ''}`}>
              <td className="py-1.5 px-2 font-mono">{s.rank}</td>
              <td className="py-1.5 px-2">
                {s.name}
                {s.is_ai && <span className="ml-1 text-[10px] text-foreground-muted">(AI)</span>}
              </td>
              <td className="text-right py-1.5 px-2 font-mono">¥{s.cash.toLocaleString()}</td>
              <td className="text-right py-1.5 px-2 font-mono font-medium">¥{s.total_assets.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========== 调试面板子组件 ==========

function MarketDebug({ logs }: { logs: DebugLog[] }) {
  const priceLogs = logs.filter(l => l.step_type === 'price_calc');
  if (priceLogs.length === 0) return <EmptyState message="暂无价格计算数据" small />;

  // 按城市-商品分组，显示最新价格
  const latestByCityProduct: Record<string, any> = {};
  for (const log of priceLogs) {
    const key = `${log.data.city}-${log.data.product_id}`;
    latestByCityProduct[key] = log.data;
  }

  return (
    <div className="space-y-2">
      {Object.values(latestByCityProduct).map((data: any, i: number) => (
        <div key={i} className="p-2 bg-surface border border-border rounded-lg text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{data.city} · {data.product_id}</span>
            <span className="font-mono text-accent-teal">¥{data.final_price}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-foreground-muted">
            <span>基准: ¥{data.base_price}</span>
            <span>净需求: {data.net_demand}</span>
            <span>买入: {data.buy_qty}</span>
            <span>卖出: {data.sell_qty}</span>
            <span>压力: {data.pressure}</span>
            <span>因子: {data.demand_factor}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiDebug({ logs }: { logs: DebugLog[] }) {
  const aiLogs = logs.filter(l => l.step_type === 'ai_decision');
  if (aiLogs.length === 0) return <EmptyState message="暂无 AI 决策数据" small />;

  // 按 AI 名称分组，每个 AI 只显示最新一条
  const latestByAi: Record<string, any> = {};
  for (const log of aiLogs) {
    latestByAi[log.data.ai_name] = log.data;
  }

  const actionLabels: Record<string, string> = {
    buy: '买入', sell: '卖出', move: '移动', hold: '观望',
  };
  const actionColors: Record<string, string> = {
    buy: 'text-green-400',
    sell: 'text-red-400',
    move: 'text-blue-400',
    hold: 'text-gray-400',
  };

  return (
    <div className="space-y-2">
      {Object.values(latestByAi).map((data: any, i: number) => (
        <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* AI 头部信息 */}
          <div className="px-3 py-2 border-b border-border/50 bg-accent-teal/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-accent-teal" />
                <span className="text-xs font-medium">{data.ai_name}</span>
                <span className="text-[10px] text-foreground-muted bg-border/30 px-1.5 py-0.5 rounded">
                  {data.ai_level}
                </span>
              </div>
              <span className="text-[10px] text-foreground-muted">{data.city}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground-muted">
              <span>现金: <span className="font-mono text-foreground">¥{(data.cash || 0).toLocaleString()}</span></span>
              {data.inventory && Object.entries(data.inventory).filter(([, q]: [string, any]) => q > 0).length > 0 && (
                <span>库存: {Object.entries(data.inventory).filter(([, q]: [string, any]) => q > 0).map(([p, q]: [string, any]) => `${p}:${q}`).join(', ')}</span>
              )}
            </div>
          </div>

          {/* 决策详情 */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-bold ${actionColors[data.decision?.action] || 'text-foreground'}`}>
                {actionLabels[data.decision?.action] || data.decision?.action || '观望'}
              </span>
              {data.decision?.product_id && (
                <span className="text-[10px] text-foreground-muted">
                  {data.decision.product_id} × {data.decision.quantity || 0}
                </span>
              )}
              {data.decision?.target_city && (
                <span className="text-[10px] text-foreground-muted">
                  → {data.decision.target_city}
                </span>
              )}
            </div>

            {/* 理由 */}
            {data.reasoning && (
              <p className="text-[10px] text-foreground-muted leading-relaxed mb-1.5">
                {data.reasoning}
              </p>
            )}

            {/* 预期利润和置信度 */}
            <div className="flex items-center gap-3">
              {(data.expected_profit || 0) > 0 && (
                <span className="text-[10px] text-green-400">
                  预期利润: ¥{(data.expected_profit || 0).toLocaleString()}
                </span>
              )}
              {(data.expected_profit || 0) < 0 && (
                <span className="text-[10px] text-red-400">
                  预期利润: ¥{(data.expected_profit || 0).toLocaleString()}
                </span>
              )}
              <span className="text-[10px] text-foreground-muted">
                置信度: <span className="font-mono">{Math.round((data.confidence || 0) * 100)}%</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsDebug({ logs }: { logs: DebugLog[] }) {
  const eventLogs = logs.filter(l => l.step_type === 'event');
  if (eventLogs.length === 0) return <EmptyState message="暂无事件数据" small />;

  return (
    <div className="space-y-2">
      {eventLogs.map((log, i) => (
        <div key={i} className="p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs">
          <div className="font-medium text-yellow-400 mb-0.5">{log.data.event?.name}</div>
          <div className="text-foreground-muted">{log.data.event?.description}</div>
          {log.data.event?.city && (
            <div className="text-foreground-muted mt-1">影响城市: {log.data.event.city}</div>
          )}
          {log.data.event?.affected_products && (
            <div className="text-foreground-muted">影响商品: {log.data.event.affected_products.join(', ')}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function LogsDebug({ logs, expandedTypes, onToggle }: {
  logs: DebugLog[];
  expandedTypes: Set<string>;
  onToggle: (type: string) => void;
}) {
  // 按类型分组
  const byType: Record<string, DebugLog[]> = {};
  for (const log of logs) {
    if (!byType[log.step_type]) byType[log.step_type] = [];
    byType[log.step_type].push(log);
  }

  const typeLabels: Record<string, string> = {
    price_calc: '价格计算',
    ai_decision: 'AI 决策',
    event: '随机事件',
    world_state: '世界状态',
  };

  return (
    <div className="space-y-1">
      {Object.entries(byType).map(([type, typeLogs]) => (
        <div key={type} className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onToggle(type)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-surface transition-colors"
          >
            <span className="font-medium">{typeLabels[type] || type}</span>
            <span className="text-foreground-muted">{typeLogs.length} 条</span>
            {expandedTypes.has(type) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedTypes.has(type) && (
            <div className="px-3 pb-2 space-y-1 max-h-[300px] overflow-auto">
              {typeLogs.slice(-20).map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-foreground-muted border-l-2 border-border pl-2">
                  <span className="text-accent-teal">Step {log.step_number}</span>
                  <pre className="mt-0.5 whitespace-pre-wrap break-all">{JSON.stringify(log.data, null, 1)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
