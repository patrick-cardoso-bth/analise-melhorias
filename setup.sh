#!/bin/bash

# Script de Setup Rápido para GitHub Pages
# Execute uma única vez para configurar seu projeto

set -e

echo "🚀 Iniciando setup do Dashboard para GitHub Pages..."
echo ""

# Solicitar informações do usuário
read -p "Digite seu usuário GitHub: " GITHUB_USER
read -p "Digite o nome do repositório: " REPO_NAME

if [ -z "$GITHUB_USER" ] || [ -z "$REPO_NAME" ]; then
  echo "❌ Erro: Usuário e repositório são obrigatórios"
  exit 1
fi

GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
BASE_URL="/${REPO_NAME}/"
HOMEPAGE="https://${GITHUB_USER}.github.io${BASE_URL}"

echo ""
echo "📋 Configurações:"
echo "  • Username: $GITHUB_USER"
echo "  • Repositório: $REPO_NAME"
echo "  • URL Homepage: $HOMEPAGE"
echo "  • Base URL: $BASE_URL"
echo ""

# Atualizar package.json
echo "📝 Atualizando package.json..."
sed -i "s|\"homepage\": \".*\"|\"homepage\": \"$HOMEPAGE\"|" package.json

# Atualizar vite.config.js
echo "📝 Atualizando vite.config.js..."
sed -i "s|base: '.*'|base: '$BASE_URL'|" vite.config.js

# Remover workflow antigo do CNAME se existir
echo "📝 Preparando workflow GitHub Actions..."
if grep -q "cname:" .github/workflows/deploy.yml; then
  sed -i "s/^[[:space:]]*cname: .*/        # cname: seu-dominio.com # Remova o comentário se usar domínio customizado/" .github/workflows/deploy.yml
fi

# Inicializar git se não existir
if [ ! -d ".git" ]; then
  echo "🔗 Inicializando repositório Git..."
  git init
  git add .
  git commit -m "Initial commit - Dashboard Melhorias"
  git branch -M main
  git remote add origin "$GITHUB_URL"
  echo "✅ Repositório iniciado"
else
  echo "✅ Repositório Git já existe"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install --legacy-peer-deps

# Gerar dados
echo "🔄 Gerando dados do CSV..."
npm run generate-data

# Build
echo "🔨 Fazendo build..."
npm run build

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📌 Próximos passos:"
echo "1. Acesse: https://github.com/$GITHUB_USER/$REPO_NAME/settings/pages"
echo "2. Selecione 'Deploy from a branch' e escolha 'gh-pages'"
echo "3. Execute: git push -u origin main"
echo "4. GitHub Actions vai fazer o deploy automaticamente"
echo ""
echo "🌐 Dashboard estará disponível em: $HOMEPAGE"
echo ""
