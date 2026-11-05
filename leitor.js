/* Portal do leitor (versão 1.6): início, catálogo físico, biblioteca virtual (em breve), cantigas (associados), perfil e ajuda.
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
const F = { q: '', g: '' }, FC = { q: '', sec: '', toq: '', casa: false, id: '' };
const LOGO = 'logo.png';

/* ---------- ícones e ilustrações (SVG) ---------- */
const sv = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
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
function modal(html) { $('#modal-root').innerHTML = html ? `<div class="overlay" data-act="fechar"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>` : ''; }
async function api(action, payload = {}, msg) {
  busy(true, msg || 'Aguarde…');
  try {
    let r; try { r = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, payload }), redirect: 'follow' }); } catch (e) { throw Object.assign(new Error('Sem conexão. Confira a internet e tente de novo.'), { code: 'NET' }); }
    const j = await r.json().catch(() => ({ ok: false, error: { code: 'NET', message: 'Resposta inválida do servidor. Tente de novo.' } }));
    if (!j.ok) throw Object.assign(new Error(j.error.message), { code: j.error.code });
    return j.data.result;
  } finally { busy(false); }
}
async function run(fn) { try { await fn(); } catch (e) { if (e.code === 'AUTH' && ls.get('bibLeitor')) { sair(e.message); return; } toast(e.message, 'bad'); } }
function sair(msg) { ls.set('bibLeitor', null); D = null; C = null; V = 'entrar'; PG = 'inicio'; render(); if (msg) toast(msg, 'bad'); }
const token = () => ls.get('bibLeitor');
async function carregar() { D = await api('leitor.dados', { token: token() }, 'Carregando…'); V = 'app'; render(); }
const irPara = pg => { PG = pg; MENU = false; FC.id = ''; if (pg === 'cantigas' && !C) { run(async () => { C = await api('leitor.cantigas', { token: token() }, 'Carregando as cantigas…'); render(); }); return; } render(); window.scrollTo(0, 0); };

