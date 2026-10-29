/* Foco — app pessoal de rotina do corretor/coordenador.
   Firebase Auth (Google) + Firestore + Google Agenda (Calendar API v3). */
(function(){
'use strict';
const CFG = window.FOCO_CONFIG;
const TZ = CFG.timeZone || 'America/Sao_Paulo';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/* ================= utilidades ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate()+n); return ymd(d); };
const parseD = s => { const [y,m,d] = s.slice(0,10).split('-').map(Number); return new Date(y, m-1, d); };
const parseDT = s => { const [a,b='00:00'] = s.split('T'); const d = parseD(a); const [h,mi] = b.split(':').map(Number); d.setHours(h, mi, 0, 0); return d; };
const localDT = d => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, isFinite(v) ? v : 0));
const fmt = (n, dec=0) => Number(n).toLocaleString('pt-BR', {minimumFractionDigits:dec, maximumFractionDigits:dec});
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DOW1 = ['D','S','T','Q','Q','S','S'];
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const ddmm = s => { const d = parseD(s); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`; };
const longDate = d => d.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'});
const initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
const kcalOf = m => Math.round((+m.p||0)*4 + (+m.c||0)*4 + (+m.g||0)*9);
const byKey = k => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0);

const ICON = {
  hoje:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clientes:'<path d="M16 20v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20"/><circle cx="9.2" cy="7.5" r="3.6"/><path d="M21.5 20v-1.5a4 4 0 0 0-3-3.9M15.6 3.9a3.6 3.6 0 0 1 0 7.1"/>',
  agenda:'<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  corpo:'<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>',
  estudos:'<path d="M2 5.5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v14a2.5 2.5 0 0 0-2.5-2.5H4a2 2 0 0 1-2-2zM22 5.5a2 2 0 0 0-2-2h-5a3 3 0 0 0-3 3v14a2.5 2.5 0 0 1 2.5-2.5H20a2 2 0 0 0 2-2z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  chev:'<path d="m9 18 6-6-6-6"/>', left:'<path d="m15 18-6-6 6-6"/>', bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  chat:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>', pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', link:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  dumbbell:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>', food:'<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11"/>',
  scale:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 9.5a5.5 5.5 0 0 1 8 0L13 13"/>', book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/>',
  cap:'<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>', gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  users2:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a6.5 6.5 0 0 0-4.5-6.2"/>'
};
const ic = (n, cls='') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]||''}</svg>`;

/* ================= estado ================= */
const KEYS = ['clientes','produtos','corretores','peso','treinos','alimentacao','livros','cursos','prefs'];
const ETAPAS = ['Novo lead','Contato feito','Visita agendada','Visita efetuada','Simulação','Análise de crédito','Proposta','Documentação','Venda','Perdido'];
const VI = ETAPAS.indexOf('Venda');
const ATIVAS = ETAPAS.slice(0, VI);
const TEMPS = ['Quente','Morno','Frio'];
const PCORES = ['#0A84FF','#30B0C7','#34C759','#FF9500','#AF52DE','#FF2D55','#5E5CE6','#A2845E'];
// Todos os empreendimentos do repositório de apresentações + os que Franco trabalha fora dele
const CATALOGO = [["Accoi","Ilhas Gregas"],["Applausi","Applausi Villaggio Engordadouro"],["Area","Brisas da Mata"],["Area","Clube Brisas Jundiaí"],["Area","Reserva da Mata"],["Auten","Auten Jundiaí"],["Auten","Auten Serrah"],["Auten","Terrace Serra do Japi"],["Benedo","Vila San Pietro"],["Carfam","Veduta Blu"],["Casa Paulista","Lago Azul"],["Cemara","Jardim Mirante"],["Cemara","Parque Petropolis"],["Cia Brasil Urbano","Yes"],["Concx","GrandClub Esportiva Jundiaí"],["Diretiva","Kaza Alamedas"],["Diretiva","Kaza Jundiaí"],["Diretiva","Residencial Alta Vista"],["Eccoinc","Colinas da Colônia"],["Emccamp","Residencial Ravello"],["FA Oliva","Allegro"],["FA Oliva","Belong"],["FA Oliva","Chronos"],["FA Oliva","Conquista Agapeama"],["FA Oliva","Contemporâneo"],["FA Oliva","Giardino"],["FA Oliva","Jardim Conquista"],["FA Oliva","Life"],["FA Oliva","Monte Bianco"],["FA Oliva","Odeon"],["FA Oliva","Paraíso"],["FA Oliva","Quinta do Pinhal"],["FA Oliva","Soneto"],["FA Oliva","Terraço"],["FA Oliva","Vila Garibaldi"],["FA Oliva","Vila Preciosa"],["FHV","Alamedas São José"],["Fibra","Reserva Bellano"],["Fibra","Villaggio Bellano"],["GPdesurb","Granville Santo Angelo"],["Grupo Lar","La Sierra"],["Lemos","Verde Vida Jundiaí"],["Lewale","Loteamento Mosaico"],["Lewale","Reserva Santa Isabel"],["Living","Vista Park"],["Lotear","TerraCaxambu"],["Lumy","Lumy Art"],["Lumy","Lumy Jundiaí"],["Luxor","Bella Vida Santo Antonio"],["Maclucer","Altissimi"],["Maclucer","Avelã"],["Maclucer","Bellacqua"],["Maclucer","Maitá"],["Maclucer","Manawa"],["Maclucer","Nexus"],["Maclucer","Singolare"],["Maclucer","Soleggiato"],["Maclucer","Vallis"],["Maclucer","Vila Itália"],["Maclucer","Vinea"],["Maclucer","Vista Bella"],["Manduca","Forest Houses"],["Martinez","Quartieri"],["MPD","Eleve"],["MPD","Línea"],["MRV","Jardim das Araucárias"],["MRV","Jardim di Florença"],["MRV","Jardins Engordadouro"],["Palas","Jardim Atenas"],["Patriani","Epic Jundiaí"],["Plano&Plano","Fatto"],["Polo","Skyvision"],["Raposo","Volpe"],["REM","Doppio Residencial"],["Santa Angela","Altos da Avenida"],["Santa Angela","Gioviale"],["Santa Angela","Jardins do Horto"],["Santa Angela","Maxx Residencial"],["Santa Angela","Portal dos Lagos"],["Santa Angela","Reserva Castanheira"],["Santa Angela","Reserva dos Lagos"],["Santa Angela","Reserva Marajoara"],["Santa Angela","Residencial Gaudí"],["Santa Angela","Residencial Vigóre"],["Santa Angela","Resort Prime"],["Santa Angela","Torres de Ozanam"],["Santa Angela","Villagio Tunis"],["Sponchiatto","Villagio Caxambu"],["Tamboré","Tamboré"],["Tebas","Authoria"],["Tebas","Design"],["Tebas","Essence"],["Tebas","Terras da Alvorada"],["Tebas","Ávora"],["Vic Engenharia","Gran Vic Lumen"],["Vic Engenharia","Gran Vic Pulse"],["VVC","Buriti"],["VVC","Portal dos Ipês"],["VVC","Portal dos Lírios"],["Zarzur","Loteamento Vem Viver"],["ZS Urbanismo","Portal dos Pássaros"],["","Bosque das Sapucaias"],["","Colinas"],["","Garden"],["","Gran Fornari"],["","La Villa Barcelona"],["","La Villa Madrid"],["","Mistral Jundiaí"],["","Oásis"],["","Reserva di Medeiros"],["","Salas e loja 9 de Julho"],["","Santorini"],["","Trend"]];
const normNome = n => String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function catalogo(){ return CATALOGO.map(([inc, nome]) => ({id: 'c-' + normNome(nome), nome, inc, cor: PCORES[[...(inc||nome)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PCORES.length]})); }
const DEF = () => ({
  clientes: [],
  produtos: [
    {id:'gvniagara', nome:'Gran Vic Niágara', inc:'Vic Engenharia', cor:'#0A84FF', coord:true},
    {id:'gvnexus', nome:'Gran Vic Nexus', inc:'Vic Engenharia', cor:'#5E5CE6', coord:true},
    {id:'brisas', nome:'Brisas do Japi', inc:'VVC', cor:'#34C759', coord:true},
    {id:'smartape', nome:'Smart Apê Medeiros', inc:'Grupo Zarin', cor:'#FF9500', coord:true},
    {id:'villagio', nome:'Villagio dos Eucaliptos', inc:'Emccamp', cor:'#30B0C7', coord:true}
  ].concat(catalogo()),
  prefs: {catalogo: 1},
  corretores: [{id:'eu', nome:'Eu'}],
  peso: {items: [], meta: null},
  treinos: {rotinas: [], feitos: []},
  alimentacao: {metas: null, refeicoes: []},
  livros: {items: [], meta: 12, log: []},
  cursos: {items: []}
});
let S = DEF();
let me = null;             // usuário Firebase
let fdb = null;            // Firestore
let atend = [];            // atendimentos compartilhados
let people = {};           // diretório de usuários do app {uid:{nome,email,foto}}
const gcache = {};         // eventos Google por dia
const ui = {
  tab: 'hoje', clientesFiltroCor: 'todos', clientesFiltroProd: 'todos', clientesEtapa: null,
  corpo: 'peso', pesoPeriodo: 30, estudos: 'leitura', agendaDia: today(), cursoAberto: null
};
const TABS = [['hoje','Hoje'],['clientes','Clientes'],['agenda','Agenda'],['corpo','Corpo'],['estudos','Estudos']];

const P = id => S.produtos.find(p => p.id === id) || {nome:'Sem produto', cor:'#8E8E93'};
const B = id => S.corretores.find(c => c.id === id) || {nome:'—'};

/* ================= Firebase ================= */
const configOk = CFG.firebase && CFG.firebase.apiKey && CFG.firebase.apiKey !== 'PREENCHER';
let auth = null;
if (configOk) {
  firebase.initializeApp(CFG.firebase);
  auth = firebase.auth();
  fdb = firebase.firestore();
  try { fdb.enablePersistence({synchronizeTabs:true}).catch(()=>{}); } catch(e) {}
}

let syncState = 'ok';
function setSync(s){ syncState = s; const el = $('#syncInd'); if (el) { el.className = 'sync ' + s; el.lastChild.textContent = syncLabel(); } }
const syncLabel = () => ({ok:'Salvo na sua conta', saving:'Salvando…', err:'Sem conexão, tentando de novo'})[syncState];

const pending = new Set(); let saveTimer;
function save(...ks){
  ks.forEach(k => pending.add(k));
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 350);
}
async function flush(){
  if (!me || !fdb || !pending.size) return;
  const ks = [...pending]; pending.clear(); setSync('saving');
  try {
    const batch = fdb.batch();
    ks.forEach(k => batch.set(fdb.doc(`users/${me.uid}/dados/${k}`), {v: S[k], at: Date.now()}));
    await batch.commit(); setSync('ok');
  } catch(e) { ks.forEach(k => pending.add(k)); setSync('err'); setTimeout(flush, 5000); }
}

async function loadUserData(){
  const snaps = await Promise.all(KEYS.map(k => fdb.doc(`users/${me.uid}/dados/${k}`).get().catch(()=>null)));
  const d = DEF();
  snaps.forEach((s, i) => { const k = KEYS[i]; S[k] = (s && s.exists && s.data().v !== undefined) ? s.data().v : d[k]; });
  if (!S.corretores.length) S.corretores = d.corretores;
  let mig = false; S.clientes.forEach(c => { if (c.etapa === 'Visita') { c.etapa = 'Visita agendada'; mig = true; } }); if (mig) save('clientes');
  if (!S.prefs || !S.prefs.catalogo) {           // completa a lista com todos os empreendimentos, uma vez
    const have = new Set(S.produtos.map(p => normNome(p.nome)));
    d.produtos.forEach(p => { const ex = S.produtos.find(x => normNome(x.nome) === normNome(p.nome)); if (ex) { if (!ex.inc) ex.inc = p.inc; if (p.coord) ex.coord = true; } else if (!have.has(normNome(p.nome))) S.produtos.push(p); });
    S.prefs = Object.assign({}, S.prefs, {catalogo: 1}); save('produtos', 'prefs');
  }
  const eu = S.corretores.find(c => c.id === 'eu'); if (eu && eu.nome === 'Eu') eu.nome = (me.displayName || 'Eu').split(' ')[0];
}

let unsubAt = null;
function watchAtendimentos(){
  if (unsubAt) unsubAt();
  unsubAt = fdb.collection('atendimentos').where('participantes', 'array-contains', me.uid)
    .onSnapshot(qs => {
      atend = qs.docs.map(d => ({id: d.id, ...d.data()}));
      const ids = new Set(); atend.forEach(a => (a.participantes||[]).forEach(u => ids.add(u)));
      loadPeople([...ids]).then(() => { if (!$('#sheetWrap').classList.contains('open') || ui.tab !== 'agenda') render(false); else render(false); });
    }, () => {});
}
async function loadPeople(ids){
  const miss = ids.filter(i => !people[i]);
  await Promise.all(miss.map(i => fdb.doc('users/' + i).get().then(s => { if (s.exists) people[i] = s.data(); }).catch(()=>{})));
}
async function loadDirectory(){
  try { const qs = await fdb.collection('users').get(); qs.docs.forEach(d => people[d.id] = d.data()); } catch(e) {}
}

/* ================= Google Agenda ================= */
let tok = null, tokExp = 0;
try { const t = JSON.parse(sessionStorage.getItem('foco-gtok') || 'null'); if (t && t.exp > Date.now()) { tok = t.v; tokExp = t.exp; } } catch(e) {}
function setTok(v, secs){ tok = v; tokExp = Date.now() + ((secs||3600) - 120) * 1000; try { sessionStorage.setItem('foco-gtok', JSON.stringify({v, exp: tokExp})); } catch(e) {} }
const hasTok = () => !!tok && Date.now() < tokExp;
function requestTok(){
  return new Promise((res, rej) => {
    if (!window.google || !google.accounts || !google.accounts.oauth2) return rej(new Error('Google ainda carregando, tente de novo.'));
    const c = google.accounts.oauth2.initTokenClient({
      client_id: CFG.googleClientId, scope: SCOPE, hint: me && me.email,
      callback: r => { if (r.error) rej(new Error(r.error_description || r.error)); else { setTok(r.access_token, +r.expires_in); res(tok); } },
      error_callback: e => rej(new Error(e.type === 'popup_closed' ? 'Janela fechada antes de liberar a agenda.' : 'Não deu para conectar a agenda.'))
    });
    c.requestAccessToken({prompt: ''});
  });
}
async function cal(path, opts={}, retry=true){
  if (!hasTok()) await requestTok();
  const r = await fetch('https://www.googleapis.com/calendar/v3/' + path, {
    ...opts, headers: {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', ...(opts.headers||{})}
  });
  if (r.status === 401 && retry) { tok = null; await requestTok(); return cal(path, opts, false); }
  if (!r.ok) { let m = 'Erro ' + r.status; try { m = (await r.json()).error.message || m; } catch(e) {} throw new Error(m); }
  return r.status === 204 ? null : r.json();
}
async function loadGoogleDay(day){
  if (!hasTok() || gcache[day] === 'loading') return;
  gcache[day] = 'loading';
  try {
    const a = parseD(day), b = parseD(addDays(day, 1));
    const q = new URLSearchParams({timeMin: a.toISOString(), timeMax: b.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '50'});
    const r = await cal('calendars/primary/events?' + q, {}, false);
    gcache[day] = (r.items || []).filter(e => e.status !== 'cancelled');
  } catch(e) { gcache[day] = 'err'; }
  if (ui.tab === 'agenda' || ui.tab === 'hoje') render(false);
}
const endOf = (ini, min) => localDT(new Date(parseDT(ini).getTime() + min * 60000));
const evTime = (dt) => ({dateTime: dt + ':00', timeZone: TZ});

/* ================= animação ================= */
const mem = new Map();
function tween(el, prop, a, b){ el.style.transition = 'none'; el.style[prop] = a; el.getBoundingClientRect(); el.style.transition = ''; el.style[prop] = b; }
function countUp(el, a, b, dec){
  const t0 = performance.now(), D = 900;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(a + (b - a) * e, dec); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function animate(root){
  const still = RM.matches;
  root.querySelectorAll('[data-count]').forEach(el => {
    const k = 'c' + el.dataset.k, v = +el.dataset.count, dec = +(el.dataset.dec || 0);
    const from = mem.has(k) ? mem.get(k) : 0; mem.set(k, v);
    if (still || from === v) el.textContent = fmt(v, dec); else countUp(el, from, v, dec);
  });
  root.querySelectorAll('[data-ring]').forEach(el => {
    const k = 'r' + el.dataset.k, v = clamp(+el.dataset.ring), C = +el.dataset.c;
    const from = mem.has(k) ? mem.get(k) : 0; mem.set(k, v);
    if (still || from === v) el.style.strokeDashoffset = C * (1 - v); else tween(el, 'strokeDashoffset', C * (1 - from), C * (1 - v));
  });
  root.querySelectorAll('[data-bar],[data-vbar]').forEach(el => {
    const vert = el.hasAttribute('data-vbar'), v = clamp(+(vert ? el.dataset.vbar : el.dataset.bar));
    const k = 'b' + el.dataset.k, from = mem.has(k) ? mem.get(k) : 0; mem.set(k, v);
    const f = x => vert ? `scaleY(${Math.max(x, .001)})` : `scaleX(${Math.max(x, .001)})`;
    if (still || from === v) el.style.transform = f(v); else tween(el, 'transform', f(from), f(v));
  });
  root.querySelectorAll('[data-draw]').forEach(el => {
    const k = 'd' + el.dataset.k, sig = el.dataset.draw, svg = el.closest('svg');
    if (mem.get(k) === sig || still) { mem.set(k, sig); return; }
    mem.set(k, sig);
    const L = el.getTotalLength();
    el.style.strokeDasharray = L; tween(el, 'strokeDashoffset', L, 0);
    el.style.transition = 'stroke-dashoffset 1.1s var(--ease)';
    svg.querySelectorAll('.ar,.pt,.tag').forEach(x => tween(x, 'opacity', 0, ''));
  });
}

/* ================= render ================= */
let lastTabIdx = 0;
function render(entering, dir){
  const v = $('#view');
  const flips = {};
  if (!entering) v.querySelectorAll('[data-flip]').forEach(el => flips[el.dataset.flip] = el.getBoundingClientRect());
  const fn = VIEWS[ui.tab]; v.innerHTML = fn();
  v.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 10)));
  v.querySelectorAll('.seg').forEach(placeThumb);
  if (entering) {
    v.classList.remove('enter','from-r','from-l'); void v.offsetWidth;
    v.classList.add('enter'); if (dir) v.classList.add(dir);
  } else if (!RM.matches) {
    v.querySelectorAll('[data-flip]').forEach(el => {
      const a = flips[el.dataset.flip]; if (!a) return; const b = el.getBoundingClientRect();
      const dy = a.top - b.top; if (Math.abs(dy) < 1) return;
      el.animate([{transform:`translateY(${dy}px)`}, {transform:'none'}], {duration: 420, easing: 'cubic-bezier(.22,.8,.24,1)'});
    });
  }
  animate(v);
  bindCharts(v);
  if (ui.tab === 'agenda') { ensureGoogle(ui.agendaDia); }
  if (ui.tab === 'hoje') { ensureGoogle(today()); }
}
function ensureGoogle(day){ if (hasTok() && gcache[day] === undefined) loadGoogleDay(day); }
function placeThumb(seg){
  const bs = [...seg.querySelectorAll('button')], i = Math.max(0, bs.findIndex(b => b.classList.contains('on')));
  let th = seg.querySelector('.thumb'); if (!th) { th = document.createElement('span'); th.className = 'thumb'; seg.prepend(th); }
  th.style.width = `calc((100% - 6px) / ${bs.length})`; th.style.transform = `translateX(${i * 100}%)`;
}
function renderTabs(){
  const t = $('#tabs');
  t.querySelectorAll('.tab').forEach(x => x.remove());
  TABS.forEach(([k, l]) => t.insertAdjacentHTML('beforeend', `<button class="tab${ui.tab === k ? ' on' : ''}" data-act="tab" data-v="${k}" aria-current="${ui.tab === k ? 'page' : 'false'}">${ic(k)}<span>${l}</span></button>`));
  placePill();
}
function placePill(){
  const i = TABS.findIndex(x => x[0] === ui.tab), pill = $('#tabPill'), w = ($('#tabs').clientWidth - 12) / TABS.length;
  pill.style.width = w + 'px'; pill.style.transform = `translateX(${i * w}px)`;
}
addEventListener('resize', () => { if (me) placePill(); });

function head(eyebrow, title, actions=''){
  const ava = me && me.photoURL ? `<img src="${esc(me.photoURL)}" alt="" referrerpolicy="no-referrer">` : initials(me && me.displayName);
  return `<header class="head rv"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div><div class="head-actions">${actions}<button class="avatar" data-act="ajustes" aria-label="Ajustes e conta">${ava}</button></div></header>`;
}
const addBtn = (act, label) => `<button class="round" data-act="${act}" aria-label="${label}">${ic('plus')}</button>`;
const empty = (icon, t, p, btn='') => `<div class="empty">${ic(icon)}<b>${t}</b><p>${p}</p>${btn}</div>`;
const seg = (act, opts, cur) => `<div class="seg" role="tablist">${opts.map(([k,l]) => `<button class="${k===cur?'on':''}" data-act="${act}" data-v="${k}" role="tab" aria-selected="${k===cur}">${l}</button>`).join('')}</div>`;
function ring(v, size, stroke, key, color='var(--accent)', inner=''){
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="trk" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}" fill="none"/><circle class="bar" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-ring="${clamp(v)}" data-c="${C}" data-k="${key}"/></svg><div class="ctr">${inner}</div></div>`;
}
const hbar = (v, key, color) => `<div class="hbar"><i style="${color?`background:${color};`:''}transform:scaleX(0)" data-bar="${clamp(v)}" data-k="${key}"></i></div>`;

