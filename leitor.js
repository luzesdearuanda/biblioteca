/* Portal do leitor (versão 1.5): catálogo, meus livros e pedidos de retirada. Login com CPF e senha própria. */
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
let V = 'entrar', D = null, F = { q: '', g: '', tab: 'catalogo' }, CPF = '';
const LOGO = 'logo.png';

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
function sair(msg) { ls.set('bibLeitor', null); D = null; V = 'entrar'; render(); if (msg) toast(msg, 'bad'); }
const token = () => ls.get('bibLeitor');
async function carregar() { D = await api('leitor.dados', { token: token() }, 'Carregando…'); V = 'app'; render(); }

const card = body => `<div class="login"><div class="login-card">
  <div class="logo-disc"><img src="${LOGO}" alt="Logo da Associação Centro de Umbanda Luzes de Aruanda"></div>
  <div style="display:grid;gap:6px"><div class="eyebrow">Portal do leitor</div><h1>Biblioteca Luzes de Aruanda</h1><p class="muted">Consulte o acervo, seus empréstimos e peça a retirada de livros.</p></div>
  ${body}
  <p class="small muted"><a href="https://wa.me/${WHATS}?text=${encodeURIComponent(WHATS_MSG)}" target="_blank" rel="noopener">Não tenho cadastro: pedir pelo WhatsApp</a> · <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
</div></div>`;
const campo = (id, label, attrs = '') => `<div class="field" style="text-align:left"><label for="${id}">${label}</label><input id="${id}" ${attrs}></div>`;
const VIEWS = {
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
    <p class="small muted">Sem e-mail no cadastro? Peça o código a um operador da biblioteca.</p>`),
  senha: () => card(`<form class="form" data-form="senha" style="display:grid;gap:12px">
      ${campo('s-cpf', 'CPF', `inputmode="numeric" placeholder="000.000.000-00" value="${esc(fmtCPF(CPF))}" data-cpf`)}
      ${campo('s-cod', 'Código de 6 dígitos', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"')}
      ${campo('s-senha', 'Nova senha (mínimo 6 caracteres)', 'type="password" autocomplete="new-password" minlength="6" maxlength="64"')}
      ${campo('s-senha2', 'Repita a senha', 'type="password" autocomplete="new-password" maxlength="64"')}
      <button class="btn primary">Salvar senha e entrar</button></form>
    <button class="btn ghost" data-act="ir" data-v="entrar">Voltar</button>`),
  app: () => {
    const l = D.leitor;
    return `<div class="page" style="max-width:920px;margin:0 auto;padding:16px">
      <div class="page-head"><div><h1>Olá, ${esc(l.primeiroNome)}!</h1><p class="sub">Biblioteca Luzes de Aruanda · portal do leitor</p></div>
        <div class="toolbar"><button class="btn sm ghost" data-act="atualizar">Atualizar</button><button class="btn sm" data-act="sair">Sair</button></div></div>
      ${D.bloqueios.length ? `<div class="note warn"><b>No momento você não pode retirar livros</b><span>${D.bloqueios.map(esc).join(' ')}</span></div>` : ''}
      <div class="seg" role="group" aria-label="Seções" style="margin:6px 0 14px">${[['catalogo', 'Acervo'], ['meus', `Meus livros${D.solicitacoes.some(s => s.status === 'pendente') ? ' •' : ''}`]].map(([k, t]) => `<button type="button" data-act="tab" data-t="${k}" aria-pressed="${F.tab === k}">${t}</button>`).join('')}</div>
      ${F.tab === 'meus' ? meus() : catalogo()}</div>`;
  },
};
function catalogo() {
  const gen = D.generos.filter(g => D.obras.some(o => o.genero === g.sigla));
  return `<div class="toolbar"><label class="search" style="flex:1 1 240px"><span class="sr">Buscar</span><input id="q" data-in="q" value="${esc(F.q)}" placeholder="Título ou autor" autocomplete="off"></label>
      <select data-ch="g" aria-label="Gênero"><option value="">Todos os gêneros</option>${gen.map(g => `<option value="${g.sigla}" ${F.g === g.sigla ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}</select></div>
    <div id="lista">${listaObras()}</div>`;
}
function listaObras() {
  const q = norm(F.q), pend = new Set(D.solicitacoes.filter(s => s.status === 'pendente').map(s => s.obraId));
  const l = D.obras.filter(o => (!F.g || o.genero === F.g) && (!q || norm(o.titulo + ' ' + o.autor).includes(q))).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  if (!l.length) return '<div class="table-wrap"><div class="empty">Nenhum livro encontrado.</div></div>';
  return `<p class="small muted">${l.length} ${l.length === 1 ? 'título' : 'títulos'}</p><div class="table-wrap cards"><table><thead><tr><th>Livro</th><th>Disponível</th><th><span class="sr">Ação</span></th></tr></thead><tbody>
    ${l.slice(0, 300).map(o => `<tr><td class="lead"><div class="t">${esc(o.titulo)}</div><div class="s">${esc(o.autor)}${o.ano ? ' · ' + o.ano : ''}</div></td>
      <td data-label="Disponível">${o.disp ? `<span class="pill ok">${o.disp} de ${o.total}</span>` : '<span class="pill mute">emprestado</span>'}</td>
      <td class="actions">${pend.has(o.id) ? '<span class="pill warn">pedido feito</span>' : o.disp && !D.bloqueios.length ? `<button class="btn sm primary" data-act="pedir" data-id="${o.id}">Pedir retirada</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}
const SOL = { pendente: ['Aguardando a biblioteca', 'warn'], confirmada: ['Confirmado', 'ok'], recusada: ['Não confirmado', 'bad'], expirada: ['Expirou', 'mute'], cancelada: ['Cancelado', 'mute'] };
function meus() {
  const at = D.emprestimos.filter(l => !l.dataDev), hist = D.emprestimos.filter(l => l.dataDev), h = hoje();
  const emp = l => `<div class="row-item" style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span><b>${esc(l.titulo)}</b><br><span class="small muted">${esc(l.autor)} · ${esc(l.codigo)}</span></span>
    <span style="text-align:right">${l.pendente ? '<span class="pill warn">assinar o protocolo</span>' : l.dataDev ? `<span class="small muted">devolvido em ${fmtD(l.dataDev)}</span>` : `<span class="pill ${l.dataPrev < h ? 'bad' : 'info'}">${l.dataPrev < h ? 'atrasado desde' : 'devolver até'} ${fmtD(l.dataPrev)}</span>`}${l.protocolo === 'renovacao' ? '<br><span class="small muted">renovação aguardando assinatura</span>' : ''}</span></div>`;
  return `<section class="panel"><h2>Comigo agora</h2>${at.length ? at.map(emp).join('') : '<p class="muted">Você não está com nenhum livro.</p>'}
      <p class="small muted">Até ${D.config.maxExemplares} livros ao mesmo tempo, por ${D.config.prazo} dias.${D.config.renovacoes ? ' Para renovar, fale com a biblioteca.' : ''}</p></section>
    <section class="panel"><h2>Meus pedidos</h2>${D.solicitacoes.length ? D.solicitacoes.map(s => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span><b>${esc(s.titulo)}</b><br><span class="small muted">pedido em ${fmtD(s.criadaEm)}${s.status === 'pendente' ? ` · separado até ${fmtD(s.expiraEm)}` : ''}${s.motivo ? ' · ' + esc(s.motivo) : ''}</span></span>
      <span style="text-align:right"><span class="pill ${SOL[s.status][1]}">${SOL[s.status][0]}</span>${s.status === 'pendente' ? `<br><button class="btn sm ghost" data-act="cancelar" data-id="${s.id}">Cancelar pedido</button>` : ''}</span></div>`).join('') : '<p class="muted">Nenhum pedido ainda.</p>'}</section>
    ${hist.length ? `<section class="panel"><h2>Histórico</h2>${hist.slice(0, 15).map(emp).join('')}</section>` : ''}`;
}
function render() { $('#app').innerHTML = VIEWS[V](); const f = $('#app input'); if (f && V !== 'app') f.focus(); }

const ACT = {
  ir: t => { V = t.dataset.v; render(); },
  tab: t => { F.tab = t.dataset.t; render(); },
  sair: () => sair(),
  atualizar: () => run(carregar),
  fechar: (t, e) => { if (e.target === t || t.tagName === 'BUTTON') modal(''); },
  pedir: t => { const o = D.obras.find(x => x.id === t.dataset.id); modal(`<h2>Pedir retirada</h2><p><b>${esc(o.titulo)}</b><br><span class="muted">${esc(o.autor)}</span></p>
      <p class="small">O livro fica separado para você por ${D.config.diasSolicitacao} ${D.config.diasSolicitacao === 1 ? 'dia' : 'dias'}. A biblioteca confirma o pedido e você recebe o protocolo para assinar (pode ser pelo gov.br). Prazo de devolução: ${D.config.prazo} dias após a retirada.</p>
      <div class="modal-actions"><button class="btn" data-act="fechar">Voltar</button><button class="btn primary" data-act="pedirOk" data-id="${o.id}">Confirmar pedido</button></div>`); },
  pedirOk: t => run(async () => { const r = await api('leitor.solicitar', { token: token(), obraId: t.dataset.id }, 'Enviando pedido…'); modal(''); toast(`Pedido feito! O livro fica separado até ${fmtD(r.expiraEm)}.`); await carregar(); }),
  cancelar: t => run(async () => { await api('leitor.cancelar', { token: token(), id: t.dataset.id }, 'Cancelando…'); toast('Pedido cancelado'); await carregar(); }),
};
const FORMS = {
  entrar: () => run(async () => { CPF = $('#l-cpf').value; try { const r = await api('leitor.entrar', { cpf: CPF, senha: $('#l-senha').value }, 'Entrando…'); ls.set('bibLeitor', r.token); await carregar(); }
    catch (e) { if (e.code === 'NOSENHA') { V = 'codigo'; render(); } throw e; } }),
  codigo: () => run(async () => { CPF = $('#c-cpf').value; const r = await api('leitor.codigo', { cpf: CPF }, 'Enviando código…'); V = 'senha'; render(); toast(`Código enviado para ${r.email}. Confira também a caixa de spam.`); }),
  senha: () => run(async () => {
    CPF = $('#s-cpf').value; const s1 = $('#s-senha').value;
    if (s1 !== $('#s-senha2').value) { toast('As senhas não são iguais.', 'bad'); return; }
    const r = await api('leitor.senha', { cpf: CPF, codigo: $('#s-cod').value, senha: s1 }, 'Salvando…'); ls.set('bibLeitor', r.token); toast('Senha salva!'); await carregar();
  }),
};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act]) { if (t.tagName === 'A') return; e.preventDefault(); ACT[t.dataset.act](t, e); } });
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (f) { e.preventDefault(); FORMS[f.dataset.form](); } });
document.addEventListener('input', e => {
  if (e.target.matches('[data-cpf]')) { const p = e.target.selectionStart === e.target.value.length; e.target.value = fmtCPF(e.target.value); if (p) e.target.selectionStart = e.target.selectionEnd = e.target.value.length; }
  if (e.target.dataset.in === 'q') { F.q = e.target.value; $('#lista').innerHTML = listaObras(); }
});
document.addEventListener('change', e => { if (e.target.dataset.ch === 'g') { F.g = e.target.value; $('#lista').innerHTML = listaObras(); } });
if (token()) run(carregar).then(() => { if (!D) { V = 'entrar'; render(); } }); else render();
