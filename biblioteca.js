/* Biblioteca de exercícios: 1.324 exercícios com GIF, em exercicios/.
   Animações © Gym visual — https://gymvisual.com/ */
(function () {
  'use strict';
  const BASE = 'exercicios/';
  const MAPA = 'bx-mapa';
  let itens = null, apelidos = {}, credito = '', porId = {}, carregando = null;

  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const VAZIAS = new Set(['com', 'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'em', 'e', 'o', 'a', 'ao', 'para', 'the', 'with', 'on']);
  const palavras = t => norm(t).split(' ').filter(p => p && !VAZIAS.has(p) && !/^\d+$/.test(p)).map(p => p === 'halter' ? 'halteres' : p);
  function lerMapa() { try { return JSON.parse(localStorage.getItem(MAPA) || '{}') || {}; } catch (e) { return {}; } }
  function gravarMapa(m) { try { localStorage.setItem(MAPA, JSON.stringify(m)); } catch (e) {} }

  function carregar() {
    if (itens) return Promise.resolve(true);
    if (carregando) return carregando;
    carregando = fetch(BASE + 'catalogo.json').then(r => { if (!r.ok) throw new Error('catalogo'); return r.json(); }).then(d => {
      apelidos = d.apelidos || {}; credito = d.credito || '';
      itens = d.itens.map(([id, nome, en, parte, equip, alvo, sec, passos, lang]) => ({ id, nome, en, parte, equip, alvo, sec: sec || [], passos: String(passos || '').split('|').filter(Boolean), lang, busca: norm(nome + ' ' + en + ' ' + parte + ' ' + equip + ' ' + alvo) }));
      itens.forEach(i => { i.pal = new Set(i.busca.split(' ')); porId[i.id] = i; });
      return true;
    }).catch(() => { carregando = null; return false; });
    return carregando;
  }
  const pronta = () => !!itens;
  const gifDe = i => BASE + 'gifs/' + i.id + '.gif';

  function achar(nome) {
    if (!itens) return null;
    const n = norm(nome); if (!n) return null;
    const m = lerMapa()[n]; if (m && porId[m]) return porId[m];
    if (apelidos[n] && porId[apelidos[n]]) return porId[apelidos[n]];
    const exato = itens.find(i => norm(i.nome) === n || norm(i.en) === n); if (exato) return exato;
    const ps = palavras(nome); if (!ps.length) return null;
    const hits = itens.filter(i => ps.every(p => i.pal.has(p)));
    if (hits.length) return hits.sort((a, b) => a.nome.length - b.nome.length)[0];
    let melhor = null;
    Object.keys(apelidos).forEach(a => { const pa = palavras(a); if (pa.length && pa.every(p => ps.includes(p)) && (!melhor || pa.length > melhor.n)) melhor = { n: pa.length, id: apelidos[a] }; });
    return melhor && porId[melhor.id] ? porId[melhor.id] : null;
  }

  function buscar(q, parte, equip) {
    const ps = palavras(q);
    let l = itens.filter(i => (!parte || i.parte === parte) && (!equip || i.equip === equip) && ps.every(p => i.busca.includes(p)));
    if (norm(q)) {
      const n = norm(q), ap = apelidos[n] && porId[apelidos[n]];
      l = l.map(i => [i, (i === ap ? 0 : norm(i.nome).startsWith(n) ? 1 : 2), i.nome.length]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
      if (ap && !l.includes(ap)) l.unshift(ap);
    }
    return l;
  }

  const CSS = `
  #bx{position:fixed;inset:0;z-index:70;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;--bx-m:var(--fg2,var(--muted));padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) 0 env(safe-area-inset-left,0)}
  #bx *{box-sizing:border-box}
  #bx button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
  .bx-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px 6px}
  .bx-top h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-.01em;min-width:0}
  .bx-x{flex:none;width:44px;height:44px;margin-right:-8px;font-size:26px!important;line-height:1;color:var(--bx-m)!important}
  .bx-filtros{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px 16px 10px}
  .bx-filtros input,.bx-filtros select{width:100%;height:44px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--fg);font:inherit;font-size:16px;padding:0 12px;min-width:0}
  .bx-filtros input{grid-column:1/-1}
  .bx-lista{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px calc(20px + env(safe-area-inset-bottom,0px))}
  .bx-cont{font-size:13px;color:var(--bx-m);margin:0 0 8px}
  .bx-item{display:flex!important;align-items:center;gap:12px;width:100%;min-height:76px;padding:8px 0;border-bottom:1px solid var(--line)!important;text-align:left}
  .bx-item img,.bx-sem{flex:none;width:60px;height:60px;border-radius:12px;background:#fff;object-fit:contain}
  .bx-item b{display:block;font-size:15px;font-weight:600;line-height:1.25}
  .bx-item span{display:block;font-size:13px;color:var(--bx-m);margin-top:2px}
  .bx-mais{display:block;width:100%;height:46px;margin-top:10px;border-radius:12px;background:var(--surface)!important;color:var(--accent)!important;font-weight:600!important}
  .bx-det{max-width:520px;margin:0 auto;padding-bottom:12px}
  .bx-gif{display:block;width:100%;max-width:300px;aspect-ratio:1;margin:4px auto 12px;border-radius:18px;background:#fff;object-fit:contain}
  .bx-en{margin:0 0 10px;font-size:14px;color:var(--bx-m)}
  .bx-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:0;list-style:none}
  .bx-tags li{padding:5px 10px;border-radius:99px;background:var(--surface);font-size:13px;font-weight:600}
  .bx-tags li.a{background:var(--accent);color:#fff}
  .bx-det h3{margin:14px 0 8px;font-size:17px}
  .bx-det ol{margin:0;padding-left:22px;display:grid;gap:8px;font-size:15px;line-height:1.4}
  .bx-aviso{margin:0 0 8px;font-size:13px;color:var(--bx-m)}
  .bx-cred{display:block;margin-top:14px;font-size:12px;color:var(--bx-m)}
  .bx-cta{display:block;width:100%;height:50px;margin-top:14px;border-radius:14px;background:var(--accent)!important;color:#fff!important;font-weight:700!important}
  .bx-sec{display:block;width:100%;height:46px;margin-top:8px;color:var(--accent)!important;font-weight:600!important}
  .bx-mini{display:flex!important;align-items:center;gap:10px;width:100%;padding:0;text-align:left;font:inherit;color:inherit;background:none;border:0;cursor:pointer}
  .bx-mini img{flex:none;width:64px;height:64px;border-radius:12px;background:#fff;object-fit:contain}
  .bx-mini span{font-size:14px;font-weight:600;color:var(--accent)}`;
  function css() { if (document.getElementById('bx-css')) return; const s = document.createElement('style'); s.id = 'bx-css'; s.textContent = CSS; document.head.appendChild(s); }

  let raiz = null, opts = {}, lista = [], vistos = 0, volta = null, quemAbriu = null;
  function montar() {
    css(); fechar(true); quemAbriu = document.activeElement;
    raiz = document.createElement('div'); raiz.id = 'bx'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Biblioteca de exercícios');
    raiz.addEventListener('click', clique); raiz.addEventListener('input', filtrar); raiz.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } });
    document.body.appendChild(raiz);
  }
  function fechar(silencioso) { if (raiz) { raiz.remove(); raiz = null; if (!silencioso && quemAbriu && quemAbriu.focus && document.contains(quemAbriu)) quemAbriu.focus(); } }
  const topo = (t, voltar) => `<div class="bx-top">${voltar ? '<button class="bx-x" data-bx="voltar" aria-label="Voltar" style="margin:0 0 0 -12px">‹</button>' : ''}<h2 style="flex:1">${esc(t)}</h2><button class="bx-x" data-bx="fechar" aria-label="Fechar">×</button></div>`;
  function telaLista(q) {
    const un = k => [...new Set(itens.map(i => i[k]))].sort((a, b) => a.localeCompare(b, 'pt'));
    const o = (l, t) => `<option value="">${t}</option>` + l.map(v => `<option>${esc(v)}</option>`).join('');
    raiz.innerHTML = `${topo(opts.aoEscolher ? 'Escolher exercício' : 'Biblioteca de exercícios')}<div class="bx-filtros"><input id="bx-q" type="search" placeholder="Buscar: supino, agachamento, rosca…" aria-label="Buscar exercício" autocomplete="off" value="${esc(q || '')}"><select id="bx-p" aria-label="Parte do corpo">${o(un('parte'), 'Todo o corpo')}</select><select id="bx-e" aria-label="Equipamento">${o(un('equip'), 'Todo equipamento')}</select></div><div class="bx-lista" id="bx-l"></div>`;
    filtrar();
  }
  function filtrar(ev) {
    if (!raiz || (ev && !ev.target.closest('.bx-filtros'))) return;
    const q = raiz.querySelector('#bx-q'); if (!q) return;
    lista = buscar(q.value, raiz.querySelector('#bx-p').value, raiz.querySelector('#bx-e').value); vistos = 0;
    const l = raiz.querySelector('#bx-l'); l.scrollTop = 0;
    l.innerHTML = `<p class="bx-cont" aria-live="polite">${lista.length.toLocaleString('pt-BR')} ${lista.length === 1 ? 'exercício' : 'exercícios'}</p><div id="bx-i"></div>`; maisItens();
  }
  function maisItens() {
    const box = raiz.querySelector('#bx-i'), b = raiz.querySelector('.bx-mais'); if (b) b.remove();
    const n = lista.slice(vistos, vistos + 30); vistos += n.length;
    box.insertAdjacentHTML('beforeend', n.map(i => `<button class="bx-item" data-bx="ver" data-id="${esc(i.id)}"><img src="${gifDe(i)}" alt="" loading="lazy" width="60" height="60"><div><b>${esc(i.nome)}</b><span>${esc(i.parte)} · ${esc(i.equip)}</span></div></button>`).join(''));
    if (vistos < lista.length) box.insertAdjacentHTML('afterend', '<button class="bx-mais" data-bx="mais">Ver mais</button>');
    else if (!lista.length) box.innerHTML = '<p class="bx-cont">Nada encontrado. Tente outra palavra ou limpe os filtros.</p>';
  }
  function telaDetalhe(i, comVolta) {
    const passo = i.passos.map(p => `<li>${esc(p)}</li>`).join('');
    const nomeOrig = opts.nomeOriginal;
    raiz.innerHTML = `${topo(i.nome, comVolta)}<div class="bx-lista"><div class="bx-det"><img class="bx-gif" src="${gifDe(i)}" alt="Demonstração de ${esc(i.nome)}" width="300" height="300"><p class="bx-en">${esc(i.en)}</p><ul class="bx-tags"><li class="a">${esc(i.alvo)}</li>${i.sec.map(s => `<li>${esc(s)}</li>`).join('')}<li>${esc(i.equip)}</li></ul><h3>Como fazer</h3>${i.lang === 'es' ? '<p class="bx-aviso">Passo a passo disponível em espanhol.</p>' : ''}<ol${i.lang === 'es' ? ' lang="es"' : ''}>${passo}</ol><a class="bx-cred" href="https://gymvisual.com/" target="_blank" rel="noopener">${esc(credito)}</a>${opts.aoEscolher ? `<button class="bx-cta" data-bx="usar" data-id="${esc(i.id)}">Usar este exercício</button>` : ''}${nomeOrig && !opts.aoEscolher ? '<button class="bx-sec" data-bx="trocar">Não é este? Escolher outro</button>' : ''}</div></div>`;
  }
  function clique(ev) {
    const b = ev.target.closest('[data-bx]'); if (!b) return;
    const a = b.dataset.bx, i = porId[b.dataset.id];
    if (a === 'fechar') fechar();
    else if (a === 'mais') maisItens();
    else if (a === 'ver' && i) { volta = true; const q = raiz.querySelector('#bx-q'), p = raiz.querySelector('#bx-p'), e = raiz.querySelector('#bx-e'); opts._est = { q: q.value, p: p.value, e: e.value, n: vistos }; telaDetalhe(i, true); }
    else if (a === 'voltar') { const s = opts._est || {}; telaLista(s.q); raiz.querySelector('#bx-p').value = s.p || ''; raiz.querySelector('#bx-e').value = s.e || ''; filtrar(); while (vistos < (s.n || 0) && vistos < lista.length) maisItens(); }
    else if (a === 'usar' && i) { const f = opts.aoEscolher, n = opts.vincular; if (n) { const m = lerMapa(); m[norm(n)] = i.id; gravarMapa(m); } fechar(); f(i.nome, i); }
    else if (a === 'trocar') { const nome = opts.nomeOriginal; abrir({ busca: nome, vincular: nome, aoEscolher: opts.aoTrocar || (() => {}) }); }
  }
  function abrir(o) { carregar().then(ok => { if (!ok) { alert('Não consegui carregar a biblioteca. Confira sua internet.'); return; } opts = o || {}; montar(); telaLista(opts.busca || ''); }); }
  function verPorNome(nome, aoTrocar) { carregar().then(ok => { if (!ok) return; const i = achar(nome); opts = { nomeOriginal: nome, aoTrocar }; montar(); if (i) telaDetalhe(i, false); else { opts = { busca: nome, vincular: nome, aoEscolher: aoTrocar || (() => {}) }; telaLista(nome); } }); }
  function miniHTML(nome, attrs) { const i = achar(nome); if (!i) return ''; css(); return `<button type="button" class="bx-mini" ${attrs}><img src="${gifDe(i)}" alt="Demonstração de ${esc(i.nome)}" loading="lazy" width="64" height="64"><span>Como fazer</span></button>`; }

  window.Biblioteca = { carregar, pronta, achar, abrir, verPorNome, gifDe, miniHTML, credito: () => credito };
})();
