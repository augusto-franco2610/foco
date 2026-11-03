// Robô de notificações do Foco: roda no GitHub Actions a cada 10 minutos.
// Lê a fila de avisos de cada usuário (montada pelo próprio app) e envia o que venceu.
import admin from 'firebase-admin';
import webpush from 'web-push';

if (!process.env.FIREBASE_SA || !process.env.VAPID_PRIVATE) { console.log('Segredos ainda não configurados; nada a fazer.'); process.exit(0); }
const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
webpush.setVapidDetails('mailto:1imovjund@gmail.com', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

const agora = Date.now(), JANELA = 3 * 60 * 60e3;   // não envia avisos com mais de 3 h de atraso
const MAX_ITENS = 50, MAX_SUBS = 10;                 // limite por usuário e por rodada (ninguém trava o envio dos outros)
const TIMEOUT_MS = 8000;                             // cada envio desiste depois de 8 s
// Só aceita endereços dos serviços de push dos navegadores (Chrome/Android, Apple, Firefox, Edge).
const PUSH_OK = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//i;
const texto = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';

let enviados = 0, falhas = 0, usuariosComErro = 0;
const usuarios = await db.collection('users').listDocuments();
for (const u of usuarios) {
  // Um usuário com problema não pode derrubar o envio de todo mundo.
  try {
    const dados = u.collection('dados');
    const [subsDoc, filaDoc, testeDoc, logDoc] = await Promise.all(['push_subs', 'push_fila', 'push_teste', 'push_log'].map(id => dados.doc(id).get()));
    const subs = Object.entries(subsDoc.exists ? subsDoc.data() : {})
      .filter(([, s]) => s && typeof s.endpoint === 'string' && PUSH_OK.test(s.endpoint) && s.keys && typeof s.keys === 'object')
      .slice(0, MAX_SUBS);
    if (!subs.length) continue;
    const ja = new Set(logDoc.exists ? (logDoc.data().ids || []) : []);
    const lista = v => Array.isArray(v) ? v : [];
    const itens = [...lista(filaDoc.exists ? filaDoc.data().itens : []), ...lista(testeDoc.exists ? testeDoc.data().itens : [])]
      .filter(i => i && typeof i.id === 'string' && isFinite(+i.quando) && +i.quando <= agora && +i.quando > agora - JANELA && !ja.has(i.id))
      .slice(0, MAX_ITENS);
    const mortas = new Set();
    for (const it of itens) {
      const payload = JSON.stringify({title: texto(it.title, 120), body: texto(it.body, 400), url: texto(it.url, 300), tag: it.id});
      let entregou = false, temporaria = false;
      for (const [sid, s] of subs) {
        if (mortas.has(sid)) continue;                 // inscrição que já deu 404/410 nesta rodada não recebe nova tentativa
        try { await webpush.sendNotification({endpoint: s.endpoint, keys: s.keys}, payload, {TTL: 3600, timeout: TIMEOUT_MS}); enviados++; entregou = true; }
        catch (e) {
          falhas++;
          if (e.statusCode === 404 || e.statusCode === 410) mortas.add(sid);
          else { temporaria = true; console.log('falha temporária', e.statusCode || e.code || 'rede'); }
        }
      }
      // Só marca como enviado se chegou em algum aparelho, ou se não há mais aparelho válido para tentar.
      // Falha temporária (rede, servidor fora) fica para a próxima rodada, dentro da janela de 3 h.
      if (entregou || !temporaria) ja.add(it.id);
    }
    if (itens.length) await dados.doc('push_log').set({ids: [...ja].slice(-500), em: agora});
    if (mortas.size) await dados.doc('push_subs').update(Object.fromEntries([...mortas].map(m => [m, admin.firestore.FieldValue.delete()])));
  } catch (e) {
    usuariosComErro++; console.log('erro em um usuário; seguindo para o próximo:', e.code || e.message);
  }
}
console.log(`usuários: ${usuarios.length} · enviados: ${enviados} · falhas: ${falhas} · com erro: ${usuariosComErro}`);
