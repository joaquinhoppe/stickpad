/* Shared helpers: API, markdown, safe math parser, CSV, chart config. */
const { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, markRaw } = Vue;
window.Views = {};

// ---------------------------------------------------------------- API
async function api(path, method = 'GET', body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    if (typeof body === 'string') { opt.body = body; opt.headers['Content-Type'] = 'text/plain'; }
    else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  }
  const r = await fetch('/api/' + path, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

// ------------------------------------------------------------ store
const S = reactive({
  note: [], chart: [], card: [], source: [], txn: [], task: [], session: [], holding: [],
  toast: '', toastAct: null, toastT: null,
});
const KINDS = ['note', 'chart', 'card', 'source', 'txn', 'task', 'session', 'holding'];
async function load(kinds = KINDS) {
  await Promise.all(kinds.map(async k => { S[k] = await api(k); }));
}
async function saveDoc(kind, doc) {
  const { id, ...rest } = doc;
  const res = id ? await api(`${kind}/${id}`, 'PUT', rest) : await api(kind, 'POST', rest);
  const i = S[kind].findIndex(d => d.id === res.id);
  if (i >= 0) S[kind][i] = res; else S[kind].push(res);
  return res;
}
async function removeDoc(kind, id) {
  await api(`${kind}/${id}`, 'DELETE');
  S[kind] = S[kind].filter(d => d.id !== id);
}
function toast(msg, action) {
  S.toast = msg; S.toastAct = action || null; clearTimeout(S.toastT);
  S.toastT = setTimeout(() => (S.toast = ''), action ? 4500 : 2400);
}
// Tasks: optimistic toggle, stays visible ~1s so the change is noticeable, with undo.
const recentTasks = reactive(new Set());
async function toggleTask(x, undo = false) {
  const nd = !x.done, i = S.task.findIndex(t => t.id === x.id);
  if (i >= 0) S.task[i] = { ...S.task[i], done: nd };
  recentTasks.add(x.id); setTimeout(() => recentTasks.delete(x.id), 1100);
  try {
    await api(`task/${x.id}`, 'PUT', { done: nd });
    if (nd) api('log', 'POST', { date: today(), type: 'task', amount: 2 }).catch(() => { });
  } catch (e) { if (i >= 0) S.task[i] = { ...S.task[i], done: !nd }; toast(e.message); return; }
  if (nd && !undo) toast(T('Task completed'), { label: T('Undo'), fn: () => toggleTask({ ...x, done: true }, true) });
  window.dispatchEvent(new Event('data-changed'));
}
// v-count: animates a number from 0 to its value (short, rAF-based, skipped if reduced motion).
const vCount = {
  mounted(el, b) { vCount.run(el, +b.value || 0); },
  updated(el, b) { if (+b.value !== +el._to) vCount.run(el, +b.value || 0); },
  run(el, to) {
    const from = +el._to || 0; el._to = to;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 650;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  },
};
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const money = n => fmt(n, 0);
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
}
function copy(text) { navigator.clipboard?.writeText(text); toast(T('Copied')); }
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ------------------------------------------------------- safe math parser
// Recursive descent: + - * / ^ %, unary -, functions, constants, variables.
const FN = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, sign: Math.sign, cbrt: Math.cbrt,
  fact: n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
  min: Math.min, max: Math.max, pow: Math.pow,
  erf: x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; },
  ncdf: x => 0.5 * (1 + FN.erf(x / Math.SQRT2)),
  npdf: x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI),
};
const CONST = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };
function compileExpr(src, vars = ['x']) {
  const toks = [];
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_]\w*|\*\*|[-+*/^%(),])/gy;
  let m, pos = 0;
  src = src.trim();
  while (pos < src.length) {
    re.lastIndex = pos; m = re.exec(src);
    if (!m) throw new Error('Unexpected character at ' + pos + ': "' + src[pos] + '"');
    toks.push(m[1]); pos = re.lastIndex;
    while (src[pos] === ' ') pos++;
  }
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  function expr() {
    let l = term();
    while (peek() === '+' || peek() === '-') { const o = next(), r = term(), a = l; l = o === '+' ? s => a(s) + r(s) : s => a(s) - r(s); }
    return l;
  }
  function term() {
    let l = unary();
    while (peek() === '*' || peek() === '/' || peek() === '%' || (peek() && /^[A-Za-z_(]/.test(peek()) && implicit())) {
      let o = peek();
      if (o === '*' || o === '/' || o === '%') next(); else o = '*';
      const r = unary(), a = l;
      l = o === '*' ? s => a(s) * r(s) : o === '/' ? s => a(s) / r(s) : s => a(s) % r(s);
    }
    return l;
  }
  const implicit = () => true; // 2x, 2(x+1), 3sin(x)
  function unary() {
    if (peek() === '-') { next(); const a = unary(); return s => -a(s); }
    if (peek() === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const b = atom();
    if (peek() === '^' || peek() === '**') { next(); const e = unary(), a = b; return s => Math.pow(a(s), e(s)); }
    return b;
  }
  function atom() {
    const t = next();
    if (t === undefined) throw new Error('Unexpected end of formula');
    if (t === '(') { const v = expr(); if (next() !== ')') throw new Error('Missing )'); return v; }
    if (/^[\d.]/.test(t)) { const n = parseFloat(t); return () => n; }
    if (/^[A-Za-z_]/.test(t)) {
      const k = t.toLowerCase();
      if (peek() === '(' && FN[k]) {
        next(); const args = [];
        if (peek() !== ')') { do { args.push(expr()); } while (peek() === ',' && next()); }
        if (next() !== ')') throw new Error('Missing )');
        const f = FN[k]; return s => f(...args.map(a => a(s)));
      }
      if (vars.includes(t)) return s => s[t];
      if (k in CONST) return () => CONST[k];
      throw new Error('Unknown name: ' + t);
    }
    throw new Error('Unexpected "' + t + '"');
  }
  const f = expr();
  if (i < toks.length) throw new Error('Unexpected "' + toks[i] + '"');
  return f;
}
function evalExpr(src) { return compileExpr(src, [])({}); }

// ------------------------------------------------------------------ CSV
function parseTable(text) {
  text = (text || '').trim();
  if (!text) return { head: [], rows: [] };
  const first = text.split('\n')[0];
  const sep = first.includes('\t') ? '\t' : first.includes(';') && !first.includes(',') ? ';' : ',';
  const rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => {
    const out = []; let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    out.push(cur.trim()); return out;
  });
  return { head: rows[0], rows: rows.slice(1) };
}
const num = v => { const n = parseFloat(String(v).replace(/[, €$%]/g, '')); return isNaN(n) ? null : n; };

