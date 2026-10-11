Views.dashboard = {
  directives: { count: vCount },
  emits: ['go', 'open-note', 'refresh'],
  template: `
<div>
  <h1>{{greeting}} </h1>
  <div class="card" v-if="!S.note.length">
    <b>{{ $t('Your notebook is empty.') }}</b> {{ $t('Load demo notes, flashcards, transactions and charts to explore?') }}
    <button class="pri" @click="seed">{{ $t('Load demo data') }}</button> <button @click="$emit('go','help')">{{ $t('Read the tutorial') }}</button>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    <div class="tile"><div class="v"><span v-count="d.streak||0"></span> 🔥</div><div class="l">{{ $t('day streak') }}</div></div>
    <div class="tile" style="cursor:pointer" @click="$emit('go','study')"><div class="v" :class="{bad:d.due}"><span v-count="d.due||0"></span></div><div class="l">{{ $t('cards due') }} · {{ $t('{n} done today',{n:d.reviews_today||0}) }}</div></div>
    <div class="tile"><div class="v">{{Math.round(d.minutes_week||0)}}m</div><div class="l">{{ $t('focus this week') }}</div></div>
    <div class="tile" style="cursor:pointer" @click="$emit('go','study')"><div class="v"><span v-count="d.open_tasks||0"></span></div><div class="l">{{ $t('open tasks') }} · <span :class="{bad:d.overdue}">{{ $t('{n} overdue',{n:d.overdue||0}) }}</span></div></div>
    <div class="tile"><div class="v"><span v-count="d.notes||0"></span></div><div class="l">{{ $t('notes · {a} sources · {b} graphs',{a:d.sources||0,b:d.charts||0}) }}</div></div>
    <div class="tile" style="cursor:pointer" @click="$emit('go','finance')"><div class="v" :class="d.balance>=0?'good':'bad'">{{money(d.balance)}}</div><div class="l">{{ $t('net cash flow tracked') }}</div></div>
    <div class="tile"><div class="v">{{d.mature||0}}/{{d.cards||0}}</div><div class="l">{{ $t('cards mature (≥21d)') }}</div></div>
  </div>
  <div class="grid g2">
    <div class="card">
      <h2>{{ $t('Quick capture') }}</h2>
      <textarea v-model="quick" rows="4" :placeholder="$t('Type a thought… (Markdown ok). First line becomes the title.')"></textarea>
      <div class="row" style="margin-top:6px"><button class="pri" @click="capture" :disabled="!quick.trim()">{{ $t('Save as note') }}</button>
        <button @click="captureTask" :disabled="!quick.trim()">{{ $t('Save as task') }}</button></div>
    </div>
    <div class="card"><h2>{{ $t('Study activity') }}</h2>
      <div class="heat-wrap" ref="heatEl"><div class="heat" :style="{gridTemplateColumns: 'repeat(' + weeks + ', 13px)'}"><i v-for="(c,ix) in cells" :key="c.d" :class="'l'+c.l" :style="{'--d':ix}" :title="c.d+': '+c.v"></i></div></div>
      <div class="muted small" style="margin-top:6px">{{ $t('Reviews, notes and focus time all count.') }}</div></div>
    <div class="card"><h2>{{ $t('Upcoming tasks') }}</h2>
      <transition-group name="list" tag="div">
        <div v-for="t in tasks" :key="t.id" class="task" :class="{done:t.done}" @click="toggleTask(t)">
          <span class="chk" :class="{on:t.done}" role="checkbox" :aria-checked="!!t.done" tabindex="0" @keydown.enter.space.prevent="toggleTask(t)"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5"/></svg></span>
          <span class="ttext">{{t.text}}</span><small class="muted" :class="{bad:t.due&&t.due<todayS&&!t.done}">{{t.due||''}}</small></div>
      </transition-group>
      <div v-if="!tasks.length" class="muted">{{ $t('Nothing due') }} </div></div>
    <div class="card"><h2>{{ $t('Pinned & recent notes') }}</h2>
      <div v-for="n in notes" :key="n.id" class="nitem" :style="{borderLeftColor:n.color||'#ddd'}" @click="$emit('open-note',n.id)">
        <div class="t"><span v-if="n.pinned" class="pin-dot"></span>{{n.title||$t('Untitled')}}</div><div class="s">{{(n.body||'').replace(/[#*>\\n]+/g,' ').slice(0,90)}}</div></div></div>
  </div>
</div>`,
  setup(_, { emit }) {
    const d = ref({}), quick = ref(''), todayS = today();
    const refresh = async () => { d.value = await api('dashboard'); emit('refresh'); };
    const onData = () => setTimeout(refresh, 200);
    onMounted(() => window.addEventListener('data-changed', onData)); onBeforeUnmount(() => window.removeEventListener('data-changed', onData));
    onMounted(refresh);
    const greeting = computed(() => { const h = new Date().getHours(); return h < 12 ? T('Good morning') : h < 18 ? T('Good afternoon') : T('Good evening'); });
    const heatEl = ref(null), heatW = ref(300); let ro;
    onMounted(() => { if (window.ResizeObserver && heatEl.value) { ro = new ResizeObserver(([e]) => { heatW.value = e.contentRect.width; }); ro.observe(heatEl.value); } });
    onBeforeUnmount(() => ro && ro.disconnect());
    const weeks = computed(() => Math.max(5, Math.min(40, Math.floor((heatW.value + 3) / 16))));
    const cells = computed(() => {
      const out = [], act = d.value.activity || {}, t = new Date();
      t.setDate(t.getDate() - ((weeks.value - 1) * 7 + t.getDay()));
      for (let i = 0; i < weeks.value * 7; i++) {
        const k = t.toISOString().slice(0, 10), v = Math.round(act[k] || 0);
        out.push({ d: k, v, l: v === 0 ? 0 : v < 5 ? 1 : v < 15 ? 2 : v < 30 ? 3 : 4 }); t.setDate(t.getDate() + 1);
      } return out;
    });
    const tasks = computed(() => S.task.filter(t => !t.done || recentTasks.has(t.id)).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 6));
    const notes = computed(() => [...S.note].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated.localeCompare(a.updated)).slice(0, 6));
    const seed = async () => { await api('seed', 'POST', { lang: lang.value }); await load(); refresh(); toast(T('Demo data loaded')); };
    const capture = async () => {
      const lines = quick.value.trim().split('\n');
      await saveDoc('note', { title: lines[0].replace(/^#+\s*/, '').slice(0, 80), body: quick.value, tags: ['inbox'], color: '#fff3b0' });
      quick.value = ''; toast(T('Note saved')); refresh();
    };
    const captureTask = async () => { await saveDoc('task', { text: quick.value.trim().split('\n')[0], done: false, priority: 'med' }); quick.value = ''; toast(T('Task added')); refresh(); };
    const done = async t => { await saveDoc('task', { ...t, done: true }); refresh(); };
    return { d, quick, greeting, heatEl, weeks, cells, tasks, notes, S, seed, capture, captureTask, toggleTask, money, todayS };
  },
};
