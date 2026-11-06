/* Tema (versão 1.6.1; alto contraste na 1.9): automático (segue o aparelho), claro, escuro ou alto contraste. Guardado neste aparelho e aplicado antes de a página aparecer. */
window.TEMA = {
  nomes: { auto: 'Automático', claro: 'Claro', escuro: 'Escuro', contraste: 'Alto contraste' },
  get: function () { try { var t = localStorage.getItem('tema'); return t === 'claro' || t === 'escuro' || t === 'contraste' ? t : 'auto'; } catch (e) { return 'auto'; } },
  set: function (t) { try { if (t === 'claro' || t === 'escuro' || t === 'contraste') localStorage.setItem('tema', t); else localStorage.removeItem('tema'); } catch (e) { } this.aplicar(t); },
  aplicar: function (t) { var r = document.documentElement; if (t === 'claro') r.setAttribute('data-theme', 'light'); else if (t === 'escuro') r.setAttribute('data-theme', 'dark'); else if (t === 'contraste') r.setAttribute('data-theme', 'contrast'); else r.removeAttribute('data-theme'); }
};
TEMA.aplicar(TEMA.get());
