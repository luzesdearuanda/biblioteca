/* Biblioteca da Associação Centro de Umbanda Luzes de Aruanda — aplicativo web.
   Os dados ficam na planilha da conta da biblioteca; este arquivo só conversa com a API (Apps Script). */
'use strict';
/* ============ Utilitários ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const z = n => String(n).padStart(2, '0');
const isoLocal = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const TODAY = () => isoLocal(new Date());
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoLocal(new Date(y, m - 1, d + n)); };
const diffDays = (a, b) => { const p = s => s.split('-').map(Number); const [y1, m1, d1] = p(a), [y2, m2, d2] = p(b); return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5); };
const fmtD = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const nowStamp = () => { const d = new Date(); return `${isoLocal(d)} ${z(d.getHours())}:${z(d.getMinutes())}`; };
const fmtStamp = s => s ? `${fmtD(s.slice(0, 10))} ${s.slice(11)}` : '—';
const hhmm = () => { const d = new Date(); return `${z(d.getHours())}:${z(d.getMinutes())}`; };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digits = s => String(s || '').replace(/\D/g, '');
/* Padronização do preenchimento (as mesmas regras na API e no site).
   nome: iniciais maiúsculas, com da/das/de/do/dos/e em minúsculo (José Augusto da Silva; Rua Sete de Setembro; Passo Fundo/RS).
   frase: começa com maiúscula; texto todo em caixa alta vira minúsculo (siglas como PIX e CNH continuam em maiúsculas).
   tel: (54) 9 9999-9999 para celular e (54) 3333-3333 para fixo; devolve null quando falta o DDD. */
const PADRAO = (() => {
  const PART = ['da', 'das', 'de', 'do', 'dos', 'e', 'di', 'du', 'del', 'van', 'von'];
  const SIGLAS = ['PIX', 'CPF', 'RG', 'CNH', 'CIN', 'CEP', 'CNPJ', 'INSS', 'SUS', 'LTDA', 'MEI', 'ONG', 'TV', 'DVD', 'CD', 'USB', 'LED', 'BR', 'RS', 'SC', 'PR', 'SP', 'RJ', 'MG'];
  const UF = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
  const ROMANO = /^(?=[ivx]{2,}$)x{0,3}(ix|iv|v?i{0,3})$/;
  const ACENTO = { mae: 'Mãe', irma: 'Irmã', irmao: 'Irmão', conjuge: 'Cônjuge', tio: 'Tio', tia: 'Tia', 'nao': 'Não', 'sim': 'Sim' };
  const limpa = s => String(s == null ? '' : s).replace(/[\t\u00a0 ]+/g, ' ').trim();
  const cap = w => w.replace(/\p{L}/u, c => c.toUpperCase());
  function palavra(w, primeira) {
    if (/\d/.test(w)) return w.toUpperCase(); // BR-285, 201A, 1º
    const lw = w.toLowerCase(), so = w.replace(/[^\p{L}]/gu, '');
    if (!primeira && PART.indexOf(lw) >= 0) return lw;
    if (ROMANO.test(lw)) return lw.toUpperCase(); // João Paulo II
    if (so.length >= 2 && SIGLAS.indexOf(so) >= 0 && so === so.toUpperCase()) return w; // CEP, RS digitados em sigla
    // partes separadas por hífen, apóstrofo ou barra (Maria-Clara, D'Ávila, Passo Fundo/RS)
    return lw.split(/([-'’\/])/).map((p, i, arr) => {
      const l = p.replace(/[^\p{L}]/gu, '');
      return i > 0 && arr[i - 1] === '/' && l.length === 2 && UF.indexOf(l.toUpperCase()) >= 0 ? p.toUpperCase() : cap(p);
    }).join('');
  }
  const nome = s => limpa(s).split(' ').filter(Boolean).map((w, i) => palavra(w, i === 0)).join(' ');
  function caixaAlta(t) { // TUDO EM CAIXA ALTA → minúsculo, preservando as siglas
    const letras = t.replace(/[^\p{L}]/gu, '');
    if (letras.length < 2 || letras !== letras.toUpperCase() || letras === letras.toLowerCase()) return t;
    return t.toLowerCase().replace(/\p{L}+/gu, w => w.length > 1 && SIGLAS.indexOf(w.toUpperCase()) >= 0 ? w.toUpperCase() : w);
  }
  function frase(s, multilinha) {
    let t = String(s == null ? '' : s).replace(/\r\n?/g, '\n');
    t = multilinha ? t.split('\n').map(limpa).join('\n').replace(/\n{3,}/g, '\n\n').trim() : limpa(t.replace(/\n+/g, ' '));
    t = t.split('\n').map(caixaAlta).join('\n'); // em texto de várias linhas, linha a linha
    return t.replace(/(^|[.!?]\s+|\n)([^\p{L}\p{N}]*?)(\p{L})/gu, (m, a, b, c) => a + b + c.toUpperCase());
  }
  // parentesco e respostas curtas: corrige acentos comuns (MAE → Mãe)
  const curto = s => { const f = frase(s), k = f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return ACENTO[k] || f; };
  function tel(s) {
    const t = limpa(s); if (!t) return '';
    if (/^\+/.test(t) && !/^\+\s*55/.test(t)) return t; // número de fora do Brasil
    let d = t.replace(/\D/g, '');
    if ((d.length === 12 || d.length === 13) && d.slice(0, 2) === '55') d = d.slice(2);
    if ((d.length === 11 || d.length === 12) && d[0] === '0') d = d.slice(1);
    if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2); // celular gravado sem o 9
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return null;
  }
  const upper = s => limpa(s).toUpperCase();
  // tipo: nome | frase | texto (várias linhas) | curto | tel | upper
  function campo(tipo, v) {
    if (tipo === 'nome') return nome(v);
    if (tipo === 'frase') return frase(v);
    if (tipo === 'texto') return frase(v, true);
    if (tipo === 'curto') return curto(v);
    if (tipo === 'tel') return tel(v);
    if (tipo === 'upper') return upper(v);
    return v;
  }
  return { nome, frase, curto, tel, upper, campo };
})();
// Campos que se ajustam sozinhos ao sair deles (a API aplica as mesmas regras ao gravar)
const FMT_ID = { 'f-nome': 'nome', 'f-tel': 'tel', 'f-uobs': 'texto' };
document.addEventListener('focusout', e => {
  const el = e.target, tipo = el && el.id && FMT_ID[el.id];
  if (!tipo || el.readOnly || el.disabled || !('value' in el)) return;
  const v = PADRAO.campo(tipo, el.value);
  if (v !== null && v !== el.value) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
});
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function rndHex(n) {
  const a = new Uint8Array(Math.ceil(n / 2));
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < a.length; i++) a[i] = Math.random() * 256 | 0;
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('').slice(0, n).toUpperCase();
}
function newId(prefix, groups = 3) { return prefix + '-' + rndHex(groups * 4).match(/.{4}/g).join('-'); }
/* Código do exemplar: LIV-0001-ESP (número único no acervo + sigla do gênero). Gerado pelo servidor. */
const fmtNum = n => String(n).padStart(4, '0');
// Aceita "42", "0042", "42esp", "liv 0042 esp", "LIV-0042-ESP". Devolve {num, sigla} ou null.
function parseCodigo(v) {
  let s = String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.startsWith('LIV')) s = s.slice(3);
  const m = s.match(/^([A-Z]{3})?(\d{1,6})([A-Z]{3})?$/);
  if (!m) return null;
  return { num: parseInt(m[2], 10), sigla: m[3] || m[1] || '' };
}
const codeCompact = c => c.replace(/[^0-9A-Z]/g, '').replace(/^LIV/, '');

/* CPF */
function cpfDV(b9) {
  let s = 0; for (let i = 0; i < 9; i++) s += +b9[i] * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  s = 0; const b10 = b9 + d1; for (let i = 0; i < 10; i++) s += +b10[i] * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return '' + d1 + d2;
}
function cpfValido(c) { c = digits(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false; return cpfDV(c.slice(0, 9)) === c.slice(9); }
function fmtCPF(c) { c = digits(c); return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c; }
function maskCPF(c) { c = digits(c); return `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**`; }
function typeCPF(v) {
  const d = digits(v).slice(0, 11); let o = d.slice(0, 3);
  if (d.length > 3) o += '.' + d.slice(3, 6);
  if (d.length > 6) o += '.' + d.slice(6, 9);
  if (d.length > 9) o += '-' + d.slice(9);
  return o;
}
const showCPF = c => isAdmin() ? fmtCPF(c) : maskCPF(c);

/* Ícones */
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M8 7h7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  swap: '<path d="M4 7h14l-4-4"/><path d="M20 17H6l4 4"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/>',
  flash: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  ret: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2.5h6v3H9z"/><path d="M9 13l2 2 4-4.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 21v-5h-5"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

/* ============ Estado e comunicação com a API ============ */
const CFG = window.BIBLIOTECA_CONFIG || {};
const LOGO = 'logo.png';
let S = null; // dados carregados da planilha (via Apps Script)
const UI = { login: 'start', loginMsg: '', deniedMsg: '', errMsg: '', menu: false, lastUpdate: hhmm(), lastSync: 0, draft: null, lbl: null, mailTab: 0, gb: [], busy: 0, prev: null, prot: null };
const TOKEN_KEY = 'biblioteca-luzes-token';
const DEFAULT_ASSOC = { nome: 'Associação Centro de Umbanda Luzes de Aruanda', cnpj: '', endereco: '', telefone: '', email: '', site: '' };
function cnpjValido(c) {
  c = digits(c); if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (b, w) => { let s = 0; for (let i = 0; i < b.length; i++) s += +b[i] * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], w2 = [6, ...w1];
  const d1 = dv(c.slice(0, 12), w1), d2 = dv(c.slice(0, 12) + d1, w2);
  return c.slice(12) === '' + d1 + d2;
}
const fmtCNPJ = c => { c = digits(c); return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : c; };
function assocLinhas() {
  const a = { ...DEFAULT_ASSOC, ...((S && S.config && S.config.assoc) || {}) };
  const l1 = [a.cnpj ? `CNPJ ${fmtCNPJ(a.cnpj)}` : '', a.endereco].filter(Boolean).join(' · ');
  const l2 = [a.telefone, a.email, a.site].filter(Boolean).join(' · ');
  return { nome: a.nome || DEFAULT_ASSOC.nome, l1, l2 };
}
const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const termoTexto = () => String(S.config.termo || '').split('{valor}').join(fmtBRL(S.config.valorTaxa));
const configurado = () => CFG.API_URL && CFG.CLIENT_ID && !/COLE_AQUI/.test(CFG.API_URL + CFG.CLIENT_ID);

function getToken() { try { return sessionStorage.getItem(TOKEN_KEY) || UI.token || ''; } catch (e) { return UI.token || ''; } }
function setToken(t) { UI.token = t || ''; try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) { } }

class ApiError extends Error { constructor(code, message, extra) { super(message); this.code = code; this.extra = extra; } }
function busy(on, msg) {
  UI.busy = Math.max(0, UI.busy + (on ? 1 : -1));
  const el = $('#busy'); if (!el) return;
  el.hidden = UI.busy === 0;
  if (on && msg) $('#busy-msg').textContent = msg; else if (!UI.busy) $('#busy-msg').textContent = 'Salvando…';
}
async function api(action, payload = {}, opt = {}) {
  if (!opt.silent) busy(true, opt.msg);
  try {
    let res;
    try { res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, token: getToken(), payload }), redirect: 'follow' }); }
    catch (e) { throw new ApiError('NET', 'Sem conexão com o servidor. Confira a internet e tente de novo.'); }
    if (!res.ok) throw new ApiError('NET', `O servidor respondeu com erro (${res.status}). Tente de novo.`);
    let j; try { j = await res.json(); } catch (e) { throw new ApiError('NET', 'Resposta inválida do servidor. Confira se a implantação do Apps Script está como "Qualquer pessoa".'); }
    if (!j.ok) {
      if (j.error && j.error.detail) console.error('Erro no servidor:', j.error.detail);
      throw new ApiError(j.error.code, j.error.message, j.error.extra);
    }
    if (j.data.changes) applyChanges(j.data.changes);
    return j.data.result;
  } catch (e) {
    if (e.code === 'AUTH' && action !== 'bootstrap') sessionExpired(e.message);
    throw e;
  } finally { if (!opt.silent) busy(false); }
}
const TBL = { Obras: ['obras', 'id'], Exemplares: ['exemplares', 'id'], Usuarios: ['usuarios', 'id'], Emprestimos: ['emprestimos', 'id'], Protocolos: ['protocolos', 'id'], Ocorrencias: ['ocorrencias', 'id'], Generos: ['generos', 'sigla'], Operadores: ['operadores', 'email'], Auditorias: ['auditorias', 'id'] };
function applyChanges(ch) {
  if (!S) return;
  Object.keys(TBL).forEach(name => {
    const [key, id] = TBL[name];
    (ch[name] || []).forEach(o => {
      const arr = S[key], i = arr.findIndex(x => x[id] === o[id]);
      if (name === 'Auditorias') o.itens = i >= 0 ? arr[i].itens : (o.itens || []);
      if (i >= 0) arr[i] = o; else arr.push(o);
    });
  });
  (ch.AuditoriaItens || []).forEach(it => {
    const a = S.auditorias.find(x => x.id === it.audId); if (!a) return;
    const i = a.itens.findIndex(x => x.exId === it.exId); if (i >= 0) a.itens[i] = it; else a.itens.push(it);
  });
  S.emprestimos = S.emprestimos.filter(l => !l.cancelado);
  if (ch.config) S.config = ch.config;
  if (ch.seq != null) S.seq = ch.seq;
  if (ch.LogAlertas) S.alertLog.push(...ch.LogAlertas);
  if (ch.RegistroAtividades) S.atividades.unshift(...ch.RegistroAtividades.slice().reverse());
  UI.lastUpdate = hhmm();
}
// Executa uma ação e mostra o erro de forma amigável
async function run(fn) {
  try { return await fn(); }
  catch (e) { if (e && e.code === 'AUTH') return; console.error(e); toast((e && e.message) || 'Erro inesperado. Tente de novo.', 'bad'); }
}

