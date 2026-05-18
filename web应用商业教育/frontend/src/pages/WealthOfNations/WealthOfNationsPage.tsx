import { useState, useCallback } from 'react';
import {
  BookOpen,
  Users,
  Factory,
  TrendingUp,
  DollarSign,
  Package,
  ArrowRight,
  RotateCcw,
  Info,
  Hammer,
  Scissors,
  CircleDot,
} from 'lucide-react';

// ==================== GAME TYPES ====================

interface Worker {
  id: number;
  name: string;
  wage: number;
  divisionId: number | null;
  productivity: number;
}

interface Division {
  id: number;
  name: string;
  stage: number;
  efficiencyBonus: number;
  workers: number[];
}

interface GameState {
  day: number;
  cash: number;
  totalRevenue: number;
  totalCosts: number;
  inventory: number;
  marketPrice: number;
  marketDemand: number;
  capital: number;
  workers: Worker[];
  divisions: Division[];
  maxWorkers: number;
  gamePhase: 'intro' | 'playing' | 'ended';
  message: string;
  quote: string;
}

// ==================== INITIAL STATE ====================

const INITIAL_STATE: GameState = {
  day: 1,
  cash: 100,
  totalRevenue: 0,
  totalCosts: 0,
  inventory: 0,
  marketPrice: 5,
  marketDemand: 20,
  capital: 0,
  workers: [
    { id: 1, name: '工人甲', wage: 8, divisionId: null, productivity: 1 },
  ],
  divisions: [
    { id: 0, name: '综合生产', stage: 0, efficiencyBonus: 0, workers: [1] },
  ],
  maxWorkers: 1,
  gamePhase: 'intro',
  message: '欢迎来到斯密的工坊！你从1名工人和100枚金币开始。',
  quote: '"劳动生产力上最大的增进，以及运用劳动时所表现的更大的熟练、技巧和判断力，似乎都是分工的结果。" —— 亚当·斯密',
};

// ==================== GAME LOGIC ====================

function calculateProduction(state: GameState): number {
  let total = 0;
  for (const worker of state.workers) {
    let productivity = worker.productivity;
    if (worker.divisionId !== null) {
      const division = state.divisions.find((d) => d.id === worker.divisionId);
      if (division) {
        productivity *= (1 + division.efficiencyBonus);
      }
    }
    total += productivity * 10;
  }
  return Math.floor(total);
}

function calculateWages(state: GameState): number {
  return state.workers.reduce((sum, w) => sum + w.wage, 0);
}

// ==================== COMPONENT ====================

