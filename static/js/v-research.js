Views.research = {
  emits: ['open-note'],
  template: `
<div><h1>{{ $t('Research library') }}</h1>
<div class="grid g2 top">
  <div>
    <div class="row" style="margin-bottom:8px"><input v-model="q" :placeholder="$t('Search sources…')" style="flex:1"><button class="pri" @click="create">{{ $t('＋ Source') }}</button></div>
    <div class="card" v-for="s in list" :key="s.id" :style="cur&&cur.id===s.id?'outline:2px solid var(--accent)':''" @click="cur={...s}" style="cursor:pointer;margin-bottom:8px">
      <b>{{s.title||$t('Untitled')}}</b> <span class="pill">{{s.type}}</span><span class="pill" v-for="t in s.tags||[]">{{t}}</span>
      <div class="muted small">{{s.authors}} ({{s.year}}) — {{s.container}}</div>
      <div class="small">{{ $t('cite as') }} <code>[@{{citeKey(s)}}]</code> · {{ $t('mentioned in {n} note(s)',{n:mentions(s)}) }}</div>
    </div>
    <div v-if="!list.length" class="muted">{{ $t('No sources yet.') }}</div>
  </div>
  <div>
    <div class="card" v-if="cur"><h2>{{ cur.id ? $t('Edit source') : $t('New source') }}</h2>
      <div class="form"><label class="f">{{ $t('Type') }}<select v-model="cur.type"><option>{{ $t('article') }}</option><option>{{ $t('book') }}</option><option>{{ $t('web') }}</option><option>{{ $t('report') }}</option></select></label>
        <label class="f">{{ $t('Year') }}<input v-model="cur.year"></label></div>
      <label class="f">{{ $t('Title') }}<input v-model="cur.title"></label>
      <label class="f">{{ $t('Authors (Last, First; Last, First)') }}<input v-model="cur.authors"></label>
      <div class="form" style="margin-top:8px"><label class="f">{{ $t('Journal / publisher / site') }}<input v-model="cur.container"></label><label class="f">{{ $t('Volume(issue)') }}<input v-model="cur.volume"></label>
        <label class="f">{{ $t('Pages') }}<input v-model="cur.pages"></label><label class="f">{{ $t('DOI') }}<input v-model="cur.doi"></label></div>
      <label class="f">{{ $t('URL') }}<input v-model="cur.url"></label>
      <label class="f">{{ $t('Tags') }}<input :value="(cur.tags||[]).join(', ')" @change="cur.tags=$event.target.value.split(',').map(s=>s.trim()).filter(Boolean)"></label>
      <label class="f">{{ $t('Notes / key takeaways') }}<textarea v-model="cur.notes" rows="4"></textarea></label>
      <div class="row" style="margin-top:8px"><button class="pri" @click="save">{{ $t('Save') }}</button><button @click="note">{{ $t('Create reading note') }}</button><button class="danger" @click="del" v-if="cur.id">{{ $t('Delete') }}</button></div>
      <h3>{{ $t('Citation preview') }}</h3><div v-for="st in styles" :key="st" class="small"><b>{{st.toUpperCase()}}</b> <button class="sm" @click="copyOne(st)">{{ $t('copy') }}</button><pre style="white-space:pre-wrap;margin:2px 0 8px" class="mono">{{prev[st]}}</pre></div>
    </div>
    <div class="card"><h2>{{ $t('Bibliography') }}</h2>
      <div class="row"><select v-model="style"><option value="apa">{{ $t('APA 7') }}</option><option value="mla">{{ $t('MLA') }}</option><option value="chicago">{{ $t('Chicago') }}</option><option value="bibtex">{{ $t('BibTeX') }}</option></select>
        <button @click="bib">{{ $t('Generate') }}</button><button @click="copy(out)" :disabled="!out">{{ $t('Copy') }}</button><button @click="download('references.'+(style==='bibtex'?'bib':'txt'),out)" :disabled="!out">{{ $t('Download') }}</button></div>
      <pre class="mono small" style="white-space:pre-wrap">{{out}}</pre></div>
  </div>
</div></div>`,
  setup(_, { emit }) {
    const q = ref(''), cur = ref(null), style = ref('apa'), out = ref(''), prev = reactive({}), styles = ['apa', 'mla', 'chicago', 'bibtex'];
    const list = computed(() => S.source.filter(s => !q.value || JSON.stringify(s).toLowerCase().includes(q.value.toLowerCase())).sort((a, b) => (a.authors || '').localeCompare(b.authors || '')));
    const mentions = s => S.note.filter(n => (n.body || '').includes('[@' + citeKey(s) + ']')).length;
    const create = () => { cur.value = { type: 'article', title: '', authors: '', year: new Date().getFullYear().toString(), container: '', volume: '', pages: '', doi: '', url: '', tags: [], notes: '' }; };
    const save = async () => { cur.value = { ...(await saveDoc('source', cur.value)) }; toast(T('Source saved')); bib(); };
    const del = async () => { if (confirm(T('Delete source?'))) { await removeDoc('source', cur.value.id); cur.value = null; } };
    const note = async () => {
      const n = await saveDoc('note', { title: 'Reading: ' + cur.value.title, tags: ['reading'], color: '#e2f0cb', body: `# ${cur.value.title}\n**Source:** [@${citeKey(cur.value)}]\n\n## Summary\n${cur.value.notes || ''}\n\n## Key quotes\n> \n\n## Questions\n- [ ] \n` });
      localStorage.openNote = n.id; emit('open-note', n.id);
    };
    const bib = async () => { out.value = (await api('cite?style=' + style.value)).map(c => c.text).join(style.value === 'bibtex' ? '\n\n' : '\n\n'); };
    watch(style, bib);
    // live preview of citations using server formatter (save-less): only for saved sources
    watch(() => cur.value && cur.value.id && JSON.stringify(cur.value), async () => {
      if (!cur.value?.id) { styles.forEach(s => prev[s] = 'Save the source to preview'); return; }
      for (const s of styles) prev[s] = (await api(`cite?style=${s}&ids=${cur.value.id}`))[0]?.text;
    }, { immediate: true });
    const copyOne = s => copy(prev[s]);
    onMounted(bib);
    return { S, q, cur, style, out, prev, styles, list, mentions, create, save, del, note, bib, citeKey, copy, download, copyOne };
  },
};
