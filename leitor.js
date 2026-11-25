/* Portal do leitor (versão 2.0 — novo visual: vitrine, entrada e catálogo; versão 1.7 na origem): início, catálogo físico, biblioteca virtual (PDF só na tela, com marca d'água), cantigas (associados), perfil e ajuda.
   Login com CPF e senha própria. Visual do mockup aprovado em 04/11/2026. */
const CFG = window.BIBLIOTECA_CONFIG || {};
const WHATS = '5554996164144';
const WHATS_MSG = 'Olá! Gostaria de solicitar meu cadastro na Biblioteca Luzes de Aruanda.\nNome completo: \nCPF: \nE-mail: ';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtD = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '';
const fmtCPF = v => { const d = String(v || '').replace(/\D/g, '').slice(0, 11); return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); };
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } } };
let V = 'entrar', PG = 'inicio', D = null, C = null, CPF = '', MENU = false;
let MANUT = null, EST = null, GAV = null; // versão 1.14
const F = { q: '', g: '', disp: '', ord: '', id: '' }, FC = { q: '', sec: '', toq: '', casa: false, id: '', ori: '', mid: '', modo: '' };
const LOGO = 'logo.png';

/* ---------- ícones e ilustrações (SVG) ---------- */
const sv = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  flag: sv('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  home: sv('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  book: sv('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>'),
  pdf: sv('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M8.5 13h1.2a1.2 1.2 0 0 1 0 2.4H8.5V13v4.5M13 13v4.5h.8a1.8 1.8 0 0 0 0-4.5zM17.5 13H16v4.5M16 15.2h1.3"/>', 1.5),
  music: sv('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  help: sv('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>'),
  out: sv('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>'),
  ref: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  arrow: sv('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  left: sv('<path d="M15 6l-6 6 6 6"/>', 2.2), right: sv('<path d="M9 6l6 6-6 6"/>', 2.2),
  pagina: sv('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'), rolar: sv('<rect x="6" y="2" width="12" height="8" rx="1.5"/><rect x="6" y="14" width="12" height="8" rx="1.5"/><path d="M3 9v6M2 13.5l1 1.5 1-1.5"/>'),
  play: sv('<path d="M7 4.5v15l12-7.5z"/>', 2), fone: sv('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6" rx="1.5"/>'),
  letra: sv('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 9h2"/>'), filtro: sv('<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>'), camadas: sv('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>'), search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
};
const ART = {
  books: `<svg viewBox="0 0 160 160" aria-hidden="true"><ellipse cx="88" cy="146" rx="62" ry="7" fill="#000" opacity=".12"/>
    <rect x="36" y="112" width="104" height="26" rx="4" fill="#24486f"/><rect x="40" y="116" width="96" height="6" fill="#efe6d4"/><rect x="36" y="128" width="104" height="3" fill="#c9a24a"/>
    <rect x="46" y="88" width="92" height="25" rx="4" fill="#8a4b2c"/><rect x="50" y="92" width="84" height="6" fill="#f3ead8"/><rect x="46" y="104" width="92" height="3" fill="#e0b660"/>
    <rect x="30" y="64" width="98" height="25" rx="4" fill="#2f6a73"/><rect x="34" y="68" width="90" height="6" fill="#efe6d4"/><rect x="30" y="80" width="98" height="3" fill="#d8b25a"/>
    <rect x="52" y="40" width="86" height="25" rx="4" fill="#3a5f8f"/><rect x="56" y="44" width="78" height="6" fill="#f5eedf"/><rect x="52" y="56" width="86" height="3" fill="#c9a24a"/>
    <rect x="44" y="18" width="80" height="23" rx="4" fill="#9b3b30"/><rect x="48" y="22" width="72" height="5" fill="#f3ead8"/></svg>`,
  tablet: `<svg viewBox="0 0 160 160" aria-hidden="true"><ellipse cx="86" cy="148" rx="54" ry="6" fill="#000" opacity=".12"/>
    <g transform="rotate(10 90 80)"><rect x="44" y="10" width="92" height="132" rx="12" fill="#1e2329"/><rect x="51" y="18" width="78" height="116" rx="5" fill="#fbfaf6"/>
    ${[30, 38, 46, 54, 62].map(y => `<rect x="58" y="${y}" width="${y % 16 ? 62 : 48}" height="3" rx="1.5" fill="#cfd5dc"/>`).join('')}
    <path d="M90 128c0-22 4-40 14-56" stroke="#2f6b3a" stroke-width="2.5" fill="none"/>
    ${[[96, 112, -40], [99, 100, 30], [100, 90, -30], [103, 80, 40], [104, 72, -20]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4.5" fill="#4f9a55" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g></svg>`,
  drum: `<svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="dw" x1="0" x2="1"><stop offset="0" stop-color="#7a3f17"/><stop offset=".45" stop-color="#c47a33"/><stop offset="1" stop-color="#6b3412"/></linearGradient></defs>
    <ellipse cx="84" cy="150" rx="40" ry="6" fill="#000" opacity=".14"/><path d="M48 26h72l-10 118H58z" fill="url(#dw)"/>
    ${[50, 74, 98, 122].map(y => `<path d="M${48 + (y - 26) * 0.085} ${y}h${72 - (y - 26) * 0.17}" stroke="#3d1f0c" stroke-width="3" opacity=".55"/>`).join('')}
    ${[60, 74, 88, 102].map(x => `<path d="M${x} 30 L${x + (x - 84) * -0.06} 70" stroke="#e9d3a8" stroke-width="2" opacity=".8"/>`).join('')}
    <ellipse cx="84" cy="26" rx="36" ry="10" fill="#f1e2c6" stroke="#6b3412" stroke-width="3"/></svg>`,
  notes: `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="ng" cx=".3" cy=".3"><stop offset="0" stop-color="#f6c58b"/><stop offset="1" stop-color="#a5552a"/></radialGradient></defs><rect width="120" height="120" fill="url(#ng)"/>
    ${[[30, 70, 1], [62, 48, .8], [88, 78, 1.1], [46, 98, .7]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#3b1f0f" opacity=".85"><ellipse cx="0" cy="0" rx="8" ry="6"/><rect x="6" y="-30" width="3" height="30"/><path d="M9 -30q12 6 10 18q-3-9-10-10z"/></g>`).join('')}</svg>`,
  bookThumb: `<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="#f2ebdd"/><g transform="translate(-6 -10) scale(.82)"><rect x="36" y="112" width="104" height="26" rx="4" fill="#24486f"/><rect x="46" y="88" width="92" height="25" rx="4" fill="#8a4b2c"/><rect x="30" y="64" width="98" height="25" rx="4" fill="#2f6a73"/><rect x="52" y="40" width="86" height="25" rx="4" fill="#3a5f8f"/></g></svg>`,
  waves: `<svg class="lp-waves" viewBox="0 0 250 200" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2, 3].map(i => `<path d="M-10 ${150 + i * 12} C 60 ${110 + i * 12}, 140 ${190 + i * 8}, 260 ${120 + i * 14}" stroke="#8fb4ff" stroke-width="1" fill="none"/>`).join('')}<circle cx="210" cy="40" r="80" stroke="#8fb4ff" stroke-width=".8" fill="none"/></svg>`,
};

/* ---------- comunicação ---------- */
function busy(on, msg) { $('#busy').hidden = !on; if (msg) $('#busy-msg').textContent = msg; }
function toast(msg, kind = 'ok') { const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 5000); }
let modalFoco = null;
function modal(html) {
  $('#modal-root').innerHTML = html ? `<div class="overlay" data-act="fechar"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-tit">${html.replace('<h2>', '<h2 id="modal-tit">')}</div></div>` : '';
  if (html) { modalFoco = document.activeElement; setTimeout(() => { const m = $('#modal-root .modal'), f = m && (m.querySelector('input') || m.querySelector('.btn.primary') || m.querySelector('button')); if (f && !m.contains(document.activeElement)) f.focus({ preventScroll: true }); }, 30); }
  else if (modalFoco && document.contains(modalFoco)) { modalFoco.focus(); modalFoco = null; }
}
async function api(action, payload = {}, msg) {
  busy(true, msg || 'Aguarde…');
  try {
    let r; try { r = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, payload }), redirect: 'follow' }); } catch (e) { throw Object.assign(new Error('Sem conexão. Confira a internet e tente de novo.'), { code: 'NET' }); }
    const j = await r.json().catch(() => ({ ok: false, error: { code: 'NET', message: 'Resposta inválida do servidor. Tente de novo.' } }));
    if (!j.ok) throw Object.assign(new Error(j.error.message), { code: j.error.code, extra: j.error.extra });
    return j.data.result;
  } finally { busy(false); }
}
async function run(fn) { try { await fn(); } catch (e) { if (e.code === 'AUTH' && ls.get('bibLeitor')) { sair(e.message); return; } if (e.code === 'MANUTENCAO' && e.extra && e.extra.modulo === 'portal') { MANUT = e; V = 'manut'; render(); return; } toast(e.message, 'bad'); } }
function sair(msg) { ttsFechar(); enviarPos(true); enviarFila(true); ls.set('bibLeitor', null); D = null; C = null; DG = null; LV = null; V = 'entrar'; PG = 'inicio'; render(); if (msg) toast(msg, 'bad'); }
const token = () => ls.get('bibLeitor');
async function carregar() { D = await api('leitor.dados', { token: token() }, 'Carregando…'); V = 'app'; MANUT = null; render(); regEntrada(); }
const irPara = pg => { if (pg !== PG) reg('pagina', 'portal', '', PG_NOME[pg] || pg); PG = pg; MENU = false; FC.id = ''; F.id = ''; FD.id = ''; if (pg !== 'virtual') { ttsFechar(); enviarPos(true); LV = null; } if (pg === 'virtual' && !DG && modOk('virtual') && D.leitor.emDia) { run(async () => { DG = await api('leitor.digitais', { token: token() }, 'Carregando os livros digitais…'); render(); focoTela(); }); return; } if (pg === 'cantigas' && !C && modOk('cantigas')) { run(async () => { C = await api('leitor.cantigas', { token: token() }, 'Carregando as cantigas…'); render(); focoTela(); }); return; } render(); focoTela(); };