/* ---------- regras derivadas ---------- */
const ativos = () => S.clientes.filter(c => ATIVAS.includes(c.etapa));
const dueClientes = () => { const t = today(); return ativos().filter(c => c.lembrete && c.lembrete.slice(0,10) <= t).sort(byKey('lembrete')); };
function whenLabel(lem){
  if (!lem) return {txt:'Sem lembrete', cls:'flat'};
  const d = lem.slice(0,10), t = today(), hr = lem.slice(11,16);
  if (d < t) return {txt:`Atrasado · ${ddmm(d)}`, cls:'down'};
  if (d === t) return {txt:`Hoje ${hr}`, cls:'up'};
  if (d === addDays(t,1)) return {txt:`Amanhã ${hr}`, cls:'flat'};
  return {txt:`${ddmm(d)} ${hr}`, cls:'flat'};
}
const pesoSorted = () => [...S.peso.items].sort(byKey('data'));
function pesoDelta(days){
  const s = pesoSorted(); if (s.length < 2) return null;
  const last = s[s.length-1], ref = [...s].reverse().find(x => x.data <= addDays(last.data, -days)) || s[0];
  return ref === last ? null : +(last.kg - ref.kg).toFixed(1);
}
const rotinasDe = dia => S.treinos.rotinas.filter(r => (r.dias||[]).includes(parseD(dia).getDay()));
const treinoFeito = dia => S.treinos.feitos.some(f => f.data === dia);
const refeicoesDe = dia => S.alimentacao.refeicoes.filter(r => r.data === dia);
const somaDia = dia => refeicoesDe(dia).reduce((a, r) => ({p:a.p+(+r.p||0), c:a.c+(+r.c||0), g:a.g+(+r.g||0), k:a.k+kcalOf(r)}), {p:0,c:0,g:0,k:0});
const metaKcal = () => S.alimentacao.metas ? (S.alimentacao.metas.kcal || kcalOf(S.alimentacao.metas)) : 0;
const livrosAtivos = () => S.livros.items.filter(l => !l.concluidoEm);
const lidosAno = () => S.livros.items.filter(l => l.concluidoEm && l.concluidoEm.slice(0,4) === today().slice(0,4)).length;
const cursoProx = c => (c.etapas||[]).find(e => !e.feitaEm);
const cursosAtivos = () => S.cursos.items.filter(c => cursoProx(c));
const atendDia = dia => atend.filter(a => a.inicio && a.inicio.slice(0,10) === dia && a.status !== 'cancelado').sort(byKey('inicio'));


/* ---------- frases (estoicas traduzidas livremente; motivacionais próprias) ----------
   {masculino|feminino} adapta ao tratamento escolhido pela conta */
