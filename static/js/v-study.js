/* Study: flashcards (SM-2), pomodoro, tasks */
// Pomodoro state lives at module level so it keeps running while you browse other tabs.
const PT = reactive({ running: false, mode: 'focus', left: 25 * 60, end: 0, focus: 25, brk: 5, subject: 'General', sessions: 0 });
let ptTick = null;
function ptBeep() {
  try { const c = new AudioContext(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); setTimeout(() => o.stop(), 400); } catch { }
  if (window.Notification && Notification.permission === 'granted') new Notification('StickPad', { body: PT.mode === 'focus' ? T('Focus session done — take a break!') : T('Break over — back to work.') });
}
function ptStart() {
  PT.running = true; PT.end = Date.now() + PT.left * 1000;
  if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
  clearInterval(ptTick);
  ptTick = setInterval(async () => {
    PT.left = Math.max(0, Math.round((PT.end - Date.now()) / 1000));
    document.title = (PT.mode === 'focus' ? '' : '') + String(Math.floor(PT.left / 60)).padStart(2, '0') + ':' + String(PT.left % 60).padStart(2, '0');
    if (PT.left <= 0) {
      ptBeep();
      if (PT.mode === 'focus') { await saveDoc('session', { date: today(), minutes: PT.focus, subject: PT.subject }); PT.sessions++; PT.mode = 'break'; PT.left = PT.brk * 60; }
      else { PT.mode = 'focus'; PT.left = PT.focus * 60; }
      PT.end = Date.now() + PT.left * 1000;
    }
  }, 500);
}
function ptStop() { PT.running = false; clearInterval(ptTick); document.title = 'StickPad'; }
function ptReset() { ptStop(); PT.mode = 'focus'; PT.left = PT.focus * 60; }

