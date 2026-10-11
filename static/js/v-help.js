Views.help = {
  template: `<div>
  <h1>{{ $t('Help & tutorial') }}</h1>
  <div class="card row" style="gap:10px">
    <input v-model="q" :placeholder="$t('Search the tutorial…')" style="flex:1;min-width:220px">
    <button @click="exp">{{ $t('Export all data (JSON)') }}</button>
    <label class="filebtn">{{ $t('Import') }}<input type="file" accept=".json" @change="imp" hidden></label>
    <button @click="seed">{{ $t('Load demo data') }}</button>
    <button @click="toggleAll">{{ allOpen ? $t('Collapse all') : $t('Expand all') }}</button>
  </div>
  <div class="chips" v-if="sections.length">
    <a v-for="(s,i) in sections" :key="i" class="chip" href="#" @click.prevent="jump(i)">{{ s.title }}</a>
  </div>
  <div class="card md" v-if="intro && !q" v-html="intro"></div>
  <div class="help-cols">
    <section v-for="s in shown" :key="s.i" :id="'help-'+s.i" class="card md help-sec" :class="{closed: !isOpen(s.i)}">
      <h2 class="help-h" @click="toggle(s.i)"><span>{{ s.title }}</span><i class="chev"></i></h2>
      <div class="help-body" v-show="isOpen(s.i)" v-html="s.html"></div>
    </section>
  </div>
  <div v-if="q && !shown.length" class="muted pad">{{ $t('No matches') }}</div>
</div>`,
  setup() {
    const raw = ref(''), q = ref(''), closed = reactive({});
    const loadHelp = async () => { raw.value = await (await fetch('/tutorial.md?lang=' + lang.value)).text(); };
    onMounted(loadHelp); watch(lang, loadHelp);
    const parts = computed(() => raw.value.split(/^## /m));
    const intro = computed(() => renderMarkdown(parts.value[0] || '', {}));
    const sections = computed(() => parts.value.slice(1).map((p, i) => {
      const nl = p.indexOf('\n'), title = p.slice(0, nl).replace(/^\d+\.\s*/, '').trim();
      return { i, title, text: p.toLowerCase(), html: renderMarkdown(p.slice(nl + 1), {}) };
    }));
    const shown = computed(() => sections.value.filter(s => !q.value || s.text.includes(q.value.toLowerCase())));
    const isOpen = i => !!q.value || !closed[i];
    const toggle = i => { closed[i] = !closed[i]; };
    const allOpen = computed(() => sections.value.every(s => !closed[s.i]));
    const toggleAll = () => { const o = allOpen.value; sections.value.forEach(s => (closed[s.i] = o)); };
    const jump = i => { closed[i] = false; q.value = ''; nextTick(() => document.getElementById('help-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
    const exp = () => { location.href = '/api/export'; };
    const imp = async e => { const r = await api('import', 'POST', JSON.parse(await e.target.files[0].text())); await load(); toast(T('{n} items imported', { n: r.imported })); };
    const seed = async () => { const r = await api('seed', 'POST', { lang: lang.value }); await load(); toast(r.seeded ? T('Demo data loaded') : T('Demo data only loads into an empty notebook')); };
    return { q, intro, sections, shown, isOpen, toggle, allOpen, toggleAll, jump, exp, imp, seed };
  },
};
