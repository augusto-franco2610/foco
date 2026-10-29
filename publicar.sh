#!/bin/sh
# Publica uma versão nova: carimba a versão, faz commit e envia para o GitHub Pages
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
sed -i -E "s/(\?v=|FOCO_VERSAO = ')[0-9A-Z]+/\1$V/g" index.html
printf '{"v":"%s"}\n' "$V" > versao.json
git add -A
git commit -q -m "${1:-Atualização} 

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DYqCmg4TJZkawjspgNop34" --author="Augusto Franco <1imovjund@gmail.com>"
git push -q origin main
echo "publicado $V"
