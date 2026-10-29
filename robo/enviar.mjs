// Robô de notificações do Foco: roda no GitHub Actions a cada 10 minutos.
// Lê a fila de avisos de cada usuário (montada pelo próprio app) e envia o que venceu.
import admin from 'firebase-admin';
import webpush from 'web-push';

if (!process.env.FIREBASE_SA || !process.env.VAPID_PRIVATE) { console.log('Segredos ainda não configurados; nada a fazer.'); process.exit(0); }
const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
webpush.setVapidDetails('mailto:1imovjund@gmail.com', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

const agora = Date.now(), JANELA = 3 * 60 * 60e3; // não envia avisos com mais de 3 h de atraso
let enviados = 0, falhas = 0;
const usuarios = await db.collection('users').listDocuments();
for (const u of usuarios) {
  const dados = u.collection('dados');
  const [subsDoc, filaDoc, testeDoc, logDoc] = await Promise.all(['push_subs', 'push_fila', 'push_teste', 'push_log'].map(id => dados.doc(id).get()));
  const subs = subsDoc.exists ? subsDoc.data() : {};
  if (!Object.keys(subs).length) continue;
  const ja = new Set(logDoc.exists ? (logDoc.data().ids || []) : []);
  const itens = [...(filaDoc.exists ? filaDoc.data().itens || [] : []), ...(testeDoc.exists ? testeDoc.data().itens || [] : [])]
    .filter(i => i.quando <= agora && i.quando > agora - JANELA && !ja.has(i.id));
  const mortas = [];
  for (const it of itens) {
    const payload = JSON.stringify({title: it.title, body: it.body, url: it.url, tag: it.id});
    for (const [sid, s] of Object.entries(subs)) {
      try { await webpush.sendNotification({endpoint: s.endpoint, keys: s.keys}, payload, {TTL: 3600}); enviados++; }
      catch (e) { falhas++; if (e.statusCode === 404 || e.statusCode === 410) mortas.push(sid); else console.log('falha', e.statusCode, e.body); }
    }
    ja.add(it.id);
  }
  if (itens.length) await dados.doc('push_log').set({ids: [...ja].slice(-500), em: agora});
  if (mortas.length) await dados.doc('push_subs').update(Object.fromEntries([...new Set(mortas)].map(m => [m, admin.firestore.FieldValue.delete()])));
}
console.log(`usuários: ${usuarios.length} · enviados: ${enviados} · falhas: ${falhas}`);
