/* Tiny i18n: English text is the key; Spanish lives in i18n-es.js (window.ES). */
const lang = ref(localStorage.lang || ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'));
document.documentElement.lang = lang.value;
function T(key, params) {
  let s = (lang.value === 'es' && window.ES && window.ES[key]) || key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, n) => (n in params ? params[n] : m));
  return s;
}
function setLang(l) { lang.value = l; localStorage.lang = l; document.documentElement.lang = l; }
