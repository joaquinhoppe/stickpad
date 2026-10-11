/* Lab: statistics, regression, normal distribution, grade planner, calculator */
const Stats = {
  template: `<div class="grid g2"><div class="card"><h2>{{ $t('Descriptive statistics') }}</h2>
    <textarea v-model="raw" rows="4" :placeholder="$t('Paste numbers separated by spaces, commas or new lines')"></textarea>
    <div class="row" style="margin:6px 0"><button class="pri" @click="run">{{ $t('Analyse') }}</button><button class="sm" @click="raw='12 15 11 18 20 14 13 17 19 16 30 12'">{{ $t('sample') }}</button><span class="bad small">{{err}}</span></div>
    <table v-if="r"><tr v-for="k in keys" :key="k[0]"><td>{{ $t(k[1]) }}</td><td class="r mono">{{fmt(r[k[0]],4)}}</td></tr>
      <tr><td>{{ $t('95% CI of mean') }}</td><td class="r mono">[{{fmt(r.ci95[0],3)}}, {{fmt(r.ci95[1],3)}}]</td></tr></table></div>
    <div class="card"><chart-view v-if="hist" :config="hist" :height="300"/><div v-else class="muted">{{ $t('Histogram appears here.') }}</div>
      <p v-if="r" class="small muted">{{ $t('Outlier fences (1.5·IQR):') }} {{fmt(r.q1-1.5*r.iqr)}} … {{fmt(r.q3+1.5*r.iqr)}}. {{ r.skew > 0.5 ? $t('Skew is right-tailed') : r.skew < -0.5 ? $t('Skew is left-tailed') : $t('Skew looks symmetric') }}.</p></div></div>`,
  setup() {
    const raw = ref(''), r = ref(null), err = ref('');
    const keys = [['n', 'Count'], ['sum', 'Sum'], ['mean', 'Mean'], ['median', 'Median'], ['mode', 'Mode'], ['stdev', 'Std deviation (sample)'], ['variance', 'Variance'], ['sem', 'Std error of mean'], ['min', 'Min'], ['q1', 'Q1'], ['q3', 'Q3'], ['max', 'Max'], ['iqr', 'IQR'], ['skew', 'Skewness']];
    const run = async () => { try { err.value = ''; r.value = await api('stats/describe', 'POST', { values: raw.value }); } catch (e) { err.value = e.message; r.value = null; } };
    const hist = computed(() => r.value && ({ type: 'bar', data: { labels: r.value.hist.labels, datasets: [{ label: T('frequency'), data: r.value.hist.counts, backgroundColor: '#4e79a7' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: T('Histogram') }, legend: { display: false } }, scales: { x: { categoryPercentage: 1, barPercentage: 1 } } } }));
    return { raw, r, err, keys, run, hist, fmt };
  },
};
const Regress = {
  template: `<div class="grid g2"><div class="card"><h2>{{ $t('Linear regression & correlation') }}</h2>
    <div class="form"><label class="f">{{ $t('X values') }}<textarea v-model="x" rows="3"></textarea></label><label class="f">{{ $t('Y values') }}<textarea v-model="y" rows="3"></textarea></label></div>
    <div class="row"><button class="pri" @click="run">{{ $t('Fit line') }}</button><button class="sm" @click="x='1 2 3 4 5 6 7 8';y='52 58 65 64 75 79 88 90'">{{ $t('sample') }}</button><span class="bad small">{{err}}</span></div>
    <div v-if="r" style="margin-top:10px"><div class="mono">y = {{fmt(r.slope,4)}}·x + {{fmt(r.intercept,4)}}</div>
      <table><tr><td>{{ $t('Correlation r') }}</td><td class="r mono">{{fmt(r.r,4)}}</td></tr><tr><td>R²</td><td class="r mono">{{fmt(r.r2,4)}}</td></tr><tr><td>{{ $t('Std error of estimate') }}</td><td class="r mono">{{fmt(r.std_error,4)}}</td></tr>
        <tr><td>{{ $t('t-statistic (slope)') }}</td><td class="r mono">{{fmt(r.t_stat,3)}}</td></tr></table>
      <div class="row" style="margin-top:6px">{{ $t('Predict y at x =') }} <input type="number" v-model.number="px" style="width:90px"> → <b>{{fmt(r.intercept+r.slope*px,3)}}</b></div></div></div>
    <div class="card"><chart-view v-if="cfg" :config="cfg" :height="320"/></div></div>`,
  setup() {
    const x = ref(''), y = ref(''), r = ref(null), err = ref(''), px = ref(10);
    const run = async () => { try { err.value = ''; r.value = await api('stats/regression', 'POST', { x: x.value, y: y.value }); } catch (e) { err.value = e.message; r.value = null; } };
    const cfg = computed(() => {
      if (!r.value) return null; const xs = x.value.split(/[\s,;]+/).filter(Boolean).map(Number), ys = y.value.split(/[\s,;]+/).filter(Boolean).map(Number);
      return { type: 'scatter', data: { datasets: [{ label: T('data'), data: xs.map((v, i) => ({ x: v, y: ys[i] })), backgroundColor: '#4e79a7', pointRadius: 5 }, { type: 'line', label: `${T('fit')} (R²=${r.value.r2.toFixed(3)})`, data: r.value.forecast, borderColor: '#e15759', pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false } };
    });
    return { x, y, r, err, px, run, cfg, fmt };
  },
};
const Normal = {
  template: `<div class="grid g2"><div class="card"><h2>{{ $t('Normal distribution') }}</h2>
    <div class="form"><label class="f">{{ $t('Mean μ') }}<input type="number" step="any" v-model.number="mu"></label><label class="f">{{ $t('Std dev σ') }}<input type="number" step="any" v-model.number="sd"></label>
      <label class="f">{{ $t('Value a') }}<input type="number" step="any" v-model.number="a"></label><label class="f">{{ $t('Value b') }}<input type="number" step="any" v-model.number="b"></label></div>
    <table><tr><td>{{ $t('z-score of a') }}</td><td class="r mono">{{fmt(za,3)}}</td></tr><tr><td>P(X ≤ a)</td><td class="r mono">{{fmt(FN.ncdf(za),5)}}</td></tr><tr><td>P(X ≥ a)</td><td class="r mono">{{fmt(1-FN.ncdf(za),5)}}</td></tr>
      <tr><td>P(a ≤ X ≤ b)</td><td class="r mono">{{fmt(Math.abs(FN.ncdf(zb)-FN.ncdf(za)),5)}}</td></tr></table>
    <p class="small muted">{{ $t('68–95–99.7 rule') }}: ±1σ = [{{fmt(mu-sd)}}, {{fmt(mu+sd)}}], ±2σ = [{{fmt(mu-2*sd)}}, {{fmt(mu+2*sd)}}]</p></div>
    <div class="card"><chart-view :config="cfg" :height="280"/></div></div>`,
  setup() {
    const mu = ref(100), sd = ref(15), a = ref(85), b = ref(115);
    const za = computed(() => (a.value - mu.value) / sd.value), zb = computed(() => (b.value - mu.value) / sd.value);
    const cfg = computed(() => {
      const lo = Math.min(a.value, b.value), hi = Math.max(a.value, b.value), pts = [], sh = [];
      for (let i = 0; i <= 120; i++) { const x = mu.value - 4 * sd.value + 8 * sd.value * i / 120, y = FN.npdf((x - mu.value) / sd.value) / sd.value; pts.push({ x, y }); sh.push({ x, y: x >= lo && x <= hi ? y : null }); }
      return { type: 'line', data: { datasets: [{ label: T('density'), data: pts, borderColor: '#4e79a7', pointRadius: 0 }, { label: 'P(a≤X≤b)', data: sh, fill: 'origin', backgroundColor: '#4e79a766', borderColor: 'transparent', pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, parsing: false, scales: { x: { type: 'linear' } } } };
    });
    return { mu, sd, a, b, za, zb, cfg, FN, fmt };
  },
};
const Grades = {
  template: `<div class="card"><h2>{{ $t('Grade planner') }}</h2><p class="muted small">{{ $t('Add graded components with weight (%) and your score; find the score needed on the remaining ones to hit your target.') }}</p>
    <table><tr><th>{{ $t('Component') }}</th><th>{{ $t('Weight %') }}</th><th>{{ $t('Score % (blank = not yet done)') }}</th><th></th></tr>
      <tr v-for="(g,i) in rows" :key="i"><td><input v-model="g.n"></td><td><input type="number" v-model.number="g.w" style="width:80px"></td><td><input type="number" v-model.number="g.s" style="width:100px"></td><td><button class="sm danger" @click="rows.splice(i,1)">×</button></td></tr></table>
    <div class="row" style="margin:8px 0"><button @click="rows.push({n:'',w:10,s:null})">{{ $t('＋ Row') }}</button><label>{{ $t('Target grade %') }} <input type="number" v-model.number="target" style="width:80px"></label></div>
    <div class="grid g3"><div class="tile"><div class="v">{{fmt(cur,1)}}%</div><div class="l">{{ $t('current (of {w}% weight graded)',{w:fmt(doneW,0)}) }}</div></div>
      <div class="tile"><div class="v" :class="need>100?'bad':''">{{need==null?'–':fmt(need,1)+'%'}}</div><div class="l">{{ $t('needed on remaining {w}%',{w:fmt(remW,0)}) }}</div></div>
      <div class="tile"><div class="v">{{fmt(weightedTotal,1)}}</div><div class="l">{{ $t('total weight (should be 100)') }}</div></div></div></div>`,
  setup() {
    const rows = reactive([{ n: T('Homework'), w: 20, s: 90 }, { n: T('Midterm'), w: 30, s: 72 }, { n: T('Final exam'), w: 50, s: null }]), target = ref(80);
    const done = computed(() => rows.filter(r => r.s != null && r.s !== '')), doneW = computed(() => done.value.reduce((a, r) => a + r.w, 0));
    const pts = computed(() => done.value.reduce((a, r) => a + r.w * r.s / 100, 0)), cur = computed(() => doneW.value ? pts.value / doneW.value * 100 : 0);
    const weightedTotal = computed(() => rows.reduce((a, r) => a + (r.w || 0), 0)), remW = computed(() => weightedTotal.value - doneW.value);
    const need = computed(() => remW.value > 0 ? (target.value - pts.value) / remW.value * 100 : null);
    return { rows, target, doneW, cur, remW, need, weightedTotal, fmt };
  },
};
const LabCalc = {
  template: `<div class="card"><h2>{{ $t('Scientific scratchpad') }}</h2><p class="muted small">{{ $t('Type a formula and press Enter. Use') }} <code>{{ $t('ans') }}</code> {{ $t('for the last result. Functions: sin cos tan ln log sqrt exp abs fact ncdf min max · constants pi e') }}</p>
    <input v-model="expr" @keyup.enter="go" class="mono" style="width:100%;font-size:18px" placeholder="1000*(1+0.05)^10">
    <div class="scroll" style="margin-top:8px"><div v-for="(h,i) in hist" :key="i" class="row sp mono" style="border-bottom:1px solid var(--line)" @click="expr=h.e"><span>{{h.e}}</span><b :class="{bad:h.err}">{{h.r}}</b></div></div></div>`,
  setup() {
    const expr = ref(''), hist = ref([]); let ans = 0;
    const go = () => {
      const e = expr.value.trim(); if (!e) return;
      try { const v = compileExpr(e, ['ans'])({ ans }); ans = v; hist.value.unshift({ e, r: +v.toPrecision(12) }); } catch (x) { hist.value.unshift({ e, r: x.message, err: true }); }
      expr.value = '';
    };
    return { expr, hist, go };
  },
};
Views.lab = {
  components: { Stats, Regress, Normal, Grades, CalcPad: LabCalc },
  template: `<div><h1>{{ $t('Lab') }}</h1><div class="tabs"><button v-for="t in tabs" :key="t[0]" :class="{on:tab===t[0]}" @click="tab=t[0]">{{ $t(t[1]) }}</button></div><component :is="tab"/></div>`,
  setup() { const tabs = [['Stats', 'Statistics'], ['Regress', 'Regression'], ['Normal', 'Normal dist.'], ['Grades', 'Grade planner'], ['CalcPad', 'Calculator']]; const tab = ref(localStorage.ltab || 'Stats'); watch(tab, v => localStorage.ltab = v); return { tabs, tab }; },
};