export default function WealthOfNationsPage() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [showQuote, setShowQuote] = useState(true);
  const [_selectedAction, _setSelectedAction] = useState<string | null>(null);

  const nextDay = useCallback(() => {
    setState((prev) => {
      const production = calculateProduction(prev);
      const wages = calculateWages(prev);
      const newInventory = prev.inventory + production;
      const sellAmount = Math.min(newInventory, prev.marketDemand);
      const revenue = sellAmount * prev.marketPrice;
      const costs = wages;
      const profit = revenue - costs;
      const newCash = prev.cash + profit;
      const newCapital = prev.capital + Math.max(0, profit * 0.3);

      // Market dynamics
      const unsold = newInventory - sellAmount;
      const newPrice = Math.max(2, prev.marketPrice - unsold * 0.1 + (sellAmount >= prev.marketDemand ? 0.5 : 0));
      const newDemand = Math.max(10, prev.marketDemand + Math.floor(Math.random() * 10) - 3);

      let message = `第${prev.day}天结束：生产${production}件，卖出${sellAmount}件，利润${profit}金币。`;
      if (unsold > 0) message += ` 库存积压${unsold}件，价格下跌。`;
      if (sellAmount >= prev.marketDemand) message += ` 供不应求，价格上涨！`;

      let quote = prev.quote;
      if (prev.day === 3) {
        quote = '"一个工人独自工作，一天可能连20枚别针都做不出来。但分工后，10个工人一天可以生产48000枚。" —— 亚当·斯密';
      } else if (prev.day === 5) {
        quote = '"工资有一定的标准，在相当长的时期内，即使是最低级的劳动，其工资也似乎不能低于这一标准。" —— 亚当·斯密';
      } else if (prev.day === 7) {
        quote = '"每个人都在力图应用他的资本，来使其生产品能得到最大的价值。" —— 亚当·斯密';
      }

      return {
        ...prev,
        day: prev.day + 1,
        cash: newCash,
        totalRevenue: prev.totalRevenue + revenue,
        totalCosts: prev.totalCosts + costs,
        inventory: unsold,
        marketPrice: Math.round(newPrice * 10) / 10,
        marketDemand: newDemand,
        capital: Math.round(newCapital),
        message,
        quote,
      };
    });
    setShowQuote(true);
  }, []);

  const hireWorker = useCallback(() => {
    setState((prev) => {
      const hireCost = 20;
      if (prev.cash < hireCost) {
        return { ...prev, message: '资金不足！需要20金币才能雇佣新工人。' };
      }
      const newId = prev.workers.length + 1;
      const names = ['乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const newWorker: Worker = {
        id: newId,
        name: `工人${names[newId - 2] || newId}`,
        wage: 8 + Math.floor(prev.day / 5),
        divisionId: 0,
        productivity: 1,
      };
      const newDivisions = prev.divisions.map((d) =>
        d.id === 0 ? { ...d, workers: [...d.workers, newId] } : d
      );
      return {
        ...prev,
        cash: prev.cash - hireCost,
        workers: [...prev.workers, newWorker],
        divisions: newDivisions,
        message: `雇佣了${newWorker.name}！日工资${newWorker.wage}金币。注意：工资会随市场上涨。`,
      };
    });
  }, []);

  const addDivision = useCallback(() => {
    setState((prev) => {
      const divisionCost = 50;
      if (prev.cash < divisionCost) {
        return { ...prev, message: '资金不足！需要50金币才能增加分工工序。' };
      }
      if (prev.divisions.length >= 6) {
        return { ...prev, message: '已经达到最大分工程度！' };
      }
      const newDivisionId = prev.divisions.length;
      const divisionNames = ['拉丝', '切断', '磨尖', '制头', '装配', '抛光'];
      const newDivision: Division = {
        id: newDivisionId,
        name: divisionNames[newDivisionId - 1] || `工序${newDivisionId}`,
        stage: newDivisionId,
        efficiencyBonus: 0.2 * newDivisionId,
        workers: [],
      };
      return {
        ...prev,
        cash: prev.cash - divisionCost,
        divisions: [...prev.divisions, newDivision],
        message: `增加了${newDivision.name}工序！分工效率提升${Math.round(newDivision.efficiencyBonus * 100)}%。`,
      };
    });
  }, []);

  const assignWorker = useCallback((workerId: number, divisionId: number) => {
    setState((prev) => {
      const worker = prev.workers.find((w) => w.id === workerId);
      if (!worker) return prev;

      const newWorkers = prev.workers.map((w) =>
        w.id === workerId ? { ...w, divisionId } : w
      );
      const newDivisions = prev.divisions.map((d) => {
        const workers = d.workers.filter((id) => id !== workerId);
        if (d.id === divisionId) workers.push(workerId);
        return { ...d, workers };
      });
      const division = prev.divisions.find((d) => d.id === divisionId);
      return {
        ...prev,
        workers: newWorkers,
        divisions: newDivisions,
        message: `${worker.name}被分配到${division?.name || '综合生产'}工序。`,
      };
    });
  }, []);

  const investTools = useCallback(() => {
    setState((prev) => {
      const investCost = 80;
      if (prev.cash < investCost) {
        return { ...prev, message: '资金不足！需要80金币投资工具。' };
      }
      const newWorkers = prev.workers.map((w) => ({
        ...w,
        productivity: w.productivity * 1.3,
      }));
      return {
        ...prev,
        cash: prev.cash - investCost,
        workers: newWorkers,
        message: '投资了新的生产工具！所有工人生产力提升30%。',
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
    setShowQuote(true);
  }, []);

  const production = calculateProduction(state);
  const wages = calculateWages(state);

  // ==================== RENDER ====================

  if (state.gamePhase === 'intro') {
    return (
      <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
        <div className="text-center space-y-6 py-12">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-4xl font-bold text-foreground">国富论：工坊经营模拟</h1>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
            基于亚当·斯密《国富论》的经典理论，体验劳动分工、工资决定与财富积累的过程。
            从1名工人开始，通过分工与投资，打造你的商业帝国。
          </p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">游戏机制</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">雇佣工人</h3>
                  <p className="text-sm text-foreground-muted">用利润雇佣更多工人，但需支付日工资</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
                  <Factory className="w-5 h-5 text-accent-teal" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">增加分工</h3>
                  <p className="text-sm text-foreground-muted">拆分工序，每个工人专注一道工序，效率大幅提升</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Hammer className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">投资工具</h3>
                  <p className="text-sm text-foreground-muted">购买机器和工具，提升所有工人的生产力</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">市场波动</h3>
                  <p className="text-sm text-foreground-muted">产品价格和需求随市场变化，学会预判趋势</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 bg-primary/5 border-primary/15">
          <p className="text-foreground-secondary italic text-center leading-relaxed">
            "劳动生产力上最大的增进，以及运用劳动时所表现的更大的熟练、技巧和判断力，似乎都是分工的结果。"
          </p>
          <p className="text-center text-sm text-primary mt-2">—— 亚当·斯密《国富论》</p>
        </div>

        <div className="text-center">
          <button
            onClick={() => setState((prev) => ({ ...prev, gamePhase: 'playing' }))}
            className="px-12 py-4 rounded-xl bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors glow-button"
          >
            开始经营
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            国富论：工坊经营模拟
          </h1>
          <p className="text-foreground-muted text-sm mt-1">第 {state.day} 天</p>
        </div>
        <button
          onClick={resetGame}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-foreground-secondary hover:bg-background-hover transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重新开始
        </button>
      </div>

      {/* Quote */}
      {showQuote && (
        <div className="glass-card p-4 bg-primary/5 border-primary/15 relative">
          <button
            onClick={() => setShowQuote(false)}
            className="absolute top-2 right-2 text-foreground-muted hover:text-foreground"
          >
            ✕
          </button>
          <p className="text-sm text-foreground-secondary italic pr-8">{state.quote}</p>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-warning" />
          <div className="text-2xl font-bold text-foreground">{state.cash}</div>
          <div className="text-xs text-foreground-muted">金币</div>
        </div>
        <div className="glass-card p-4 text-center">
          <Package className="w-6 h-6 mx-auto mb-2 text-info" />
          <div className="text-2xl font-bold text-foreground">{state.inventory}</div>
          <div className="text-xs text-foreground-muted">库存</div>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-accent-teal" />
          <div className="text-2xl font-bold text-foreground">{production}</div>
          <div className="text-xs text-foreground-muted">日产</div>
        </div>
        <div className="glass-card p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-foreground">{state.workers.length}</div>
          <div className="text-xs text-foreground-muted">工人</div>
        </div>
      </div>

      {/* Market Info */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-foreground-muted">市场价格</span>
              <div className="text-xl font-bold text-foreground">{state.marketPrice} 金币/件</div>
            </div>
            <div>
              <span className="text-xs text-foreground-muted">市场需求</span>
              <div className="text-xl font-bold text-foreground">{state.marketDemand} 件/天</div>
            </div>
            <div>
              <span className="text-xs text-foreground-muted">日工资支出</span>
              <div className="text-xl font-bold text-danger">{wages} 金币</div>
            </div>
          </div>
          <div>
            <span className="text-xs text-foreground-muted">累计资本</span>
            <div className="text-xl font-bold text-accent-teal">{state.capital} 金币</div>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="glass-card p-4 bg-background-secondary">
        <p className="text-foreground-secondary">{state.message}</p>
      </div>

      {/* Workshop View */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Factory className="w-5 h-5 text-primary" />
          工坊视图
        </h2>
        <div className="space-y-4">
          {state.divisions.map((division) => (
            <div key={division.id} className="p-4 rounded-lg bg-background-hover/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {division.id === 0 ? (
                    <Hammer className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <Scissors className="w-4 h-4 text-primary" />
                  )}
                  <span className="font-medium text-foreground">{division.name}</span>
                  {division.efficiencyBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-teal/10 text-accent-teal text-xs">
                      +{Math.round(division.efficiencyBonus * 100)}%
                    </span>
                  )}
                </div>
                <span className="text-sm text-foreground-muted">
                  {division.workers.length} 人
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {division.workers.map((workerId) => {
                  const worker = state.workers.find((w) => w.id === workerId);
                  if (!worker) return null;
                  return (
                    <div
                      key={workerId}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-card border border-border-subtle"
                    >
                      <CircleDot className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">{worker.name}</span>
                      <span className="text-xs text-foreground-muted">
                        ¥{worker.wage}/天
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={hireWorker}
          className="glass-card p-4 text-center hover:bg-background-hover/50 transition-colors group"
        >
          <Users className="w-8 h-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
          <div className="font-medium text-foreground">雇佣工人</div>
          <div className="text-xs text-foreground-muted">20 金币</div>
        </button>
        <button
          onClick={addDivision}
          className="glass-card p-4 text-center hover:bg-background-hover/50 transition-colors group"
        >
          <Factory className="w-8 h-8 mx-auto mb-2 text-accent-teal group-hover:scale-110 transition-transform" />
          <div className="font-medium text-foreground">增加分工</div>
          <div className="text-xs text-foreground-muted">50 金币</div>
        </button>
        <button
          onClick={investTools}
          className="glass-card p-4 text-center hover:bg-background-hover/50 transition-colors group"
        >
          <Hammer className="w-8 h-8 mx-auto mb-2 text-warning group-hover:scale-110 transition-transform" />
          <div className="font-medium text-foreground">投资工具</div>
          <div className="text-xs text-foreground-muted">80 金币</div>
        </button>
        <button
          onClick={nextDay}
          className="glass-card p-4 text-center bg-primary/10 hover:bg-primary/20 transition-colors group border-primary/20"
        >
          <ArrowRight className="w-8 h-8 mx-auto mb-2 text-primary group-hover:translate-x-1 transition-transform" />
          <div className="font-medium text-primary">下一天</div>
          <div className="text-xs text-primary/70">结算当日</div>
        </button>
      </div>

      {/* Worker Assignment */}
      {state.divisions.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-foreground-muted" />
            工人调配
          </h3>
          <div className="flex flex-wrap gap-4">
            {state.workers.map((worker) => (
              <div key={worker.id} className="flex items-center gap-2">
                <span className="text-sm text-foreground">{worker.name}:</span>
                <select
                  value={worker.divisionId ?? 0}
                  onChange={(e) => assignWorker(worker.id, parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-background-hover border border-border-subtle text-sm text-foreground"
                >
                  {state.divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.efficiencyBonus > 0 ? `(+${Math.round(d.efficiencyBonus * 100)}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Tips */}
      <div className="glass-card p-6 bg-primary-soft/5">
        <h3 className="font-bold text-foreground mb-3">💡 经济学小贴士</h3>
        <div className="space-y-2 text-sm text-foreground-secondary">
          <p>• <strong>劳动分工</strong>：每增加一道工序，效率会提升，但需要更多工人配合</p>
          <p>• <strong>工资决定</strong>：工资是劳动的报酬，必须足以维持工人的生活</p>
          <p>• <strong>市场供需</strong>：供过于求价格下跌，供不应求价格上涨</p>
          <p>• <strong>资本积累</strong>：利润的一部分用于再投资，扩大生产规模</p>
        </div>
      </div>
    </div>
  );
}
