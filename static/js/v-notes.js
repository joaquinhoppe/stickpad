const TEMPLATES = {
  'Blank': '',
  'Cornell notes': '# Topic\n\n## Cues / Questions\n- Question 1 :: \n\n## Notes\n\n\n## Summary\n',
  'Lecture': '# Lecture: \n**Date:** ' + new Date().toISOString().slice(0, 10) + '  \n**Course:** \n\n## Key ideas\n- \n\n## Formulas\n$$ $$\n\n## Questions\n- [ ] \n',
  'Paper summary': '# Paper: \n**Citation:** [@key]\n\n## Question\n\n## Method\n\n## Findings\n\n## Limitations\n\n## My thoughts\n',
  'Stock analysis': '# Company: \n\n| Metric | Value |\n|---|---|\n| P/E | |\n| ROE | |\n| Debt/Equity | |\n\n## Thesis\n\n## Risks\n\n## Verdict\n',
  'Daily log': '# Daily log ' + new Date().toISOString().slice(0, 10) + '\n\n## Done\n- [x] \n\n## Tomorrow\n- [ ] \n\n## Reflection\n',
};
const TEMPLATES_ES = {
  'Blank': '',
  'Cornell notes': '# Tema\n\n## Pistas / Preguntas\n- Pregunta 1 :: \n\n## Apuntes\n\n\n## Resumen\n',
  'Lecture': '# Clase: \n**Fecha:** ' + new Date().toISOString().slice(0, 10) + '  \n**Asignatura:** \n\n## Ideas clave\n- \n\n## Fórmulas\n$$ $$\n\n## Preguntas\n- [ ] \n',
  'Paper summary': '# Artículo: \n**Cita:** [@clave]\n\n## Pregunta\n\n## Método\n\n## Resultados\n\n## Limitaciones\n\n## Mi opinión\n',
  'Stock analysis': '# Empresa: \n\n| Métrica | Valor |\n|---|---|\n| PER | |\n| ROE | |\n| Deuda/Patrimonio | |\n\n## Tesis\n\n## Riesgos\n\n## Veredicto\n',
  'Daily log': '# Diario ' + new Date().toISOString().slice(0, 10) + '\n\n## Hecho\n- [x] \n\n## Mañana\n- [ ] \n\n## Reflexión\n',
};
Views.notes = {
  emits: ['open-note'],
  template: `
<div class="notes" :class="{focus}">
  <div class="nlist">
    <div class="row" style="margin-bottom:8px">
      <input v-model="q" :placeholder="$t('Filter notes…')" style="flex:1">
      <button class="pri" @click="create()" :title="$t('New note')">＋</button>
    </div>
    <div class="row" style="margin-bottom:8px">
      <select v-model="tpl" style="flex:1"><option v-for="(v,k) in TEMPLATES" :key="k" :value="k">{{ $t(k) }}</option></select>
      <select v-model="sort"><option value="upd">{{ $t('Recent') }}</option><option value="az">A–Z</option><option value="cr">{{ $t('Created') }}</option></select>
    </div>
    <div class="row" style="margin-bottom:8px"><span class="pill" v-for="t in allTags" :key="t" :class="{on:tag===t}" style="cursor:pointer" @click="tag=tag===t?'':t">#{{t}}</span></div>
    <div class="items">
      <div v-for="n in list" :key="n.id" class="nitem" :class="{on:cur&&cur.id===n.id}" :style="{borderLeftColor:n.color||'#ddd'}" @click="select(n)">
        <div class="t"><span v-if="n.pinned" class="pin-dot"></span>{{n.title||$t('Untitled')}}</div>
        <div class="s">{{(n.body||'').replace(/[#*>|\\n$]+/g,' ').slice(0,70)}}</div>
      </div>
      <div v-if="!list.length" class="muted pad">{{ $t('No notes. Click ＋') }}</div>
    </div>
  </div>
  <div class="editor" v-if="cur">
    <div class="row" style="margin-bottom:6px">
      <input class="titlein" v-model="cur.title" :placeholder="$t('Title')" @input="dirty">
      <input type="color" v-model="cur.color" @input="dirty" :title="$t('Note colour')">
      <button @click="cur.pinned=!cur.pinned;dirty()" :class="{on:cur.pinned}" :title="$t('Pin')">{{ $t('Pin') }}</button>
      <button @click="focus=!focus" :class="{on:focus}" :title="$t('Focus mode')">{{ $t('Focus') }}</button>
      <select v-model="mode"><option value="split">{{ $t('Split') }}</option><option value="edit">{{ $t('Edit') }}</option><option value="view">{{ $t('Preview') }}</option></select>
    </div>
    <div class="row" style="margin-bottom:6px">
      <input :value="(cur.tags||[]).join(', ')" @change="setTags($event.target.value)" :placeholder="$t('tags, comma separated')" style="flex:1">
      <span class="muted small">{{ $t('{w} words · {m} min read',{w:words,m:Math.max(1,Math.round(words/200))}) }} · {{saved}}</span>
    </div>
    <div class="row" style="margin-bottom:6px">
      <button class="sm" @click="wrap('**','**')"><b>B</b></button><button class="sm" @click="wrap('*','*')"><i>I</i></button>
      <button class="sm" @click="line('# ')">H1</button><button class="sm" @click="line('## ')">H2</button>
      <button class="sm" @click="line('- ')">{{ $t('• List') }}</button><button class="sm" @click="line('- [ ] ')">{{ $t('Task') }}</button>
      <button class="sm" @click="wrap('$','$')">{{ $t('∑ Math') }}</button><button class="sm" @click="wrap('{{','}}')">{{ $t('[…] Cloze') }}</button>
      <button class="sm" @click="ins('\\n| A | B |\\n|---|---|\\n|   |   |\\n')">{{ $t('▦ Table') }}</button>
      <button class="sm" @click="ins('[['+'Note title'+']]')">{{ $t('Link') }}</button>
      <select class="sm" @change="insChart($event)"><option value="">{{ $t('Embed graph…') }}</option><option v-for="c in S.chart" :value="c.id">{{c.title}}</option></select>
      <select class="sm" @change="insCite($event)"><option value="">{{ $t('Cite…') }}</option><option v-for="s in S.source" :value="citeKey(s)">{{citeShort(s)}}</option></select>
      <span class="grow"></span>
      <button class="sm" @click="makeCards" :title="$t('Lines Q :: A or double-curly cloze words become flashcards')">{{ $t('Make cards') }}</button>
      <button class="sm" @click="exportMd">{{ $t('.md') }}</button>
      <button class="sm danger" @click="del">{{ $t('Delete') }}</button>
    </div>
    <div class="split" :class="{one:mode!=='split'}">
      <textarea v-if="mode!=='view'" class="fill" ref="ta" v-model="cur.body" @input="dirty" @keydown.tab.prevent="ins('  ')" :placeholder="$t('Write Markdown… use [[links]], $math$, ![[chart:ID]], [@citekey]')"></textarea>
      <div v-if="mode!=='edit'" class="preview md" ref="pv" v-html="html" @click="pvClick"></div>
    </div>
    <div class="row small" style="margin-top:6px;align-items:flex-start">
      <div class="back" style="flex:1"><b>{{ $t('Backlinks:') }}</b> <a v-for="b in backlinks" :key="b.id" @click="select(b)">← {{b.title}}</a><span v-if="!backlinks.length" class="muted"> {{ $t('none') }}</span></div>
      <div class="back" style="flex:1"><b>{{ $t('Outline:') }}</b> <span v-for="h in outline" :key="h.t" :style="{marginLeft:h.l*10+'px',display:'block'}" class="muted">{{h.t}}</span></div>
    </div>
  </div>
  <div v-else class="muted pad">{{ $t('Select or create a note.') }}</div>
</div>`,
  setup() {
    const q = ref(''), tag = ref(''), sort = ref('upd'), cur = ref(null), tpl = ref('Blank'), mode = ref(localStorage.nmode || 'split');
    const focus = ref(false), saved = ref(''), ta = ref(null), pv = ref(null);
    const embeds = [];
    watch(mode, v => localStorage.nmode = v);
    const allTags = computed(() => [...new Set(S.note.flatMap(n => n.tags || []))].sort());
    const list = computed(() => {
      let l = S.note.filter(n => (!tag.value || (n.tags || []).includes(tag.value)) &&
        (!q.value || (n.title + ' ' + n.body).toLowerCase().includes(q.value.toLowerCase())));
      l = [...l].sort((a, b) => sort.value === 'az' ? a.title.localeCompare(b.title) : sort.value === 'cr' ? b.created.localeCompare(a.created) : b.updated.localeCompare(a.updated));
      return [...l.filter(n => n.pinned), ...l.filter(n => !n.pinned)];
    });
    const html = computed(() => cur.value ? renderMarkdown(cur.value.body, { notes: S.note, sources: S.source }) : '');
    const words = computed(() => (cur.value?.body || '').trim().split(/\s+/).filter(Boolean).length);
    const backlinks = computed(() => cur.value ? S.note.filter(n => n.id !== cur.value.id && new RegExp('\\[\\[' + cur.value.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]\\]', 'i').test(n.body || '')) : []);
    const outline = computed(() => (cur.value?.body || '').split('\n').filter(l => /^#{1,3} /.test(l)).map(l => ({ l: l.match(/^#+/)[0].length - 1, t: l.replace(/^#+\s*/, '') })));
    const select = n => { flush(); cur.value = { ...n }; saved.value = ''; };
    let timer;
    const flush = async () => {
      clearTimeout(timer);
      if (cur.value && cur.value._dirty) { const { _dirty, ...d } = cur.value; cur.value._dirty = false; const r = await saveDoc('note', d); saved.value = T('saved') + ' ' + new Date().toLocaleTimeString(); }
    };
    const dirty = () => { cur.value._dirty = true; saved.value = T('editing…'); clearTimeout(timer); timer = setTimeout(flush, 700); };
    const create = async (title = T('Untitled'), body) => {
      const r = await saveDoc('note', { title, body: body ?? (lang.value === 'es' ? TEMPLATES_ES : TEMPLATES)[tpl.value], tags: [], color: '#fff3b0' });
      cur.value = { ...r }; await nextTick(); ta.value?.focus(); return r;
    };
    const setTags = v => { cur.value.tags = v.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean); dirty(); };
    const del = async () => { if (confirm(T('Delete this note?'))) { await removeDoc('note', cur.value.id); cur.value = null; } };
    // editing helpers
    const sel = () => { const e = ta.value; return [e.selectionStart, e.selectionEnd]; };
    const setBody = (v, a, b) => { cur.value.body = v; dirty(); nextTick(() => { ta.value.focus(); ta.value.setSelectionRange(a, b); }); };
    const wrap = (l, r) => { if (!ta.value) return; const [s, e] = sel(), b = cur.value.body; setBody(b.slice(0, s) + l + b.slice(s, e) + r + b.slice(e), s + l.length, e + l.length); };
    const ins = t => { if (!ta.value) return; const [s, e] = sel(), b = cur.value.body; setBody(b.slice(0, s) + t + b.slice(e), s + t.length, s + t.length); };
    const line = p => { if (!ta.value) return; const [s] = sel(), b = cur.value.body, st = b.lastIndexOf('\n', s - 1) + 1; setBody(b.slice(0, st) + p + b.slice(st), s + p.length, s + p.length); };
    const insChart = e => { if (e.target.value) ins(`\n![[chart:${e.target.value}]]\n`); e.target.value = ''; };
    const insCite = e => { if (e.target.value) ins(`[@${e.target.value}]`); e.target.value = ''; };
    const makeCards = async () => {
      await flush(); const r = await api('cards/from-note/' + cur.value.id, 'POST', {});
      await load(['card']); toast(r.length ? T('{n} flashcards created', { n: r.length }) : T('No new cards: use Q :: A lines or cloze words'));
    };
    const exportMd = () => download((cur.value.title || 'note') + '.md', `# ${cur.value.title}\n\n${cur.value.body}`);
    const pvClick = e => {
      const t = e.target;
      if (t.dataset.wiki !== undefined) {
        e.preventDefault(); const n = S.note.find(n => n.title.toLowerCase() === t.dataset.wiki.toLowerCase());
        if (n) select(n); else if (confirm(T('Create note "{t}"?', { t: t.dataset.wiki }))) create(t.dataset.wiki, `# ${t.dataset.wiki}\n`);
      } else if (t.dataset.tag) { e.preventDefault(); tag.value = t.dataset.tag; }
      else if (t.dataset.cite) { e.preventDefault(); localStorage.view = 'research'; location.reload(); }
      else if (t.dataset.ci !== undefined) { cur.value.body = mdToggleCheck(cur.value.body, +t.dataset.ci); dirty(); }
    };
    // embed charts after each render
    const mountEmbeds = async () => {
      await nextTick(); embeds.splice(0).forEach(c => c.destroy());
      pv.value?.querySelectorAll('.chart-embed').forEach(el => {
        const doc = S.chart.find(c => c.id === +el.dataset.chart); if (!doc) { el.textContent = T('graph not found'); return; }
        el.innerHTML = '<canvas></canvas>';
        try { embeds.push(new Chart(el.firstChild, buildChartConfig(doc))); } catch (e) { el.textContent = e.message; }
      });
    };
    watch(html, mountEmbeds); watch(mode, mountEmbeds);
    const openPending = () => {
      const id = +localStorage.openNote; if (!id) return false;
      const n = S.note.find(n => n.id === id); if (!n) return false;
      select(n); localStorage.openNote = ''; return true;
    };
    const autoSelect = () => { if (!openPending() && !cur.value && list.value.length) select(list.value[0]); };
    onMounted(() => { autoSelect(); window.addEventListener('open-note', openPending); });
    watch(() => S.note.length, autoSelect);
    onBeforeUnmount(() => { window.removeEventListener('open-note', openPending); flush(); embeds.forEach(c => c.destroy()); });
    return { lang, q, tag, sort, cur, list, allTags, html, words, backlinks, outline, select, create, dirty, setTags, del, wrap, ins, line, insChart, insCite, makeCards, exportMd, pvClick, tpl, TEMPLATES, mode, focus, saved, ta, pv, S, citeKey, citeShort };
  },
};