Object.assign(IC, {
  olho: sv('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  olhoX: sv('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.5 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  relogio: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
});
/* ---------- entrada (versão 2.0): tela dividida — apresentação da biblioteca + formulário ---------- */
const card = (body, titulo = 'Entrar no portal', sub = 'Use o seu CPF e a sua senha.') => `<div class="lx-entrada">
  <section class="lx-ent-arte" aria-hidden="true"><div class="lx-luz"></div>
    <div class="lx-ent-arte-in"><p class="lx-eyebrow claro">Biblioteca Luzes de Aruanda</p>
      <p class="lx-ent-frase">Conhecimento também é <em>caminho de luz.</em></p>
      <p class="lx-ent-sub">Livros, leituras digitais e cantigas da nossa casa, num só lugar.</p>
      <ul class="lx-ent-trio"><li>${IC.book}<span><b>Catálogo físico</b>Peça a retirada pelo portal</span></li><li>${IC.pdf}<span><b>Biblioteca Virtual</b>Leia no celular ou no computador</span></li><li>${IC.music}<span><b>Cantigas</b>Letra, áudio e vídeo</span></li></ul></div></section>
  <section class="lx-ent-painel"><div class="lx-ent-card">
    <div class="lx-ent-marca"><img src="${LOGO}" alt="Logo da Associação Centro de Umbanda Luzes de Aruanda"><div><span class="lx-eyebrow">Portal do leitor</span><b>Biblioteca Luzes de Aruanda</b></div></div>
    <div class="lx-ent-tit"><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${body}
    <p class="lx-ent-rodape"><a href="https://wa.me/${WHATS}?text=${encodeURIComponent(WHATS_MSG)}" target="_blank" rel="noopener">Não tenho cadastro: pedir pelo WhatsApp</a><span aria-hidden="true">·</span><a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
  </div></section></div>`;
const campo = (id, label, attrs = '') => `<div class="field lx-campo"><label for="${id}">${label}</label><input id="${id}" ${attrs}></div>`;
const campoSenha = (id, label, attrs = '') => `<div class="field lx-campo"><label for="${id}">${label}</label><div class="lx-senha"><input id="${id}" type="password" ${attrs}><button type="button" class="lx-olho" data-act="verSenha" aria-label="Mostrar a senha" aria-pressed="false">${IC.olho}</button></div></div>`;
const LOGIN = {
  manut: () => card(`<div class="lp-manut">${IC.ferram}<p>${esc(MANUT ? MANUT.message : 'Voltamos em breve.')}</p>${MANUT && MANUT.extra && MANUT.extra.prev ? `<p class="small muted">Previsão de volta: ${esc(fmtPrev(MANUT.extra.prev))}</p>` : ''}
    <button class="lx-btn grande" data-act="manutTentar">Tentar de novo</button>${token() ? '<button class="lx-link" data-act="sair">Sair</button>' : ''}</div>`, 'Portal em manutenção', ''),
  entrar: () => card(`${EST && EST.estado !== 'ativo' ? `<div class="note warn" style="text-align:left"><b>Portal em manutenção</b><span>${esc(EST.texto)}${EST.prev ? ' Previsão: ' + esc(fmtPrev(EST.prev)) + '.' : ''} Só a equipe da biblioteca consegue entrar agora.</span></div>` : ''}<form class="lx-form" data-form="entrar">
      ${campo('l-cpf', 'CPF', `inputmode="numeric" autocomplete="username" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      ${campoSenha('l-senha', 'Senha', 'autocomplete="current-password"')}
      <button class="lx-btn grande">Entrar ${IC.arrow}</button></form>
    <button class="lx-link" data-act="ir" data-v="codigo">Primeiro acesso ou esqueci a senha</button>`),
  codigo: () => card(`<form class="lx-form" data-form="codigo">
      ${campo('c-cpf', 'CPF', `inputmode="numeric" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      <button class="lx-btn grande">Enviar código por e-mail</button></form>
    <div class="lx-ent-links"><button class="lx-link" data-act="ir" data-v="senha">Já tenho um código</button><button class="lx-link" data-act="ir" data-v="entrar">${IC.left} Voltar</button></div>
    <p class="lx-ent-nota">Sem e-mail no cadastro? Associados da casa podem informar o e-mail na próxima tela; os demais leitores pedem o código a um operador da biblioteca.</p>`,
    'Primeiro acesso', 'Vamos enviar um código para o e-mail do seu cadastro. Com ele você cria (ou troca) a sua senha.'),
  email: () => card(`<form class="lx-form" data-form="email">
      ${campo('e-nasc', 'Data de nascimento', `type="date" max="${hoje()}"`)}
      ${campo('e-email', 'Seu e-mail', 'type="email" autocomplete="email" maxlength="150"')}
      ${campo('e-email2', 'Repita o e-mail', 'type="email" autocomplete="email" maxlength="150"')}
      <button class="lx-btn grande">Salvar e-mail e enviar código</button></form>
    <div class="lx-ent-links"><button class="lx-link" data-act="ir" data-v="codigo">${IC.left} Voltar</button></div>`,
    'Confirme seus dados', 'Seu cadastro ainda não tem e-mail. Informe a sua data de nascimento (a mesma do cadastro na Secretaria) e o e-mail que quer usar. Ele fica salvo no seu cadastro e o código chega nele.'),
  senha: () => card(`<form class="lx-form" data-form="senha">
      ${campo('s-cpf', 'CPF', `inputmode="numeric" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      ${campo('s-cod', 'Código de 6 dígitos', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"')}
      ${campoSenha('s-senha', 'Nova senha (mínimo 6 caracteres)', 'autocomplete="new-password" minlength="6" maxlength="64"')}
      ${campoSenha('s-senha2', 'Repita a senha', 'autocomplete="new-password" maxlength="64"')}
      <button class="lx-btn grande">Salvar senha e entrar</button></form>
    <div class="lx-ent-links"><button class="lx-link" data-act="ir" data-v="entrar">${IC.left} Voltar</button></div>`,
    'Criar a sua senha', 'Digite o código que chegou no seu e-mail (confira também a caixa de spam).'),
};

/* ---------- moldura (versão 2.0): barra de navegação translúcida no topo, barra de abas flutuante no celular e menu da conta ---------- */
const PAGINAS = () => [['inicio', 'Início', IC.home], ['catalogo', 'Catálogo Físico', IC.book], ['virtual', 'Biblioteca Virtual', IC.pdf, '', !D.leitor.emDia], ['cantigas', 'Cantigas', IC.music]].filter(x => modVer(x[0]));
const navBtn = ([id, label, icon, soon, tranca]) => `<button class="lp-nav" data-act="pg" data-pg="${id}" ${PG === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span>${soon ? '<span class="soon">em breve</span>' : ''}${tranca ? `<span class="lp-tranca" title="Exclusivo para associados">${IC.lock}<span class="sr"> (exclusivo para associados)</span></span>` : ''}</button>`;
const iniciais = n => String(n || '').trim().split(/\s+/).filter(p => p.length > 2 || /^[A-ZÀ-Ú]/.test(p)).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '•';
function contaMenu() {
  const l = D.leitor, t = TEMA.get(), fi = fonteIdx();
  return `<div class="lp-sheet lx-conta" data-act="menuFechar"><div class="lx-conta-box" role="dialog" aria-modal="true" aria-label="Minha conta">
    <div class="lx-conta-quem"><span class="lx-avatar grande" aria-hidden="true">${esc(iniciais(l.nome))}</span><div><b>${esc(l.nome)}</b><span>${l.associado ? 'Associado(a) da casa' : 'Leitor(a) da biblioteca'}</span></div></div>
    <div class="lx-conta-lista">${[['perfil', 'Meu perfil', IC.user], ['ajuda', 'Ajuda', IC.help]].map(navBtn).join('')}<button class="lp-nav" data-act="atualizar">${IC.ref}<span>Atualizar os dados</span></button></div>
    <div class="lx-conta-bloco"><span class="lx-conta-rot">Tamanho da letra</span><div class="lx-seg" role="group" aria-label="Tamanho da letra"><button type="button" data-act="fonte" data-d="-1" aria-label="Diminuir a letra" ${fi === 0 ? 'disabled' : ''}>A−</button><span aria-live="polite">${Math.round(FONTES[fi] * 100)}%</span><button type="button" data-act="fonte" data-d="1" aria-label="Aumentar a letra" ${fi === FONTES.length - 1 ? 'disabled' : ''}>A+</button></div></div>
    <div class="lx-conta-bloco"><span class="lx-conta-rot">Aparência</span><div class="lx-seg tema" role="group" aria-label="Tema">${Object.keys(TEMA.nomes).map(k => `<button type="button" data-act="tema" data-t="${k}" aria-pressed="${t === k}">${TEMA.nomes[k]}</button>`).join('')}</div></div>
    <button class="lp-nav lx-sair" data-act="sair">${IC.out}<span>Sair</span></button></div></div>`;
}
function rodape() {
  return `<footer class="lx-rodape"><div class="lx-rodape-in">
    <div class="lx-rodape-marca"><img src="${LOGO}" alt=""><div><b>Biblioteca Luzes de Aruanda</b><span>Associação Centro de Umbanda Luzes de Aruanda</span></div></div>
    <div class="lx-rodape-cols"><div><b>Explorar</b>${PAGINAS().map(([id, label]) => `<button class="lx-link" data-act="pg" data-pg="${id}">${label}</button>`).join('')}</div>
      <div><b>Atendimento</b><a href="https://wa.me/${WHATS}" target="_blank" rel="noopener">WhatsApp (54) 9 9616-4144</a><a href="https://www.instagram.com/luzesdearuanda/" target="_blank" rel="noopener">Instagram @luzesdearuanda</a><button class="lx-link" data-act="pg" data-pg="ajuda">Ajuda</button></div>
      <div><b>Endereço</b><span>Rua Napoleão Mojen, 48 · Planaltina</span><span>Passo Fundo/RS · CEP 99062-260</span></div></div>
    <p class="lx-rodape-fim">© ${new Date().getFullYear()} Associação Centro de Umbanda Luzes de Aruanda · <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p></div></footer>`;
}
function moldura(conteudo) {
  const tabs = [['inicio', 'Início', IC.home], ['catalogo', 'Catálogo', IC.book], ['virtual', 'Virtual', IC.pdf], ['cantigas', 'Cantigas', IC.music]].filter(x => modVer(x[0])).concat([['perfil', 'Perfil', IC.user]]);
  const lendo = PG === 'virtual' && LV;
  return `<a class="lp-pular" href="#conteudo">Pular para o conteúdo</a><div class="lx-shell${lendo ? ' lendo' : ''}">
    <header class="lx-nav"><div class="lx-nav-in">
      <button class="lx-marca" data-act="pg" data-pg="inicio" aria-label="Início"><img src="${LOGO}" alt=""><span><b>Luzes de Aruanda</b><small>Biblioteca</small></span></button>
      <nav class="lx-links" aria-label="Principal">${PAGINAS().map(([id, label, , , tranca]) => `<button data-act="pg" data-pg="${id}" ${PG === id ? 'aria-current="page"' : ''}>${label}${tranca ? `<span class="lx-cad" title="Exclusivo para associados">${IC.lock}<span class="sr"> (exclusivo para associados)</span></span>` : ''}</button>`).join('')}</nav>
      <div class="lx-acoes">${modVer('catalogo') ? `<button class="lx-ic" data-act="buscar" aria-label="Buscar no catálogo" title="Buscar no catálogo">${IC.search}</button>` : ''}<button class="lx-ic lx-aa" data-act="menu" aria-label="Tamanho da letra e aparência" title="Tamanho da letra e aparência">Aa</button>
        <button class="lx-avatar" data-act="menu" aria-haspopup="dialog" aria-expanded="${MENU}" aria-label="Minha conta" title="Minha conta">${esc(iniciais(D.leitor.nome))}</button></div>
    </div></header>
    <main class="lp-main lx-main${lendo ? ' lv-on' : ''}" id="conteudo" tabindex="-1"><div class="lx-pag">${conteudo}</div>${lendo ? '' : rodape()}</main>
    <nav class="lx-tabbar" aria-label="Navegação"><div>${tabs.map(([id, label, icon]) => `<button data-act="pg" data-pg="${id}" ${PG === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`).join('')}</div></nav>
    ${MENU ? contaMenu() : ''}
  </div>`;
}
const cabecalho = (titulo, sub) => `<header class="lp-head lx-cab"><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;

/* ---------- capas (versão 2.0): capa tipográfica quando o livro não tem foto da capa ---------- */
const CAPA_COR = { UMB: ['#1d3a63', '#e9d9b0'], AFR: ['#8a3f22', '#f6e3c4'], ESP: ['#2f3f7a', '#e4e7f7'], ESO: ['#4d2d63', '#eadcf2'], FIL: ['#33434f', '#e3e8eb'], HIS: ['#6b4b26', '#f2e5cc'], BIO: ['#245a5a', '#dcefed'], LBR: ['#5a2a2a', '#f3dede'], LES: ['#2d5266', '#dfecf3'], POE: ['#7a2f4a', '#f6dfe8'], INF: ['#a4661c', '#fff1d6'], AUT: ['#3c5a2a', '#e4f0da'], ERV: ['#2f5d38', '#e2f0df'] };
function capaCor(g, t) { if (CAPA_COR[g]) return CAPA_COR[g]; const v = Object.values(CAPA_COR); let h = 0; for (const c of String(g || t || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return v[h % v.length]; }
const capaTxt = (t, a, g) => { const [bg, ink] = capaCor(g, t); return `<span class="lx-capa-txt" style="--cb:${bg};--ci:${ink}"><span class="lx-ct-g">${esc(g ? genNome(g) : 'Biblioteca')}</span><b>${esc(t)}</b><span class="lx-ct-orn" aria-hidden="true"></span><i>${esc(a || '')}</i></span>`; };
function capaFalha(img) { img.replaceWith(document.createRange().createContextualFragment(capaTxt(img.dataset.t, img.dataset.a, img.dataset.g))); }

/* ---------- início (versão 2.0): vitrine editorial ---------- */
const recentes = (l, k) => l.slice().sort((a, b) => String(b[k] || '').localeCompare(String(a[k] || '')));
function leque(lista) {
  const it = lista.slice(0, 5); if (!it.length) return '';
  return `<div class="lx-leque n${it.length}">${it.map((x, i) => `<span class="lx-leque-it i${i}">${x.img ? `<img src="${esc(x.img)}" alt="" data-t="${esc(x.t)}" data-a="${esc(x.a)}" data-g="${esc(x.g)}" onerror="capaFalha(this)">` : capaTxt(x.t, x.a, x.g)}</span>`).join('')}</div>`;
}
const capaUrl = o => o.capa ? o.capa : isbnLimpo(o.isbn).length >= 10 ? `https://covers.openlibrary.org/b/isbn/${isbnLimpo(o.isbn)}-M.jpg?default=false` : '';
const dispCurto = o => o.disp ? (o.disp === 1 ? '1 disponível' : `${o.disp} disponíveis`) : 'Emprestado';
function prateleira(id, titulo, itens, mais) {
  if (!itens.length) return '';
  return `<section class="lx-sec"><header class="lx-sec-cab"><h2>${titulo}</h2>${mais || ''}</header>
    <div class="lx-prat-wrap"><button class="lx-seta e" data-act="rolar" data-alvo="${id}" data-d="-1" aria-label="Voltar a lista">${IC.left}</button>
      <div class="lx-prat" id="${id}" role="list">${itens.join('')}</div>
      <button class="lx-seta d" data-act="rolar" data-alvo="${id}" data-d="1" aria-label="Avançar a lista">${IC.right}</button></div></section>`;
}
const itemPrat = (act, id, img, t, a, g, tag, linha, extra) => `<div class="lx-pi" role="listitem"><button class="lx-pi-bt" ${act} data-id="${id}">
  <span class="lx-pi-capa">${img ? `<img src="${esc(img)}" alt="" loading="lazy" data-t="${esc(t)}" data-a="${esc(a)}" data-g="${esc(g)}" onerror="capaFalha(this)">` : capaTxt(t, a, g)}${tag ? `<span class="lx-selo">${tag}</span>` : ''}</span>
  <span class="lx-pi-tx"><b>${esc(t)}</b><span>${esc(a || 'Autor não informado')}</span>${linha || ''}</span></button>${extra || ''}</div>`;
function inicio() {
  const l = D.leitor, novos = recentes(D.obras, 'desde').slice(0, 14), digs = l.emDia && modOk('virtual') ? (D.digNovos || []) : [];
  const capas = digs.filter(d => d.capa).map(d => ({ img: d.capa, t: d.titulo, a: d.autor, g: d.genero })).concat(novos.map(o => ({ img: capaUrl(o), t: o.titulo, a: o.autor, g: o.genero })));
  const comigo = D.emprestimos.filter(x => !x.dataDev).sort((a, b) => String(a.dataPrev).localeCompare(String(b.dataPrev))), pedidos = D.solicitacoes.filter(s => s.status === 'pendente'), h = hoje();
  const gens = {}; D.obras.forEach(o => { const g = o.genero || '_'; gens[g] = (gens[g] || 0) + 1; });
  const temas = Object.keys(gens).filter(g => g !== '_').sort((a, b) => gens[b] - gens[a] || genNome(a).localeCompare(genNome(b), 'pt-BR'));
  const dispN = D.obras.filter(o => o.disp).length, nDig = D.digitaisTotal || 0;
  const status = [];
  if (comigo.length) { const p = comigo[0], atr = p.dataPrev < h; status.push(`<button class="lx-st ${atr ? 'ruim' : ''}" data-act="pg" data-pg="perfil"><span class="lx-st-ic">${IC.book}</span><span><b>${comigo.length === 1 ? '1 livro com você' : comigo.length + ' livros com você'}</b><span>${p.pendente ? 'Falta assinar o protocolo' : `${atr ? 'Atrasado desde' : 'Devolver até'} ${fmtD(p.dataPrev)}`}</span></span>${IC.right}</button>`); }
  if (pedidos.length) status.push(`<button class="lx-st" data-act="pg" data-pg="perfil"><span class="lx-st-ic">${IC.relogio || IC.flag}</span><span><b>${pedidos.length === 1 ? '1 pedido aguardando' : pedidos.length + ' pedidos aguardando'}</b><span>Separado até ${fmtD(pedidos[0].expiraEm)}</span></span>${IC.right}</button>`);
  const caminho = (pg, cls, eyebrow, tit, txt, cta, art) => { const soon = pg === 'virtual' && !nDig, tr = pg === 'virtual' && !l.emDia && !soon;
    return `<article class="lx-cam ${cls}${soon ? ' breve' : ''}"><div class="lx-cam-tx"><p class="lx-eyebrow">${eyebrow}</p><h3>${tit}</h3><p>${txt}</p>
      ${soon ? '<span class="lx-pill">Em breve</span>' : tr ? `<button class="lx-cam-cta" data-act="pg" data-pg="virtual">${IC.lock} Exclusivo para associados</button>` : `<button class="lx-cam-cta" data-act="pg" data-pg="${pg}">${cta} ${IC.right}</button>`}</div><div class="lx-cam-arte" aria-hidden="true">${art}</div></article>`; };
  const cams = [
    modVer('catalogo') && caminho('catalogo', 'fisico', 'Catálogo físico', 'Retire na biblioteca.', `${D.obras.length} ${D.obras.length === 1 ? 'livro' : 'livros'} no acervo · ${dispN} ${dispN === 1 ? 'disponível' : 'disponíveis'} agora.`, 'Explorar o catálogo', ART.books),
    modVer('virtual') && caminho('virtual', 'virtual', 'Biblioteca Virtual', 'Leia onde estiver.', nDig ? `${nDig} ${nDig === 1 ? 'livro digital' : 'livros digitais'} para ler na tela, com marcador de onde parou.` : 'Livros digitais para ler na tela.', 'Abrir a biblioteca', ART.tablet),
    modVer('cantigas') && caminho('cantigas', 'cantigas', 'Cantigas', 'Ouça, assista e cante.', 'Pontos com letra, áudio e vídeo, organizados por linha e toque.', 'Ver as cantigas', ART.drum),
  ].filter(Boolean);
  const pend = pendentes();
  const novosItens = novos.map(o => itemPrat('data-act="verObra"', o.id, capaUrl(o), o.titulo, o.autor, o.genero, o.digital ? 'Também digital' : '', `<span class="lx-disp ${o.disp ? 'ok' : ''}"><i></i>${pend.has(o.id) ? 'Pedido feito' : dispCurto(o)}</span>`));
  const digItens = digs.map(d => itemPrat('data-act="dVer"', d.id, d.capa, d.titulo, d.autor, d.genero, 'Digital', '<span class="lx-disp ok"><i></i>Ler agora</span>'));
  const cants = modOk('cantigas') ? (D.novasCantigas || []) : [];
  return `<section class="lx-hero">
      <div class="lx-hero-tx"><p class="lx-eyebrow">Olá, ${esc(l.primeiroNome)}</p>
        <h1>Conhecimento também é <em>caminho de luz.</em></h1>
        <p class="lx-lead">Livros, leituras digitais e cantigas da nossa casa, reunidos para você explorar no seu tempo.</p>
        ${modVer('catalogo') ? `<form class="lx-busca" data-form="buscaGeral" role="search"><label for="bg-q" class="sr">Buscar no catálogo</label>${IC.search}<input id="bg-q" type="search" placeholder="Buscar por título, autor ou editora" autocomplete="off"><button class="lx-btn">Buscar</button></form>
        ${temas.length ? `<div class="lx-sug"><span>Sugestões:</span>${temas.slice(0, 4).map(g => `<button data-act="irGen" data-id="${esc(g)}">${esc(genNome(g))}</button>`).join('')}</div>` : ''}` : ''}</div>
      <div class="lx-hero-arte" aria-hidden="true"><div class="lx-luz"></div>${leque(capas)}</div>
    </section>
    ${D.bloqueios.length ? `<div class="note warn lx-aviso"><b>No momento você não pode retirar livros</b><span>${D.bloqueios.map(esc).join(' ')}</span></div>` : ''}
    ${status.length ? `<section class="lx-status" aria-label="Seus livros e pedidos">${status.join('')}</section>` : ''}
    <section class="lx-sec"><header class="lx-sec-cab"><h2>Por onde começar.</h2></header><div class="lx-caminhos n${cams.length}">${cams.join('')}</div></section>
    ${modVer('catalogo') ? prateleira('dest', 'Chegaram ao acervo.', novosItens, `<button class="lx-mais" data-act="pg" data-pg="catalogo">Ver o catálogo ${IC.right}</button>`) : ''}
    ${prateleira('dest2', 'Novos na Biblioteca Virtual.', digItens, `<button class="lx-mais" data-act="pg" data-pg="virtual">Ver todos ${IC.right}</button>`)}
    ${temas.length && modVer('catalogo') ? `<section class="lx-sec"><header class="lx-sec-cab"><h2>Explore por tema.</h2></header>
      <div class="lx-temas">${temas.map(g => `<button class="lx-tema" data-act="irGen" data-id="${esc(g)}" style="--tc:${capaCor(g)[0]}"><span class="lx-tema-ic">${iconeGen(g)}</span><b>${esc(genNome(g))}</b><span>${gens[g]} ${gens[g] === 1 ? 'livro' : 'livros'}</span></button>`).join('')}</div></section>` : ''}
    ${cants.length ? `<section class="lx-sec"><header class="lx-sec-cab"><h2>Cantigas novas.</h2><button class="lx-mais" data-act="pg" data-pg="cantigas">Ver todas ${IC.right}</button></header>
      <div class="lx-cants">${cants.map(c => `<button class="lx-cant" data-act="verCantiga" data-id="${c.id}"><span class="lx-cant-ic">${c.video || c.audio ? IC.play : IC.letra}</span><span><b>${esc(c.titulo)}</b><span>${c.video && c.audio ? 'Vídeo e áudio' : c.video ? 'Vídeo' : c.audio ? 'Áudio' : 'Letra'}</span></span></button>`).join('')}</div></section>` : ''}
    <section class="lx-sec lx-sobre"><div class="lx-sobre-tx"><p class="lx-eyebrow">Como funciona</p><h2>Do pedido à leitura, em três passos.</h2>
        <p>A biblioteca da Associação Centro de Umbanda Luzes de Aruanda reúne livros sobre Umbanda, cultura afro-brasileira, espiritualidade e temas afins. Pelo portal você escolhe, pede e acompanha tudo.</p></div>
      <ol class="lx-passos"><li><span class="lx-passo-n">1</span><b>Escolha o livro</b><span>Encontre a obra no catálogo e toque em “Pedir retirada”.</span></li>
        <li><span class="lx-passo-n">2</span><b>Separamos para você</b><span>O livro fica reservado por ${D.config.diasSolicitacao} ${D.config.diasSolicitacao === 1 ? 'dia' : 'dias'}. A biblioteca confirma o pedido.</span></li>
        <li><span class="lx-passo-n">3</span><b>Retire e assine</b><span>Assine o protocolo (pode ser pelo gov.br). Você fica com o livro por ${D.config.prazo} dias.</span></li></ol></section>`;
}

/* ---------- gêneros (versão 1.9): ícone automático pelo nome do gênero, no mesmo painel das cantigas ---------- */
Object.assign(IC, {
  info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', 2),
  pausa: sv('<path d="M8 5v14M16 5v14"/>', 2.6), parar: sv('<rect x="6" y="6" width="12" height="12" rx="1.5"/>', 2),
  contraste: sv('<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>')
});
const GEN_SVG = {
  luz: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lampada: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  pena: '<path d="M20 4c-7 0-12 5-13 12l-3 4"/><path d="M20 4c0 7-5 12-12 12"/><path d="M8 16l5-5"/>',
  balao: '<path d="M4 5h16v11H9l-5 4z"/>'
};
const GEN_RE = [[/umbanda/, 'estrela'], [/candombl|afro|africa|orixa/, 'tambor'], [/espirit|kardec/, 'luz'], [/esoter|ocult|mistic|tarot|astrolog/, 'lotus'], [/filosof/, 'lampada'], [/histor/, 'relogio'], [/biograf|memori/, 'pessoa'], [/estrangeir|mundial|traduz/, 'globo'], [/poesia|poema|poetic/, 'pena'], [/infant|juvenil|crianc/, 'balao'], [/auto.?ajuda|desenvolvimento pessoal|autoconhec/, 'coracao'], [/religi|catolic|biblia|evangel|crist/, 'vela'], [/natur|erva|planta|saude/, 'folha'], [/literatura|romance|brasileir|conto/, 'livro']];
const GEN_SIG = { UMB: 'estrela', AFR: 'tambor', ESP: 'luz', ESO: 'lotus', FIL: 'lampada', HIS: 'relogio', BIO: 'pessoa', LBR: 'livro', LES: 'globo', POE: 'pena', INF: 'balao', AUT: 'coracao' };
const genNome = s => !s || s === '_' ? 'Sem gênero' : ((D.generos || []).find(g => g.sigla === s) || { nome: s }).nome;
function iconeGen(s) { const k = (GEN_RE.find(([re]) => re.test(norm(genNome(s)))) || [])[1] || GEN_SIG[String(s).toUpperCase()] || 'livro'; return sv(GEN_SVG[k] || ICONES_SEC[k]); }
const naGen = (x, g) => !g || (g === '_' ? !x.genero : x.genero === g);
function painelGen(lista, sel, act, tudo) {
  const n = {}; lista.forEach(x => { const g = x.genero || '_'; n[g] = (n[g] || 0) + 1; });
  const gens = Object.keys(n).sort((a, b) => (a === '_') - (b === '_') || genNome(a).localeCompare(genNome(b), 'pt-BR'));
  const item = (g, nome, ic, q) => `<button type="button" class="ct-sec" data-act="${act}" data-id="${g}" aria-pressed="${sel === g}">${ic}<span>${esc(nome)}</span><span class="ct-n">${q}<span class="sr"> ${q === 1 ? 'livro' : 'livros'}</span></span></button>`;
  return `<nav class="ct-secoes" aria-label="Gêneros"><div class="ct-sec-tit">${IC.camadas}<b>Gêneros</b></div>${item('', tudo, IC.book, lista.length)}${gens.map(g => item(g, genNome(g), iconeGen(g), n[g])).join('')}</nav>`;
}
const ordenar = (l, ord, data) => l.sort((a, b) => ord === 'autor' ? (a.autor || '').localeCompare(b.autor || '', 'pt-BR') || a.titulo.localeCompare(b.titulo, 'pt-BR')
  : ord === 'recentes' ? String(data(b) || '').localeCompare(String(data(a) || '')) || a.titulo.localeCompare(b.titulo, 'pt-BR') : a.titulo.localeCompare(b.titulo, 'pt-BR'));
const selOrd = (k, v) => `<select data-ch="${k}" aria-label="Ordenar"><option value="">Ordenar: título (A–Z)</option><option value="autor" ${v === 'autor' ? 'selected' : ''}>Ordenar: autor (A–Z)</option><option value="recentes" ${v === 'recentes' ? 'selected' : ''}>Ordenar: mais recentes</option></select>`;
const contTxt = (n, g) => `<p class="small muted ct-cont">${n} ${n === 1 ? 'livro encontrado' : 'livros encontrados'}${g ? ` em “${esc(genNome(g))}”` : ''}</p>`;
const tituloCard = (t, act, id) => `<h3 class="ct-t"><button type="button" class="ct-tlink" data-act="${act}" data-id="${id}">${esc(t)}</button></h3>`;

/* ---------- catálogo físico (versão 2.0): busca em destaque, temas em chips (gaveta no celular), grade de capas e tela do livro ---------- */
const isbnLimpo = s => String(s || '').replace(/[^0-9Xx]/g, '');
const capaObra = (o, grande) => { const u = capaUrl(o).replace(/-M\.jpg/, grande ? '-L.jpg' : '-M.jpg'); return u ? `<img src="${esc(u)}" alt="${grande ? 'Capa de ' + esc(o.titulo) : ''}" loading="lazy" data-t="${esc(o.titulo)}" data-a="${esc(o.autor)}" data-g="${esc(o.genero)}" onerror="capaFalha(this)">` : capaTxt(o.titulo, o.autor, o.genero); };
const pendentes = () => new Set(D.solicitacoes.filter(s => s.status === 'pendente').map(s => s.obraId));
const dispTxt = o => o.disp ? `Disponíveis: ${o.disp} de ${o.total}` : o.total === 1 ? 'Emprestado no momento' : 'Todos emprestados no momento';
const pedirBt = (o, pend, grande) => !modOk('pedidos') ? '' : pend.has(o.id) ? '<span class="lx-pill aviso">Pedido feito</span>' : o.disp && !D.bloqueios.length ? `<button class="lx-btn${grande ? ' grande' : ' mini'}" data-act="pedir" data-id="${o.id}" aria-label="Pedir retirada de ${esc(o.titulo)}">${grande ? IC.book : ''}<span>Pedir retirada</span></button>` : '';
const obrasFiltradas = () => { const q = norm(F.q); return ordenar(D.obras.filter(o => naGen(o, F.g) && (F.disp !== 'sim' || o.disp) && (!q || norm(`${o.titulo} ${o.autor} ${o.editora}`).includes(q))), F.ord, o => o.desde); };
function chipsGen(lista, sel, act, tudo) {
  const n = {}; lista.forEach(x => { const g = x.genero || '_'; n[g] = (n[g] || 0) + 1; });
  const gens = Object.keys(n).sort((a, b) => (a === '_') - (b === '_') || genNome(a).localeCompare(genNome(b), 'pt-BR'));
  const chip = (g, nome, q) => `<button type="button" class="lx-chip" data-act="${act}" data-id="${g}" aria-pressed="${sel === g}">${esc(nome)}<span>${q}</span></button>`;
  return `<div class="lx-chips" role="group" aria-label="Temas">${chip('', tudo, lista.length)}${gens.map(g => chip(g, genNome(g), n[g])).join('')}</div>`;
}
function listaObras() {
  const l = obrasFiltradas(), pend = pendentes(), cont = contTxt(l.length, F.g);
  if (!l.length) return cont + `<div class="lx-vazio">${IC.search}<b>Nenhum livro encontrado</b><span>Tente outra palavra, outro tema ou mostre também os emprestados.</span>${F.q || F.g || F.disp ? '<button class="lx-link" data-act="oLimpar">Limpar a busca e os filtros</button>' : ''}</div>`;
  return cont + `<div class="lx-grade">${l.slice(0, 300).map(o => `<article class="lx-livro" id="obra-${o.id}">
    <button class="lx-livro-capa" data-act="oVer" data-id="${o.id}" tabindex="-1" aria-hidden="true">${capaObra(o)}${o.digital ? '<span class="lx-selo">Também digital</span>' : ''}</button>
    <div class="lx-livro-tx">${tituloCard(o.titulo, 'oVer', o.id)}<p class="lx-autor">${esc(o.autor || 'Autor não informado')}</p>
      <p class="lx-disp ${o.disp ? 'ok' : ''}"><i></i>${pend.has(o.id) ? 'Pedido feito' : dispCurto(o)}</p></div>
    ${pend.has(o.id) ? '' : pedirBt(o, pend)}</article>`).join('')}</div>`;
}
const avisoBloqueio = () => D.bloqueios.length ? `<div class="note warn lx-aviso"><b>No momento você não pode retirar livros</b><span>${D.bloqueios.map(esc).join(' ')}</span></div>` : '';
function catalogo() {
  if (!modOk('catalogo')) return manutPagina('catalogo', 'Catálogo Físico');
  if (F.id) { const o = D.obras.find(x => x.id === F.id); if (o) return obraTela(o); F.id = ''; }
  return `${cabecalho('Catálogo físico', 'Encontre um livro e peça a retirada. A biblioteca separa para você e confirma o pedido.')}
    ${avisoAdm('catalogo')}<div class="lx-filtros">
      <label class="lx-campo-busca"><span class="sr">Buscar no catálogo</span>${IC.search}<input id="q" data-in="q" type="search" value="${esc(F.q)}" placeholder="Buscar por título, autor ou editora" autocomplete="off"></label>
      <div class="lx-filtros-linha">${gavBt('gen', F.g ? genNome(F.g) : 'Todos', () => painelGen(D.obras, F.g, 'oGen', 'Todos os livros'))}
        <label class="lx-toggle"><input type="checkbox" data-ch="odispck" ${F.disp === 'sim' ? 'checked' : ''}><span class="lx-toggle-sw" aria-hidden="true"></span><span class="lx-tg-txt">Só disponíveis</span><span class="lx-tg-curto" aria-hidden="true">Disponíveis</span></label>
        <label class="lx-ord"><span class="sr">Ordenar</span>${selOrd('oord', F.ord)}</label></div>
      ${chipsGen(D.obras, F.g, 'oGen', 'Todos')}</div>
    ${avisoBloqueio()}<div id="lista">${listaObras()}</div>`;
}
function obraTela(o) {
  const dados = [['Editora', o.editora], ['Ano', o.ano], ['Edição', o.edicao], ['Gênero', o.genero && genNome(o.genero)], ['Idioma', o.idioma], ['ISBN', o.isbn], ['No acervo desde', fmtD(o.desde)]].filter(x => x[1]);
  const pend = pendentes(), mesmos = D.obras.filter(x => x.id !== o.id && x.genero && x.genero === o.genero).slice(0, 12);
  const u = capaUrl(o);
  return `<div class="lx-voltar ct-topo"><button class="lx-link" data-act="oVoltar">${IC.left} Catálogo físico</button></div>
    <article class="lx-det"><div class="lx-det-capa">${u ? `<div class="lx-det-fundo" style="background-image:url('${esc(u).replace(/'/g, '%27')}')"></div>` : ''}<div class="lx-det-livro">${capaObra(o, true)}</div></div>
      <div class="lx-det-info">${o.genero ? `<p class="lx-eyebrow">${esc(genNome(o.genero))}</p>` : ''}<h1 id="tela-tit" tabindex="-1">${esc(o.titulo)}</h1><p class="lx-det-autor">${esc(o.autor || 'Autor não informado')}</p>
        <div class="lx-det-acao"><p class="lx-disp grande ${o.disp ? 'ok' : ''}"><i></i>${pend.has(o.id) ? 'Você já pediu este livro' : dispTxt(o)}</p>${pedirBt(o, pend, true)}</div>${avisoBloqueio()}
        <dl class="lx-ficha">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Exemplares</dt><dd>${o.total} no acervo · ${o.disp} ${o.disp === 1 ? 'disponível' : 'disponíveis'}</dd></div></dl>
        <p class="lx-nota">Depois do pedido, o livro fica separado para você por ${D.config.diasSolicitacao} ${D.config.diasSolicitacao === 1 ? 'dia' : 'dias'}. Prazo de devolução: ${D.config.prazo} dias após a retirada.</p>
        ${o.digital ? `<div class="lx-tambem">${IC.pdf}<div><b>Também na Biblioteca Virtual</b><span>Você pode ler este livro agora mesmo, na tela.</span></div><button class="lx-btn claro" data-act="dVer" data-id="${o.digital}">Ler agora</button></div>` : ''}</div></article>
    ${prateleira('dest', `Mais de ${esc(genNome(o.genero))}.`, mesmos.map(x => itemPrat('data-act="oVer"', x.id, capaUrl(x), x.titulo, x.autor, x.genero, '', `<span class="lx-disp ${x.disp ? 'ok' : ''}"><i></i>${pend.has(x.id) ? 'Pedido feito' : dispCurto(x)}</span>`)))}`;
}

/* ---------- biblioteca virtual (1.7; visual 2.0): PDF lido só na tela, com o nome do leitor em marca d'água ---------- */
let DG = null, LV = null; const FD = { q: '', g: '', ord: '', comecei: false, id: '' };
const AUTZ_TXT = { 'Domínio público': 'Obra em domínio público.', 'Publicação própria da casa': 'Publicação da própria casa.', 'Autorizado pelo autor ou editora': 'Publicado com autorização do autor ou da editora.' };
const posDe = id => (DG && DG.pos && DG.pos[id]) || null;
const lerRot = d => { const p = posDe(d.id); return p && p.pag > 1 ? `Continuar da pág. ${p.pag}` : 'Ler'; };
const capaDig = (d, grande) => d.capa ? `<img src="${esc(d.capa)}" alt="${grande ? 'Capa de ' + esc(d.titulo) : ''}" data-t="${esc(d.titulo)}" data-a="${esc(d.autor)}" data-g="${esc(d.genero)}" onerror="capaFalha(this)">` : capaTxt(d.titulo, d.autor, d.genero);
const progresso = d => { const p = posDe(d.id); if (!p || !p.total) return ''; const pc = Math.min(100, Math.round(p.pag / p.total * 100)); return `<span class="bk-prog lx-prog" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100" aria-label="Lido: ${pc}%"><span style="width:${pc}%"></span></span>`; };
const digFiltrados = () => { const q = norm(FD.q); return ordenar(DG.digitais.filter(d => naGen(d, FD.g) && (!FD.comecei || posDe(d.id)) && (!q || norm(`${d.titulo} ${d.autor} ${d.descricao}`).includes(q))), FD.ord, d => d.criadoEm); };
function listaDigitais() {
  if (!DG.digitais.length) return `<div class="lx-vazio">${IC.pdf}<b>Ainda não há livros digitais</b><span>Volte em breve!</span></div>`;
  const l = digFiltrados(), cont = contTxt(l.length, FD.g);
  if (!l.length) return cont + `<div class="lx-vazio">${IC.search}<b>${FD.comecei ? 'Você ainda não começou nenhum livro com esses filtros' : 'Nenhum livro encontrado'}</b><span>Tente outra palavra ou outro tema.</span></div>`;
  return cont + `<div class="lx-grade">${l.map(d => { const p = posDe(d.id); return `<article class="lx-livro" id="dig-${d.id}">
    <button class="lx-livro-capa" data-act="dVer" data-id="${d.id}" tabindex="-1" aria-hidden="true">${capaDig(d)}${p ? `<span class="lx-selo">Pág. ${p.pag}${p.total ? ` de ${p.total}` : ''}</span>` : ''}</button>
    <div class="lx-livro-tx">${tituloCard(d.titulo, 'dVer', d.id)}<p class="lx-autor">${esc(d.autor || 'Autor não informado')}</p>${progresso(d)}</div>
    <button class="lx-btn mini" data-act="lvAbrir" data-id="${d.id}" aria-label="${lerRot(d)}: ${esc(d.titulo)}">${p && p.pag > 1 ? 'Continuar' : 'Ler'}</button></article>`; }).join('')}</div>`;
}
function continuarCard() {
  const l = DG.digitais.filter(d => posDe(d.id)).sort((a, b) => String(posDe(b.id).em).localeCompare(String(posDe(a.id).em))), d = l[0]; if (!d) return '';
  const p = posDe(d.id);
  return `<section class="lx-continuar" aria-label="Continuar de onde parei"><span class="lx-continuar-capa">${capaDig(d)}</span>
    <div class="lx-continuar-tx"><p class="lx-eyebrow">Continuar de onde parei</p><b>${esc(d.titulo)}</b><span>Página ${p.pag}${p.total ? ` de ${p.total}` : ''}${d.autor ? ' · ' + esc(d.autor) : ''}</span>${progresso(d)}</div>
    <button class="lx-btn" data-act="lvAbrir" data-id="${d.id}">${IC.pdf}<span>Continuar</span></button></section>`;
}
function digitalTela(d) {
  const p = posDe(d.id), fis = d.obraId && D.obras.find(o => o.id === d.obraId);
  const dados = [['Gênero', d.genero && genNome(d.genero)], ['Ano', d.ano], ['Autorização', d.autorizacao]].filter(x => x[1]);
  return `<div class="lx-voltar ct-topo"><button class="lx-link" data-act="dVoltar">${IC.left} Biblioteca Virtual</button></div>
    <article class="lx-det"><div class="lx-det-capa">${d.capa ? `<div class="lx-det-fundo" style="background-image:url('${esc(d.capa).replace(/'/g, '%27')}')"></div>` : ''}<div class="lx-det-livro">${capaDig(d, true)}</div></div>
      <div class="lx-det-info">${d.genero ? `<p class="lx-eyebrow">${esc(genNome(d.genero))}</p>` : ''}<h1 id="tela-tit" tabindex="-1">${esc(d.titulo)}</h1><p class="lx-det-autor">${esc(d.autor || 'Autor não informado')}</p>
        <div class="lx-det-acao col">${p ? `<div class="lx-det-prog"><span>Você parou na página ${p.pag}${p.total ? ` de ${p.total}` : ''}</span>${progresso(d)}</div>` : ''}
          <div class="lx-det-bts"><button class="lx-btn grande" data-act="lvAbrir" data-id="${d.id}">${IC.pdf}<span>${lerRot(d)}</span></button>${p && p.pag > 1 ? `<button class="lx-btn claro" data-act="lvAbrir" data-id="${d.id}" data-inicio="1">${IC.ref}<span>Do início</span></button>` : ''}<button class="lx-btn claro" data-act="lvAbrir" data-id="${d.id}" data-ouvir="1">${IC.fone}<span>Ouvir</span></button></div></div>
        ${d.descricao ? `<div class="lx-sobre-livro"><h2>Sobre o livro</h2><p>${esc(d.descricao).replace(/\n/g, '<br>')}</p></div>` : ''}
        <dl class="lx-ficha">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <p class="lx-nota">${esc(AUTZ_TXT[d.autorizacao] || '')} A leitura é feita só nesta tela e cada página mostra o nome de quem está lendo.</p>
        ${fis ? `<div class="lx-tambem fis">${IC.book}<div><b>Também no acervo físico</b><span>${dispTxt(fis)} para retirada.</span></div><button class="lx-btn claro" data-act="oVer" data-id="${fis.id}">Ver no catálogo</button></div>` : ''}
        <div>${probBt('livro', d.id, d.titulo)}</div></div></article>`;
}
function virtual() {
  if (!modOk('virtual')) return manutPagina('virtual', 'Biblioteca Virtual');
  if (!D.leitor.emDia) return trancaPagina();
  if (!DG) return cabecalho('Biblioteca Virtual') + '<p class="muted">Carregando…</p>';
  if (LV) { const d = LV.d; return `<div class="lv-topo"><button class="lx-link" data-act="lvFechar">${IC.left} ${FD.id ? 'Voltar ao livro' : 'Voltar aos livros'}</button><div class="lv-tit"><b>${esc(d.titulo)}</b><span class="small muted">${esc(d.autor || '')}</span></div>${probBt('livro', d.id, d.titulo, true)}</div>
      ${LV.pdf ? `<div class="lv-barra" role="toolbar" aria-label="Leitura"><button class="lp-btn light" data-act="lvPag" data-d="-1" aria-label="Página anterior">${IC.left}</button><span class="lv-ind"><input id="lv-ir" inputmode="numeric" value="${LV.pag}" aria-label="Página atual (digite para ir)"> de ${LV.total}</span><button class="lp-btn light" data-act="lvPag" data-d="1" aria-label="Próxima página">${IC.right}</button>
        <span class="lv-zoom"><button class="lp-btn light lv-ouvir" data-act="ttsAbrir" aria-pressed="${TTS.on}" aria-label="Ouvir em voz alta">${IC.fone}<span>Ouvir</span></button><button class="lp-btn light lv-modo" data-act="lvModo" title="Trocar o modo de leitura">${LV.modo === 'rolagem' ? IC.pagina + '<span>Página a página</span>' : IC.rolar + '<span>Rolagem contínua</span>'}</button><button class="lp-btn light" data-act="lvZoom" data-d="-1" aria-label="Diminuir o tamanho da página">−</button><button class="lp-btn light" data-act="lvZoom" data-d="1" aria-label="Aumentar o tamanho da página">+</button></span>
        <div id="lv-tts" class="lv-tts-box">${ttsPainel()}</div></div>
        ${LV.modo === 'rolagem' ? `<div class="lv-folha lv-rolo" id="lv-rolo">${Array.from({ length: LV.total }, (_, i) => `<div class="lv-pg" data-p="${i + 1}" style="aspect-ratio:${LV.ratio};width:${Math.round(LV.zoom * 100)}%;max-width:${Math.round(900 * LV.zoom)}px"><canvas role="img" aria-label="Página ${i + 1} de ${LV.total}"></canvas><span class="lv-num" aria-hidden="true">${i + 1}</span></div>`).join('')}</div>`
          : `<div class="lv-folha" id="lv-folha"><canvas id="lv-canvas" role="img" aria-label="Página ${LV.pag} de ${LV.total}"></canvas></div>`}<p class="small muted lv-aviso">Leitura só nesta tela. ${esc(AUTZ_TXT[d.autorizacao] || '')} Cada página mostra o nome de quem está lendo. Para ouvir o texto, use o botão “Ouvir”.</p>`
      : `<div class="lp-panel"><p id="lv-prog" role="status">Abrindo o livro…</p></div>`}`; }
  if (FD.id) { const d = DG.digitais.find(x => x.id === FD.id); if (d) return digitalTela(d); FD.id = ''; }
  return `${cabecalho('Biblioteca Virtual', 'Leia os livros digitais da biblioteca aqui mesmo, no celular ou no computador. O portal lembra onde você parou.')}
    ${avisoAdm('virtual')}${continuarCard()}<div class="lx-filtros">
      <label class="lx-campo-busca"><span class="sr">Buscar na Biblioteca Virtual</span>${IC.search}<input data-in="dq" type="search" value="${esc(FD.q)}" placeholder="Buscar por título, autor ou assunto" autocomplete="off"></label>
      <div class="lx-filtros-linha">${gavBt('gen', FD.g ? genNome(FD.g) : 'Todos', () => painelGen(DG.digitais, FD.g, 'dGen', 'Todos os livros'))}
        <label class="lx-toggle"><input type="checkbox" data-ch="dcom" ${FD.comecei ? 'checked' : ''}><span class="lx-toggle-sw" aria-hidden="true"></span><span class="lx-tg-txt">Só os que comecei</span><span class="lx-tg-curto" aria-hidden="true">Comecei</span></label>
        <label class="lx-ord"><span class="sr">Ordenar</span>${selOrd('dord', FD.ord)}</label></div>
      ${DG.digitais.length ? chipsGen(DG.digitais, FD.g, 'dGen', 'Todos') : ''}</div>
    <div id="dlista">${listaDigitais()}</div>`;
}

/* ---------- onde parei (versão 1.9): fica no servidor, para continuar em qualquer aparelho ---------- */
let POS_PEND = null, posTimer = null;
const agoraTxt = () => { const d = new Date(); return `${hoje()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function enviarPos(sair, timer) {
  if (!timer) fimLeitura(); clearTimeout(posTimer); const p = POS_PEND; POS_PEND = null; if (!p || !token()) return;
  try { fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'leitor.posicao', payload: Object.assign({ token: token() }, p) }), redirect: 'follow', keepalive: !!sair }).catch(() => { }); } catch (e) { }
}
function guardarPos() {
  if (!LV || !LV.pdf || !DG) return; const id = LV.d.id, ant = posDe(id); if (LV.vistas) LV.vistas.add(LV.pag);
  if (ant && ant.pag === LV.pag && ant.total === LV.total) return;
  (DG.pos = DG.pos || {})[id] = { pag: LV.pag, total: LV.total, em: agoraTxt() };
  POS_PEND = { id, pag: LV.pag, total: LV.total }; clearTimeout(posTimer); posTimer = setTimeout(() => enviarPos(false, true), 4000);
}
addEventListener('pagehide', () => enviarPos(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarPos(true); });

/* ---------- leitor audível (versão 1.9): a voz do próprio aparelho lê o texto do PDF, página por página ---------- */
const TTS = { on: false, lendo: false, pag: 0, partes: [], i: 0, gen: 0, vazias: 0, rate: +(ls.get('bibVel') || 1) || 1, voz: ls.get('bibVoz') || '' };
const temVoz = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const vozesPt = () => temVoz() ? speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)).sort((a, b) => (b.lang === 'pt-BR') - (a.lang === 'pt-BR')) : [];
if (temVoz()) speechSynthesis.onvoiceschanged = () => ttsAtualizar();
async function textoPag(n) {
  const tc = await (await LV.pdf.getPage(n)).getTextContent(); let s = '';
  tc.items.forEach(it => { s += it.str || ''; s += it.hasEOL ? '\n' : (it.str && !/\s$/.test(it.str) ? ' ' : ''); });
  return s.replace(/-\n(\p{Ll})/gu, '$1').replace(/\s+/g, ' ').trim();
}
// frases curtas: o Chrome corta falas longas, e assim a pausa recomeça da frase atual
const fatiar = t => { const out = []; (t.match(/[^.!?;:]+[.!?;:]*\s*/g) || []).forEach(f => { f = f.trim(); while (f.length > 220) { let k = f.lastIndexOf(' ', 220); if (k < 80) k = 220; out.push(f.slice(0, k)); f = f.slice(k).trim(); } if (f) out.push(f); }); return out; };
function ttsPainel() {
  if (!TTS.on) return '';
  if (!temVoz()) return '<p class="small muted lv-frase">Este navegador não tem leitura em voz alta. Tente pelo Chrome, Edge ou Safari atualizados.</p>';
  const vs = vozesPt(), pausado = !TTS.lendo && TTS.partes.length;
  return `<div class="lv-tts" role="group" aria-label="Leitura em voz alta">
    <button class="lp-btn ct-b" data-act="ttsPlay">${TTS.lendo ? IC.pausa + '<span>Pausar</span>' : IC.play + `<span>${pausado ? 'Continuar' : 'Ler em voz alta'}</span>`}</button>
    <button class="lp-btn light ct-b" data-act="ttsParar" ${TTS.lendo || pausado ? '' : 'disabled'}>${IC.parar}<span>Parar</span></button>
    <label class="small">Velocidade <select data-ch="ttsVel">${[0.75, 1, 1.25, 1.5, 1.75].map(v => `<option value="${v}" ${TTS.rate === v ? 'selected' : ''}>${String(v).replace('.', ',')}×</option>`).join('')}</select></label>
    ${vs.length > 1 ? `<label class="small">Voz <select data-ch="ttsVoz">${vs.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === TTS.voz ? 'selected' : ''}>${esc(v.name.replace(/^(Microsoft|Google) /, ''))}</option>`).join('')}</select></label>` : ''}
    <p class="small lv-frase" id="lv-frase" aria-live="off">${TTS.lendo || pausado ? `${TTS.lendo ? 'Lendo' : 'Pausado na'} página ${TTS.pag}…` : vs.length ? 'O livro é lido pela voz do seu aparelho, a partir da página em que você está.' : 'Seu aparelho não tem voz em português instalada; a leitura pode sair com sotaque.'}</p></div>`;
}
function ttsAtualizar() {
  const el = $('#lv-tts'); if (!el) return; const a = document.activeElement, f = a && el.contains(a) ? a.dataset.act || a.dataset.ch : null;
  el.innerHTML = ttsPainel(); if (f) { const b = el.querySelector(`[data-act="${f}"],[data-ch="${f}"]`); if (b) b.focus(); }
  const bt = $('[data-act=ttsAbrir]'); if (bt) bt.setAttribute('aria-pressed', TTS.on);
}
function marcarLendo(n) {
  document.querySelectorAll('.lendo').forEach(x => x.classList.remove('lendo')); if (!TTS.lendo) return;
  const el = LV && LV.modo === 'rolagem' ? $(`#lv-rolo [data-p="${n}"]`) : $('#lv-folha'); if (el) el.classList.add('lendo');
}
const ttsDestravar = () => { try { if (temVoz() && !TTS.ok) { speechSynthesis.speak(new SpeechSynthesisUtterance('')); TTS.ok = true; } } catch (e) { } }; // iPhone: a 1ª fala precisa nascer do toque
async function ttsLer(n, i = 0) {
  if (!LV || !LV.pdf || !TTS.lendo) return;
  if (n > LV.total) { ttsParar(); toast('Fim do livro.'); return; }
  const g = TTS.gen; let txt = ''; try { txt = await textoPag(n); } catch (e) { }
  if (g !== TTS.gen || !TTS.lendo) return;
  TTS.pag = n; if (n !== LV.pag) irPag(n);
  TTS.partes = fatiar(txt); TTS.i = i;
  if (!TTS.partes.length) { if (++TTS.vazias >= 3) { ttsParar(); toast('Estas páginas não têm texto para ler — o livro provavelmente foi escaneado como imagem.', 'bad'); return; } ttsLer(n + 1); return; }
  TTS.vazias = 0; ttsAtualizar(); marcarLendo(n); aviso(`Lendo a página ${n}`); ttsFalar(g);
}
function ttsFalar(g) {
  if (g !== TTS.gen || !TTS.lendo) return;
  if (TTS.i >= TTS.partes.length) { ttsLer(TTS.pag + 1); return; }
  const u = new SpeechSynthesisUtterance(TTS.partes[TTS.i]), vs = vozesPt(), v = vs.find(x => x.voiceURI === TTS.voz) || vs[0];
  u.lang = v ? v.lang : 'pt-BR'; u.rate = TTS.rate; if (v) u.voice = v;
  u.onend = () => { if (g === TTS.gen) { TTS.i++; ttsFalar(g); } };
  u.onerror = e => { if (g === TTS.gen && !/interrupted|canceled/.test(e.error)) { TTS.i++; ttsFalar(g); } };
  const fr = $('#lv-frase'); if (fr) fr.textContent = `Página ${TTS.pag}: “${TTS.partes[TTS.i]}”`;
  speechSynthesis.speak(u);
}
function ttsPlay() {
  if (!temVoz() || !LV || !LV.pdf) return;
  if (TTS.lendo) { TTS.lendo = false; TTS.gen++; speechSynthesis.cancel(); ttsAtualizar(); marcarLendo(0); return; } // pausa
  ttsDestravar(); speechSynthesis.cancel(); TTS.gen++; TTS.lendo = true; TTS.vazias = 0;
  if (TTS.partes.length && TTS.pag === LV.pag) { ttsAtualizar(); marcarLendo(TTS.pag); ttsFalar(TTS.gen); } else ttsLer(LV.pag);
}
function ttsParar() { TTS.lendo = false; TTS.partes = []; TTS.i = 0; TTS.gen++; if (temVoz()) speechSynthesis.cancel(); marcarLendo(0); ttsAtualizar(); }
function ttsFechar() { if (TTS.on || TTS.lendo) { ttsParar(); TTS.on = false; ttsAtualizar(); } }

/* ---------- acessibilidade (versão 1.9) ---------- */
const FONTES = [0.9, 1, 1.15, 1.3, 1.5];
const fonteIdx = () => { const i = parseInt(ls.get('bibFonte'), 10); return i >= 0 && i < FONTES.length ? i : 1; };
const aplicarFonte = () => document.documentElement.style.setProperty('--fz', FONTES[fonteIdx()]);
aplicarFonte();
const SUAVE = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
function aviso(msg) { let a = $('#aviso'); if (!a) { a = document.createElement('div'); a.id = 'aviso'; a.className = 'sr'; a.setAttribute('aria-live', 'polite'); document.body.appendChild(a); } a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 80); }
function focoTela() { window.scrollTo(0, 0); const h = $('#tela-tit') || $('.lp-main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); aviso(h.textContent); } }
function focoVolta(id) { const c = id && document.getElementById(id); const b = c && c.querySelector('.ct-tlink'); if (b) { b.focus({ preventScroll: true }); c.scrollIntoView({ block: 'center' }); } else focoTela(); }
let avisoTimer; const avisoLista = sel => { clearTimeout(avisoTimer); avisoTimer = setTimeout(() => { const c = $(sel + ' .ct-cont'); if (c) aviso(c.textContent); }, 700); };
const carregarScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Não foi possível abrir o leitor de PDF. Confira a internet e tente de novo.')); document.head.appendChild(s); });
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function abrirLivro(d, op = {}) {
  ttsFechar(); enviarPos();
  let modo = 'rolagem'; try { modo = localStorage.getItem('bibModo') || 'rolagem'; } catch (e) { }
  LV = { d, pdf: null, pag: 1, total: 0, zoom: 1, modo, ratio: '3/4' }; render(); window.scrollTo(0, 0);
  await carregarScript(PDFJS + 'pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
  const pedacos = [];
  for (let i = 0; i < d.partes; i++) {
    const r = await api('leitor.digitalParte', { token: token(), id: d.id, parte: i }, d.partes > 1 ? `Abrindo o livro… ${i + 1} de ${d.partes}` : 'Abrindo o livro…');
    if (!LV || LV.d.id !== d.id) return; const bin = atob(r.dados), u8 = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k); pedacos.push(u8);
  }
  const tam = pedacos.reduce((s, p) => s + p.length, 0), dados = new Uint8Array(tam); let o = 0; pedacos.forEach(p => { dados.set(p, o); o += p.length; });
  const pdf = await pdfjsLib.getDocument({ data: dados, isEvalSupported: false }).promise; if (!LV || LV.d.id !== d.id) return;
  let ult = 1; try { ult = +localStorage.getItem('bibPag_' + d.id) || 1; } catch (e) { }
  if (posDe(d.id)) ult = posDe(d.id).pag; if (op.inicio) ult = 1;
  const v1 = (await pdf.getPage(1)).getViewport({ scale: 1 });
  Object.assign(LV, { pdf, total: pdf.numPages, pag: Math.min(Math.max(1, ult), pdf.numPages), ratio: `${Math.round(v1.width)}/${Math.round(v1.height)}` }); render(); aviso(`Livro aberto na página ${LV.pag} de ${LV.total}`);
  LV.ini = Date.now(); LV.vistas = new Set([LV.pag]); reg('abrir', 'livro digital', d.id, d.titulo, 'página ' + LV.pag);
  if (op.ouvir) { TTS.on = true; ttsAtualizar(); ttsPlay(); }
}
// marca d'água (versão 1.7.1): logo do terreiro bem clarinho no centro + nome, parte do CPF e data no rodapé
const logoImg = new Image(); logoImg.src = LOGO;
function marcaDagua(ctx, w, h) {
  if (logoImg.complete && logoImg.naturalWidth) { const s = Math.min(w, h) * 0.62; ctx.save(); ctx.globalAlpha = 0.08; ctx.drawImage(logoImg, (w - s) / 2, (h - s) / 2, s, s); ctx.restore(); }
  const fs = Math.max(10, Math.round(w / 52)); ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#1c2533'; ctx.font = `${fs}px sans-serif`; ctx.textAlign = 'left';
  ctx.fillText(`${DG.marca} · ${hoje().split('-').reverse().join('/')}`, fs, h - fs); ctx.restore();
}
// desenha uma página do PDF num canvas com a largura pedida (em pixels de tela)
async function desenharEm(cv, num, larg) {
  if (cv._task) { try { cv._task.cancel(); } catch (e) { } }
  const page = await LV.pdf.getPage(num), base = page.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2), vp = page.getViewport({ scale: larg / base.width * dpr });
  cv.width = vp.width; cv.height = vp.height;
  const ctx = cv.getContext('2d'), task = cv._task = page.render({ canvasContext: ctx, viewport: vp });
  try { await task.promise; } catch (e) { return false; } cv._task = null;
  marcaDagua(ctx, vp.width, vp.height); return true;
}
const salvarPag = () => { try { localStorage.setItem('bibPag_' + LV.d.id, LV.pag); } catch (e) { } const ind = $('#lv-ir'); if (ind) ind.value = LV.pag; guardarPos(); };
// modo página a página
async function desenharPagina() {
  if (!LV || !LV.pdf) return; const cv = $('#lv-canvas'), box = $('#lv-folha'); if (!cv || !box) return;
  const larg = Math.max(280, Math.min(box.clientWidth - 2, 900)) * LV.zoom;
  if (await desenharEm(cv, LV.pag, larg)) { cv.style.width = Math.round(larg) + 'px'; cv.setAttribute('aria-label', `Página ${LV.pag} de ${LV.total}`); salvarPag(); }
}
// modo rolagem contínua: as páginas são desenhadas quando chegam perto da tela e liberadas quando ficam longe
function montarRolo() {
  const rolo = $('#lv-rolo'); if (!rolo || !LV || !LV.pdf) return;
  if (LV.obs) LV.obs.disconnect(); if (LV.vis) LV.vis.disconnect(); LV.feitas = new Set();
  LV.obs = new IntersectionObserver(ents => ents.forEach(en => { const p = +en.target.dataset.p; if (en.isIntersecting && !LV.feitas.has(p)) { LV.feitas.add(p); desenharEm(en.target.querySelector('canvas'), p, en.target.clientWidth).then(ok => { if (ok) en.target.classList.add('ok'); }); } }), { rootMargin: '900px 0px' });
  LV.vis = new IntersectionObserver(ents => ents.forEach(en => { if (!en.isIntersecting) return; const p = +en.target.dataset.p; if (p === LV.pag) return; LV.pag = p; salvarPag();
    LV.feitas.forEach(q => { if (Math.abs(q - p) > 8) { const c = rolo.querySelector(`[data-p="${q}"]`); if (c) { const cv = c.querySelector('canvas'); cv.width = cv.height = 0; c.classList.remove('ok'); } LV.feitas.delete(q); } }); }), { rootMargin: '-45% 0px -50% 0px' });
  rolo.querySelectorAll('.lv-pg').forEach(el => { LV.obs.observe(el); LV.vis.observe(el); });
  if (LV.pag > 1) { const el = rolo.querySelector(`[data-p="${LV.pag}"]`); if (el) el.scrollIntoView({ block: 'start' }); }
}
const mostrarLivro = () => { if (!LV || !LV.pdf) return; if (LV.modo === 'rolagem') montarRolo(); else desenharPagina(); };
const irPag = n => { if (!LV || !LV.pdf) return; const p = Math.min(Math.max(1, n), LV.total);
  if (LV.modo === 'rolagem') { const el = $(`#lv-rolo [data-p="${p}"]`); if (el) el.scrollIntoView({ block: 'start', behavior: SUAVE() }); return; }
  if (p === LV.pag) return; LV.pag = p; desenharPagina(); const f = $('#lv-folha'); if (f) f.scrollIntoView({ block: 'start', behavior: SUAVE() }); };
const SOL = { pendente: ['Aguardando a biblioteca', 'warn'], confirmada: ['Confirmado', 'ok'], recusada: ['Não confirmado', 'bad'], expirada: ['Expirou', 'mute'], cancelada: ['Cancelado', 'mute'] };
function perfil() {
  const l = D.leitor, at = D.emprestimos.filter(x => !x.dataDev), hist = D.emprestimos.filter(x => x.dataDev), h = hoje(), obra = t => D.obras.find(o => o.titulo === t) || { titulo: t };
  const mini = x => { const o = obra(x.titulo); return `<span class="lx-mini-capa">${o.id ? capaObra(o) : capaTxt(x.titulo, x.autor, '')}</span>`; };
  const emp = x => `<div class="lx-linha">${mini(x)}<div class="lx-linha-tx"><b>${esc(x.titulo)}</b><span>${esc(x.autor)} · ${esc(x.codigo)}</span>${x.protocolo === 'renovacao' ? '<span>Renovação aguardando assinatura</span>' : ''}</div>
    <div class="lx-linha-st">${x.pendente ? '<span class="lx-pill aviso">Assinar o protocolo</span>' : x.dataDev ? `<span class="lx-pill">Devolvido em ${fmtD(x.dataDev)}</span>` : `<span class="lx-pill ${x.dataPrev < h ? 'ruim' : 'info'}">${x.dataPrev < h ? 'Atrasado desde' : 'Devolver até'} ${fmtD(x.dataPrev)}</span>`}</div></div>`;
  const ped = s => `<div class="lx-linha">${mini(s)}<div class="lx-linha-tx"><b>${esc(s.titulo)}</b><span>Pedido em ${fmtD(s.criadaEm)}${s.status === 'pendente' ? ` · separado até ${fmtD(s.expiraEm)}` : ''}${s.motivo ? ' · ' + esc(s.motivo) : ''}</span></div>
    <div class="lx-linha-st"><span class="lx-pill ${{ warn: 'aviso', ok: 'bom', bad: 'ruim', mute: '' }[SOL[s.status][1]]}">${SOL[s.status][0]}</span>${s.status === 'pendente' ? `<button class="lx-link" data-act="cancelar" data-id="${s.id}">Cancelar pedido</button>` : ''}</div></div>`;
  return `<section class="lx-perfil-topo"><span class="lx-avatar enorme" aria-hidden="true">${esc(iniciais(l.nome))}</span><div><h1 class="lx-perfil-nome">${esc(l.nome)}</h1><p>${l.associado ? 'Associado(a) da casa' : 'Leitor(a) da biblioteca'}${l.email ? ' · ' + esc(l.email) : ''}</p></div></section>
    <div class="lx-perfil-grade">
    <section class="lx-painel"><header><h2>Comigo agora</h2><span class="lx-cont">${at.length}</span></header>${at.length ? at.map(emp).join('') : '<p class="lx-nada">Você não está com nenhum livro.</p>'}
      <p class="lx-nota">Até ${D.config.maxExemplares} livros ao mesmo tempo, por ${D.config.prazo} dias.${D.config.renovacoes ? ' Para renovar, fale com a biblioteca.' : ''}</p></section>
    <section class="lx-painel"><header><h2>Meus pedidos</h2><span class="lx-cont">${D.solicitacoes.filter(s => s.status === 'pendente').length}</span></header>${D.solicitacoes.length ? D.solicitacoes.map(ped).join('') : `<p class="lx-nada">Nenhum pedido ainda. <button class="lx-link" data-act="pg" data-pg="catalogo">Ver o catálogo</button></p>`}</section>
    ${hist.length ? `<section class="lx-painel"><header><h2>Já li</h2><span class="lx-cont">${hist.length}</span></header>${hist.slice(0, 15).map(emp).join('')}</section>` : ''}
    <section class="lx-painel"><header><h2>Aparência e leitura</h2></header>
      <div class="lx-conta-bloco"><span class="lx-conta-rot">Tema</span><div class="lx-seg tema" role="group" aria-label="Tema">${Object.keys(TEMA.nomes).map(k => `<button type="button" data-act="tema" data-t="${k}" aria-pressed="${TEMA.get() === k}">${TEMA.nomes[k]}</button>`).join('')}</div></div>
      <div class="lx-conta-bloco"><span class="lx-conta-rot">Tamanho da letra</span><div class="lx-seg" role="group" aria-label="Tamanho da letra"><button type="button" data-act="fonte" data-d="-1" aria-label="Diminuir a letra" ${fonteIdx() === 0 ? 'disabled' : ''}>A−</button><span>${Math.round(FONTES[fonteIdx()] * 100)}%</span><button type="button" data-act="fonte" data-d="1" aria-label="Aumentar a letra" ${fonteIdx() === FONTES.length - 1 ? 'disabled' : ''}>A+</button></div></div>
      <p class="lx-nota">Automático segue o tema do aparelho. As escolhas ficam guardadas neste aparelho.</p></section>
    <section class="lx-painel"><header><h2>Trocar a senha</h2></header><form class="lx-form" data-form="trocar">${campoSenha('t-atual', 'Senha atual', 'autocomplete="current-password"')}${campoSenha('t-nova', 'Nova senha', 'autocomplete="new-password" minlength="6" maxlength="64"')}${campoSenha('t-nova2', 'Repita a nova senha', 'autocomplete="new-password" maxlength="64"')}<button class="lx-btn" style="justify-self:start">Salvar nova senha</button></form>
      <p class="lx-nota">Trocar a senha encerra o acesso nos outros aparelhos.</p></section>
    </div>
    <div class="lx-perfil-fim"><button class="lx-btn claro" data-act="sair">${IC.out}<span>Sair do portal</span></button></div>`;
}
const FAQ = [
  ['Como peço um livro?', 'No Catálogo Físico, toque em "Pedir retirada". O livro fica separado para você por alguns dias. Quando a biblioteca confirmar, você recebe o protocolo de empréstimo para assinar e retira o livro.'],
  ['Como assino o protocolo pelo gov.br?', 'O protocolo chega no seu e-mail em PDF. Acesse assinador.iti.br, entre com a sua conta gov.br (nível prata ou ouro), assine no campo "Assinatura do usuário" e responda o e-mail com o PDF assinado. Se preferir, assine no papel na biblioteca.'],
  ['Qual o prazo para devolver?', 'O prazo aparece em Meu Perfil, em "Comigo agora". Se precisar de mais tempo, fale com a biblioteca para renovar antes do vencimento.'],
  ['Esqueci a minha senha.', 'Na tela de entrada, use "Primeiro acesso ou esqueci a senha": enviamos um código para o seu e-mail. Sem e-mail no cadastro, peça o código a um operador da biblioteca.'],
  ['Posso baixar ou imprimir os livros digitais?', 'Não. Os livros da Biblioteca Virtual são lidos só aqui no portal, e cada página mostra o nome de quem está lendo. O portal lembra a última página que você leu em cada livro.'],
  ['O portal registra o que eu acesso?', 'Sim. Para cuidar do acervo, a biblioteca registra as entradas no portal e os livros, cantigas e páginas abertos, guardados por 12 meses. Só os administradores da biblioteca veem esses registros, que não são compartilhados com ninguém.'],
  ['Quem vê as cantigas?', 'Todos os leitores veem as cantigas. As cantigas da casa e a Biblioteca Virtual são exclusivas dos associados com as mensalidades em dia na Secretaria.'],
  ['Como aumento a letra ou mudo as cores?', 'Toque no círculo com as suas iniciais, no alto da tela (ou em "Aa", no computador). Lá você escolhe o tamanho da letra e o tema: claro, escuro ou alto contraste.'],
];
const ajuda = () => `${cabecalho('Ajuda', 'Dúvidas mais comuns sobre o portal da biblioteca.')}
  <div class="lx-ajuda"><section class="lx-faq">${FAQ.map(([q, a]) => `<details><summary>${q}<span aria-hidden="true">${IC.baixo}</span></summary><p>${a}</p></details>`).join('')}</section>
  <aside class="lx-ajuda-lado"><section class="lx-painel"><h2>Ainda com dúvida?</h2><p>Fale com a biblioteca pelo WhatsApp.</p><a class="lx-btn verde" href="https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o portal da Biblioteca Luzes de Aruanda.')}" target="_blank" rel="noopener">Conversar no WhatsApp ${IC.arrow}</a></section>
    <section class="lx-painel"><h2>Encontrou um erro?</h2><p>Conte o que não funcionou: uma página que não abre, um botão, um livro ou uma cantiga com problema.</p>${probBt('portal', '', 'Portal')}</section></aside></div>`;

/* ---------- cantigas (só associados) — versão 1.8: painel de seções, filtros, cards com Assistir/Ouvir/Ler letra e tela completa ---------- */
const ORIG = { tradicional: 'Tradicional', autor: 'Autoria conhecida', casa: 'Da casa' };
const ICONES_SEC = {
  estrela: '<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6z"/>',
  pessoas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.6c2.6.1 4.6 2 5 5.4"/>',
  lotus: '<path d="M12 19c-4-1.5-6-5-6-9 3 1 5 3.5 6 9zM12 19c4-1.5 6-5 6-9-3 1-5 3.5-6 9zM12 19c-1.5-3-1.5-8 0-13 1.5 5 1.5 10 0 13z"/><path d="M3 19h18"/>',
  chapeu: '<path d="M7 15c0-4 1.5-8 5-8s5 4 5 8"/><path d="M2.5 15.5c3 2.2 16 2.2 19 0-3.5-1-15.5-1-19 0z"/>',
  livro: '<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>',
  nota: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  tambor: '<ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6l1.5 13h9L18 6"/><path d="M8 9.5l4 3 4-3"/>',
  vela: '<path d="M12 3c1.5 2 1.5 3.5 0 5-1.5-1.5-1.5-3 0-5z"/><rect x="9" y="9" width="6" height="11" rx="1"/>',
  folha: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19l8-8"/>',
  onda: '<path d="M2 11c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/><path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/>',
  raio: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  espada: '<path d="M14.5 3H20v5.5L10 18.5 5.5 14z"/><path d="M7 16l-3.5 3.5M5 13l6 6"/>',
  flecha: '<path d="M4 20L19 5"/><path d="M13 4h7v7"/><path d="M4 20l1.5-5 3.5 3.5z"/>',
};
function iconeSec(x) {
  if (x.icone && ICONES_SEC[x.icone]) return sv(ICONES_SEC[x.icone]);
  const n = norm(x.nome), r = [[/defuma/, 'vela'], [/bater|cabeca/, 'tambor'], [/oxum|ibejada|cosme/, 'coracao'], [/iemanja|marinheiro/, 'onda'], [/iansa|xango/, 'raio'], [/ogum/, 'espada'], [/oxossi|caboclo|jurema/, 'flecha'], [/boiadeiro|baiano/, 'chapeu'], [/preto velho|pretos velhos|linha/, 'pessoas'], [/oxala|abertura|encerramento|gira/, 'estrela'], [/orixa/, 'lotus'], [/doutrina|hino/, 'livro'], [/mata|folha|erva/, 'folha']];
  return sv(ICONES_SEC[(r.find(([re]) => re.test(n)) || [0, 'nota'])[1]]);
}
const cSecNome = id => { const x = C.secoes.find(y => y.id === id); if (!x) return ''; const p = x.paiId && C.secoes.find(y => y.id === x.paiId); return p ? `${p.nome} › ${x.nome}` : x.nome; };
const cSecCurto = id => (C.secoes.find(y => y.id === id) || {}).nome || '';
const cToq = id => (C.toques.find(t => t.id === id) || {}).nome || '';
const naSecao = (c, sec) => !sec || c.secoes.some(id => id === sec || (C.secoes.find(x => x.id === id) || {}).paiId === sec);
const cMidia = c => c.youtube && c.audio ? 'Vídeo e áudio' : c.youtube ? 'Vídeo' : c.audio ? 'Áudio' : 'Letra';
const MIDIA = { video: ['Com vídeo', c => !!c.youtube], audio: ['Com áudio', c => !!c.audio], letra: ['Só letra', c => !c.youtube && !c.audio] };
const cFiltradas = () => { const q = norm(FC.q); return C.cantigas.filter(c => naSecao(c, FC.sec) && (!FC.toq || c.toqueId === FC.toq) && (!FC.ori || c.origem === FC.ori) && (!FC.casa || c.origem === 'casa') && (!FC.mid || MIDIA[FC.mid][1](c)) && (!q || norm(c.titulo + ' ' + c.letra).includes(q))).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')); };
const CANT_COR = ['#3a2c7c', '#1d3a63', '#8a3f22', '#2f5d38', '#7a2f4a', '#245a5a', '#6b4b26', '#4d2d63'];
const cCor = c => { const s = c.secoes[0] ? (C.secoes.find(x => x.id === c.secoes[0]) || {}) : {}; const p = s.paiId || s.id || c.titulo; let h = 0; for (const ch of String(p)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return CANT_COR[h % CANT_COR.length]; };
const cIcone = c => { const s = c.secoes[0] && C.secoes.find(x => x.id === c.secoes[0]); const p = s && s.paiId ? C.secoes.find(x => x.id === s.paiId) || s : s; return p ? iconeSec(p) : sv(ICONES_SEC.nota); };
const cThumb = c => c.youtube ? `<img src="https://i.ytimg.com/vi/${c.youtube}/mqdefault.jpg" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment('<span class=&quot;lx-cthumb-ic&quot;></span>'))">` : `<span class="lx-cthumb-ic">${cIcone(c)}</span>`;
const cBotoes = c => `${c.youtube ? `<button class="lx-btn mini" data-act="cAbrir" data-id="${c.id}" data-modo="assistir">${IC.play}<span>Assistir</span></button>` : ''}${c.audio || c.youtube ? `<button class="lx-btn mini claro" data-act="cAbrir" data-id="${c.id}" data-modo="ouvir">${IC.fone}<span>Ouvir</span></button>` : ''}${c.letra ? `<button class="lx-btn mini claro" data-act="cAbrir" data-id="${c.id}" data-modo="letra">${IC.letra}<span>Letra</span></button>` : ''}`;
function listaCantigas() {
  const l = cFiltradas(), sec = FC.sec && C.secoes.find(x => x.id === FC.sec);
  const cont = `<p class="small muted ct-cont">${l.length} ${l.length === 1 ? 'cantiga encontrada' : 'cantigas encontradas'}${sec ? ` em “${esc(sec.nome)}”` : ''}</p>`;
  if (!l.length) return cont + `<div class="lx-vazio">${IC.music}<b>Nenhuma cantiga encontrada</b><span>Tente outra seção ou limpe os filtros.</span></div>`;
  return cont + `<div class="lx-cgrade">${l.map(c => { const v1 = (c.letra || '').split('\n').find(x => x.trim()) || ''; return `<article class="lx-ccard" id="cant-${c.id}" data-act="cVer" data-id="${c.id}">
    <span class="lx-cthumb${c.youtube ? ' yt' : ''}" style="--cc:${cCor(c)}">${cThumb(c)}${c.youtube ? `<span class="lx-cplay">${IC.play}</span>` : ''}${c.origem === 'casa' ? '<span class="lx-selo">Da casa</span>' : ''}</span>
    <div class="lx-ccard-tx">${tituloCard(c.titulo, 'cVer', c.id)}${v1 ? `<p class="lx-cverso">${esc(v1)}</p>` : ''}<p class="lx-cmeta">${[c.secoes[0] && cSecCurto(c.secoes[0]), c.toqueId && cToq(c.toqueId), cMidia(c)].filter(Boolean).map(esc).join(' · ')}</p></div>
    <div class="lx-cbts">${cBotoes(c)}</div></article>`; }).join('')}</div>`;
}
function cantigaTela(c) {
  // versão 1.8.1: cada botão abre só o que foi pedido (Assistir = vídeo, Ouvir = áudio, Ler letra = letra); o card abre tudo
  const modo = FC.modo, ouvirYt = !c.audio && c.youtube;
  const ytGrande = auto => `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${c.youtube}${auto ? '?autoplay=1' : ''}" title="Vídeo da cantiga" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  const ytMini = `<div class="ct-ouvir-yt"><div class="yt-mini"><iframe src="https://www.youtube-nocookie.com/embed/${c.youtube}?autoplay=1" title="Vídeo da cantiga" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="small muted">Esta cantiga ainda não tem áudio salvo, então ela toca pelo vídeo do YouTube em tamanho pequeno. O YouTube não permite tocar só o áudio nem continuar com a tela apagada.</p></div>`;
  const letra = `<pre class="letra">${esc(c.letra || 'Letra ainda não cadastrada.')}</pre>`;
  const info = `<dl class="ct-info">${c.secoes.length ? `<dt>Seções</dt><dd>${c.secoes.map(id => esc(cSecNome(id))).join(' · ')}</dd>` : ''}${c.toqueId ? `<dt>Toque</dt><dd>${esc(cToq(c.toqueId))}</dd>` : ''}<dt>Origem</dt><dd>${ORIG[c.origem] || '—'}${c.autor ? ': ' + esc(c.autor) : ''}</dd>${c.obs ? `<dt>Observações</dt><dd>${esc(c.obs)}</dd>` : ''}</dl>`;
  const outros = [['assistir', IC.play, 'Assistir', !!c.youtube], ['ouvir', IC.fone, 'Ouvir', !!(c.audio || c.youtube)], ['letra', IC.letra, 'Ler letra', !!c.letra]].filter(([m, , , ok]) => ok && m !== modo)
    .map(([m, ic, rot]) => `<button class="lx-btn claro" data-act="cAbrir" data-id="${c.id}" data-modo="${m}">${ic}<span>${rot}</span></button>`).join('');
  const topo = `<div class="ct-topo"><button class="lx-link" data-act="cVoltar">${IC.left} Cantigas</button><div class="ct-bts ct-bts-det">${outros}${modo ? `<button class="lx-btn claro" data-act="cVer" data-id="${c.id}">${IC.camadas}<span>Ver tudo</span></button>` : ''}${probBt('cantiga', c.id, c.titulo, true)}</div></div>`;
  if (modo === 'letra') return `${topo}<div class="ct-so ct-so-letra" id="ct-letra"><h1>${esc(c.titulo)}</h1>${letra}</div>`;
  if (modo === 'assistir' && c.youtube) return `${topo}<div class="ct-so ct-so-video"><h1>${esc(c.titulo)}</h1>${ytGrande(true)}</div>`;
  if (modo === 'ouvir') return `${topo}<div class="ct-so ct-so-audio"><h1>${esc(c.titulo)}</h1>${c.audio ? '<div class="ct-audio"><div id="c-play"></div></div>' : ouvirYt ? ytMini : ''}</div>`;
  const audio = c.audio ? `<div class="ct-audio"><button class="lx-btn roxo" data-act="cOuvir" data-id="${c.id}">${IC.fone} Ouvir só o áudio</button><div id="c-play"></div></div>` : '';
  return `${topo}
    <div class="ct-det lx-cdet"><div class="ct-midia">${c.youtube ? ytGrande(false) : ''}${audio}${!c.youtube && !c.audio ? `<div class="lp-panel ct-semmidia">${ART.drum}<p class="muted">Esta cantiga tem só a letra.</p></div>` : ''}${info}</div>
      <div class="ct-letra" id="ct-letra"><h1>${esc(c.titulo)}</h1>${letra}${c.youtube ? `<p class="small"><a href="https://www.youtube.com/watch?v=${c.youtube}" target="_blank" rel="noopener">Abrir no YouTube</a></p>` : ''}</div></div>`;
}
function cantigas() {
  if (!modOk('cantigas')) return manutPagina('cantigas', 'Cantigas');
  if (!C) return cabecalho('Cantigas') + '<p class="muted">Carregando…</p>';
  if (FC.id) { const c = C.cantigas.find(x => x.id === FC.id); if (c) return cantigaTela(c); FC.id = ''; }
  const ordem = (a, b) => (a.ordem || 0) - (b.ordem || 0) || a.nome.localeCompare(b.nome, 'pt-BR');
  const pais = C.secoes.filter(x => !x.paiId).sort(ordem), secAtual = C.secoes.find(y => y.id === FC.sec) || {}, paiSel = secAtual.paiId || FC.sec;
  const subsDe = id => C.secoes.filter(x => x.paiId === id).sort(ordem);
  const nIn = id => C.cantigas.filter(c => naSecao(c, id)).length;
  const item = (x, sub) => `<button type="button" class="ct-sec${sub ? ' sub' : ''}" data-act="cSec" data-id="${x.id}" aria-pressed="${FC.sec === x.id || (!sub && paiSel === x.id)}">${sub ? '' : iconeSec(x)}<span>${esc(x.nome)}</span>${!sub && subsDe(x.id).length ? `<span class="chv${paiSel === x.id ? ' aberto' : ''}">${IC.right}</span>` : ''}</button>`;
  const navSec = () => `<nav class="ct-secoes" aria-label="Seções"><div class="ct-sec-tit">${IC.camadas}<b>Seções</b></div>
      <button type="button" class="ct-sec" data-act="cSec" data-id="" aria-pressed="${!FC.sec}">${sv(ICONES_SEC.nota)}<span>Todas as cantigas</span></button>
      ${pais.map(p => item(p) + (paiSel === p.id ? `<div class="ct-subs">${subsDe(p.id).map(s => item(s, true)).join('')}</div>` : '')).join('')}</nav>`;
  const chip = (id, nome, ic, pres) => `<button type="button" class="lx-chip${ic ? ' ic' : ''}" data-act="cSec" data-id="${id}" aria-pressed="${pres}">${ic || ''}${esc(nome)}<span>${nIn(id)}</span></button>`;
  const chips = `<div class="lx-chips" role="group" aria-label="Seções">${chip('', 'Todas', '', !FC.sec)}${pais.map(p => chip(p.id, p.nome, iconeSec(p), paiSel === p.id)).join('')}</div>
    ${paiSel && subsDe(paiSel).length ? `<div class="lx-chips sub" role="group" aria-label="Subseções">${subsDe(paiSel).map(s => chip(s.id, s.nome, '', FC.sec === s.id)).join('')}</div>` : ''}`;
  const sel = (k, rot, ops, v) => `<label class="lx-sel"><span class="sr">${rot}</span><select data-ch="${k}" aria-label="${rot}"><option value="">${rot}: todos</option>${ops}</select></label>`;
  return `${cabecalho('Cantigas', 'Assista, ouça e leia as cantigas da Umbanda. Cada cantiga traz a letra para acompanhar a gira.')}${avisoAdm('cantigas')}
    ${C.casaOcultas ? `<div class="lx-trava-nota">${IC.lock}<div><b>${C.casaOcultas === 1 ? '1 cantiga da casa é exclusiva' : C.casaOcultas + ' cantigas da casa são exclusivas'} dos associados</b><span>${esc(MSG_PERFIL[C.motivo] || '')}</span></div></div>` : ''}
    <div class="lx-filtros">
      <label class="lx-campo-busca"><span class="sr">Buscar cantiga</span>${IC.search}<input data-in="cq" type="search" value="${esc(FC.q)}" placeholder="Buscar pelo título ou por um trecho da letra" autocomplete="off"></label>
      <div class="lx-filtros-linha multi">${gavBt('sec', secAtual.nome || 'Todas', navSec)}
        ${C.toques.length ? sel('ctoq', 'Toque', C.toques.map(t => `<option value="${t.id}" ${FC.toq === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')) : ''}
        ${sel('cori', 'Origem', Object.keys(ORIG).map(k => `<option value="${k}" ${FC.ori === k ? 'selected' : ''}>${ORIG[k]}</option>`).join(''))}
        ${sel('cmid', 'Mídia', Object.keys(MIDIA).map(k => `<option value="${k}" ${FC.mid === k ? 'selected' : ''}>${MIDIA[k][0]}</option>`).join(''))}
        ${D.leitor.emDia ? `<label class="lx-toggle"><input type="checkbox" data-ch="ccasa" ${FC.casa ? 'checked' : ''}><span class="lx-toggle-sw" aria-hidden="true"></span>Só da casa</label>` : ''}</div>
      ${chips}</div>
    <div id="clista">${listaCantigas()}</div>`;
}
async function ouvirAudio(id) {
  let r; try { r = await api('leitor.cantigaAudio', { token: token(), id }, 'Carregando o áudio…'); } catch (e) { const c = C && C.cantigas.find(x => x.id === id); autoProb('cantiga', id, c ? c.titulo : '', 'O áudio não tocou', e); throw e; }
  const el = $('#c-play');
  if (el) el.innerHTML = `<audio controls autoplay src="data:${r.mime};base64,${r.dados}" style="width:100%"></audio><p class="small muted">O áudio continua tocando com a tela apagada.</p>`;
}

function render() {
  document.body.classList.toggle('lp', V === 'app');
  if (V !== 'app') { $('#app').innerHTML = LOGIN[V](); const f = $('#app input'); if (f) f.focus(); return; }
  const pg = { inicio, catalogo, virtual, cantigas, perfil, ajuda }[PG] || inicio;
  $('#app').innerHTML = moldura(pg());
  if (PG === 'virtual' && LV && LV.pdf) { mostrarLivro(); if (TTS.lendo) setTimeout(() => marcarLendo(TTS.pag), 50); }
}

/* ---------- ações ---------- */
const ACT = {
  ir: t => { V = t.dataset.v; render(); },
  pg: t => irPara(t.dataset.pg),
  menu: () => { MENU = true; render(); const b = $('.lp-sheet button'); if (b) b.focus(); },
  tema: t => { TEMA.set(t.dataset.t); render(); },
  menuFechar: (t, e) => { if (e.target === t) { MENU = false; render(); } },
  sair: () => sair(),
  lvAbrir: t => { const d = DG.digitais.find(x => x.id === t.dataset.id); if (!d) return; if (t.dataset.ouvir) ttsDestravar(); run(() => abrirLivro(d, { inicio: !!t.dataset.inicio, ouvir: !!t.dataset.ouvir }).catch(e => { LV = null; render(); autoProb('livro', d.id, d.titulo, 'O livro não abriu', e); throw e; })); },
  lvFechar: () => { ttsFechar(); enviarPos(); const id = LV && LV.d.id; if (LV && LV.obs) { LV.obs.disconnect(); LV.vis.disconnect(); } LV = null; render(); if (FD.id) focoTela(); else focoVolta('dig-' + id); },
  lvPag: t => { const p = Math.min(Math.max(1, LV.pag + +t.dataset.d), LV.total); if (TTS.lendo) { TTS.gen++; speechSynthesis.cancel(); TTS.partes = []; ttsLer(p); } else irPag(p); },
  ttsAbrir: () => { if (TTS.on) ttsFechar(); else { TTS.on = true; ttsAtualizar(); const b = $('[data-act=ttsPlay]'); if (b) b.focus(); } },
  ttsPlay: () => { if (LV && LV.pdf && !LV.ouviu && !TTS.lendo) { LV.ouviu = 1; reg('ouvir', 'livro digital', LV.d.id, LV.d.titulo, 'leitura em voz alta'); } ttsPlay(); },
  ttsParar: () => ttsParar(),
  fonte: t => { ls.set('bibFonte', Math.min(FONTES.length - 1, Math.max(0, fonteIdx() + +t.dataset.d))); aplicarFonte(); render(); const b = $(`[data-act=fonte][data-d="${t.dataset.d}"]`); if (b && !b.disabled) b.focus(); aviso(`Letra em ${Math.round(FONTES[fonteIdx()] * 100)}%`); },
  contraste: () => { TEMA.set(TEMA.get() === 'contraste' ? 'auto' : 'contraste'); render(); const b = $('[data-act=contraste]'); if (b) b.focus(); aviso(TEMA.get() === 'contraste' ? 'Alto contraste ligado' : 'Alto contraste desligado'); },
  oGen: t => { F.g = t.dataset.id; render(); const b = $(`[data-act=oGen][data-id="${t.dataset.id}"]`); if (b) b.focus(); avisoLista('#lista'); },
  dGen: t => { FD.g = t.dataset.id; render(); const b = $(`[data-act=dGen][data-id="${t.dataset.id}"]`); if (b) b.focus(); avisoLista('#dlista'); },
  oVer: t => { const ob = D.obras.find(x => x.id === t.dataset.id); if (ob) reg('ver', 'livro físico', ob.id, ob.titulo); if (PG !== 'catalogo') { ttsFechar(); enviarPos(); LV = null; } F.id = t.dataset.id; PG = 'catalogo'; render(); focoTela(); },
  oVoltar: () => { const id = F.id; F.id = ''; render(); focoVolta('obra-' + id); },
  dVer: t => { const id = t.dataset.id, ir = () => { const d = DG.digitais.find(x => x.id === id); if (d) reg('ver', 'livro digital', id, d.titulo); FD.id = id; PG = 'virtual'; LV = null; render(); focoTela(); }; if (DG) ir(); else run(async () => { DG = await api('leitor.digitais', { token: token() }, 'Carregando os livros digitais…'); ir(); }); },
  dVoltar: () => { const id = FD.id; FD.id = ''; render(); focoVolta('dig-' + id); },
  lvZoom: t => { if (!LV) return; LV.zoom = Math.min(2.5, Math.max(0.6, +(LV.zoom + 0.25 * +t.dataset.d).toFixed(2))); if (LV.modo === 'rolagem') render(); else desenharPagina(); },
  lvModo: () => { if (!LV) return; LV.modo = LV.modo === 'rolagem' ? 'pagina' : 'rolagem'; try { localStorage.setItem('bibModo', LV.modo); } catch (e) { } render(); },
  atualizar: () => run(async () => { await carregar(); if (C) C = await api('leitor.cantigas', { token: token() }, 'Atualizando…'); if (DG) DG = await api('leitor.digitais', { token: token() }, 'Atualizando…'); render(); }),
  fechar: (t, e) => { if (e.target === t || t.tagName === 'BUTTON') modal(''); },
  rolar: t => { const d = $('#dest'); if (d) d.scrollBy({ left: +t.dataset.d * 290, behavior: SUAVE() }); },
  verObra: t => { MENU = false; ACT.oVer(t); },
  verCantiga: t => { const id = t.dataset.id; if (C) { regCant(id, ''); FC.id = id; PG = 'cantigas'; render(); return; } run(async () => { C = await api('leitor.cantigas', { token: token() }, 'Carregando a cantiga…'); regCant(id, ''); FC.id = id; PG = 'cantigas'; render(); window.scrollTo(0, 0); }); },
  pedir: t => { const o = D.obras.find(x => x.id === t.dataset.id); modal(`<h2>Pedir retirada</h2><p><b>${esc(o.titulo)}</b><br><span class="muted">${esc(o.autor)}</span></p>
      <p class="small">O livro fica separado para você por ${D.config.diasSolicitacao} ${D.config.diasSolicitacao === 1 ? 'dia' : 'dias'}. A biblioteca confirma o pedido e você recebe o protocolo para assinar (pode ser pelo gov.br). Prazo de devolução: ${D.config.prazo} dias após a retirada.</p>
      <div class="modal-actions"><button class="btn" data-act="fechar">Voltar</button><button class="btn primary" data-act="pedirOk" data-id="${o.id}">Confirmar pedido</button></div>`); },
  pedirOk: t => run(async () => { const r = await api('leitor.solicitar', { token: token(), obraId: t.dataset.id }, 'Enviando pedido…'); modal(''); const ob = D.obras.find(x => x.id === t.dataset.id); reg('pedido', 'livro físico', t.dataset.id, ob ? ob.titulo : ''); toast(`Pedido feito! O livro fica separado até ${fmtD(r.expiraEm)}.`); await carregar(); }),
  cancelar: t => run(async () => { await api('leitor.cancelar', { token: token(), id: t.dataset.id }, 'Cancelando…'); toast('Pedido cancelado'); await carregar(); }),
  cSec: t => { FC.sec = t.dataset.id; FC.id = ''; render(); },
  cAbrir: (t, e) => { e.stopPropagation(); FC.id = t.dataset.id; FC.modo = t.dataset.modo; regCant(FC.id, FC.modo); render(); window.scrollTo(0, 0); const c = C.cantigas.find(x => x.id === FC.id); if (FC.modo === 'ouvir' && c && c.audio) run(() => ouvirAudio(c.id)); },
  cVer: t => { FC.id = t.dataset.id; FC.modo = ''; regCant(FC.id, ''); render(); window.scrollTo(0, 0); },
  cVoltar: () => { const id = FC.id; FC.id = ''; render(); focoVolta('cant-' + id); },
  cOuvir: t => run(() => ouvirAudio(t.dataset.id)),
  prob: t => probAbrir(t.dataset.tipo, t.dataset.id, t.dataset.alvo),
  probEnviar: () => run(async () => {
    const cat = $('#pb-cat').value, msg = $('#pb-msg').value.trim(), x = PROB_ATUAL; if (cat === 'Outro' && !msg) { toast('Conte em poucas palavras qual foi o problema.', 'bad'); $('#pb-msg').focus(); return; }
    await api('leitor.problema', { token: token(), tipo: x.tipo, alvoId: x.id, alvo: x.alvo, categoria: cat, mensagem: (x.pag ? `[página ${x.pag}] ` : '') + msg }, 'Enviando…'); modal(''); toast('Obrigado! A biblioteca vai verificar o problema.');
  }),
};
const FORMS = {
  entrar: () => run(async () => { CPF = $('#l-cpf').value; try { const r = await api('leitor.entrar', { cpf: CPF, senha: $('#l-senha').value, aparelho: APARELHO }, 'Entrando…'); ls.set('bibLeitor', r.token); await carregar(); }
    catch (e) { if (e.code === 'NOSENHA') { V = 'codigo'; render(); } throw e; } }),
  email: () => run(async () => {
    const e = $('#e-email').value.trim(); if (!$('#e-nasc').value) { toast('Informe a data de nascimento.', 'bad'); return; } if (e.toLowerCase() !== $('#e-email2').value.trim().toLowerCase()) { toast('Os e-mails não são iguais.', 'bad'); return; }
    const r = await api('leitor.email', { cpf: CPF, nascimento: $('#e-nasc').value, email: e }, 'Salvando o e-mail…'); V = 'senha'; render(); toast(`E-mail salvo. Código enviado para ${r.email}. Confira também a caixa de spam.`);
  }),
  codigo: () => run(async () => { CPF = $('#c-cpf').value; const r = await api('leitor.codigo', { cpf: CPF }, 'Enviando código…'); if (r.semEmail) { V = 'email'; render(); return; } V = 'senha'; render(); toast(`Código enviado para ${r.email}. Confira também a caixa de spam.`); }),
  senha: () => run(async () => {
    CPF = $('#s-cpf').value; const s1 = $('#s-senha').value;
    if (s1 !== $('#s-senha2').value) { toast('As senhas não são iguais.', 'bad'); return; }
    const r = await api('leitor.senha', { cpf: CPF, codigo: $('#s-cod').value, senha: s1, aparelho: APARELHO }, 'Salvando…'); ls.set('bibLeitor', r.token); toast('Senha salva!'); await carregar();
  }),
  trocar: () => run(async () => {
    const n = $('#t-nova').value; if (n !== $('#t-nova2').value) { toast('As senhas novas não são iguais.', 'bad'); return; }
    const r = await api('leitor.trocarSenha', { token: token(), atual: $('#t-atual').value, nova: n }, 'Salvando…'); ls.set('bibLeitor', r.token); toast('Senha alterada'); render();
  }),
};
/* ---------- versão 2.0: ações da vitrine, da busca e da entrada ---------- */
Object.assign(ACT, {
  menu: () => { MENU = true; render(); const b = $('.lx-conta-box'); if (b) { b.setAttribute('tabindex', '-1'); b.focus(); } },
  verSenha: t => { const i = t.parentElement.querySelector('input'); const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; t.setAttribute('aria-pressed', ver); t.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha'); t.innerHTML = ver ? IC.olhoX : IC.olho; i.focus(); },
  irGen: t => { F.g = t.dataset.id; F.q = ''; F.id = ''; irPara('catalogo'); },
  oLimpar: () => { F.q = ''; F.g = ''; F.disp = ''; render(); const i = $('#q'); if (i) i.focus(); },
  buscar: () => { F.id = ''; if (PG !== 'catalogo') irPara('catalogo'); else render(); const i = $('#q'); if (i) { i.focus(); i.select(); } },
  rolar: t => { const d = $('#' + (t.dataset.alvo || 'dest')); if (d) d.scrollBy({ left: +t.dataset.d * Math.max(260, d.clientWidth * 0.8), behavior: SUAVE() }); },
});
FORMS.buscaGeral = () => { const q = ($('#bg-q') || {}).value || ''; F.q = q.trim(); F.g = ''; F.id = ''; if (F.q) regBusca('catálogo', F.q); irPara('catalogo'); const i = $('#q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
document.addEventListener('change', e => { if (e.target.dataset.ch === 'odispck') { F.disp = e.target.checked ? 'sim' : ''; $('#lista').innerHTML = listaObras(); avisoLista('#lista'); } });
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act]) { if (t.tagName === 'A') return; if (t.disabled) return; e.preventDefault(); ACT[t.dataset.act](t, e); } });
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (f) { e.preventDefault(); FORMS[f.dataset.form](); } });
document.addEventListener('input', e => {
  if (e.target.matches('[data-cpf]')) { const p = e.target.selectionStart === e.target.value.length; e.target.value = fmtCPF(e.target.value); if (p) e.target.selectionStart = e.target.selectionEnd = e.target.value.length; }
  if (/^[cd]?q$/.test(e.target.dataset.in || '')) regBusca({ q: 'catálogo', cq: 'cantigas', dq: 'biblioteca virtual' }[e.target.dataset.in], e.target.value);
  if (e.target.dataset.in === 'q') { F.q = e.target.value; $('#lista').innerHTML = listaObras(); avisoLista('#lista'); }
  if (e.target.dataset.in === 'cq') { FC.q = e.target.value; $('#clista').innerHTML = listaCantigas(); }
  if (e.target.dataset.in === 'dq') { FD.q = e.target.value; $('#dlista').innerHTML = listaDigitais(); avisoLista('#dlista'); }
});
document.addEventListener('change', e => { const k = e.target.dataset.ch;
  if (k === 'odisp' || k === 'oord') { F[k === 'odisp' ? 'disp' : 'ord'] = e.target.value; $('#lista').innerHTML = listaObras(); avisoLista('#lista'); }
  if (k === 'dord' || k === 'dcom') { if (k === 'dord') FD.ord = e.target.value; else FD.comecei = e.target.checked; $('#dlista').innerHTML = listaDigitais(); avisoLista('#dlista'); }
  if (k === 'ttsVel') { TTS.rate = +e.target.value || 1; ls.set('bibVel', TTS.rate); if (TTS.lendo) { TTS.gen++; speechSynthesis.cancel(); ttsFalar(TTS.gen); } }
  if (k === 'ttsVoz') { TTS.voz = e.target.value; ls.set('bibVoz', TTS.voz); if (TTS.lendo) { TTS.gen++; speechSynthesis.cancel(); ttsFalar(TTS.gen); } } if (e.target.id === 'lv-ir') irPag(parseInt(e.target.value, 10) || 1); if (k === 'g') { F.g = e.target.value; $('#lista').innerHTML = listaObras(); } if (k === 'ctoq') { FC.toq = e.target.value; $('#clista').innerHTML = listaCantigas(); } if (k === 'cori') { FC.ori = e.target.value; $('#clista').innerHTML = listaCantigas(); } if (k === 'cmid') { FC.mid = e.target.value; $('#clista').innerHTML = listaCantigas(); } if (k === 'ccasa') { FC.casa = e.target.checked; $('#clista').innerHTML = listaCantigas(); } });
if (token()) run(carregar).then(() => { if (!D && V !== 'manut') { V = 'entrar'; render(); } }); else render();
// versão 1.7: leitor de PDF — setas do teclado mudam a página; sem menu do botão direito; redesenha ao girar o celular
document.addEventListener('keydown', e => { if (!LV || !LV.pdf || LV.modo === 'rolagem' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') irPag(LV.pag + 1); if (e.key === 'ArrowLeft') irPag(LV.pag - 1); });
// Esc fecha a janela ou a tela aberta (do mais recente para o mais antigo)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || V !== 'app') return;
  if ($('#modal-root').innerHTML) { modal(''); return; }
  if (MENU) { MENU = false; render(); const b = $('[data-act=menu]'); if (b) b.focus(); return; }
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.value && e.target.type === 'search') return;
  if (PG === 'virtual' && LV) ACT.lvFechar(); else if (PG === 'virtual' && FD.id) ACT.dVoltar(); else if (PG === 'catalogo' && F.id) ACT.oVoltar(); else if (PG === 'cantigas' && FC.id) ACT.cVoltar();
});
document.addEventListener('contextmenu', e => { if (e.target.closest('.lv-folha')) e.preventDefault(); });
let lvTimer, lvLarg = innerWidth; window.addEventListener('resize', () => { clearTimeout(lvTimer); lvTimer = setTimeout(() => { if (innerWidth === lvLarg) return; lvLarg = innerWidth; if (LV && LV.pdf) { if (LV.modo === 'rolagem') render(); else desenharPagina(); } }, 250); }); // só quando a largura muda (no celular a barra do navegador muda a altura ao rolar)

/* ---------- versão 1.13: registro de acessos (só os administradores veem; guardado 12 meses) e relato de problemas ---------- */
const PG_NOME = { inicio: 'Início', catalogo: 'Catálogo', virtual: 'Biblioteca Virtual', cantigas: 'Cantigas', perfil: 'Meu Perfil', ajuda: 'Ajuda' };
const sesGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, sesSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
const SESSAO = sesGet('bibSes') || (() => { const s = Math.random().toString(36).slice(2, 10); sesSet('bibSes', s); return s; })();
const APARELHO = /ipad|tablet/i.test(navigator.userAgent) ? 'tablet' : /mobi|android|iphone/i.test(navigator.userAgent) ? 'celular' : 'computador';
let FILA = [], filaTimer = null;
function reg(evento, tipo, alvoId, alvo, detalhe) {
  if (!token()) return;
  FILA.push({ ts: agoraTxt(), sessao: SESSAO, aparelho: APARELHO, evento, tipo: tipo || '', alvoId: alvoId || '', alvo: String(alvo || '').slice(0, 200), detalhe: String(detalhe == null ? '' : detalhe).slice(0, 200) });
  if (FILA.length >= 15) enviarFila(); else if (!filaTimer) filaTimer = setTimeout(() => enviarFila(), 20000);
}
function enviarFila(sair) {
  clearTimeout(filaTimer); filaTimer = null; if (!FILA.length || !token()) return; const eventos = FILA.splice(0, 50);
  try { fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'leitor.registrar', payload: { token: token(), eventos } }), redirect: 'follow', keepalive: !!sair }).catch(() => { }); } catch (e) { }
}
addEventListener('pagehide', () => enviarFila(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarFila(true); });
function regEntrada() { if (sesGet('bibEntrou') === token()) return; sesSet('bibEntrou', token()); reg('entrada', 'portal', '', 'Portal', ''); }
// tempo e páginas lidas: registrado ao sair do livro (ou ao trocar de aplicativo)
function fimLeitura() {
  if (!LV || !LV.pdf || !LV.ini) return; const min = Math.round((Date.now() - LV.ini) / 60000), n = LV.vistas.size;
  if (min || n > 1) reg('leitura', 'livro digital', LV.d.id, LV.d.titulo, `${min} min · ${n} ${n === 1 ? 'página' : 'páginas'} · até a página ${LV.pag}`);
  LV.ini = Date.now(); LV.vistas = new Set([LV.pag]);
}
function regCant(id, modo) { const c = C && C.cantigas.find(x => x.id === id); if (c) reg(['assistir', 'ouvir', 'letra'].includes(modo) ? modo : 'ver', 'cantiga', id, c.titulo, modo || ''); }
let buscaTimer = null, buscaUlt = ''; function regBusca(onde, v) { clearTimeout(buscaTimer); buscaTimer = setTimeout(() => { const q = String(v || '').trim(); if (q.length >= 3 && q !== buscaUlt) { buscaUlt = q; reg('busca', onde, '', '', q); } }, 2500); }
// relatar problema
const PROB_CAT = {
  livro: ['O livro não abre', 'Página em branco, cortada ou faltando', 'Texto ilegível ou fora de ordem', 'Informação errada (título, autor, gênero)', 'Leitura em voz alta não funciona', 'Outro'],
  cantiga: ['Letra errada ou incompleta', 'Áudio não toca', 'Vídeo não abre', 'Cantiga na seção errada', 'Outro'],
  portal: ['Não consigo entrar', 'Página não carrega', 'Botão não funciona', 'Problema no celular', 'Sugestão', 'Outro'],
};
let PROB_ATUAL = null;
const probBt = (tipo, id, alvo, mini) => !modOk('problemas') ? '' : `<button class="lp-btn light ct-b lp-prob${mini ? ' mini' : ''}" data-act="prob" data-tipo="${tipo}" data-id="${esc(id)}" data-alvo="${esc(alvo)}" aria-label="Relatar um problema${tipo === 'portal' ? ' no portal' : ': ' + esc(alvo)}">${IC.flag}<span>Relatar problema</span></button>`;
function probAbrir(tipo, id, alvo) {
  PROB_ATUAL = { tipo, id, alvo, pag: tipo === 'livro' && LV && LV.pdf && LV.d.id === id ? LV.pag : 0 };
  modal(`<h2>Relatar um problema</h2>${tipo !== 'portal' ? `<p><b>${esc(alvo)}</b>${PROB_ATUAL.pag ? `<br><span class="small muted">Página ${PROB_ATUAL.pag}</span>` : ''}</p>` : ''}
    <div class="field"><label for="pb-cat">O que aconteceu?</label><select id="pb-cat">${PROB_CAT[tipo].map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:10px"><label for="pb-msg">Detalhes (opcional)</label><textarea id="pb-msg" rows="4" maxlength="1000" placeholder="Ex.: a página 12 aparece em branco no celular"></textarea></div>
    <p class="small muted">A biblioteca recebe o relato com o seu nome para poder responder.</p>
    <div class="modal-actions"><button class="btn" data-act="fechar">Cancelar</button><button class="btn primary" data-act="probEnviar">Enviar</button></div>`);
}
// erros que o próprio portal percebe (no máximo 3 por sessão, sem repetir)
let AUTO_N = 0; const AUTO_VISTOS = new Set();
function autoProb(tipo, alvoId, alvo, cat, e) {
  const m = String(e && e.message || e || '').slice(0, 300); if (!token() || (e && /NET|AUTH|FORBIDDEN|VALIDATION/.test(e.code || '')) || AUTO_N >= 3) return;
  const k = tipo + alvoId + cat + m; if (AUTO_VISTOS.has(k)) return; AUTO_VISTOS.add(k); AUTO_N++;
  try { fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'leitor.problema', payload: { token: token(), tipo, alvoId, alvo, categoria: cat + ' (automático)', mensagem: `${m} · ${APARELHO} · ${navigator.userAgent.slice(0, 120)}`, origem: 'automatico' } }), redirect: 'follow' }).catch(() => { }); } catch (x) { }
}
addEventListener('error', e => { if (!e.message || /Script error|ResizeObserver/.test(e.message)) return; autoProb('portal', '', PG_NOME[PG] || 'Portal', 'Erro no portal', `${e.message} (${String(e.filename || '').split('/').pop()}:${e.lineno || ''})`); });

/* ---------- versão 1.14: manutenção por módulo, portal por perfil e gaveta de seções/gêneros no celular ---------- */
Object.assign(IC, {
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  ferram: sv('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  baixo: sv('<path d="M6 9l6 6 6-6"/>', 2),
});
const MSG_PERFIL = { associado: 'Exclusivo para associados da casa. Fale com a Secretaria para se associar.', mensalidade: 'Disponível para associados com as mensalidades em dia. Regularize na Secretaria para voltar a acessar.' };
const MOD = k => (D && D.modulos && D.modulos[k]) || { estado: 'ativo', ver: true, texto: '' };
const modOk = k => MOD(k).estado === 'ativo' || MOD(k).ver;            // pode usar (administrador sempre pode)
const modVer = k => !D || !D.modulos || !D.modulos[k] || MOD(k).estado !== 'oculto' || MOD(k).ver; // aparece no menu
const fmtPrev = p => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(p) ? `${p.slice(8, 10)}/${p.slice(5, 7)} às ${p.slice(11)}` : p;
const avisoAdm = k => { const m = MOD(k), pt = MOD('portal'); const x = pt.estado !== 'ativo' ? pt : m; return x.estado !== 'ativo' && D.modulos.admin ? `<div class="note warn"><b>${x.estado === 'oculto' ? 'Oculto' : 'Em manutenção'} para os leitores</b><span>Você vê porque é administrador. Aviso aos leitores: “${esc(x.texto)}”</span></div>` : ''; };
function manutPagina(k, titulo) { const m = MOD(k); return `${cabecalho(titulo)}<section class="lp-panel lp-manut">${IC.ferram}<h2>${m.estado === 'oculto' ? 'Indisponível no momento' : 'Em manutenção'}</h2><p>${esc(m.texto)}</p>${m.prev ? `<p class="small muted">Previsão de volta: ${esc(fmtPrev(m.prev))}</p>` : ''}</section>`; }
function trancaPagina() {
  const l = D.leitor, n = D.digitaisTotal || 0;
  return `${cabecalho('Biblioteca Virtual')}<section class="lp-panel lp-manut lp-tranca-pg">${IC.lock}<h2>Exclusivo para associados</h2><p>${esc(MSG_PERFIL[l.motivo] || '')}</p>
    ${n ? `<p class="small muted">${n === 1 ? '1 livro digital disponível' : n + ' livros digitais disponíveis'} para os associados.</p>` : ''}
    <a class="lp-btn green" href="https://wa.me/${WHATS}?text=${encodeURIComponent(l.motivo === 'mensalidade' ? 'Olá! Quero regularizar minhas mensalidades para voltar a acessar a Biblioteca Virtual.' : 'Olá! Quero saber como me associar à casa.')}" target="_blank" rel="noopener">Falar com a casa ${IC.arrow}</a></section>`;
}
// gaveta (celular): botão "Gênero: … ▾" / "Seção: … ▾" abre a grade com ícones
function gavBt(tipo, atual, fn) { GAV = { tipo, fn }; return `<button type="button" class="ct-gav-bt" data-act="gav" aria-haspopup="dialog">${tipo === 'sec' ? IC.camadas : IC.book}<span>${tipo === 'sec' ? 'Seção' : 'Gênero'}: <b>${esc(atual)}</b></span>${IC.baixo}</button>`; }
function gavAbrir() { if (!GAV) return; modal(`<h2>${GAV.tipo === 'sec' ? 'Escolha a seção' : 'Escolha o gênero'}</h2><div class="ct-gav">${GAV.fn()}</div><div class="modal-actions"><button class="btn" data-act="fechar">Fechar</button></div>`); const m = $('#modal-root .modal'); if (m) m.classList.add('gav'); }
ACT.gav = () => gavAbrir();
ACT.manutTentar = () => { MANUT = null; if (token()) run(carregar); else { V = 'entrar'; estadoPortal(); render(); } };
['oGen', 'dGen', 'cSec'].forEach(k => { const f = ACT[k]; ACT[k] = (t, e) => { const naGav = !!t.closest('.gav'); f(t, e); if (!naGav) return; const temSub = k === 'cSec' && t.dataset.id && C && C.secoes.some(x => x.paiId === t.dataset.id); if (temSub) gavAbrir(); else modal(''); }; });
function estadoPortal() { try { fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'leitor.estado', payload: {} }), redirect: 'follow' }).then(r => r.json()).then(j => { if (j.ok) { EST = j.data.result; if (V === 'entrar') render(); } }).catch(() => { }); } catch (e) { } }
estadoPortal();