const FRASES = [
  ['e','Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.','Sêneca'],
  ['e','Sofremos mais na imaginação do que na realidade.','Sêneca'],
  ['e','Sorte é o que acontece quando a preparação encontra a oportunidade.','Sêneca'],
  ['e','Enquanto adiamos, a vida passa.','Sêneca'],
  ['e','Nenhum vento é favorável para quem não sabe a que porto se dirige.','Sêneca'],
  ['e','As dificuldades fortalecem a mente, assim como o trabalho fortalece o corpo.','Sêneca'],
  ['e','Não temos pouco tempo. Desperdiçamos muito.','Sêneca'],
  ['e','A vida, se bem vivida, é longa o bastante.','Sêneca'],
  ['e','Quem está em todo lugar não está em lugar nenhum.','Sêneca'],
  ['e','Às vezes, até viver é um ato de coragem.','Sêneca'],
  ['e','Você tem poder sobre a sua mente, não sobre os acontecimentos. Perceba isso e encontrará força.','Marco Aurélio'],
  ['e','O que impede a ação faz a ação avançar. O que está no caminho se torna o caminho.','Marco Aurélio'],
  ['e','Pare de discutir como deve ser {um homem bom. Seja um|uma mulher boa. Seja uma}.','Marco Aurélio'],
  ['e','A felicidade da sua vida depende da qualidade dos seus pensamentos.','Marco Aurélio'],
  ['e','Ao acordar, pense no privilégio de estar {vivo|viva}: respirar, pensar, desfrutar, amar.','Marco Aurélio'],
  ['e','Faça cada coisa como se fosse a última da sua vida.','Marco Aurélio'],
  ['e','Se não é certo, não faça. Se não é verdade, não diga.','Marco Aurélio'],
  ['e','A melhor vingança é não ser como quem te feriu.','Marco Aurélio'],
  ['e','Não são as coisas que nos perturbam, mas a opinião que temos sobre elas.','Epicteto'],
  ['e','Primeiro diga a si mesmo o que você quer ser. Depois faça o que precisa ser feito.','Epicteto'],
  ['e','Ninguém é livre se não é {senhor|senhora} de si.','Epicteto'],
  ['e','É impossível aprender aquilo que se acha que já sabe.','Epicteto'],
  ['e','Riqueza não é ter muitas posses, mas ter poucos desejos.','Epicteto'],
  ['e','Temos dois ouvidos e uma boca para ouvir o dobro do que falamos.','Zenão de Cítio'],
  ['e','O bem-estar se alcança aos poucos, e isso não é pouca coisa.','Zenão de Cítio'],
  ['m','Cada não te deixa um passo mais perto do sim.'],
  ['m','Disciplina é fazer o que precisa ser feito, mesmo sem vontade.'],
  ['m','Hoje é dia de ligar para quem esfriou. Um retorno pode virar uma venda.'],
  ['m','Você não precisa estar {motivado|motivada}. Precisa estar {comprometido|comprometida}.'],
  ['m','Quem acompanha o cliente de perto fecha antes.'],
  ['m','Pequenas vitórias todo dia constroem grandes resultados.'],
  ['m','O corpo que você quer está do outro lado do treino de hoje.'],
  ['m','Você é {o único responsável|a única responsável} pelo seu ritmo.'],
  ['m','Consistência vence talento quando o talento não é consistente.'],
  ['m','Uma página por dia ainda é um livro por mês.'],
  ['m','Seja {lembrado|lembrada} pelo atendimento, não pelo preço.'],
  ['m','Organize o dia antes que o dia organize você.'],
  ['m','O cliente compra confiança antes de comprar o imóvel.'],
  ['m','Faça a ligação que você está adiando.'],
  ['m','{Cansado|Cansada}? Descanse. Não desista.'],
  ['m','Quem lidera dá o exemplo primeiro.'],
  ['m','Sua equipe vai até onde você mostra que dá para ir.'],
  ['m','Feito é melhor que perfeito. Agora, melhore.'],
  ['m','Resultado é rotina repetida.'],
  ['m','Seja 1% melhor que ontem.'],
  ['m','Você já passou por dias piores. Este também passa.'],
  ['m','A visita de hoje pode ser a chave que alguém recebe amanhã.'],
  ['m','{Focado|Focada} no processo, o resultado vem.'],
  ['m','Não espere a segunda-feira. Comece agora.'],
  ['m','Cuidar da saúde também é cuidar da carreira.'],
  ['m','{Preparado|Preparada} hoje, {tranquilo|tranquila} amanhã.']
];
// Palpite pelo primeiro nome da conta Google; a pessoa pode corrigir em Ajustes
const NOMES_F = new Set('ines lourdes beatris alice beatriz isabel raquel ester rute miriam carmen ingrid iris luz liz thais lais yasmin jasmin evelyn kelly shirley sueli suely marli marlene irene helen ellen karen sharon abigail lilian gislaine viviane rosane rosemary rose ruth nicole michele michelle simone denise juliane cristiane daiane eliane rafaele gabriele jaqueline aline caroline adriane luciane solange vitoria vivian miriã agnes mercedes dolores consuelo'.split(' '));
const NOMES_M = new Set('luca lucca joshua noah elias jonas matias tobias isaias jeremias zacarias andrea nicola josue moises davi levi luan ian ivan juan alan allan ryan bryan kauã kaua ruan iuri yuri wesley sidney stanley rodney'.split(' '));
const MASC_E = /(?:lipe|rique|orge|andre|herme|cente|naldo|ique|aque|ilhe)$/;
function generoPorNome(nome){
  const n = String(nome || '').trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!n) return null;
  if (NOMES_F.has(n)) return 'f';
  if (NOMES_M.has(n)) return 'm';
  if (/a$/.test(n)) return 'f';
  if (/(?:ane|ene|ine|ise|ice|ele|elle|ete|ette|ly|lly|ie)$/.test(n)) return 'f';
  if (/[oiu]$|[lrsnzmx]$|(?:son|ton)$/.test(n) || MASC_E.test(n)) return 'm';
  return null;
}
const generoAtual = () => (S.prefs && S.prefs.genero) || generoPorNome(me && me.displayName);
const generoTxt = (t, g) => t.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => g === 'f' ? f : m);
function fraseDoMomento(){
  const g = generoAtual();
  const pool = FRASES.filter(f => g || !/\{/.test(f[1]));
  const d = parseD(today()), dia = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return pool[(dia * 7 + (ui.fraseOff || 0)) % pool.length];
}
function cardFrase(){
  const g = generoAtual(), f = fraseDoMomento();
  const est = f[0] === 'e';
  return `<section class="card frase rv" id="fraseCard"><div class="sec-row"><span class="frase-tag ${est ? 'est' : 'mot'}">${est ? 'Estoicismo' : 'Motivação'}</span>
      <button class="mini" data-act="outraFrase" aria-label="Mostrar outra frase">Outra frase</button></div>
    <blockquote class="frase-txt" id="fraseTxt"><p>${esc(generoTxt(f[1], g))}</p>${f[2] ? `<cite>${esc(f[2])}</cite>` : ''}</blockquote>
    ${g ? '' : `<div class="frase-gen"><span class="small muted">Como as frases devem falar com você?</span><div class="btnrow"><button class="mini" data-act="genero" data-v="m">No masculino</button><button class="mini" data-act="genero" data-v="f">No feminino</button></div></div>`}
  </section>`;
}

/* ================= HOJE ================= */
function viewHoje(){
  const t = today(), now = new Date();
  const h = now.getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = (me.displayName || '').split(' ')[0];
  const tasks = [];
  dueClientes().forEach(c => tasks.push({k:'cli', id:c.id, t:`Retornar ${c.nome}`, s:[P(c.produtoId).nome, B(c.corretorId).nome, whenLabel(c.lembrete)], done:false, late:c.lembrete.slice(0,10) < t, cor:P(c.produtoId).cor}));
  S.clientes.filter(c => (c.contatos||[]).some(x => x.slice(0,10) === t) && !tasks.some(x => x.id === c.id)).forEach(c => tasks.push({k:'cli', id:c.id, t:`Retorno: ${c.nome}`, s:[P(c.produtoId).nome], done:true, cor:P(c.produtoId).cor}));
  atendDia(t).forEach(a => tasks.push({k:'at', id:a.id, t:a.titulo + (a.cliente ? ' · ' + a.cliente : ''), s:[a.inicio.slice(11,16), a.local||''], done: parseDT(endOf(a.inicio, a.duracao||60)) < now}));
  tasks.push({k:'peso', t:'Registrar peso', s:[S.peso.items.length ? 'Último: ' + fmt(pesoSorted().slice(-1)[0].kg, 1) + ' kg' : 'Primeiro registro'], done:S.peso.items.some(p => p.data === t)});
  const rot = rotinasDe(t);
  if (rot.length) tasks.push({k:'treino', t:'Treino: ' + rot.map(r => r.nome).join(', '), s:[(rot[0].exercicios||[]).length + ' exercícios'], done:treinoFeito(t)});
  if (S.alimentacao.metas) { const sd = somaDia(t); tasks.push({k:'alim', t:'Bater os macros', s:[`${fmt(sd.k)} de ${fmt(metaKcal())} kcal`], done: sd.k >= metaKcal() * .9}); }
  if (livrosAtivos().length) tasks.push({k:'ler', t:'Ler: ' + livrosAtivos()[0].titulo, s:['Registre as páginas'], done:S.livros.log.some(l => l.data === t)});
  const ca = cursosAtivos()[0];
  if (ca) tasks.push({k:'curso', t:ca.nome, s:['Próxima etapa: ' + cursoProx(ca).nome], done:S.cursos.items.some(c => (c.etapas||[]).some(e => e.feitaEm === t))});

  const done = tasks.filter(x => x.done).length, tot = tasks.length, pct = tot ? done / tot : 0;
  const quentes = ativos().filter(c => c.temp === 'Quente').length;
  const atras = ativos().filter(c => c.lembrete && c.lembrete.slice(0,10) < t).length;
  const ps = pesoSorted(), last = ps[ps.length-1], d7 = pesoDelta(7);
  const sd = somaDia(t);

  const pend = tasks.filter(x => !x.done), feitas = tasks.filter(x => x.done);
  const taskRow = x => `<div class="row${x.done ? ' done' : ''}" data-flip="${x.k}${x.id||''}">
      ${x.k === 'cli' && !x.done ? `<button class="check" data-act="contato" data-id="${x.id}" aria-label="Marcar retorno feito">${'<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'}</button>`
        : `<span class="check${x.done ? ' on' : ''}"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>`}
      <button class="grow rowbtn" data-act="taskgo" data-k="${x.k}" data-id="${x.id||''}"><span class="grow"><span class="t">${esc(x.t)}</span>
      <span class="s">${x.cor ? `<i class="dot" style="background:${x.cor}"></i>` : ''}${x.s.filter(Boolean).map(s => typeof s === 'object' ? `<span class="${s.cls}">${esc(s.txt)}</span>` : `<span>${esc(s)}</span>`).join('<span>·</span>')}</span></span>
      ${x.late ? '<span class="pill err">Atrasado</span>' : ''}</button></div>`;

  // por produto
  const porProd = S.produtos.map(p => ({p, n: ativos().filter(c => c.produtoId === p.id).length})).filter(x => x.n).sort((a,b) => b.n - a.n);
  const maxP = Math.max(1, ...porProd.map(x => x.n));

  return head(longDate(now), `${saud}${nome ? ', ' + esc(nome) : ''}`) + `
  <section class="card rv"><div class="hero">
    ${ring(pct, 96, 10, 'dia', 'var(--ok)', `<div><b class="num" data-count="${Math.round(pct*100)}" data-k="diapct">0</b><b>%</b><span>do dia</span></div>`)}
    <div class="hero-txt"><div class="muted small">Seu dia</div><div class="big"><span class="num" data-count="${done}" data-k="diadone">0</span> de ${tot} feitos</div>
    <div class="small muted">${dueClientes().length} retornos · ${atendDia(t).length} atendimentos</div></div>
  </div></section>
  ${cardFrase()}
  <section class="grid2">
    <button class="card tap kpi rv" data-act="goclientes" data-v="quentes"><span class="lbl">Clientes quentes</span><span class="val num" data-count="${quentes}" data-k="kq">0</span><span class="delta ${atras ? 'down' : 'flat'}">${atras ? atras + ' atrasados' : 'Tudo em dia'}</span></button>
    <button class="card tap kpi rv" data-act="gocorpo" data-v="peso"><span class="lbl">Peso</span><span class="val num">${last ? `<span data-count="${last.kg}" data-dec="1" data-k="kp">0</span><small>kg</small>` : '—'}</span><span class="delta ${d7 == null ? 'flat' : d7 <= 0 ? 'up' : 'down'}">${d7 == null ? 'Registre hoje' : (d7 > 0 ? '+' : '') + fmt(d7, 1) + ' kg em 7 dias'}</span></button>
    <button class="card tap kpi rv" data-act="gocorpo" data-v="alimentacao"><span class="lbl">Calorias hoje</span><span class="val num"><span data-count="${sd.k}" data-k="kk">0</span><small>kcal</small></span>${S.alimentacao.metas ? hbar(sd.k / metaKcal(), 'kkb', sd.k > metaKcal() * 1.05 ? 'var(--warn)' : 'var(--ok)') : '<span class="delta flat">Defina as metas</span>'}</button>
    <button class="card tap kpi rv" data-act="goestudos" data-v="leitura"><span class="lbl">Livros em ${now.getFullYear()}</span><span class="val num"><span data-count="${lidosAno()}" data-k="kl">0</span><small>de ${S.livros.meta || 0}</small></span>${hbar(S.livros.meta ? lidosAno() / S.livros.meta : 0, 'klb')}</button>
  </section>

  <section class="card rv"><h2>Para hoje · ${pend.length}</h2>
    ${pend.length ? `<div class="list">${pend.map(taskRow).join('')}</div>` : empty('check', 'Tudo feito por hoje', 'Os retornos de clientes e as rotinas do dia aparecem aqui.')}
  </section>
  ${feitas.length ? `<section class="card rv"><h2>Feitas · ${feitas.length}</h2><div class="list">${feitas.map(taskRow).join('')}</div></section>` : ''}
  ${porProd.length ? `<section class="card rv"><div class="sec-row"><h2>Clientes ativos por produto</h2></div><div class="funnel">${porProd.map((x, j) => `<button class="fstage" data-act="goprod" data-v="${x.p.id}" style="--j:${j}"><span class="nm">${esc(x.p.nome)}</span><span class="tr"><i style="background:${x.p.cor};transform:scaleX(0)" data-bar="${x.n / maxP}" data-k="pp${x.p.id}"></i></span><span class="ct num">${x.n}</span></button>`).join('')}</div></section>` : ''}
  `;
}

/* ================= CLIENTES ================= */
function viewClientes(){
  const fc = ui.clientesFiltroCor, fp = ui.clientesFiltroProd, fe = ui.clientesEtapa;
  let base = S.clientes.filter(c => (fc === 'todos' || (fc === 'quentes' ? c.temp === 'Quente' && ATIVAS.includes(c.etapa) : c.corretorId === fc)) && (fp === 'todos' || c.produtoId === fp));
  const counts = ETAPAS.map(e => base.filter(c => c.etapa === e).length), maxC = Math.max(1, ...counts);
  let list = fe ? base.filter(c => c.etapa === fe) : base.filter(c => ATIVAS.includes(c.etapa));
  const t = today();
  list.sort((a, b) => {
    const la = a.lembrete || '9999', lb = b.lembrete || '9999';
    return la < lb ? -1 : la > lb ? 1 : a.nome.localeCompare(b.nome);
  });
  const conv = base.length ? counts[VI] / base.length : 0;
  const chips = [['todos','Todos'],['quentes','Quentes'], ...S.corretores.map(c => [c.id, c.nome])];
  return head(`${ativos().length} ativos · ${counts[VI]} vendas`, 'Clientes', addBtn('novoCliente', 'Novo cliente')) + `
  <div class="chips rv">${chips.map(([k,l]) => `<button class="chip${fc === k ? ' on' : ''}" data-act="fcor" data-v="${k}">${esc(l)}</button>`).join('')}</div>
  <div class="rv"><label class="sr" for="fProd">Produto</label><select class="inp" id="fProd" data-change="fprod"><option value="todos">Todos os produtos</option>${prodOptions(fp)}</select></div>
  <section class="card rv"><div class="sec-row"><h2>Funil</h2>${fe ? `<button class="link" data-act="fetapa" data-v="">Limpar</button>` : `<span class="small muted">Conversão <b class="num">${fmt(conv*100)}%</b></span>`}</div>
    <div class="funnel${fe ? ' filtering' : ''}">${ETAPAS.map((e, j) => `<button class="fstage${fe === e ? ' on' : ''}" data-act="fetapa" data-v="${e}" style="--j:${j}"><span class="nm">${e}</span><span class="tr"><i style="${e === 'Venda' ? 'background:var(--ok);' : e === 'Perdido' ? 'background:var(--fg2);' : ''}transform:scaleX(0)" data-bar="${counts[j] / maxC}" data-k="fn${j}"></i></span><span class="ct num" >${counts[j]}</span></button>`).join('')}</div>
  </section>
  <div class="sec-row rv" style="padding:4px 2px 0"><span class="sec-title" style="margin:0">${fe ? esc(fe) : 'Em andamento'} · ${list.length}</span></div>
  ${list.length ? list.map(c => clienteCard(c, t)).join('') : `<section class="card rv">${empty('clientes', S.clientes.length ? 'Nenhum cliente neste filtro' : 'Seus clientes quentes ficam aqui', S.clientes.length ? 'Troque o corretor, o produto ou a etapa.' : 'Cadastre o cliente com produto, corretor, etapa e a data do retorno.', `<button class="btn pri" data-act="novoCliente">${ic('plus','s')}Novo cliente</button>`)}</section>`}
  `;
}
function clienteCard(c){
  const p = P(c.produtoId), w = whenLabel(c.lembrete), idx = ETAPAS.indexOf(c.etapa);
  const pillCls = c.etapa === 'Venda' ? 'ok' : c.etapa === 'Perdido' ? '' : 'blue';
  return `<button class="card tap ccard rv" data-act="abrirCliente" data-id="${c.id}" data-flip="c${c.id}">
    <div class="top"><div class="grow" style="min-width:0;text-align:left"><div class="nm">${esc(c.nome)}</div>
      <div class="meta small muted" style="margin-top:4px"><i class="dot" style="background:${p.cor}"></i>${esc(p.nome)}<span>·</span>${esc(B(c.corretorId).nome)}</div></div>
      <span class="when ${w.cls}">${esc(w.txt)}</span></div>
    <div class="meta"><span class="pill ${pillCls}">${esc(c.etapa)}</span><span class="pill"><span class="temp-${c.temp}">●</span>${c.temp}</span></div>
    ${idx >= 0 && idx <= VI ? `<div class="hbar"><i style="transform:scaleX(0);${c.etapa === 'Venda' ? 'background:var(--ok)' : ''}" data-bar="${(idx + 1) / (VI + 1)}" data-k="cb${c.id}"></i></div>` : ''}
  </button>`;
}

/* ================= AGENDA ================= */
function viewAgenda(){
  const sel = ui.agendaDia, t = today();
  const d = parseD(sel), off = (d.getDay() + 6) % 7, ini = addDays(sel, -off);
  const days = [...Array(7)].map((_, i) => addDays(ini, i));
  const marks = new Set([...atend.filter(a => a.status !== 'cancelado').map(a => a.inicio.slice(0,10)), ...ativos().filter(c => c.lembrete).map(c => c.lembrete.slice(0,10))]);
  const items = [];
  atendDia(sel).forEach(a => items.push({tipo:'a', hora:a.inicio.slice(11,16), a}));
  ativos().filter(c => c.lembrete && c.lembrete.slice(0,10) === sel).forEach(c => items.push({tipo:'r', hora:c.lembrete.slice(11,16), c}));
  const g = gcache[sel], uids = new Set(atend.map(a => a.iCalUID).filter(Boolean)), cids = new Set(S.clientes.map(c => c.calEventId).filter(Boolean));
  if (Array.isArray(g)) g.filter(e => !uids.has(e.iCalUID) && !cids.has(e.id)).forEach(e => items.push({tipo:'g', hora:e.start.dateTime ? localDT(new Date(e.start.dateTime)).slice(11,16) : '', e}));
  items.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
  const titleD = parseD(sel);
  const label = sel === t ? 'Hoje' : sel === addDays(t,1) ? 'Amanhã' : DOW[titleD.getDay()] + ', ' + titleD.getDate() + ' de ' + MES[titleD.getMonth()];

  const row = it => {
    if (it.tipo === 'a') { const a = it.a, fim = endOf(a.inicio, a.duracao || 60);
      return `<button class="evt rowbtn" style="display:grid" data-act="abrirAtend" data-id="${a.id}" data-flip="a${a.id}"><div class="tm num">${it.hora}<small>${fim.slice(11,16)}</small></div>
        <div class="bd"><div class="t" style="font-weight:600">${esc(a.titulo)}${a.cliente ? ' · ' + esc(a.cliente) : ''}</div>
        <div class="s small muted">${[a.produto, a.local].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="faces">${(a.participantes||[]).map(u => face(u)).join('')}</div></div></button>`; }
    if (it.tipo === 'r') { const c = it.c;
      return `<button class="evt r rowbtn" style="display:grid" data-act="abrirCliente" data-id="${c.id}"><div class="tm num">${it.hora}<small>retorno</small></div>
        <div class="bd"><div class="t" style="font-weight:600">${esc(c.nome)}</div><div class="s small muted">${esc(P(c.produtoId).nome)} · ${esc(c.etapa)} · ${esc(B(c.corretorId).nome)}</div></div></button>`; }
    const e = it.e;
    return `<a class="evt g" href="${esc(e.htmlLink)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="tm num">${it.hora || 'Dia'}<small>${e.end && e.end.dateTime ? localDT(new Date(e.end.dateTime)).slice(11,16) : 'todo'}</small></div>
      <div class="bd"><div class="t" style="font-weight:600">${esc(e.summary || '(sem título)')}</div><div class="s small muted">Google Agenda${e.location ? ' · ' + esc(e.location) : ''}</div></div></a>`;
  };
  return head(`Semana de ${ddmm(ini)}`, 'Agenda', addBtn('novoAtend', 'Novo atendimento')) + `
  <section class="card rv">
    <div class="sec-row" style="margin-bottom:10px"><button class="round ghost" data-act="semana" data-v="-7" aria-label="Semana anterior">${ic('left','s')}</button>
      <b>${MES[parseD(ini).getMonth()]} ${parseD(ini).getFullYear()}</b>
      <button class="round ghost" data-act="semana" data-v="7" aria-label="Próxima semana">${ic('chev','s')}</button></div>
    <div class="week">${days.map(x => { const dd = parseD(x); return `<button class="wd${x === t ? ' today' : ''}${x === sel ? ' sel' : ''}" data-act="dia" data-v="${x}"><span class="l">${DOW1[dd.getDay()]}</span><span class="n num">${dd.getDate()}</span><span class="m${marks.has(x) ? ' on' : ''}"></span></button>`; }).join('')}</div>
  </section>
  ${hasTok() ? '' : `<div class="banner rv">${ic('agenda')}<div class="grow"><b>Conecte o Google Agenda</b><br><span class="muted">Para ver seus compromissos e enviar convites dos atendimentos.</span></div><button class="mini" data-act="conectarAgenda">Conectar</button></div>`}
  <section class="card rv"><div class="sec-row"><h2>${esc(label)}</h2>${g === 'loading' ? '<span class="small muted">Carregando agenda…</span>' : g === 'err' ? '<button class="link small" data-act="recarregarDia">Tentar de novo</button>' : ''}</div>
    ${items.length ? `<div class="list">${items.map(row).join('')}</div>` : empty('agenda', 'Dia livre', 'Marque um atendimento com um parceiro e o convite vai para a agenda dele.', `<button class="btn pri" data-act="novoAtend">${ic('plus','s')}Novo atendimento</button>`)}
  </section>`;
}
function face(u){
  const p = people[u] || {}; const nm = p.nome || p.email || '?';
  return `<span class="avatar" title="${esc(nm)}">${p.foto ? `<img src="${esc(p.foto)}" alt="" referrerpolicy="no-referrer">` : esc(initials(nm))}</span>`;
}

/* ================= CORPO ================= */
function viewCorpo(){
  const sub = ui.corpo;
  const act = sub === 'peso' ? '' : addBtn(sub === 'treino' ? 'novaRotina' : 'novaRefeicao', sub === 'treino' ? 'Nova rotina' : 'Nova refeição');
  let body = '';
  if (sub === 'peso') body = corpoPeso(); else if (sub === 'treino') body = corpoTreino(); else body = corpoAlim();
  return head('Peso, treino e alimentação', 'Corpo', act) + `<div class="rv">${seg('subcorpo', [['peso','Peso'],['treino','Treino'],['alimentacao','Alimentação']], sub)}</div>` + body;
}
function lineChart(pts, goal, key){
  const W = 340, H = 160, L = 36, R = 12, T = 14, Bt = 24;
  if (pts.length < 2) return `<div class="empty">${ic('corpo')}<b>${pts.length ? 'Falta pouco para o gráfico' : 'Sem registros ainda'}</b><p>Com dois registros a linha de evolução aparece aqui.</p></div>`;
  const vals = pts.map(p => p.v).concat(goal != null ? [goal] : []);
  let mn = Math.min(...vals), mx = Math.max(...vals); const padv = Math.max(.5, (mx - mn) * .15); mn -= padv; mx += padv;
  const t0 = parseD(pts[0].d).getTime(), t1 = parseD(pts[pts.length-1].d).getTime() || t0 + 1;
  const x = d => L + (W - L - R) * ((parseD(d).getTime() - t0) / Math.max(1, t1 - t0));
  const y = v => T + (H - T - Bt) * (1 - (v - mn) / (mx - mn));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = path + `L${x(pts[pts.length-1].d).toFixed(1)},${H - Bt}L${x(pts[0].d).toFixed(1)},${H - Bt}Z`;
  const ticks = [0, .5, 1].map(k => mn + (mx - mn) * k);
  const lp = pts[pts.length-1];
  const sig = pts.map(p => p.d + p.v).join('|');
  return `<div class="chartwrap"><svg class="chart" viewBox="0 0 ${W} ${H}" data-pts='${esc(JSON.stringify(pts.map(p => [x(p.d), y(p.v), p.v, p.d])))}'>
    <g class="grid">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 1)}</text>`).join('')}</g>
    ${goal != null ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}"/><text class="tag" x="${W - R}" y="${y(goal) - 5}" text-anchor="end" style="fill:var(--ok)">meta ${fmt(goal, 1)}</text>` : ''}
    <path class="ar" d="${area}"/><path class="ln" d="${path}" data-draw="${esc(sig)}" data-k="${key}"/>
    <circle class="pt" cx="${x(lp.d)}" cy="${y(lp.v)}" r="5"/>
    <text x="${L}" y="${H - 6}">${ddmm(pts[0].d)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${ddmm(lp.d)}</text>
  </svg><div class="tip"></div></div>`;
}
function bindCharts(root){
  root.querySelectorAll('svg[data-pts]').forEach(svg => {
    const pts = JSON.parse(svg.dataset.pts), tip = svg.parentNode.querySelector('.tip');
    const move = ev => {
      const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * 340;
      let best = pts[0]; pts.forEach(p => { if (Math.abs(p[0] - sx) < Math.abs(best[0] - sx)) best = p; });
      tip.style.left = (best[0] / 340 * r.width) + 'px'; tip.style.top = (best[1] / 160 * r.height) + 'px';
      tip.textContent = `${fmt(best[2], 1)} kg · ${ddmm(best[3])}`; tip.style.opacity = 1;
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => tip.style.opacity = 0);
  });
}
function corpoPeso(){
  const s = pesoSorted(), last = s[s.length-1], t = today();
  const per = ui.pesoPeriodo, cut = per ? addDays(t, -per) : '0000';
  const pts = s.filter(p => p.data >= cut).map(p => ({d:p.data, v:+p.kg}));
  const d7 = pesoDelta(7), d30 = pesoDelta(30), meta = S.peso.meta;
  const hoje = s.find(p => p.data === t);
  return `
  <section class="card rv"><div class="sec-row"><div class="kpi"><span class="lbl">Peso atual</span><span class="val num" style="font-size:44px">${last ? `<span data-count="${last.kg}" data-dec="1" data-k="pa">0</span><small>kg</small>` : '—'}</span></div>
    ${meta ? `<div class="kpi" style="text-align:right"><span class="lbl">Meta</span><span class="val num" style="font-size:22px">${fmt(meta, 1)}<small>kg</small></span>${last ? `<span class="delta flat">faltam ${fmt(Math.abs(last.kg - meta), 1)} kg</span>` : ''}</div>` : `<button class="mini" data-act="metas">Definir meta</button>`}</div>
    <div class="btnrow small" style="margin-top:6px;gap:16px">${[['7 dias', d7], ['30 dias', d30]].map(([l, d]) => `<span class="${d == null ? 'flat' : d <= 0 ? 'up' : 'down'}" style="font-weight:600">${d == null ? '—' : (d > 0 ? '+' : '') + fmt(d, 1) + ' kg'} <span class="muted" style="font-weight:500">${l}</span></span>`).join('')}</div>
  </section>
  <section class="card rv"><form class="form" data-form="peso"><div class="f2">
    <div class="field"><label for="pesoKg">Peso de hoje (kg)</label><input class="inp num" id="pesoKg" type="number" inputmode="decimal" step="0.1" min="20" max="400" placeholder="${last ? fmt(last.kg, 1).replace(',', '.') : '80.0'}" value="${hoje ? hoje.kg : ''}" required></div>
    <div class="field"><label for="pesoData">Data</label><input class="inp" id="pesoData" type="date" value="${t}" max="${t}" required></div></div>
    <button class="btn pri wide">${hoje ? 'Atualizar registro de hoje' : 'Registrar peso'}</button></form></section>
  <section class="card rv"><div class="sec-row" style="margin-bottom:10px"><h2 style="margin:0">Evolução</h2></div>
    <div style="margin-bottom:12px">${seg('pesoPer', [['7','7 d'],['30','30 d'],['90','90 d'],['0','Tudo']], String(per))}</div>
    ${lineChart(pts, meta, 'peso' + per)}</section>
  ${s.length ? `<section class="card rv"><h2>Registros</h2><div class="list">${[...s].reverse().slice(0, 12).map((p, i, arr) => { const prev = arr[i+1]; const df = prev ? +(p.kg - prev.kg).toFixed(1) : null;
    return `<div class="row" data-flip="p${p.data}"><div class="grow"><div class="t num">${fmt(p.kg, 1)} kg</div><div class="s">${parseD(p.data).toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short'})}</div></div>
    ${df == null ? '' : `<span class="small ${df <= 0 ? 'up' : 'down'}" style="font-weight:600">${df > 0 ? '+' : ''}${fmt(df, 1)}</span>`}
    <button class="round ghost" data-act="delPeso" data-v="${p.data}" aria-label="Apagar registro">${ic('trash','s')}</button></div>`; }).join('')}</div></section>` : ''}`;
}
function corpoTreino(){
  const t = today(), d = parseD(t), off = (d.getDay() + 6) % 7, ini = addDays(t, -off);
  const week = [...Array(7)].map((_, i) => addDays(ini, i));
  const rot = rotinasDe(t), feito = treinoFeito(t);
  const n30 = new Set(S.treinos.feitos.filter(f => f.data > addDays(t, -30)).map(f => f.data)).size;
  const semana = week.filter(x => treinoFeito(x)).length, plano = week.filter(x => rotinasDe(x).length).length;
  return `
  <section class="card rv"><div class="sec-row" style="margin-bottom:12px"><h2 style="margin:0">Esta semana</h2><span class="small muted"><b class="num">${semana}</b> de ${plano || 0} planejados</span></div>
    <div class="week">${week.map(x => { const dd = parseD(x); return `<div class="wd${x === t ? ' today' : ''}${treinoFeito(x) ? ' done' : ''}"><span class="l">${DOW1[dd.getDay()]}</span><span class="n num">${dd.getDate()}</span><span class="m${rotinasDe(x).length ? ' on' : ''}"></span></div>`; }).join('')}</div>
  </section>
  <section class="card rv"><h2>Treino de hoje</h2>
    ${rot.length ? rot.map(r => `<div class="t" style="font-weight:700;font-size:20px;margin-bottom:6px">${esc(r.nome)}</div>
      <div class="list" style="margin-bottom:14px">${(r.exercicios||[]).map(e => `<div class="row"><span class="grow">${esc(e)}</span></div>`).join('') || '<p class="muted small">Sem exercícios cadastrados.</p>'}</div>`).join('')
      + `<button class="btn ${feito ? 'sec' : 'pri'} wide" data-act="treinoFeito">${feito ? `${ic('check','s')}Treino concluído · desfazer` : 'Concluir treino'}</button>`
      : empty('dumbbell', 'Descanso hoje', S.treinos.rotinas.length ? 'Nenhuma rotina marcada para hoje.' : 'Monte suas rotinas e escolha os dias da semana de cada uma.', S.treinos.rotinas.length ? `<button class="btn sec" data-act="treinoAvulso">Registrar treino avulso</button>` : `<button class="btn pri" data-act="novaRotina">${ic('plus','s')}Nova rotina</button>`)}
  </section>
  <section class="grid2"><div class="card kpi rv"><span class="lbl">Treinos em 30 dias</span><span class="val num" data-count="${n30}" data-k="t30">0</span></div>
    <div class="card kpi rv"><span class="lbl">Rotinas</span><span class="val num">${S.treinos.rotinas.length}</span></div></section>
  ${S.treinos.rotinas.length ? `<section class="card rv"><h2>Rotinas</h2><div class="list">${S.treinos.rotinas.map(r => `<button class="row rowbtn" data-act="editRotina" data-id="${r.id}"><div class="grow"><div class="t">${esc(r.nome)}</div><div class="s">${(r.dias||[]).length ? [...r.dias].sort((a,b) => ((a+6)%7) - ((b+6)%7)).map(i => DOW[i]).join(', ') : 'Sem dia fixo'} · ${(r.exercicios||[]).length} exercícios</div></div>${ic('chev','s chev')}</button>`).join('')}</div></section>` : ''}`;
}
function corpoAlim(){
  const t = today(), sd = somaDia(t), m = S.alimentacao.metas;
  if (!m) return `<section class="card rv">${empty('food', 'Defina suas metas de macros', 'Proteína, carboidrato e gordura por dia. As calorias são calculadas a partir delas.', `<button class="btn pri" data-act="metas">Definir metas</button>`)}</section>` + mealsList(t);
  const mk = metaKcal();
  const macro = (l, v, mv, k, cor) => `<div class="macro"><div class="top"><span>${l}</span><span class="num"><b>${fmt(v)}</b> / ${fmt(mv)} g</span></div>${hbar(mv ? v / mv : 0, k, cor)}</div>`;
  const days = [...Array(7)].map((_, i) => addDays(t, i - 6)), kc = days.map(d => somaDia(d).k);
  const top = Math.max(mk, ...kc) * 1.1 || 1, W = 340, H = 140, base = 112;
  const bw = 30, gap = (W - 7 * bw) / 8;
  return `
  <section class="card rv"><div class="hero">${ring(sd.k / mk, 116, 12, 'kcal', sd.k > mk * 1.05 ? 'var(--warn)' : 'var(--ok)', `<div><b class="num" data-count="${sd.k}" data-k="kc2">0</b><span>de ${fmt(mk)} kcal</span></div>`)}
    <div class="grow" style="display:grid;gap:12px;min-width:0">${macro('Proteína', sd.p, m.p, 'mp', 'var(--accent)')}${macro('Carboidrato', sd.c, m.c, 'mc', 'var(--warn)')}${macro('Gordura', sd.g, m.g, 'mg', 'var(--ok)')}</div></div>
    <div class="btnrow" style="margin-top:14px"><button class="btn sec" data-act="metas">Metas</button><button class="btn pri" data-act="novaRefeicao">${ic('plus','s')}Refeição</button></div>
  </section>
  <section class="card rv"><h2>Últimos 7 dias</h2><svg class="chart" viewBox="0 0 ${W} ${H}">
    <line class="goal" x1="0" x2="${W}" y1="${base - base * mk / top}" y2="${base - base * mk / top}"/>
    ${days.map((d, i) => { const h = base * kc[i] / top, xx = gap + i * (bw + gap); return `<rect class="vb${d === t ? ' today' : ''}" x="${xx}" y="${base - Math.max(h, 0)}" width="${bw}" height="${Math.max(h, .5)}" rx="7" style="--j:${i};transform:scaleY(0)" data-vbar="1" data-k="kb${d}${kc[i]}"/><text x="${xx + bw/2}" y="${H - 8}" text-anchor="middle">${DOW1[parseD(d).getDay()]}</text>${kc[i] ? `<text class="tag" x="${xx + bw/2}" y="${base - h - 6}" text-anchor="middle" style="font-size:10px">${kc[i] >= 1000 ? fmt(kc[i]/1000, 1) + 'k' : kc[i]}</text>` : ''}`; }).join('')}
  </svg><div class="small muted">Linha verde: meta de ${fmt(mk)} kcal</div></section>` + mealsList(t);
}
function mealsList(t){
  const r = refeicoesDe(t);
  return `<section class="card rv"><h2>Refeições de hoje</h2>${r.length ? `<div class="list">${r.map(x => `<div class="row" data-flip="m${x.id}"><div class="grow"><div class="t">${esc(x.nome)}</div><div class="s num">P ${fmt(x.p)} · C ${fmt(x.c)} · G ${fmt(x.g)}</div></div><b class="num">${fmt(kcalOf(x))}</b><span class="small muted">kcal</span><button class="round ghost" data-act="delRefeicao" data-id="${x.id}" aria-label="Apagar refeição">${ic('trash','s')}</button></div>`).join('')}</div>` : empty('food', 'Nenhuma refeição hoje', 'Registre o que comeu com proteína, carboidrato e gordura.', `<button class="btn pri" data-act="novaRefeicao">${ic('plus','s')}Refeição</button>`)}</section>`;
}

/* ================= ESTUDOS ================= */
function viewEstudos(){
  const sub = ui.estudos;
  return head('Leitura e cursos', 'Estudos', addBtn(sub === 'leitura' ? 'novoLivro' : 'novoCurso', sub === 'leitura' ? 'Novo livro' : 'Novo curso'))
    + `<div class="rv">${seg('subestudos', [['leitura','Leitura'],['cursos','Cursos']], sub)}</div>` + (sub === 'leitura' ? estLeitura() : estCursos());
}
function estLeitura(){
  const ano = today().slice(0,4), lid = lidosAno(), meta = S.livros.meta || 0;
  const ativos = livrosAtivos(), feitos = S.livros.items.filter(l => l.concluidoEm).sort((a,b) => b.concluidoEm.localeCompare(a.concluidoEm));
  const pag30 = S.livros.log.filter(l => l.data > addDays(today(), -30)).reduce((a, l) => a + (+l.n || 0), 0);
  return `
  <section class="card tap rv" data-act="metas"><div class="hero">${ring(meta ? lid / meta : 0, 96, 10, 'livros', 'var(--accent)', `<div><b class="num" data-count="${lid}" data-k="la">0</b><span>de ${meta}</span></div>`)}
    <div class="hero-txt"><div class="muted small">Meta de ${ano}</div><div class="big">${lid === 1 ? '1 livro lido' : lid + ' livros lidos'}</div><div class="small muted"><span class="num" data-count="${pag30}" data-k="p30">0</span> páginas nos últimos 30 dias</div></div></div></section>
  ${ativos.length ? ativos.map(l => { const pc = l.paginas ? l.lidas / l.paginas : 0;
    return `<section class="card rv" data-flip="l${l.id}"><div class="sec-row" style="align-items:flex-start"><button class="grow rowbtn" data-act="editLivro" data-id="${l.id}" style="display:block"><div style="font-size:17px;font-weight:600">${esc(l.titulo)}</div><div class="small muted">${esc(l.autor || '')}${l.prazo ? ' · até ' + ddmm(l.prazo) : ''}</div></button><b class="num" style="font-size:20px">${fmt(pc * 100)}%</b></div>
      <div style="margin:12px 0 6px">${hbar(pc, 'lb' + l.id)}</div><div class="small muted num">${fmt(l.lidas)} de ${fmt(l.paginas)} páginas</div>
      <div class="btnrow" style="margin-top:12px"><button class="mini" data-act="pag" data-id="${l.id}" data-v="10">+10 pág.</button><button class="mini" data-act="pag" data-id="${l.id}" data-v="25">+25 pág.</button><button class="mini" data-act="pagCustom" data-id="${l.id}">Outro valor</button></div></section>`; }).join('')
    : `<section class="card rv">${empty('book', 'Nenhum livro em andamento', 'Adicione o livro com o total de páginas e acompanhe o progresso.', `<button class="btn pri" data-act="novoLivro">${ic('plus','s')}Novo livro</button>`)}</section>`}
  ${feitos.length ? `<section class="card rv"><h2>Concluídos</h2><div class="list">${feitos.map(l => `<button class="row rowbtn" data-act="editLivro" data-id="${l.id}"><span class="check on"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span><div class="grow"><div class="t">${esc(l.titulo)}</div><div class="s">${esc(l.autor || '')} · ${ddmm(l.concluidoEm)}/${l.concluidoEm.slice(2,4)}</div></div></button>`).join('')}</div></section>` : ''}`;
}
function estCursos(){
  const items = S.cursos.items;
  if (!items.length) return `<section class="card rv">${empty('cap', 'Nenhum curso cadastrado', 'Cadastre o curso com as etapas (módulos, aulas, provas) e marque cada uma ao concluir.', `<button class="btn pri" data-act="novoCurso">${ic('plus','s')}Novo curso</button>`)}</section>`;
  return items.map(c => {
    const tot = (c.etapas||[]).length, fe = (c.etapas||[]).filter(e => e.feitaEm).length, pc = tot ? fe / tot : 0, nx = cursoProx(c), open = ui.cursoAberto === c.id;
    return `<section class="card rv" data-flip="cu${c.id}"><button class="rowbtn" data-act="toggleCurso" data-id="${c.id}" style="align-items:flex-start">
      ${ring(pc, 54, 6, 'cu' + c.id, pc >= 1 ? 'var(--ok)' : 'var(--accent)', `<b class="num" style="font-size:13px">${fmt(pc*100)}%</b>`)}
      <div class="grow" style="min-width:0"><div style="font-size:17px;font-weight:600">${esc(c.nome)}</div><div class="small muted">${[c.plataforma, c.prazo ? 'até ' + ddmm(c.prazo) : ''].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="small" style="margin-top:6px">${nx ? `Próxima: <b>${esc(nx.nome)}</b>` : '<span class="up" style="font-weight:600">Curso concluído</span>'}</div></div>
      <span class="small muted num">${fe}/${tot}</span></button>
      ${open ? `<div class="steps" style="margin-top:10px"><div class="list">${(c.etapas||[]).map((e, i) => `<div class="row"><button class="check${e.feitaEm ? ' on' : ''}" data-act="etapa" data-id="${c.id}" data-v="${i}" aria-label="Marcar etapa"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></button><div class="grow"><div class="t" style="font-weight:500${e.feitaEm ? ';color:var(--fg2)' : ''}">${esc(e.nome)}</div>${e.feitaEm ? `<div class="s">Concluída em ${ddmm(e.feitaEm)}</div>` : ''}</div></div>`).join('')}</div>
        <button class="btn sec wide" style="margin-top:10px" data-act="editCurso" data-id="${c.id}">Editar curso</button></div>` : ''}
    </section>`;
  }).join('');
}

/* ================= AJUSTES (sheet) ================= */
function sheetAjustes(){
  const th = (()=>{ try { return localStorage.getItem('foco-theme') || 'auto'; } catch(e) { return 'auto'; } })();
  openSheet('Ajustes', `<div class="form">
    <div class="card" style="display:flex;gap:12px;align-items:center;box-shadow:none;background:var(--surface)"><span class="avatar" style="width:48px;height:48px">${me.photoURL ? `<img src="${esc(me.photoURL)}" alt="" referrerpolicy="no-referrer">` : initials(me.displayName)}</span>
      <div class="grow" style="min-width:0"><b>${esc(me.displayName || '')}</b><div class="small muted" style="overflow-wrap:anywhere">${esc(me.email)}</div></div><button class="mini" data-act="sair">Sair</button></div>
    <div class="field"><label>Tema</label>${seg('tema', [['auto','Automático'],['light','Claro'],['dark','Escuro']], th)}</div>
    <div class="field"><label>Frases do dia falam com você no</label>${seg('genero', [['m','Masculino'],['f','Feminino']], generoAtual() || '')}</div>
    <div class="card" style="box-shadow:none"><div class="sec-row"><div><b>Google Agenda</b><div class="small muted">${hasTok() ? 'Conectada nesta sessão' : 'Desconectada'}</div></div>${hasTok() ? '<span class="pill ok">Ativa</span>' : '<button class="mini" data-act="conectarAgenda">Conectar</button>'}</div></div>
    <div class="card" style="box-shadow:none"><div class="sec-row"><h2 style="margin:0">Produtos</h2><button class="mini" data-act="novoProduto">Adicionar</button></div><p class="small muted" style="margin:6px 0 0">${S.produtos.length} empreendimentos. Os da sua coordenação aparecem primeiro nas listas.</p><input class="inp" id="prodBusca" placeholder="Buscar empreendimento" style="margin-top:10px" autocomplete="off"><div class="list" id="prodLista" style="margin-top:8px">${[...S.produtos].sort((a, b) => (b.coord ? 1 : 0) - (a.coord ? 1 : 0) || a.nome.localeCompare(b.nome)).map(p => `<button class="row rowbtn" data-act="editProduto" data-id="${p.id}" data-busca="${esc(normNome(p.nome + (p.inc || '')))}"><i class="dot" style="background:${p.cor};width:12px;height:12px"></i><span class="grow"><span class="t" style="font-weight:500">${esc(p.nome)}</span><span class="s">${esc(p.inc || 'Sem incorporadora')}${p.coord ? ' · coordenação' : ''}</span></span><span class="small muted">${S.clientes.filter(c => c.produtoId === p.id).length || ''}</span>${ic('chev','s chev')}</button>`).join('')}</div></div>
    <div class="card" style="box-shadow:none"><div class="sec-row"><h2 style="margin:0">Corretores</h2><button class="mini" data-act="novoCorretor">Adicionar</button></div><div class="list" style="margin-top:8px">${S.corretores.map(c => `<button class="row rowbtn" data-act="editCorretor" data-id="${c.id}"><span class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initials(c.nome))}</span><span class="grow t" style="font-weight:500">${esc(c.nome)}${c.id === 'eu' ? ' <span class="small muted">(você)</span>' : ''}</span><span class="small muted">${S.clientes.filter(x => x.corretorId === c.id).length}</span>${ic('chev','s chev')}</button>`).join('')}</div></div>
    <button class="btn sec wide" data-act="metas">Metas de peso, macros e leitura</button>
    <div class="sec-row"><span class="sync ${syncState}" id="syncInd"><i></i><span>${syncLabel()}</span></span><button class="link small" data-act="backup">Copiar backup</button></div>
  </div>`);
  const b = $('#prodBusca'); if (b) b.addEventListener('input', () => { const q = normNome(b.value); $('#prodLista').querySelectorAll('[data-busca]').forEach(r => r.hidden = q && !r.dataset.busca.includes(q)); });
}

/* ================= sheets ================= */
let sheetCb = null;
function openSheet(title, html, onMount){
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html;
  const w = $('#sheetWrap'); w.hidden = false;
  $('#sheetBody').querySelectorAll('.seg').forEach(placeThumb);
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open')));
  sheetCb = onMount ? onMount($('#sheetBody')) : null;
  setTimeout(() => { const f = $('#sheetBody').querySelector('[autofocus]'); if (f) f.focus(); }, 380);
}
function closeSheet(){
  const w = $('#sheetWrap'); if (w.hidden) return; w.classList.remove('open');
  setTimeout(() => { w.hidden = true; $('#sheetBody').innerHTML = ''; }, RM.matches ? 0 : 420);
}
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function prodOptions(cur, byName){
  const v = p => byName ? p.nome : p.id;
  const grp = {}; S.produtos.filter(p => !p.coord).forEach(p => { const k = p.inc || 'Outros'; (grp[k] = grp[k] || []).push(p); });
  const coord = S.produtos.filter(p => p.coord);
  const keys = Object.keys(grp).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b));
  return (coord.length ? `<optgroup label="Minha coordenação">${coord.map(p => opt(v(p), p.nome, cur)).join('')}</optgroup>` : '')
    + keys.map(k => `<optgroup label="${esc(k)}">${grp[k].sort((a, b) => a.nome.localeCompare(b.nome)).map(p => opt(v(p), p.nome, cur)).join('')}</optgroup>`).join('');
}
const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
const num = id => { const v = parseFloat(val(id).replace(',', '.')); return isFinite(v) ? v : 0; };
const confirmBox = (msg, act, id) => `<div class="confirm" id="cfm" hidden><b>${msg}</b><div class="btnrow"><button type="button" class="btn sec" data-act="cfmNo">Manter</button><button type="button" class="btn dan" data-act="${act}" data-id="${id}">Excluir</button></div></div>`;

function sheetCliente(c){
  const novo = !c; const t = today();
  c = c || {nome:'', fone:'', produtoId: ui.clientesFiltroProd !== 'todos' ? ui.clientesFiltroProd : '', corretorId: !['todos','quentes'].includes(ui.clientesFiltroCor) ? ui.clientesFiltroCor : 'eu', etapa:'Novo lead', temp:'Quente', lembrete: t + 'T23:59', notas:'', contatos:[]};
  const idx = ETAPAS.indexOf(c.etapa);
  const fone = (c.fone || '').replace(/\D/g, ''), wa = fone ? 'https://wa.me/' + (fone.length <= 11 ? '55' + fone : fone) : '';
  openSheet(novo ? 'Novo cliente' : c.nome, `<form class="form" data-form="cliente" data-id="${c.id || ''}">
    ${!novo ? `<div class="btnrow">${wa ? `<a class="btn sec" href="${wa}" target="_blank" rel="noopener">${ic('chat','s')}WhatsApp</a>` : ''}<button type="button" class="btn pri" data-act="contato" data-id="${c.id}">${ic('check','s')}Retorno feito</button></div>
      ${idx >= 0 && idx < VI ? `<button type="button" class="btn sec wide" data-act="avancar" data-id="${c.id}">Avançar para ${ETAPAS[idx + 1]} ${ic('chev','s')}</button>` : ''}` : ''}
    <div class="field"><label for="cNome">Nome</label><input class="inp" id="cNome" value="${esc(c.nome)}" required ${novo ? 'autofocus' : ''} autocomplete="off"></div>
    <div class="field"><label for="cFone">Telefone / WhatsApp</label><input class="inp" id="cFone" type="tel" inputmode="tel" value="${esc(c.fone)}" placeholder="11 9 9999-9999"></div>
    <div class="f2"><div class="field"><label for="cProd">Produto</label><select class="inp" id="cProd">${prodOptions(c.produtoId)}<option value=""${!c.produtoId ? ' selected' : ''}>Outro / sem produto</option></select></div>
      <div class="field"><label for="cCor">Corretor</label><input class="inp" id="cCor" list="corList" value="${esc(S.corretores.some(b => b.id === c.corretorId) ? B(c.corretorId).nome : '')}" placeholder="Nome do corretor" autocomplete="off"><datalist id="corList">${S.corretores.map(b => `<option value="${esc(b.nome)}"></option>`).join('')}</datalist></div></div>
    <div class="f2"><div class="field"><label for="cEtapa">Etapa do funil</label><select class="inp" id="cEtapa">${ETAPAS.map(e => opt(e, e, c.etapa)).join('')}</select></div>
      <div class="field"><label for="cTemp">Temperatura</label><select class="inp" id="cTemp">${TEMPS.map(e => opt(e, e, c.temp)).join('')}</select></div></div>
    <div class="field"><label for="cLem">Lembrete de retorno</label><input class="inp" id="cLem" type="datetime-local" value="${esc(c.lembrete || '')}"></div>
    <div class="switch"><div><b>Lembrete na Google Agenda</b><div class="small muted">Cria um evento de 15 min no horário do retorno</div></div><button type="button" class="sw${c.calEventId ? ' on' : ''}" id="cCal" data-act="sw" role="switch" aria-checked="${!!c.calEventId}"></button></div>
    <div class="field"><label for="cNotas">Anotações</label><textarea class="inp" id="cNotas" placeholder="Renda, FGTS, preferência de planta, objeções…">${esc(c.notas)}</textarea></div>
    <button class="btn pri wide" id="cSave">${novo ? 'Salvar cliente' : 'Salvar alterações'}</button>
    ${!novo && (c.contatos||[]).length ? `<div class="card" style="box-shadow:none"><h2>Retornos registrados</h2><div class="list">${[...c.contatos].reverse().slice(0, 8).map(x => `<div class="row small"><span class="grow">${parseDT(x).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span></div>`).join('')}</div></div>` : ''}
    ${!novo ? `<button type="button" class="btn dan wide" data-act="askDel">${ic('trash','s')}Excluir cliente</button>${confirmBox('Excluir ' + esc(c.nome) + '? Isso não pode ser desfeito.', 'delCliente', c.id)}` : ''}
  </form>`);
}
async function saveCliente(form){
  const id = form.dataset.id, novo = !id;
  const c = novo ? {id: uid(), criado: new Date().toISOString(), contatos: []} : S.clientes.find(x => x.id === id);
  const etapaAnt = c.etapa;
  const corNome = val('cCor');
  let cor = corNome ? S.corretores.find(b => normNome(b.nome) === normNome(corNome)) : S.corretores.find(b => b.id === 'eu');
  if (!cor) { cor = {id: uid(), nome: corNome}; S.corretores.push(cor); save('corretores'); }
  Object.assign(c, {nome: val('cNome'), fone: val('cFone'), produtoId: val('cProd'), corretorId: cor.id, etapa: val('cEtapa'), temp: val('cTemp'), lembrete: val('cLem'), notas: val('cNotas')});
  if (etapaAnt && etapaAnt !== c.etapa) (c.historico = c.historico || []).push({de: etapaAnt, para: c.etapa, em: new Date().toISOString()});
  if (novo) S.clientes.push(c);
  const wantCal = $('#cCal').classList.contains('on');
  const btn = $('#cSave'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Salvando';
  try { await syncClienteCal(c, wantCal); } catch(e) { toast('Cliente salvo, mas a agenda falhou: ' + e.message, true); }
  save('clientes'); closeSheet(); render(false); toast(novo ? 'Cliente adicionado' : 'Cliente atualizado');
}
async function syncClienteCal(c, want){
  if (want && c.lembrete && ATIVAS.includes(c.etapa)) {
    const body = {summary: `Retorno: ${c.nome}`, description: `${P(c.produtoId).nome} · ${c.etapa} · corretor: ${B(c.corretorId).nome}${c.fone ? '\nTelefone: ' + c.fone : ''}${c.notas ? '\n\n' + c.notas : ''}`, start: evTime(c.lembrete), end: evTime(endOf(c.lembrete, 15)), reminders: {useDefault: false, overrides: [{method: 'popup', minutes: 0}]}};
    if (c.calEventId) { try { await cal('calendars/primary/events/' + c.calEventId, {method: 'PATCH', body: JSON.stringify(body)}); return; } catch(e) { c.calEventId = null; } }
    const ev = await cal('calendars/primary/events', {method: 'POST', body: JSON.stringify(body)}); c.calEventId = ev.id;
  } else if (c.calEventId) {
    try { await cal('calendars/primary/events/' + c.calEventId, {method: 'DELETE'}); } catch(e) {}
    c.calEventId = null;
  }
}

async function sheetAtend(a){
  const novo = !a, t = ui.tab === 'agenda' ? ui.agendaDia : today();
  const mine = !a || a.criadoPor === me.uid;
  if (!novo && !mine) return sheetAtendView(a);
  a = a || {titulo:'Atendimento', cliente:'', produto:'', inicio: t + 'T10:00', duracao: 60, local:'', participantes:[me.uid], emailsExtras:'', notas:'', convite:true};
  openSheet(novo ? 'Novo atendimento' : 'Editar atendimento', `<form class="form" data-form="atend" data-id="${a.id || ''}">
    <div class="field"><label for="aTit">Tipo</label><select class="inp" id="aTit">${['Atendimento','Visita ao decorado','Visita ao imóvel','Assinatura','Reunião','Plantão'].map(x => opt(x, x, a.titulo)).join('')}</select></div>
    <div class="field"><label for="aCli">Cliente</label><input class="inp" id="aCli" list="cliList" value="${esc(a.cliente)}" placeholder="Nome do cliente" autocomplete="off"><datalist id="cliList">${ativos().map(c => `<option value="${esc(c.nome)}"></option>`).join('')}</datalist></div>
    <div class="field"><label for="aProd">Produto</label><select class="inp" id="aProd"><option value="">—</option>${prodOptions(a.produto, true)}</select></div>
    <div class="f3"><div class="field"><label for="aDia">Dia</label><input class="inp" id="aDia" type="date" value="${a.inicio.slice(0,10)}" required></div>
      <div class="field"><label for="aHora">Hora</label><input class="inp" id="aHora" type="time" value="${a.inicio.slice(11,16)}" required></div>
      <div class="field"><label for="aDur">Duração</label><select class="inp" id="aDur">${[[30,'30 min'],[60,'1 h'],[90,'1h30'],[120,'2 h'],[180,'3 h']].map(([v,l]) => opt(String(v), l, String(a.duracao))).join('')}</select></div></div>
    <div class="field"><label for="aLocal">Local</label><input class="inp" id="aLocal" value="${esc(a.local)}" placeholder="Stand, imobiliária, endereço…"></div>
    <div class="field"><label>Parceiros no app</label><div class="chips" id="aPeople" style="flex-wrap:wrap"><span class="small muted">Carregando…</span></div></div>
    <div class="field"><label for="aEmails">Outros e-mails (separe por vírgula)</label><input class="inp" id="aEmails" type="email" multiple value="${esc(a.emailsExtras || '')}" placeholder="cliente@gmail.com"></div>
    <div class="field"><label for="aNotas">Observações</label><textarea class="inp" id="aNotas">${esc(a.notas || '')}</textarea></div>
    <div class="switch"><div><b>Criar na Google Agenda e enviar convites</b><div class="small muted">Os participantes recebem o convite por e-mail</div></div><button type="button" class="sw${a.convite !== false ? ' on' : ''}" id="aCal" data-act="sw" role="switch" aria-checked="${a.convite !== false}"></button></div>
    <button class="btn pri wide" id="aSave">${novo ? 'Agendar' : 'Salvar alterações'}</button>
    ${!novo ? `<button type="button" class="btn dan wide" data-act="askDel">Cancelar atendimento</button><div class="confirm" id="cfm" hidden><b>Cancelar este atendimento? Os participantes serão avisados pela agenda.</b><div class="btnrow"><button type="button" class="btn sec" data-act="cfmNo">Manter</button><button type="button" class="btn dan" data-act="delAtend" data-id="${a.id}">Cancelar</button></div></div>` : ''}
  </form>`);
  await loadDirectory();
  const sel = new Set(a.participantes || [me.uid]); sel.add(me.uid);
  const box = $('#aPeople'); if (!box) return;
  const others = Object.entries(people).filter(([u]) => u !== me.uid);
  box.innerHTML = others.length ? others.map(([u, p]) => `<button type="button" class="chip${sel.has(u) ? ' on' : ''}" data-act="pickPerson" data-v="${u}">${esc(p.nome || p.email)}</button>`).join('')
    : '<span class="small muted">Ninguém mais entrou no app ainda. Quando um parceiro fizer login com o Google, ele aparece aqui. Até lá, use "Outros e-mails".</span>';
}
function sheetAtendView(a){
  const dono = people[a.criadoPor] || {};
  openSheet(a.titulo, `<div class="form">
    <div class="card" style="box-shadow:none;display:grid;gap:8px">
      <div style="font-size:20px;font-weight:700">${esc(a.titulo)}${a.cliente ? ' · ' + esc(a.cliente) : ''}</div>
      <div class="small">${ic('clock','s')} ${parseD(a.inicio).toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}, ${a.inicio.slice(11,16)}–${endOf(a.inicio, a.duracao || 60).slice(11,16)}</div>
      ${a.local ? `<div class="small">${ic('pin','s')} ${esc(a.local)}</div>` : ''}${a.produto ? `<div class="small muted">${esc(a.produto)}</div>` : ''}
      ${a.notas ? `<p class="small" style="margin:4px 0 0;white-space:pre-wrap">${esc(a.notas)}</p>` : ''}
    </div>
    <div class="card" style="box-shadow:none"><h2>Participantes</h2><div class="list">${(a.participantes||[]).map(u => `<div class="row">${face(u)}<span class="grow">${esc((people[u]||{}).nome || (people[u]||{}).email || 'Participante')}${u === a.criadoPor ? ' <span class="small muted">organizador</span>' : ''}</span></div>`).join('')}</div></div>
    ${a.htmlLink && a.criadoPor === me.uid ? `<a class="btn sec wide" href="${esc(a.htmlLink)}" target="_blank" rel="noopener">${ic('link','s')}Abrir no Google Agenda</a>` : ''}
    <p class="small muted" style="margin:0">Só ${esc(dono.nome || 'o organizador')} pode alterar este atendimento. O convite chega no seu e-mail e na sua Google Agenda.</p>
    <button class="btn dan wide" data-act="sairAtend" data-id="${a.id}">Sair deste atendimento</button>
  </div>`);
}
async function saveAtend(form){
  const id = form.dataset.id, novo = !id;
  const old = novo ? null : atend.find(x => x.id === id);
  const parts = [...document.querySelectorAll('#aPeople .chip.on')].map(b => b.dataset.v);
  if (!parts.includes(me.uid)) parts.unshift(me.uid);
  const extras = val('aEmails').split(/[,;\s]+/).filter(x => /.+@.+\..+/.test(x));
  const data = {titulo: val('aTit'), cliente: val('aCli'), produto: val('aProd'), inicio: val('aDia') + 'T' + val('aHora'), duracao: +val('aDur') || 60, local: val('aLocal'), notas: val('aNotas'),
    participantes: parts, emailsExtras: extras.join(', '), convite: $('#aCal').classList.contains('on'), criadoPor: old ? old.criadoPor : me.uid, status: 'ativo', atualizado: Date.now()};
  if (!val('aDia') || !val('aHora')) return toast('Escolha o dia e a hora.', true);
  const btn = $('#aSave'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Agendando';
  try {
    if (data.convite && !hasTok()) await requestTok(); // abre a permissão ainda dentro do toque
    if (data.convite) {
      await loadPeople(parts);
      const emails = [...new Set(parts.filter(u => u !== me.uid).map(u => (people[u]||{}).email).filter(Boolean).concat(extras))];
      const body = {summary: data.titulo + (data.cliente ? ' · ' + data.cliente : ''), location: data.local,
        description: [data.produto && 'Produto: ' + data.produto, data.notas].filter(Boolean).join('\n\n') + '\n\nAgendado pelo Foco.',
        start: evTime(data.inicio), end: evTime(endOf(data.inicio, data.duracao)), attendees: emails.map(email => ({email}))};
      let ev;
      if (old && old.eventId) ev = await cal(`calendars/primary/events/${old.eventId}?sendUpdates=all`, {method: 'PATCH', body: JSON.stringify(body)});
      else ev = await cal('calendars/primary/events?sendUpdates=all', {method: 'POST', body: JSON.stringify(body)});
      Object.assign(data, {eventId: ev.id, iCalUID: ev.iCalUID, htmlLink: ev.htmlLink});
    } else if (old && old.eventId) {
      try { await cal(`calendars/primary/events/${old.eventId}?sendUpdates=all`, {method: 'DELETE'}); } catch(e) {}
      Object.assign(data, {eventId: null, iCalUID: null, htmlLink: null});
    }
    if (novo) { data.criado = Date.now(); await fdb.collection('atendimentos').add(data); }
    else await fdb.doc('atendimentos/' + id).update(data);
    ui.agendaDia = data.inicio.slice(0,10); delete gcache[ui.agendaDia];
    closeSheet(); toast(novo ? (data.convite ? 'Atendimento agendado e convites enviados' : 'Atendimento agendado') : 'Atendimento atualizado');
    if (ui.tab !== 'agenda') { switchTab('agenda'); } else render(false);
  } catch(e) { btn.disabled = false; btn.textContent = novo ? 'Agendar' : 'Salvar alterações'; toast('Não deu para agendar: ' + e.message, true); }
}

function sheetRotina(r){
  const novo = !r; r = r || {nome:'', dias:[], exercicios:[]};
  openSheet(novo ? 'Nova rotina' : 'Editar rotina', `<form class="form" data-form="rotina" data-id="${r.id || ''}">
    <div class="field"><label for="rNome">Nome</label><input class="inp" id="rNome" value="${esc(r.nome)}" placeholder="Treino A · Peito e tríceps" required autofocus></div>
    <div class="field"><label>Dias da semana</label><div class="toggles" id="rDias">${[1,2,3,4,5,6,0].map(i => `<button type="button" class="${(r.dias||[]).includes(i) ? 'on' : ''}" data-act="tgl" data-v="${i}" aria-label="${DOW[i]}">${DOW1[i]}</button>`).join('')}</div></div>
    <div class="field"><label for="rEx">Exercícios (um por linha)</label><textarea class="inp" id="rEx" rows="7" placeholder="Supino reto 4x10 · 40 kg&#10;Crucifixo 3x12&#10;Tríceps corda 3x15">${esc((r.exercicios||[]).join('\n'))}</textarea></div>
    <button class="btn pri wide">Salvar rotina</button>
    ${!novo ? `<button type="button" class="btn dan wide" data-act="askDel">Excluir rotina</button>${confirmBox('Excluir esta rotina?', 'delRotina', r.id)}` : ''}
  </form>`);
}
function sheetRefeicao(){
  const rec = []; const seen = new Set();
  [...S.alimentacao.refeicoes].reverse().forEach(m => { if (!seen.has(m.nome) && rec.length < 8) { seen.add(m.nome); rec.push(m); } });
  openSheet('Nova refeição', `<form class="form" data-form="refeicao">
    ${rec.length ? `<div class="field"><label>Repetir uma recente</label><div class="chips" style="flex-wrap:wrap">${rec.map((m, i) => `<button type="button" class="chip" data-act="repMeal" data-v='${esc(JSON.stringify({n:m.nome, p:m.p, c:m.c, g:m.g}))}'>${esc(m.nome)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="mNome">Refeição</label><input class="inp" id="mNome" placeholder="Almoço · frango, arroz e salada" required></div>
    <div class="f3"><div class="field"><label for="mP">Proteína (g)</label><input class="inp num" id="mP" type="number" inputmode="decimal" min="0" step="1" value="0"></div>
      <div class="field"><label for="mC">Carbo (g)</label><input class="inp num" id="mC" type="number" inputmode="decimal" min="0" step="1" value="0"></div>
      <div class="field"><label for="mG">Gordura (g)</label><input class="inp num" id="mG" type="number" inputmode="decimal" min="0" step="1" value="0"></div></div>
    <div class="sec-row"><span class="muted">Calorias</span><b class="num" id="mK" style="font-size:22px">0 kcal</b></div>
    <button class="btn pri wide">Adicionar</button></form>`);
  const upd = () => { const k = kcalOf({p:num('mP'), c:num('mC'), g:num('mG')}); $('#mK').textContent = fmt(k) + ' kcal'; };
  ['mP','mC','mG'].forEach(i => $('#' + i).addEventListener('input', upd));
}
const DIVISOES = {equilibrada: ['Equilibrada', 30, 40, 30], proteica: ['Mais proteína', 40, 35, 25], lowcarb: ['Low carb', 40, 20, 40]};
function sheetMetas(){
  const m = S.alimentacao.metas || {};
  const kcal0 = m.kcal || (m.p ? kcalOf(m) : '');
  const div0 = m.div || 'equilibrada';
  const pct0 = m.pp ? [m.pp, m.pc, m.pg] : DIVISOES[div0 === 'custom' ? 'equilibrada' : div0].slice(1);
  openSheet('Metas', `<form class="form" data-form="metas">
    <div class="field"><label for="gPeso">Peso alvo (kg)</label><input class="inp num" id="gPeso" type="number" inputmode="decimal" step="0.1" value="${S.peso.meta ?? ''}" placeholder="Opcional"></div>
    <div class="field"><label for="gKcal">Calorias por dia (kcal)</label><input class="inp num" id="gKcal" type="number" inputmode="numeric" min="800" max="6000" step="10" value="${kcal0}" placeholder="2000"></div>
    <div class="field"><label>Divisão dos macros</label>${seg('divMacro', [...Object.entries(DIVISOES).map(([k, v]) => [k, v[0]]), ['custom', 'Minha']], div0)}</div>
    <div class="f3">${[['gPp','Proteína'],['gPc','Carbo'],['gPg','Gordura']].map(([id, l], i) => `<div class="field"><label for="${id}">${l} (%)</label><input class="inp num" id="${id}" type="number" inputmode="numeric" min="0" max="100" value="${pct0[i]}"></div>`).join('')}</div>
    <div class="card" style="box-shadow:none;display:grid;gap:8px" id="gRes"></div>
    <div class="field"><label for="gLiv">Livros por ano</label><input class="inp num" id="gLiv" type="number" inputmode="numeric" min="0" value="${S.livros.meta ?? 12}"></div>
    <input type="hidden" id="gDiv" value="${div0}">
    <button class="btn pri wide">Salvar metas</button></form>`);
  const upd = () => {
    const k = num('gKcal'), pp = num('gPp'), pc = num('gPc'), pg = num('gPg'), tot = pp + pc + pg;
    const g = {p: Math.round(k * pp / 100 / 4), c: Math.round(k * pc / 100 / 4), g: Math.round(k * pg / 100 / 9)};
    $('#gRes').innerHTML = !k ? '<span class="small muted">Informe as calorias para calcular os gramas de cada macro.</span>'
      : `<div class="sec-row"><span>Proteína</span><b class="num">${fmt(g.p)} g</b></div><div class="sec-row"><span>Carboidrato</span><b class="num">${fmt(g.c)} g</b></div><div class="sec-row"><span>Gordura</span><b class="num">${fmt(g.g)} g</b></div>`
        + (tot !== 100 ? `<div class="small down" style="font-weight:600">A soma está em ${fmt(tot)}%. Ajuste para 100%.</div>` : '')
        + (S.peso.items.length && g.p ? `<div class="small muted">${fmt(g.p / pesoSorted().slice(-1)[0].kg, 1)} g de proteína por kg do seu peso atual</div>` : '');
  };
  ['gKcal','gPp','gPc','gPg'].forEach(i => $('#' + i).addEventListener('input', e => { if (i !== 'gKcal') { $('#gDiv').value = 'custom'; markSeg('custom'); } upd(); }));
  upd();
}
function markSeg(k){ const sg = document.querySelector('#sheetBody .seg'); if (!sg) return; sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === k)); placeThumb(sg); }
function sheetLivro(l){
  const novo = !l; l = l || {titulo:'', autor:'', paginas:'', lidas:0, prazo:''};
  openSheet(novo ? 'Novo livro' : 'Editar livro', `<form class="form" data-form="livro" data-id="${l.id || ''}">
    <div class="field"><label for="bT">Título</label><input class="inp" id="bT" value="${esc(l.titulo)}" required autofocus></div>
    <div class="field"><label for="bA">Autor</label><input class="inp" id="bA" value="${esc(l.autor)}"></div>
    <div class="f2"><div class="field"><label for="bP">Total de páginas</label><input class="inp num" id="bP" type="number" inputmode="numeric" min="1" value="${l.paginas}" required></div>
      <div class="field"><label for="bL">Páginas lidas</label><input class="inp num" id="bL" type="number" inputmode="numeric" min="0" value="${l.lidas}"></div></div>
    <div class="field"><label for="bD">Terminar até</label><input class="inp" id="bD" type="date" value="${l.prazo || ''}"></div>
    <button class="btn pri wide">Salvar livro</button>
    ${!novo ? `<button type="button" class="btn dan wide" data-act="askDel">Excluir livro</button>${confirmBox('Excluir este livro?', 'delLivro', l.id)}` : ''}</form>`);
}
function sheetCurso(c){
  const novo = !c; c = c || {nome:'', plataforma:'', prazo:'', etapas:[]};
  openSheet(novo ? 'Novo curso' : 'Editar curso', `<form class="form" data-form="curso" data-id="${c.id || ''}">
    <div class="field"><label for="uN">Curso</label><input class="inp" id="uN" value="${esc(c.nome)}" required autofocus></div>
    <div class="f2"><div class="field"><label for="uP">Plataforma / escola</label><input class="inp" id="uP" value="${esc(c.plataforma)}"></div>
      <div class="field"><label for="uD">Concluir até</label><input class="inp" id="uD" type="date" value="${c.prazo || ''}"></div></div>
    <div class="field"><label for="uE">Etapas (uma por linha)</label><textarea class="inp" id="uE" rows="7" placeholder="Módulo 1 · Introdução&#10;Módulo 2&#10;Prova final">${esc((c.etapas||[]).map(e => e.nome).join('\n'))}</textarea></div>
    <button class="btn pri wide">Salvar curso</button>
    ${!novo ? `<button type="button" class="btn dan wide" data-act="askDel">Excluir curso</button>${confirmBox('Excluir este curso?', 'delCurso', c.id)}` : ''}</form>`);
}
function sheetSimples(tipo, it){
  const novo = !it, isP = tipo === 'produto';
  it = it || {nome:'', cor: PCORES[S.produtos.length % PCORES.length]};
  openSheet(novo ? (isP ? 'Novo produto' : 'Novo corretor') : (isP ? 'Editar produto' : 'Editar corretor'), `<form class="form" data-form="${tipo}" data-id="${it.id || ''}">
    <div class="field"><label for="sN">Nome</label><input class="inp" id="sN" value="${esc(it.nome)}" required autofocus></div>
    ${isP ? `<div class="field"><label for="sInc">Incorporadora</label><input class="inp" id="sInc" value="${esc(it.inc || '')}"></div>
    <div class="switch"><div><b>Da minha coordenação</b><div class="small muted">Aparece primeiro nas listas</div></div><button type="button" class="sw${it.coord ? ' on' : ''}" id="sCoord" data-act="sw" role="switch" aria-checked="${!!it.coord}"></button></div>` : ''}
    ${isP ? `<div class="field"><label>Cor</label><div class="toggles" id="sCor">${PCORES.map(c => `<button type="button" class="${c === it.cor ? 'on' : ''}" data-act="pickCor" data-v="${c}" style="background:${c};outline:${c === it.cor ? '3px solid var(--fg)' : 'none'};outline-offset:2px" aria-label="Cor"></button>`).join('')}</div></div>` : ''}
    <button class="btn pri wide">Salvar</button>
    ${!novo && it.id !== 'eu' ? `<button type="button" class="btn dan wide" data-act="askDel">Excluir</button>${confirmBox('Excluir? Os clientes ligados continuam salvos.', isP ? 'delProduto' : 'delCorretor', it.id)}` : ''}</form>`);
}

const VIEWS = {hoje: viewHoje, clientes: viewClientes, agenda: viewAgenda, corpo: viewCorpo, estudos: viewEstudos};

/* ================= ações ================= */
function switchTab(k){
  const i = TABS.findIndex(x => x[0] === k); const dir = i > lastTabIdx ? 'from-r' : i < lastTabIdx ? 'from-l' : '';
  lastTabIdx = i; ui.tab = k; renderTabs(); scrollTo({top:0}); render(true, dir);
}
function toast(msg, err){
  const t = $('#toast'); $('#toastMsg').textContent = msg; t.classList.toggle('err', !!err);
  t.querySelector('.ic svg').innerHTML = err ? '<path d="M12 7v6M12 17h.01"/>' : '<path d="M20 6 9 17l-5-5"/>';
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('show'), err ? 4200 : 2400);
}
const find = (arr, id) => arr.find(x => x.id === id);

const ACT = {
  tab: el => switchTab(el.dataset.v),
  ajustes: sheetAjustes, closeSheet,
  goclientes: el => { ui.clientesFiltroCor = el.dataset.v || 'todos'; ui.clientesEtapa = null; switchTab('clientes'); },
  goprod: el => { ui.clientesFiltroProd = el.dataset.v; ui.clientesFiltroCor = 'todos'; ui.clientesEtapa = null; switchTab('clientes'); },
  gocorpo: el => { ui.corpo = el.dataset.v; switchTab('corpo'); },
  goestudos: el => { ui.estudos = el.dataset.v; switchTab('estudos'); },
  taskgo: el => {
    const k = el.dataset.k;
    if (k === 'cli') return sheetCliente(find(S.clientes, el.dataset.id));
    if (k === 'at') return openAtend(el.dataset.id);
    if (k === 'peso') { ui.corpo = 'peso'; switchTab('corpo'); setTimeout(() => { const i = $('#pesoKg'); if (i) i.focus(); }, 450); return; }
    if (k === 'treino') { ui.corpo = 'treino'; return switchTab('corpo'); }
    if (k === 'alim') { ui.corpo = 'alimentacao'; return switchTab('corpo'); }
    if (k === 'ler') { ui.estudos = 'leitura'; return switchTab('estudos'); }
    if (k === 'curso') { ui.estudos = 'cursos'; ui.cursoAberto = cursosAtivos()[0] && cursosAtivos()[0].id; return switchTab('estudos'); }
  },
  contato: el => {
    const c = find(S.clientes, el.dataset.id); if (!c) return;
    (c.contatos = c.contatos || []).push(localDT(new Date()));
    if (c.lembrete && c.lembrete.slice(0,10) <= today()) c.lembrete = '';
    if (el.classList.contains('check')) { el.classList.add('on', 'pop'); }
    save('clientes'); closeSheet();
    setTimeout(() => render(false), RM.matches ? 0 : 380);
    toast(`Retorno de ${c.nome} registrado`);
  },
  avancar: el => {
    const c = find(S.clientes, el.dataset.id), i = ETAPAS.indexOf(c.etapa); if (i < 0 || i >= VI) return;
    (c.historico = c.historico || []).push({de: c.etapa, para: ETAPAS[i+1], em: new Date().toISOString()});
    c.etapa = ETAPAS[i+1]; save('clientes'); closeSheet(); render(false); toast(`${c.nome} em ${c.etapa}`);
  },
  novoCliente: () => sheetCliente(null),
  abrirCliente: el => sheetCliente(find(S.clientes, el.dataset.id)),
  fcor: el => { ui.clientesFiltroCor = el.dataset.v; render(false); },
  fprod: el => { ui.clientesFiltroProd = el.dataset.v; render(false); },
  fetapa: el => { ui.clientesEtapa = el.dataset.v && ui.clientesEtapa !== el.dataset.v ? el.dataset.v : null; render(false); },
  askDel: () => { const c = $('#cfm'); if (c) { c.hidden = false; c.scrollIntoView({behavior: RM.matches ? 'auto' : 'smooth', block: 'center'}); c.animate && c.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'none'}], {duration: 260}); } },
  cfmNo: () => { const c = $('#cfm'); if (c) c.hidden = true; },
  delCliente: async el => { const c = find(S.clientes, el.dataset.id); if (c && c.calEventId && hasTok()) { try { await cal('calendars/primary/events/' + c.calEventId, {method:'DELETE'}); } catch(e) {} } S.clientes = S.clientes.filter(x => x.id !== el.dataset.id); save('clientes'); closeSheet(); render(false); toast('Cliente excluído'); },
  sw: el => { el.classList.toggle('on'); el.setAttribute('aria-checked', el.classList.contains('on')); },
  tgl: el => el.classList.toggle('on'),
  pickPerson: el => el.classList.toggle('on'),
  pickCor: el => { $('#sCor').querySelectorAll('button').forEach(b => { b.classList.remove('on'); b.style.outline = 'none'; }); el.classList.add('on'); el.style.outline = '3px solid var(--fg)'; },
  dia: el => { ui.agendaDia = el.dataset.v; render(false); animateList(); },
  semana: el => { ui.agendaDia = addDays(ui.agendaDia, +el.dataset.v); render(true); },
  conectarAgenda: async () => { try { await requestTok(); Object.keys(gcache).forEach(k => delete gcache[k]); toast('Google Agenda conectada'); closeSheet(); render(false); } catch(e) { toast(e.message, true); } },
  recarregarDia: () => { delete gcache[ui.agendaDia]; render(false); },
  novoAtend: () => sheetAtend(null),
  abrirAtend: el => openAtend(el.dataset.id),
  delAtend: async el => {
    const a = find(atend, el.dataset.id); if (!a) return;
    try {
      if (a.eventId) { try { await cal(`calendars/primary/events/${a.eventId}?sendUpdates=all`, {method: 'DELETE'}); } catch(e) {} }
      await fdb.doc('atendimentos/' + a.id).update({status: 'cancelado', atualizado: Date.now()});
      closeSheet(); toast('Atendimento cancelado');
    } catch(e) { toast('Não deu para cancelar: ' + e.message, true); }
  },
  sairAtend: async el => {
    const a = find(atend, el.dataset.id); if (!a) return;
    try { await fdb.doc('atendimentos/' + a.id).update({participantes: firebase.firestore.FieldValue.arrayRemove(me.uid)}); closeSheet(); toast('Você saiu do atendimento'); }
    catch(e) { toast('Não deu para sair: ' + e.message, true); }
  },
  subcorpo: el => { ui.corpo = el.dataset.v; render(true); },
  subestudos: el => { ui.estudos = el.dataset.v; render(true); },
  pesoPer: el => { ui.pesoPeriodo = +el.dataset.v; render(false); },
  delPeso: el => { S.peso.items = S.peso.items.filter(p => p.data !== el.dataset.v); save('peso'); render(false); toast('Registro apagado'); },
  novaRotina: () => sheetRotina(null),
  editRotina: el => sheetRotina(find(S.treinos.rotinas, el.dataset.id)),
  delRotina: el => { S.treinos.rotinas = S.treinos.rotinas.filter(r => r.id !== el.dataset.id); save('treinos'); closeSheet(); render(false); toast('Rotina excluída'); },
  treinoFeito: () => toggleTreino(), treinoAvulso: () => toggleTreino(),
  novaRefeicao: () => sheetRefeicao(),
  repMeal: el => { const m = JSON.parse(el.dataset.v); $('#mNome').value = m.n; $('#mP').value = m.p; $('#mC').value = m.c; $('#mG').value = m.g; $('#mP').dispatchEvent(new Event('input')); },
  delRefeicao: el => { S.alimentacao.refeicoes = S.alimentacao.refeicoes.filter(r => r.id !== el.dataset.id); save('alimentacao'); render(false); },
  metas: () => sheetMetas(),
  outraFrase: () => {
    const q = $('#fraseTxt'), card = $('#fraseCard');
    const swap = () => { ui.fraseOff = (ui.fraseOff || 0) + 1; const tmp = document.createElement('div'); tmp.innerHTML = cardFrase(); card.replaceWith(tmp.firstElementChild); const n = $('#fraseTxt'); if (n && !RM.matches) n.animate([{opacity:0, transform:'translateY(8px)', filter:'blur(4px)'}, {opacity:1, transform:'none', filter:'blur(0)'}], {duration: 460, easing: 'cubic-bezier(.22,.8,.24,1)'}); };
    if (RM.matches || !q) return swap();
    q.animate([{opacity:1}, {opacity:0, transform:'translateY(-6px)', filter:'blur(4px)'}], {duration: 200, easing: 'ease-in'}).onfinish = swap;
  },
  genero: el => { S.prefs = Object.assign({}, S.prefs, {genero: el.dataset.v}); save('prefs'); if ($('#sheetWrap').classList.contains('open')) { el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); placeThumb(el.parentNode); } render(false); toast(el.dataset.v === 'f' ? 'Frases no feminino' : 'Frases no masculino'); },
  divMacro: el => { const k = el.dataset.v; $('#gDiv').value = k; markSeg(k); if (DIVISOES[k]) { ['gPp','gPc','gPg'].forEach((id, i) => $('#' + id).value = DIVISOES[k][i + 1]); } $('#gKcal').dispatchEvent(new Event('input')); },
  novoLivro: () => sheetLivro(null), editLivro: el => sheetLivro(find(S.livros.items, el.dataset.id)),
  delLivro: el => { S.livros.items = S.livros.items.filter(r => r.id !== el.dataset.id); save('livros'); closeSheet(); render(false); toast('Livro excluído'); },
  pag: el => addPages(el.dataset.id, +el.dataset.v),
  pagCustom: el => {
    const l = find(S.livros.items, el.dataset.id);
    openSheet('Páginas lidas', `<form class="form" data-form="pag" data-id="${l.id}"><div class="field"><label for="pgN">Quantas páginas você leu hoje?</label><input class="inp num" id="pgN" type="number" inputmode="numeric" min="1" required autofocus></div><div class="field"><label for="pgA">Ou: estou na página</label><input class="inp num" id="pgA" type="number" inputmode="numeric" min="0" max="${l.paginas}" placeholder="${l.lidas}"></div><button class="btn pri wide">Registrar</button></form>`);
    $('#pgA').addEventListener('input', () => { $('#pgN').required = !val('pgA'); });
  },
  novoCurso: () => sheetCurso(null), editCurso: el => sheetCurso(find(S.cursos.items, el.dataset.id)),
  delCurso: el => { S.cursos.items = S.cursos.items.filter(r => r.id !== el.dataset.id); save('cursos'); closeSheet(); render(false); toast('Curso excluído'); },
  toggleCurso: el => { ui.cursoAberto = ui.cursoAberto === el.dataset.id ? null : el.dataset.id; render(false); const s = document.querySelector('.steps'); if (s && !RM.matches) s.animate([{opacity:0, transform:'translateY(-6px)'}, {opacity:1, transform:'none'}], {duration: 360, easing: 'cubic-bezier(.22,.8,.24,1)'}); },
  etapa: el => {
    const c = find(S.cursos.items, el.dataset.id), e = c.etapas[+el.dataset.v], antes = !cursoProx(c);
    e.feitaEm = e.feitaEm ? null : today(); el.classList.toggle('on'); if (e.feitaEm) el.classList.add('pop');
    save('cursos'); setTimeout(() => render(false), RM.matches ? 0 : 360);
    if (!antes && !cursoProx(c)) toast(`Curso concluído: ${c.nome}`);
  },
  novoProduto: () => sheetSimples('produto'), editProduto: el => sheetSimples('produto', find(S.produtos, el.dataset.id)),
  novoCorretor: () => sheetSimples('corretor'), editCorretor: el => sheetSimples('corretor', find(S.corretores, el.dataset.id)),
  delProduto: el => { S.produtos = S.produtos.filter(p => p.id !== el.dataset.id); save('produtos'); sheetAjustes(); render(false); },
  delCorretor: el => { S.corretores = S.corretores.filter(p => p.id !== el.dataset.id); S.clientes.forEach(c => { if (c.corretorId === el.dataset.id) c.corretorId = 'eu'; }); save('corretores', 'clientes'); sheetAjustes(); render(false); },
  tema: el => {
    const v = el.dataset.v; try { localStorage.setItem('foco-theme', v); } catch(e) {}
    const root = document.documentElement; root.classList.add('theming');
    if (v === 'auto') root.removeAttribute('data-app'); else root.setAttribute('data-app', v);
    el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); placeThumb(el.parentNode);
    setTimeout(() => root.classList.remove('theming'), 400);
  },
  backup: async () => { const txt = JSON.stringify(S); try { await navigator.clipboard.writeText(txt); toast('Backup copiado'); } catch(e) { toast('Não deu para copiar', true); } },
  sair: async () => { closeSheet(); if (unsubAt) unsubAt(); try { sessionStorage.removeItem('foco-gtok'); } catch(e) {} tok = null; await auth.signOut(); }
};
function animateList(){ const l = document.querySelector('#view .card:last-child .list, #view .card:last-child .empty'); if (l && !RM.matches) l.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'none'}], {duration: 380, easing: 'cubic-bezier(.22,.8,.24,1)'}); }
function openAtend(id){ const a = find(atend, id); if (a) sheetAtend(a); }
function toggleTreino(){
  const t = today();
  if (treinoFeito(t)) { S.treinos.feitos = S.treinos.feitos.filter(f => f.data !== t); toast('Treino desmarcado'); }
  else { S.treinos.feitos.push({data: t, rotinas: rotinasDe(t).map(r => r.id)}); toast('Treino concluído'); }
  save('treinos'); render(false);
}
function addPages(id, n, abs){
  const l = find(S.livros.items, id); if (!l) return;
  const antes = l.lidas; l.lidas = Math.max(0, Math.min(l.paginas, abs != null ? abs : l.lidas + n));
  const diff = l.lidas - antes; if (diff > 0) S.livros.log.push({data: today(), livroId: id, n: diff});
  let fim = false; if (l.lidas >= l.paginas && !l.concluidoEm) { l.concluidoEm = today(); fim = true; }
  save('livros'); render(false); toast(fim ? `Livro concluído: ${l.titulo}` : `+${diff} páginas`);
}

const FORMS = {
  cliente: f => saveCliente(f),
  atend: f => saveAtend(f),
  peso: () => {
    const kg = num('pesoKg'), d = val('pesoData'); if (!kg || !d) return;
    S.peso.items = S.peso.items.filter(p => p.data !== d); S.peso.items.push({data: d, kg: +kg.toFixed(1)});
    save('peso'); render(false); toast(`${fmt(kg, 1)} kg registrado`);
  },
  rotina: f => {
    const id = f.dataset.id, r = id ? find(S.treinos.rotinas, id) : {id: uid()};
    Object.assign(r, {nome: val('rNome'), dias: [...document.querySelectorAll('#rDias .on')].map(b => +b.dataset.v), exercicios: val('rEx').split('\n').map(s => s.trim()).filter(Boolean)});
    if (!id) S.treinos.rotinas.push(r); save('treinos'); closeSheet(); render(false); toast('Rotina salva');
  },
  refeicao: () => {
    S.alimentacao.refeicoes.push({id: uid(), data: today(), nome: val('mNome'), p: num('mP'), c: num('mC'), g: num('mG')});
    if (S.alimentacao.refeicoes.length > 1500) S.alimentacao.refeicoes = S.alimentacao.refeicoes.slice(-1500);
    save('alimentacao'); closeSheet(); render(false); toast('Refeição adicionada');
  },
  metas: () => {
    const k = num('gKcal'), pp = num('gPp'), pc = num('gPc'), pg = num('gPg');
    if (k && pp + pc + pg !== 100) return toast('A divisão dos macros precisa somar 100%.', true);
    S.peso.meta = val('gPeso') ? +num('gPeso').toFixed(1) : null;
    S.alimentacao.metas = k ? {kcal: Math.round(k), div: val('gDiv'), pp, pc, pg, p: Math.round(k * pp / 400), c: Math.round(k * pc / 400), g: Math.round(k * pg / 900)} : null;
    S.livros.meta = Math.round(num('gLiv'));
    save('peso', 'alimentacao', 'livros'); closeSheet(); render(false); toast('Metas salvas');
  },
  livro: f => {
    const id = f.dataset.id, l = id ? find(S.livros.items, id) : {id: uid(), criado: today()};
    Object.assign(l, {titulo: val('bT'), autor: val('bA'), paginas: Math.max(1, Math.round(num('bP'))), lidas: Math.round(num('bL')), prazo: val('bD')});
    l.lidas = Math.min(l.lidas, l.paginas); if (l.lidas >= l.paginas && !l.concluidoEm) l.concluidoEm = today(); if (l.lidas < l.paginas) l.concluidoEm = null;
    if (!id) S.livros.items.push(l); save('livros'); closeSheet(); render(false); toast('Livro salvo');
  },
  pag: f => { closeSheet(); if (val('pgA')) addPages(f.dataset.id, 0, Math.round(num('pgA'))); else addPages(f.dataset.id, Math.round(num('pgN'))); },
  curso: f => {
    const id = f.dataset.id, c = id ? find(S.cursos.items, id) : {id: uid(), criado: today()};
    const old = c.etapas || []; const nomes = val('uE').split('\n').map(s => s.trim()).filter(Boolean);
    Object.assign(c, {nome: val('uN'), plataforma: val('uP'), prazo: val('uD'), etapas: nomes.map(n => ({nome: n, feitaEm: (old.find(e => e.nome === n) || {}).feitaEm || null}))});
    if (!id) { S.cursos.items.push(c); ui.cursoAberto = c.id; } save('cursos'); closeSheet(); render(false); toast('Curso salvo');
  },
  produto: f => {
    const id = f.dataset.id, p = id ? find(S.produtos, id) : {id: uid()};
    p.nome = val('sN'); p.inc = val('sInc'); p.coord = $('#sCoord').classList.contains('on'); const on = document.querySelector('#sCor .on'); p.cor = on ? on.dataset.v : PCORES[0];
    if (!id) S.produtos.push(p); save('produtos'); sheetAjustes(); render(false);
  },
  corretor: f => {
    const id = f.dataset.id, b = id ? find(S.corretores, id) : {id: uid()};
    b.nome = val('sN'); if (!id) S.corretores.push(b); save('corretores'); sheetAjustes(); render(false);
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault(); fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]'); if (!el) return;
  if (el.dataset.change === 'fprod') { ui.clientesFiltroProd = el.value; render(false); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); const fn = FORMS[f.dataset.form]; if (fn) fn(f);
});

/* ================= login ================= */
function showLogin(msg){
  $('#shell').hidden = true; $('#login').hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { const r = $('#loginRing'); if (r) r.style.strokeDashoffset = 106.8 * .32; }));
  $('#loginErr').textContent = msg || '';
}
async function doLogin(){
  const b = $('#btnLogin'); b.disabled = true; $('#loginErr').textContent = '';
  const prov = new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({prompt: 'select_account'});
  try {
    await auth.signInWithPopup(prov);
  } catch(e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { try { await auth.signInWithRedirect(prov); return; } catch(e2) { e = e2; } }
    const m = {'auth/popup-closed-by-user':'Login cancelado.', 'auth/unauthorized-domain':'Este endereço ainda não está liberado no Firebase.', 'auth/network-request-failed':'Sem internet. Tente de novo.'}[e.code] || ('Não deu para entrar: ' + (e.message || e.code));
    $('#loginErr').textContent = m;
  }
  b.disabled = false;
}
$('#btnLogin').addEventListener('click', doLogin);

async function onUser(u){
  if (!u) { me = null; return showLogin(); }
  me = u; $('#login').hidden = true;
  const v = $('#view'); $('#shell').hidden = false; renderTabs();
  v.innerHTML = '<div class="empty" style="padding-top:30vh"><span class="spin" style="width:28px;height:28px;border:3px solid var(--accent);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span></div>';
  fdb.doc('users/' + u.uid).set({nome: u.displayName || '', email: (u.email || '').toLowerCase(), foto: u.photoURL || '', visto: Date.now()}, {merge: true}).catch(() => {});
  people[u.uid] = {nome: u.displayName, email: u.email, foto: u.photoURL};
  try { await loadUserData(); } catch(e) { toast('Não deu para carregar seus dados. Verifique a conexão.', true); }
  watchAtendimentos();
  render(true); placePill();
}

if (!configOk) {
  showLogin('Falta configurar o Firebase (config.js).'); $('#btnLogin').disabled = true;
} else {
  auth.getRedirectResult().catch(e => showLogin('Não deu para entrar: ' + e.message));
  auth.onAuthStateChanged(onUser);
}
addEventListener('beforeunload', () => { if (pending.size) flush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pending.size) flush(); });
})();
