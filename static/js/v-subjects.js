/* Study > Subjects & marks: grades per subject, trends and a study-time balance check. */
const SUBJECT_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2', '#edc948', '#9c755f'];
const Subjects = {
  template: `<div>
  <div v-if="!S.subject.length" class="card">
    <h2>{{ $t('Track your subjects and marks') }}</h2>
    <p class="muted">{{ $t('Add your subjects, record every mark, and StickPad shows your progress per subject and whether your study time matches where you need it most.') }}</p>
  </div>

  <sk-result v-if="!a"/>
  <div class="grid g4 gap-b" v-if="a && a.subjects.length">
    <div class="tile"><div class="v">{{ a.overall==null ? '–' : fmt(a.overall,1)+'%' }}</div><div class="l">{{ $t('overall average') }}</div></div>
    <div class="tile"><div class="v">{{ fmt(a.total_minutes/60,1) }} h</div><div class="l">{{ $t('focus time, last 30 days') }}</div></div>
    <div class="tile"><div class="v">{{ a.subjects.length }}</div><div class="l">{{ $t('subjects') }}</div></div>
    <div class="tile"><div class="v">{{ S.mark.length }}</div><div class="l">{{ $t('marks recorded') }}</div></div>
  </div>

  <div class="grid g2 gap-b" v-if="a && a.subjects.length">
    <div v-for="x in insights" :key="x.key" class="card insight" :class="x.kind" :style="{borderLeftColor:x.color}">
      <h3>{{ x.title }}</h3><p class="muted" style="margin:0">{{ x.text }}</p>
    </div>
  </div>

  <div class="grid g2">
    <div class="card"><h2>{{ $t('Subjects') }}</h2>
      <div class="form">
        <label class="f">{{ $t('Name') }}<input v-model="ns.name" @keyup.enter="addSubject" :placeholder="$t('e.g. Statistics')"></label>
        <label class="f">{{ $t('Target %') }}<input type="number" min="0" max="100" v-model.number="ns.target" @keyup.enter="addSubject"></label>
        <label class="f">{{ $t('Colour') }}<input type="color" v-model="ns.color" style="width:100%"></label>
      </div>
      <button class="pri" @click="addSubject">{{ $t('Add subject') }}</button>
      <transition-group name="list" tag="div" class="tlist" style="margin-top:12px">
        <div v-for="s in S.subject" :key="s.id" class="srow">
          <input type="color" :value="s.color" @change="upd(s,'color',$event.target.value)">
          <input :value="s.name" @change="rename(s,$event.target.value)" class="grow-in">
          <label class="small muted">{{ $t('Target %') }}</label>
          <input type="number" min="0" max="100" :value="s.target" style="width:72px" @change="upd(s,'target',+$event.target.value)">
          <button class="sm danger" @click="delSubject(s)" :title="$t('Delete')">×</button>
        </div>
      </transition-group>
    </div>

    <div class="card"><h2>{{ $t('Add a mark') }}</h2>
      <div class="form">
        <label class="f">{{ $t('Subject') }}<select v-model.number="nm.subject"><option v-for="s in S.subject" :key="s.id" :value="s.id">{{s.name}}</option></select></label>
        <label class="f">{{ $t('Title') }}<input v-model="nm.title" :placeholder="$t('e.g. Midterm')" @keyup.enter="addMark"></label>
        <label class="f">{{ $t('Date') }}<input type="date" v-model="nm.date"></label>
      </div>
      <div class="form">
        <label class="f">{{ $t('Mark') }}<input type="number" step="any" v-model.number="nm.score" @keyup.enter="addMark"></label>
        <label class="f">{{ $t('Out of') }}<input type="number" step="any" v-model.number="nm.max" @keyup.enter="addMark"></label>
        <label class="f">{{ $t('Weight') }}<input type="number" step="any" min="0" v-model.number="nm.weight" @keyup.enter="addMark"></label>
      </div>
      <button class="pri" @click="addMark" :disabled="!S.subject.length">{{ $t('Add mark') }}</button>
      <p class="muted small" style="margin-bottom:0">{{ $t('Marks are converted to percentages; weight lets an exam count more than a quiz.') }}</p>
    </div>
  </div>

  <div class="grid g2" v-if="a && S.mark.length">
    <div class="card"><div class="row sp"><h2 style="margin:0">{{ $t('Marks over time') }}</h2>
      <label class="row small"><input type="checkbox" v-model="trend"> {{ $t('trend line') }}</label></div>
      <chart-view :config="cfgMarks" :height="300"/></div>
    <div class="card"><h2>{{ $t('Study time vs. where you need it') }}</h2>
      <chart-view :config="cfgBalance" :height="300"/>
      <p class="muted small" style="margin-bottom:0">{{ $t('Recommended share grows with the gap to your target and with falling marks.') }}</p></div>
  </div>
  <div class="card" v-if="a && a.total_minutes"><h2>{{ $t('Weekly focus minutes by subject') }}</h2><chart-view :config="cfgWeekly" :height="260"/></div>

  <div class="card" v-if="a && a.subjects.length"><h2>{{ $t('Summary') }}</h2>
    <table><tr><th>{{ $t('Subject') }}</th><th class="r">{{ $t('Average') }}</th><th class="r">{{ $t('Target') }}</th><th class="r">{{ $t('Trend / month') }}</th><th class="r">{{ $t('Last') }}</th>
      <th class="r">{{ $t('Time 30d') }}</th><th class="r">{{ $t('Time share') }}</th><th class="r">{{ $t('Recommended') }}</th><th>{{ $t('Status') }}</th></tr>
      <tr v-for="r in a.subjects" :key="r.id"><td><i class="sdot" :style="{background:r.color}"></i>{{r.name}}</td>
        <td class="r">{{ r.avg==null ? '–' : fmt(r.avg,1)+'%' }}</td><td class="r">{{ fmt(r.target,0) }}%</td>
        <td class="r" :class="r.slope==null?'':r.slope>=0?'good':'bad'">{{ r.slope==null ? '–' : (r.slope>=0?'+':'')+fmt(r.slope,1)+' pts' }}</td>
        <td class="r">{{ r.last==null ? '–' : fmt(r.last,1)+'%' }}</td><td class="r">{{ fmt(r.minutes/60,1) }} h</td>
        <td class="r">{{ fmt(r.actual,0) }}%</td><td class="r">{{ fmt(r.recommended,0) }}%</td>
        <td><span class="pill" :class="'st-'+r.status">{{ $t(statusLabel[r.status]) }}</span></td></tr></table>
  </div>

  <div class="card" v-if="S.mark.length"><h2>{{ $t('All marks') }}</h2>
    <div class="scroll"><table><tr><th>{{ $t('Date') }}</th><th>{{ $t('Subject') }}</th><th>{{ $t('Title') }}</th><th class="r">{{ $t('Mark') }}</th><th class="r">%</th><th class="r">{{ $t('Weight') }}</th><th></th></tr>
      <tr v-for="m in marksSorted" :key="m.id">
        <template v-if="ed!==m.id"><td>{{m.date}}</td><td><i class="sdot" :style="{background:colorOf(m.subject)}"></i>{{nameOf(m.subject)}}</td><td>{{m.title}}</td>
          <td class="r">{{m.score}} / {{m.max}}</td><td class="r">{{ fmt(m.score/m.max*100,1) }}%</td><td class="r">{{m.weight}}</td>
          <td class="actions"><button class="sm" @click="edit(m)">{{ $t('Edit') }}</button><button class="sm danger" @click="delMark(m)">×</button></td></template>
        <template v-else><td><input type="date" v-model="draft.date"></td>
          <td><select v-model.number="draft.subject"><option v-for="s in S.subject" :key="s.id" :value="s.id">{{s.name}}</option></select></td><td><input v-model="draft.title"></td>
          <td class="r"><input type="number" step="any" v-model.number="draft.score" style="width:70px"> / <input type="number" step="any" v-model.number="draft.max" style="width:70px"></td><td></td>
          <td class="r"><input type="number" step="any" v-model.number="draft.weight" style="width:64px"></td>
          <td class="actions"><button class="sm pri" @click="saveEd(m)">{{ $t('Save') }}</button><button class="sm" @click="ed=null">{{ $t('Cancel') }}</button></td></template>
      </tr></table></div>
  </div>
</div>`,
  setup() {
    const a = ref(null), trend = ref(false), ed = ref(null);
    const ns = reactive({ name: '', target: 70, color: SUBJECT_COLORS[S.subject.length % SUBJECT_COLORS.length] });
    const nm = reactive({ subject: null, title: '', score: null, max: lang.value === 'es' ? 10 : 100, weight: 1, date: today() });
    const draft = reactive({ subject: null, title: '', score: 0, max: 100, weight: 1, date: '' });
    const statusLabel = { neglected: 'Needs attention', over: 'Over-focused', ok: 'Balanced', no_time: 'No study time logged' };
    const refresh = async () => { a.value = await api('subjects/analysis'); };
    const nameOf = id => (S.subject.find(s => s.id === id) || {}).name || '?';
    const colorOf = id => (S.subject.find(s => s.id === id) || {}).color || '#999';
    const marksSorted = computed(() => [...S.mark].sort((x, y) => (y.date || '').localeCompare(x.date || '')));
    const initSubject = () => { if (!S.subject.find(s => s.id === nm.subject)) nm.subject = S.subject[0]?.id ?? null; };

    const addSubject = async () => {
      if (!ns.name.trim()) return;
      await saveDoc('subject', { name: ns.name.trim(), target: ns.target || 70, color: ns.color });
      ns.name = ''; ns.color = SUBJECT_COLORS[S.subject.length % SUBJECT_COLORS.length]; initSubject(); refresh();
    };
    const upd = async (s, k, v) => { await saveDoc('subject', { ...s, [k]: v }); refresh(); };
    const rename = async (s, v) => { if (!v.trim()) return; await upd(s, 'name', v.trim()); };
    const delSubject = async s => {
      const n = S.mark.filter(m => m.subject === s.id).length;
      if (!confirm(T('Delete this subject and its {n} marks?', { n }))) return;
      for (const m of S.mark.filter(m => m.subject === s.id)) await removeDoc('mark', m.id);
      await removeDoc('subject', s.id); initSubject(); refresh();
    };
    const addMark = async () => {
      if (!nm.subject || nm.score == null || nm.score === '' || !(nm.max > 0)) { toast(T('Choose a subject and enter the mark.')); return; }
      await saveDoc('mark', { subject: nm.subject, title: nm.title || T('Mark'), score: nm.score, max: nm.max, weight: nm.weight || 1, date: nm.date || today() });
      nm.title = ''; nm.score = null; toast(T('Mark added')); refresh();
    };
    const edit = m => { ed.value = m.id; Object.assign(draft, { subject: m.subject, title: m.title, score: m.score, max: m.max, weight: m.weight, date: m.date }); };
    const saveEd = async m => { await saveDoc('mark', { ...m, ...draft }); ed.value = null; refresh(); };
    const delMark = async m => { await removeDoc('mark', m.id); refresh(); };

    const insights = computed(() => {
      const out = [];
      for (const r of (a.value?.subjects || [])) {
        const tr = r.slope != null && r.slope < -2 ? T(', falling {n} pts/month', { n: fmt(-r.slope, 1) }) : '';
        const avg = r.avg == null ? T('no marks yet') : fmt(r.avg, 1) + '%';
        if (r.status === 'neglected') out.push({ key: r.id, kind: 'bad', color: r.color, title: T('{name} needs more attention', { name: r.name }),
          text: T('Average {avg} (target {t}%){tr}, but only {a}% of your study time (about {r} % recommended).', { avg, t: fmt(r.target, 0), tr, a: fmt(r.actual, 0), r: fmt(r.recommended, 0) }) });
        else if (r.status === 'over') out.push({ key: r.id, kind: 'warn', color: r.color, title: T('{name} is taking more time than it needs', { name: r.name }),
          text: T('It gets {a}% of your study time and is already at {avg} (target {t}%). You could move some time to other subjects.', { a: fmt(r.actual, 0), avg, t: fmt(r.target, 0) }) });
      }
      if (a.value && !a.value.total_minutes) out.push({ key: 'nt', kind: 'info', color: 'var(--accent)', title: T('No study time logged yet'),
        text: T('Start a focus session with a subject name (Focus timer tab) to see how your time is balanced.') });
      else if (a.value && !out.length) out.push({ key: 'ok', kind: 'good', color: 'var(--good)', title: T('Your time looks well balanced'),
        text: T('No subject is being left behind and none is taking more time than it needs.') });
      return out;
    });

    const cfgMarks = computed(() => {
      const dates = [...new Set(S.mark.map(m => m.date))].sort();
      const datasets = [];
      S.subject.forEach(s => {
        const mine = S.mark.filter(m => m.subject === s.id); if (!mine.length) return;
        const data = dates.map(dt => { const f = mine.filter(m => m.date === dt); return f.length ? f.reduce((t, m) => t + m.score / m.max * 100, 0) / f.length : null; });
        datasets.push({ label: s.name, data, borderColor: s.color, backgroundColor: s.color, spanGaps: true, tension: .25, borderWidth: 2.5, pointRadius: 4 });
        if (trend.value) {
          const pts = data.map((y, x) => ({ x, y })).filter(p => p.y != null), lr = linreg(pts);
          if (lr && pts.length > 1) datasets.push({ label: s.name + ' ' + T('trend'), data: data.map((_, x) => (x >= pts[0].x && x <= pts.at(-1).x) ? lr.intercept + lr.slope * x : null), borderColor: s.color, borderDash: [6, 5], pointRadius: 0, borderWidth: 1.5, spanGaps: true });
        }
      });
      return { type: 'line', data: { labels: dates, datasets }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 550, easing: 'easeOutQuart' },
        interaction: { mode: 'nearest', intersect: false }, plugins: { legend: { labels: { filter: i => !i.text.endsWith(T('trend')) } } },
        scales: { y: { min: 0, max: 100, title: { display: true, text: '%' } } } } };
    });
    const cfgBalance = computed(() => {
      const r = a.value?.subjects || [];
      return { type: 'bar', data: { labels: r.map(x => x.name), datasets: [
        { label: T('Share of study time'), data: r.map(x => x.actual), backgroundColor: r.map(x => x.color) },
        { label: T('Recommended share'), data: r.map(x => x.recommended), backgroundColor: r.map(x => x.color + '55'), borderColor: r.map(x => x.color), borderWidth: 2, borderDash: [4, 3] }] },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 550, easing: 'easeOutQuart' }, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } } } };
    });
    const cfgWeekly = computed(() => {
      const w = a.value?.weekly || [];
      return { type: 'bar', data: { labels: w.map(x => x.week.slice(5)), datasets: S.subject.map(s => ({ label: s.name, data: w.map(x => x[String(s.id)] || 0), backgroundColor: s.color })) },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 550 }, scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: T('min') } } } } };
    });

    onMounted(() => { initSubject(); refresh(); window.addEventListener('data-changed', refresh); });
    onBeforeUnmount(() => window.removeEventListener('data-changed', refresh));
    watch(() => S.subject.length, initSubject);
    return { S, a, trend, ed, ns, nm, draft, statusLabel, nameOf, colorOf, marksSorted, addSubject, upd, rename, delSubject, addMark, edit, saveEd, delMark, insights, cfgMarks, cfgBalance, cfgWeekly, fmt };
  },
};
