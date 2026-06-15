/**
 * POP 拟真城市模拟器核心引擎
 * 基于 docs/prd/PRD-POP模拟器.md 实现
 */
(function (global) {
  'use strict';

  // ==================== 常量与定义 ====================

  const PROFESSIONS = {
    low_skill_worker: { label: '低技能工人', skill: 1, incomeSource: 'wage', savingsRate: 0.05, baseSolWeight: 1.0 },
    high_skill_worker: { label: '高技能工人', skill: 2, incomeSource: 'wage', savingsRate: 0.10, baseSolWeight: 1.1 },
    professional: { label: '专业技术人员', skill: 3, incomeSource: 'wage', savingsRate: 0.15, baseSolWeight: 1.2 },
    capitalist: { label: '资本家/企业家', skill: 0, incomeSource: 'capital', savingsRate: 0.30, baseSolWeight: 1.0 },
    unemployed: { label: '失业/无业', skill: 0, incomeSource: 'relief', savingsRate: 0.0, baseSolWeight: 0.6 },
    student: { label: '学生', skill: 0, incomeSource: 'transfer', savingsRate: 0.0, baseSolWeight: 0.9 },
    retiree: { label: '退休人员', skill: 0, incomeSource: 'pension', savingsRate: 0.0, baseSolWeight: 0.8 },
  };

  const PROFESSION_ORDER = ['low_skill_worker', 'high_skill_worker', 'professional', 'capitalist', 'unemployed', 'student', 'retiree'];

  const GOODS = [
    { id: 'food', name: '食品', needLevel: 'survival', basePrice: 263, baseNeed: 1.8, incomeElasticity: 0.3, priceElasticity: -0.6 },
    { id: 'housing', name: '住房', needLevel: 'survival', basePrice: 1575, baseNeed: 0.5, incomeElasticity: 0.4, priceElasticity: -0.3 },
    { id: 'daily', name: '日用品', needLevel: 'daily', basePrice: 630, baseNeed: 0.7, incomeElasticity: 0.6, priceElasticity: -0.8 },
    { id: 'education', name: '教育', needLevel: 'development', basePrice: 12758, baseNeed: 0.005, incomeElasticity: 1.2, priceElasticity: -0.4 },
    { id: 'medical', name: '医疗', needLevel: 'development', basePrice: 12758, baseNeed: 0.003, incomeElasticity: 0.9, priceElasticity: -0.2 },
    { id: 'luxury', name: '奢侈品', needLevel: 'luxury', basePrice: 6300, baseNeed: 0.005, incomeElasticity: 2.0, priceElasticity: -1.5 },
  ];

  const NEED_PRIORITY = ['survival', 'daily', 'development', 'luxury'];

  const DISTRICT_NAMES = ['中心区', '北区', '南区', '东区', '西区', '新区', '老城', '港区', '科技园', '大学城', '工业区', '生态区'];

  const SECTORS = [
    { id: 'agri', name: '农业', good: 'food', skillReq: 1, productivity: 12 },
    { id: 'manu', name: '制造业', good: 'daily', skillReq: 1, productivity: 5 },
    { id: 'edu', name: '教育业', good: 'education', skillReq: 3, productivity: 0.8 },
    { id: 'health', name: '医疗业', good: 'medical', skillReq: 3, productivity: 0.8 },
    { id: 'luxury', name: '奢侈品业', good: 'luxury', skillReq: 2, productivity: 0.9 },
    { id: 'construction', name: '建筑业', good: 'housing', skillReq: 1, productivity: 2.0 }, // produces housing services
  ];

  const EVENTS = [
    { id: 'material_spike', name: '原材料涨价', message: '原材料供应紧张，企业成本上升', effect: (s) => { s.goods.forEach(g => g.costMultiplier = (g.costMultiplier || 1) * 1.15); s.eventModifiers.materialSpikeTicks = 3; } },
    { id: 'consumer_downgrade', name: '消费降级', message: '消费者更加注重性价比，奢侈品需求下降', effect: (s) => { s.eventModifiers.luxuryMultiplier = 0.7; s.eventModifiers.consumerDowngradeTicks = 4; } },
    { id: 'tech_breakthrough', name: '技术突破', message: '生产技术突破，全要素生产率提升', effect: (s) => { s.eventModifiers.techBoost = 1.2; s.eventModifiers.techBoostTicks = 5; } },
    { id: 'natural_disaster', name: '自然灾害', message: '自然灾害导致部分住房和基础设施受损', effect: (s) => { s.districts.forEach(d => { d.housingSupply = Math.max(100, Math.floor(d.housingSupply * 0.92)); }); } },
    { id: 'migration_wave', name: '移民潮', message: '外来人口大量涌入城市', effect: (s, p) => { addImmigration(s, p, 3); } },
  ];

  const RATIO_KEY = {
    low_skill_worker: 'low_skill_ratio',
    high_skill_worker: 'high_skill_ratio',
    professional: 'professional_ratio',
    capitalist: 'capitalist_ratio',
    unemployed: 'unemployed_ratio',
    student: 'student_ratio',
    retiree: 'retiree_ratio',
  };

  const DEFAULT_PARAMS = {
    total_population: 10000,
    low_skill_ratio: 0.35,
    high_skill_ratio: 0.25,
    professional_ratio: 0.15,
    capitalist_ratio: 0.05,
    unemployed_ratio: 0.10,
    student_ratio: 0.05,
    retiree_ratio: 0.05,
    avg_education: 4.0,
    wealth_inequality: 0.30,
    firm_count: 20,
    base_productivity: 1.0,
    base_wage: 3000,
    skill_premium: 1.8,
    investment_rate: 0.30,
    import_supply: 200,
    export_demand: 200,
    income_tax_rate: 0.15,
    corporate_tax_rate: 0.20,
    minimum_wage: 2500,
    unemployment_benefit: 1200,
    education_spending: 500000,
    public_spending: 300000,
    housing_subsidy: 0.10,
    interest_rate: 0.03,
    immigration_rate: 0.001,
    tech_shock: 1.0,
    event_probability: 0.05,
    external_demand_shock: 1.0,
    district_count: 4,
    housing_supply_per_district: 3000,
    commute_cost: 500,
    commercial_land_ratio: 0.30,
    price_adjustment_speed: 0.05,
    migration_speed: 0.02,
    max_ticks: 120,
  };

  const PRESETS = {
    balanced: { ...DEFAULT_PARAMS },
    industrial_decline: {
      ...DEFAULT_PARAMS,
      low_skill_ratio: 0.50,
      high_skill_ratio: 0.20,
      professional_ratio: 0.10,
      unemployed_ratio: 0.10,
      export_demand: 500,
      corporate_tax_rate: 0.35,
      tech_shock: 0.85,
      event_probability: 0.08,
    },
    housing_bubble: {
      ...DEFAULT_PARAMS,
      housing_supply_per_district: 1500,
      investment_rate: 0.50,
      interest_rate: 0.01,
      immigration_rate: 0.015,
      commercial_land_ratio: 0.15,
      minimum_wage: 3000,
    },
    tech_replacement: {
      ...DEFAULT_PARAMS,
      low_skill_ratio: 0.50,
      high_skill_ratio: 0.15,
      tech_shock: 1.5,
      education_spending: 100000,
      event_probability: 0.08,
    },
    high_welfare: {
      ...DEFAULT_PARAMS,
      income_tax_rate: 0.35,
      corporate_tax_rate: 0.30,
      unemployment_benefit: 2500,
      education_spending: 800000,
      public_spending: 600000,
      housing_subsidy: 0.30,
      minimum_wage: 3500,
    },
    immigration_wave: {
      ...DEFAULT_PARAMS,
      immigration_rate: 0.02,
      housing_supply_per_district: 2000,
      district_count: 6,
      event_probability: 0.06,
    },
  };

  // ==================== 工具函数 ====================

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    const s = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1e9);
    return { rand: mulberry32(s), seed: s };
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  function weightedMean(values, weights) {
    let sum = 0;
    let w = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i] * weights[i];
      w += weights[i];
    }
    return w === 0 ? 0 : sum / w;
  }

  function calculateGini(pops) {
    const sorted = pops
      .map(p => ({ income: p.income_per_capita, size: p.size }))
      .sort((a, b) => a.income - b.income);
    const totalPop = sorted.reduce((s, p) => s + p.size, 0);
    const totalIncome = sorted.reduce((s, p) => s + p.income * p.size, 0);
    if (totalIncome === 0 || totalPop === 0) return 0;
    let cumulativePop = 0;
    let cumulativeIncome = 0;
    let area = 0;
    for (const p of sorted) {
      const prevPop = cumulativePop / totalPop;
      const prevIncome = cumulativeIncome / totalIncome;
      cumulativePop += p.size;
      cumulativeIncome += p.income * p.size;
      const curPop = cumulativePop / totalPop;
      const curIncome = cumulativeIncome / totalIncome;
      area += (curIncome + prevIncome) * (curPop - prevPop) / 2;
    }
    return 1 - 2 * area;
  }

  // ==================== 参数校验 ====================

  function validateParams(params) {
    const errors = [];
    const ratioFields = ['low_skill_ratio', 'high_skill_ratio', 'professional_ratio', 'capitalist_ratio', 'unemployed_ratio', 'student_ratio', 'retiree_ratio'];
    const ratioSum = ratioFields.reduce((s, f) => s + (params[f] || 0), 0);
    if (Math.abs(ratioSum - 1.0) > 0.001) errors.push('职业占比之和必须等于 1.0');
    if ((params.total_population || 0) < 1000) errors.push('总人口不能低于 1000');
    if ((params.district_count || 0) < 2 || (params.district_count || 0) > 12) errors.push('区域数量必须在 2~12 之间');
    if ((params.firm_count || 0) < 1) errors.push('企业数量至少为 1');
    if ((params.minimum_wage || 0) < 0) errors.push('最低工资不能为负');
    ['income_tax_rate', 'corporate_tax_rate', 'housing_subsidy', 'investment_rate', 'event_probability', 'immigration_rate'].forEach(f => {
      const v = params[f] || 0;
      if (v < 0 || v > 1) errors.push(`${f} 必须在 0 到 1 之间`);
    });
    return errors;
  }

  function normalizeRatios(params) {
    const ratioFields = ['low_skill_ratio', 'high_skill_ratio', 'professional_ratio', 'capitalist_ratio', 'unemployed_ratio', 'student_ratio', 'retiree_ratio'];
    const sum = ratioFields.reduce((s, f) => s + (params[f] || 0), 0);
    if (sum > 0) {
      ratioFields.forEach(f => params[f] = (params[f] || 0) / sum);
    }
  }

  // ==================== 初始化 ====================

  function createDistricts(params, rng) {
    const districts = [];
    for (let i = 0; i < params.district_count; i++) {
      const centerBonus = i === 0 ? 1.3 : 1.0;
      districts.push({
        id: `d-${i}`,
        name: DISTRICT_NAMES[i % DISTRICT_NAMES.length],
        population: 0,
        housingSupply: Math.floor(params.housing_supply_per_district * (0.9 + rng.rand() * 0.2)),
        housingCost: round2(params.base_wage * 0.15 * centerBonus * (0.9 + rng.rand() * 0.2)),
        avgWage: round2(params.base_wage * centerBonus * (0.9 + rng.rand() * 0.2)),
        vacancyRate: 0.05,
        commercialLand: params.commercial_land_ratio,
        attractiveness: 0,
        jobs: 0,
      });
    }
    return districts;
  }

  function createGoods(params, rng) {
    const totalBaseNeed = GOODS.reduce((s, g) => s + g.baseNeed, 0);
    const popFactor = params.total_population / 10000;
    return GOODS.map(g => ({
      ...g,
      price: round2(g.basePrice * (0.95 + rng.rand() * 0.1)),
      demand: 0,
      supply: 0,
      imports: Math.floor(params.import_supply * popFactor * (g.baseNeed / totalBaseNeed) * (0.8 + rng.rand() * 0.4)),
      exports: Math.floor(params.export_demand * popFactor * (g.baseNeed / totalBaseNeed) * (0.8 + rng.rand() * 0.4) * params.external_demand_shock),
      inventory: 0,
      costMultiplier: 1.0,
    }));
  }

  function createFirms(params, districts, goods, rng) {
    const firms = [];
    const firmsPerDistrict = Math.max(1, Math.floor(params.firm_count / districts.length));
    let id = 0;
    for (let di = 0; di < districts.length; di++) {
      for (let fi = 0; fi < firmsPerDistrict && id < params.firm_count; fi++) {
        const sector = SECTORS[(di + fi) % SECTORS.length];
        const skillMult = Math.pow(params.skill_premium, Math.max(0, sector.skillReq - 1));
        firms.push({
          id: `firm-${id}`,
          name: `${districts[di].name}${sector.name}企业${fi + 1}`,
          districtId: districts[di].id,
          sector: sector.id,
          good: sector.good,
          skillReq: sector.skillReq,
          productivity: round2(params.base_productivity * sector.productivity * (0.9 + rng.rand() * 0.2)),
          wage: round2(Math.max(params.minimum_wage, params.base_wage * skillMult * (0.9 + rng.rand() * 0.2))),
          employees: 0,
          targetEmployees: 10, // 占位，后续按需求校准
          output: 0,
          price: 0,
          sales: 0,
          revenue: 0,
          wageCost: 0,
          materialCost: 0,
          profit: 0,
          cash: round2(50000 + rng.rand() * 50000),
          inventory: 0,
          lossTicks: 0,
          active: true,
        });
        id++;
      }
    }

    // 根据各商品需求校准目标雇员数，使产出与需求大致匹配
    GOODS.forEach(g => {
      const sectorFirms = firms.filter(f => f.good === g.id);
      if (sectorFirms.length === 0) return;
      const goodInfo = goods.find(x => x.id === g.id);
      const imports = goodInfo ? goodInfo.imports : 0;
      const domesticNeed = Math.max(0, params.total_population * g.baseNeed - imports);
      sectorFirms.forEach(f => {
        const perFirmNeed = domesticNeed / sectorFirms.length;
        f.targetEmployees = Math.max(5, Math.floor((perFirmNeed / Math.max(f.productivity, 0.01)) * 1.1));
      });
    });

    return firms;
  }

  function createPops(params, districts, rng) {
    const pops = [];
    let pid = 0;
    PROFESSION_ORDER.forEach(prof => {
      const ratio = params[RATIO_KEY[prof]] || 0;
      if (ratio <= 0) return;
      const total = Math.floor(params.total_population * ratio);
      // 分配人口到各区域（中心区域初始更集中）
      let remaining = total;
      for (let i = 0; i < districts.length; i++) {
        const centerPull = i === 0 ? 1.5 : 1.0;
        const share = i === districts.length - 1 ? remaining : Math.floor(total * centerPull / (districts.length + 0.5) * (0.8 + rng.rand() * 0.4));
        const size = Math.min(remaining, Math.max(0, share));
        if (size <= 0) continue;
        remaining -= size;
        const profDef = PROFESSIONS[prof];
        const skillMult = profDef.skill > 0 ? Math.pow(params.skill_premium, profDef.skill - 1) : 0;
        const baseIncome = profDef.incomeSource === 'wage'
          ? Math.max(params.minimum_wage, params.base_wage * skillMult)
          : (profDef.incomeSource === 'relief' ? params.unemployment_benefit : (profDef.incomeSource === 'pension' ? params.unemployment_benefit * 1.2 : params.unemployment_benefit * 0.8));
        pops.push({
          id: `pop-${pid++}`,
          profession: prof,
          size: size,
          districtId: districts[i].id,
          income_per_capita: round2(baseIncome * (0.9 + rng.rand() * 0.2)),
          wealth: round2(baseIncome * 6 * (0.5 + rng.rand() * 2) * (profDef.incomeSource === 'capital' ? 10 : 1)),
          education: round2(clamp(params.avg_education * (0.7 + rng.rand() * 0.6) + (profDef.skill - 1) * 1.5, 0, 10)),
          satisfaction: round2(5 + rng.rand() * 3),
          migration_intent: 0,
          employed_count: profDef.incomeSource === 'wage' ? size : 0,
          unemployed_count: profDef.incomeSource === 'wage' ? 0 : 0,
          consumption: {},
          savings_rate: profDef.savingsRate,
          housing_cost: round2(districts[i].housingCost * (0.8 + rng.rand() * 0.4)),
        });
      }
    });
    return pops;
  }

  function reset(params, seed) {
    const rng = makeRng(seed);
    const districts = createDistricts(params, rng);
    const goods = createGoods(params, rng);
    const firms = createFirms(params, districts, goods, rng);
    const pops = createPops(params, districts, rng);

    // 初始劳动力市场快速匹配
    matchLaborMarket(pops, firms, params);
    updateDistrictStats(pops, firms, districts, params);

    const state = {
      params: { ...params },
      seed: rng.seed,
      tick: 0,
      maxTicks: params.max_ticks,
      status: 'editing',
      districts,
      firms,
      pops,
      goods,
      history: [computeMacroMetrics(pops, firms, goods, params, 0)],
      events: [{ tick: 0, type: 'init', message: `城市已初始化，总人口 ${params.total_population}` }],
      eventModifiers: {},
      rng,
    };
    return state;
  }

  // ==================== 劳动力市场 ====================

  function matchLaborMarket(pops, firms, params) {
    // 按工资排序企业
    const activeFirms = firms.filter(f => f.active);
    activeFirms.sort((a, b) => b.wage - a.wage);

    // 重置就业
    pops.forEach(p => {
      if (PROFESSIONS[p.profession].incomeSource === 'wage') {
        p.employed_count = 0;
        p.unemployed_count = p.size;
      }
    });

    // 按技能需求匹配
    for (const firm of activeFirms) {
      const target = firm.targetEmployees;
      const skillReq = firm.skillReq;
      let hired = 0;
      // 优先找 skill 匹配或更高的 profession
      for (const prof of ['professional', 'high_skill_worker', 'low_skill_worker']) {
        if (hired >= target) break;
        const profDef = PROFESSIONS[prof];
        if (profDef.skill < skillReq) continue;
        const candidates = pops.filter(p => p.profession === prof && p.unemployed_count > 0);
        candidates.sort((a, b) => b.satisfaction - a.satisfaction); // 随意排序
        for (const pop of candidates) {
          if (hired >= target) break;
          const canHire = Math.min(pop.unemployed_count, target - hired);
          pop.employed_count += canHire;
          pop.unemployed_count -= canHire;
          hired += canHire;
        }
      }
      firm.employees = hired;
    }

    // 工资市场压力调整
    const laborForce = pops.filter(p => PROFESSIONS[p.profession].incomeSource === 'wage');
    for (const prof of ['low_skill_worker', 'high_skill_worker', 'professional']) {
      const group = laborForce.filter(p => p.profession === prof);
      const total = group.reduce((s, p) => s + p.size, 0);
      const employed = group.reduce((s, p) => s + p.employed_count, 0);
      const unemploymentRate = total > 0 ? (total - employed) / total : 0;
      const skillMult = Math.pow(params.skill_premium, PROFESSIONS[prof].skill - 1);
      const marketWage = params.base_wage * skillMult * (1 + (0.05 - unemploymentRate) * 0.5);
      const actualWage = Math.max(params.minimum_wage, marketWage);
      group.forEach(p => p.income_per_capita = round2(actualWage));
    }
  }

  // ==================== 结算步骤 ====================

  function step(state) {
    const p = state.params;
    const next = deepCloneState(state);
    next.tick += 1;

    // 1. 外部冲击与事件
    applyEventModifiers(next);
    maybeTriggerEvent(next, p);
    addImmigration(next, p, 1);

    // 记录上期价格指数（用于 CPI）
    const prevPriceIndex = computePriceIndex(next.goods);

    // 2. 企业生产
    produce(next.firms, next.goods, p, next.eventModifiers);

    // 3. 收入分配（工资）
    matchLaborMarket(next.pops, next.firms, p);
    distributeIncome(next.pops, next.firms, p);

    // 4. 市场清算
    clearGoodsMarket(next.pops, next.firms, next.goods, p);

    // 5. POP 消费与储蓄
    consume(next.pops, next.goods, p);

    // 6. 满意度更新
    updateSatisfaction(next.pops, next.districts, p);

    // 7. 迁移与升级
    migrate(next.pops, next.districts, next.firms, p, next.rng);
    promoteAndDemote(next.pops, next.firms, p);
    mergePops(next.pops);

    // 8. 企业投资与动态
    updateFirms(next.firms, next.goods, p);

    // 记录企业倒闭事件
    next.firms.forEach((f, idx) => {
      if (!f.active && state.firms[idx]?.active) {
        next.events.push({ tick: next.tick, type: 'firm_closure', message: `${f.name} 连续亏损，退出市场` });
      }
    });

    // 9. 宏观指标
    const metrics = computeMacroMetrics(next.pops, next.firms, next.goods, p, next.tick, prevPriceIndex);
    next.history.push(metrics);

    // 10. 区域统计
    updateDistrictStats(next.pops, next.firms, next.districts, p);

    // 历史降采样
    if (next.history.length > 500) {
      next.history = downsampleHistory(next.history);
    }

    return next;
  }

  function applyEventModifiers(state) {
    const em = state.eventModifiers;
    if (em.materialSpikeTicks > 0) em.materialSpikeTicks--;
    else state.goods.forEach(g => g.costMultiplier = 1.0);
    if (em.consumerDowngradeTicks > 0) em.consumerDowngradeTicks--;
    else em.luxuryMultiplier = 1.0;
    if (em.techBoostTicks > 0) em.techBoostTicks--;
    else em.techBoost = 1.0;
  }

  function maybeTriggerEvent(state, params) {
    if (state.rng.rand() < params.event_probability) {
      const ev = EVENTS[Math.floor(state.rng.rand() * EVENTS.length)];
      ev.effect(state, params);
      state.events.push({ tick: state.tick, type: ev.id, message: ev.message });
    }
  }

  function addImmigration(state, params, multiplier) {
    const immigrants = Math.floor(params.total_population * params.immigration_rate * multiplier);
    if (immigrants <= 0) return;
    const targetDistrict = state.districts[Math.floor(state.rng.rand() * state.districts.length)];
    const existing = state.pops.find(p => p.profession === 'low_skill_worker' && p.districtId === targetDistrict.id);
    if (existing) {
      existing.size += immigrants;
    } else {
      state.pops.push({
        id: `pop-${state.pops.length}`,
        profession: 'low_skill_worker',
        size: immigrants,
        districtId: targetDistrict.id,
        income_per_capita: round2(params.base_wage * 0.8),
        wealth: round2(params.base_wage * 2),
        education: round2(params.avg_education * 0.5),
        satisfaction: round2(4 + state.rng.rand() * 2),
        migration_intent: 0,
        employed_count: 0,
        unemployed_count: immigrants,
        consumption: {},
        savings_rate: PROFESSIONS.low_skill_worker.savingsRate,
        housing_cost: targetDistrict.housingCost,
      });
    }
    state.events.push({ tick: state.tick, type: 'immigration', message: `${targetDistrict.name}迁入 ${immigrants} 名外来劳动力` });
  }

  function produce(firms, goods, params, modifiers) {
    const tech = params.tech_shock * (modifiers.techBoost || 1.0);
    firms.forEach(f => {
      if (!f.active) { f.output = 0; return; }
      const g = goods.find(x => x.id === f.good);
      f.output = round2(f.employees * f.productivity * tech);
      f.price = round2(g.price * (1 + (f.skillReq - 1) * 0.1));
    });
  }

  function distributeIncome(pops, firms, params) {
    // 工资已在 matchLaborMarket 中设置；这里计算企业利润并分配给资本家
    const totalProfit = firms.reduce((s, f) => s + f.profit, 0);
    const capitalistPops = pops.filter(p => p.profession === 'capitalist');
    const totalCapitalistSize = capitalistPops.reduce((s, p) => s + p.size, 0);
    if (totalCapitalistSize > 0 && totalProfit > 0) {
      const dividendPerCapita = totalProfit * (1 - params.investment_rate) * (1 - params.corporate_tax_rate) / totalCapitalistSize;
      capitalistPops.forEach(p => p.income_per_capita = round2(Math.max(0, dividendPerCapita)));
    }
    // 政府转移（失业/学生/退休）
    const govTransfers = params.unemployment_benefit;
    pops.forEach(p => {
      const src = PROFESSIONS[p.profession].incomeSource;
      if (src === 'relief') p.income_per_capita = round2(params.unemployment_benefit);
      else if (src === 'pension') p.income_per_capita = round2(params.unemployment_benefit * 1.2);
      else if (src === 'transfer') p.income_per_capita = round2(params.unemployment_benefit * 0.8);
    });
  }

  function clearGoodsMarket(pops, firms, goods, params) {
    // 重置需求
    goods.forEach(g => { g.demand = 0; });

    // 计算需求
    const referenceIncome = params.base_wage;
    pops.forEach(pop => {
      // 预期可支配收入粗略估计
      const disposable = Math.max(0, pop.income_per_capita * (1 - params.income_tax_rate) - pop.housing_cost * (1 - params.housing_subsidy));
      for (const g of goods) {
        const desired = g.baseNeed * pop.size * Math.pow(Math.max(0.1, disposable / referenceIncome), g.incomeElasticity);
        g.demand = (g.demand || 0) + desired;
      }
    });

    // 供给与价格调整
    goods.forEach(g => {
      const supplyFromFirms = firms.filter(f => f.active && f.good === g.id).reduce((s, f) => s + f.output, 0);
      g.supply = round2(supplyFromFirms + g.imports);
      g.exportsEffective = Math.min(g.exports, Math.max(0, g.supply - g.demand));
      const ratio = clamp(g.demand / Math.max(g.supply, 1), 0.5, 2.0);
      const newPrice = g.price * (1 + params.price_adjustment_speed * (ratio - 1));
      g.price = round2(clamp(newPrice, g.basePrice * 0.5, g.basePrice * 2.0));
    });
  }

  function consume(pops, goods, params) {
    pops.forEach(pop => {
      let disposable = Math.max(0, pop.income_per_capita * (1 - params.income_tax_rate) - pop.housing_cost * (1 - params.housing_subsidy));
      // 优先按需求层级消费
      pop.consumption = {};
      for (const level of NEED_PRIORITY) {
        const levelGoods = goods.filter(g => g.needLevel === level);
        for (const g of levelGoods) {
          const desired = g.baseNeed * pop.size * Math.pow(Math.max(0.1, disposable / params.base_wage), g.incomeElasticity);
          const maxAffordable = Math.floor(disposable / Math.max(g.price, 0.01));
          const actual = Math.min(desired, maxAffordable);
          pop.consumption[g.id] = (pop.consumption[g.id] || 0) + actual;
          disposable -= actual * g.price;
          if (disposable < 0) disposable = 0;
        }
      }
      // 储蓄
      const saved = disposable * pop.savings_rate;
      pop.wealth = round2(pop.wealth + saved);
    });
  }

  function updateSatisfaction(pops, districts, params) {
    pops.forEach(p => {
      const prof = PROFESSIONS[p.profession];
      const totalConsumption = Object.values(p.consumption).reduce((s, v) => s + v, 0);
      const expectedConsumption = GOODS.reduce((s, g) => s + g.baseNeed * p.size, 0);
      const fulfillment = expectedConsumption > 0 ? totalConsumption / expectedConsumption : 0;
      const housingPressure = Math.min(1, p.housing_cost / Math.max(p.income_per_capita, 1));
      const unemploymentRate = p.size > 0 ? p.unemployed_count / p.size : 0;
      const incomeLevel = Math.min(1, p.income_per_capita / (params.base_wage * 3));
      let sat = 3 + fulfillment * 4 + (1 - housingPressure) * 2 + (1 - unemploymentRate) * 2 + incomeLevel * 2;
      sat *= prof.baseSolWeight;
      p.satisfaction = round2(clamp(sat, 0, 10));
    });
  }

  function migrate(pops, districts, firms, params, rng) {
    // 计算区域吸引力
    districts.forEach(d => {
      const jobs = firms.filter(f => f.active && f.districtId === d.id).reduce((s, f) => s + f.targetEmployees, 0);
      const population = pops.filter(p => p.districtId === d.id).reduce((s, p) => s + p.size, 0);
      const housingAffordability = d.housingSupply / Math.max(population, 1);
      d.attractiveness = d.avgWage * 0.4 + jobs * 10 + housingAffordability * 100 - d.housingCost * 0.05;
      d.jobs = jobs;
    });

    const sortedDistricts = [...districts].sort((a, b) => b.attractiveness - a.attractiveness);

    pops.forEach(p => {
      if (p.size <= 0) return;
      const current = districts.find(d => d.id === p.districtId);
      const target = sortedDistricts.find(d => d.id !== current.id);
      if (!target) return;
      const push = 0.3 * (10 - p.satisfaction) + 0.5 * (p.unemployed_count / Math.max(p.size, 1)) + 0.2 * (p.housing_cost / Math.max(p.income_per_capita, 1));
      const pull = 0.4 * (target.avgWage - current.avgWage) / Math.max(current.avgWage, 1) + 0.3 * (target.jobs / Math.max(current.jobs, 1)) + 0.3 * (target.housingSupply / Math.max(current.housingSupply, 1));
      p.migration_intent = round2(sigmoid(push - pull + (rng.rand() - 0.5) * 0.5));
      if (p.migration_intent > 0.55) {
        const migrants = Math.floor(p.size * params.migration_speed);
        if (migrants > 0) {
          p.size -= migrants;
          const existing = pops.find(x => x.profession === p.profession && x.districtId === target.id);
          if (existing) {
            existing.size += migrants;
          } else {
            pops.push({ ...p, id: `pop-${pops.length}`, districtId: target.id, size: migrants });
          }
        }
      }
    });
  }

  function promoteAndDemote(pops, firms, params) {
    // 教育提升
    const eduBoost = params.education_spending / Math.max(params.total_population, 1) / 100;
    pops.forEach(p => {
      p.education = round2(clamp(p.education + eduBoost * 0.1, 0, 10));
    });

    // 升级：低技能 -> 高技能
    const highSkillVacancies = firms.filter(f => f.active && f.skillReq >= 2).reduce((s, f) => s + Math.max(0, f.targetEmployees - f.employees), 0);
    pops.filter(p => p.profession === 'low_skill_worker' && p.education > 5).forEach(p => {
      const promote = Math.min(p.size, Math.floor(highSkillVacancies * 0.1));
      if (promote > 0) {
        p.size -= promote;
        const existing = pops.find(x => x.profession === 'high_skill_worker' && x.districtId === p.districtId);
        if (existing) existing.size += promote;
        else pops.push({ ...p, id: `pop-${pops.length}`, profession: 'high_skill_worker', size: promote, education: p.education });
      }
    });

    // 降级：长期失业高技能 -> 低技能或失业
    pops.filter(p => p.profession === 'high_skill_worker' && p.unemployed_count / p.size > 0.5).forEach(p => {
      const demote = Math.floor(p.unemployed_count * 0.05);
      if (demote > 0) {
        p.size -= demote;
        const existing = pops.find(x => x.profession === 'unemployed' && x.districtId === p.districtId);
        if (existing) existing.size += demote;
        else pops.push({ ...p, id: `pop-${pops.length}`, profession: 'unemployed', size: demote, education: p.education });
      }
    });

    // 清理空 POP 组
    for (let i = pops.length - 1; i >= 0; i--) {
      if (pops[i].size <= 0) pops.splice(i, 1);
    }
  }

  function mergePops(pops) {
    const map = new Map();
    for (const p of pops) {
      const key = `${p.profession}|${p.districtId}`;
      if (map.has(key)) {
        const existing = map.get(key);
        const total = existing.size + p.size;
        existing.income_per_capita = round2((existing.income_per_capita * existing.size + p.income_per_capita * p.size) / total);
        existing.wealth = round2((existing.wealth * existing.size + p.wealth * p.size) / total);
        existing.education = round2((existing.education * existing.size + p.education * p.size) / total);
        existing.satisfaction = round2((existing.satisfaction * existing.size + p.satisfaction * p.size) / total);
        existing.housing_cost = round2((existing.housing_cost * existing.size + p.housing_cost * p.size) / total);
        existing.employed_count += p.employed_count;
        existing.unemployed_count += p.unemployed_count;
        existing.size = total;
      } else {
        map.set(key, p);
      }
    }
    pops.length = 0;
    for (const p of map.values()) pops.push(p);
  }

  function updateFirms(firms, goods, params) {
    firms.forEach(f => {
      if (!f.active) return;
      const g = goods.find(x => x.id === f.good);
      const demandShare = g.supply > 0 ? f.output / Math.max(g.supply, 1) : 1;
      const sales = Math.min(f.output, g.demand * demandShare);
      f.sales = round2(sales);
      f.wageCost = round2(f.employees * f.wage);
      f.materialCost = round2(f.output * g.basePrice * 0.05 * (g.costMultiplier || 1.0));
      // 为保障模拟稳定性，企业收入设有下限（覆盖工资与原材料成本并留 5% 利润），
      // 同时真实销量与价格仍影响利润波动。
      let revenue = sales * f.price;
      const minRevenue = f.wageCost * 1.05 + f.materialCost;
      if (revenue < minRevenue) revenue = minRevenue;
      f.revenue = round2(revenue);
      const grossProfit = f.revenue - f.wageCost - f.materialCost;
      f.profit = round2(grossProfit * (1 - params.corporate_tax_rate));
      f.cash = round2(f.cash + f.profit);

      if (f.profit > 0) {
        f.lossTicks = 0;
        const invest = f.profit * params.investment_rate;
        f.productivity = round2(f.productivity + invest / 100000);
        f.targetEmployees = Math.min(500, Math.floor(f.targetEmployees * (1 + params.investment_rate * 0.1)));
      } else {
        f.lossTicks += 1;
        if (f.lossTicks >= 6) {
          f.targetEmployees = Math.max(5, Math.floor(f.targetEmployees * 0.9));
        }
        if (f.cash < -200000 || f.targetEmployees <= 0) {
          f.active = false;
          f.employees = 0;
        }
      }
    });
  }

  function computePriceIndex(goods) {
    const totalNeed = goods.reduce((s, g) => s + g.baseNeed, 0);
    if (totalNeed === 0) return 1;
    return goods.reduce((s, g) => s + (g.price / g.basePrice) * g.baseNeed, 0) / totalNeed;
  }

  function computeMacroMetrics(pops, firms, goods, params, tick, prevPriceIndex) {
    const totalPop = pops.reduce((s, p) => s + p.size, 0);
    const laborForce = pops.filter(p => ['low_skill_worker', 'high_skill_worker', 'professional'].includes(p.profession));
    const laborSize = laborForce.reduce((s, p) => s + p.size, 0);
    const unemployed = laborForce.reduce((s, p) => s + p.unemployed_count, 0);
    const unemploymentRate = laborSize > 0 ? unemployed / laborSize : 0;

    const consumption = pops.reduce((s, p) => s + Object.entries(p.consumption).reduce((ss, [gid, qty]) => {
      const g = goods.find(x => x.id === gid);
      return ss + qty * (g ? g.price : 0);
    }, 0), 0);
    const investment = firms.filter(f => f.active).reduce((s, f) => s + Math.max(0, f.profit) * params.investment_rate, 0);
    const netExport = goods.reduce((s, g) => s + (g.exportsEffective || 0) * g.price - g.imports * g.price, 0);
    const gdp = consumption + investment + params.public_spending + netExport;

    const priceIndex = computePriceIndex(goods);
    const base = prevPriceIndex || 1;
    const cpi = tick > 0 ? (priceIndex - base) / base : 0;

    const avgIncome = weightedMean(pops.map(p => p.income_per_capita), pops.map(p => p.size));
    const avgSatisfaction = weightedMean(pops.map(p => p.satisfaction), pops.map(p => p.size));
    const housingIndex = weightedMean(pops.map(p => p.housing_cost), pops.map(p => p.size)) / (params.base_wage * 0.8);

    return {
      tick,
      gdp: round2(gdp),
      cpi: round2(cpi * 100),
      unemployment_rate: round2(unemploymentRate * 100),
      gini: round2(calculateGini(pops)),
      avg_satisfaction: round2(avgSatisfaction),
      avg_income: round2(avgIncome),
      housing_index: round2(housingIndex * 100),
      price_index: round2(priceIndex * 100),
      population: totalPop,
    };
  }

  function updateDistrictStats(pops, firms, districts, params) {
    districts.forEach(d => {
      const districtPops = pops.filter(p => p.districtId === d.id);
      d.population = districtPops.reduce((s, p) => s + p.size, 0);
      d.avgWage = round2(weightedMean(districtPops.map(p => p.income_per_capita), districtPops.map(p => p.size)) || params.base_wage);
      d.satisfaction = round2(weightedMean(districtPops.map(p => p.satisfaction), districtPops.map(p => p.size)) || 5);
      const employed = districtPops.reduce((s, p) => s + p.employed_count, 0);
      const labor = districtPops.filter(p => PROFESSIONS[p.profession].incomeSource === 'wage').reduce((s, p) => s + p.size, 0);
      d.vacancyRate = labor > 0 ? 1 - employed / labor : 0.05;
      // 住房压力影响房价
      const pressure = d.population / Math.max(d.housingSupply, 1);
      d.housingCost = round2(d.housingCost * (1 + (pressure - 1) * 0.02));
    });
  }

  function downsampleHistory(history) {
    const out = [];
    const factor = Math.ceil(history.length / 250);
    for (let i = 0; i < history.length; i += factor) {
      out.push(history[i]);
    }
    return out;
  }

  function deepCloneState(state) {
    return {
      params: { ...state.params },
      seed: state.seed,
      tick: state.tick,
      maxTicks: state.maxTicks,
      status: state.status,
      districts: state.districts.map(d => ({ ...d })),
      firms: state.firms.map(f => ({ ...f })),
      pops: state.pops.map(p => ({ ...p, consumption: { ...p.consumption } })),
      goods: state.goods.map(g => ({ ...g })),
      history: state.history.map(h => ({ ...h })),
      events: state.events.map(e => ({ ...e })),
      eventModifiers: { ...state.eventModifiers },
      rng: state.rng, // 函数引用，不克隆
    };
  }

  // ==================== 导入导出 ====================

  function exportConfig(state) {
    return JSON.stringify({ id: 'pop-simulator-v1', version: '1.0.0', params: state.params, seed: state.seed }, null, 2);
  }

  function exportState(state) {
    const plain = {
      params: state.params,
      seed: state.seed,
      tick: state.tick,
      maxTicks: state.maxTicks,
      status: state.status,
      districts: state.districts,
      firms: state.firms,
      pops: state.pops,
      goods: state.goods.map(g => ({ ...g })),
      history: state.history,
      events: state.events,
      eventModifiers: state.eventModifiers,
    };
    return JSON.stringify(plain, null, 2);
  }

  function importConfig(json) {
    const data = JSON.parse(json);
    return { params: { ...DEFAULT_PARAMS, ...data.params }, seed: data.seed };
  }

  function importState(json) {
    const data = JSON.parse(json);
    const rng = makeRng(data.seed);
    return {
      ...data,
      rng,
      pops: data.pops.map(p => ({ ...p, consumption: p.consumption || {} })),
      eventModifiers: data.eventModifiers || {},
    };
  }

  // ==================== 公共 API ====================

  global.POPSim = {
    DEFAULT_PARAMS,
    PRESETS,
    PROFESSIONS,
    PROFESSION_ORDER,
    GOODS,
    EVENTS,
    DISTRICT_NAMES,
    validateParams,
    normalizeRatios,
    reset,
    step,
    exportConfig,
    exportState,
    importConfig,
    importState,
    clamp,
    sigmoid,
    calculateGini,
    round2,
  };
})(window);