// ------------------------------------------------------- chart configs
const PAL = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab'];
function linreg(pts) {
  const n = pts.length; if (n < 2) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  pts.forEach(p => { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; });
  if (!sxx) return null;
  const b = sxy / sxx; return { slope: b, intercept: my - b * mx, r2: syy ? sxy * sxy / (sxx * syy) : 1 };
}
function buildChartConfig(doc) {
  const type = doc.type || 'bar';
  const opts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 550, easing: 'easeOutQuart' },
    plugins: { title: { display: !!doc.title, text: doc.title }, legend: { display: true } },
    scales: {},
  };
  const axisTitle = (t) => ({ display: !!t, text: t });
  if (type === 'function') {
    const xmin = +doc.xmin, xmax = +doc.xmax, N = 500;
    const datasets = (doc.expr || '').split(';').filter(s => s.trim()).map((src, k) => {
      const f = compileExpr(src, ['x']); const data = [];
      for (let i = 0; i <= N; i++) { const x = xmin + (xmax - xmin) * i / N, y = f({ x }); if (isFinite(y) && Math.abs(y) < 1e9) data.push({ x, y }); }
      return { label: 'y = ' + src.trim(), data, showLine: true, pointRadius: 0, borderWidth: 2, borderColor: PAL[k % 10], backgroundColor: PAL[k % 10] };
    });
    opts.scales = { x: { type: 'linear', title: axisTitle(doc.xlabel || 'x') }, y: { title: axisTitle(doc.ylabel || 'y') } };
    return { type: 'scatter', data: { datasets }, options: opts };
  }
  const { head, rows } = parseTable(doc.data);
  const series = head.slice(1);
  if (type === 'pie' || type === 'doughnut') {
    return { type, data: { labels: rows.map(r => r[0]), datasets: [{ data: rows.map(r => num(r[1])), backgroundColor: rows.map((_, i) => PAL[i % 10]) }] }, options: opts };
  }
  if (type === 'scatter') {
    const datasets = series.map((s, k) => {
      const pts = rows.map(r => ({ x: num(r[0]), y: num(r[k + 1]) })).filter(p => p.x != null && p.y != null);
      return { label: s, data: pts, backgroundColor: PAL[k % 10], pointRadius: 4 };
    });
    if (doc.trend) datasets.slice().forEach((d, k) => {
      const lr = linreg(d.data); if (!lr) return;
      const xs = d.data.map(p => p.x), a = Math.min(...xs), b = Math.max(...xs);
      datasets.push({ label: `${d.label} ${T('trend')} (R²=${lr.r2.toFixed(3)})`, type: 'line', pointRadius: 0, borderDash: [6, 4], borderColor: PAL[k % 10], data: [{ x: a, y: lr.intercept + lr.slope * a }, { x: b, y: lr.intercept + lr.slope * b }] });
    });
    opts.scales = { x: { type: 'linear', title: axisTitle(doc.xlabel || head[0]) }, y: { title: axisTitle(doc.ylabel) } };
    return { type: 'scatter', data: { datasets }, options: opts };
  }
  const datasets = series.map((s, k) => ({
    label: s, data: rows.map(r => num(r[k + 1])), backgroundColor: PAL[k % 10] + (type === 'line' ? '33' : 'cc'),
    borderColor: PAL[k % 10], fill: type === 'area', tension: 0.25, borderWidth: 2,
  }));
  if (doc.trend && type !== 'radar') series.forEach((s, k) => {
    const pts = datasets[k].data.map((y, x) => ({ x, y })).filter(p => p.y != null); const lr = linreg(pts);
    if (lr) datasets.push({ label: `${s} ${T('trend')}`, type: 'line', pointRadius: 0, borderDash: [6, 4], borderColor: PAL[k % 10], data: rows.map((_, x) => lr.intercept + lr.slope * x) });
  });
  if (type !== 'radar') {
    opts.scales = { x: { stacked: !!doc.stacked, title: axisTitle(doc.xlabel) }, y: { stacked: !!doc.stacked, title: axisTitle(doc.ylabel) } };
    if (doc.logy) opts.scales.y.type = 'logarithmic';
  }
  return { type: type === 'area' ? 'line' : type, data: { labels: rows.map(r => r[0]), datasets }, options: opts };
}

