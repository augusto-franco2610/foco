// Configuração do Firebase e do acesso ao Google Agenda.
// Esses valores são públicos por natureza (ficam no navegador); a segurança vem das regras do Firestore.
window.FOCO_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCo--9WlOhN9KU5NEVMCSpn5iKvbqgBPSo",
    authDomain: "foco-franco.firebaseapp.com",
    projectId: "foco-franco",
    storageBucket: "foco-franco.firebasestorage.app",
    messagingSenderId: "591250475185",
    appId: "1:591250475185:web:2a58a69d337334a0147a90"
  },
  // ID do cliente OAuth "Web client (auto created by Google Service)" do mesmo projeto
  googleClientId: "591250475185-efuiq7vtuuns5jh4bc44fs663jssej4b.apps.googleusercontent.com",
  timeZone: "America/Sao_Paulo"
};
