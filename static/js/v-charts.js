Views.charts = {
  template: `
<div>
  <h1>{{ $t('Graphs') }}</h1>
  <div class="grid split-side">
    <div class="card">
      <button class="pri" @click="create" style="width:100%;margin-bottom:8px">{{ $t('＋ New graph') }}</button>
      <div v-for="c in S.chart" :key="c.id" class="nitem" :class="{on:cur&&cur.id===c.id}" @click="pick(c)">
        <div class="t">{{c.title||$t('Untitled')}}</div><div class="s">{{ $t(c.type) }}</div></div>
      <div v-if="!S.chart.length" class="muted small">{{ $t('No graphs yet.') }}</div>
    </div>
    <div v-if="cur">
      <div class="card">
        <div class="form">
          <label class="f">{{ $t('Title') }}<input v-model="cur.title"></label>
          <label class="f">{{ $t('Type') }}<select v-model="cur.type">
            <option v-for="t in types" :key="t" :value="t">{{ $t(t) }}</option></select></label>
          <label class="f" v-if="cur.type!=='pie'&&cur.type!=='doughnut'&&cur.type!=='radar'">{{ $t('X label') }}<input v-model="cur.xlabel"></label>
          <label class="f" v-if="cur.type!=='pie'&&cur.type!=='doughnut'&&cur.type!=='radar'">{{ $t('Y label') }}<input v-model="cur.ylabel"></label>
        </div>
        <div v-if="cur.type==='function'">
          <label class="f">{{ $t('Formulas in x (separate several with ;) — supports sin cos tan ln log sqrt exp abs ncdf pi e ^ …') }}
            <input v-model="cur.expr" class="mono" :placeholder="$t('sin(x); x^2/10; ncdf(x)')"></label>
          <div class="form" style="margin-top:8px"><label class="f">{{ $t('x min') }}<input type="number" v-model.number="cur.xmin"></label>
            <label class="f">{{ $t('x max') }}<input type="number" v-model.number="cur.xmax"></label></div>
        </div>
        <div v-else>
          <label class="f">{{ $t('Data (CSV / paste from Excel; first row = headers, first column = labels)') }}
            <textarea v-model="cur.data" rows="7" placeholder="Month,Sales,Costs&#10;Jan,10,6&#10;Feb,14,7"></textarea></label>
          <div class="row" style="margin-top:6px">
            <label class="row small"><input type="checkbox" v-model="cur.trend"> {{ $t('trend line') }}</label>
            <label class="row small" v-if="['bar','line','area'].includes(cur.type)"><input type="checkbox" v-model="cur.stacked"> {{ $t('stacked') }}</label>
            <label class="row small" v-if="['bar','line','area'].includes(cur.type)"><input type="checkbox" v-model="cur.logy"> {{ $t('log y') }}</label>
            <input type="file" accept=".csv,.tsv,.txt" @change="upload" class="small">
            <button class="sm" @click="sample">{{ $t('Insert sample') }}</button>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <button class="pri" @click="save">{{ $t('Save') }}</button><button @click="png">{{ $t('Download PNG') }}</button>
          <button @click="embed">{{ $t('Copy note embed') }}</button><button class="danger" @click="del">{{ $t('Delete') }}</button>
          <span class="error bad small">{{err}}</span>
        </div>
      </div>
      <div class="card"><chart-view v-if="cfg" ref="cv" :config="cfg" :height="380"></chart-view></div>
      <div class="card" v-if="colStats.length"><h2>{{ $t('Column statistics') }}</h2>
        <table><tr><th>{{ $t('Series') }}</th><th class="r">n</th><th class="r">{{ $t('Mean') }}</th><th class="r">{{ $t('Min') }}</th><th class="r">{{ $t('Max') }}</th><th class="r">Σ</th><th class="r">{{ $t('Δ first→last') }}</th></tr>
          <tr v-for="s in colStats" :key="s.name"><td>{{s.name}}</td><td class="r">{{s.n}}</td><td class="r">{{fmt(s.mean)}}</td><td class="r">{{fmt(s.min)}}</td><td class="r">{{fmt(s.max)}}</td><td class="r">{{fmt(s.sum)}}</td><td class="r" :class="s.chg>=0?'good':'bad'">{{fmt(s.chg)}}%</td></tr></table></div>
    </div>
    <div v-else class="card muted">{{ $t('Pick or create a graph. Embed it into any note with') }} <code>{{ $t('![[chart:ID]]') }}</code>.</div>
  </div>
</div>`,
  setup() {
    const cur = ref(null), err = ref(''), cv = ref(null);
    const types = ['bar', 'line', 'area', 'scatter', 'pie', 'doughnut', 'radar', 'function'];
    const icons = { bar: '', line: '', area: '', scatter: '⁙', pie: '', doughnut: '', radar: '', function: '𝑓' };
    const pick = c => { cur.value = JSON.parse(JSON.stringify(c)); };
    const create = () => { cur.value = { title: T('New graph'), type: 'bar', data: 'Label,Series A,Series B\nA,10,7\nB,14,9\nC,8,12', xlabel: '', ylabel: '', expr: 'sin(x)', xmin: -10, xmax: 10 }; };
    const cfg = computed(() => { err.value = ''; if (!cur.value) return null; try { return buildChartConfig(cur.value); } catch (e) { err.value = e.message; return null; } });
    const colStats = computed(() => {
      if (!cur.value || cur.value.type === 'function') return [];
      const { head, rows } = parseTable(cur.value.data);
      return head.slice(1).map((name, k) => {
        const v = rows.map(r => num(r[k + 1])).filter(x => x != null); if (!v.length) return null;
        return { name, n: v.length, mean: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v), sum: v.reduce((a, b) => a + b, 0), chg: v[0] ? (v[v.length - 1] / v[0] - 1) * 100 : 0 };
      }).filter(Boolean);
    });
    const save = async () => { cur.value = JSON.parse(JSON.stringify(await saveDoc('chart', cur.value))); toast(T('Graph saved')); };
    const del = async () => { if (cur.value.id && confirm(T('Delete graph?'))) await removeDoc('chart', cur.value.id); cur.value = null; };
    const upload = e => { const f = e.target.files[0]; if (f) f.text().then(t => { cur.value.data = t; }); };
    const png = () => { const a = document.createElement('a'); a.href = cv.value.png(); a.download = (cur.value.title || 'graph') + '.png'; a.click(); };
    const embed = () => cur.value.id ? copy(`![[chart:${cur.value.id}]]`) : toast(T('Save first'));
    const sample = () => {
      cur.value.data = cur.value.type === 'scatter' ? 'Hours studied,Exam score\n1,52\n2,58\n3,65\n4,64\n5,75\n6,79\n7,88\n8,90'
        : cur.value.type === 'pie' || cur.value.type === 'doughnut' ? 'Asset,Weight\nStocks,60\nBonds,25\nCash,10\nGold,5'
        : 'Year,Revenue,Profit\n2020,100,12\n2021,130,18\n2022,160,25\n2023,210,40';
    };
    const first = () => { if (!cur.value && S.chart.length) pick(S.chart[0]); };
    onMounted(first); watch(() => S.chart.length, first);
    return { S, cur, err, cv, types, icons, pick, create, cfg, colStats, save, del, upload, png, embed, sample, fmt };
  },
};