// ----------------------------------------------------------- Markdown
function citeKey(s) {
  const a = (s.authors || '').split(/;|\band\b/)[0].trim();
  const last = (a.includes(',') ? a.split(',')[0] : a.split(' ').pop()).toLowerCase().replace(/\W/g, '');
  return last + (s.year || '');
}
function citeShort(s) {
  const au = (s.authors || '').split(/;|\band\b/).map(x => x.trim()).filter(Boolean).map(a => a.includes(',') ? a.split(',')[0] : a.split(' ').pop());
  const n = au.length > 2 ? au[0] + ' et al.' : au.join(' & ');
  return `${n || s.title}, ${s.year || 'n.d.'}`;
}
function sanitize(html) {
  return html.replace(/<\/?(script|iframe|object|embed|style)[^>]*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');
}
function renderMarkdown(src, ctx = {}) {
  const maths = [], codes = [];
  let text = (src || '').replace(/```[\s\S]*?```|`[^`\n]+`/g, m => { codes.push(m); return `@@C${codes.length - 1}@@`; });
  text = text.replace(/\$\$([\s\S]+?)\$\$|(?<![\\$\w])\$([^\s$][^$\n]*?[^\s$\\]|[^\s$])\$(?![\w$])/g, (m, d, i) => {
    maths.push({ tex: d ?? i, display: d != null }); return `@@M${maths.length - 1}@@`;
  });
  text = text.replace(/!\[\[chart:(\d+)\]\]/g, '<div class="chart-embed" data-chart="$1"></div>');
  text = text.replace(/\[\[([^\]]+)\]\]/g, (m, t) => {
    const hit = (ctx.notes || []).find(n => n.title.toLowerCase() === t.toLowerCase());
    return `<a href="#" class="wiki ${hit ? '' : 'missing'}" data-wiki="${t.replace(/"/g, '')}">${t}</a>`;
  });
  text = text.replace(/\[@([\w-]+)\]/g, (m, k) => {
    const s = (ctx.sources || []).find(x => citeKey(x) === k.toLowerCase());
    return s ? `<a href="#" class="cite" data-cite="${s.id}">(${citeShort(s)})</a>` : `<span class="missing">[@${k}?]</span>`;
  });
  text = text.replace(/(^|\s)#([A-Za-z][\w-]+)/g, (m, p, t) => `${p}<a href="#" class="tag" data-tag="${t}">#${t}</a>`);
  text = text.replace(/\{\{(.+?)\}\}/g, '<mark>$1</mark>');
  text = text.replace(/@@C(\d+)@@/g, (m, i) => codes[+i]);
  let html = marked.parse(text, { gfm: true, breaks: true });
  let ci = 0;
  html = html.replace(/<input (checked="" )?(disabled="" )?type="checkbox"( disabled="")?>/g, (m, c) => `<input type="checkbox" data-ci="${ci++}" ${c ? 'checked' : ''}>`);
  html = html.replace(/@@M(\d+)@@/g, (m, i) => {
    const { tex, display } = maths[+i];
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }); } catch { return tex; }
  });
  return sanitize(html);
}
function mdToggleCheck(body, idx) {
  let n = -1;
  return body.replace(/^(\s*(?:[-*+]|\d+\.)\s+)\[( |x|X)\]/gm, (m, p, c) => (++n === idx ? `${p}[${c === ' ' ? 'x' : ' '}]` : m));
}

// Reusable chart component
const ChartView = {
  props: { config: Object, height: { type: Number, default: 300 } },
  template: `<div class="chart-box" :style="{height: 'clamp(200px,' + (height / 9).toFixed(1) + 'vh,' + Math.round(height * 1.4) + 'px)'}"><canvas ref="cv"></canvas></div>`,
  setup(props, { expose }) {
    const cv = ref(null); let ch = null;
    const draw = () => {
      if (ch) ch.destroy();
      if (!props.config) return;
      try { ch = new Chart(cv.value, JSON.parse(JSON.stringify(props.config, (k, v) => v))); } catch (e) { console.error(e); }
    };
    onMounted(draw); watch(() => props.config, draw, { deep: true });
    onBeforeUnmount(() => ch && ch.destroy());
    expose({ png: () => cv.value.toDataURL('image/png') });
    return { cv };
  },
};
