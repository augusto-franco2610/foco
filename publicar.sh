#!/bin/sh
# Publica uma versão nova: confere o código, carimba a versão, faz commit e envia para o GitHub Pages.
# Uso: ./publicar.sh "descrição da mudança"
set -e
cd "$(dirname "$0")"

# 1) Não publica código quebrado
for f in app.js sw.js config.js; do node --check "$f"; done
node -e "for (const f of ['manifest.json','alimentos.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"

# 2) Carimba a versão (o app recarrega sozinho quando ela muda). Funciona no Linux e no macOS.
V=$(date +%Y%m%d%H%M%S)
sed -E "s/(\?v=|FOCO_VERSAO = ')[0-9A-Z]+/\1$V/g" index.html > index.html.tmp && mv index.html.tmp index.html
grep -q "FOCO_VERSAO = '$V'" index.html || { echo "ERRO: não achei FOCO_VERSAO no index.html; versão não carimbada"; exit 1; }
printf '{"v":"%s"}\n' "$V" > versao.json

# 3) Só os arquivos do app — nada solto na pasta (chaves, exportações) vai para o repositório público
git add index.html versao.json app.js styles.css config.js sw.js manifest.json alimentos.json firestore.rules publicar.sh .gitignore \
        robo/enviar.mjs robo/package.json robo/package-lock.json .github/workflows/notificacoes.yml \
        favicon-32.png apple-touch-icon.png icon-192.png icon-512.png
git commit -q -m "${1:-Atualização}"
git push -q origin main
echo "publicado $V"