/* ---------- login ---------- */
const card = body => `<div class="login"><div class="login-card">
  <div class="logo-disc"><img src="${LOGO}" alt="Logo da Associação Centro de Umbanda Luzes de Aruanda"></div>
  <div style="display:grid;gap:6px"><div class="eyebrow">Portal do leitor</div><h1>Biblioteca Luzes de Aruanda</h1><p class="muted">Livros, cantigas e muito mais da nossa casa.</p></div>
  ${body}
  <p class="small muted"><a href="https://wa.me/${WHATS}?text=${encodeURIComponent(WHATS_MSG)}" target="_blank" rel="noopener">Não tenho cadastro: pedir pelo WhatsApp</a> · <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
</div></div>`;
const campo = (id, label, attrs = '') => `<div class="field" style="text-align:left"><label for="${id}">${label}</label><input id="${id}" ${attrs}></div>`;
const LOGIN = {
  entrar: () => card(`<form class="form" data-form="entrar" style="display:grid;gap:12px">
      ${campo('l-cpf', 'CPF', `inputmode="numeric" autocomplete="username" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      ${campo('l-senha', 'Senha', 'type="password" autocomplete="current-password"')}
      <button class="btn primary lg">Entrar</button></form>
    <button class="btn ghost" data-act="ir" data-v="codigo">Primeiro acesso ou esqueci a senha</button>`),
  codigo: () => card(`<form class="form" data-form="codigo" style="display:grid;gap:12px;text-align:left">
      <p class="small">Vamos enviar um código para o e-mail do seu cadastro. Com ele você cria (ou troca) a sua senha.</p>
      ${campo('c-cpf', 'CPF', `inputmode="numeric" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      <button class="btn primary">Enviar código por e-mail</button></form>
    <button class="btn ghost" data-act="ir" data-v="senha">Já tenho um código</button><button class="btn ghost" data-act="ir" data-v="entrar">Voltar</button>
    <p class="small muted">Sem e-mail no cadastro? Associados da casa podem informar o e-mail na próxima tela; os demais leitores pedem o código a um operador da biblioteca.</p>`),
  email: () => card(`<form class="form" data-form="email" style="display:grid;gap:12px;text-align:left">
      <p class="small">Seu cadastro ainda não tem e-mail. Para confirmar que é você, informe a sua data de nascimento (a mesma do cadastro na Secretaria) e o e-mail que quer usar. Ele fica salvo no seu cadastro da Secretaria e da biblioteca, e o código chega nele.</p>
      ${campo('e-nasc', 'Data de nascimento', `type="date" max="${hoje()}"`)}
      ${campo('e-email', 'Seu e-mail', 'type="email" autocomplete="email" maxlength="150"')}
      ${campo('e-email2', 'Repita o e-mail', 'type="email" autocomplete="email" maxlength="150"')}
      <button class="btn primary">Salvar e-mail e enviar código</button></form>
    <button class="btn ghost" data-act="ir" data-v="codigo">Voltar</button>`),
  senha: () => card(`<form class="form" data-form="senha" style="display:grid;gap:12px">
      ${campo('s-cpf', 'CPF', `inputmode="numeric" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      ${campo('s-cod', 'Código de 6 dígitos', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"')}
      ${campo('s-senha', 'Nova senha (mínimo 6 caracteres)', 'type="password" autocomplete="new-password" minlength="6" maxlength="64"')}
      ${campo('s-senha2', 'Repita a senha', 'type="password" autocomplete="new-password" maxlength="64"')}
      <button class="btn primary">Salvar senha e entrar</button></form>
    <button class="btn ghost" data-act="ir" data-v="entrar">Voltar</button>`),
};

/* ---------- moldura (barra lateral, topo e navegação do celular) ---------- */
const PAGINAS = () => [['inicio', 'Início', IC.home], ['catalogo', 'Catálogo Físico', IC.book], ['virtual', 'Biblioteca Virtual', IC.pdf, true]].concat(D.leitor.associado ? [['cantigas', 'Cantigas', IC.music]] : []);
const navBtn = ([id, label, icon, soon]) => `<button class="lp-nav" data-act="pg" data-pg="${id}" ${PG === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span>${soon ? '<span class="soon">em breve</span>' : ''}</button>`;
function moldura(conteudo) {
  const contas = [['perfil', 'Meu Perfil', IC.user], ['ajuda', 'Ajuda', IC.help]];
  const bottom = [['inicio', 'Início', IC.home], ['catalogo', 'Catálogo', IC.book], ['virtual', 'Biblioteca', IC.pdf]].concat(D.leitor.associado ? [['cantigas', 'Cantigas', IC.music]] : [['ajuda', 'Ajuda', IC.help]]).concat([['perfil', 'Perfil', IC.user]]);
  return `<div class="lp-shell">
    <aside class="lp-side"><div class="lp-brand"><img src="${LOGO}" alt=""><div><b>Luzes de Aruanda</b><span>Biblioteca da associação</span></div></div>
      <div class="lp-sec">Leitor</div>${PAGINAS().map(navBtn).join('')}<div class="lp-div"></div>${contas.map(navBtn).join('')}
      <button class="lp-nav" data-act="sair">${IC.out}<span>Sair</span></button>${ART.waves}</aside>
    <header class="lp-top"><img src="${LOGO}" alt=""><div><b>Luzes de Aruanda</b><span>Biblioteca da associação</span></div><button data-act="menu" aria-label="Menu">${IC.menu}</button></header>
    <main class="lp-main">${conteudo}</main>
    <nav class="lp-bottom" aria-label="Navegação">${bottom.map(([id, label, icon]) => `<button data-act="pg" data-pg="${id}" ${PG === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`).join('')}</nav>
    ${MENU ? `<div class="lp-sheet" data-act="menuFechar"><div>${contas.map(navBtn).join('')}<button class="lp-nav" data-act="sair">${IC.out}<span>Sair</span></button></div></div>` : ''}
  </div>`;
}
const cabecalho = (titulo, sub) => `<div class="lp-head"><div><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div><button class="lp-btn light" data-act="atualizar" aria-label="Atualizar">${IC.ref}<span>Atualizar</span></button></div>`;

/* ---------- páginas ---------- */
function inicio() {
  const l = D.leitor, cards = [
    ['peach', IC.book, 'Catálogo Físico', 'Solicite a retirada de livros do acervo físico da nossa biblioteca.', 'Acessar catálogo', 'catalogo', ART.books, ''],
    ['green', IC.pdf, 'Biblioteca Virtual', 'Leia nossos livros em PDF, onde e quando quiser.', 'Acessar biblioteca', 'virtual', ART.tablet, 'green'],
  ].concat(l.associado ? [['lav', IC.music, 'Cantigas', 'Assista, ouça e leia as cantigas da Umbanda.', 'Acessar cantigas', 'cantigas', ART.drum, 'purple']] : []);
  const livros = D.obras.slice().sort((a, b) => String(b.desde).localeCompare(String(a.desde))).slice(0, 8).map(o => ({ tipo: 'Livro', t: o.titulo, img: o.isbn ? `https://covers.openlibrary.org/b/isbn/${o.isbn.replace(/\D/g, '')}-M.jpg?default=false` : '', go: 'Ver no catálogo', act: `data-act="verObra" data-id="${o.id}"` }));
  const cants = (D.novasCantigas || []).map(c => ({ tipo: 'Cantiga', t: c.titulo, go: c.video || c.audio ? 'Assistir / Ouvir' : 'Ler', act: `data-act="verCantiga" data-id="${c.id}"` }));
  const dest = []; for (let i = 0; i < Math.max(livros.length, cants.length); i++) { if (livros[i]) dest.push(livros[i]); if (cants[i]) dest.push(cants[i]); }
  return `${cabecalho(`Olá, ${esc(l.primeiroNome)}!`, 'Seja bem-vindo ao nosso espaço de leitura e cultura.')}
    ${D.bloqueios.length ? `<div class="note warn"><b>No momento você não pode retirar livros</b><span>${D.bloqueios.map(esc).join(' ')}</span></div>` : ''}
    <section class="lp-hero"><div><h2>Conhecimento também é caminho de luz.</h2><p>Explore nosso acervo de livros${l.associado ? ', cantigas' : ''} e muito mais, conectando-se com a nossa cultura.</p><button class="lp-btn dark" data-act="pg" data-pg="catalogo">Começar agora ${IC.arrow}</button></div></section>
    <h2 class="lp-h2">Acesso Rápido</h2>
    <div class="lp-quick">${cards.map(([cls, icon, t, d, b, pg, art, btn]) => { const soon = pg === 'virtual'; return `<div class="lp-card ${cls}" ${soon ? '' : `data-act="pg" data-pg="${pg}"`}>${soon ? '<span class="soon">Em breve</span>' : ''}<div class="art">${art}</div><div class="ico">${icon}</div><div><h3>${t}</h3><p>${d}</p></div>
      <button class="lp-btn ${btn}" ${soon ? 'disabled' : `data-act="pg" data-pg="${pg}"`}>${b} ${IC.arrow}</button>${soon ? '' : IC.right.replace('<svg', '<svg class="chev"')}</div>`; }).join('')}</div>
    ${dest.length ? `<h2 class="lp-h2 has-more">Destaques <button class="more" data-act="pg" data-pg="catalogo">Ver todos →</button></h2>
      <div class="lp-dest-wrap"><button class="lp-arrow l" data-act="rolar" data-d="-1" aria-label="Anterior">${IC.left}</button><div class="lp-dest" id="dest">${dest.map(x => `<button class="lp-item" ${x.act}><span class="th">${x.img ? `<img src="${x.img}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(ART.bookThumb))">` : x.tipo === 'Livro' ? ART.bookThumb : ART.notes}</span>
        <span class="tx"><span class="lp-tag ${x.tipo === 'Cantiga' ? 'c' : ''}">${x.tipo}</span><b>${esc(x.t)}</b><span class="go">${x.go} →</span></span></button>`).join('')}</div><button class="lp-arrow r" data-act="rolar" data-d="1" aria-label="Próximo">${IC.right}</button></div>` : ''}`;
}
function catalogo() {
  const gen = D.generos.filter(g => D.obras.some(o => o.genero === g.sigla));
  return `${cabecalho('Catálogo Físico', 'Busque no acervo e peça a retirada. A biblioteca confirma e você recebe o protocolo para assinar.')}
    <div class="toolbar"><label class="search" style="flex:1 1 240px"><span class="sr">Buscar</span>${IC.search}<input id="q" data-in="q" value="${esc(F.q)}" placeholder="Título ou autor" autocomplete="off"></label>
      <select data-ch="g" aria-label="Gênero"><option value="">Todos os gêneros</option>${gen.map(g => `<option value="${g.sigla}" ${F.g === g.sigla ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}</select></div>
    <div id="lista">${listaObras()}</div>`;
}
function listaObras() {
  const q = norm(F.q), pend = new Set(D.solicitacoes.filter(s => s.status === 'pendente').map(s => s.obraId));
  const l = D.obras.filter(o => (!F.g || o.genero === F.g) && (!q || norm(o.titulo + ' ' + o.autor).includes(q))).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  if (!l.length) return '<div class="table-wrap"><div class="empty">Nenhum livro encontrado.</div></div>';
  return `<p class="small muted">${l.length} ${l.length === 1 ? 'título' : 'títulos'}</p><div class="table-wrap cards"><table><thead><tr><th>Livro</th><th>Disponível</th><th><span class="sr">Ação</span></th></tr></thead><tbody>
    ${l.slice(0, 300).map(o => `<tr id="obra-${o.id}"><td class="lead"><div class="t">${esc(o.titulo)}</div><div class="s">${esc(o.autor)}${o.ano ? ' · ' + o.ano : ''}</div></td>
      <td data-label="Disponível">${o.disp ? `<span class="pill ok">${o.disp} de ${o.total}</span>` : '<span class="pill mute">emprestado</span>'}</td>
      <td class="actions">${pend.has(o.id) ? '<span class="pill warn">pedido feito</span>' : o.disp && !D.bloqueios.length ? `<button class="btn sm primary" data-act="pedir" data-id="${o.id}">Pedir retirada</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}
const virtual = () => `${cabecalho('Biblioteca Virtual')}<div class="lp-panel lp-soonpage">${ART.tablet}<h2>Em breve</h2><p class="muted">Aqui você vai poder ler os livros digitais da biblioteca direto na tela, onde e quando quiser.</p></div>`;
const SOL = { pendente: ['Aguardando a biblioteca', 'warn'], confirmada: ['Confirmado', 'ok'], recusada: ['Não confirmado', 'bad'], expirada: ['Expirou', 'mute'], cancelada: ['Cancelado', 'mute'] };
function perfil() {
  const l = D.leitor, at = D.emprestimos.filter(x => !x.dataDev), hist = D.emprestimos.filter(x => x.dataDev), h = hoje();
  const linha = (a, b) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--lp-line)">${a}<span style="text-align:right">${b}</span></div>`;
  const emp = x => linha(`<span><b>${esc(x.titulo)}</b><br><span class="small muted">${esc(x.autor)} · ${esc(x.codigo)}</span></span>`, `${x.pendente ? '<span class="pill warn">assinar o protocolo</span>' : x.dataDev ? `<span class="small muted">devolvido em ${fmtD(x.dataDev)}</span>` : `<span class="pill ${x.dataPrev < h ? 'bad' : 'info'}">${x.dataPrev < h ? 'atrasado desde' : 'devolver até'} ${fmtD(x.dataPrev)}</span>`}${x.protocolo === 'renovacao' ? '<br><span class="small muted">renovação aguardando assinatura</span>' : ''}`);
  return `${cabecalho('Meu Perfil')}
    <section class="lp-panel"><h2>${esc(l.nome)}</h2><p class="muted" style="margin:0">${l.email ? 'E-mail: ' + esc(l.email) + ' · ' : ''}${l.associado ? 'Associado(a) da casa' : 'Leitor(a) da biblioteca'}</p></section>
    <section class="lp-panel"><h2>Comigo agora</h2>${at.length ? at.map(emp).join('') : '<p class="muted">Você não está com nenhum livro.</p>'}<p class="small muted">Até ${D.config.maxExemplares} livros ao mesmo tempo, por ${D.config.prazo} dias.${D.config.renovacoes ? ' Para renovar, fale com a biblioteca.' : ''}</p></section>
    <section class="lp-panel"><h2>Meus pedidos</h2>${D.solicitacoes.length ? D.solicitacoes.map(s => linha(`<span><b>${esc(s.titulo)}</b><br><span class="small muted">pedido em ${fmtD(s.criadaEm)}${s.status === 'pendente' ? ` · separado até ${fmtD(s.expiraEm)}` : ''}${s.motivo ? ' · ' + esc(s.motivo) : ''}</span></span>`, `<span class="pill ${SOL[s.status][1]}">${SOL[s.status][0]}</span>${s.status === 'pendente' ? `<br><button class="btn sm ghost" data-act="cancelar" data-id="${s.id}">Cancelar pedido</button>` : ''}`)).join('') : '<p class="muted">Nenhum pedido ainda.</p>'}</section>
    ${hist.length ? `<section class="lp-panel"><h2>Histórico</h2>${hist.slice(0, 15).map(emp).join('')}</section>` : ''}
    <section class="lp-panel"><h2>Aparência</h2><div class="seg" role="group" aria-label="Tema">${Object.keys(TEMA.nomes).map(k => `<button type="button" data-act="tema" data-t="${k}" aria-pressed="${TEMA.get() === k}">${TEMA.nomes[k]}</button>`).join('')}</div><p class="small muted">Automático segue o tema do aparelho. A escolha fica guardada neste aparelho.</p></section>
    <section class="lp-panel"><h2>Trocar a senha</h2><form data-form="trocar" style="display:grid;gap:10px;max-width:420px">${campo('t-atual', 'Senha atual', 'type="password" autocomplete="current-password"')}${campo('t-nova', 'Nova senha', 'type="password" autocomplete="new-password" minlength="6" maxlength="64"')}${campo('t-nova2', 'Repita a nova senha', 'type="password" autocomplete="new-password" maxlength="64"')}<button class="lp-btn" style="justify-self:start">Salvar nova senha</button></form>
      <p class="small muted">Trocar a senha encerra o acesso nos outros aparelhos.</p></section>
    <button class="lp-btn light" data-act="sair">${IC.out} Sair</button>`;
}
const FAQ = [
  ['Como peço um livro?', 'No Catálogo Físico, toque em "Pedir retirada". O livro fica separado para você por alguns dias. Quando a biblioteca confirmar, você recebe o protocolo de empréstimo para assinar e retira o livro.'],
  ['Como assino o protocolo pelo gov.br?', 'O protocolo chega no seu e-mail em PDF. Acesse assinador.iti.br, entre com a sua conta gov.br (nível prata ou ouro), assine no campo "Assinatura do usuário" e responda o e-mail com o PDF assinado. Se preferir, assine no papel na biblioteca.'],
  ['Qual o prazo para devolver?', 'O prazo aparece em Meu Perfil, em "Comigo agora". Se precisar de mais tempo, fale com a biblioteca para renovar antes do vencimento.'],
  ['Esqueci a minha senha.', 'Na tela de entrada, use "Primeiro acesso ou esqueci a senha": enviamos um código para o seu e-mail. Sem e-mail no cadastro, peça o código a um operador da biblioteca.'],
  ['Quem vê as cantigas?', 'As cantigas são só para os associados da casa, com o cadastro em dia na Secretaria.'],
];
const ajuda = () => `${cabecalho('Ajuda', 'Dúvidas mais comuns sobre o portal da biblioteca.')}<section class="lp-panel lp-faq">${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
  <section class="lp-panel"><h2>Ainda com dúvida?</h2><p class="muted">Fale com a biblioteca pelo WhatsApp.</p><a class="lp-btn green" href="https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o portal da Biblioteca Luzes de Aruanda.')}" target="_blank" rel="noopener">Conversar no WhatsApp ${IC.arrow}</a></section>`;

/* ---------- cantigas (só associados) ---------- */
const ORIG = { tradicional: 'Tradicional', autor: 'Autoria conhecida', casa: 'Da casa' };
const cSecNome = id => { const x = C.secoes.find(y => y.id === id); if (!x) return ''; const p = x.paiId && C.secoes.find(y => y.id === x.paiId); return p ? `${p.nome} › ${x.nome}` : x.nome; };
const cToq = id => (C.toques.find(t => t.id === id) || {}).nome || '';
const naSecao = (c, sec) => !sec || c.secoes.some(id => id === sec || (C.secoes.find(x => x.id === id) || {}).paiId === sec);
function listaCantigas() {
  const q = norm(FC.q), l = C.cantigas.filter(c => naSecao(c, FC.sec) && (!FC.toq || c.toqueId === FC.toq) && (!FC.casa || c.origem === 'casa') && (!q || norm(c.titulo + ' ' + c.letra).includes(q))).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  if (!l.length) return '<div class="table-wrap"><div class="empty">Nenhuma cantiga encontrada.</div></div>';
  return `<p class="small muted">${l.length} ${l.length === 1 ? 'cantiga' : 'cantigas'}</p>` + l.map(c => `<button class="cant-card" data-act="cVer" data-id="${c.id}"><b>${esc(c.titulo)}</b>${c.origem === 'casa' ? ' <span class="pill ok">Da casa</span>' : ''}<span class="small muted">${c.secoes.map(id => esc(cSecNome(id))).join(' · ')}${c.toqueId ? ' · ' + esc(cToq(c.toqueId)) : ''}${c.youtube ? ' · vídeo' : ''}${c.audio ? ' · áudio' : ''}</span></button>`).join('');
}
function cantigas() {
  if (!C) return cabecalho('Cantigas') + '<p class="muted">Carregando…</p>';
  if (FC.id) {
    const c = C.cantigas.find(x => x.id === FC.id); if (!c) { FC.id = ''; return cantigas(); }
    return `<button class="btn sm ghost" data-act="cVoltar">← Voltar às cantigas</button><div class="lp-head" style="margin-top:10px"><div><h1>${esc(c.titulo)}</h1>
      <p>${c.secoes.map(id => esc(cSecNome(id))).join(' · ')}${c.toqueId ? ' · toque <b>' + esc(cToq(c.toqueId)) + '</b>' : ''} · ${ORIG[c.origem] || ''}${c.autor ? ': ' + esc(c.autor) : ''}</p></div></div>
      ${c.youtube ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${c.youtube}" title="Vídeo da cantiga" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="small"><a href="https://www.youtube.com/watch?v=${c.youtube}" target="_blank" rel="noopener">Abrir no YouTube</a></p>` : ''}
      ${c.audio ? `<button class="lp-btn purple" data-act="cOuvir" data-id="${c.id}">▶ Ouvir áudio</button><div id="c-play" style="margin-top:8px"></div>` : ''}
      <pre class="letra">${esc(c.letra || 'Letra ainda não cadastrada.')}</pre>${c.obs ? `<p class="small muted">${esc(c.obs)}</p>` : ''}`;
  }
  const pais = C.secoes.filter(x => !x.paiId).sort((a, b) => a.ordem - b.ordem), secAtual = C.secoes.find(y => y.id === FC.sec) || {}, paiSel = secAtual.paiId || FC.sec, subs = paiSel ? C.secoes.filter(x => x.paiId === paiSel) : [];
  return `${cabecalho('Cantigas', 'Assista, ouça e leia as cantigas da casa.')}
    <div class="seg" role="group" aria-label="Seções" style="margin-bottom:8px">${pais.map(p => `<button type="button" data-act="cSec" data-id="${p.id}" aria-pressed="${paiSel === p.id}">${esc(p.nome)}</button>`).join('')}</div>
    ${subs.length ? `<div class="seg" role="group" aria-label="Subseções" style="margin-bottom:8px">${subs.map(p => `<button type="button" data-act="cSec" data-id="${p.id}" aria-pressed="${FC.sec === p.id}">› ${esc(p.nome)}</button>`).join('')}</div>` : ''}
    <div class="toolbar"><label class="search" style="flex:1 1 200px"><span class="sr">Buscar</span>${IC.search}<input data-in="cq" value="${esc(FC.q)}" placeholder="Título ou trecho da letra" autocomplete="off"></label>
      <select data-ch="ctoq" aria-label="Toque"><option value="">Todos os toques</option>${C.toques.map(t => `<option value="${t.id}" ${FC.toq === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>
      <label class="check small"><input type="checkbox" data-ch="ccasa" ${FC.casa ? 'checked' : ''}> Só da casa</label></div>
    <div id="clista" class="cant-lista">${listaCantigas()}</div>`;
}

function render() {
  document.body.classList.toggle('lp', V === 'app');
  if (V !== 'app') { $('#app').innerHTML = LOGIN[V](); const f = $('#app input'); if (f) f.focus(); return; }
  const pg = { inicio, catalogo, virtual, cantigas, perfil, ajuda }[PG] || inicio;
  $('#app').innerHTML = moldura(pg());
}

/* ---------- ações ---------- */
const ACT = {
  ir: t => { V = t.dataset.v; render(); },
  pg: t => irPara(t.dataset.pg),
  menu: () => { MENU = true; render(); },
  tema: t => { TEMA.set(t.dataset.t); render(); },
  menuFechar: (t, e) => { if (e.target === t) { MENU = false; render(); } },
  sair: () => sair(),
  atualizar: () => run(async () => { await carregar(); if (C) C = await api('leitor.cantigas', { token: token() }, 'Atualizando…'); render(); }),
  fechar: (t, e) => { if (e.target === t || t.tagName === 'BUTTON') modal(''); },
  rolar: t => { const d = $('#dest'); if (d) d.scrollBy({ left: +t.dataset.d * 290, behavior: 'smooth' }); },
  verObra: t => { const o = D.obras.find(x => x.id === t.dataset.id); F.q = o ? o.titulo : ''; F.g = ''; irPara('catalogo'); },
  verCantiga: t => { const id = t.dataset.id; if (C) { FC.id = id; PG = 'cantigas'; render(); return; } run(async () => { C = await api('leitor.cantigas', { token: token() }, 'Carregando a cantiga…'); FC.id = id; PG = 'cantigas'; render(); window.scrollTo(0, 0); }); },
  pedir: t => { const o = D.obras.find(x => x.id === t.dataset.id); modal(`<h2>Pedir retirada</h2><p><b>${esc(o.titulo)}</b><br><span class="muted">${esc(o.autor)}</span></p>
      <p class="small">O livro fica separado para você por ${D.config.diasSolicitacao} ${D.config.diasSolicitacao === 1 ? 'dia' : 'dias'}. A biblioteca confirma o pedido e você recebe o protocolo para assinar (pode ser pelo gov.br). Prazo de devolução: ${D.config.prazo} dias após a retirada.</p>
      <div class="modal-actions"><button class="btn" data-act="fechar">Voltar</button><button class="btn primary" data-act="pedirOk" data-id="${o.id}">Confirmar pedido</button></div>`); },
  pedirOk: t => run(async () => { const r = await api('leitor.solicitar', { token: token(), obraId: t.dataset.id }, 'Enviando pedido…'); modal(''); toast(`Pedido feito! O livro fica separado até ${fmtD(r.expiraEm)}.`); await carregar(); }),
  cancelar: t => run(async () => { await api('leitor.cancelar', { token: token(), id: t.dataset.id }, 'Cancelando…'); toast('Pedido cancelado'); await carregar(); }),
  cSec: t => { FC.sec = FC.sec === t.dataset.id ? '' : t.dataset.id; FC.id = ''; render(); },
  cVer: t => { FC.id = t.dataset.id; render(); window.scrollTo(0, 0); },
  cVoltar: () => { FC.id = ''; render(); },
  cOuvir: t => run(async () => { const r = await api('leitor.cantigaAudio', { token: token(), id: t.dataset.id }, 'Carregando o áudio…'); $('#c-play').innerHTML = `<audio controls autoplay src="data:${r.mime};base64,${r.dados}" style="width:100%"></audio>`; }),
};
const FORMS = {
  entrar: () => run(async () => { CPF = $('#l-cpf').value; try { const r = await api('leitor.entrar', { cpf: CPF, senha: $('#l-senha').value }, 'Entrando…'); ls.set('bibLeitor', r.token); await carregar(); }
    catch (e) { if (e.code === 'NOSENHA') { V = 'codigo'; render(); } throw e; } }),
  email: () => run(async () => {
    const e = $('#e-email').value.trim(); if (!$('#e-nasc').value) { toast('Informe a data de nascimento.', 'bad'); return; } if (e.toLowerCase() !== $('#e-email2').value.trim().toLowerCase()) { toast('Os e-mails não são iguais.', 'bad'); return; }
    const r = await api('leitor.email', { cpf: CPF, nascimento: $('#e-nasc').value, email: e }, 'Salvando o e-mail…'); V = 'senha'; render(); toast(`E-mail salvo. Código enviado para ${r.email}. Confira também a caixa de spam.`);
  }),
  codigo: () => run(async () => { CPF = $('#c-cpf').value; const r = await api('leitor.codigo', { cpf: CPF }, 'Enviando código…'); if (r.semEmail) { V = 'email'; render(); return; } V = 'senha'; render(); toast(`Código enviado para ${r.email}. Confira também a caixa de spam.`); }),
  senha: () => run(async () => {
    CPF = $('#s-cpf').value; const s1 = $('#s-senha').value;
    if (s1 !== $('#s-senha2').value) { toast('As senhas não são iguais.', 'bad'); return; }
    const r = await api('leitor.senha', { cpf: CPF, codigo: $('#s-cod').value, senha: s1 }, 'Salvando…'); ls.set('bibLeitor', r.token); toast('Senha salva!'); await carregar();
  }),
  trocar: () => run(async () => {
    const n = $('#t-nova').value; if (n !== $('#t-nova2').value) { toast('As senhas novas não são iguais.', 'bad'); return; }
    const r = await api('leitor.trocarSenha', { token: token(), atual: $('#t-atual').value, nova: n }, 'Salvando…'); ls.set('bibLeitor', r.token); toast('Senha alterada'); render();
  }),
};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act]) { if (t.tagName === 'A') return; if (t.disabled) return; e.preventDefault(); ACT[t.dataset.act](t, e); } });
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (f) { e.preventDefault(); FORMS[f.dataset.form](); } });
document.addEventListener('input', e => {
  if (e.target.matches('[data-cpf]')) { const p = e.target.selectionStart === e.target.value.length; e.target.value = fmtCPF(e.target.value); if (p) e.target.selectionStart = e.target.selectionEnd = e.target.value.length; }
  if (e.target.dataset.in === 'q') { F.q = e.target.value; $('#lista').innerHTML = listaObras(); }
  if (e.target.dataset.in === 'cq') { FC.q = e.target.value; $('#clista').innerHTML = listaCantigas(); }
});
document.addEventListener('change', e => { const k = e.target.dataset.ch; if (k === 'g') { F.g = e.target.value; $('#lista').innerHTML = listaObras(); } if (k === 'ctoq') { FC.toq = e.target.value; $('#clista').innerHTML = listaCantigas(); } if (k === 'ccasa') { FC.casa = e.target.checked; $('#clista').innerHTML = listaCantigas(); } });
if (token()) run(carregar).then(() => { if (!D) { V = 'entrar'; render(); } }); else render();
