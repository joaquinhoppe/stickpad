/* Finance: compound, loan, NPV/IRR, options, Monte Carlo, FIRE, budget, portfolio */
const money2 = n => fmt(n, 2);
const lineCfg = (labels, sets, title, stacked) => ({
  type: 'line', data: { labels, datasets: sets.map((s, k) => ({ borderColor: PAL[k], backgroundColor: PAL[k] + '33', pointRadius: 0, borderWidth: 2, tension: .2, fill: s.fill, ...s })) },
  options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { title: { display: !!title, text: title } }, scales: { y: { stacked: !!stacked } } },
});
const Calc = {
  props: { title: String, desc: String, loading: Boolean },
  template: `<div class="card"><h2>{{$t(title)}}</h2><p class="muted small" v-if="desc">{{$t(desc)}}</p><slot/><sk-result v-if="loading"/></div>`,
};
const FIELDS = {
  template: `<div class="form"><label class="f" v-for="(f,k) in fields" :key="k">{{ $t(f[0]) }}<input type="number" step="any" v-model.number="m[k]" @keyup.enter="$emit('go')"></label></div>`,
  props: ['m', 'fields'], emits: ['go'],
};

const Compound = {
  components: { Calc, FIELDS },
  template: `<Calc :loading="!rows.length" :title="$t('Compound growth')" desc="Grow a lump sum plus monthly savings; compare nominal vs inflation-adjusted value.">
    <FIELDS :m="m" :fields="F" @go="run"/><button class="pri" @click="run">{{ $t('Calculate') }}</button>
    <div v-if="rows.length"><div class="grid g4" style="margin:10px 0">
      <div class="tile"><div class="v">{{money(last.balance)}}</div><div class="l">{{ $t('final balance') }}</div></div>
      <div class="tile"><div class="v">{{money(last.contributed)}}</div><div class="l">{{ $t('you contributed') }}</div></div>
      <div class="tile"><div class="v good">{{money(last.interest)}}</div><div class="l">{{ $t('interest earned') }}</div></div>
      <div class="tile"><div class="v">{{money(last.real)}}</div><div class="l">{{ $t('in today\\'s money') }}</div></div></div>
      <chart-view :config="cfg" :height="300"/>
      <div class="muted small">{{ $t('Rule of 72: money doubles in ≈ {y} years at this rate.',{y: m.rate?fmt(72/m.rate,1):'∞'}) }}</div></div></Calc>`,
  setup() {
    const m = reactive({ principal: 5000, monthly: 300, rate: 7, years: 25, inflation: 2.5, freq: 12 }), rows = ref([]);
    const F = { principal: ['Start amount'], monthly: ['Monthly saving'], rate: ['Annual return %'], years: ['Years'], inflation: ['Inflation %'], freq: ['Compounds / year'] };
    const run = async () => { rows.value = (await api('finance/compound', 'POST', m)).rows; };
    const last = computed(() => rows.value[rows.value.length - 1] || {});
    const cfg = computed(() => lineCfg(rows.value.map(r => r.year), [{ label: T('Balance'), data: rows.value.map(r => r.balance), fill: true }, { label: T('Contributed'), data: rows.value.map(r => r.contributed) }, { label: T('Real (inflation-adj.)'), data: rows.value.map(r => r.real), borderDash: [5, 4] }]));
    onMounted(run); return { m, F, rows, run, last, cfg, money, fmt };
  },
};
const Loan = {
  components: { Calc, FIELDS },
  template: `<Calc :loading="!r" :title="$t('Loan / mortgage amortization')" desc="See how extra payments cut interest and time.">
    <FIELDS :m="m" :fields="F" @go="run"/><button class="pri" @click="run">{{ $t('Calculate') }}</button>
    <div v-if="r"><div class="grid g4" style="margin:10px 0">
      <div class="tile"><div class="v">{{money2(r.payment)}}</div><div class="l">{{ $t('monthly payment') }}</div></div>
      <div class="tile"><div class="v bad">{{money(r.total_interest)}}</div><div class="l">{{ $t('total interest') }}</div></div>
      <div class="tile"><div class="v">{{(r.months/12).toFixed(1)}} y</div><div class="l">{{ $t('payoff time') }}</div></div>
      <div class="tile"><div class="v">{{money(r.total_paid)}}</div><div class="l">{{ $t('total paid') }}</div></div></div>
      <chart-view :config="cfg" :height="280"/>
      <details><summary>{{ $t('Schedule') }} ({{r.rows.length}} {{ $t('months') }})</summary><div class="scroll"><table><tr><th>#</th><th class="r">{{ $t('Payment') }}</th><th class="r">{{ $t('Principal') }}</th><th class="r">{{ $t('Interest') }}</th><th class="r">{{ $t('Balance') }}</th></tr>
        <tr v-for="x in r.rows" :key="x.month"><td>{{x.month}}</td><td class="r">{{money2(x.payment)}}</td><td class="r">{{money2(x.principal)}}</td><td class="r">{{money2(x.interest)}}</td><td class="r">{{money2(x.balance)}}</td></tr></table></div></details></div></Calc>`,
  setup() {
    const m = reactive({ amount: 250000, rate: 4.2, years: 25, extra: 0 }), r = ref(null);
    const F = { amount: ['Loan amount'], rate: ['Interest % / yr'], years: ['Years'], extra: ['Extra / month'] };
    const run = async () => { r.value = await api('finance/loan', 'POST', m); };
    const cfg = computed(() => r.value && lineCfg(r.value.rows.map(x => x.month), [{ label: T('Remaining balance'), data: r.value.rows.map(x => x.balance), fill: true }, { label: T('Interest / month'), data: r.value.rows.map(x => x.interest) }]));
    onMounted(run); return { m, F, r, run, cfg, money, money2 };
  },
};
const Npv = {
  components: { Calc },
  template: `<Calc :loading="!r" :title="$t('NPV · IRR · Payback')" desc="Evaluate a project: enter cash flows per period (first value is usually the negative investment).">
    <div class="form"><label class="f">{{ $t('Cash flows (comma separated)') }}<input v-model="flows" class="mono"></label>
    <label class="f">{{ $t('Discount rate %') }}<input type="number" step="any" v-model.number="rate"></label></div>
    <button class="pri" @click="run">{{ $t('Calculate') }}</button>
    <div v-if="r" class="grid g3" style="margin-top:10px">
      <div class="tile"><div class="v" :class="r.npv>=0?'good':'bad'">{{money2(r.npv)}}</div><div class="l">NPV — {{ r.npv>=0 ? $t('accept') : $t('reject') }}</div></div>
      <div class="tile"><div class="v">{{r.irr==null?'n/a':r.irr+'%'}}</div><div class="l">{{ $t('IRR') }}</div></div>
      <div class="tile"><div class="v">{{r.payback==null?'never':r.payback+' periods'}}</div><div class="l">{{ $t('payback') }}</div></div></div></Calc>`,
  setup() {
    const flows = ref('-10000, 3000, 4000, 4500, 3500'), rate = ref(8), r = ref(null);
    const run = async () => { r.value = await api('finance/npv', 'POST', { flows: flows.value.split(/[,;\s]+/).filter(Boolean).map(Number), rate: rate.value }); };
    onMounted(run); return { flows, rate, r, run, money2 };
  },
};
const Options = {
  components: { Calc, FIELDS },
  template: `<Calc :loading="!r" :title="$t('Black–Scholes option pricing')" desc="European call/put prices, Greeks and profit-at-expiry curves.">
    <FIELDS :m="m" :fields="F" @go="run"/><button class="pri" @click="run">{{ $t('Price') }}</button><span class="bad small"> {{err}}</span>
    <div v-if="r"><div class="grid g4" style="margin:10px 0">
      <div class="tile"><div class="v">{{r.call}}</div><div class="l">{{ $t('call price') }}</div></div><div class="tile"><div class="v">{{r.put}}</div><div class="l">{{ $t('put price') }}</div></div>
      <div class="tile"><div class="v">{{r.delta_call}}</div><div class="l">{{ $t('delta call') }} · {{ $t('put') }} {{r.delta_put}}</div></div>
      <div class="tile"><div class="v">{{r.gamma}}</div><div class="l">{{ $t('Γ gamma') }}</div></div>
      <div class="tile"><div class="v">{{r.vega}}</div><div class="l">{{ $t('vega (per 1% vol)') }}</div></div><div class="tile"><div class="v">{{r.theta_call}}</div><div class="l">{{ $t('θ call / day') }}</div></div></div>
      <chart-view :config="cfg" :height="260"/></div></Calc>`,
  setup() {
    const m = reactive({ S: 100, K: 100, T: 1, r: 4, sigma: 20, q: 0 }), r = ref(null), err = ref('');
    const F = { S: ['Spot price'], K: ['Strike'], T: ['Years to expiry'], r: ['Risk-free %'], sigma: ['Volatility %'], q: ['Dividend yield %'] };
    const run = async () => { try { err.value = ''; r.value = await api('finance/blackscholes', 'POST', m); } catch (e) { err.value = e.message; } };
    const cfg = computed(() => r.value && lineCfg(r.value.payoff.map(p => p.S), [{ label: T('Long call P/L'), data: r.value.payoff.map(p => p.call) }, { label: T('Long put P/L'), data: r.value.payoff.map(p => p.put) }], T('Profit at expiry vs. underlying price')));
    onMounted(run); return { m, F, r, run, cfg, err };
  },
};
const MonteCarlo = {
  components: { Calc, FIELDS },
  template: `<Calc :loading="!r" :title="$t('Monte Carlo portfolio simulation')" desc="Thousands of random market paths (geometric Brownian motion) show the RANGE of outcomes, not just one average.">
    <FIELDS :m="m" :fields="F" @go="run"/><button class="pri" @click="run">{{ $t('Simulate') }}</button>
    <div v-if="r"><div class="grid g4" style="margin:10px 0">
      <div class="tile"><div class="v">{{money(r.median)}}</div><div class="l">{{ $t('median outcome') }}</div></div>
      <div class="tile"><div class="v bad">{{money(r.bands[r.bands.length-1].p10)}}</div><div class="l">{{ $t('bad luck (10th pct)') }}</div></div>
      <div class="tile"><div class="v good">{{money(r.bands[r.bands.length-1].p90)}}</div><div class="l">{{ $t('good luck (90th pct)') }}</div></div>
      <div class="tile" v-if="r.prob_target!=null"><div class="v">{{r.prob_target}}%</div><div class="l">{{ $t('chance to reach target') }}</div></div></div>
      <chart-view :config="cfg" :height="320"/></div></Calc>`,
  setup() {
    const m = reactive({ principal: 10000, monthly: 500, years: 25, mean: 7, vol: 15, paths: 1000, target: 500000 }), r = ref(null);
    const F = { principal: ['Start amount'], monthly: ['Monthly saving'], years: ['Years'], mean: ['Expected return %'], vol: ['Volatility %'], paths: ['Simulations'], target: ['Target (optional)'] };
    const run = async () => { r.value = await api('finance/montecarlo', 'POST', { ...m, seed: Math.random() }); };
    const cfg = computed(() => r.value && lineCfg(r.value.bands.map(b => b.year), [
      { label: T('90th pct'), data: r.value.bands.map(b => b.p90), borderColor: '#59a14f', fill: false },
      { label: T('75th'), data: r.value.bands.map(b => b.p75), borderColor: '#9bd3a8', borderDash: [4, 4] },
      { label: T('Median'), data: r.value.bands.map(b => b.p50), borderColor: '#4e79a7', borderWidth: 3 },
      { label: T('25th'), data: r.value.bands.map(b => b.p25), borderColor: '#f3b48a', borderDash: [4, 4] },
      { label: T('10th pct'), data: r.value.bands.map(b => b.p10), borderColor: '#e15759' },
    ], T('Portfolio value range by year')));
    onMounted(run); return { m, F, r, run, cfg, money };
  },
};
const Fire = {
  components: { Calc, FIELDS },
  template: `<Calc :loading="!r" :title="$t('Financial independence (FIRE)')" desc="Target = annual spending ÷ safe withdrawal rate (4% → 25× expenses).">
    <FIELDS :m="m" :fields="F" @go="run"/><button class="pri" @click="run">{{ $t('Calculate') }}</button>
    <div v-if="r"><div class="grid g3" style="margin:10px 0"><div class="tile"><div class="v">{{money(r.target)}}</div><div class="l">{{ $t('number you need') }}</div></div>
      <div class="tile"><div class="v">{{r.years??'100+'}} {{ $t('years') }}</div><div class="l">{{ $t('until independence') }}</div></div>
      <div class="tile"><div class="v">{{m.annual_spend?fmt(m.annual_saving/(m.annual_saving+m.annual_spend)*100,0):0}}%</div><div class="l">{{ $t('savings rate (of income)') }}</div></div></div>
      <chart-view :config="cfg" :height="260"/></div></Calc>`,
  setup() {
    const m = reactive({ savings: 20000, annual_saving: 12000, rate: 6, annual_spend: 24000, swr: 4 }), r = ref(null);
    const F = { savings: ['Current savings'], annual_saving: ['Saved per year'], rate: ['Return %'], annual_spend: ['Spend per year'], swr: ['Withdrawal %'] };
    const run = async () => { r.value = await api('finance/fire', 'POST', m); };
    const cfg = computed(() => r.value && lineCfg(r.value.rows.map(x => x.year), [{ label: T('Portfolio'), data: r.value.rows.map(x => x.balance), fill: true }, { label: T('FI target'), data: r.value.rows.map(x => x.target), borderDash: [6, 4] }]));
    onMounted(run); return { m, F, r, run, cfg, money, fmt };
  },
};
const Budget = {
  components: { Calc },
  template: `<div><Calc :title="$t('Income & expenses')">
    <div class="form"><label class="f">{{ $t('Date') }}<input type="date" v-model="t.date"></label><label class="f">{{ $t('Description') }}<input v-model="t.description"></label>
      <label class="f">{{ $t('Amount (− expense)') }}<input type="number" step="any" v-model.number="t.amount" @keyup.enter="add"></label>
      <label class="f">{{ $t('Category') }}<input v-model="t.category" list="cats"></label><datalist id="cats"><option v-for="c in cats">{{c}}</option></datalist></div>
    <div class="row"><button class="pri" @click="add">{{ $t('Add') }}</button><label class="small">{{ $t('CSV import') }} <input type="file" accept=".csv" @change="imp"></label>
      <span class="muted small">{{ $t('columns: date, description, amount, category') }}</span></div></Calc>
    <div class="grid g2" v-if="sum"><div class="card"><chart-view :config="cfgM" :height="260"/></div><div class="card"><chart-view :config="cfgC" :height="260"/></div></div>
    <div class="grid g2" v-else><div class="card"><sk h="260px"/></div><div class="card"><sk h="260px"/></div></div>
    <Calc :title="$t('Transactions · balance')+' '+money2(sum&&sum.balance)"><div class="row"><input v-model="f" :placeholder="$t('filter…')"><span class="muted small">{{shown.length}} {{ $t('items') }}</span></div>
      <div class="scroll"><table><tr><th>{{ $t('Date') }}</th><th>{{ $t('Description') }}</th><th>{{ $t('Category') }}</th><th class="r">{{ $t('Amount') }}</th><th></th></tr>
        <tr v-for="x in shown" :key="x.id">
          <template v-if="ed!==x.id"><td>{{x.date}}</td><td>{{x.description}}</td><td><span class="pill">{{x.category}}</span></td><td class="r" :class="x.amount<0?'bad':'good'">{{money2(x.amount)}}</td>
            <td style="white-space:nowrap"><button class="sm" @click="edit(x)">{{ $t('Edit') }}</button> <button class="sm danger" @click="del(x)">×</button></td></template>
          <template v-else><td><input type="date" v-model="draft.date"></td><td><input v-model="draft.description"></td><td><input v-model="draft.category"></td><td><input type="number" step="any" v-model.number="draft.amount" style="width:100px" @keyup.enter="saveEd(x)"></td>
            <td style="white-space:nowrap"><button class="sm pri" @click="saveEd(x)">{{ $t('Save') }}</button> <button class="sm" @click="ed=null">{{ $t('Cancel') }}</button></td></template></tr></table></div></Calc></div>`,
  setup() {
    const t = reactive({ date: today(), description: '', amount: null, category: '' }), f = ref(''), sum = ref(null);
    const refresh = async () => { sum.value = await api('finance/summary'); };
    const cats = computed(() => [...new Set(S.txn.map(x => x.category))]);
    const shown = computed(() => [...S.txn].filter(x => !f.value || JSON.stringify(x).toLowerCase().includes(f.value.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300));
    const add = async () => { if (t.amount == null) return; await saveDoc('txn', { ...t, category: t.category || 'other' }); t.description = ''; t.amount = null; refresh(); };
    const del = async x => { await removeDoc('txn', x.id); refresh(); };
    const ed = ref(null), draft = reactive({ date: '', description: '', category: '', amount: 0 });
    const edit = x => { ed.value = x.id; Object.assign(draft, { date: x.date, description: x.description, category: x.category, amount: x.amount }); };
    const saveEd = async x => { await saveDoc('txn', { ...x, ...draft }); ed.value = null; refresh(); toast(T('Saved')); };
    const imp = async e => { const r = await api('finance/import-csv', 'POST', await e.target.files[0].text()); await load(['txn']); refresh(); toast(T('{n} imported', { n: r.imported })); };
    const cfgM = computed(() => sum.value && ({ type: 'bar', data: { labels: sum.value.months.map(m => m.month), datasets: [{ label: T('Income'), data: sum.value.months.map(m => m.income), backgroundColor: '#59a14f' }, { label: T('Expenses'), data: sum.value.months.map(m => m.expense), backgroundColor: '#e15759' }, { type: 'line', label: T('Net'), data: sum.value.months.map(m => m.income - m.expense), borderColor: '#4e79a7' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: T('Monthly cash flow') } } } }));
    const cfgC = computed(() => sum.value && ({ type: 'doughnut', data: { labels: sum.value.categories.map(c => c.name), datasets: [{ data: sum.value.categories.map(c => c.total), backgroundColor: PAL }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: T('Spending by category') } } } }));
    onMounted(refresh); watch(() => S.txn.length, refresh);
    return { ed, draft, edit, saveEd, t, f, sum, cats, shown, add, del, imp, cfgM, cfgC, money2 };
  },
};
const Portfolio = {
  components: { Calc },
  template: `<Calc :title="$t('Portfolio tracker')" desc="Holdings with live prices from your own free API key (Finnhub, Alpha Vantage or Twelve Data). Without a key you can type prices by hand.">
    <div class="apibox">
      <div class="row sp"><div class="row"><b>{{ $t('Market data provider') }}</b>
        <span class="pill" :class="cfg.has_key ? 'st-ok' : 'st-neglected'">{{ cfg.has_key ? $t('Connected') + ' · ' + cfg.key_hint : $t('No API key') }}</span></div>
        <button class="sm" @click="showApi=!showApi">{{ showApi ? $t('Hide') : $t('API settings') }}</button></div>
      <div v-if="showApi" style="margin-top:12px">
        <div class="form">
          <label class="f">{{ $t('Provider') }}<select v-model="form.provider"><option v-for="(v,k) in cfg.providers" :key="k" :value="k">{{v.name}}</option></select></label>
          <label class="f">{{ $t('API key') }}<input type="password" autocomplete="off" v-model="form.key" :placeholder="cfg.has_key && form.provider===cfg.provider ? cfg.key_hint : $t('Paste your API key')" @keyup.enter="saveKey"></label>
        </div>
        <div class="row"><button class="pri" @click="saveKey" :disabled="busy">{{ busy ? $t('Testing…') : $t('Save & test') }}</button>
          <button class="danger" v-if="cfg.has_key" @click="clearKey">{{ $t('Remove key') }}</button>
          <a v-if="info.url" :href="info.url" target="_blank" rel="noopener noreferrer">{{ $t('Get a free key') }} ↗</a></div>
        <p v-if="testMsg" class="small" :class="testOk ? 'good' : 'bad'" style="margin:10px 0 0">{{testMsg}}</p>
        <p class="muted small" style="margin:10px 0 0">{{ $t('Your key is stored only in this computer\\'s local database and is sent only to the provider you choose. It is never included in exports.') }}
          <span v-if="info.history===false"> {{ $t('This provider\\'s free plan has quotes only; use Alpha Vantage or Twelve Data for price history.') }}</span>
          {{ $t('Use US tickers like AAPL; other markets depend on the provider (e.g. SAP.DEX on Alpha Vantage, SAP.DE on Twelve Data).') }}</p>
      </div>
    </div>
    <div class="form"><label class="f">{{ $t('Symbol') }}<input v-model="h.symbol"></label><label class="f">{{ $t('Shares') }}<input type="number" step="any" v-model.number="h.shares"></label><label class="f">{{ $t('Avg cost') }}<input type="number" step="any" v-model.number="h.cost" @keyup.enter="add"></label></div>
    <div class="row"><button class="pri" @click="add">{{ $t('Add holding') }}</button><button @click="fetchQ">{{ $t('Refresh prices') }}</button><span class="muted small">{{msg}}</span></div>
    <table style="margin-top:10px"><tr><th>{{ $t('Symbol') }}</th><th class="r">{{ $t('Shares') }}</th><th class="r">{{ $t('Cost') }}</th><th class="r">{{ $t('Price') }}</th><th class="r">{{ $t('Value') }}</th><th class="r">P/L</th><th></th></tr>
      <tr v-for="x in S.holding" :key="x.id"><td><b>{{x.symbol}}</b> <button class="sm" @click="hist(x.symbol)">{{ $t('chart') }}</button></td><td class="r"><input type="number" step="any" :value="x.shares" style="width:80px" @change="upd(x,'shares',$event.target.value)"></td><td class="r"><input type="number" step="any" :value="x.cost" style="width:90px" @change="upd(x,'cost',$event.target.value)"></td>
        <td class="r"><input type="number" step="any" v-model.number="px[x.symbol]" style="width:90px" :title="$t('override price manually')"></td>
        <td class="r">{{money2(val(x))}}</td><td class="r" :class="pl(x)>=0?'good':'bad'">{{money2(pl(x))}} ({{x.cost?fmt(pl(x)/(x.cost*x.shares)*100,1):0}}%)</td><td><button class="sm danger" @click="removeDoc('holding',x.id)">×</button></td></tr>
      <tr><th colspan="4">{{ $t('Total') }}</th><th class="r">{{money2(total)}}</th><th class="r" :class="plTotal>=0?'good':'bad'">{{money2(plTotal)}}</th><th></th></tr></table>
    <div class="grid g2" style="margin-top:10px"><chart-view v-if="alloc" :config="alloc" :height="240"/><chart-view v-if="hcfg" :config="hcfg" :height="240"/></div></Calc>`,
  setup() {
    const h = reactive({ symbol: '', shares: 1, cost: 0 }), px = reactive({}), msg = ref(''), hcfg = ref(null);
    const val = x => (px[x.symbol] || x.cost) * x.shares, pl = x => (px[x.symbol] ? (px[x.symbol] - x.cost) * x.shares : 0);
    const total = computed(() => S.holding.reduce((a, x) => a + val(x), 0)), plTotal = computed(() => S.holding.reduce((a, x) => a + pl(x), 0));
    const alloc = computed(() => S.holding.length ? ({ type: 'doughnut', data: { labels: S.holding.map(x => x.symbol), datasets: [{ data: S.holding.map(val), backgroundColor: PAL }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: T('Allocation') } } } }) : null);
    const upd = async (x, k, v) => { await saveDoc('holding', { ...x, [k]: parseFloat(v) || 0 }); };
    const add = async () => { if (!h.symbol) return; await saveDoc('holding', { ...h, symbol: h.symbol.toUpperCase() }); h.symbol = ''; };
    const cfg = ref({ provider: '', has_key: false, key_hint: '', providers: {} }), form = reactive({ provider: 'finnhub', key: '' });
    const showApi = ref(false), busy = ref(false), testMsg = ref(''), testOk = ref(false);
    const info = computed(() => cfg.value.providers[form.provider] || {});
    const loadCfg = async () => { cfg.value = await api('settings'); form.provider = cfg.value.provider || form.provider; };
    const saveKey = async () => {
      const key = form.key.trim(), same = form.provider === cfg.value.provider && cfg.value.has_key;
      if (!key && !same) { testOk.value = false; testMsg.value = T('Paste the API key for this provider first.'); return; }
      busy.value = true; testMsg.value = '';
      try {
        const t = await api('settings/test', 'POST', { provider: form.provider, key });
        if (!t.ok) { testOk.value = false; testMsg.value = T('The provider rejected it: ') + t.error; return; }
        cfg.value = await api('settings', 'PUT', { provider: form.provider, key });
        form.key = ''; testOk.value = true; testMsg.value = T('Connected. Test quote: AAPL = {p}', { p: t.sample.price });
        showApi.value = false; fetchQ();
      } catch (e) { testOk.value = false; testMsg.value = e.message; } finally { busy.value = false; }
    };
    const clearKey = async () => { if (!confirm(T('Remove the saved API key?'))) return; cfg.value = await api('settings', 'PUT', { clear: true }); msg.value = ''; testMsg.value = ''; showApi.value = true; toast(T('API key removed')); };
    const fetchQ = async () => {
      if (!S.holding.length) return;
      if (!cfg.value.has_key) { msg.value = T('Add an API key (API settings) to fetch live prices, or type prices manually.'); return; }
      msg.value = T('loading…');
      let r; try { r = await api('quote?symbols=' + S.holding.map(x => x.symbol).join(',')); } catch (e) { msg.value = e.message; return; }
      let bad = 0, why = ''; for (const [k, v] of Object.entries(r)) { if (v.price) px[k] = v.price; else { bad++; why = why || v.error; } }
      msg.value = bad ? T('{n} symbols failed: {e}. You can type prices manually.', { n: bad, e: why }) : T('updated') + ' ' + new Date().toLocaleTimeString();
    };
    const hist = async s => {
      try { const r = await api('history?symbol=' + s); const base = r[0].close; hcfg.value = lineCfg(r.map(x => x.date), [{ label: s + ' close', data: r.map(x => x.close), fill: true }], s + ' — ' + T('last {n} trading days', { n: r.length })); }
      catch (e) { toast(T('No history: ') + e.message); }
    };
    onMounted(async () => { await loadCfg(); showApi.value = !cfg.value.has_key; fetchQ(); });
    return { cfg, form, info, showApi, busy, testMsg, testOk, saveKey, clearKey, upd, S, h, px, msg, val, pl, total, plTotal, alloc, add, fetchQ, hist, hcfg, removeDoc, money2, fmt };
  },
};
Views.finance = {
  components: { Compound, Loan, Npv, Options, MonteCarlo, Fire, Budget, Portfolio },
  template: `<div><h1>{{ $t('Finance') }}</h1><div class="tabs"><button v-for="t in tabs" :key="t[0]" :class="{on:tab===t[0]}" @click="tab=t[0]">{{ $t(t[1]) }}</button></div>
    <component :is="tab"/></div>`,
  setup() {
    const tabs = [['Compound', 'Compound'], ['Budget', 'Budget'], ['Portfolio', 'Portfolio'], ['Loan', 'Loan'], ['Npv', 'NPV/IRR'], ['MonteCarlo', 'Monte Carlo'], ['Fire', 'FIRE'], ['Options', 'Options']];
    const tab = ref(localStorage.ftab || 'Compound'); watch(tab, v => localStorage.ftab = v);
    return { tabs, tab };
  },
};
