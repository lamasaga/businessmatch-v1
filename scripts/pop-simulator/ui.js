/**
 * POP 拟真城市模拟器前端 UI
 * 基于 docs/prd/PRD-POP模拟器.md 与 BDD-POP模拟器.md 实现
 */
(function () {
  'use strict';

  const SIM = window.POPSim;

  // 当前参数（面板值），可能与运行时状态分离
  let currentParams = { ...SIM.DEFAULT_PARAMS };
  let state = null;
  let timer = null;
  let speed = 500; // ms per tick
  let activeSeries = new Set(Object.keys(SERIES_CONFIG));
  let distMode = 'wealth'; // 'wealth' | 'profession'
  let mapMetric = 'population';

  const PARAM_DEFS = [
    { group: 'POP 基础', key: 'total_population', label: '总人口', min: 1000, max: 100000, step: 1000 },
    { group: 'POP 基础', key: 'low_skill_ratio', label: '低技能工人占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'high_skill_ratio', label: '高技能工人占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'professional_ratio', label: '专业技术人员占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'capitalist_ratio', label: '资本家占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'unemployed_ratio', label: '失业/无业占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'student_ratio', label: '学生占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'retiree_ratio', label: '退休人员占比', min: 0, max: 1, step: 0.01, isRatio: true },
    { group: 'POP 基础', key: 'avg_education', label: '平均教育水平', min: 0, max: 10, step: 0.1 },
    { group: 'POP 基础', key: 'wealth_inequality', label: '初始财富不平等', min: 0, max: 0.9, step: 0.05 },

    { group: '企业与市场', key: 'firm_count', label: '企业数量', min: 1, max: 100, step: 1 },
    { group: '企业与市场', key: 'base_productivity', label: '基础生产率', min: 0.1, max: 5, step: 0.1 },
    { group: '企业与市场', key: 'base_wage', label: '基础工资', min: 1000, max: 20000, step: 100 },
    { group: '企业与市场', key: 'skill_premium', label: '技能工资溢价', min: 1, max: 5, step: 0.1 },
    { group: '企业与市场', key: 'investment_rate', label: '企业投资率', min: 0, max: 1, step: 0.05 },
    { group: '企业与市场', key: 'import_supply', label: '进口供给量', min: 0, max: 10000, step: 100 },
    { group: '企业与市场', key: 'export_demand', label: '出口需求量', min: 0, max: 10000, step: 100 },

    { group: '政策', key: 'income_tax_rate', label: '所得税率', min: 0, max: 1, step: 0.01 },
    { group: '政策', key: 'corporate_tax_rate', label: '企业税率', min: 0, max: 1, step: 0.01 },
    { group: '政策', key: 'minimum_wage', label: '最低工资', min: 0, max: 20000, step: 100 },
    { group: '政策', key: 'unemployment_benefit', label: '失业救济', min: 0, max: 10000, step: 100 },
    { group: '政策', key: 'education_spending', label: '教育投入', min: 0, max: 2000000, step: 10000 },
    { group: '政策', key: 'public_spending', label: '公共支出', min: 0, max: 2000000, step: 10000 },
    { group: '政策', key: 'housing_subsidy', label: '住房补贴比例', min: 0, max: 1, step: 0.05 },

    { group: '外部环境', key: 'interest_rate', label: '基准利率', min: 0, max: 0.2, step: 0.005 },
    { group: '外部环境', key: 'immigration_rate', label: '移民流入率', min: 0, max: 0.05, step: 0.001 },
    { group: '外部环境', key: 'tech_shock', label: '技术冲击', min: 0.5, max: 3, step: 0.1 },
    { group: '外部环境', key: 'event_probability', label: '随机事件概率', min: 0, max: 1, step: 0.01 },
    { group: '外部环境', key: 'external_demand_shock', label: '外部需求冲击', min: 0.5, max: 3, step: 0.1 },

    { group: '空间', key: 'district_count', label: '区域数量', min: 2, max: 12, step: 1, structural: true },
    { group: '空间', key: 'housing_supply_per_district', label: '区域住房供给', min: 100, max: 10000, step: 100, structural: true },
    { group: '空间', key: 'commute_cost', label: '通勤成本', min: 0, max: 3000, step: 50 },
    { group: '空间', key: 'commercial_land_ratio', label: '商业用地比例', min: 0, max: 1, step: 0.05 },

    { group: '模拟', key: 'max_ticks', label: '最大 tick 数', min: 10, max: 1000, step: 10 },
    { group: '模拟', key: 'price_adjustment_speed', label: '价格调整速度', min: 0.01, max: 0.5, step: 0.01 },
    { group: '模拟', key: 'migration_speed', label: '迁移速度', min: 0, max: 0.2, step: 0.01 },
  ];

  const SERIES_CONFIG = {
    gdp: { label: 'GDP', color: '#2563eb', axis: 'y' },
    cpi: { label: 'CPI(%)', color: '#dc2626', axis: 'y1' },
    unemployment_rate: { label: '失业率(%)', color: '#f59e0b', axis: 'y1' },
    gini: { label: '基尼系数', color: '#7c3aed', axis: 'y1' },
    avg_satisfaction: { label: '平均满意度', color: '#16a34a', axis: 'y1' },
    avg_income: { label: '人均收入', color: '#0891b2', axis: 'y' },
    housing_index: { label: '房价指数', color: '#db2777', axis: 'y1' },
  };

  // ==================== 初始化 ====================

  function init() {
    buildParameterPanel();
    bindControls();
    loadPreset('balanced');
    // 默认直接生成初始城市，避免用户打开页面时所有面板为空
    doReset();
  }

  function buildParameterPanel() {
    const panel = document.getElementById('parameter-panel');
    const groups = {};
    PARAM_DEFS.forEach(def => {
      if (!groups[def.group]) groups[def.group] = [];
      groups[def.group].push(def);
    });

    panel.innerHTML = '';
    Object.entries(groups).forEach(([name, defs]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'param-group';
      groupEl.innerHTML = `
        <div class="param-group-title" data-toggle="${name}">
          <span>${name}</span>
          <span>▼</span>
        </div>
        <div class="param-group-content" id="group-${name.replace(/\s+/g, '-')}"></div>
      `;
      const content = groupEl.querySelector('.param-group-content');
      defs.forEach(def => {
        const row = document.createElement('div');
        row.className = 'param-row';
        row.dataset.key = def.key;
        row.innerHTML = `
          <label>${def.label}</label>
          <input type="range" min="${def.min}" max="${def.max}" step="${def.step}" data-key="${def.key}" data-type="${def.isRatio ? 'ratio' : 'number'}">
          <input type="number" min="${def.min}" max="${def.max}" step="${def.step}" data-key="${def.key}" data-type="${def.isRatio ? 'ratio' : 'number'}">
        `;
        content.appendChild(row);
      });
      panel.appendChild(groupEl);

      groupEl.querySelector('.param-group-title').addEventListener('click', () => {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      });
    });

    panel.addEventListener('input', (e) => {
      const target = e.target;
      const key = target.dataset.key;
      if (!key) return;
      const def = PARAM_DEFS.find(d => d.key === key);
      let value = parseFloat(target.value);
      if (Number.isNaN(value)) return;
      value = SIM.clamp(value, def.min, def.max);

      // 同步 range 与 number
      const row = target.closest('.param-row');
      row.querySelectorAll('input').forEach(inp => {
        if (inp !== target) inp.value = value;
      });

      if (def.isRatio) {
        // 按比例缩放其他职业占比
        const ratioKeys = PARAM_DEFS.filter(d => d.isRatio && d.key !== key).map(d => d.key);
        const otherSum = ratioKeys.reduce((s, k) => s + currentParams[k], 0);
        if (otherSum > 0) {
          const remaining = 1 - value;
          ratioKeys.forEach(k => {
            currentParams[k] = SIM.round2((currentParams[k] / otherSum) * remaining);
          });
        }
      }
      currentParams[key] = value;
      normalizeRatiosFromParams();
      updatePresetLabel();
      validateAndRenderErrors();
      updateParamInputs(false); // 更新其他 ratio 显示
    });
  }

  function normalizeRatiosFromParams() {
    const ratioKeys = PARAM_DEFS.filter(d => d.isRatio).map(d => d.key);
    const sum = ratioKeys.reduce((s, k) => s + (currentParams[k] || 0), 0);
    if (sum > 0) {
      ratioKeys.forEach(k => currentParams[k] = SIM.round2((currentParams[k] || 0) / sum));
    }
  }

  function updateParamInputs(includeCurrent = true) {
    PARAM_DEFS.forEach(def => {
      const row = document.querySelector(`.param-row[data-key="${def.key}"]`);
      if (!row) return;
      const value = currentParams[def.key];
      row.querySelectorAll('input').forEach(inp => {
        inp.value = value;
      });
    });
  }

  function updatePresetLabel() {
    const select = document.getElementById('preset-select');
    const current = Object.entries(SIM.PRESETS).find(([name, p]) => paramsEqual(p, currentParams));
    if (current) {
      select.value = current[0];
      select.dataset.custom = 'false';
    } else {
      select.value = 'custom';
    }
  }

  function paramsEqual(a, b) {
    const keys = Object.keys(SIM.DEFAULT_PARAMS);
    return keys.every(k => Math.abs((a[k] || 0) - (b[k] || 0)) < 0.0001);
  }

  function bindControls() {
    const presetSelect = document.getElementById('preset-select');
    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') return;
      loadPreset(val);
    });

    document.getElementById('btn-reset').addEventListener('click', doReset);
    document.getElementById('btn-step').addEventListener('click', doStep);
    document.getElementById('btn-run').addEventListener('click', toggleRun);
    document.getElementById('speed-select').addEventListener('change', (e) => {
      speed = parseInt(e.target.value, 10);
      if (timer) {
        clearInterval(timer);
        timer = setInterval(doStep, speed);
      }
    });
    document.getElementById('seed-input').addEventListener('change', () => {
      // seed 只影响下一次 reset
    });
    document.getElementById('btn-export-config').addEventListener('click', exportConfig);
    document.getElementById('btn-export-state').addEventListener('click', exportState);
    document.getElementById('btn-import-config').addEventListener('click', () => document.getElementById('import-config-file').click());
    document.getElementById('btn-import-state').addEventListener('click', () => document.getElementById('import-state-file').click());
    document.getElementById('import-config-file').addEventListener('change', importConfig);
    document.getElementById('import-state-file').addEventListener('change', importState);

    // 图表系列切换
    document.getElementById('chart-toggles').addEventListener('click', (e) => {
      if (!e.target.dataset.series) return;
      const s = e.target.dataset.series;
      if (activeSeries.has(s)) activeSeries.delete(s);
      else activeSeries.add(s);
      renderChartToggles();
      renderChart();
    });

    // 地图指标
    document.getElementById('map-metric').addEventListener('change', (e) => {
      mapMetric = e.target.value;
      renderDistrictMap();
    });

    // 分布图切换
    document.getElementById('dist-toggle').addEventListener('click', () => {
      distMode = distMode === 'wealth' ? 'profession' : 'wealth';
      document.getElementById('dist-toggle').textContent = distMode === 'wealth' ? '切换：职业结构' : '切换：财富分布';
      renderDistributionChart();
    });
  }

  function loadPreset(name) {
    currentParams = { ...SIM.PRESETS[name] };
    normalizeRatiosFromParams();
    updateParamInputs();
    document.getElementById('preset-select').value = name;
    validateAndRenderErrors();
    // 切换预设不自动重置状态，仅更新参数
  }

  function getSeed() {
    const input = document.getElementById('seed-input').value.trim();
    return input ? parseInt(input, 10) : Math.floor(Math.random() * 1e9);
  }

  function doReset() {
    const errors = SIM.validateParams(currentParams);
    if (errors.length > 0) {
      alert('参数校验失败：\n' + errors.join('\n'));
      return;
    }
    state = SIM.reset(currentParams, getSeed());
    state.status = 'editing';
    updateControls();
    renderAll();
  }

  function doStep() {
    if (!state) {
      doReset();
      return;
    }
    if (state.status === 'finished') return;
    state = SIM.step(state);
    state.status = 'paused';
    if (state.tick >= state.maxTicks) {
      state.status = 'finished';
      stopRun();
    }
    updateControls();
    renderAll();
  }

  function toggleRun() {
    if (!state) doReset();
    if (state.status === 'finished') return;
    if (timer) {
      stopRun();
      state.status = 'paused';
    } else {
      state.status = 'running';
      timer = setInterval(() => {
        if (state.status !== 'running') return;
        doStep();
      }, speed);
    }
    updateControls();
  }

  function stopRun() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function updateControls() {
    const running = !!timer;
    document.getElementById('btn-run').textContent = running ? '暂停' : '运行';
    document.getElementById('btn-step').disabled = running;
    document.getElementById('btn-reset').disabled = running;
    document.getElementById('preset-select').disabled = running;
    document.querySelectorAll('#parameter-panel input').forEach(inp => {
      const def = PARAM_DEFS.find(d => d.key === inp.dataset.key);
      inp.disabled = running || (def && def.structural && state !== null);
    });
  }

  function validateAndRenderErrors() {
    const errors = SIM.validateParams(currentParams);
    const el = document.getElementById('errors');
    el.textContent = errors.join('；');
    document.getElementById('btn-reset').disabled = errors.length > 0;
  }

  // ==================== 渲染 ====================

  function renderAll() {
    renderStatusBar();
    renderChartToggles();
    renderChart();
    renderDistrictMap();
    renderDistributionChart();
    renderEventLog();
    renderTables();
  }

  function renderStatusBar() {
    const m = state ? state.history[state.history.length - 1] : null;
    document.getElementById('status-tick').textContent = m ? m.tick : '-';
    document.getElementById('status-pop').textContent = m ? m.population : '-';
    document.getElementById('status-gdp').textContent = m ? formatNumber(m.gdp) : '-';
    document.getElementById('status-unemployment').textContent = m ? m.unemployment_rate + '%' : '-';
    document.getElementById('status-satisfaction').textContent = m ? m.avg_satisfaction : '-';
    document.getElementById('status-status').textContent = state ? state.status : 'editing';
  }

  function formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
  }

  function renderChartToggles() {
    const container = document.getElementById('chart-toggles');
    container.innerHTML = '';

    const allActive = Object.keys(SERIES_CONFIG).every(k => activeSeries.has(k));
    const toggleAllBtn = document.createElement('button');
    toggleAllBtn.className = 'chart-toggle';
    toggleAllBtn.id = 'chart-toggle-all';
    toggleAllBtn.textContent = allActive ? '隐藏全部' : '全部显示';
    toggleAllBtn.style.borderColor = '#6b7280';
    toggleAllBtn.style.color = '#6b7280';
    toggleAllBtn.style.background = '#fff';
    toggleAllBtn.addEventListener('click', () => {
      if (allActive) {
        activeSeries.clear();
      } else {
        Object.keys(SERIES_CONFIG).forEach(k => activeSeries.add(k));
      }
      renderChartToggles();
      renderChart();
    });
    container.appendChild(toggleAllBtn);

    Object.entries(SERIES_CONFIG).forEach(([key, cfg]) => {
      const btn = document.createElement('button');
      btn.className = 'chart-toggle ' + (activeSeries.has(key) ? 'active' : '');
      btn.dataset.series = key;
      btn.textContent = cfg.label;
      btn.style.borderColor = cfg.color;
      btn.style.color = activeSeries.has(key) ? '#fff' : cfg.color;
      btn.style.background = activeSeries.has(key) ? cfg.color : '#fff';
      container.appendChild(btn);
    });
  }

  function renderChart() {
    if (typeof Chart === 'undefined') {
      document.getElementById('chart-container').innerHTML = '<div class="empty-state">Chart.js 加载失败，请检查网络连接后刷新</div>';
      return;
    }
    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = state ? state.history.map(h => h.tick) : [];
    const datasets = Object.entries(SERIES_CONFIG)
      .filter(([key]) => activeSeries.has(key))
      .map(([key, cfg]) => ({
        label: cfg.label,
        data: state ? state.history.map(h => h[key]) : [],
        borderColor: cfg.color,
        backgroundColor: cfg.color + '20',
        yAxisID: cfg.axis,
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      }));

    try {
      if (!window._popChart) {
        window._popChart = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { title: { display: true, text: 'Tick' } },
              y: { type: 'linear', position: 'left', title: { display: true, text: '绝对值' } },
              y1: { type: 'linear', position: 'right', title: { display: true, text: '百分比 / 指数' }, grid: { drawOnChartArea: false } },
            },
            plugins: { legend: { display: false } },
          },
        });
      } else {
        window._popChart.data.labels = labels;
        window._popChart.data.datasets = datasets;
        window._popChart.update('none');
      }
    } catch (err) {
      console.error('图表渲染失败', err);
    }
  }

  function renderDistrictMap() {
    const canvas = document.getElementById('district-map');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!state || state.districts.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据，请先重置', rect.width / 2, rect.height / 2);
      return;
    }

    const districts = state.districts;
    const cols = Math.ceil(Math.sqrt(districts.length));
    const rows = Math.ceil(districts.length / cols);
    const pad = 10;
    const cellW = (rect.width - pad * (cols + 1)) / cols;
    const cellH = (rect.height - pad * (rows + 1)) / rows;

    const values = districts.map(d => d[mapMetric]);
    const min = Math.min(...values);
    const max = Math.max(...values, min + 1);

    districts.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad);
      const y = pad + row * (cellH + pad);
      const t = (d[mapMetric] - min) / (max - min);
      ctx.fillStyle = interpolateColor('#e0f2fe', '#0369a1', t);
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.name, x + cellW / 2, y + 20);
      ctx.font = '11px sans-serif';
      ctx.fillText(formatMetric(mapMetric, d[mapMetric]), x + cellW / 2, y + 38);
    });

    document.getElementById('map-min').textContent = formatMetric(mapMetric, min);
    document.getElementById('map-max').textContent = formatMetric(mapMetric, max);
  }

  function formatMetric(metric, value) {
    if (metric === 'population') return value.toLocaleString();
    if (metric === 'avgWage') return '¥' + value.toLocaleString();
    if (metric === 'housingCost') return '¥' + value.toLocaleString();
    if (metric === 'vacancyRate') return (value * 100).toFixed(1) + '%';
    if (metric === 'satisfaction') return value.toFixed(1);
    return value.toFixed(2);
  }

  function interpolateColor(a, b, t) {
    const ah = parseInt(a.slice(1, 3), 16), bh = parseInt(b.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16), bg = parseInt(b.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ah + (bh - ah) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function renderDistributionChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('distribution-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!state) {
      if (window._distChart) { window._distChart.destroy(); window._distChart = null; }
      return;
    }

    let labels, data, label, color;
    if (distMode === 'wealth') {
      const bins = 10;
      const values = state.pops.map(p => p.wealth);
      const min = Math.min(...values, 0);
      const max = Math.max(...values, min + 1);
      const step = (max - min) / bins;
      const counts = new Array(bins).fill(0);
      state.pops.forEach(p => {
        const idx = Math.min(bins - 1, Math.floor((p.wealth - min) / step));
        counts[idx] += p.size;
      });
      labels = counts.map((_, i) => `${Math.round(min + i * step).toLocaleString()}-${Math.round(min + (i + 1) * step).toLocaleString()}`);
      data = counts;
      label = '财富分布';
      color = '#7c3aed';
    } else {
      const counts = {};
      SIM.PROFESSION_ORDER.forEach(p => counts[p] = 0);
      state.pops.forEach(p => counts[p.profession] = (counts[p.profession] || 0) + p.size);
      labels = SIM.PROFESSION_ORDER.map(p => SIM.PROFESSIONS[p].label);
      data = SIM.PROFESSION_ORDER.map(p => counts[p]);
      label = '职业结构';
      color = '#0891b2';
    }

    try {
      if (!window._distChart) {
        window._distChart = new Chart(ctx, {
          type: 'bar',
          data: { labels, datasets: [{ label, data, backgroundColor: color }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
        });
      } else {
        window._distChart.data.labels = labels;
        window._distChart.data.datasets = [{ label, data, backgroundColor: color }];
        window._distChart.update('none');
      }
    } catch (err) {
      console.error('分布图渲染失败', err);
    }
  }

  function renderEventLog() {
    const log = document.getElementById('event-log');
    if (!state || state.events.length === 0) {
      log.innerHTML = '<div class="empty-state">暂无事件</div>';
      return;
    }
    const filter = document.getElementById('event-filter').value;
    const events = [...state.events].reverse().filter(e => filter === 'all' || e.type === filter).slice(0, 50);
    log.innerHTML = events.map(e => `<div class="event-item"><span class="tick">[tick ${e.tick}]</span>${e.message}</div>`).join('');
  }

  function renderTables() {
    if (!state) {
      document.getElementById('pop-table-body').innerHTML = '';
      document.getElementById('firm-table-body').innerHTML = '';
      return;
    }
    const popBody = document.getElementById('pop-table-body');
    popBody.innerHTML = state.pops
      .sort((a, b) => b.size - a.size)
      .slice(0, 30)
      .map(p => {
        const d = state.districts.find(x => x.id === p.districtId);
        return `<tr>
          <td>${SIM.PROFESSIONS[p.profession].label}</td>
          <td>${p.size}</td>
          <td>${d ? d.name : '-'}</td>
          <td>¥${p.income_per_capita.toLocaleString()}</td>
          <td>¥${Math.round(p.wealth).toLocaleString()}</td>
          <td>${p.satisfaction.toFixed(1)}</td>
          <td>${(p.unemployed_count / p.size * 100).toFixed(1)}%</td>
        </tr>`;
      }).join('');

    const firmBody = document.getElementById('firm-table-body');
    firmBody.innerHTML = state.firms
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 30)
      .map(f => {
        const d = state.districts.find(x => x.id === f.districtId);
        const g = state.goods.find(x => x.id === f.good);
        return `<tr class="${f.active ? '' : 'inactive-firm'}">
          <td>${f.name}${f.active ? '' : '（已退出）'}</td>
          <td>${d ? d.name : '-'}</td>
          <td>${g ? g.name : '-'}</td>
          <td>${f.employees}/${f.targetEmployees}</td>
          <td>¥${f.wage.toLocaleString()}</td>
          <td>${f.output.toLocaleString()}</td>
          <td>¥${Math.round(f.profit).toLocaleString()}</td>
        </tr>`;
      }).join('');
  }

  // ==================== 导入导出 ====================

  function exportConfig() {
    if (!state) return alert('请先生成城市状态');
    downloadJson(SIM.exportConfig(state), 'pop-simulator-config.json');
  }

  function exportState() {
    if (!state) return alert('请先生成城市状态');
    downloadJson(SIM.exportState(state), 'pop-simulator-state.json');
  }

  function downloadJson(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { params, seed } = SIM.importConfig(ev.target.result);
        currentParams = params;
        document.getElementById('seed-input').value = seed || '';
        updateParamInputs();
        updatePresetLabel();
        validateAndRenderErrors();
        alert('配置已导入，点击「重置」生效');
      } catch (err) {
        alert('配置文件格式错误：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function importState(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        state = SIM.importState(ev.target.result);
        currentParams = { ...state.params };
        document.getElementById('seed-input').value = state.seed || '';
        updateParamInputs();
        updatePresetLabel();
        updateControls();
        renderAll();
      } catch (err) {
        alert('状态文件格式错误：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // 启动
  window.addEventListener('DOMContentLoaded', init);
})();
