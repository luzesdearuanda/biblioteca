/* Tema (versão 1.6.1): automático (segue o aparelho), claro ou escuro. Guardado neste aparelho e aplicado antes de a página aparecer. */
window.TEMA = {
  nomes: { auto: 'Automático', claro: 'Claro', escuro: 'Escuro' },
  get: function () { try { var t = localStorage.getItem('tema'); return t === 'claro' || t === 'escuro' ? t : 'auto'; } catch (e) { return 'auto'; } },
  set: function (t) { try { if (t === 'claro' || t === 'escuro') localStorage.setItem('tema', t); else localStorage.removeItem('tema'); } catch (e) { } this.aplicar(t); },
  aplicar: function (t) { var r = document.documentElement; if (t === 'claro') r.setAttribute('data-theme', 'light'); else if (t === 'escuro') r.setAttribute('data-theme', 'dark'); else r.removeAttribute('data-theme'); }
};
TEMA.aplicar(TEMA.get());
