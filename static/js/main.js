const App = {
  setup() {
    const nav = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'notes', label: 'Notes' },
      { id: 'charts', label: 'Graphs' },
      { id: 'finance', label: 'Finance' },
      { id: 'study', label: 'Study' },
      { id: 'research', label: 'Research' },
      { id: 'lab', label: 'Lab' },
      { id: 'help', label: 'Help' },
    ];
    const view = ref(localStorage.view || 'dashboard');
    const dash = ref({});
    const dark = ref(localStorage.dark === '1');
    const palette = ref(false), q = ref(''), hits = ref([]), pin = ref(null);
    const applyTheme = () => {
      document.documentElement.classList.toggle('dark', dark.value);
      Chart.defaults.color = dark.value ? '#aeb8dd' : '#4a5578';
      Chart.defaults.borderColor = dark.value ? 'rgba(150,165,235,.15)' : 'rgba(100,115,170,.15)';
      Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    };
    applyTheme();
    const toggleTheme = () => { dark.value = !dark.value; localStorage.dark = dark.value ? 1 : 0; applyTheme(); };
    const refresh = async () => { dash.value = await api('dashboard'); };
    const go = id => { view.value = id; localStorage.view = id; refresh(); };
    const openNote = id => { localStorage.openNote = id; go('notes'); window.dispatchEvent(new Event('open-note')); };
    watch(q, debounce(async v => { hits.value = v.trim() ? await api('search?q=' + encodeURIComponent(v)) : []; }, 150));
    watch(palette, async v => { if (v) { q.value = ''; hits.value = []; await nextTick(); pin.value?.focus(); } });
    const openHit = h => {
      palette.value = false;
      if (h.kind === 'note') openNote(h.id);
      else go({ card: 'study', task: 'study', source: 'research', chart: 'charts' }[h.kind]);
    };
    const firstHit = () => { if (hits.value[0]) openHit(hits.value[0]); };
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.value = !palette.value; }
    });
    const version = ref('');
    // Presence heartbeat: lets the desktop build exit once its window is closed.
    const beat = () => api('ping').then(r => { version.value = r.version; }).catch(() => { });
    beat(); setInterval(beat, 15000);
    window.addEventListener('pagehide', () => navigator.sendBeacon && navigator.sendBeacon('/api/bye'));
    onMounted(async () => { await load(); S.ready = true; refresh(); });
    return { version, lang, setLang, pageKey: computed(() => view.value + dark.value + lang.value), nav, view, go, dash, dark, toggleTheme, palette, q, hits, pin, openHit, firstHit, S, openNote, refresh };
  },
};
// Textareas grow with their content (CSS field-sizing where supported, JS fallback otherwise).
if (!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) {
  const fit = el => { if (el.classList.contains('fill')) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 2, innerHeight * 0.6) + 'px'; };
  document.addEventListener('input', e => e.target.tagName === 'TEXTAREA' && fit(e.target));
  let raf; new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => document.querySelectorAll('textarea').forEach(fit)); })
    .observe(document.documentElement, { childList: true, subtree: true });
}
const app = Vue.createApp(App);
app.config.globalProperties.$t = T;
app.component('chart-view', ChartView);
app.component('skeleton-page', SkeletonPage);
app.component('sk', Sk);
app.component('sk-result', SkResult);
for (const [k, v] of Object.entries(Views)) app.component('v-' + k, v);
app.mount('#app');