/* ---- Login com Google ---- */
function renderGoogleButton() {
  const el = $('#g-btn'); if (!el) return;
  if (!(window.google && google.accounts && google.accounts.id)) { setTimeout(renderGoogleButton, 300); return; }
  if (!UI.gInit) { google.accounts.id.initialize({ client_id: CFG.CLIENT_ID, callback: r => { setToken(r.credential); boot(); }, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup' }); UI.gInit = true; }
  el.innerHTML = '';
  google.accounts.id.renderButton(el, { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'pt-BR', width: 280 });
}
async function boot(keepView) {
  if (!keepView) { UI.login = 'loading'; render(); }
  try {
    const d = await api('bootstrap', {}, { silent: !keepView, msg: 'Atualizando…' });
    d.session = d.me; d.emprestimos = d.emprestimos.filter(l => !l.cancelado);
    S = d; UI.lastSync = Date.now(); UI.lastUpdate = hhmm(); UI.login = 'start'; UI.loginMsg = '';
    if (keepView) render(); else go(VIEW || 'inicio');
    return true;
  } catch (e) {
    if (e.code === 'FORBIDDEN') { setToken(''); S = null; UI.login = 'denied'; UI.deniedMsg = e.message; render(); }
    else if (e.code === 'AUTH') sessionExpired(e.message);
    else if (keepView) toast(e.message, 'bad');
    else { UI.login = 'error'; UI.errMsg = e.message; render(); }
  }
}
function sessionExpired(msg) { setToken(''); S = null; UI.login = 'start'; UI.loginMsg = msg || 'Sua sessão expirou. Entre com Google de novo.'; closeModal(); render(); }
/* ============ Consultas ============ */
const isAdmin = () => S && S.session && S.session.perfil === 'Admin';
const obra = id => S.obras.find(o => o.id === id);
const exem = id => S.exemplares.find(e => e.id === id);
const exByNum = n => S.exemplares.find(e => e.num === n);
const genero = s => (S.generos || []).find(g => g.sigla === s);
const generoNome = s => (genero(s) || { nome: s }).nome;
const user = id => S.usuarios.find(u => u.id === id);
// CPF próprio (um menor associado pode usar o CPF do responsável: cpfResp)
const userByCPF = c => S.usuarios.find(u => u.cpf === digits(c) && !u.cpfResp);
const usersByCPF = c => S.usuarios.filter(u => u.cpf === digits(c));
const fmtMat = n => String(n || 0).padStart(4, '0');
const MARCA_SECRETARIA = 'Desligado(a) ou falecido(a) na Secretaria.';
const assocInfo = u => u.assocId ? `Associado(a) · matrícula ${fmtMat(u.matricula)}` : '';
const activeLoans = () => S.emprestimos.filter(l => !l.dataDev);
const activeOf = uid => activeLoans().filter(l => l.userId === uid);
const loanOfEx = h => activeLoans().find(l => l.exId === h);
const firstName = () => (S.session.nome || S.session.email).split(' ')[0];
const protocolo = id => S.protocolos.find(p => p.id === id);
const protsOf = l => S.protocolos.filter(p => p.loanId === l.id && p.status !== 'cancelado').sort((a, b) => a.geradoEm.localeCompare(b.geradoEm));
const protRet = l => S.protocolos.find(p => p.loanId === l.id && p.tipo === 'retirada' && p.status !== 'cancelado');
const protRenov = l => S.protocolos.find(p => p.loanId === l.id && p.tipo === 'renovacao' && p.status === 'pendente');
const ocsPendUser = uid => S.ocorrencias.filter(o => o.userId === uid && o.status === 'pendente');
const diasDesde = ts => ts ? diffDays(ts.slice(0, 10), TODAY()) : 0;

function loanSt(l) {
  if (l.dataDev) {
    const late = diffDays(l.dataPrev, l.dataDev);
    if (l.encerramento === 'extravio') return { code: 'devolvido', label: 'Extraviado', cls: 'bad', note: `registrado em ${fmtD(l.dataDev)}` };
    return { code: 'devolvido', label: l.encerramento === 'avaria' ? 'Devolvido com avaria' : 'Devolvido', cls: l.encerramento === 'avaria' ? 'warn' : 'mute', note: `em ${fmtD(l.dataDev)}${late > 0 ? ` · ${plural(late, 'dia', 'dias')} de atraso` : ''}` };
  }
  if (l.pendente) {
    const pr = protRet(l), dd = pr ? diasDesde(pr.geradoEm) : 0;
    return { code: 'pendente', label: 'Aguardando protocolo', cls: dd >= 1 ? 'bad' : 'warn', note: dd >= 1 ? `gerado há ${plural(dd, 'dia', 'dias')}` : 'gerado hoje', antigo: dd >= 1 };
  }
  const d = diffDays(TODAY(), l.dataPrev);
  if (d < 0) return { code: 'atrasado', label: 'Atrasado', cls: 'bad', dias: -d, note: `${plural(-d, 'dia', 'dias')} de atraso` };
  if (d <= S.config.antecedencia) return { code: 'breve', label: 'Vence em breve', cls: 'warn', dias: d, note: d === 0 ? 'vence hoje' : `vence em ${plural(d, 'dia', 'dias')}` };
  return { code: 'emdia', label: 'Em dia', cls: 'info', dias: d, note: `faltam ${d} dias` };
}
const EX_CLS = { 'Disponível': 'ok', 'Emprestado': 'info', 'Reservado': 'warn', 'Em manutenção': 'warn', 'Baixado': 'mute' };
const US_CLS = { 'Ativo': 'ok', 'Bloqueado': 'bad', 'Inativo': 'mute' };
const OC_CLS = { pendente: 'bad', quitada: 'ok', cancelada: 'mute' };
const OC_LBL = { pendente: 'Pendente', quitada: 'Quitada', cancelada: 'Cancelada' };
const pill = (txt, cls) => `<span class="pill ${cls}">${esc(txt)}</span>`;

function kpis() {
  const ex = S.exemplares.filter(e => e.status !== 'Baixado');
  const act = activeLoans().map(loanSt);
  const renovPend = S.protocolos.filter(p => p.tipo === 'renovacao' && p.status === 'pendente');
  return {
    titulos: S.obras.length, exemplares: ex.length,
    disp: ex.filter(e => e.status === 'Disponível').length,
    emp: ex.filter(e => e.status === 'Emprestado').length,
    manut: ex.filter(e => e.status === 'Em manutenção').length,
    usuarios: S.usuarios.filter(u => u.status === 'Ativo').length,
    breve: act.filter(s => s.code === 'breve').length,
    atrasados: act.filter(s => s.code === 'atrasado').length,
    pend: act.filter(s => s.code === 'pendente').length + renovPend.length,
    pendAntigos: act.filter(s => s.antigo).length + renovPend.filter(p => diasDesde(p.geradoEm) >= 1).length,
    ocPend: S.ocorrencias.filter(o => o.status === 'pendente').length,
  };
}

function userBlocks(u) {
  const r = []; const cfg = S.config;
  if (!u) return ['CPF não encontrado no cadastro de usuários autorizados'];
  if (u.status !== 'Ativo') r.push(`Cadastro ${u.status.toLowerCase()}${u.obs ? ` (${u.obs})` : ''}`);
  if (u.bloqueioAssoc) r.push(u.bloqueioAssoc.replace(/\.$/, '') + '. Regularize na Secretaria');
  const act = activeOf(u.id);
  if (act.length >= cfg.maxExemplares) r.push(`Já está com ${act.length} de ${cfg.maxExemplares} exemplares permitidos`);
  if (cfg.bloqueiaAtraso && act.some(l => loanSt(l).code === 'atrasado')) r.push('Tem empréstimo em atraso. Precisa devolver antes de retirar outro livro');
  const oc = ocsPendUser(u.id);
  if (oc.length) r.push(`Tem ${plural(oc.length, 'ocorrência pendente', 'ocorrências pendentes')} de avaria ou extravio. Precisa regularizar antes de retirar outro livro`);
  return r;
}
function exBlocks(ex, u) {
  const r = [];
  if (!ex) return ['Código não encontrado no catálogo'];
  if (ex.status !== 'Disponível') {
    const l = loanOfEx(ex.id);
    r.push(ex.status === 'Emprestado' && l ? `Exemplar emprestado para ${user(l.userId).nome} até ${fmtD(l.dataPrev)}` : ex.status === 'Reservado' && l ? `Exemplar reservado: aguardando o protocolo assinado de ${user(l.userId).nome}` : `Exemplar ${ex.status.toLowerCase()}`);
  }
  if (u && S.config.impedeMesmaObra && activeOf(u.id).some(l => exem(l.exId).obraId === ex.obraId)) r.push('O usuário já está com outro exemplar desta obra');
  return r;
}
function renewBlocks(l) {
  const r = []; const u = user(l.userId);
  if (l.dataDev) r.push('Empréstimo já encerrado');
  if (l.pendente) r.push('O empréstimo ainda aguarda o protocolo de retirada');
  if (l.renovacoes >= S.config.renovacoes) r.push(`Limite de ${plural(S.config.renovacoes, 'renovação', 'renovações')} atingido`);
  if (!l.dataDev && loanSt(l).code === 'atrasado') r.push('Empréstimo em atraso não pode ser renovado. Registre a devolução');
  if (u.status !== 'Ativo') r.push(`Usuário ${u.status.toLowerCase()}`);
  if (u.bloqueioAssoc) r.push(u.bloqueioAssoc.replace(/\.$/, ''));
  if (ocsPendUser(u.id).length) r.push('O usuário tem ocorrência pendente');
  if (protRenov(l)) r.push('Já existe um protocolo de renovação aguardando assinatura');
  return r;
}

/* ============ Navegação ============ */
const NAV = [
  { sec: 'Operação' },
  { id: 'inicio', label: 'Início', ic: 'home' },
  { id: 'emprestar', label: 'Novo empréstimo', ic: 'swap' },
  { id: 'emprestados', label: 'Livros emprestados', ic: 'list', badge: () => kpis().atrasados },
  { id: 'ocorrencias', label: 'Ocorrências', ic: 'alert', badge: () => kpis().ocPend },
  { sec: 'Cadastros' },
  { id: 'catalogo', label: 'Catálogo', ic: 'book' },
  { id: 'usuarios', label: 'Usuários autorizados', ic: 'users' },
  { id: 'etiquetas', label: 'Etiquetas', ic: 'tag' },
  { sec: 'Rotinas' },
  { id: 'alertas', label: 'Alertas por e-mail', ic: 'bell' },
  { id: 'auditoria', label: 'Auditoria do acervo', ic: 'clip', badge: () => audAtual() ? '•' : 0 },
  { sec: 'Administração', admin: true },
  { id: 'configuracoes', label: 'Configurações', ic: 'gear', admin: true },
  { id: 'operadores', label: 'Operadores', ic: 'shield', admin: true },
  { id: 'atividades', label: 'Registro de atividades', ic: 'clock', admin: true },
];
const PARENT = { obra: 'catalogo', obraForm: 'catalogo', obraSalva: 'catalogo', usuario: 'usuarios', usuarioForm: 'usuarios', emprestimoOk: 'emprestar', protocolo: 'emprestados', auditoriaRel: 'auditoria' };
let VIEW = 'inicio', P = {};

function go(v, params = {}) {
  VIEW = v; P = params; UI.menu = false;
  if (v === 'emprestar' && !params.keep) {
    const T = TODAY();
    UI.draft = { cpf: '', userId: null, userChecked: false, cod: '', exId: null, exChecked: false, dataEmp: T, dataPrev: addDays(T, S.config.prazo), err: '', estado: '' };
    if (params.cpf) { UI.draft.cpf = fmtCPF(params.cpf); findLoanUser(); }
    if (params.cod) { UI.draft.cod = params.cod; findLoanEx(); }
  }
  if (v === 'etiquetas' && (!UI.lbl || params.sel)) {
    UI.lbl = { sel: new Set(params.sel ? String(params.sel).split(',') : []), filtro: params.sel ? 'todas' : 'pendentes', obraId: '', preset: 'a4-3x10', cols: 3, rows: 10, start: 1, mt: 13, ml: 7, gx: 2.5, gy: 0 };
  }
  render();
  window.scrollTo(0, 0);
}

/* ============ Render ============ */
function render() {
  const app = $('#app');
  if (!configurado()) { app.innerHTML = vSetup(); return; }
  if (!S) { app.innerHTML = UI.login === 'denied' ? vDenied() : vLogin(); if (UI.login === 'start') renderGoogleButton(); return; }
  let v = VIEWS[VIEW];
  if (!v || (v.admin && !isAdmin())) { VIEW = 'inicio'; v = VIEWS.inicio; }
  app.innerHTML = shell(v.render());
  if (v.after) v.after();
}

function shell(content) {
  const cur = PARENT[VIEW] || VIEW;
  const nav = NAV.filter(n => !n.admin || isAdmin()).map(n => n.sec ? `<div class="nav-sec">${n.sec}</div>` :
    `<button data-act="go" data-v="${n.id}" ${cur === n.id ? 'aria-current="page"' : ''}>${ic(n.ic)}<span>${n.label}</span>${n.badge && n.badge() ? `<span class="count">${n.badge()}</span>` : ''}</button>`).join('');
  const k = kpis();
  const bn = (id, label, icn, extra = '') => `<button data-act="go" data-v="${id}" ${cur === id ? 'aria-current="page"' : ''} ${extra}>${icn}<span>${label}</span></button>`;
  return `
  <div class="shell">
    <aside class="side">
      <div class="side-brand"><div class="logo-sm"><img src="${LOGO}" alt=""></div><div><b>Luzes de Aruanda</b><span>Biblioteca da associação</span></div></div>
      <nav class="nav" aria-label="Menu principal">${nav}</nav>
      <div class="side-user"><div><b>${esc(S.session.nome)}</b> <span class="role">${S.session.perfil}</span></div><div class="email">${esc(S.session.email)}</div><button data-act="logout">Sair</button></div>
    </aside>
    <div class="main">
      <header class="topbar"><div class="logo-sm"><img src="${LOGO}" alt=""></div><b>Biblioteca Luzes de Aruanda</b><span class="role">${S.session.perfil}</span></header>
      <main class="page">${content}</main>
    </div>
  </div>
  <nav class="bottom-nav" aria-label="Navegação">
    ${bn('inicio', 'Início', ic('home'))}
    ${bn('catalogo', 'Catálogo', ic('book'))}
    <button class="main-act" data-act="go" data-v="emprestar" ${cur === 'emprestar' ? 'aria-current="page"' : ''}><span class="ic">${ic('swap')}</span><span>Emprestar</span></button>
    <button data-act="go" data-v="emprestados" ${cur === 'emprestados' ? 'aria-current="page"' : ''}>${ic('list')}<span>Emprestados</span>${k.atrasados ? `<span class="dot">${k.atrasados}</span>` : ''}</button>
    <button data-act="menu" ${['usuarios', 'etiquetas', 'alertas', 'auditoria', 'ocorrencias', 'configuracoes', 'operadores', 'atividades'].includes(cur) ? 'aria-current="page"' : ''}>${ic('more')}<span>Mais</span>${k.ocPend ? `<span class="dot">${k.ocPend}</span>` : ''}</button>
  </nav>
  ${UI.menu ? `<div class="overlay" data-act="menuClose" style="place-items:end stretch;padding:0"></div><div class="sheet-menu" role="menu">
    <button data-act="go" data-v="ocorrencias">${ic('alert')} Ocorrências${k.ocPend ? ` (${k.ocPend} pendentes)` : ''}</button>
    <button data-act="go" data-v="usuarios">${ic('users')} Usuários autorizados</button>
    <button data-act="go" data-v="etiquetas">${ic('tag')} Etiquetas</button>
    <button data-act="go" data-v="alertas">${ic('bell')} Alertas por e-mail</button>
    <button data-act="go" data-v="auditoria">${ic('clip')} Auditoria do acervo${audAtual() ? ' (em andamento)' : ''}</button>
    ${isAdmin() ? `<button data-act="go" data-v="configuracoes">${ic('gear')} Configurações</button>
    <button data-act="go" data-v="operadores">${ic('shield')} Operadores</button>
    <button data-act="go" data-v="atividades">${ic('clock')} Registro de atividades</button>` : ''}
    <button data-act="logout">${ic('logout')} Sair (${esc(S.session.email)})</button>
  </div>` : ''}`;
}

/* Tabela de empréstimos reutilizável */
function loanRows(list, opt = {}) {
  if (!list.length) return `<div class="table-wrap"><div class="empty">${opt.empty || 'Nenhum empréstimo encontrado.'}</div></div>`;
  const rows = list.map(l => {
    const u = user(l.userId), ex = exem(l.exId), o = obra(ex.obraId), st = loanSt(l), pr = protRet(l), rv = protRenov(l);
    const act = opt.actions ? `<td class="actions">
        ${l.pendente ? `<button class="btn sm primary" data-act="go" data-v="protocolo" data-id="${pr ? pr.id : ''}">${ic('copy')} Anexar protocolo</button>`
        : !l.dataDev ? `<button class="btn sm primary" data-act="devolver" data-id="${l.id}">${ic('ret')} Devolver</button>${rv ? `<button class="btn sm" data-act="go" data-v="protocolo" data-id="${rv.id}">Protocolo de renovação</button>` : `<button class="btn sm" data-act="renovar" data-id="${l.id}">Renovar</button>`}` : ''}
        <button class="btn sm ghost" data-act="detalhe" data-id="${l.id}">Detalhes</button></td>` : '';
    return `<tr>
      <td class="lead" data-label="Usuário"><div class="t">${esc(u.nome)}</div>${opt.compact ? '' : `<div class="s mono">${showCPF(u.cpf)}</div>`}</td>
      <td class="lead" data-label="Livro"><div class="${opt.compact ? 's' : 't'}">${esc(o.titulo)}</div>${opt.compact ? '' : `<div class="s mono">${ex.codigo}</div>`}</td>
      ${opt.compact ? '' : `<td data-label="Retirada" class="num">${fmtD(l.dataEmp)}</td>`}
      <td data-label="Vencimento" class="num"><div>${fmtD(l.dataPrev)}${l.renovacoes ? `<div class="s">renovado</div>` : ''}</div></td>
      <td data-label="Situação"><div>${pill(st.label, st.cls)}<div class="s">${st.note}</div>${rv ? `<div class="s" style="color:var(--warn)">renovação aguardando protocolo</div>` : ''}</div></td>
      ${act}
    </tr>`;
  }).join('');
  return `<div class="table-wrap cards"><table><thead><tr><th>Usuário</th><th>Livro</th>${opt.compact ? '' : '<th>Retirada</th>'}<th>Vencimento</th><th>Situação</th>${opt.actions ? '<th><span class="sr">Ações</span></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ============ Telas de acesso ============ */
const loginCard = body => `<div class="login"><div class="login-card">
    <div class="logo-disc"><img src="${LOGO}" alt="Logo da Associação Centro de Umbanda Luzes de Aruanda"></div>
    <div style="display:grid;gap:6px"><div class="eyebrow">Biblioteca</div><h1>Associação Centro de Umbanda Luzes de Aruanda</h1><p class="muted">Acervo, empréstimos e devoluções</p></div>
    ${body}
    <p class="small muted"><a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a></p>
  </div></div>`;
function vLogin() {
  if (UI.login === 'loading') return loginCard(`<div class="spinner" role="status" aria-label="Carregando"></div><p class="muted">Validando acesso e carregando o acervo…</p>`);
  if (UI.login === 'error') return loginCard(`<div class="note bad" style="text-align:left"><b>Não foi possível carregar o sistema</b><span>${esc(UI.errMsg)}</span></div><button class="btn primary" data-act="retryBoot">Tentar de novo</button><button class="btn ghost" data-act="loginReset">Entrar com outra conta</button>`);
  return loginCard(`${UI.loginMsg ? `<div class="note warn" style="text-align:left"><span>${esc(UI.loginMsg)}</span></div>` : ''}<div id="g-btn" class="g-btn" aria-label="Entrar com Google"></div>
      <p class="small muted">O acesso é liberado apenas para operadores cadastrados pela administração da biblioteca. O app nunca pede sua senha do Google.</p>`);
}
function vDenied() {
  return `<div class="login"><div class="login-card">
    <div class="logo-disc" style="width:88px;height:88px"><img src="${LOGO}" alt=""></div>
    <div class="note bad" style="text-align:left"><b>Esta conta não tem acesso</b><span>${esc(UI.deniedMsg)}</span></div>
    <p class="muted small">Peça ao administrador da biblioteca para liberar este e-mail na lista de operadores. Nenhum dado da biblioteca foi carregado.</p>
    <button class="btn primary" data-act="loginReset">Entrar com outra conta</button>
  </div></div>`;
}
function vSetup() {
  return loginCard(`<div class="note warn" style="text-align:left"><b>Sistema ainda não configurado</b><span>Preencha <span class="mono">API_URL</span> e <span class="mono">CLIENT_ID</span> no arquivo <span class="mono">config.js</span>, conforme o guia de implantação.</span></div>`);
}

const VIEWS = {};

VIEWS.inicio = {
  render() {
    const k = kpis(), cfg = S.config;
    const att = activeLoans().filter(l => ['atrasado', 'breve', 'pendente'].includes(loanSt(l).code)).sort((a, b) => a.dataPrev.localeCompare(b.dataPrev));
    const recent = [...S.emprestimos].sort((a, b) => b.dataEmp.localeCompare(a.dataEmp)).slice(0, 6);
    const kpi = (label, val, note, cls = '', act = '') => act
      ? `<button class="kpi ${cls}" ${act}><span class="k-label">${label}</span><span class="k-val">${val}</span><span class="k-note">${note}</span></button>`
      : `<div class="kpi ${cls}"><span class="k-label">${label}</span><span class="k-val">${val}</span><span class="k-note">${note}</span></div>`;
    return `
    <div class="page-head"><div><h1>Olá, ${esc(firstName())}</h1><p class="sub">Dados atualizados às ${UI.lastUpdate}. ${k.atrasados ? `${plural(k.atrasados, 'empréstimo atrasado precisa', 'empréstimos atrasados precisam')} de atenção.` : 'Nenhum empréstimo atrasado.'}</p></div>
      <button class="btn sm" data-act="refresh">${ic('refresh')} Atualizar</button></div>
    ${(() => { const au = audAtual(); if (!au) return ''; const s = audStats(au); return `<div class="note warn"><b>Auditoria do acervo em andamento</b><span>${s.ok + s.falta} conferidos · ${s.pend} pendentes · ${s.falta} não encontrados. <button class="btn sm" data-act="go" data-v="auditoria">Continuar conferência</button></span></div>`; })()}
    <div class="quick">
      <button class="btn primary" data-act="go" data-v="emprestar">${ic('swap')} Novo empréstimo</button>
      <button class="btn" data-act="go" data-v="emprestados" data-f="ativos">${ic('ret')} Registrar devolução</button>
      <button class="btn" data-act="go" data-v="obraForm">${ic('book')} Cadastrar livro</button>
      <button class="btn" data-act="go" data-v="usuarioForm">${ic('user')} Cadastrar usuário</button>
    </div>
    <div class="kpis">
      ${kpi('Títulos', k.titulos, `${k.exemplares} exemplares no acervo`)}
      ${kpi('Disponíveis', k.disp, k.manut ? `${k.manut} em manutenção` : 'prontos para empréstimo')}
      ${kpi('Emprestados', k.emp, 'exemplares fora da biblioteca')}
      ${kpi('Usuários ativos', k.usuarios, 'autorizados a retirar')}
      ${kpi(`Vencem em até ${cfg.antecedencia} dias`, k.breve, 'ver lista', k.breve ? 'warn' : '', 'data-act="go" data-v="emprestados" data-f="breve"')}
      ${kpi('Atrasados', k.atrasados, 'ver lista', k.atrasados ? 'bad' : '', 'data-act="go" data-v="emprestados" data-f="atrasado"')}
      ${k.pend ? kpi('Aguardando protocolo', k.pend, k.pendAntigos ? `${k.pendAntigos} há mais de 1 dia` : 'anexar assinatura', k.pendAntigos ? 'bad' : 'warn', 'data-act="go" data-v="emprestados" data-f="pendente"') : ''}
      ${k.ocPend ? kpi('Ocorrências pendentes', k.ocPend, 'avarias e extravios', 'bad', 'data-act="go" data-v="ocorrencias"') : ''}
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Precisa de atenção</h2><button class="btn sm ghost" data-act="go" data-v="emprestados" data-f="ativos">Ver todos</button></div>
        ${loanRows(att, { compact: true, empty: 'Nenhum atraso ou vencimento próximo.' })}</section>
      <section class="panel"><div class="panel-head"><h2>Empréstimos recentes</h2><button class="btn sm ghost" data-act="go" data-v="emprestados" data-f="todos">Histórico</button></div>
        ${loanRows(recent, { compact: true })}</section>
    </div>`;
  }
};

/* ---- Catálogo ---- */
function exSummary(oid) {
  const ex = S.exemplares.filter(e => e.obraId === oid && e.status !== 'Baixado');
  const c = s => ex.filter(e => e.status === s).length;
  const parts = [];
  if (c('Disponível')) parts.push(`${c('Disponível')} ${c('Disponível') > 1 ? 'disponíveis' : 'disponível'}`);
  if (c('Emprestado')) parts.push(`${c('Emprestado')} ${c('Emprestado') > 1 ? 'emprestados' : 'emprestado'}`);
  if (c('Em manutenção')) parts.push(`${c('Em manutenção')} em manutenção`);
  return { total: ex.length, txt: parts.join(' · ') || 'nenhum exemplar ativo', disp: c('Disponível') };
}
function catalogResults() {
  const q = P.q || '', nq = norm(q), hq = q.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^LIV/, '');
  let list = S.obras.filter(o => {
    if (P.cat && o.genero !== P.cat) return false;
    if (!nq) return true;
    if (norm(`${o.titulo} ${o.autor} ${o.editora} ${generoNome(o.genero)}`).includes(nq)) return true;
    if (digits(q).length >= 4 && digits(o.isbn).includes(digits(q))) return true;
    const pc = parseCodigo(q);
    if (hq && S.exemplares.some(e => e.obraId === o.id && ((pc && e.num === pc.num) || (hq.length >= 3 && codeCompact(e.codigo).includes(hq))))) return true;
    return false;
  }).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  if (!list.length) return `<div class="table-wrap"><div class="empty">Nenhuma obra encontrada para "${esc(q)}". <button class="btn sm" data-act="go" data-v="obraForm">Cadastrar nova obra</button></div></div>`;
  return `<div class="table-wrap cards"><table><thead><tr><th>Obra</th><th>Gênero</th><th>ISBN</th><th>Exemplares</th></tr></thead><tbody>
    ${list.map(o => { const s = exSummary(o.id); return `<tr class="click" data-act="go" data-v="obra" data-id="${o.id}">
      <td class="lead"><div class="t">${esc(o.titulo)}</div><div class="s">${esc(o.autor)} · ${esc(o.editora)} · ${o.ano}</div></td>
      <td data-label="Gênero">${esc(generoNome(o.genero))} <span class="chip mono">${esc(o.genero)}</span></td>
      <td data-label="ISBN" class="mono small">${o.isbn ? esc(o.isbn) : '<span class="chip">Sem ISBN</span>'}</td>
      <td data-label="Exemplares"><div class="t num">${s.total}</div><div class="s">${s.txt}</div></td></tr>`; }).join('')}
    </tbody></table></div><p class="small muted">${plural(list.length, 'obra', 'obras')} · clique para ver os exemplares</p>`;
}
VIEWS.catalogo = {
  render() {
    const cats = [...new Set(S.obras.map(o => o.genero))].sort((a, b) => generoNome(a).localeCompare(generoNome(b), 'pt-BR'));
    return `<div class="page-head"><div><h1>Catálogo</h1><p class="sub">${S.obras.length} títulos · ${kpis().exemplares} exemplares. Cada exemplar físico tem seu próprio código de etiqueta.</p></div>
      <button class="btn primary" data-act="go" data-v="obraForm">${ic('plus')} Nova obra</button></div>
      <div class="toolbar"><label class="search"><span class="sr">Buscar</span>${ic('search')}<input id="cat-q" data-in="catQ" value="${esc(P.q || '')}" placeholder="Título, autor, ISBN ou código da etiqueta" autocomplete="off"></label>
      ${podeEscanear() ? `<button type="button" class="btn" data-act="scanCat">${ic('scan')} Ler ISBN</button>` : ''}
      <div class="field" style="flex:0 1 220px"><label class="sr" for="cat-cat">Gênero</label><select id="cat-cat" data-ch="catCat"><option value="">Todos os gêneros</option>${cats.map(c => `<option value="${esc(c)}" ${P.cat === c ? 'selected' : ''}>${esc(generoNome(c))} (${esc(c)})</option>`).join('')}</select></div></div>
      <div id="cat-res">${catalogResults()}</div>`;
  }
};

VIEWS.obra = {
  render() {
    const o = obra(P.id); if (!o) return `<p>Obra não encontrada.</p>`;
    const exs = S.exemplares.filter(e => e.obraId === o.id);
    const hist = S.emprestimos.filter(l => exem(l.exId).obraId === o.id).sort((a, b) => b.dataEmp.localeCompare(a.dataEmp));
    const s = exSummary(o.id);
    return `<div><button class="back" data-act="go" data-v="catalogo">${ic('back')} Catálogo</button>
      <div class="page-head"><div><h1>${esc(o.titulo)}</h1><p class="sub">${esc(o.autor)} · ${plural(s.total, 'exemplar ativo', 'exemplares ativos')} · ${s.txt}</p></div>
      <div class="toolbar"><button class="btn" data-act="go" data-v="obraForm" data-id="${o.id}">${ic('edit')} Editar obra</button><button class="btn primary" data-act="addEx" data-id="${o.id}">${ic('plus')} Adicionar exemplar</button></div></div></div>
      <section class="panel"><dl class="facts">
        <div><dt>ISBN</dt><dd class="mono">${o.isbn ? esc(o.isbn) : 'Sem ISBN'}</dd></div>
        <div><dt>Editora</dt><dd>${esc(o.editora)}</dd></div>
        <div><dt>Ano</dt><dd>${o.ano}</dd></div>
        <div><dt>Edição</dt><dd>${esc(o.edicao || '—')}</dd></div>
        <div><dt>Idioma</dt><dd>${esc(o.idioma || '—')}</dd></div>
        <div><dt>Gênero</dt><dd>${esc(generoNome(o.genero))} <span class="chip mono">${esc(o.genero)}</span></dd></div>
        <div><dt>ID da obra</dt><dd class="mono">${o.id}</dd></div>
        <div><dt>Cadastro</dt><dd>${fmtD(o.dataCadastro)}</dd></div>
        ${o.obs ? `<div style="grid-column:1/-1"><dt>Observações</dt><dd>${esc(o.obs)}</dd></div>` : ''}
      </dl></section>
      <section class="panel"><div class="panel-head"><h2>Exemplares</h2><button class="btn sm" data-act="go" data-v="etiquetas" data-sel="${exs.filter(e => e.status !== 'Baixado').map(e => e.id).join(',')}">${ic('tag')} Etiquetas desta obra</button></div>
        <div class="table-wrap cards"><table><thead><tr><th>Código</th><th>Localização</th><th>Situação</th><th>Etiqueta</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
        ${exs.map(e => {
          const l = loanOfEx(e.id);
          const acts = e.status === 'Disponível' ? `<button class="btn sm primary" data-act="go" data-v="emprestar" data-cod="${e.codigo}">Emprestar</button><button class="btn sm" data-act="exStatus" data-id="${e.id}" data-to="Em manutenção">Manutenção</button><button class="btn sm danger" data-act="exStatus" data-id="${e.id}" data-to="Baixado">Dar baixa</button>`
            : e.status === 'Emprestado' ? `<button class="btn sm" data-act="go" data-v="emprestados" data-f="ativos" data-q="${e.codigo}">Ver empréstimo</button>`
            : e.status === 'Reservado' && l ? `<button class="btn sm primary" data-act="go" data-v="protocolo" data-id="${(protRet(l) || {}).id}">Ver protocolo</button>`
            : e.status === 'Em manutenção' ? `<button class="btn sm" data-act="exStatus" data-id="${e.id}" data-to="Disponível">Disponibilizar</button><button class="btn sm danger" data-act="exStatus" data-id="${e.id}" data-to="Baixado">Dar baixa</button>`
            : (isAdmin() ? `<button class="btn sm" data-act="exStatus" data-id="${e.id}" data-to="Disponível">Reativar</button>` : '');
          return `<tr><td data-label="Código"><span class="hash">${e.codigo}<button class="icon-btn" data-act="copy" data-txt="${e.codigo}" aria-label="Copiar código">${ic('copy')}</button></span>${isAdmin() ? `<button class="icon-btn" data-act="exFix" data-id="${e.id}" aria-label="Corrigir sigla do código" title="Corrigir sigla">${ic('edit')}</button>` : ''}</td>
            <td data-label="Localização">${esc(e.local)}</td>
            <td data-label="Situação">${pill(e.status, EX_CLS[e.status])}${l ? `<div class="s">com ${esc(user(l.userId).nome)} até ${fmtD(l.dataPrev)}</div>` : e.obs ? `<div class="s">${esc(e.obs)}</div>` : ''}</td>
            <td data-label="Etiqueta">${e.etiqueta ? 'Impressa' : '<span class="chip">Pendente</span>'}</td>
            <td class="actions">${acts}</td></tr>`;
        }).join('')}</tbody></table></div></section>
      <section class="panel"><h2>Histórico de empréstimos</h2>${loanRows(hist, { empty: 'Esta obra ainda não foi emprestada.' })}</section>`;
  }
};

VIEWS.obraForm = {
  render() {
    const o = P.id ? obra(P.id) : null, ed = !!o;
    const gens = [...S.generos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const v = (k, d = '') => esc(o ? (o[k] ?? d) : d);
    return `<div><button class="back" data-act="go" data-v="${ed ? 'obra' : 'catalogo'}" ${ed ? `data-id="${o.id}"` : ''}>${ic('back')} ${ed ? 'Voltar para a obra' : 'Catálogo'}</button>
      <div class="page-head"><div><h1>${ed ? 'Editar obra' : 'Nova obra'}</h1><p class="sub">${ed ? 'Os códigos dos exemplares não mudam quando os dados da obra são corrigidos.' : 'Cadastre a obra e informe quantos exemplares físicos existem. Cada um recebe um código de etiqueta: número do acervo + sigla do gênero.'}</p></div></div></div>
      <form class="panel form" data-form="obra" novalidate>
        <fieldset><legend>Identificação</legend>
          <div class="fields">
            <div class="field" id="fw-isbn"><label for="f-isbn">ISBN</label>
              <div class="inline"><input id="f-isbn" value="${o ? v('isbn') : esc(P.isbn || '')}" inputmode="numeric" placeholder="978-85-..." ${o && o.semIsbn ? 'disabled' : ''}><button type="button" class="btn" data-act="gbIsbn" ${o && o.semIsbn ? 'disabled' : ''}>${ic('search')} Buscar</button></div>
              ${podeEscanear() ? `<button type="button" class="btn scan-cta" data-act="scanIsbnForm" ${o && o.semIsbn ? 'disabled' : ''}>${ic('scan')} Ler código de barras</button>` : ''}
              <span class="hint">Preenche título, autor, editora e ano automaticamente.</span><span class="msg" id="m-isbn"></span></div>
            <div class="field" style="align-content:center"><label class="check"><input type="checkbox" id="f-semisbn" data-ch="semIsbn" ${o && o.semIsbn ? 'checked' : ''}> Livro sem ISBN</label>
              <span class="hint">Apostilas, materiais da casa e livros antigos.</span></div>
          </div>
          <details ${UI.gb.length ? 'open' : ''}><summary class="small" style="cursor:pointer;font-weight:600;color:var(--brand)">Buscar por título e autor na internet</summary>
            <div class="inline" style="margin-top:8px"><input id="f-gbq" class="" placeholder="Ex.: Conceição Evaristo" style="padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);min-height:42px"><button type="button" class="btn" data-act="gbSearch">Buscar</button></div>
            <div id="gb-res" style="display:grid;gap:6px;margin-top:8px"></div></details>
          <div id="gb-note"></div>
        </fieldset>
        <fieldset><legend>Dados da obra</legend><div class="fields">
          <div class="field full"><label for="f-titulo">Título <span class="req">*</span></label><input id="f-titulo" value="${v('titulo')}"><span class="msg" id="m-titulo"></span></div>
          <div class="field"><label for="f-autor">Autor <span class="req">*</span></label><input id="f-autor" value="${v('autor')}"><span class="msg" id="m-autor"></span></div>
          <div class="field"><label for="f-genero">Gênero <span class="req">*</span></label>
            <div class="inline"><select id="f-genero" data-ch="obraGen"><option value="">Escolha o gênero…</option>${gens.map(g => `<option value="${g.sigla}" ${o && o.genero === g.sigla ? 'selected' : ''}>${esc(g.nome)} (${g.sigla})</option>`).join('')}</select>${isAdmin() ? `<button type="button" class="btn" data-act="genNew" aria-label="Novo gênero">${ic('plus')}</button>` : ''}</div>
            <span class="hint">${ed ? 'Exemplares já cadastrados mantêm o código atual. Novos exemplares usam a sigla do gênero escolhido.' : isAdmin() ? 'A sigla entra no código da etiqueta. Use + para criar um gênero.' : 'A sigla entra no código da etiqueta. Gênero faltando? Peça ao administrador.'}</span><span class="msg" id="m-genero"></span></div>
          <div class="field"><label for="f-editora">Editora <span class="req">*</span></label><input id="f-editora" value="${v('editora')}"><span class="msg" id="m-editora"></span></div>
          <div class="field"><label for="f-ano">Ano de publicação <span class="req">*</span></label><input id="f-ano" inputmode="numeric" maxlength="4" value="${v('ano')}"><span class="msg" id="m-ano"></span></div>
          <div class="field"><label for="f-edicao">Edição</label><input id="f-edicao" value="${v('edicao')}" placeholder="Ex.: 3ª edição"></div>
          <div class="field"><label for="f-idioma">Idioma</label><input id="f-idioma" value="${v('idioma', 'Português')}"></div>
          <div class="field full"><label for="f-obs">Observações</label><textarea id="f-obs">${v('obs')}</textarea></div>
        </div></fieldset>
        ${ed ? '' : `<fieldset><legend>Exemplares físicos</legend><div class="fields">
          <div class="field"><label for="f-qtd">Quantidade de exemplares <span class="req">*</span></label><input id="f-qtd" type="number" min="1" max="50" value="1" data-in="obraQtd"><span class="hint">Cada exemplar recebe um código próprio.</span><span class="msg" id="m-qtd"></span></div>
          <div class="field"><label for="f-local">Localização física <span class="req">*</span></label><input id="f-local" list="dl-local" placeholder="Ex.: Estante A · Prateleira 2"><datalist id="dl-local">${[...new Set(S.exemplares.map(e => e.local))].sort().map(l => `<option value="${esc(l)}">`).join('')}</datalist><span class="msg" id="m-local"></span></div>
          <div class="field full" id="cod-preview">${codPreview()}</div>
        </div></fieldset>`}
        <div class="form-actions"><button type="button" class="btn" data-act="go" data-v="${ed ? 'obra' : 'catalogo'}" ${ed ? `data-id="${o.id}"` : ''}>Cancelar</button><button class="btn primary">${ed ? 'Salvar alterações' : 'Salvar e gerar códigos'}</button></div>
      </form>`;
  },
  after() { UI.gb = []; if (!P.id && P.isbn && $('#f-isbn')) ACT.gbIsbn(); }
};
function codPreview(sig, qtd) {
  sig = sig ?? ($('#f-genero') ? $('#f-genero').value : '');
  qtd = qtd ?? ($('#f-qtd') ? parseInt($('#f-qtd').value) || 1 : 1);
  if (!sig) return '<div class="note"><span>Escolha o gênero para ver os códigos que serão gerados.</span></div>';
  const a = (S.seq || 0) + 1, b = a + Math.max(1, qtd) - 1;
  return `<div class="note info"><span>${qtd > 1 ? 'Os exemplares vão receber os códigos' : 'O exemplar vai receber o código'} <b class="mono">LIV-${fmtNum(a)}-${sig}</b>${qtd > 1 ? ` a <b class="mono">LIV-${fmtNum(b)}-${sig}</b>` : ''}.</span></div>`;
}

VIEWS.obraSalva = {
  render() {
    const o = obra(P.id); const hs = String(P.ids || '').split(',').filter(Boolean).map(id => exem(id)).filter(Boolean);
    return `<div class="page-head"><div><h1>${P.added ? 'Exemplares adicionados' : 'Obra cadastrada'}</h1><p class="sub">${esc(o.titulo)} · ${esc(o.autor)}</p></div></div>
      <section class="panel"><div class="note ok"><b>${plural(hs.length, 'código gerado', 'códigos gerados')}</b><span>Imprima a etiqueta de cada exemplar. O código é permanente; no empréstimo basta digitar o número (ex.: ${hs.length ? hs[0].num : 1}).</span></div>
        <div class="hash-list">${hs.map((h, i) => `<div class="hash-row"><span><span class="small muted">Exemplar ${i + 1}</span><br><span class="hash">${h.codigo}</span></span><button class="btn sm" data-act="copy" data-txt="${h.codigo}">${ic('copy')} Copiar</button></div>`).join('')}</div>
        <div class="form-actions"><button class="btn" data-act="go" data-v="obraForm">Cadastrar outro livro</button><button class="btn" data-act="go" data-v="obra" data-id="${o.id}">Ver obra</button><button class="btn primary" data-act="go" data-v="etiquetas" data-sel="${hs.map(h => h.id).join(',')}">${ic('tag')} Gerar etiquetas</button></div>
      </section>`;
  }
};

/* ---- Usuários ---- */
function userResults() {
  const q = P.q || '', nq = norm(q), dq = digits(q), stf = P.st || 'Todos';
  const list = S.usuarios.filter(u => (stf === 'Todos' || u.status === stf) && (!q || norm(u.nome + ' ' + u.email).includes(nq) || (dq.length >= 3 && u.cpf.includes(dq)) || (u.assocId && dq && dq.length <= 6 && +dq === u.matricula)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!list.length) return `<div class="table-wrap"><div class="empty">Nenhum usuário encontrado. ${dq.length === 11 ? `<button class="btn sm" data-act="go" data-v="usuarioForm" data-cpf="${dq}">Cadastrar este CPF</button>` : ''}</div></div>`;
  return `<div class="table-wrap cards"><table><thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Situação</th><th>Com livros</th></tr></thead><tbody>
    ${list.map(u => `<tr class="click" data-act="go" data-v="usuario" data-id="${u.id}"><td class="lead"><div class="t">${esc(u.nome)}</div><div class="s">${u.assocId ? `${assocInfo(u)} · ` : ''}${esc(u.email || 'sem e-mail')}</div></td>
      <td data-label="CPF" class="mono small">${u.cpf ? showCPF(u.cpf) : '—'}${u.cpfResp ? ' <span class="small muted">(responsável)</span>' : ''}</td><td data-label="Telefone">${esc(u.telefone || '—')}</td>
      <td data-label="Situação">${pill(u.status, US_CLS[u.status])}</td><td data-label="Com livros" class="num">${activeOf(u.id).length} de ${S.config.maxExemplares}</td></tr>`).join('')}
    </tbody></table></div>`;
}
VIEWS.usuarios = {
  render() {
    const c = s => s === 'Todos' ? S.usuarios.length : S.usuarios.filter(u => u.status === s).length;
    return `<div class="page-head"><div><h1>Usuários autorizados</h1><p class="sub">Pessoas aptas a retirar livros. Todo associado já tem cadastro, que vem da Secretaria. Busque por CPF, nome, e-mail ou matrícula.</p></div>
      <button class="btn primary" data-act="go" data-v="usuarioForm">${ic('plus')} Novo usuário</button></div>
      <div class="toolbar"><label class="search"><span class="sr">Buscar</span>${ic('search')}<input id="us-q" data-in="usQ" value="${esc(P.q || '')}" placeholder="CPF, nome ou e-mail" autocomplete="off"></label>
      <div class="seg" role="group" aria-label="Situação">${['Todos', 'Ativo', 'Bloqueado', 'Inativo'].map(s => `<button data-act="usSt" data-st="${s}" aria-pressed="${(P.st || 'Todos') === s}">${s === 'Todos' ? 'Todos' : s + 's'}<span class="n">${c(s)}</span></button>`).join('')}</div></div>
      ${isAdmin() ? '' : '<p class="small muted">Seu perfil vê o CPF parcialmente mascarado. A busca pelo CPF completo funciona normalmente.</p>'}
      <div id="us-res">${userResults()}</div>`;
  }
};
VIEWS.usuario = {
  render() {
    const u = user(P.id); if (!u) return '<p>Usuário não encontrado.</p>';
    const hist = S.emprestimos.filter(l => l.userId === u.id).sort((a, b) => b.dataEmp.localeCompare(a.dataEmp));
    const bl = userBlocks(u);
    return `<div><button class="back" data-act="go" data-v="usuarios">${ic('back')} Usuários</button>
      <div class="page-head"><div><h1>${esc(u.nome)}</h1><p class="sub">${pill(u.status, US_CLS[u.status])} · ${activeOf(u.id).length} de ${S.config.maxExemplares} exemplares em uso</p></div>
      <div class="toolbar"><button class="btn" data-act="go" data-v="usuarioForm" data-id="${u.id}">${ic('edit')} Editar</button>
        ${u.status === 'Ativo' ? `<button class="btn danger" data-act="usStatus" data-id="${u.id}" data-to="Bloqueado">Bloquear</button><button class="btn" data-act="usStatus" data-id="${u.id}" data-to="Inativo">Inativar</button>` : u.obs === MARCA_SECRETARIA ? '<span class="small muted">Reative na Secretaria</span>' : `<button class="btn" data-act="usStatus" data-id="${u.id}" data-to="Ativo">Reativar</button>`}
        <button class="btn primary" data-act="go" data-v="emprestar" data-cpf="${u.cpf}" ${bl.length ? 'disabled' : ''}>${ic('swap')} Novo empréstimo</button></div></div></div>
      ${bl.length ? `<div class="note warn"><b>Não pode retirar livros agora</b><ul>${bl.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
      ${u.assocId ? `<div class="note info"><b>${assocInfo(u)}</b><span>Cadastro criado e atualizado pela Secretaria. Nome, CPF, e-mail, telefone e situação de associado são alterados lá.${u.sincEm ? ` Última atualização: ${fmtD(u.sincEm.slice(0, 10))}.` : ''}</span></div>` : ''}
      <section class="panel"><dl class="facts">
        <div><dt>CPF${u.cpfResp ? ' (do responsável)' : ''}</dt><dd class="mono">${u.cpf ? showCPF(u.cpf) : '—'}</dd></div>
        <div><dt>E-mail${u.emailResp ? ' (do responsável)' : ''}</dt><dd>${esc(u.email || '—')}${u.email ? '' : ' <span class="small muted">(não recebe lembretes)</span>'}</dd></div>
        <div><dt>Telefone</dt><dd>${esc(u.telefone || '—')}</dd></div>
        <div><dt>Autorizado em</dt><dd>${fmtD(u.dataAut)}</dd></div>
        <div><dt>Cadastro</dt><dd>${fmtD(u.dataCadastro)}</dd></div>
        <div><dt>ID interno</dt><dd class="mono">${u.id}</dd></div>
        ${u.obs ? `<div style="grid-column:1/-1"><dt>Observações</dt><dd>${esc(u.obs)}</dd></div>` : ''}
      </dl></section>
      ${(() => { const ocs = S.ocorrencias.filter(o => o.userId === u.id).sort((x, y) => y.registradaEm.localeCompare(x.registradaEm)); return ocs.length ? `<section class="panel"><h2>Ocorrências</h2>${ocRows(ocs)}</section>` : ''; })()}
      <section class="panel"><h2>Histórico de empréstimos</h2>${loanRows(hist, { actions: true, empty: 'Nenhum empréstimo registrado.' })}</section>`;
  }
};
function cpfCheckHTML(val, selfId) {
  const d = digits(val);
  if (d.length < 11) return d.length ? '<span class="hint">Digite os 11 dígitos.</span>' : '';
  if (!cpfValido(d)) return '<div class="note bad"><b>CPF inválido</b><span>Os dígitos verificadores não conferem. Confira o número digitado.</span></div>';
  const ex = userByCPF(d);
  if (ex && ex.id !== selfId) return `<div class="note warn"><b>CPF já cadastrado</b><span>${esc(ex.nome)} · ${pill(ex.status, US_CLS[ex.status])}</span><span><button type="button" class="btn sm" data-act="go" data-v="usuario" data-id="${ex.id}">Abrir cadastro existente</button></span></div>`;
  return '<div class="note ok"><b>CPF válido e disponível</b></div>';
}
VIEWS.usuarioForm = {
  render() {
    const u = P.id ? user(P.id) : null, ed = !!u;
    const v = (k, d = '') => esc(u ? (u[k] ?? d) : d);
    const cpf = u ? fmtCPF(u.cpf) : (P.cpf ? fmtCPF(P.cpf) : '');
    const vinc = ed && !!u.assocId, cpfLock = ed && (!isAdmin() || vinc), ro = vinc ? 'readonly' : '';
    return `<div><button class="back" data-act="go" data-v="${ed ? 'usuario' : 'usuarios'}" ${ed ? `data-id="${u.id}"` : ''}>${ic('back')} ${ed ? 'Voltar para o cadastro' : 'Usuários'}</button>
      <div class="page-head"><div><h1>${ed ? 'Editar usuário' : 'Novo usuário autorizado'}</h1><p class="sub">${ed ? 'O histórico de empréstimos é mantido.' : 'Comece pelo CPF: o sistema verifica se a pessoa já tem cadastro.'}</p></div></div></div>
      <form class="panel form" data-form="usuario" novalidate>${vinc ? `<div class="note info"><b>${assocInfo(u)}</b><span>Nome, CPF, e-mail e telefone vêm do cadastro da Secretaria e só podem ser alterados lá. Aqui dá para mudar a situação na biblioteca e as observações.</span></div>` : ''}<div class="fields">
        <div class="field full"><label for="f-cpf">CPF <span class="req">*</span></label><input id="f-cpf" class="mono" data-in="cpfForm" inputmode="numeric" value="${cpfLock ? maskCPF(u.cpf) : cpf}" placeholder="000.000.000-00" ${cpfLock ? 'readonly' : ''} style="max-width:260px">
          ${cpfLock && !vinc ? '<span class="hint">Somente o administrador pode corrigir o CPF.</span>' : ''}<div id="cpf-check">${cpfLock ? '' : cpfCheckHTML(cpf, u && u.id)}</div></div>
        <div class="field full"><label for="f-nome">Nome completo <span class="req">*</span></label><input id="f-nome" value="${v('nome')}" autocomplete="off" ${ro}><span class="msg" id="m-nome"></span></div>
        <div class="field"><label for="f-email">E-mail <span class="req">*</span></label><input id="f-email" type="email" value="${v('email')}" ${ro}><span class="hint">Obrigatório: é para onde vão os lembretes de devolução.</span><span class="msg" id="m-email"></span></div>
        <div class="field"><label for="f-tel">Telefone</label><input id="f-tel" inputmode="tel" value="${v('telefone')}" placeholder="(54) 9 0000-0000" ${ro}></div>
        <div class="field"><label for="f-aut">Data de autorização <span class="req">*</span></label><input id="f-aut" type="date" value="${v('dataAut', TODAY())}"></div>
        <div class="field"><label for="f-status">Situação</label><select id="f-status">${['Ativo', 'Bloqueado', 'Inativo'].map(s => `<option ${(u ? u.status : 'Ativo') === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field full"><label for="f-uobs">Observações</label><textarea id="f-uobs">${v('obs')}</textarea></div>
      </div>
      <div class="form-actions"><button type="button" class="btn" data-act="go" data-v="${ed ? 'usuario' : 'usuarios'}" ${ed ? `data-id="${u.id}"` : ''}>Cancelar</button><button class="btn primary" id="btn-us-save">${ed ? 'Salvar alterações' : 'Cadastrar usuário'}</button></div>
      </form>`;
  }
};

/* ---- Empréstimo ---- */
function findLoanUser() {
  const d = UI.draft; d.userChecked = true; d.err = ''; d.termo = false;
  const c = digits(d.cpf); d.choices = null;
  if (c.length >= 1 && c.length <= 6) { // matrícula do associado
    const u = S.usuarios.find(x => x.assocId && x.matricula === +c); d.userId = u ? u.id : null; d.userMsg = u ? '' : `Nenhum associado com a matrícula ${fmtMat(c)}.`; return;
  }
  if (c.length !== 11 || !cpfValido(c)) { d.userId = null; d.userMsg = c.length === 11 ? 'CPF inválido. Confira os dígitos.' : 'Digite os 11 dígitos do CPF ou a matrícula do associado.'; return; }
  const us = usersByCPF(c);
  if (us.length > 1) { d.userId = null; d.choices = us.map(x => x.id); d.userMsg = ''; return; } // responsável e dependentes com o mesmo CPF
  const u = us[0]; d.userId = u ? u.id : null; d.userMsg = u ? '' : 'CPF não encontrado. A pessoa precisa ser cadastrada como usuário autorizado.';
}
function findLoanEx() {
  const d = UI.draft; d.exChecked = true; d.err = ''; d.termo = false;
  const p = parseCodigo(d.cod);
  if (!p) { d.exId = null; d.exMsg = 'Digite o número da etiqueta (ex.: 42) ou o código completo (LIV-0042-ESP).'; return; }
  const ex = exByNum(p.num);
  if (!ex) { d.exId = null; d.exMsg = `Nenhum exemplar com o número ${fmtNum(p.num)}.`; return; }
  if (p.sigla && !ex.codigo.endsWith('-' + p.sigla)) { d.exId = null; d.exMsg = `O número ${fmtNum(p.num)} é ${ex.codigo}, não ${p.sigla}. Confira a etiqueta.`; return; }
  d.cod = ex.codigo; d.exId = ex.id; d.exMsg = '';
}
function loanState() {
  const d = UI.draft; const u = d.userId ? user(d.userId) : null; const ex = d.exId ? exem(d.exId) : null;
  const ub = u ? userBlocks(u) : null; const eb = ex ? exBlocks(ex, u) : null;
  let dateErr = '';
  if (!d.dataEmp || !d.dataPrev) dateErr = 'Informe as duas datas.';
  else if (d.dataPrev < d.dataEmp) dateErr = 'A devolução prevista não pode ser anterior à data do empréstimo.';
  const ok = u && ex && ub.length === 0 && eb.length === 0 && !dateErr;
  return { u, ex, ub, eb, dateErr, ok };
}
VIEWS.emprestar = {
  render() {
    const d = UI.draft, s = loanState(), cfg = S.config;
    const uRes = !d.userChecked ? '<p class="small muted">Digite o CPF (ou a matrícula do associado) e toque em Buscar.</p>'
      : !s.u && d.choices ? `<div class="note info"><b>Este CPF está em mais de um cadastro</b><span>Responsável e dependentes usam o mesmo CPF. Escolha quem vai retirar:</span><span class="btns">${d.choices.map(id => user(id)).filter(Boolean).map(x => `<button class="btn sm" data-act="loanPick" data-id="${x.id}">${esc(x.nome)}${x.assocId ? ` · ${fmtMat(x.matricula)}` : ''}</button>`).join('')}</span></div>`
      : !s.u ? `<div class="note bad"><b>${esc(d.userMsg)}</b>${digits(d.cpf).length === 11 && cpfValido(d.cpf) ? `<span><button class="btn sm" data-act="go" data-v="usuarioForm" data-cpf="${digits(d.cpf)}">Cadastrar este CPF</button></span>` : ''}</div>`
      : `<div class="result"><span class="big">${esc(s.u.nome)}</span><span>${pill(s.u.status, US_CLS[s.u.status])} <span class="small muted">· ${activeOf(s.u.id).length} de ${cfg.maxExemplares} exemplares em uso</span></span>
         ${s.ub.length ? `<div class="note bad"><b>Empréstimo bloqueado</b><ul>${s.ub.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : '<div class="note ok"><b>Pode retirar livros</b></div>'}</div>`;
    const o = s.ex ? obra(s.ex.obraId) : null;
    const eRes = !d.exChecked ? `<p class="small muted">O código está na etiqueta do livro. Basta digitar o número. <button class="btn sm ghost" data-act="go" data-v="catalogo">Procurar no catálogo</button></p>`
      : !s.ex ? `<div class="note bad"><b>${esc(d.exMsg)}</b></div>`
      : `<div class="result"><span class="hash">${s.ex.codigo}</span><span class="big">${esc(o.titulo)}</span><span class="small">${esc(o.autor)} · ${esc(generoNome(o.genero))} · ${esc(s.ex.local)}</span><span>${pill(s.ex.status, EX_CLS[s.ex.status])}</span>
         ${s.eb.length ? `<div class="note bad"><b>Exemplar indisponível para este empréstimo</b><ul>${s.eb.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}</div>`;
    const done1 = s.u && !s.ub.length, done2 = s.ex && !s.eb.length;
    return `<div class="page-head"><div><h1>Novo empréstimo</h1><p class="sub">Vincule um usuário autorizado a um exemplar disponível.</p></div></div>
    <div class="steps">
      <section class="panel"><h2 class="step-title"><span class="step-n ${done1 ? 'done' : ''}">${done1 ? '✓' : '1'}</span>Usuário</h2>
        <form data-form="loanUser" class="field"><label for="l-cpf">CPF ou matrícula do associado</label><div class="inline"><input id="l-cpf" class="mono" data-in="loanCpf" inputmode="numeric" value="${esc(d.cpf)}" placeholder="000.000.000-00" autocomplete="off"><button class="btn" aria-label="Buscar usuário">${ic('search')}</button></div></form>
        ${uRes}</section>
      <section class="panel"><h2 class="step-title"><span class="step-n ${done2 ? 'done' : ''}">${done2 ? '✓' : '2'}</span>Exemplar</h2>
        <form data-form="loanEx" class="field"><label for="l-hash">Código da etiqueta</label><div class="inline"><input id="l-hash" class="mono" data-in="loanHash" value="${esc(d.cod)}" placeholder="Ex.: 42 ou LIV-0042-ESP" autocomplete="off" autocapitalize="characters"><button class="btn" aria-label="Buscar exemplar">${ic('search')}</button></div></form>
        ${eRes}</section>
      <section class="panel"><h2 class="step-title"><span class="step-n ${s.ok ? 'done' : ''}">${s.ok ? '✓' : '3'}</span>Datas e protocolo</h2>
        <div class="field"><label for="l-emp">Data do empréstimo</label><input id="l-emp" type="date" data-ch="loanEmp" value="${d.dataEmp}" ${isAdmin() ? '' : 'readonly'}>${isAdmin() ? '<span class="hint">Admin pode registrar retroativamente.</span>' : ''}</div>
        <div class="field"><label for="l-prev">Devolução prevista</label><input id="l-prev" type="date" data-ch="loanPrev" value="${d.dataPrev}" min="${d.dataEmp}"><span class="hint">Sugerida pelo prazo padrão de ${cfg.prazo} dias. Pode ser ajustada.</span></div>
        <div class="field"><label for="l-estado">Estado do livro na retirada</label><textarea id="l-estado" data-in="loanEstado" placeholder="Ex.: bom estado; capa com leve desgaste" style="min-height:56px">${esc(d.estado)}</textarea><span class="hint">Opcional. Fica registrado para comparar na devolução.</span></div>
        ${s.dateErr ? `<div class="note bad"><b>${s.dateErr}</b></div>` : ''}
        ${d.err ? `<div class="note bad"><b>${esc(d.err)}</b></div>` : ''}
        ${s.ok ? `<div class="note info"><b>Resumo</b><span>${esc(s.u.nome)} retira <b>${esc(o.titulo)}</b> e devolve até <b>${fmtD(d.dataPrev)}</b> (${plural(diffDays(d.dataEmp, d.dataPrev), 'dia', 'dias')}).</span></div>` : ''}
        <div class="termo"><b>Termo de responsabilidade</b><p>${esc(termoTexto())}</p><span class="hint">Vai impresso no protocolo para a pessoa assinar.</span></div>
        <button class="btn primary lg" data-act="confirmLoan" ${s.ok ? '' : 'disabled'}>${ic('check')} Gerar protocolo para assinatura</button>
        <p class="small muted" style="text-align:center">O empréstimo só fica ativo depois que o protocolo assinado for anexado. Até lá, o exemplar fica reservado.</p>
        <button class="btn ghost sm" data-act="go" data-v="emprestar">Limpar</button></section>
    </div>`;
  },
  after() { const d = UI.draft; if (!d.userChecked && window.innerWidth > 900) $('#l-cpf')?.focus(); }
};
VIEWS.emprestimoOk = {
  render() {
    const l = S.emprestimos.find(x => x.id === P.id), u = user(l.userId), ex = exem(l.exId), o = obra(ex.obraId);
    return `<div class="page-head"><div><h1>Empréstimo ativo</h1><p class="sub">Protocolo assinado anexado. O exemplar agora aparece como emprestado.</p></div></div>
      <section class="panel"><div class="note ok"><b>Tudo certo.</b><span>Entregue o livro e lembre a pessoa da data de devolução.</span></div>
        <dl class="facts"><div><dt>Usuário</dt><dd>${esc(u.nome)}</dd></div><div><dt>Livro</dt><dd>${esc(o.titulo)}</dd></div><div><dt>Código</dt><dd class="mono">${ex.codigo}</dd></div>
        <div><dt>Retirada</dt><dd>${fmtD(l.dataEmp)}</dd></div><div><dt>Devolver até</dt><dd style="font-size:1.3rem;font-family:var(--f-display)">${fmtD(l.dataPrev)}</dd></div><div><dt>Registro</dt><dd class="mono small">${l.id}</dd></div></dl>
        ${termoBox(l)}
        <p class="small muted">${esc(u.email)} vai receber um lembrete por e-mail ${plural(S.config.antecedencia, 'dia', 'dias')} antes do vencimento.</p>
        <div class="form-actions"><button class="btn" data-act="go" data-v="emprestados" data-f="ativos">Ver livros emprestados</button><button class="btn primary" data-act="go" data-v="emprestar">${ic('swap')} Novo empréstimo</button></div></section>`;
  }
};

/* ---- Protocolos (retirada e renovação) ---- */
const LOCAL_PROT = 'Passo Fundo/RS'; // versão 1.4: local e data saem preenchidos (data da geração do protocolo)
function protocoloDoc(pr) {
  const l = S.emprestimos.find(x => x.id === pr.loanId) || {}, u = user(l.userId), ex = exem(l.exId), o = obra(ex.obraId), op = S.operadores.find(x => x.email === pr.geradoPor);
  const al = assocLinhas(), ren = pr.tipo === 'renovacao';
  const row = (k, v, cls = '') => `<tr><th>${k}</th><td class="${cls}">${v}</td></tr>`;
  return `<article class="doc" aria-label="Protocolo">
    <header class="doc-h"><img src="${LOGO}" alt=""><div><b>Biblioteca da ${esc(al.nome)}</b>${al.l1 ? `<em class="doc-info">${esc(al.l1)}</em>` : ''}${al.l2 ? `<em class="doc-info">${esc(al.l2)}</em>` : ''}<span>${ren ? 'Protocolo de renovação de empréstimo' : 'Protocolo de empréstimo'}</span></div><div class="doc-n">Nº ${pr.id}<br>${fmtD(pr.geradoEm.slice(0, 10))}</div></header>
    <h4>Usuário</h4><table class="doc-t">${row('Nome', esc(u.nome))}${row('CPF', fmtCPF(u.cpf), 'mono')}${row('E-mail', esc(u.email || '—'))}${row('Telefone', esc(u.telefone || '—'))}</table>
    <h4>Livro</h4><table class="doc-t">${row('Título', esc(o.titulo))}${row('Autor', esc(o.autor))}${row('Código', ex.codigo, 'mono')}${row('Gênero', esc(generoNome(o.genero)))}${row('Localização', esc(ex.local))}</table>
    <h4>${ren ? 'Renovação' : 'Empréstimo'}</h4><table class="doc-t">${ren
      ? row('Empréstimo nº', l.id, 'mono') + row('Retirada', fmtD(l.dataEmp)) + row('Vencimento anterior', fmtD(pr.dataPrevAnterior)) + row('Novo vencimento', `<b>${fmtD(pr.novaDataPrev)}</b>`)
      : row('Retirada', fmtD(l.dataEmp)) + row('Devolver até', `<b>${fmtD(pr.novaDataPrev)}</b>`) + row('Estado na retirada', esc(l.estadoRetirada || 'Não informado'))}${row('Operador', esc(op ? op.nome : pr.geradoPor))}</table>
    <h4>Termo de responsabilidade</h4><p class="doc-termo">${esc(pr.termoTexto)}</p>
    <p class="doc-place">${LOCAL_PROT}, ${fmtD(pr.geradoEm.slice(0, 10))}.</p>
    <div class="doc-sign"><div><span class="sig-box"></span><span class="line"></span>Assinatura do usuário<br><b>${esc(u.nome)}</b></div><div><span class="sig-box">${op && op.assinatura ? `<img src="data:image/png;base64,${op.assinatura}" alt="Assinatura de ${esc(op.nome)}">` : ''}</span><span class="line"></span>Operador responsável<br><b>${esc(op ? op.nome : pr.geradoPor)}</b></div></div>
    <footer>Documento gerado em ${fmtStamp(pr.geradoEm)}. Depois de assinado, digitalize ou fotografe este protocolo e anexe no sistema (protocolo nº ${pr.id}).</footer>
  </article>`;
}
function protPreviewHTML() {
  const f = UI.prot && UI.prot.file;
  if (!f) return '';
  const kb = f.tamanho > 1048576 ? (f.tamanho / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(f.tamanho / 1024)) + ' KB';
  return `<div class="attach">${f.thumb ? `<img src="${f.thumb}" alt="Prévia do protocolo anexado">` : `<div class="pdf-ic">PDF</div>`}<div class="attach-i"><b>${esc(f.nome)}</b><span class="small muted">${kb}${f.comprimida ? ' · otimizada para envio' : ''}</span><button type="button" class="btn sm ghost" data-act="protClear">Trocar arquivo</button></div></div>`;
}
function protRefresh() {
  $('#prot-prev').innerHTML = protPreviewHTML();
  const b = $('#btn-prot'); if (b) b.disabled = !(UI.prot.file && UI.prot.ok);
  const dz = $('#prot-drop'); if (dz) dz.hidden = !!UI.prot.file;
}
function anexoInfo(pr) {
  const op = S.operadores.find(o => o.email === pr.anexadoPor);
  return `<div class="note ok"><b>${pr.tipo === 'renovacao' ? 'Protocolo de renovação assinado' : 'Protocolo assinado'}</b><span>Anexado em ${fmtStamp(pr.anexadoEm)} por ${esc(op ? op.nome : pr.anexadoPor)} · ${esc(pr.arquivoNome || '')}</span><span><button class="btn sm" data-act="protView" data-id="${pr.id}">${ic('copy')} Ver documento assinado</button></span></div>`;
}
VIEWS.protocolo = {
  render() {
    const pr = protocolo(P.id), l = pr && S.emprestimos.find(x => x.id === pr.loanId);
    if (!pr || !l) return `<div class="page-head"><div><h1>Protocolo não encontrado</h1><p class="sub">O empréstimo pode ter sido cancelado.</p></div></div><button class="btn" data-act="go" data-v="emprestados">Livros emprestados</button>`;
    if (!UI.prot || UI.prot.id !== pr.id) UI.prot = { id: pr.id, file: null, ok: false, printed: false };
    const u = user(l.userId), o = obra(exem(l.exId).obraId), pend = pr.status === 'pendente', ren = pr.tipo === 'renovacao';
    const step = (n, t, done, cur) => `<li class="${done ? 'done' : cur ? 'cur' : ''}"><span class="step-n ${done ? 'done' : ''}">${done ? '✓' : n}</span>${t}</li>`;
    const dd = diasDesde(pr.geradoEm);
    return `<div><button class="back" data-act="go" data-v="emprestados" data-f="${pend ? 'pendente' : 'todos'}">${ic('back')} Livros emprestados</button>
      <div class="page-head"><div><h1>${ren ? 'Protocolo de renovação' : 'Protocolo de empréstimo'}</h1><p class="sub mono">${pr.id}</p><p class="sub">${esc(u.nome)} · ${esc(o.titulo)} · ${pill(pend ? 'Aguardando protocolo assinado' : pr.status === 'anexado' ? 'Protocolo anexado' : 'Cancelado', pend ? (dd >= 1 ? 'bad' : 'warn') : pr.status === 'anexado' ? 'ok' : 'mute')}</p></div></div></div>
      ${pend && dd >= 1 ? `<div class="note bad"><span>Este protocolo foi gerado há ${plural(dd, 'dia', 'dias')} e ainda não tem o documento assinado. ${ren ? 'Enquanto isso, vale o vencimento anterior.' : 'O exemplar segue reservado.'}</span></div>` : ''}
      ${pend ? `<ol class="prot-steps">${step(1, 'Imprimir', UI.prot.printed, !UI.prot.printed)}${step(2, 'Colher a assinatura', false, UI.prot.printed)}${step(3, 'Anexar o documento assinado', false, false)}</ol>` : ''}
      <div class="prot-layout">
        <section class="panel prot-doc"><div class="panel-head"><h2>Documento para impressão</h2><button class="btn sm" data-act="protPrint">${ic('print')} Imprimir protocolo</button></div>
          ${pend ? protEnvioHTML(pr, u) : ''}
          <div class="doc-wrap">${protocoloDoc(pr)}</div></section>
        <section class="panel prot-side">
          ${pend ? `<h2>Anexar o protocolo assinado</h2>
            <p class="small muted">Depois que ${esc(u.nome.split(' ')[0])} assinar, escaneie ou fotografe o documento inteiro. ${ren ? 'A nova data só vale depois do anexo.' : 'O empréstimo só fica ativo com o anexo.'}</p>
            <label class="drop" id="prot-drop" for="prot-file" ${UI.prot.file ? 'hidden' : ''}>${ic('plus')}<b>Escanear ou fotografar o protocolo</b><span class="small muted">Imagem (JPG, PNG) ou PDF, até 10 MB. No celular, dá para usar a câmera.</span></label>
            <input type="file" id="prot-file" class="sr" accept="image/*,application/pdf" data-ch="protFile">
            <div id="prot-prev">${protPreviewHTML()}</div>
            <label class="check"><input type="checkbox" id="prot-ok" data-ch="protOk" ${UI.prot.ok ? 'checked' : ''}> Conferi: está assinado, legível e é o protocolo nº ${pr.id}</label>
            <button class="btn primary lg" id="btn-prot" data-act="protAttach" data-id="${pr.id}" ${UI.prot.file && UI.prot.ok ? '' : 'disabled'}>${ic('check')} ${ren ? 'Anexar e renovar' : 'Anexar e ativar empréstimo'}</button>
            ${ren ? '' : '<div class="note"><span>O exemplar está <b>reservado</b> e não entra na contagem de atrasos nem nos alertas até o empréstimo ser ativado.</span></div>'}
            <button class="btn danger sm" data-act="protCancel" data-id="${pr.id}" style="justify-self:start">${ren ? 'Cancelar renovação' : 'Cancelar empréstimo'}</button>`
          : pr.status === 'anexado' ? `<h2>Documento assinado</h2>${anexoInfo(pr)}` : `<h2>Protocolo cancelado</h2><p class="muted">Cancelado em ${fmtStamp(pr.canceladoEm)}.</p>`}
        </section>
      </div>`;
  }
};
/* ---- Livros emprestados ---- */
const EMP_F = [['ativos', 'Ativos'], ['pendente', 'Aguardando protocolo'], ['atrasado', 'Atrasados'], ['breve', 'Vencem em breve'], ['emdia', 'Em dia'], ['devolvido', 'Devolvidos'], ['todos', 'Todos']];
function empFilter(f) {
  return S.emprestimos.filter(l => {
    const c = loanSt(l).code;
    return f === 'todos' ? true : f === 'ativos' ? c !== 'devolvido' : c === f;
  });
}
function empResults() {
  const f = P.f || 'ativos', q = P.q || '', nq = norm(q), dq = digits(q), hq = q.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^LIV/, '');
  let list = empFilter(f).filter(l => {
    if (P.de && l.dataEmp < P.de) return false;
    if (P.ate && l.dataEmp > P.ate) return false;
    if (!q) return true;
    const u = user(l.userId), o = obra(exem(l.exId).obraId);
    return norm(u.nome + ' ' + o.titulo).includes(nq) || (dq.length >= 3 && u.cpf.includes(dq)) || (() => { const ex = exem(l.exId), pc = parseCodigo(q); return (pc && pc.num === ex.num && (!pc.sigla || ex.codigo.endsWith('-' + pc.sigla))) || (hq.length >= 4 && codeCompact(ex.codigo).includes(hq)); })();
  });
  list.sort((a, b) => (!a.dataDev && !b.dataDev) ? a.dataPrev.localeCompare(b.dataPrev) : (a.dataDev && b.dataDev) ? b.dataDev.localeCompare(a.dataDev) : (a.dataDev ? 1 : -1));
  const per = 10, pages = Math.max(1, Math.ceil(list.length / per)), pg = Math.min(+P.p || 1, pages);
  const slice = list.slice((pg - 1) * per, pg * per);
  return loanRows(slice, { actions: true, empty: 'Nenhum empréstimo com esses filtros.' }) +
    (list.length ? `<div class="pager"><span>${plural(list.length, 'empréstimo', 'empréstimos')} · página ${pg} de ${pages}</span><span class="toolbar">
      <button class="btn sm" data-act="page" data-p="${pg - 1}" ${pg <= 1 ? 'disabled' : ''}>Anterior</button><button class="btn sm" data-act="page" data-p="${pg + 1}" ${pg >= pages ? 'disabled' : ''}>Próxima</button></span></div>` : '');
}
VIEWS.emprestados = {
  render() {
    const f = P.f || 'ativos';
    return `<div class="page-head"><div><h1>Livros emprestados</h1><p class="sub">Acompanhe vencimentos, registre devoluções e consulte o histórico. Os mais urgentes aparecem primeiro.</p></div>
      <button class="btn primary" data-act="go" data-v="emprestar">${ic('swap')} Novo empréstimo</button></div>
      <div class="toolbar"><label class="search"><span class="sr">Buscar</span>${ic('search')}<input id="emp-q" data-in="empQ" value="${esc(P.q || '')}" placeholder="CPF, nome, título ou código" autocomplete="off"></label>
        <div class="field" style="flex:0 1 160px"><label class="sr" for="emp-de">Retirados a partir de</label><input id="emp-de" type="date" data-ch="empDe" value="${P.de || ''}" title="Retirados a partir de"></div>
        <div class="field" style="flex:0 1 160px"><label class="sr" for="emp-ate">Retirados até</label><input id="emp-ate" type="date" data-ch="empAte" value="${P.ate || ''}" title="Retirados até"></div></div>
      <div class="seg" role="group" aria-label="Situação">${EMP_F.map(([k, l]) => `<button data-act="empF" data-f="${k}" aria-pressed="${f === k}">${l}<span class="n">${empFilter(k).length}</span></button>`).join('')}</div>
      <div id="emp-res">${empResults()}</div>`;
  }
};

/* ---- Etiquetas ---- */
const PRESETS = [
  { id: 'a4-3x10', label: 'A4 · 3 colunas × 10 linhas (30 por folha)', cols: 3, rows: 10, mt: 13, ml: 7, gx: 2.5, gy: 0 },
  { id: 'a4-3x8', label: 'A4 · 3 colunas × 8 linhas (24 por folha)', cols: 3, rows: 8, mt: 13, ml: 7, gx: 2.5, gy: 0 },
  { id: 'a4-2x7', label: 'A4 · 2 colunas × 7 linhas (14 por folha)', cols: 2, rows: 7, mt: 15, ml: 5, gx: 2.5, gy: 0 },
  { id: 'custom', label: 'Personalizado', cols: 3, rows: 10, mt: 10, ml: 7, gx: 2.5, gy: 0 },
];
function lblCandidates() {
  const L = UI.lbl, T = TODAY();
  return S.exemplares.filter(e => e.status !== 'Baixado' && (
    L.filtro === 'pendentes' ? !e.etiqueta : L.filtro === 'hoje' ? e.dataCadastro === T : L.filtro === 'obra' ? e.obraId === L.obraId : true))
    .sort((a, b) => obra(a.obraId).titulo.localeCompare(obra(b.obraId).titulo, 'pt-BR'));
}
const shortTitle = t => t.length > 30 ? t.slice(0, 29).trimEnd() + '…' : t;
function sheetHTML() {
  const L = UI.lbl, per = L.cols * L.rows, start = Math.min(Math.max(1, +L.start || 1), per);
  const sel = S.exemplares.filter(e => L.sel.has(e.id));
  const skip = start - 1, total = skip + sel.length, sheets = Math.max(1, Math.ceil(total / per));
  let cells = '';
  for (let i = 0; i < per; i++) {
    if (i < skip) { cells += '<div class="lbl used" title="Etiqueta já usada"></div>'; continue; }
    const e = sel[i - skip];
    cells += e ? `<div class="lbl"><div class="l1">Biblioteca Luzes de Aruanda</div><div class="l3">${e.codigo}</div><div class="l2">${esc(shortTitle(obra(e.obraId).titulo))}</div></div>` : '<div class="lbl"></div>';
  }
  return `<div class="sheet-wrap"><div class="sheet" style="grid-template-columns:repeat(${L.cols},1fr);grid-template-rows:repeat(${L.rows},1fr)">${cells}</div></div>
    <p class="small muted" style="text-align:center">${plural(sel.length, 'etiqueta selecionada', 'etiquetas selecionadas')} · ${plural(sheets, 'folha', 'folhas')}${sheets > 1 ? ' (prévia da primeira)' : ''}</p>`;
}
function lblPrintHTML() {
  const L = UI.lbl, per = L.cols * L.rows, start = Math.min(Math.max(1, +L.start || 1), per);
  const sel = S.exemplares.filter(e => L.sel.has(e.id));
  const cells = Array(start - 1).fill(null).concat(sel), pages = [];
  for (let i = 0; i < cells.length; i += per) pages.push(cells.slice(i, i + per));
  const w = (210 - 2 * L.ml - (L.cols - 1) * L.gx) / L.cols, h = (297 - 2 * L.mt - (L.rows - 1) * L.gy) / L.rows;
  return pages.map(pg => `<div class="lbl-page" style="padding:${L.mt}mm ${L.ml}mm;grid-template-columns:repeat(${L.cols},${w.toFixed(2)}mm);grid-template-rows:repeat(${L.rows},${h.toFixed(2)}mm);column-gap:${L.gx}mm;row-gap:${L.gy}mm">${pg.map(e => e ? `<div class="lbl-p"><div class="l1">Biblioteca Luzes de Aruanda</div><div class="l3">${e.codigo}</div><div class="l2">${esc(shortTitle(obra(e.obraId).titulo))}</div></div>` : '<div></div>').join('')}</div>`).join('');
}
VIEWS.etiquetas = {
  render() {
    const L = UI.lbl, cand = lblCandidates();
    const allSel = cand.length && cand.every(e => L.sel.has(e.id));
    return `<div class="page-head"><div><h1>Etiquetas</h1><p class="sub">Imprima uma folha de etiquetas com o código de cada exemplar para colar na contracapa ou na lombada. Na janela de impressão, escolha tamanho A4 e escala 100%.</p></div></div>
      <div class="labels-layout">
        <section class="panel"><div class="panel-head"><h2>1. Escolha os exemplares</h2><span class="small muted" id="pick-count">${L.sel.size} selecionados</span></div>
          <div class="seg">${[['pendentes', 'Sem etiqueta'], ['hoje', 'Cadastrados hoje'], ['obra', 'Por obra'], ['todas', 'Todos']].map(([k, l]) => `<button data-act="lblF" data-f="${k}" aria-pressed="${L.filtro === k}">${l}</button>`).join('')}</div>
          ${L.filtro === 'obra' ? `<div class="field"><label for="lbl-obra">Obra</label><select id="lbl-obra" data-ch="lblObra"><option value="">Escolha…</option>${[...S.obras].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')).map(o => `<option value="${o.id}" ${L.obraId === o.id ? 'selected' : ''}>${esc(o.titulo)}</option>`).join('')}</select></div>` : ''}
          ${cand.length ? `<label class="check"><input type="checkbox" data-ch="lblAll" ${allSel ? 'checked' : ''}> Selecionar todos (${cand.length})</label>
          <div class="pick-list">${cand.map(e => `<label class="pick"><input type="checkbox" data-ch="pick" data-id="${e.id}" ${L.sel.has(e.id) ? 'checked' : ''}><span class="pi"><b>${esc(obra(e.obraId).titulo)}</b><span class="mono small">${e.codigo}</span></span>${e.etiqueta ? '<span class="chip">Impressa</span>' : ''}</label>`).join('')}</div>`
          : '<div class="empty">Nenhum exemplar neste filtro.</div>'}
        </section>
        <section class="panel"><h2>2. Layout da folha</h2>
          <div class="fields">
            <div class="field full"><label for="lbl-preset">Modelo de folha</label><select id="lbl-preset" data-ch="lblPreset">${PRESETS.map(p => `<option value="${p.id}" ${L.preset === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
            ${L.preset === 'custom' ? `<div class="field"><label for="lbl-cols">Colunas</label><input id="lbl-cols" type="number" min="1" max="5" value="${L.cols}" data-ch="lblCols"></div><div class="field"><label for="lbl-rows">Linhas</label><input id="lbl-rows" type="number" min="1" max="15" value="${L.rows}" data-ch="lblRows"></div>` : ''}
            <div class="field"><label for="lbl-mt">Margem superior (mm)</label><input id="lbl-mt" inputmode="decimal" value="${L.mt}" data-ch="lblMm" data-k="mt"></div>
            <div class="field"><label for="lbl-ml">Margem lateral (mm)</label><input id="lbl-ml" inputmode="decimal" value="${L.ml}" data-ch="lblMm" data-k="ml"></div>
            <div class="field"><label for="lbl-gx">Espaço entre colunas (mm)</label><input id="lbl-gx" inputmode="decimal" value="${L.gx}" data-ch="lblMm" data-k="gx"></div>
            <div class="field"><label for="lbl-gy">Espaço entre linhas (mm)</label><input id="lbl-gy" inputmode="decimal" value="${L.gy}" data-ch="lblMm" data-k="gy"></div>
            <div class="field full"><label for="lbl-start">Começar na etiqueta nº</label><input id="lbl-start" type="number" min="1" max="${L.cols * L.rows}" value="${L.start}" data-ch="lblStart" style="max-width:120px"><span class="hint">Para aproveitar uma folha já usada em parte.</span></div>
          </div>
          <div id="sheet-area">${sheetHTML()}</div>
          <div class="form-actions"><button class="btn primary" data-act="lblPdf" ${L.sel.size ? '' : 'disabled'} id="btn-pdf">${ic('print')} Imprimir etiquetas</button></div>
        </section>
      </div>`;
  }
};

/* ---- Alertas ---- */
function mailHTML(m) {
  return `<div class="mail"><div class="mail-head"><span><b>De:</b> ${esc(S.config.assoc && S.config.assoc.nome ? 'Biblioteca Luzes de Aruanda' : 'Biblioteca')} (conta da biblioteca)</span><span><b>Para:</b> ${esc(m.to)}</span><span><b>Assunto:</b> ${esc(m.subject)}</span></div><div class="mail-body">${m.html}</div></div>`;
}
VIEWS.alertas = {
  render() {
    const cfg = S.config, r = UI.prev;
    const log = [...S.alertLog].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 30);
    return `<div class="page-head"><div><h1>Alertas por e-mail</h1><p class="sub">A rotina roda sozinha todo dia às ${cfg.horario}. Os e-mails nunca mostram o CPF.</p></div></div>
      <section class="panel"><dl class="facts">
        <div><dt>Lembrete</dt><dd>${plural(cfg.antecedencia, 'dia', 'dias')} antes do vencimento</dd></div>
        <div><dt>Atraso</dt><dd>${cfg.repeticaoAtraso === 1 ? 'Todo dia' : `A cada ${cfg.repeticaoAtraso} dias`} enquanto não devolver</dd></div>
        <div><dt>Destinatários</dt><dd>O próprio usuário${cfg.resumoResp ? ' + resumo para o responsável' : ''}</dd></div>
        <div><dt>Responsável</dt><dd>${esc(cfg.emailResp)}</dd></div>
      </dl>${isAdmin() ? '<button class="btn sm ghost" data-act="go" data-v="configuracoes" style="justify-self:start">Alterar regras</button>' : ''}</section>
      <section class="panel"><div class="panel-head"><h2>E-mails de hoje</h2><div class="toolbar"><button class="btn" data-act="alertPrev">${ic('mail')} Ver prévia</button>${isAdmin() ? `<button class="btn primary" data-act="alertRun">Enviar agora</button>` : ''}</div></div>
        <p class="small muted">A prévia mostra o que a rotina enviaria agora, sem enviar nada. O mesmo e-mail não é reenviado no mesmo dia.</p>
        ${r ? `<div class="note ${r.emails.length ? 'info' : 'ok'}"><b>${r.enviados ? `${plural(r.enviados, 'e-mail enviado', 'e-mails enviados')} às ${r.ts.slice(11)}` : r.emails.length ? `${plural(r.emails.length, 'e-mail seria enviado', 'e-mails seriam enviados')}` : 'Nada novo para enviar hoje'}</b><span>${plural(r.ignorados, 'alerta já tinha sido enviado', 'alertas já tinham sido enviados')}.</span></div>
          ${r.emails.length ? `<div class="tabs">${r.emails.map((m, i) => `<button class="btn sm ${UI.mailTab === i ? 'primary' : ''}" data-act="mailTab" data-i="${i}">${m.kind === 'resumo' ? 'Resumo do responsável' : esc(m.nome.split(' ')[0])}</button>`).join('')}</div>${mailHTML(r.emails[UI.mailTab] || r.emails[0])}` : ''}` : ''}
      </section>
      <section class="panel"><h2>Log de envios</h2>
        ${log.length ? `<div class="table-wrap cards"><table><thead><tr><th>Data/hora</th><th>Empréstimo</th><th>Destinatário</th><th>Tipo</th><th>Resultado</th></tr></thead><tbody>
        ${log.map(a => { const l = a.loanId && S.emprestimos.find(x => x.id === a.loanId); const ex = l && exem(l.exId); return `<tr><td data-label="Data/hora" class="num">${fmtStamp(a.ts)}</td>
          <td data-label="Empréstimo">${l && ex ? `<div><div class="t">${esc(obra(ex.obraId).titulo)}</div><div class="s">${esc(user(l.userId).nome)}</div></div>` : '<span class="muted">—</span>'}</td>
          <td data-label="Destinatário" class="small">${esc(a.dest)}</td><td data-label="Tipo">${esc(a.tipo)}</td>
          <td data-label="Resultado"><div>${a.resultado === 'Enviado' ? pill('Enviado', 'ok') : pill('Falha', 'bad')}${a.erro ? `<div class="s">${esc(a.erro)}</div>` : ''}</div></td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="table-wrap"><div class="empty">Nenhum envio registrado ainda.</div></div>'}</section>`;
  }
};

/* ---- Ocorrências (avaria e extravio) ---- */
function ocRows(list, opt = {}) {
  if (!list.length) return `<div class="table-wrap"><div class="empty">${opt.empty || 'Nenhuma ocorrência.'}</div></div>`;
  return `<div class="table-wrap cards"><table><thead><tr><th>Usuário</th><th>Livro</th><th>Ocorrência</th><th>Reposição</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
    ${list.map(o => { const u = user(o.userId) || {}, ex = exem(o.exId) || {}, ob = obra(ex.obraId) || {}, rp = S.operadores.find(x => x.email === o.registradaPor), qp = S.operadores.find(x => x.email === o.quitadaPor); return `<tr>
      <td class="lead" data-label="Usuário"><div class="t">${esc(u.nome || '')}</div><div class="s mono">${u.cpf ? showCPF(u.cpf) : ''}</div></td>
      <td class="lead" data-label="Livro"><div class="t">${esc(ob.titulo || '')}</div><div class="s mono">${ex.codigo || ''}</div></td>
      <td data-label="Ocorrência"><div>${pill(o.tipo === 'extravio' ? 'Extravio' : 'Avaria', o.tipo === 'extravio' ? 'bad' : 'warn')}<div class="s">${esc(o.descricao)}</div><div class="s">${fmtStamp(o.registradaEm)} · ${esc(rp ? rp.nome : o.registradaPor)}</div></div></td>
      <td data-label="Reposição"><div><b>${o.reposicao === 'livro' ? 'Livro novo' : fmtBRL(o.valor)}</b>${o.reposicao === 'livro' ? `<div class="s">ou taxa de ${fmtBRL(o.valor)}</div>` : ''}</div></td>
      <td data-label="Situação"><div>${pill(OC_LBL[o.status], OC_CLS[o.status])}${o.status !== 'pendente' ? `<div class="s">${fmtStamp(o.quitadaEm)} · ${esc(qp ? qp.nome : o.quitadaPor)}</div><div class="s">${esc(o.obsQuitacao)}</div>` : ''}</div></td>
      <td class="actions">${o.status === 'pendente' ? `<button class="btn sm primary" data-act="ocQuitar" data-id="${o.id}">Registrar quitação</button>${isAdmin() ? `<button class="btn sm ghost" data-act="ocCancelar" data-id="${o.id}">Cancelar</button>` : ''}` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
VIEWS.ocorrencias = {
  render() {
    const f = P.f || 'pendente';
    const c = s => s === 'todas' ? S.ocorrencias.length : S.ocorrencias.filter(o => o.status === s).length;
    const list = S.ocorrencias.filter(o => f === 'todas' || o.status === f).sort((a, b) => b.registradaEm.localeCompare(a.registradaEm));
    return `<div class="page-head"><div><h1>Ocorrências</h1><p class="sub">Avarias e extravios conforme o termo de responsabilidade. Quem tem ocorrência pendente fica sem novos empréstimos até regularizar.</p></div></div>
      <div class="seg" role="group" aria-label="Situação">${[['pendente', 'Pendentes'], ['quitada', 'Quitadas'], ['cancelada', 'Canceladas'], ['todas', 'Todas']].map(([k, l]) => `<button data-act="ocF" data-f="${k}" aria-pressed="${f === k}">${l}<span class="n">${c(k)}</span></button>`).join('')}</div>
      ${ocRows(list, { empty: f === 'pendente' ? 'Nenhuma ocorrência pendente.' : 'Nenhuma ocorrência com esse filtro.' })}
      <p class="small muted">Avarias são registradas na devolução. Extravios, nos detalhes do empréstimo.</p>`;
  }
};
/* ---- Administração ---- */
VIEWS.configuracoes = {
  admin: true,
  render() {
    const c = S.config;
    const num = (id, label, val, hint, min, max) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" min="${min}" max="${max}" value="${val}"><span class="hint">${hint}</span></div>`;
    const assocs = S.usuarios.filter(u => u.assocId);
    return `<div class="page-head"><div><h1>Configurações</h1><p class="sub">Regras usadas no empréstimo e na rotina de alertas. Só administradores alteram.</p></div></div>
      <section class="panel"><div class="panel-head"><h2>Associados (Secretaria)</h2><button class="btn sm" data-act="usSincronizar">${ic('refresh')} Sincronizar agora</button></div>
        <p class="small muted">Todo associado tem cadastro de usuário, criado e atualizado a partir da Secretaria sempre que o sistema abre, a cada empréstimo e uma vez por dia. Desligados e falecidos ficam inativos; mensalidades acima da tolerância impedem novos empréstimos e renovações.</p>
        <p class="small"><b>${plural(assocs.length, 'associado', 'associados')}</b> · ${plural(assocs.filter(u => u.bloqueioAssoc).length, 'com mensalidades em atraso', 'com mensalidades em atraso')} · ${plural(assocs.filter(u => !u.email).length, 'sem e-mail', 'sem e-mail')}</p></section>
      <form class="panel form" data-form="config" novalidate>
        <fieldset><legend>Empréstimo</legend><div class="fields">
          ${num('c-prazo', 'Prazo padrão (dias)', c.prazo, 'Sugere a data de devolução.', 1, 120)}
          ${num('c-max', 'Máximo de exemplares por usuário', c.maxExemplares, 'Empréstimos simultâneos.', 1, 20)}
          ${num('c-renov', 'Renovações permitidas', c.renovacoes, '0 desativa a renovação.', 0, 5)}
          ${num('c-drenov', 'Dias por renovação', c.diasRenov, 'Somados ao vencimento atual.', 1, 120)}
          <div class="field full"><label class="check"><input type="checkbox" id="c-bloq" ${c.bloqueiaAtraso ? 'checked' : ''}> Bloquear novo empréstimo para quem está com livro atrasado</label></div>
          <div class="field full"><label class="check"><input type="checkbox" id="c-mesma" ${c.impedeMesmaObra ? 'checked' : ''}> Impedir duas cópias da mesma obra com o mesmo usuário</label></div>
        </div></fieldset>
        <fieldset><legend>Alertas</legend><div class="fields">
          ${num('c-ant', 'Antecedência do lembrete (dias)', c.antecedencia, 'Também define "vence em breve".', 0, 15)}
          ${num('c-rep', 'Repetir aviso de atraso a cada (dias)', c.repeticaoAtraso, '1 = todo dia.', 1, 30)}
          <div class="field"><label for="c-hora">Horário da rotina</label><input id="c-hora" type="time" value="${c.horario}"></div>
          <div class="field"><label for="c-resp">E-mail do responsável</label><input id="c-resp" type="email" value="${esc(c.emailResp)}"></div>
          <div class="field full"><label class="check"><input type="checkbox" id="c-resumo" ${c.resumoResp ? 'checked' : ''}> Enviar resumo diário para o responsável</label></div>
        </div></fieldset>
        <fieldset><legend>Dados da associação</legend><p class="small muted" style="margin-top:-6px">Aparecem no cabeçalho do protocolo impresso, junto com a logo. Campos vazios não são impressos.</p><div class="fields">
          <div class="field full"><label for="a-nome">Nome da associação</label><input id="a-nome" value="${esc((c.assoc || {}).nome || '')}"></div>
          <div class="field"><label for="a-cnpj">CNPJ</label><input id="a-cnpj" class="mono" inputmode="numeric" value="${esc(fmtCNPJ((c.assoc || {}).cnpj || ''))}" placeholder="00.000.000/0000-00"><span class="msg" id="m-acnpj"></span></div>
          <div class="field"><label for="a-tel">Telefone / WhatsApp</label><input id="a-tel" inputmode="tel" value="${esc((c.assoc || {}).telefone || '')}" placeholder="(54) 9 0000-0000"></div>
          <div class="field full"><label for="a-end">Endereço</label><input id="a-end" value="${esc((c.assoc || {}).endereco || '')}" placeholder="Rua, número, bairro, cidade/UF, CEP"></div>
          <div class="field"><label for="a-email">E-mail</label><input id="a-email" type="email" value="${esc((c.assoc || {}).email || '')}"><span class="msg" id="m-aemail"></span></div>
          <div class="field"><label for="a-site">Site ou rede social</label><input id="a-site" value="${esc((c.assoc || {}).site || '')}" placeholder="Ex.: @luzesdearuanda"></div>
        </div></fieldset>
        <fieldset><legend>Termo de responsabilidade</legend><div class="fields">
          <div class="field"><label for="c-taxa">Taxa de reposição ou manutenção (R$)</label><input id="c-taxa" type="number" min="0" step="0.01" value="${c.valorTaxa}"><span class="hint">Aparece no termo no lugar de {valor}.</span></div>
          <div class="field full"><label for="c-termo">Texto do termo</label><textarea id="c-termo" style="min-height:110px">${esc(c.termo)}</textarea><span class="hint">Mostrado no empréstimo. Cada empréstimo guarda o texto e o valor vigentes na data, então mudanças aqui não alteram empréstimos já feitos.</span></div>
        </div></fieldset>
        <div class="form-actions"><button class="btn primary">Salvar configurações</button></div>
      </form>
      <section class="panel"><div class="panel-head"><h2>Gêneros e siglas</h2><button class="btn sm primary" data-act="genNew">${ic('plus')} Novo gênero</button></div>
        <p class="small muted">A sigla entra no código da etiqueta (LIV-0042-<b>ESP</b>). Depois de usada, não muda; o nome pode ser corrigido.</p>
        <div class="table-wrap cards"><table><thead><tr><th>Sigla</th><th>Gênero</th><th>Obras</th><th>Exemplares</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
        ${[...S.generos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(g => { const no = S.obras.filter(o => o.genero === g.sigla).length, ne = S.exemplares.filter(e => e.codigo.endsWith('-' + g.sigla)).length; return `<tr>
          <td data-label="Sigla"><span class="chip mono">${g.sigla}</span></td><td data-label="Gênero"><b>${esc(g.nome)}</b></td><td data-label="Obras" class="num">${no}</td><td data-label="Exemplares" class="num">${ne}</td>
          <td class="actions"><button class="btn sm" data-act="genRename" data-s="${g.sigla}">Renomear</button>${no || ne ? '' : `<button class="btn sm danger" data-act="genDel" data-s="${g.sigla}">Excluir</button>`}</td></tr>`; }).join('')}
        </tbody></table></div></section>`;
  }
};
VIEWS.operadores = {
  admin: true,
  render() {
    return `<div class="page-head"><div><h1>Operadores</h1><p class="sub">Contas Google que podem entrar no app. Quem não está nesta lista vê a tela de acesso negado.</p></div></div>
      <div class="table-wrap cards"><table><thead><tr><th>Conta Google</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
      ${S.operadores.map((o, i) => { const self = o.email === S.session.email; return `<tr><td class="lead"><div class="t">${esc(o.nome)}${self ? ' <span class="chip">você</span>' : ''}</div><div class="s">${esc(o.email)}</div></td>
        <td data-label="Perfil">${o.perfil === 'Admin' ? '<span class="role">Admin</span>' : 'Operador'}</td><td data-label="Situação">${pill(o.status, o.status === 'Ativo' ? 'ok' : 'mute')}</td>
        <td data-label="Último acesso" class="num">${fmtStamp(o.ultimoAcesso)}</td>
        <td class="actions"><button class="btn sm" data-act="assAbrir" data-email="${esc(o.email)}">${o.assinatura ? 'Assinatura ✓' : 'Assinatura'}</button>${self ? '' : `<button class="btn sm" data-act="opPerfil" data-i="${i}">${o.perfil === 'Admin' ? 'Tornar operador' : 'Tornar admin'}</button><button class="btn sm ${o.status === 'Ativo' ? 'danger' : ''}" data-act="opStatus" data-i="${i}">${o.status === 'Ativo' ? 'Inativar' : 'Reativar'}</button>`}</td></tr>`; }).join('')}
      </tbody></table></div>
      <form class="panel form" data-form="operador" novalidate><h2>Adicionar operador</h2><div class="fields">
        <div class="field"><label for="o-email">E-mail da conta Google <span class="req">*</span></label><input id="o-email" type="email" placeholder="nome@gmail.com"><span class="msg" id="m-oemail"></span></div>
        <div class="field"><label for="o-nome">Nome <span class="req">*</span></label><input id="o-nome"><span class="msg" id="m-onome"></span></div>
        <div class="field"><label for="o-perfil">Perfil</label><select id="o-perfil"><option>Operador</option><option>Admin</option></select><span class="hint">Admin gerencia operadores e configurações e vê o CPF completo.</span></div>
      </div><div class="form-actions"><button class="btn primary">${ic('plus')} Adicionar</button></div></form>`;
  }
};
VIEWS.atividades = {
  admin: true,
  render() {
    const q = norm(P.q || '');
    const list = S.atividades.filter(a => !q || norm(`${a.op} ${a.acao} ${a.det}`).includes(q)).slice(0, 60);
    return `<div class="page-head"><div><h1>Registro de atividades</h1><p class="sub">Quem fez o quê e quando: cadastros, empréstimos, devoluções, alterações e rotinas.</p></div></div>
      <div class="toolbar"><label class="search"><span class="sr">Buscar</span>${ic('search')}<input id="at-q" data-in="atQ" value="${esc(P.q || '')}" placeholder="Operador, ação ou detalhe"></label></div>
      <div class="table-wrap cards"><table><thead><tr><th>Data/hora</th><th>Operador</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>
      ${list.map(a => `<tr><td data-label="Data/hora" class="num">${fmtStamp(a.ts)}</td><td data-label="Operador" class="small">${esc(a.op)}</td><td data-label="Ação"><b>${esc(a.acao)}</b></td><td data-label="Detalhe">${esc(a.det)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nada encontrado.</td></tr>'}
      </tbody></table></div>`;
  }
};

/* ============ Modal, toast, impressão e arquivos ============ */
function openModal(html) { $('#modal-root').innerHTML = `<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; setTimeout(() => $('#modal-root .modal [autofocus], #modal-root .modal input, #modal-root .modal button')?.focus(), 30); }
function closeModal() { pararCamera(); const m = $('#modal-root'); if (m) m.innerHTML = ''; }
function toast(msg, kind = 'ok') { const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg; $('#toasts').appendChild(d); setTimeout(() => d.remove(), kind === 'bad' ? 7000 : 4000); }
function copyText(t) {
  try { navigator.clipboard.writeText(t).then(() => toast(`Copiado: ${t}`), () => toast(`Não deu para copiar automaticamente. Selecione: ${t}`, 'bad')); }
  catch (e) { toast(`Não deu para copiar automaticamente. Selecione: ${t}`, 'bad'); }
}
// Imprime só o conteúdo informado (o navegador também oferece "Salvar como PDF")
function printHTML(html, cls, after) {
  const r = $('#print-root'); r.className = cls || ''; r.innerHTML = html;
  document.body.classList.add('printing');
  let done = false;
  const fim = () => { if (done) return; done = true; document.body.classList.remove('printing'); r.innerHTML = ''; window.removeEventListener('afterprint', fim); if (after) setTimeout(after, 100); };
  window.addEventListener('afterprint', fim);
  const imgs = [...r.querySelectorAll('img')];
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(res => { i.onload = i.onerror = res; }))).then(() => setTimeout(() => { window.print(); setTimeout(fim, 1000); }, 60));
}
function readAsBase64(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(new Error('Não foi possível ler o arquivo.')); fr.readAsDataURL(blob); }); }
// Reduz fotos grandes para facilitar o envio, mantendo o texto legível
function prepararImagem(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2200 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => {
        if (!b) { rej(new Error('Não foi possível processar a imagem.')); return; }
        const t = document.createElement('canvas'), kt = Math.min(1, 300 / Math.max(c.width, c.height)); t.width = Math.round(c.width * kt); t.height = Math.round(c.height * kt); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
        const usarOriginal = file.size <= b.size && /^image\/(jpeg|png)$/.test(file.type);
        res({ blob: usarOriginal ? file : b, tipo: usarOriginal ? file.type : 'image/jpeg', thumb: t.toDataURL('image/jpeg', 0.7), comprimida: !usarOriginal });
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não foi possível abrir a imagem. Tente outro arquivo ou envie em PDF.')); };
    img.src = url;
  });
}
function termoBox(l, compact) {
  const est = l.estadoRetirada ? `<div><dt>Estado na retirada</dt><dd>${esc(l.estadoRetirada)}</dd></div>` : '<div><dt>Estado na retirada</dt><dd class="muted">Não informado</dd></div>';
  const pr = protRet(l);
  if (l.pendente) return `<dl class="facts">${est}</dl><div class="note warn"><b>Aguardando o protocolo assinado</b><span>Gerado em ${pr ? fmtStamp(pr.geradoEm) : '—'}. <button class="btn sm" data-act="go" data-v="protocolo" data-id="${pr ? pr.id : ''}">Abrir protocolo</button></span></div>`;
  const op = pr && S.operadores.find(o => o.email === pr.anexadoPor);
  return `<dl class="facts">${est}<div><dt>Protocolo assinado</dt><dd>${pr && pr.anexadoEm ? `anexado em ${fmtStamp(pr.anexadoEm)} · ${esc(op ? op.nome : pr.anexadoPor)}` : '—'}</dd></div><div><dt>Taxa prevista</dt><dd>${fmtBRL((l.termo && l.termo.valor) || 0)}</dd></div></dl>
    ${pr && pr.arquivoId ? `<div class="toolbar"><button class="btn sm" data-act="protView" data-id="${pr.id}">${ic('copy')} Ver protocolo assinado</button><button class="btn sm ghost" data-act="go" data-v="protocolo" data-id="${pr.id}">Ver documento gerado</button></div>` : ''}
    ${compact ? '' : `<div class="termo"><b>Termo assinado</b><p>${esc((l.termo && l.termo.texto) || '')}</p></div>`}`;
}
function loanSummaryFacts(l) {
  const u = user(l.userId), ex = exem(l.exId), o = obra(ex.obraId), st = loanSt(l);
  return `<dl class="facts"><div><dt>Usuário</dt><dd>${esc(u.nome)}</dd></div><div><dt>Livro</dt><dd>${esc(o.titulo)}</dd></div><div><dt>Código</dt><dd class="mono">${ex.codigo}</dd></div>
    <div><dt>Retirada</dt><dd>${fmtD(l.dataEmp)}</dd></div><div><dt>Vencimento</dt><dd>${fmtD(l.dataPrev)}</dd></div><div><dt>Situação</dt><dd>${pill(st.label, st.cls)} <span class="small muted">${st.note}</span></dd></div></dl>`;
}

/* ============ Leitor de código de barras (ISBN) ============ */
// Usa o leitor nativo do navegador (Chrome no Android). Onde não existe (iPhone, computador), carrega um leitor alternativo.
const BD_URL = 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/es/ponyfill.js';
const SCAN = { stream: null, timer: 0, det: null, onRead: null, torch: false, aviso: 0 };
function podeEscanear() { return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
function isbn13Valido(c) {
  if (!/^97[89]\d{10}$/.test(c)) return false;
  let s = 0; for (let i = 0; i < 12; i++) s += +c[i] * (i % 2 ? 3 : 1);
  return (10 - s % 10) % 10 === +c[12];
}
// Normaliza ISBN-10 ou ISBN-13 para ISBN-13 (só para comparar)
function isbnComoIsbn13(v) {
  const t = String(v || '').toUpperCase().replace(/[^0-9X]/g, '');
  if (t.length === 13) return t;
  if (t.length !== 10) return '';
  const b = '978' + t.slice(0, 9); let s = 0; for (let i = 0; i < 12; i++) s += +b[i] * (i % 2 ? 3 : 1);
  return b + ((10 - s % 10) % 10);
}
function obraPorIsbn(isbn) { const k = isbnComoIsbn13(isbn); return k ? S.obras.find(o => o.isbn && isbnComoIsbn13(o.isbn) === k) : null; }
async function detectorISBN() {
  if (SCAN.det) return SCAN.det;
  if ('BarcodeDetector' in window) {
    try { const f = await window.BarcodeDetector.getSupportedFormats(); if (f.includes('ean_13')) return (SCAN.det = new window.BarcodeDetector({ formats: ['ean_13'] })); } catch (e) { }
  }
  const m = await import(BD_URL);
  return (SCAN.det = new m.BarcodeDetector({ formats: ['ean_13'] }));
}
function scanStatus(txt, erro) { const st = $('#scan-st'); if (st) { st.textContent = txt; st.classList.toggle('err', !!erro); } }
function abrirLeitor(onRead) {
  if (!podeEscanear()) { toast('Este navegador não permite usar a câmera. Digite o ISBN.', 'bad'); return; }
  pararCamera(); SCAN.onRead = onRead; SCAN.aviso = 0;
  openModal(`<h2>Ler código de barras</h2>
    <p class="small muted">Aponte a câmera para o código de barras do ISBN, normalmente na contracapa. Ele começa com 978 ou 979.</p>
    <div class="scan-box"><video id="scan-video" playsinline muted autoplay></video><div class="scan-frame"><span class="scan-line"></span></div><div class="scan-status" id="scan-st" role="status">Abrindo a câmera…</div></div>
    <div class="scan-tools"><button type="button" class="btn sm" data-act="scanTorch" id="scan-torch" aria-pressed="false" hidden>${ic('flash')} Lanterna</button></div>
    <form class="inline" data-form="scanManual" novalidate><label class="sr" for="scan-man">Digitar o ISBN</label><input id="scan-man" inputmode="numeric" placeholder="Ou digite o ISBN" autocomplete="off"><button class="btn">Usar</button></form>
    <div class="modal-actions"><button type="button" class="btn" data-act="close">Cancelar</button></div>`);
  setTimeout(() => { if (document.activeElement && document.activeElement.id === 'scan-man') document.activeElement.blur(); }, 60);
  iniciarCamera();
}
async function iniciarCamera() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
  } catch (e) {
    const n = e && e.name;
    scanStatus(n === 'NotAllowedError' ? 'A câmera está bloqueada para este site. No Chrome, toque no ícone ao lado do endereço → Permissões → Câmera → Permitir. Depois tente de novo.'
      : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'Nenhuma câmera encontrada neste aparelho. Digite o ISBN abaixo.'
        : n === 'NotReadableError' ? 'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.'
          : 'Não foi possível abrir a câmera. Digite o ISBN abaixo.', true);
    return;
  }
  const v = $('#scan-video');
  if (!v) { stream.getTracks().forEach(t => t.stop()); return; } // a janela foi fechada enquanto a câmera abria
  SCAN.stream = stream; v.srcObject = stream;
  try { await v.play(); } catch (e) { }
  const track = stream.getVideoTracks()[0], cap = track && track.getCapabilities ? track.getCapabilities() : {};
  if (cap.focusMode && cap.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => { });
  if (cap.torch && $('#scan-torch')) $('#scan-torch').hidden = false;
  let det;
  try { if (!SCAN.det) scanStatus('Carregando o leitor…'); det = await detectorISBN(); }
  catch (e) { scanStatus('Não foi possível carregar o leitor de código de barras. Confira a internet ou digite o ISBN abaixo.', true); return; }
  if (SCAN.stream !== stream) return;
  scanStatus('Procurando o código…');
  lerQuadro(det, stream);
}
function lerQuadro(det, stream) {
  const v = $('#scan-video');
  if (SCAN.stream !== stream || !v) return;
  const prox = () => { if (SCAN.stream === stream) SCAN.timer = setTimeout(() => lerQuadro(det, stream), 120); };
  if (v.readyState < 2 || !v.videoWidth) { prox(); return; }
  det.detect(v).then(cods => {
    if (SCAN.stream !== stream) return;
    for (const c of cods) {
      const val = digits(c.rawValue);
      if (isbn13Valido(val)) { leituraOk(val); return; }
      if (val.length >= 8 && Date.now() - SCAN.aviso > 2500) { SCAN.aviso = Date.now(); scanStatus(`O código ${val} não é um ISBN. Procure o código que começa com 978 ou 979.`); }
    }
    prox();
  }, prox);
}
function bip() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ctx = new A(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 1200; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09); o.onended = () => ctx.close();
  } catch (e) { }
}
function leituraOk(isbn) {
  const cb = SCAN.onRead;
  try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { }
  bip(); closeModal();
  if (cb) cb(isbn);
}
function pararCamera() {
  clearTimeout(SCAN.timer); SCAN.timer = 0;
  if (SCAN.stream) SCAN.stream.getTracks().forEach(t => t.stop());
  SCAN.stream = null; SCAN.torch = false;
}
// Livro já cadastrado: oferece abrir a obra para adicionar exemplar
function avisoIsbnCadastrado(o) {
  const s = exSummary(o.id);
  openModal(`<h2>Este ISBN já está cadastrado</h2>
    <div class="result"><span class="big">${esc(o.titulo)}</span><span class="small">${esc(o.autor)} · ${esc(o.editora)} · ${o.ano || 's/ano'} · ISBN ${esc(o.isbn)}</span><span class="small muted">${plural(s.total, 'exemplar', 'exemplares')} · ${s.txt}</span></div>
    <p>Se for mais uma cópia deste livro, abra a obra e use <b>Adicionar exemplar</b>.</p>
    <div class="modal-actions"><button class="btn" data-act="close">Fechar</button><button class="btn primary" data-act="scanAbrirObra" data-id="${o.id}">Abrir a obra</button></div>`);
}

/* ============ Ações ============ */
const ACT = {
  go(t) { const { v, act, ...rest } = t.dataset; go(v, rest); },
  menu() { UI.menu = true; render(); },
  menuClose() { UI.menu = false; render(); },
  overlay(t, e) { if (e.target === t) closeModal(); },
  close() { closeModal(); },
  refresh() { boot(true).then(ok => { if (ok) toast('Dados atualizados'); }); },
  copy(t, e) { e.stopPropagation(); copyText(t.dataset.txt); },
  retryBoot() { boot(); },
  loginReset() { setToken(''); S = null; UI.login = 'start'; UI.loginMsg = ''; render(); },
  logout() { setToken(''); S = null; UI.login = 'start'; UI.loginMsg = ''; UI.menu = false; closeModal(); try { google.accounts.id.disableAutoSelect(); } catch (e) { } render(); },

  /* Catálogo */
  addEx(t) {
    const o = obra(t.dataset.id), last = S.exemplares.filter(e => e.obraId === o.id).pop();
    openModal(`<h2>Adicionar exemplar</h2><p class="muted">${esc(o.titulo)}: cada novo exemplar recebe o próximo número do acervo com a sigla ${esc(o.genero)}. Os dados da obra são reaproveitados.</p>
      <div class="fields"><div class="field"><label for="m-qtd">Quantidade</label><input id="m-qtd" type="number" min="1" max="50" value="1"></div>
      <div class="field"><label for="m-local">Localização</label><input id="m-local" value="${esc(last ? last.local : '')}"></div></div>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="addExConfirm" data-id="${o.id}">Adicionar e gerar códigos</button></div>`);
  },
  addExConfirm(t) {
    const q = Math.min(50, Math.max(1, parseInt($('#m-qtd').value) || 1)), loc = $('#m-local').value.trim();
    run(async () => { const r = await api('exemplar.adicionar', { obraId: t.dataset.id, qtd: q, local: loc }); closeModal(); go('obraSalva', { id: r.obraId, ids: r.exIds.join(','), added: '1' }); });
  },
  exStatus(t) {
    const ex = exem(t.dataset.id), to = t.dataset.to, o = obra(ex.obraId);
    const txt = to === 'Baixado' ? 'Dar baixa retira o exemplar do acervo (perda, dano sem reparo, doação). O histórico é mantido.' : to === 'Em manutenção' ? 'O exemplar fica indisponível para empréstimo até ser disponibilizado de novo.' : 'O exemplar volta a ficar disponível para empréstimo.';
    openModal(`<h2>${to === 'Baixado' ? 'Dar baixa no exemplar' : to === 'Em manutenção' ? 'Enviar para manutenção' : 'Disponibilizar exemplar'}</h2>
      <p>${esc(o.titulo)} · <span class="mono">${ex.codigo}</span></p><p class="muted small">${txt}</p>
      ${to !== 'Disponível' ? `<div class="field"><label for="m-exobs">Motivo</label><input id="m-exobs" placeholder="${to === 'Baixado' ? 'Ex.: extraviado' : 'Ex.: capa solta'}"></div>` : ''}
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn ${to === 'Baixado' ? 'danger' : 'primary'}" data-act="exStatusConfirm" data-id="${ex.id}" data-to="${to}">Confirmar</button></div>`);
  },
  exStatusConfirm(t) {
    const to = t.dataset.to;
    run(async () => { await api('exemplar.status', { exId: t.dataset.id, to, obs: $('#m-exobs') ? $('#m-exobs').value.trim() : '' }); closeModal(); render(); toast(`Exemplar ${to.toLowerCase()}`); });
  },
  async gbIsbn() {
    const isbn = $('#f-isbn').value.toUpperCase().replace(/[^0-9X]/g, ''); const m = $('#m-isbn');
    if (!/^\d{13}$/.test(isbn) && !/^\d{9}[\dX]$/.test(isbn)) { m.textContent = 'ISBN deve ter 10 ou 13 dígitos.'; return; }
    m.textContent = ''; $('#gb-note').innerHTML = '<p class="small muted">Buscando os dados do livro…</p>';
    const { res, falhas, total } = await buscarIsbn(isbn);
    if (!$('#gb-note')) return;
    if (res) fillFromGB(res);
    else if (falhas === total) $('#gb-note').innerHTML = '<div class="note warn"><b>Não foi possível consultar as bases de livros agora</b><span>Confira a internet e tente de novo, ou preencha os dados manualmente.</span></div>';
    else $('#gb-note').innerHTML = '<div class="note warn"><b>Nenhuma base de livros encontrou este ISBN</b><span>Confira os números ou preencha os dados manualmente.</span></div>';
  },
  async gbSearch() {
    const q = $('#f-gbq').value.trim(); const box = $('#gb-res');
    if (q.length < 3) { box.innerHTML = '<span class="small muted">Digite ao menos 3 letras.</span>'; return; }
    box.innerHTML = '<span class="small muted">Buscando…</span>';
    let lista = null;
    try { lista = await gbFetch(q); } catch (e) { }
    if (!lista || !lista.length) { try { const ol = await openLibBusca(q); if (ol.length || !lista) lista = ol; } catch (e) { } }
    if (!lista) { box.innerHTML = '<span class="small muted">Não foi possível consultar as bases de livros agora.</span>'; return; }
    UI.gb = lista;
    box.innerHTML = UI.gb.length ? UI.gb.map((b, i) => `<button type="button" class="account" data-act="gbPick" data-i="${i}"><span class="who"><b>${esc(b.titulo)}</b><span>${esc(b.autor || 'Autor não informado')}${b.editora ? ' · ' + esc(b.editora) : ''}${b.ano ? ' · ' + esc(b.ano) : b.anoOriginal ? ' · 1ª publicação ' + esc(b.anoOriginal) : ''}${b.isbn ? ` · ISBN ${esc(b.isbn)}` : ''}</span></span></button>`).join('') : '<span class="small muted">Nenhum resultado. Preencha os dados manualmente.</span>';
  },
  gbPick(t) { fillFromGB(UI.gb[+t.dataset.i]); $('#gb-res').innerHTML = ''; },
  scanCat() {
    abrirLeitor(isbn => {
      const o = obraPorIsbn(isbn);
      if (o) { go('obra', { id: o.id }); toast(`ISBN ${isbn} já cadastrado: ${o.titulo}`); }
      else { go('obraForm', { isbn }); toast(`ISBN ${isbn} lido. Ele ainda não está no catálogo.`); }
    });
  },
  scanIsbnForm() {
    const editId = P.id || '';
    abrirLeitor(isbn => {
      const i = $('#f-isbn'); if (!i) return;
      i.value = isbn; fieldErr('isbn', '');
      const o = obraPorIsbn(isbn);
      if (o && o.id !== editId) { avisoIsbnCadastrado(o); return; }
      ACT.gbIsbn();
    });
  },
  scanAbrirObra(t) { closeModal(); go('obra', { id: t.dataset.id }); },
  scanTorch(t) {
    const tr = SCAN.stream && SCAN.stream.getVideoTracks()[0]; if (!tr) return;
    const on = !SCAN.torch;
    tr.applyConstraints({ advanced: [{ torch: on }] }).then(() => { SCAN.torch = on; t.setAttribute('aria-pressed', String(on)); t.classList.toggle('primary', on); }, () => toast('Não foi possível ligar a lanterna.', 'bad'));
  },
  dupAdd(t) {
    const p = UI.pendingObra;
    run(async () => { const r = await api('exemplar.adicionar', { obraId: t.dataset.id, qtd: p.qtd, local: p.local }); closeModal(); go('obraSalva', { id: r.obraId, ids: r.exIds.join(','), added: '1' }); });
  },
  dupNew() { closeModal(); salvarObra({ ...UI.pendingObra, forcarNova: true }); },
  exFix(t) {
    const ex = exem(t.dataset.id), sig = ex.codigo.slice(-3);
    openModal(`<h2>Corrigir sigla do código</h2><p>${esc(obra(ex.obraId).titulo)} · <span class="mono">${ex.codigo}</span></p>
      <p class="muted small">Use só quando a etiqueta saiu com o gênero errado. O número ${fmtNum(ex.num)} e o histórico de empréstimos são mantidos. A etiqueta volta para "pendente" para ser reimpressa.</p>
      <div class="field"><label for="m-fixgen">Nova sigla</label><select id="m-fixgen">${[...S.generos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(g => `<option value="${g.sigla}" ${g.sigla === sig ? 'selected' : ''}>${esc(g.nome)} (${g.sigla})</option>`).join('')}</select></div>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="exFixConfirm" data-id="${ex.id}">Corrigir código</button></div>`);
  },
  exFixConfirm(t) {
    run(async () => { await api('exemplar.corrigirSigla', { exId: t.dataset.id, sigla: $('#m-fixgen').value }); closeModal(); render(); toast(`Código corrigido para ${exem(t.dataset.id).codigo}. Reimprima a etiqueta.`); });
  },
  genNew() {
    openModal(`<h2>Novo gênero</h2><p class="muted small">A sigla tem 3 letras e entra no código da etiqueta. Depois de usada, ela não muda.</p>
      <div class="fields"><div class="field"><label for="m-gnome">Nome</label><input id="m-gnome" placeholder="Ex.: Mitologia"></div>
      <div class="field"><label for="m-gsig">Sigla (3 letras)</label><input id="m-gsig" class="mono" maxlength="3" placeholder="MIT" style="text-transform:uppercase"></div></div>
      <span class="msg" id="m-gerr" style="color:var(--bad);font-weight:600"></span>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="genSave">Criar gênero</button></div>`);
  },
  genSave() {
    const nome = $('#m-gnome').value.trim(), sig = norm($('#m-gsig').value).replace(/[^a-z]/g, '').toUpperCase();
    const err = !nome ? 'Informe o nome.' : sig.length !== 3 ? 'A sigla precisa ter exatamente 3 letras.' : genero(sig) ? `A sigla ${sig} já é de "${generoNome(sig)}".` : S.generos.some(g => norm(g.nome) === norm(nome)) ? 'Já existe um gênero com esse nome.' : '';
    if (err) { $('#m-gerr').textContent = err; return; }
    run(async () => {
      await api('genero.salvar', { novo: true, sigla: sig, nome }); closeModal();
      const sel = $('#f-genero');
      if (sel && VIEWS[VIEW] === VIEWS.obraForm) { const op = document.createElement('option'); op.value = sig; op.textContent = `${nome} (${sig})`; sel.appendChild(op); sel.value = sig; CHG.obraGen(sel); }
      else render();
      toast(`Gênero ${nome} (${sig}) criado`);
    });
  },
  genRename(t) {
    const g = genero(t.dataset.s);
    openModal(`<h2>Renomear gênero</h2><p class="muted small">A sigla <b class="mono">${g.sigla}</b> continua a mesma, porque já pode estar impressa em etiquetas.</p>
      <div class="field"><label for="m-gren">Nome</label><input id="m-gren" value="${esc(g.nome)}"></div>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="genRenameOk" data-s="${g.sigla}">Salvar</button></div>`);
  },
  genRenameOk(t) { const n = $('#m-gren').value.trim(); if (!n) return; run(async () => { await api('genero.salvar', { sigla: t.dataset.s, nome: n }); closeModal(); render(); }); },
  genDel(t) { run(async () => { const r = await api('genero.excluir', { sigla: t.dataset.s }); S.generos = S.generos.filter(g => g.sigla !== r.removido); render(); toast('Gênero excluído'); }); },

  /* Usuários */
  usSt(t) { P.st = t.dataset.st; render(); },
  loanPick(t) { const d = UI.draft; d.userId = t.dataset.id; d.choices = null; d.userMsg = ''; render(); },
  usSincronizar() {
    run(async () => { const r = await api('usuarios.sincronizar', {}, { msg: 'Buscando o cadastro da Secretaria…' }); await boot(true); toast(`Secretaria: ${plural(r.novos, 'novo cadastro', 'novos cadastros')}, ${plural(r.atualizados, 'atualizado', 'atualizados')}`); });
  },
  usStatus(t) {
    const u = user(t.dataset.id), to = t.dataset.to;
    openModal(`<h2>${to === 'Bloqueado' ? 'Bloquear usuário' : to === 'Inativo' ? 'Inativar usuário' : 'Reativar usuário'}</h2><p><b>${esc(u.nome)}</b></p>
      <p class="muted small">${to === 'Ativo' ? 'A pessoa volta a poder retirar livros.' : 'A pessoa deixa de poder retirar livros. O cadastro e o histórico são mantidos.'}</p>
      ${to !== 'Ativo' ? `<div class="field"><label for="m-usobs">Motivo</label><input id="m-usobs"></div>` : ''}
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn ${to === 'Bloqueado' ? 'danger' : 'primary'}" data-act="usStatusConfirm" data-id="${u.id}" data-to="${to}">Confirmar</button></div>`);
  },
  usStatusConfirm(t) {
    const to = t.dataset.to;
    run(async () => { await api('usuario.status', { id: t.dataset.id, to, obs: $('#m-usobs') ? $('#m-usobs').value.trim() : '' }); closeModal(); render(); toast(`Usuário ${to.toLowerCase()}`); });
  },

  /* Empréstimo */
  fillHash(t) { UI.draft.cod = t.dataset.h; findLoanEx(); render(); },
  confirmLoan() {
    const d = UI.draft; const s = loanState();
    if (!s.ok) { d.err = 'Os dados mudaram. Confira usuário e exemplar.'; render(); return; }
    run(async () => {
      try { const r = await api('emprestimo.criar', { userId: d.userId, exId: d.exId, dataEmp: d.dataEmp, dataPrev: d.dataPrev, estado: (d.estado || '').trim() }, { msg: 'Gerando protocolo…' }); go('protocolo', { id: r.protocoloId }); envioAuto(r.protocoloId); }
      catch (e) { if (e.code === 'VALIDATION') { d.err = e.message; render(); } else throw e; }
    });
  },

  /* Protocolos */
  protPrint() { const pr = protocolo(UI.prot.id); printHTML(protocoloDoc(pr), 'doc-print', () => { UI.prot.printed = true; render(); }); },
  protClear() { UI.prot.file = null; const i = $('#prot-file'); if (i) i.value = ''; protRefresh(); },
  protAttach(t) {
    const pr = protocolo(t.dataset.id); if (!pr || pr.status !== 'pendente') return;
    if (!UI.prot.file || !UI.prot.ok) { toast('Anexe o protocolo assinado e confirme a conferência.', 'bad'); return; }
    const f = UI.prot.file;
    run(async () => {
      const base64 = await readAsBase64(f.blob);
      const r = await api('protocolo.anexar', { protocoloId: pr.id, arquivo: { nome: f.nome, tipo: f.tipo, base64 } }, { msg: 'Enviando protocolo assinado…' });
      UI.prot = null;
      if (pr.tipo === 'retirada') go('emprestimoOk', { id: r.loanId });
      else { const l = S.emprestimos.find(x => x.id === r.loanId); toast(`Renovado até ${fmtD(l.dataPrev)}`); go('emprestados', { f: 'ativos' }); }
    });
  },
  protCancel(t) {
    const pr = protocolo(t.dataset.id), ren = pr.tipo === 'renovacao';
    openModal(`<h2>${ren ? 'Cancelar renovação?' : 'Cancelar empréstimo?'}</h2><p class="muted">O protocolo ${pr.id} é descartado${ren ? ' e o vencimento continua o mesmo.' : ' e o exemplar volta a ficar disponível. Use quando a pessoa desistir ou não assinar.'}</p>
      <div class="modal-actions"><button class="btn" data-act="close">Voltar</button><button class="btn danger" data-act="protCancelOk" data-id="${pr.id}">${ren ? 'Cancelar renovação' : 'Cancelar empréstimo'}</button></div>`);
  },
  protCancelOk(t) {
    run(async () => { const r = await api('protocolo.cancelar', { protocoloId: t.dataset.id }); UI.prot = null; closeModal(); go('emprestados', { f: 'ativos' }); toast(r.cancelado ? 'Empréstimo cancelado. Exemplar disponível.' : 'Renovação cancelada.'); });
  },
  protView(t) {
    run(async () => {
      const a = await api('protocolo.arquivo', { protocoloId: t.dataset.id }, { msg: 'Abrindo documento…' });
      const bin = atob(a.base64), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: a.tipo }));
      openModal(`<h2>Protocolo assinado</h2><p class="small muted">${esc(a.nome)}</p>
        ${/^image\//.test(a.tipo) ? `<img src="${url}" alt="Protocolo assinado" style="width:100%;border:1px solid var(--line);border-radius:8px">` : `<div class="note"><span>Documento em PDF.</span></div>`}
        <div class="modal-actions"><a class="btn" href="${url}" target="_blank" rel="noopener">Abrir em nova aba</a><button class="btn primary" data-act="close">Fechar</button></div>`);
    });
  },

  /* Consulta e devolução */
  empF(t) { P.f = t.dataset.f; P.p = 1; render(); },
  page(t) { P.p = +t.dataset.p; $('#emp-res').innerHTML = empResults(); },
  devolver(t) {
    const l = S.emprestimos.find(x => x.id === t.dataset.id);
    const valor = (l.termo && l.termo.valor) || S.config.valorTaxa;
    openModal(`<h2>Registrar devolução</h2>${loanSummaryFacts(l)}${termoBox(l, true)}
      <div class="field"><label for="m-dev">Data da devolução</label><input id="m-dev" type="date" value="${TODAY()}" min="${l.dataEmp}" max="${TODAY()}"></div>
      <fieldset><legend style="font-size:.95rem">Estado do livro</legend>
        <label class="check"><input type="radio" name="m-cond" value="ok" data-ch="devCond" checked> Em bom estado</label>
        <label class="check"><input type="radio" name="m-cond" value="manutencao" data-ch="devCond"> Precisa de manutenção (sem cobrança)</label>
        <label class="check"><input type="radio" name="m-cond" value="avaria" data-ch="devCond"> Avariado: gera cobrança conforme o termo</label></fieldset>
      <div id="m-avaria" hidden class="termo">
        <div class="field"><label for="m-avdesc">Descreva a avaria <span class="req">*</span></label><input id="m-avdesc" placeholder="Ex.: páginas molhadas, capa rasgada"></div>
        <label class="check"><input type="radio" name="m-rep" value="taxa" checked> Taxa de ${fmtBRL(valor)}</label>
        <label class="check"><input type="radio" name="m-rep" value="livro"> Repor com um livro novo</label>
        <label class="check"><input type="checkbox" id="m-semrep"> Sem conserto: dar baixa no exemplar</label>
        <span class="small muted">A pessoa fica sem novos empréstimos até a ocorrência ser quitada.</span></div>
      <div class="field"><label for="m-devobs">Observações</label><input id="m-devobs" placeholder="Opcional"></div>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="devConfirm" data-id="${l.id}">${ic('check')} Confirmar devolução</button></div>`);
  },
  devConfirm(t) {
    const cond = (document.querySelector('input[name="m-cond"]:checked') || {}).value || 'ok';
    const p = { loanId: t.dataset.id, dataDev: $('#m-dev').value, condicao: cond, obs: $('#m-devobs').value.trim() };
    if (cond === 'avaria') { p.descricao = $('#m-avdesc').value.trim(); p.reposicao = (document.querySelector('input[name="m-rep"]:checked') || {}).value; p.semReparo = $('#m-semrep').checked; if (!p.descricao) { toast('Descreva a avaria.', 'bad'); $('#m-avdesc').focus(); return; } }
    run(async () => { await api('emprestimo.devolver', p); closeModal(); render(); toast(cond === 'avaria' ? 'Devolução registrada com ocorrência de avaria.' : cond === 'manutencao' ? 'Devolução registrada. Exemplar enviado para manutenção.' : 'Devolução registrada. Exemplar disponível.'); });
  },
  renovar(t) {
    const l = S.emprestimos.find(x => x.id === t.dataset.id), r = renewBlocks(l);
    const nova = addDays(l.dataPrev, S.config.diasRenov);
    openModal(`<h2>Renovar empréstimo</h2>${loanSummaryFacts(l)}
      ${r.length ? `<div class="note bad"><b>Não é possível renovar</b><ul>${r.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="modal-actions"><button class="btn" data-act="close">Fechar</button></div>`
        : `<div class="note info"><b>Novo vencimento: ${fmtD(nova)}</b><span>Mais ${S.config.diasRenov} dias. Renovações usadas: ${l.renovacoes} de ${S.config.renovacoes}.</span></div>
           <p class="small muted">Será gerado um protocolo de renovação para a pessoa assinar. A nova data só vale depois que o documento assinado for anexado.</p>
           <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="renConfirm" data-id="${l.id}">Gerar protocolo de renovação</button></div>`}`);
  },
  renConfirm(t) { run(async () => { const r = await api('emprestimo.renovar', { loanId: t.dataset.id }, { msg: 'Gerando protocolo…' }); closeModal(); go('protocolo', { id: r.protocoloId }); envioAuto(r.protocoloId); }); },
  detalhe(t) {
    const l = S.emprestimos.find(x => x.id === t.dataset.id);
    const al = S.alertLog.filter(a => a.loanId === l.id).sort((a, b) => b.ts.localeCompare(a.ts));
    const op = S.operadores.find(o => o.email === l.operador);
    const prs = protsOf(l), ocs = S.ocorrencias.filter(o => o.loanId === l.id);
    openModal(`<h2>Detalhes do empréstimo</h2>${loanSummaryFacts(l)}
      <dl class="facts"><div><dt>Registro</dt><dd class="mono small">${l.id}</dd></div><div><dt>Operador</dt><dd>${esc(op ? op.nome : l.operador)}</dd></div><div><dt>Renovações</dt><dd>${l.renovacoes} de ${S.config.renovacoes}</dd></div>${l.obs ? `<div><dt>Observações</dt><dd>${esc(l.obs)}</dd></div>` : ''}</dl>
      <h3>Retirada e termo</h3>${termoBox(l)}
      <h3>Protocolos (${prs.length})</h3>${prs.length ? `<ul class="small" style="margin:0;padding-left:18px">${prs.map(p => `<li>${p.tipo === 'renovacao' ? `Renovação até ${fmtD(p.novaDataPrev)}` : 'Retirada'} · ${p.status === 'anexado' ? `assinado em ${fmtStamp(p.anexadoEm)}` : 'aguardando assinatura'} · <button class="btn sm ghost" data-act="go" data-v="protocolo" data-id="${p.id}">Abrir</button></li>`).join('')}</ul>` : '<p class="small muted">Nenhum.</p>'}
      ${ocs.length ? `<h3>Ocorrências</h3>${ocs.map(o => `<p class="small">${pill(o.tipo === 'extravio' ? 'Extravio' : 'Avaria', 'warn')} ${esc(o.descricao)} · ${pill(OC_LBL[o.status], OC_CLS[o.status])}</p>`).join('')}` : ''}
      <h3>Alertas enviados (${al.length})</h3>${al.length ? `<ul class="small" style="margin:0;padding-left:18px">${al.map(a => `<li>${fmtStamp(a.ts)} · ${esc(a.tipo)} · ${esc(a.resultado)}</li>`).join('')}</ul>` : '<p class="small muted">Nenhum alerta enviado.</p>'}
      <div class="modal-actions">${!l.dataDev && !l.pendente ? `<button class="btn danger" data-act="extravio" data-id="${l.id}">Registrar extravio</button>` : ''}<button class="btn" data-act="close">Fechar</button></div>`);
  },
  extravio(t) {
    const l = S.emprestimos.find(x => x.id === t.dataset.id), valor = (l.termo && l.termo.valor) || S.config.valorTaxa;
    openModal(`<h2>Registrar extravio</h2>${loanSummaryFacts(l)}
      <p class="small muted">O empréstimo é encerrado, o exemplar recebe baixa e é aberta uma ocorrência conforme o termo assinado. A pessoa fica sem novos empréstimos até quitar.</p>
      <div class="field"><label for="m-exdesc">O que aconteceu? <span class="req">*</span></label><input id="m-exdesc" placeholder="Ex.: perdeu o livro na mudança"></div>
      <label class="check"><input type="radio" name="m-exrep" value="taxa" checked> Taxa de ${fmtBRL(valor)}</label>
      <label class="check"><input type="radio" name="m-exrep" value="livro"> Repor com um livro novo</label>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn danger" data-act="extravioOk" data-id="${l.id}">Registrar extravio</button></div>`);
  },
  extravioOk(t) {
    const desc = $('#m-exdesc').value.trim(); if (!desc) { toast('Descreva o que aconteceu.', 'bad'); return; }
    run(async () => { await api('emprestimo.extravio', { loanId: t.dataset.id, descricao: desc, reposicao: (document.querySelector('input[name="m-exrep"]:checked') || {}).value }); closeModal(); render(); toast('Extravio registrado. Ocorrência aberta.'); });
  },

  /* Ocorrências */
  ocF(t) { P.f = t.dataset.f; render(); },
  ocQuitar(t) {
    const o = S.ocorrencias.find(x => x.id === t.dataset.id), u = user(o.userId);
    openModal(`<h2>Registrar quitação</h2><p><b>${esc(u.nome)}</b> · ${o.tipo === 'extravio' ? 'Extravio' : 'Avaria'} · ${o.reposicao === 'livro' ? 'repor com livro novo' : fmtBRL(o.valor)}</p>
      <div class="field"><label for="m-qobs">Como foi quitada? <span class="req">*</span></label><input id="m-qobs" placeholder="Ex.: pagou ${fmtBRL(o.valor)} em dinheiro; entregou livro novo"></div>
      ${o.reposicao === 'livro' || o.tipo === 'extravio' ? '<p class="small muted">Se entregou um livro novo, cadastre-o no catálogo (Adicionar exemplar) para gerar a etiqueta.</p>' : ''}
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="ocQuitarOk" data-id="${o.id}">Registrar quitação</button></div>`);
  },
  ocQuitarOk(t) { const obs = $('#m-qobs').value.trim(); if (!obs) { toast('Informe como foi quitada.', 'bad'); return; } run(async () => { await api('ocorrencia.quitar', { id: t.dataset.id, obs }); closeModal(); render(); toast('Ocorrência quitada'); }); },
  ocCancelar(t) {
    openModal(`<h2>Cancelar ocorrência</h2><p class="small muted">Use quando a ocorrência foi registrada por engano.</p>
      <div class="field"><label for="m-cobs">Motivo <span class="req">*</span></label><input id="m-cobs"></div>
      <div class="modal-actions"><button class="btn" data-act="close">Voltar</button><button class="btn danger" data-act="ocCancelarOk" data-id="${t.dataset.id}">Cancelar ocorrência</button></div>`);
  },
  ocCancelarOk(t) { const obs = $('#m-cobs').value.trim(); if (!obs) { toast('Informe o motivo.', 'bad'); return; } run(async () => { await api('ocorrencia.cancelar', { id: t.dataset.id, obs }); closeModal(); render(); toast('Ocorrência cancelada'); }); },

  /* Etiquetas */
  lblF(t) { UI.lbl.filtro = t.dataset.f; render(); },
  lblPdf() {
    printHTML(lblPrintHTML(), 'labels-print', () => openModal(`<h2>As etiquetas saíram certas?</h2><p class="muted">Se a impressão ficou desalinhada, ajuste as margens e imprima de novo. Dica: teste antes numa folha comum, colocando-a sobre a folha de etiquetas contra a luz.</p>
      <div class="modal-actions"><button class="btn" data-act="close">Ainda não</button><button class="btn primary" data-act="lblDone">Sim, marcar como impressas</button></div>`));
  },
  lblDone() {
    const ids = [...UI.lbl.sel], n = ids.length;
    run(async () => { await api('exemplar.etiquetas', { ids }); UI.lbl.sel = new Set(); closeModal(); render(); toast(`${plural(n, 'exemplar marcado', 'exemplares marcados')} com etiqueta impressa`); });
  },

  /* Alertas */
  alertPrev() { run(async () => { UI.prev = await api('alertas.previa', {}, { msg: 'Calculando…' }); UI.mailTab = 0; render(); }); },
  alertRun() {
    openModal(`<h2>Enviar os alertas agora?</h2><p class="muted">Os e-mails de hoje serão enviados de verdade. Quem já recebeu hoje não recebe de novo.</p>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="alertRunOk">Enviar</button></div>`);
  },
  alertRunOk() { run(async () => { UI.prev = await api('alertas.executar', {}, { msg: 'Enviando e-mails…' }); UI.mailTab = 0; closeModal(); render(); toast(`${plural(UI.prev.enviados, 'e-mail enviado', 'e-mails enviados')}`); }); },
  mailTab(t) { UI.mailTab = +t.dataset.i; render(); },

  /* Administração */
  opPerfil(t) { const o = S.operadores[+t.dataset.i]; run(async () => { await api('operador.atualizar', { email: o.email, perfil: o.perfil === 'Admin' ? 'Operador' : 'Admin' }); render(); }); },
  opStatus(t) { const o = S.operadores[+t.dataset.i]; run(async () => { await api('operador.atualizar', { email: o.email, status: o.status === 'Ativo' ? 'Inativo' : 'Ativo' }); render(); }); },
};

/* ============ Dados do livro pela internet ============ */
// Ordem: BrasilAPI (catálogo da CBL e outras bases, bom para livros brasileiros) → Google Books → Open Library.
// Uma fonte completa os campos que a anterior deixou em branco.
const IDIOMAS = { pt: 'Português', 'pt-BR': 'Português', 'pt-PT': 'Português', por: 'Português', en: 'Inglês', eng: 'Inglês', es: 'Espanhol', spa: 'Espanhol', fr: 'Francês', fre: 'Francês', fra: 'Francês', it: 'Italiano', ita: 'Italiano', de: 'Alemão', ger: 'Alemão', deu: 'Alemão' };
const PEQUENAS = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'para', 'por', 'com', 'à', 'ao', 'aos', 'às', 'ou']);
// "O PEQUENO PRÍNCIPE" → "O Pequeno Príncipe" (só mexe em textos todos em maiúsculas)
function tituloBonito(s) {
  s = String(s || '').trim();
  if (!s || s !== s.toUpperCase() || !/\p{Lu}/u.test(s)) return s;
  let inicio = true; // primeira palavra e a que vem depois de ":" ou " - " sempre maiúscula
  return s.toLowerCase().split(/(\s+)/).map(w => {
    if (/^\s*$/.test(w)) return w;
    const out = !inicio && PEQUENAS.has(w) ? w : w.replace(/(^|[-'’(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
    inicio = /^[-–—]$/.test(w) || /[:.?!]$/.test(w);
    return out;
  }).join('');
}
async function gbFetch(q) {
  const key = CFG.GOOGLE_BOOKS_KEY ? '&key=' + encodeURIComponent(CFG.GOOGLE_BOOKS_KEY) : '';
  const r = await fetch('https://www.googleapis.com/books/v1/volumes?maxResults=8&q=' + encodeURIComponent(q) + key);
  if (!r.ok) throw new Error('Google Books indisponível');
  const j = await r.json();
  return (j.items || []).map(it => {
    const v = it.volumeInfo || {}, ids = v.industryIdentifiers || [];
    const isbn = (ids.find(i => i.type === 'ISBN_13') || ids.find(i => i.type === 'ISBN_10') || {}).identifier || '';
    return { isbn, titulo: [v.title, v.subtitle].filter(Boolean).join(': '), autor: (v.authors || []).join(', '), editora: v.publisher || '', ano: (v.publishedDate || '').slice(0, 4), idioma: IDIOMAS[v.language] || v.language || '', fonte: 'Google Books' };
  });
}
async function brasilApiIsbn(isbn) {
  const r = await fetch('https://brasilapi.com.br/api/isbn/v1/' + isbn);
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error('BrasilAPI indisponível');
  const v = await r.json();
  return { isbn, titulo: tituloBonito([v.title, v.subtitle].filter(Boolean).join(': ')), autor: (v.authors || []).filter(Boolean).join(', '), editora: tituloBonito(v.publisher), ano: v.year ? String(v.year) : '', idioma: '', fonte: 'BrasilAPI' };
}
async function googleIsbn(isbn) { const l = await gbFetch('isbn:' + isbn); return l[0] ? { ...l[0], isbn } : null; }
async function openLibIsbn(isbn) {
  const r = await fetch('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data');
  if (!r.ok) throw new Error('Open Library indisponível');
  const v = (await r.json())['ISBN:' + isbn]; if (!v) return null;
  return { isbn, titulo: [v.title, v.subtitle].filter(Boolean).join(': '), autor: (v.authors || []).map(a => a.name).join(', '), editora: ((v.publishers || [])[0] || {}).name || '', ano: ((v.publish_date || '').match(/\d{4}/) || [''])[0], idioma: '', fonte: 'Open Library' };
}
async function buscarIsbn(isbn) {
  const fontes = [brasilApiIsbn, googleIsbn, openLibIsbn];
  let res = null, falhas = 0;
  for (const f of fontes) {
    try {
      const r = await f(isbn);
      if (r && r.titulo) {
        if (!res) res = { ...r, fontes: [r.fonte] };
        else { let usou = false; for (const k of ['autor', 'editora', 'ano', 'idioma']) if (!res[k] && r[k]) { res[k] = r[k]; usou = true; } if (usou) res.fontes.push(r.fonte); }
      }
    } catch (e) { falhas++; }
    if (res && res.autor && res.editora && res.ano) break;
  }
  // ISBN brasileiro (978-85 / 978-65): sugere Português quando nenhuma fonte informou o idioma
  if (res && !res.idioma && /^97(885|865)/.test(isbnComoIsbn13(isbn))) res.idioma = 'Português';
  return { res, falhas, total: fontes.length };
}
// Busca por título/autor no Open Library (quando o Google Books não responde). Dados da obra, não da edição: sem ISBN, editora e ano.
async function openLibBusca(q) {
  const r = await fetch('https://openlibrary.org/search.json?limit=8&fields=title,subtitle,author_name,first_publish_year,language&q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('Open Library indisponível');
  return ((await r.json()).docs || []).map(d => ({ isbn: '', titulo: [d.title, d.subtitle].filter(Boolean).join(': '), autor: (d.author_name || []).join(', '), editora: '', ano: '', anoOriginal: d.first_publish_year ? String(d.first_publish_year) : '', idioma: (d.language || []).length === 1 ? (IDIOMAS[d.language[0]] || '') : '', fonte: 'Open Library' }));
}
function fillFromGB(r) {
  const set = (id, v) => { const el = $(id); if (el && v) el.value = v; };
  set('#f-isbn', r.isbn); set('#f-titulo', r.titulo); set('#f-autor', r.autor); set('#f-editora', r.editora); set('#f-ano', r.ano); set('#f-idioma', r.idioma);
  const cb = $('#f-semisbn'); if (cb && r.isbn) { cb.checked = false; CHG.semIsbn(cb); }
  const fontes = (r.fontes || [r.fonte || 'Google Books']).join(' + ');
  $('#gb-note').innerHTML = `<div class="note info"><b>Dados sugeridos por ${esc(fontes)}</b><span>Revise antes de salvar${r.fonte === 'Open Library' && !r.isbn ? ' (editora, ano e ISBN variam conforme a edição)' : ''} e escolha o gênero, que define a sigla da etiqueta.</span></div>`;
}
function salvarObra(p) {
  run(async () => {
    try {
      const r = await api('obra.salvar', p);
      if (p.id) { toast('Obra atualizada. Os códigos dos exemplares não mudaram.'); go('obra', { id: r.obraId }); }
      else go('obraSalva', { id: r.obraId, ids: r.exIds.join(',') });
    } catch (e) {
      if (e.code !== 'DUP') throw e;
      const dup = obra(e.extra.obraId); UI.pendingObra = p; const s = exSummary(dup.id);
      openModal(`<h2>${e.extra.isbn ? 'Este ISBN já está cadastrado' : 'Já existe uma obra semelhante'}</h2>
        <div class="result"><span class="big">${esc(dup.titulo)}</span><span class="small">${esc(dup.autor)} · ${esc(dup.editora)} · ${dup.ano}${dup.isbn ? ` · ISBN ${esc(dup.isbn)}` : ''}</span><span class="small muted">${plural(s.total, 'exemplar', 'exemplares')} · ${s.txt}</span></div>
        <p>Você quer adicionar ${plural(p.qtd, 'novo exemplar', 'novos exemplares')} a esta obra?</p>
        <div class="modal-actions" style="justify-content:stretch;flex-direction:column">
          <button class="btn primary" data-act="dupAdd" data-id="${dup.id}">Sim, adicionar ${plural(p.qtd, 'exemplar', 'exemplares')} a esta obra</button>
          ${e.extra.isbn ? '' : '<button class="btn" data-act="dupNew">Não, é outra obra (outra edição ou editora)</button>'}
          <button class="btn ghost" data-act="close">Cancelar e revisar</button></div>`);
    }
  });
}

/* ============ Formulários ============ */
function fieldErr(id, msg) { const m = $('#m-' + id); if (m) m.textContent = msg || ''; const f = m && m.closest('.field'); if (f) f.classList.toggle('err', !!msg); return !msg; }
const FORM = {
  scanManual(f) {
    const raw = $('#scan-man').value.trim().toUpperCase(), d = raw.replace(/[^0-9X]/g, '');
    if (!(d.length === 13 && /^\d+$/.test(d)) && !/^\d{9}[\dX]$/.test(d)) { toast('O ISBN deve ter 10 ou 13 dígitos.', 'bad'); return; }
    if (d.length === 13 && !isbn13Valido(d)) { toast('Esse ISBN de 13 dígitos não é válido. Confira os números.', 'bad'); return; }
    const cb = SCAN.onRead; closeModal(); if (cb) cb(d);
  },
  obra() {
    const ed = !!P.id; const val = id => ($('#f-' + id)?.value || '').trim();
    const semIsbn = $('#f-semisbn').checked, isbnRaw = semIsbn ? '' : val('isbn'), isbnD = digits(isbnRaw.replace(/x$/i, '')) + (/x$/i.test(isbnRaw) ? 'X' : '');
    let ok = true; const Y = new Date().getFullYear();
    ok = fieldErr('isbn', !semIsbn && !isbnRaw ? 'Informe o ISBN ou marque "Livro sem ISBN".' : !semIsbn && ![10, 13].includes(isbnD.length) ? 'ISBN deve ter 10 ou 13 dígitos.' : '') && ok;
    ['titulo', 'autor', 'editora'].forEach(k => { ok = fieldErr(k, val(k) ? '' : 'Campo obrigatório.') && ok; });
    ok = fieldErr('genero', $('#f-genero').value ? '' : 'Escolha o gênero.') && ok;
    const ano = parseInt(val('ano'));
    ok = fieldErr('ano', !val('ano') ? 'Campo obrigatório.' : (!/^\d{4}$/.test(val('ano')) || ano < 1450 || ano > Y) ? `Informe um ano entre 1450 e ${Y}.` : '') && ok;
    let qtd = 0, local = '';
    if (!ed) { qtd = parseInt(val('qtd')); local = val('local'); ok = fieldErr('qtd', !(qtd >= 1 && qtd <= 50) ? 'Entre 1 e 50.' : '') && ok; ok = fieldErr('local', local ? '' : 'Campo obrigatório.') && ok; }
    if (!ok) { $('.field.err input, .field.err select')?.focus(); return; }
    const p = { id: P.id || '', isbn: semIsbn ? '' : isbnRaw, semIsbn, titulo: val('titulo'), autor: val('autor'), genero: $('#f-genero').value, editora: val('editora'), ano, edicao: val('edicao'), idioma: val('idioma'), obs: val('obs'), qtd, local };
    salvarObra(p);
  },
  usuario() {
    const ed = !!P.id, u = ed ? user(P.id) : null, val = id => ($('#f-' + id)?.value || '').trim();
    const vinc = ed && !!u.assocId, cpfLock = ed && (!isAdmin() || vinc); const cpf = cpfLock ? u.cpf : digits(val('cpf'));
    let ok = true;
    if (!cpfLock) {
      const ex = userByCPF(cpf);
      if (!cpfValido(cpf) || (ex && ex.id !== (u && u.id))) { $('#cpf-check').innerHTML = cpfCheckHTML(val('cpf'), u && u.id) || '<div class="note bad"><b>Informe um CPF válido.</b></div>'; $('#f-cpf').focus(); ok = false; }
    }
    ok = fieldErr('nome', val('nome').length < 3 ? 'Informe o nome completo.' : '') && ok;
    if (!vinc) ok = fieldErr('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? 'Informe um e-mail válido.' : '') && ok;
    if (!ok) return;
    const data = { id: ed ? u.id : '', nome: val('nome'), cpf, email: val('email').toLowerCase(), telefone: val('tel'), dataAut: val('aut') || TODAY(), status: $('#f-status').value, obs: val('uobs') };
    run(async () => {
      try { const r = await api('usuario.salvar', data); toast(ed ? 'Cadastro atualizado' : 'Usuário cadastrado'); go('usuario', { id: r.userId }); }
      catch (e) { if (e.code === 'DUP') { $('#cpf-check').innerHTML = `<div class="note warn"><b>${esc(e.message)}</b><span><button type="button" class="btn sm" data-act="go" data-v="usuario" data-id="${e.extra.userId}">Abrir cadastro existente</button></span></div>`; } else throw e; }
    });
  },
  loanUser() { UI.draft.cpf = $('#l-cpf').value; findLoanUser(); render(); },
  loanEx() { UI.draft.cod = $('#l-hash').value; findLoanEx(); render(); },
  config() {
    const n = id => $(id).value;
    const cnpjD = digits($('#a-cnpj').value), aEmail = $('#a-email').value.trim();
    let okA = fieldErr('acnpj', cnpjD && !cnpjValido(cnpjD) ? 'CNPJ inválido. Confira os dígitos.' : '');
    okA = fieldErr('aemail', aEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(aEmail) ? 'Informe um e-mail válido.' : '') && okA;
    if (!okA) { $('.field.err input')?.focus(); return; }
    const config = {
      prazo: n('#c-prazo'), maxExemplares: n('#c-max'), renovacoes: n('#c-renov'), diasRenov: n('#c-drenov'),
      bloqueiaAtraso: $('#c-bloq').checked, impedeMesmaObra: $('#c-mesma').checked, antecedencia: n('#c-ant'), repeticaoAtraso: n('#c-rep'),
      horario: $('#c-hora').value, emailResp: $('#c-resp').value.trim(), resumoResp: $('#c-resumo').checked,
      valorTaxa: String($('#c-taxa').value).replace(',', '.'), termo: $('#c-termo').value.trim(),
      assoc: { nome: $('#a-nome').value.trim(), cnpj: cnpjD, endereco: $('#a-end').value.trim(), telefone: $('#a-tel').value.trim(), email: aEmail, site: $('#a-site').value.trim() },
    };
    run(async () => { await api('config.salvar', { config }); render(); toast('Configurações salvas'); });
  },
  operador() {
    const email = $('#o-email').value.trim().toLowerCase(), nome = $('#o-nome').value.trim();
    let ok = fieldErr('oemail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Informe um e-mail válido.' : S.operadores.some(o => o.email === email) ? 'Este e-mail já está na lista.' : '');
    ok = fieldErr('onome', nome ? '' : 'Campo obrigatório.') && ok;
    if (!ok) return;
    run(async () => { await api('operador.salvar', { email, nome, perfil: $('#o-perfil').value }); render(); toast('Operador adicionado. A pessoa já pode entrar com essa conta Google.'); });
  },
};

/* Entradas que filtram sem redesenhar a tela inteira */
const INP = {
  catQ(el) { P.q = el.value; $('#cat-res').innerHTML = catalogResults(); },
  obraQtd() { const pv = $('#cod-preview'); if (pv) pv.innerHTML = codPreview(); },
  usQ(el) { P.q = el.value; $('#us-res').innerHTML = userResults(); },
  empQ(el) { P.q = el.value; P.p = 1; $('#emp-res').innerHTML = empResults(); },
  atQ(el) { P.q = el.value; const pos = el.selectionStart; render(); const n = $('#at-q'); n.focus(); n.setSelectionRange(pos, pos); },
  loanCpf(el) { el.value = typeCPF(el.value); UI.draft.cpf = el.value; },
  loanHash(el) { UI.draft.cod = el.value.toUpperCase(); },
  loanEstado(el) { UI.draft.estado = el.value; },
  cpfForm(el) { el.value = typeCPF(el.value); $('#cpf-check').innerHTML = cpfCheckHTML(el.value, P.id); },
};
const CHG = {
  catCat(el) { P.cat = el.value; $('#cat-res').innerHTML = catalogResults(); },
  obraGen(el) { const pv = $('#cod-preview'); if (pv) pv.innerHTML = codPreview(); fieldErr('genero', ''); },
  semIsbn(el) { const i = $('#f-isbn'); i.disabled = el.checked; i.nextElementSibling.disabled = el.checked; const sc = $('[data-act="scanIsbnForm"]'); if (sc) sc.disabled = el.checked; if (el.checked) { i.value = ''; fieldErr('isbn', ''); } },
  loanEmp(el) { UI.draft.dataEmp = el.value; UI.draft.dataPrev = el.value ? addDays(el.value, S.config.prazo) : ''; render(); },
  loanPrev(el) { UI.draft.dataPrev = el.value; render(); },
  devCond() { const v = (document.querySelector('input[name="m-cond"]:checked') || {}).value; $('#m-avaria').hidden = v !== 'avaria'; },
  protOk(el) { UI.prot.ok = el.checked; protRefresh(); },
  async protFile(el) {
    const f = el.files && el.files[0]; if (!f) return;
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!isPdf && !/^image\//.test(f.type)) { toast('Envie uma imagem (JPG, PNG) ou um PDF.', 'bad'); el.value = ''; return; }
    try {
      if (isPdf) {
        if (f.size > 10 * 1024 * 1024) throw new Error('PDF maior que 10 MB. Gere o PDF com resolução menor.');
        UI.prot.file = { nome: f.name, tipo: 'application/pdf', tamanho: f.size, blob: f, thumb: null };
      } else {
        const r = await prepararImagem(f);
        if (r.blob.size > 10 * 1024 * 1024) throw new Error('Imagem maior que 10 MB mesmo depois de otimizada.');
        UI.prot.file = { nome: f.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg'), tipo: r.tipo, tamanho: r.blob.size, blob: r.blob, thumb: r.thumb, comprimida: r.comprimida };
      }
      protRefresh();
    } catch (e) { toast(e.message, 'bad'); el.value = ''; }
  },
  empDe(el) { P.de = el.value; P.p = 1; $('#emp-res').innerHTML = empResults(); },
  empAte(el) { P.ate = el.value; P.p = 1; $('#emp-res').innerHTML = empResults(); },
  pick(el) { el.checked ? UI.lbl.sel.add(el.dataset.id) : UI.lbl.sel.delete(el.dataset.id); lblRefresh(); },
  lblAll(el) { lblCandidates().forEach(e => el.checked ? UI.lbl.sel.add(e.id) : UI.lbl.sel.delete(e.id)); render(); },
  lblObra(el) { UI.lbl.obraId = el.value; render(); },
  lblPreset(el) { const p = PRESETS.find(x => x.id === el.value); UI.lbl.preset = p.id; if (p.id !== 'custom') Object.assign(UI.lbl, { cols: p.cols, rows: p.rows, mt: p.mt, ml: p.ml, gx: p.gx, gy: p.gy }); UI.lbl.start = 1; render(); },
  lblCols(el) { UI.lbl.cols = Math.min(5, Math.max(1, +el.value || 1)); lblRefresh(); },
  lblRows(el) { UI.lbl.rows = Math.min(15, Math.max(1, +el.value || 1)); lblRefresh(); },
  lblStart(el) { UI.lbl.start = Math.min(UI.lbl.cols * UI.lbl.rows, Math.max(1, +el.value || 1)); lblRefresh(); },
  lblMm(el) { const v = parseFloat(String(el.value).replace(',', '.')); UI.lbl[el.dataset.k] = isNaN(v) ? 0 : Math.min(40, Math.max(0, v)); },
};
function lblRefresh() { $('#sheet-area').innerHTML = sheetHTML(); $('#pick-count').textContent = `${UI.lbl.sel.size} selecionados`; const b = $('#btn-pdf'); if (b) b.disabled = !UI.lbl.sel.size; }

document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t || t.disabled) return; const f = ACT[t.dataset.act]; if (f) f(t, e); });
document.addEventListener('input', e => { const n = e.target.dataset && e.target.dataset.in; if (n && INP[n]) INP[n](e.target); });
document.addEventListener('change', e => { const n = e.target.dataset && e.target.dataset.ch; if (n && CHG[n]) CHG[n](e.target); });
document.addEventListener('submit', e => { e.preventDefault(); const n = e.target.dataset.form; if (FORM[n]) FORM[n](e.target); });
document.addEventListener('visibilitychange', () => { if (document.hidden && SCAN.stream) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#modal-root').innerHTML) closeModal(); else if (UI.menu) { UI.menu = false; render(); } } });
// Ao voltar para o app depois de um tempo, recarrega os dados (outros operadores podem ter feito alterações)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S && Date.now() - UI.lastSync > 5 * 60 * 1000 && !$('#modal-root').innerHTML) boot(true); });

/* ============ Auditoria do acervo ============ */
// Item da auditoria: foto do exemplar no início (código, título, local, situação no sistema) + resultado da conferência.
const AUD_FORA = ['Emprestado', 'Reservado'];
const audOrd = (a, b) => a.local.localeCompare(b.local, 'pt-BR') || a.num - b.num;
function audAtual() { return (S.auditorias || []).find(a => a.status === 'andamento'); }
function audStats(a) {
  const it = a.itens, s = { total: it.length, ok: 0, falta: 0, pend: 0, fora: 0, naoConf: 0, divFora: 0 };
  it.forEach(i => {
    if (i.res === 'ok') { s.ok++; if (i.fora) s.divFora++; }
    else if (i.res === 'falta') s.falta++;
    else if (i.res === 'nao_conferido') s.naoConf++;
    else if (i.fora) s.fora++;
    else s.pend++;
  });
  s.conferidos = s.ok + s.falta;
  s.aConferir = s.total - s.fora;
  s.pct = s.aConferir ? Math.round(100 * (s.total - s.fora - s.pend - s.naoConf) / s.aConferir) : 100;
  return s;
}
function audEscopo(a) { return a.tipo === 'completa' ? 'Completa' : `Por gênero: ${a.generos.map(g => `${generoNome(g)} (${g})`).join(', ')}`; }
function audResPill(i) {
  if (i.res === 'ok') return pill(i.fora ? 'Encontrado (consta emprestado)' : 'Está aqui', i.fora ? 'warn' : 'ok');
  if (i.res === 'falta') return pill('Não está', 'bad');
  if (i.res === 'nao_conferido') return pill('Não conferido', 'mute');
  if (i.fora) return pill('Fora: emprestado', 'info');
  return pill('Pendente', 'mute');
}
/* Folha para impressão (em branco ou com resultado) */
function audSheet(a, comRes) {
  const al = assocLinhas(), s = audStats(a);
  const rows = [...a.itens].sort(audOrd).map(i => `<tr><td class="mono">${i.codigo}</td><td>${esc(i.titulo)}<br><span style="color:#666">${esc(i.autor)}</span></td><td>${esc(i.local)}</td>
    <td>${esc(i.sistema)}${i.fora && i.comQuem ? `<br><span style="color:#666">${esc(i.comQuem)}</span>` : ''}</td>
    <td class="ck">${comRes ? (i.res === 'ok' ? 'Está aqui' : i.res === 'falta' ? '<b>Não está</b>' : i.res === 'nao_conferido' ? 'Não conferido' : i.fora ? 'Fora (emprestado)' : 'Pendente') : (i.fora ? '☐ Sim &nbsp;☐ Não<br><span style="color:#666">esperado fora</span>' : '☐ Sim &nbsp;☐ Não')}</td>
    <td>${comRes ? esc(i.obs || '') : ''}</td></tr>`).join('');
  return `<article class="doc" aria-label="Folha de auditoria">
    <header class="doc-h"><img src="${LOGO}" alt=""><div><b>Biblioteca da ${esc(al.nome)}</b>${al.l1 ? `<em class="doc-info">${esc(al.l1)}</em>` : ''}${al.l2 ? `<em class="doc-info">${esc(al.l2)}</em>` : ''}<span>${comRes ? 'Relatório de auditoria do acervo' : 'Folha de conferência do acervo'}</span></div><div class="doc-n">${a.id}<br>${fmtD(a.iniciadaEm.slice(0, 10))}</div></header>
    <table class="doc-t"><tr><th>Escopo</th><td>${esc(audEscopo(a))}</td></tr><tr><th>Exemplares</th><td>${s.total}${s.fora || a.itens.some(i => i.fora) ? ` (${a.itens.filter(i => i.fora).length} constavam emprestados no início)` : ''}</td></tr>
      ${comRes ? `<tr><th>Resultado</th><td>${s.ok} encontrados · <b>${s.falta} não encontrados</b>${s.naoConf ? ` · ${s.naoConf} não conferidos` : ''}${s.divFora ? ` · ${s.divFora} encontrados que constavam emprestados` : ''}</td></tr>` : ''}</table>
    <table class="doc-t doc-list"><thead><tr><th>Código</th><th>Título / autor</th><th>Localização</th><th>No sistema</th><th>Está na estante?</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="doc-sign"><div><span class="line"></span>Conferido por</div><div><span class="line"></span>Responsável pela biblioteca</div></div>
    <footer>Gerado em ${fmtStamp(nowStamp())}. ${comRes ? `Auditoria concluída em ${fmtStamp(a.concluidaEm)}.` : 'Marque cada exemplar e depois registre o resultado na tela de auditoria.'}</footer>
  </article>`;
}

function audListHTML(a) {
  const f = UI.audF || 'todos', q = UI.audQ || '', nq = norm(q), pc = parseCodigo(q);
  const list = [...a.itens].sort(audOrd).filter(i => {
    const st = i.res === 'ok' ? 'ok' : i.res === 'falta' ? 'falta' : i.fora ? 'fora' : 'pend';
    if (f !== 'todos' && f !== st) return false;
    if (!q) return true;
    return norm(`${i.titulo} ${i.autor} ${i.local}`).includes(nq) || (pc && pc.num === i.num) || codeCompact(i.codigo).includes(q.toUpperCase().replace(/[^0-9A-Z]/g, ''));
  });
  if (!list.length) return `<div class="table-wrap"><div class="empty">Nenhum exemplar com esse filtro.</div></div>`;
  const ro = a.status !== 'andamento';
  return `<div class="table-wrap cards"><table><thead><tr><th>Código</th><th>Livro</th><th>Localização</th><th>No sistema</th><th>Conferência</th>${ro ? '' : '<th><span class="sr">Ações</span></th>'}</tr></thead><tbody>
    ${list.map(i => `<tr class="${i.res === 'falta' ? 'row-bad' : ''}">
      <td data-label="Código"><span class="hash">${i.codigo}</span></td>
      <td class="lead" data-label="Livro"><div class="t">${esc(i.titulo)}</div><div class="s">${esc(i.autor)}</div></td>
      <td data-label="Localização">${esc(i.local)}</td>
      <td data-label="No sistema"><div>${pill(i.sistema, EX_CLS[i.sistema] || 'mute')}${i.fora && i.comQuem ? `<div class="s">com ${esc(i.comQuem)}</div>` : ''}</div></td>
      <td data-label="Conferência"><div>${audResPill(i)}${i.res && i.res !== 'nao_conferido' ? `<div class="s">${esc((S.operadores.find(o => o.email === i.por) || {}).nome || i.por)} · ${fmtStamp(i.ts).slice(11)}</div>` : ''}</div></td>
      ${ro ? '' : `<td class="actions"><button class="btn sm ${i.res === 'ok' ? 'primary' : ''}" data-act="audMark" data-id="${i.exId}" data-r="ok" aria-pressed="${i.res === 'ok'}">${ic('check')} Está aqui</button><button class="btn sm ${i.res === 'falta' ? 'danger' : ''}" data-act="audMark" data-id="${i.exId}" data-r="falta" aria-pressed="${i.res === 'falta'}">Não está</button>${i.res ? `<button class="btn sm ghost" data-act="audMark" data-id="${i.exId}" data-r="">Desfazer</button>` : ''}</td>`}
    </tr>`).join('')}
  </tbody></table></div><p class="small muted">${plural(list.length, 'exemplar', 'exemplares')} · ordenados por localização para facilitar a conferência na estante</p>`;
}

function audStartPanel() {
  const T = UI.audNovo || (UI.audNovo = { tipo: 'completa', gens: new Set() });
  const ativos = S.exemplares.filter(e => e.status !== 'Baixado');
  const cnt = g => ativos.filter(e => obra(e.obraId).genero === g).length;
  const scope = T.tipo === 'completa' ? ativos : ativos.filter(e => T.gens.has(obra(e.obraId).genero));
  const fora = scope.filter(e => AUD_FORA.includes(e.status)).length;
  const gens = [...S.generos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<section class="panel"><h2>Iniciar auditoria</h2>
    <p class="small muted">A auditoria tira uma foto do acervo agora e gera a lista de exemplares para conferir na estante. Exemplares baixados ficam de fora.</p>
    <div class="seg" role="radiogroup" aria-label="Tipo de auditoria">
      <button data-act="audTipo" data-t="completa" aria-pressed="${T.tipo === 'completa'}">Completa<span class="n">${ativos.length}</span></button>
      <button data-act="audTipo" data-t="genero" aria-pressed="${T.tipo === 'genero'}">Por gênero</button></div>
    ${T.tipo === 'genero' ? `<div class="gen-pick">${gens.map(g => `<label class="check ${cnt(g.sigla) ? '' : 'muted'}"><input type="checkbox" data-ch="audGen" data-s="${g.sigla}" ${T.gens.has(g.sigla) ? 'checked' : ''} ${cnt(g.sigla) ? '' : 'disabled'}> ${esc(g.nome)} <span class="chip mono">${g.sigla}</span> <span class="small muted">${cnt(g.sigla)}</span></label>`).join('')}</div>` : ''}
    <div class="note ${scope.length ? 'info' : 'warn'}"><span>${scope.length ? `<b>${plural(scope.length, 'exemplar', 'exemplares')}</b> para conferir${fora ? `, dos quais ${fora} ${fora > 1 ? 'estão emprestados' : 'está emprestado'} e não ${fora > 1 ? 'precisam' : 'precisa'} estar na estante` : ''}.` : 'Escolha ao menos um gênero.'}</span></div>
    <button class="btn primary lg" data-act="audStart" ${scope.length ? '' : 'disabled'} style="justify-self:start">${ic('clip')} Iniciar auditoria</button>
  </section>`;
}

function audHistHTML() {
  const h = (S.auditorias || []).filter(a => a.status !== 'andamento').sort((a, b) => b.iniciadaEm.localeCompare(a.iniciadaEm));
  if (!h.length) return '<div class="table-wrap"><div class="empty">Nenhuma auditoria concluída ainda.</div></div>';
  return `<div class="table-wrap cards"><table><thead><tr><th>Auditoria</th><th>Escopo</th><th>Resultado</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
    ${h.map(a => { const s = audStats(a); return `<tr><td class="lead"><div class="t mono">${a.id}</div><div class="s">${fmtStamp(a.iniciadaEm)}</div></td><td data-label="Escopo">${esc(audEscopo(a))}</td>
      <td data-label="Resultado"><div>${s.ok} encontrados · ${s.falta ? `<b style="color:var(--bad)">${s.falta} não encontrados</b>` : '0 não encontrados'}</div></td>
      <td data-label="Situação">${a.status === 'concluida' ? pill('Concluída', 'ok') : pill('Cancelada', 'mute')}</td>
      <td class="actions">${a.status === 'concluida' ? `<button class="btn sm" data-act="go" data-v="auditoriaRel" data-id="${a.id}">Ver relatório</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}

VIEWS.auditoria = {
  render() {
    const a = audAtual();
    if (!a) return `<div class="page-head"><div><h1>Auditoria do acervo</h1><p class="sub">Confira se cada exemplar está na estante. O administrador inicia a auditoria; qualquer operador pode ajudar na conferência.</p></div></div>
      ${isAdmin() ? audStartPanel() : '<div class="note info"><b>Nenhuma auditoria em andamento</b><span>Somente o administrador pode iniciar uma auditoria. Quando houver uma em andamento, você poderá conferir os livros por aqui.</span></div>'}
      <section class="panel"><h2>Auditorias anteriores</h2>${audHistHTML()}</section>`;
    const s = audStats(a), F = UI.audF || 'todos';
    const ini = S.operadores.find(o => o.email === a.iniciadaPor);
    return `<div class="page-head"><div><h1>Auditoria do acervo</h1><p class="sub"><span class="mono">${a.id}</span> · ${esc(audEscopo(a))} · iniciada em ${fmtStamp(a.iniciadaEm)} por ${esc(ini ? ini.nome : a.iniciadaPor)}</p></div>
      <div class="toolbar"><button class="btn" data-act="audSheet">${ic('tag')} ${UI.audSheet ? 'Ocultar folha' : 'Folha para impressão'}</button>${isAdmin() ? `<button class="btn primary" data-act="audFinish">${ic('check')} Concluir auditoria</button>` : ''}</div></div>
      <section class="panel">
        <div class="aud-prog"><div class="bar" role="progressbar" aria-valuenow="${s.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da conferência"><span style="width:${s.pct}%"></span></div><b class="num">${s.pct}%</b></div>
        <div class="kpis">
          <div class="kpi"><span class="k-label">Para conferir</span><span class="k-val">${s.total - s.fora}</span><span class="k-note">${s.fora ? `+ ${s.fora} emprestados` : 'na estante'}</span></div>
          <div class="kpi"><span class="k-label">Está aqui</span><span class="k-val" style="color:var(--ok)">${s.ok}</span><span class="k-note">${s.divFora ? `${s.divFora} constavam emprestados` : 'encontrados'}</span></div>
          <div class="kpi ${s.falta ? 'bad' : ''}"><span class="k-label">Não está</span><span class="k-val">${s.falta}</span><span class="k-note">não encontrados</span></div>
          <div class="kpi ${s.pend ? 'warn' : ''}"><span class="k-label">Pendentes</span><span class="k-val">${s.pend}</span><span class="k-note">falta conferir</span></div>
        </div>
        <form data-form="audCheck" class="field"><label for="aud-q">Conferência rápida</label><div class="inline"><input id="aud-q" class="mono" placeholder="Digite o número da etiqueta e Enter (ex.: 23)" autocomplete="off" autocapitalize="characters"><button class="btn primary">${ic('check')} Está aqui</button></div>
          <span class="hint">Pegue o livro na estante, digite o número e confirme. Para marcar que um livro não está, use o botão na linha dele.</span></form>
      </section>
      ${UI.audSheet ? `<section class="panel"><div class="panel-head"><h2>Folha para impressão</h2><button class="btn sm" data-act="audPrint">${ic('print')} Imprimir</button></div><div class="doc-wrap">${audSheet(a, false)}</div></section>` : ''}
      <div class="toolbar"><label class="search"><span class="sr">Buscar</span>${ic('search')}<input id="aud-busca" data-in="audQ" value="${esc(UI.audQ || '')}" placeholder="Título, autor, localização ou código" autocomplete="off"></label></div>
      <div class="seg" role="group" aria-label="Filtro">${[['todos', 'Todos', s.total], ['pend', 'Pendentes', s.pend], ['ok', 'Está aqui', s.ok], ['falta', 'Não está', s.falta], ['fora', 'Emprestados', s.fora]].map(([k, l, n]) => `<button data-act="audF" data-f="${k}" aria-pressed="${F === k}">${l}<span class="n">${n}</span></button>`).join('')}</div>
      <div id="aud-res">${audListHTML(a)}</div>
      ${isAdmin() ? `<button class="btn danger sm" data-act="audCancel" style="justify-self:start">Cancelar auditoria</button>` : ''}`;
  },
  after() { if (UI.audFocus) { UI.audFocus = false; const i = $('#aud-q'); if (i) i.focus(); } }
};

VIEWS.auditoriaRel = {
  render() {
    const a = (S.auditorias || []).find(x => x.id === P.id);
    if (!a) return '<p>Auditoria não encontrada.</p>';
    const s = audStats(a), fin = S.operadores.find(o => o.email === a.concluidaPor);
    const falta = a.itens.filter(i => i.res === 'falta').sort(audOrd), divFora = a.itens.filter(i => i.res === 'ok' && i.fora).sort(audOrd), nc = a.itens.filter(i => i.res === 'nao_conferido').sort(audOrd);
    const tbl = (list, acts) => `<div class="table-wrap cards"><table><thead><tr><th>Código</th><th>Livro</th><th>Localização</th><th>Situação atual</th>${acts ? '<th><span class="sr">Ações</span></th>' : ''}</tr></thead><tbody>
      ${list.map(i => { const ex = exem(i.exId); return `<tr><td data-label="Código"><span class="hash">${i.codigo}</span></td><td class="lead" data-label="Livro"><div class="t">${esc(i.titulo)}</div>${i.obs ? `<div class="s">${esc(i.obs)}</div>` : ''}</td><td data-label="Localização">${esc(i.local)}</td>
        <td data-label="Situação atual">${ex ? pill(ex.status, EX_CLS[ex.status]) : '—'}</td>${acts ? `<td class="actions">${acts(i, ex)}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
    return `<div><button class="back" data-act="go" data-v="auditoria">${ic('back')} Auditoria do acervo</button>
      <div class="page-head"><div><h1>Relatório de auditoria</h1><p class="sub"><span class="mono">${a.id}</span> · ${esc(audEscopo(a))}</p></div><button class="btn" data-act="audSheetRel">${ic('tag')} ${UI.audSheet ? 'Ocultar folha' : 'Relatório para impressão'}</button></div></div>
      <section class="panel"><dl class="facts"><div><dt>Início</dt><dd>${fmtStamp(a.iniciadaEm)}</dd></div><div><dt>Conclusão</dt><dd>${fmtStamp(a.concluidaEm)} · ${esc(fin ? fin.nome : a.concluidaPor)}</dd></div>
        <div><dt>Exemplares</dt><dd>${s.total}</dd></div><div><dt>Encontrados</dt><dd style="color:var(--ok)">${s.ok}</dd></div><div><dt>Não encontrados</dt><dd style="color:${s.falta ? 'var(--bad)' : 'inherit'}">${s.falta}</dd></div>${s.naoConf ? `<div><dt>Não conferidos</dt><dd>${s.naoConf}</dd></div>` : ''}</dl></section>
      ${UI.audSheet ? `<section class="panel"><div class="panel-head"><h2>Relatório para impressão</h2><button class="btn sm" data-act="audPrint" data-id="${a.id}">${ic('print')} Imprimir</button></div><div class="doc-wrap">${audSheet(a, true)}</div></section>` : ''}
      <section class="panel"><h2>Não encontrados (${falta.length})</h2>${falta.length ? `<p class="small muted">Procure de novo antes de dar baixa. Se o livro estava emprestado sem registro, regularize pelo empréstimo.</p>${tbl(falta, (i, ex) => ex && ex.status !== 'Baixado' && isAdmin() ? `<button class="btn sm danger" data-act="audBaixa" data-a="${a.id}" data-id="${i.exId}">Dar baixa como extraviado</button>` : ex && ex.status === 'Baixado' ? '<span class="small muted">Baixa registrada</span>' : '')}` : '<div class="note ok"><b>Nenhum exemplar faltando.</b></div>'}</section>
      ${divFora.length ? `<section class="panel"><h2>Encontrados na estante, mas constavam emprestados (${divFora.length})</h2><p class="small muted">Provável devolução não registrada. Confira e registre a devolução.</p>${tbl(divFora, i => `<button class="btn sm" data-act="go" data-v="emprestados" data-f="ativos" data-q="${i.codigo}">Ver empréstimo</button>`)}</section>` : ''}
      ${nc.length ? `<section class="panel"><h2>Não conferidos (${nc.length})</h2>${tbl(nc)}</section>` : ''}`;
  }
};

Object.assign(ACT, {
  audTipo(t) { UI.audNovo.tipo = t.dataset.t; render(); },
  audStart() {
    const T = UI.audNovo;
    run(async () => { await api('auditoria.iniciar', { tipo: T.tipo, generos: [...T.gens] }, { msg: 'Preparando a lista de conferência…' }); UI.audNovo = null; UI.audF = 'todos'; UI.audQ = ''; UI.audSheet = false; render(); toast('Auditoria iniciada'); });
  },
  audMark(t) {
    const a = audAtual(); if (!a) return; const i = a.itens.find(x => x.exId === t.dataset.id); if (!i) return;
    const r = t.dataset.r || '';
    if (r === 'falta' && !i.fora) {
      openModal(`<h2>Marcar como não encontrado</h2><p><span class="mono">${i.codigo}</span> · ${esc(i.titulo)}</p><p class="small muted">Local esperado: ${esc(i.local)}</p>
        <div class="field"><label for="m-audobs">Observação</label><input id="m-audobs" placeholder="Ex.: procurado nas estantes A e B"></div>
        <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn danger" data-act="audFaltaOk" data-id="${i.exId}">Não está</button></div>`);
      return;
    }
    run(async () => { await api('auditoria.marcar', { audId: a.id, exId: i.exId, res: r }); render(); });
  },
  audFaltaOk(t) {
    const a = audAtual(); if (!a) return;
    run(async () => { await api('auditoria.marcar', { audId: a.id, exId: t.dataset.id, res: 'falta', obs: $('#m-audobs').value.trim() }); closeModal(); render(); });
  },
  audF(t) { UI.audF = t.dataset.f; render(); },
  audSheet() { UI.audSheet = !UI.audSheet; render(); },
  audSheetRel() { UI.audSheet = !UI.audSheet; render(); },
  audPrint(t) { const a = t.dataset.id ? S.auditorias.find(x => x.id === t.dataset.id) : audAtual(); if (a) printHTML(audSheet(a, a.status !== 'andamento'), 'doc-print'); },
  audFinish() {
    const a = audAtual(); if (!a) return; const s = audStats(a);
    openModal(`<h2>Concluir auditoria</h2><dl class="facts"><div><dt>Está aqui</dt><dd>${s.ok}</dd></div><div><dt>Não está</dt><dd>${s.falta}</dd></div><div><dt>Pendentes</dt><dd>${s.pend}</dd></div><div><dt>Emprestados</dt><dd>${s.fora}</dd></div></dl>
      ${s.pend ? `<div class="note warn"><span>${plural(s.pend, 'exemplar ainda não foi conferido e será registrado', 'exemplares ainda não foram conferidos e serão registrados')} como <b>Não conferido</b>.</span></div>` : '<div class="note ok"><b>Todos os exemplares foram conferidos.</b></div>'}
      <p class="small muted">Depois de concluída, a auditoria não pode mais ser alterada. O relatório fica no histórico.</p>
      <div class="modal-actions"><button class="btn" data-act="close">Voltar</button><button class="btn primary" data-act="audFinishOk">Concluir e ver relatório</button></div>`);
  },
  audFinishOk() { const a = audAtual(); if (!a) return; run(async () => { await api('auditoria.concluir', { audId: a.id }); UI.audSheet = false; closeModal(); go('auditoriaRel', { id: a.id }); }); },
  audCancel() {
    openModal(`<h2>Cancelar auditoria?</h2><p class="muted">As conferências feitas até agora ficam no histórico como auditoria cancelada, sem relatório.</p>
      <div class="modal-actions"><button class="btn" data-act="close">Voltar</button><button class="btn danger" data-act="audCancelOk">Cancelar auditoria</button></div>`);
  },
  audCancelOk() { const a = audAtual(); if (!a) return; run(async () => { await api('auditoria.cancelar', { audId: a.id }); closeModal(); render(); toast('Auditoria cancelada'); }); },
  audBaixa(t) {
    const ex = exem(t.dataset.id);
    openModal(`<h2>Dar baixa como extraviado</h2><p><span class="mono">${ex.codigo}</span> · ${esc(obra(ex.obraId).titulo)}</p><p class="small muted">O exemplar sai do acervo ativo. O número ${fmtNum(ex.num)} não será reaproveitado e o histórico é mantido.</p>
      <div class="modal-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn danger" data-act="audBaixaOk" data-id="${ex.id}" data-a="${t.dataset.a}">Dar baixa</button></div>`);
  },
  audBaixaOk(t) { run(async () => { await api('auditoria.baixa', { audId: t.dataset.a, exId: t.dataset.id }); closeModal(); render(); toast('Baixa registrada'); }); },
});
Object.assign(FORM, {
  audCheck() {
    const a = audAtual(), inp = $('#aud-q'), v = inp.value; if (!a || !v.trim()) return;
    const pc = parseCodigo(v);
    if (!pc) { toast('Digite o número da etiqueta (ex.: 23) ou o código completo.', 'bad'); return; }
    const i = a.itens.find(x => x.num === pc.num);
    if (!i) {
      const ex = exByNum(pc.num);
      toast(ex ? `${ex.codigo} não faz parte desta auditoria${a.tipo === 'genero' ? ` (gênero ${generoNome(obra(ex.obraId).genero)})` : ex.status === 'Baixado' ? ' (exemplar baixado)' : ' (cadastrado depois do início)'}.` : `Nenhum exemplar com o número ${fmtNum(pc.num)}. Se o livro está na estante, ele pode não ter sido cadastrado.`, 'bad');
      inp.select(); return;
    }
    if (pc.sigla && !i.codigo.endsWith('-' + pc.sigla)) { toast(`O número ${fmtNum(pc.num)} é ${i.codigo}, não ${pc.sigla}. Confira a etiqueta.`, 'bad'); inp.select(); return; }
    if (i.res === 'ok') { toast(`${i.codigo} já estava conferido.`); inp.value = ''; inp.focus(); return; }
    run(async () => {
      await api('auditoria.marcar', { audId: a.id, exId: i.exId, res: 'ok' }, { msg: 'Registrando…' });
      UI.audFocus = true; render();
      toast(i.fora ? `${i.codigo} encontrado, mas consta emprestado (${i.comQuem}). Fica como divergência.` : `${i.codigo} · ${i.titulo}: está aqui`, i.fora ? 'bad' : 'ok');
    });
  },
});
Object.assign(INP, { audQ(el) { UI.audQ = el.value; $('#aud-res').innerHTML = audListHTML(audAtual()); } });
Object.assign(CHG, { audGen(el) { el.checked ? UI.audNovo.gens.add(el.dataset.s) : UI.audNovo.gens.delete(el.dataset.s); render(); } });

/* ============ Início ============ */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
if (configurado() && getToken()) boot(); else render();

/* ---- versão 1.4: assinatura do operador e protocolo em PDF para assinar pelo gov.br ---- */
function processarAssinatura(file) { // fundo transparente, recorte e redução (o mesmo da carteirinha da secretaria)
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1400 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h), p = d.data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let i = 0; i < p.length; i += 4) {
        const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        if (p[i + 3] < 128 || lum > 185) p[i + 3] = 0;
        else { p[i + 3] = Math.min(255, Math.round((185 - lum) / 120 * 255)); p[i] = Math.min(p[i], 40); p[i + 1] = Math.min(p[i + 1], 40); p[i + 2] = Math.min(p[i + 2], 90); const q = i / 4, x = q % w, y = (q / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 <= x0 || y1 <= y0) { rej(new Error('Não encontrei a assinatura na imagem. Use caneta escura em papel branco.')); return; }
      g.putImageData(d, 0, 0);
      const m = 8; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
      let largura = 640, b64 = '';
      do {
        const sc = Math.min(largura / (x1 - x0 + 1), (largura * 0.3) / (y1 - y0 + 1), 1);
        const o = document.createElement('canvas'); o.width = Math.max(1, Math.round((x1 - x0 + 1) * sc)); o.height = Math.max(1, Math.round((y1 - y0 + 1) * sc));
        o.getContext('2d').drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, o.width, o.height);
        b64 = o.toDataURL('image/png').split(',')[1]; largura -= 80;
      } while (b64.length > 40000 && largura > 160);
      if (b64.length > 40000) { rej(new Error('Imagem da assinatura muito detalhada. Tente uma foto mais limpa.')); return; }
      res(b64);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não foi possível abrir a imagem.')); };
    img.src = url;
  });
}
const assModal = o => `<h2>Assinatura de ${esc(o.nome)}</h2><p class="small muted">Assine com caneta escura em papel branco e tire uma foto bem iluminada (ou envie uma imagem PNG com fundo transparente). O fundo é removido sozinho. A assinatura sai no campo "Operador responsável" dos protocolos gerados por ${o.email === S.session.email ? 'você' : 'este operador'}.</p>
  <div class="sig-prev">${o.assinatura ? `<img src="data:image/png;base64,${o.assinatura}" alt="Assinatura cadastrada">` : '<span class="muted small">Nenhuma assinatura cadastrada</span>'}</div>
  <div class="modal-actions">${o.assinatura ? `<button class="btn danger" data-act="assRemover" data-email="${esc(o.email)}">Remover</button>` : ''}<button class="btn" data-act="close">Fechar</button>
    <label class="btn primary" for="ass-arq">${o.assinatura ? 'Trocar imagem' : 'Enviar imagem'}</label><input id="ass-arq" type="file" accept="image/*" data-ch="assArquivo" data-email="${esc(o.email)}" class="sr"></div>`;
const opDe = email => S.operadores.find(o => o.email === email);
Object.assign(ACT, {
  assAbrir(t) { openModal(assModal(opDe(t.dataset.email || S.session.email))); },
  assRemover(t) { const e = t.dataset.email; run(async () => { await api('operador.assinatura', { email: e, imagem: '' }); openModal(assModal(opDe(e))); render(); toast('Assinatura removida'); }); },
  protPdf() { const pr = protocolo(UI.prot.id); run(async () => { busy(true, 'Gerando PDF…'); try { baixarBlob(await protocoloPdf(pr), `Protocolo ${pr.id}.pdf`); } finally { busy(false); } }); },
  protEnviar() { run(() => enviarProtocolo(UI.prot.id)); },
});
CHG.assArquivo = el => {
  const f = el.files[0], e = el.dataset.email; if (!f) return;
  run(async () => { const b64 = await processarAssinatura(f); await api('operador.assinatura', { email: e, imagem: b64 }, { msg: 'Salvando assinatura…' }); openModal(assModal(opDe(e))); render(); toast('Assinatura salva'); });
};
function baixarBlob(blob, nome) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
let H2P = null; // html2pdf carregado só quando precisa
const carregaH2P = () => H2P || (H2P = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; sc.onload = () => res(window.html2pdf); sc.onerror = () => { H2P = null; rej(new Error('Não foi possível carregar o gerador de PDF. Verifique a internet.')); }; document.head.appendChild(sc); }));
async function protocoloPdf(pr) {
  const h2p = await carregaH2P();
  const box = document.createElement('div'); box.className = 'pdf-render'; box.innerHTML = protocoloDoc(pr); document.body.appendChild(box);
  try { return await h2p().set({ margin: [8, 8, 8, 8], image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(box.firstElementChild).outputPdf('blob'); }
  finally { box.remove(); }
}
const blob64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(new Error('Falha ao ler o PDF.')); fr.readAsDataURL(b); });
async function enviarProtocolo(id, auto) {
  const pr = protocolo(id); if (!pr || pr.status !== 'pendente') return;
  if (!auto) busy(true, 'Gerando PDF…');
  try { const pdf = await blob64(await protocoloPdf(pr)); const r = await api('protocolo.enviar', { protocoloId: id, pdf }, auto ? { silent: true } : { msg: 'Enviando por e-mail…' }); if (VIEW === 'protocolo') render(); toast(`Protocolo enviado para ${r.para} assinar pelo gov.br`); }
  finally { if (!auto) busy(false); }
}
function envioAuto(id) {
  const pr = protocolo(id), l = pr && S.emprestimos.find(x => x.id === pr.loanId), u = l && user(l.userId);
  if (u && u.email) enviarProtocolo(id, true).catch(e => toast('O e-mail com o PDF não foi enviado: ' + e.message + ' Use "Baixar PDF".', 'bad'));
}
function protEnvioHTML(pr, u) {
  const me = opDe(S.session.email), meu = pr.geradoPor === S.session.email;
  return `<div class="prot-envio">${meu && me && !me.assinatura ? `<div class="note warn"><span>Você ainda não cadastrou a sua assinatura; o campo do operador sai em branco. <button class="btn sm" data-act="assAbrir" data-email="${esc(me.email)}">Cadastrar assinatura</button></span></div>` : ''}
    <div class="note info"><b>Assinatura pelo gov.br</b><span>${pr.enviadoEm ? `PDF enviado para ${esc(pr.enviadoPara)} em ${fmtStamp(pr.enviadoEm)}.` : u.email ? 'O PDF ainda não foi enviado por e-mail.' : 'O leitor não tem e-mail cadastrado: baixe o PDF e envie por WhatsApp.'} O leitor assina em assinador.iti.br e devolve o PDF assinado; depois é só anexar aqui.</span>
    <span class="toolbar"><button class="btn sm" data-act="protPdf">${ic('copy')} Baixar PDF</button>${u.email ? `<button class="btn sm" data-act="protEnviar">${pr.enviadoEm ? 'Enviar de novo' : 'Enviar por e-mail'}</button>` : ''}</span></div></div>`;
}