const Cards = {
  template: `<div>
  <div class="tabs"><button :class="{on:sub==='review'}" @click="sub='review'">{{ $t('Review') }} ({{due.length}})</button>
    <button :class="{on:sub==='browse'}" @click="sub='browse'">{{ $t('Browse & add') }} ({{S.card.length}})</button>
    <select v-model="deck" style="margin-left:auto"><option value="">{{ $t('All decks') }}</option><option v-for="d in decks">{{d}}</option></select></div>
  <div v-if="sub==='review'">
    <transition name="flip" mode="out-in">
      <div v-if="card" :key="card.id+'-'+flip" class="card flash" @click="flip=!flip">
        <div><div class="muted small">{{card.deck}} · {{ flip ? $t('answer') : $t('question') }} · {{ $t('{n} left',{n:due.length}) }}</div>
          <div v-if="flip" class="muted small" v-html="rm(card.front)"></div><div v-html="rm(flip?card.back:card.front)"></div>
          <div v-if="!flip" class="muted small" style="margin-top:20px">{{ $t('click or press Space to reveal') }}</div></div></div>
      <div v-else key="done" class="card" style="text-align:center"><h2>{{ $t('All caught up!') }}</h2><p class="muted">{{ $t('No cards due.') }} {{ $t('Reviewed this session: {n}',{n:done}) }}</p></div>
    </transition>
    <div v-if="card&&flip" class="row" style="justify-content:center">
      <button class="danger" @click="grade(1)">{{ $t('1 · Again') }} <small>{{next(1)}}</small></button><button @click="grade(3)">{{ $t('2 · Hard') }} <small>{{next(3)}}</small></button>
      <button class="pri" @click="grade(4)">{{ $t('3 · Good') }} <small>{{next(4)}}</small></button><button @click="grade(5)">{{ $t('4 · Easy') }} <small>{{next(5)}}</small></button></div>
    <div class="muted small" style="text-align:center;margin-top:8px">{{ $t('Spaced repetition (SM-2): cards you know well come back after longer and longer intervals. Keys: Space = flip, 1–4 = grade.') }}</div>
  </div>
  <div v-else class="grid g2">
    <div class="card"><h2>{{ $t('Add card') }}</h2>
      <label class="f">{{ $t('Front') }}<textarea v-model="nc.front" rows="2"></textarea></label><label class="f">{{ $t('Back') }}<textarea v-model="nc.back" rows="2"></textarea></label>
      <div class="row" style="margin-top:6px"><input v-model="nc.deck" :placeholder="$t('deck')" list="decks"><datalist id="decks"><option v-for="d in decks">{{d}}</option></datalist><button class="pri" @click="add">{{ $t('Add') }}</button></div>
      <h3>{{ $t('Bulk import') }}</h3><textarea v-model="bulk" rows="4" :placeholder="$t('One per line:  question :: answer')"></textarea>
      <button @click="bulkAdd" style="margin-top:4px">{{ $t('Import lines') }}</button>
      <p class="muted small">{{ $t('Tip: in a note, write Term :: Definition lines or put words in double curly braces to make cloze cards, then press Make cards. Supports $math$.') }}</p></div>
    <div class="card"><h2>{{ $t('Cards') }}</h2><div class="scroll" style="max-height:480px"><table><tr><th>{{ $t('Front') }}</th><th>{{ $t('Deck') }}</th><th class="r">{{ $t('Next') }}</th><th></th></tr>
      <tr v-for="c in shown" :key="c.id">
        <template v-if="ed!==c.id"><td>{{c.front}}<div class="muted small">{{c.back}}</div></td><td>{{c.deck}}</td><td class="r small">{{c.due}}<br>{{c.interval}}d · {{ $t('ease') }} {{c.ease}}</td>
          <td style="white-space:nowrap"><button class="sm" @click="edit(c)">{{ $t('Edit') }}</button> <button class="sm danger" @click="del(c)">×</button></td></template>
        <template v-else><td colspan="3"><textarea v-model="draft.front" rows="2"></textarea><textarea v-model="draft.back" rows="2"></textarea><input v-model="draft.deck"></td>
          <td style="white-space:nowrap"><button class="sm pri" @click="saveEd(c)">{{ $t('Save') }}</button> <button class="sm" @click="ed=null">{{ $t('Cancel') }}</button></td></template>
      </tr></table></div></div>
  </div></div>`,
  setup() {
    const ed = ref(null), draft = reactive({ front: '', back: '', deck: '' });
    const edit = c => { ed.value = c.id; Object.assign(draft, { front: c.front, back: c.back, deck: c.deck }); };
    const saveEd = async c => { await saveDoc('card', { ...c, ...draft }); ed.value = null; toast(T('Saved')); };
    const del = async c => { if (confirm(T('Delete this card?'))) await removeDoc('card', c.id); };
    const sub = ref('review'), deck = ref(''), flip = ref(false), queue = ref([]), done = ref(0), bulk = ref('');
    const nc = reactive({ front: '', back: '', deck: 'General' });
    const decks = computed(() => [...new Set(S.card.map(c => c.deck))]);
    const shown = computed(() => S.card.filter(c => !deck.value || c.deck === deck.value));
    const due = computed(() => queue.value);
    const card = computed(() => queue.value[0]);
    const rm = t => renderMarkdown(t, {});
    const build = () => { queue.value = S.card.filter(c => c.due <= today() && (!deck.value || c.deck === deck.value)).sort(() => Math.random() - .5); flip.value = false; };
    const next = g => { // preview interval
      const c = card.value; if (!c) return ''; if (g < 3) return '1d';
      const r = (c.reps || 0) + 1; let i = r === 1 ? 1 : r === 2 ? 6 : Math.round(c.interval * c.ease); if (g === 3) i = Math.max(1, Math.round(i * .8)); if (g === 5) i = Math.round(i * 1.3); return i + 'd';
    };
    const grade = async g => {
      const c = card.value; if (!c) return;
      const r = await api(`cards/${c.id}/review`, 'POST', { grade: g });
      const i = S.card.findIndex(x => x.id === c.id); if (i >= 0) S.card[i] = r;
      queue.value.shift(); if (g < 3) queue.value.push(r); // see failed cards again this session
      done.value++; flip.value = false;
    };
    const add = async () => { if (!nc.front || !nc.back) return; await saveDoc('card', { ...nc }); nc.front = nc.back = ''; build(); };
    const bulkAdd = async () => {
      let n = 0; for (const l of bulk.value.split('\n')) { const m = l.match(/^(.+?)\s*::\s*(.+)$/); if (m) { await saveDoc('card', { front: m[1], back: m[2], deck: nc.deck || 'General' }); n++; } }
      bulk.value = ''; toast(T('{n} cards added',{n})); build();
    };
    const key = e => {
      if (sub.value !== 'review' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); flip.value = !flip.value; }
      else if (flip.value && '1234'.includes(e.key) && e.key) grade([0, 1, 3, 4, 5][+e.key]);
    };
    onMounted(() => { build(); window.addEventListener('keydown', key); }); onBeforeUnmount(() => window.removeEventListener('keydown', key));
    watch(deck, build); watch(() => S.card.length, build);
    return { ed, draft, edit, saveEd, del, S, sub, deck, decks, shown, due, card, flip, done, nc, bulk, add, bulkAdd, grade, next, rm, removeDoc };
  },
};
const Pomodoro = {
  template: `<div class="grid g2"><div class="card"><div class="muted" style="text-align:center">{{ PT.mode==='focus' ? $t('Focus') : $t('Break') }} · {{PT.subject}}</div>
    <div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b93ff"/><stop offset="1" stop-color="#b18cff"/></linearGradient></defs>
      <circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" :style="{strokeDashoffset: 326.7*(1-pct/100)}"/></svg>
      <div class="timer" :class="{pulse:PT.running}">{{mm}}:{{ss}}</div></div>
    <div class="row" style="justify-content:center;margin:12px 0"><button class="pri" v-if="!PT.running" @click="ptStart()">{{ $t('Start') }}</button><button v-else @click="ptStop()">{{ $t('Pause') }}</button><button @click="ptReset()">{{ $t('Reset') }}</button></div>
    <div class="form"><label class="f">{{ $t('Focus (min)') }}<input type="number" v-model.number="PT.focus" @change="PT.running||ptReset()"></label><label class="f">{{ $t('Break (min)') }}<input type="number" v-model.number="PT.brk"></label>
      <label class="f">{{ $t('Subject') }}<input v-model="PT.subject" list="subs"></label><datalist id="subs"><option v-for="s in subjects">{{s}}</option></datalist></div>
    <div class="muted small">{{ $t('Timer keeps running while you use other pages. Completed focus blocks are logged: {n} this visit.',{n:PT.sessions}) }}</div>
    <div class="row" style="margin-top:6px"><button class="sm" @click="manual">{{ $t('+ Log time manually') }}</button></div></div>
    <div class="card"><h2>{{ $t('Last 7 days (minutes)') }}</h2><chart-view :config="cfg" :height="220"/>
      <h3>{{ $t('By subject') }}</h3><div v-for="s in bySubject" :key="s[0]" class="row sp"><span>{{s[0]}}</span><span class="muted">{{Math.round(s[1])}} {{ $t('min') }}</span></div>
      <div class="muted small">{{ $t('Total') }}: {{Math.round(total)}} {{ $t('min') }} ({{(total/60).toFixed(1)}} h)</div></div></div>`,
  setup() {
    const mm = computed(() => String(Math.floor(PT.left / 60)).padStart(2, '0')), ss = computed(() => String(PT.left % 60).padStart(2, '0'));
    const pct = computed(() => 100 - PT.left / ((PT.mode === 'focus' ? PT.focus : PT.brk) * 60) * 100);
    const subjects = computed(() => [...new Set([...S.subject.map(s => s.name), ...S.session.map(s => s.subject)])]);
    const total = computed(() => S.session.reduce((a, s) => a + s.minutes, 0));
    const bySubject = computed(() => { const m = {}; S.session.forEach(s => m[s.subject] = (m[s.subject] || 0) + s.minutes); return Object.entries(m).sort((a, b) => b[1] - a[1]); });
    const cfg = computed(() => {
      const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0, 10); });
      return { type: 'bar', data: { labels: days.map(d => d.slice(5)), datasets: [{ label: T('min'), data: days.map(d => S.session.filter(s => s.date === d).reduce((a, s) => a + s.minutes, 0)), backgroundColor: '#4e79a7' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } };
    });
    const manual = async () => { const m = +prompt(T('Minutes studied?'), '30'); if (m > 0) { await saveDoc('session', { date: today(), minutes: m, subject: PT.subject }); toast(T('Logged')); } };
    return { PT, mm, ss, pct, subjects, total, bySubject, cfg, ptStart, ptStop, ptReset, manual };
  },
};
const Tasks = {
  template: `<div class="grid g2"><div class="card"><div class="form"><label class="f">{{ $t('Task') }}<input v-model="t.text" @keyup.enter="add"></label><label class="f">{{ $t('Due') }}<input type="date" v-model="t.due"></label>
      <label class="f">{{ $t('Priority') }}<select v-model="t.priority"><option value="high">{{ $t('High') }}</option><option value="med">{{ $t('Medium') }}</option><option value="low">{{ $t('Low') }}</option></select></label>
      <label class="f">{{ $t('Subject') }}<input v-model="t.subject" :placeholder="$t('e.g. Statistics')" list="tsubs" @keyup.enter="add"></label><datalist id="tsubs"><option v-for="n in S.subject" :key="n.id" :value="n.name"></option></datalist></div>
      <button class="pri" @click="add">{{ $t('Add task') }}</button>
      <div class="row" style="margin-top:12px"><button class="sm" :class="{on:f==='open'}" @click="f='open'">{{ $t('Open') }}</button><button class="sm" :class="{on:f==='done'}" @click="f='done'">{{ $t('Done') }}</button><button class="sm" :class="{on:f==='all'}" @click="f='all'">{{ $t('All') }}</button>
        <span class="muted small">{{ $t('Click a task to complete it.') }}</span></div>
      <transition-group name="list" tag="div" class="tlist">
        <div v-for="x in list" :key="x.id" class="task" :class="{done:x.done}" @click="ed!==x.id && toggleTask(x)">
          <span class="chk" :class="{on:x.done}" role="checkbox" :aria-checked="!!x.done" tabindex="0" @keydown.enter.space.prevent="toggleTask(x)"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5"/></svg></span>
          <template v-if="ed!==x.id">
            <span class="ttext">{{x.text}} <span class="pill" v-if="x.subject">{{x.subject}}</span></span>
            <small :class="{bad:!x.done&&x.due&&x.due<td}">{{x.due||''}}</small><i class="dot" :class="x.priority" :title="$t(x.priority)"></i>
            <button class="sm" @click.stop="edit(x)">{{ $t('Edit') }}</button><button class="sm danger" @click.stop="del(x)">×</button>
          </template>
          <div v-else class="row" style="flex:1" @click.stop>
            <input v-model="draft.text" style="flex:2;min-width:140px" @keyup.enter="saveEd(x)" @keyup.esc="ed=null"><input type="date" v-model="draft.due">
            <select v-model="draft.priority"><option value="high">{{ $t('High') }}</option><option value="med">{{ $t('Medium') }}</option><option value="low">{{ $t('Low') }}</option></select>
            <input v-model="draft.subject" :placeholder="$t('Subject')" style="width:110px" list="tsubs">
            <button class="sm pri" @click="saveEd(x)">{{ $t('Save') }}</button><button class="sm" @click="ed=null">{{ $t('Cancel') }}</button>
          </div>
        </div>
      </transition-group>
      <div v-if="!list.length" class="muted pad">{{ $t('Nothing here.') }}</div></div>
    <div class="card"><h2>{{ $t('Progress') }}</h2><div class="bar"><div :style="{width:prog+'%'}"></div></div><div class="muted small">{{ $t('{a} of {b} done',{a:S.task.filter(x=>x.done).length,b:S.task.length}) }}</div>
      <h3>{{ $t('By subject') }}</h3><div v-for="s in subj" :key="s.n" class="row sp small"><span>{{s.n}}</span><span>{{s.d}}/{{s.t}}</span></div></div></div>`,
  setup() {
    const t = reactive({ text: '', due: '', priority: 'med', subject: '' }), f = ref('open'), td = today();
    const ed = ref(null), draft = reactive({ text: '', due: '', priority: 'med', subject: '' });
    const order = { high: 0, med: 1, low: 2 };
    const list = computed(() => S.task.filter(x => f.value === 'all' || (f.value === 'done') === !!x.done || recentTasks.has(x.id))
      .sort((a, b) => (!!a.done - !!b.done) * (f.value === 'all' ? 1 : 0) || (a.due || '9').localeCompare(b.due || '9') || order[a.priority] - order[b.priority]));
    const prog = computed(() => S.task.length ? S.task.filter(x => x.done).length / S.task.length * 100 : 0);
    const subj = computed(() => { const m = {}; S.task.forEach(x => { const k = x.subject || '—'; m[k] = m[k] || { n: k, t: 0, d: 0 }; m[k].t++; m[k].d += x.done ? 1 : 0; }); return Object.values(m); });
    const add = async () => { if (!t.text.trim()) return; await saveDoc('task', { ...t, done: false }); t.text = ''; };
    const edit = x => { ed.value = x.id; Object.assign(draft, { text: x.text, due: x.due || '', priority: x.priority || 'med', subject: x.subject || '' }); };
    const saveEd = async x => { await saveDoc('task', { ...x, ...draft }); ed.value = null; };
    const del = async x => { await removeDoc('task', x.id); toast(T('Task deleted')); };
    return { S, t, f, td, list, prog, subj, add, toggleTask, edit, saveEd, del, ed, draft };
  },
};
Views.study = {
  components: { Cards, Pomodoro, Tasks, Subjects },
  template: `<div><h1>{{ $t('Study') }}</h1><div class="tabs"><button v-for="t in tabs" :key="t[0]" :class="{on:tab===t[0]}" @click="tab=t[0]">{{ $t(t[1]) }}</button></div><component :is="tab"/></div>`,
  setup() { const tabs = [['Cards', 'Flashcards'], ['Pomodoro', 'Focus timer'], ['Tasks', 'Tasks'], ['Subjects', 'Subjects & marks']]; const tab = ref(localStorage.stab || 'Cards'); watch(tab, v => localStorage.stab = v); return { tabs, tab }; },
};
