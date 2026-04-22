# 🎯 Guia Rápido - Dashboard no GitHub Pages

Resumo de tudo que foi feito para você publicar no GitHub Pages **sem upload de CSV**.

---

## ✨ Mudanças Principais

### 1. **Dados integrados** ✅
- Seu CSV agora é convertido em JavaScript durante o build
- Dados ficam embutidos na aplicação (offline-first)
- Sem necessidade de upload de arquivo

### 2. **Projeto React completo** ✅
- Vite como build tool (muito mais rápido que Create React App)
- Tailwind CSS já configurado
- Todos os componentes funcionais

### 3. **GitHub Actions automático** ✅
- Faz deploy automaticamente quando você faz push
- Não precisa fazer nada manual após o setup

### 4. **Deploy estático** ✅
- Roda em GitHub Pages (gratuito)
- Sem servidor backend necessário

---

## 🚀 Como Publicar (3 passos)

### Passo 1: Criar repositório no GitHub
```bash
# Vá para github.com/new e crie um repositório
# Não inicialize com nenhum arquivo
```

### Passo 2: Executar script de setup
```bash
# Dar permissão e executar
chmod +x setup.sh
./setup.sh

# Ele vai pedir:
# - Seu username GitHub
# - Nome do repositório
# - Depois configura tudo automaticamente
```

### Passo 3: Primeiro push
```bash
git push -u origin main
# GitHub Actions faz o deploy automaticamente
```

**Pronto! Dashboard está vivo em `https://seu-usuario.github.io/seu-repositorio`** 🎉

---

## 📁 Estrutura do Projeto

```
├── 📄 index.html              ← Arquivo principal
├── 📄 package.json            ← Dependências (atualizado para seu repo)
├── 📄 vite.config.js          ← Build config (Vite)
├── 📄 tailwind.config.js      ← Estilos Tailwind
│
├── 📁 src/
│   ├── App.jsx                ← Dashboard (React)
│   ├── main.jsx               ← Entry point
│   └── index.css              ← CSS global
│
├── 📁 scripts/
│   └── generateData.js        ← Converte CSV → JS
│
├── 📁 .github/workflows/
│   └── deploy.yml             ← GitHub Actions (automático)
│
├── 📄 melhorias_abertas_completo.csv  ← Seus dados (processados no build)
│
└── 📄 README.md               ← Documentação
```

---

## 🔄 Fluxo de Atualização

Sempre que quiser atualizar:

```bash
# 1. Substitua o CSV
# (coloque novo arquivo sobre o existente)

# 2. Faça push
git add melhorias_abertas_completo.csv
git commit -m "Atualizar dados"
git push origin main

# 3. GitHub Actions configura tudo sozinho
# (veja o status em Actions)
```

---

## 🎨 Customizações Rápidas

### Mudar cores/temas
Edite `src/App.jsx` → procure por `COLORS = [...]`

### Adicionar/remover filtros
Edite `src/App.jsx` → procure por seção "Filtros"

### Mudar stopwords (tema extraction)
Edite `src/App.jsx` → procure por `stopwords = new Set(...)`

### Mudar título ou descrição
Edite `src/App.jsx` → procure por `<h1>` ou `<title>`

---

## 🆘 Se Algo Não Funcionar

### "npm command not found"
- Instale Node.js em nodejs.org

### "script not found"
```bash
# Verifique se está no diretório correto
cd /home/patrick.cardoso/development/workcopy/ia/site-melhorias
npm install
npm run build
```

### "Git not found"
- Instale Git: git-scm.com

### "Build failures"
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json dist
npm install --legacy-peer-deps
npm run build
```

### "404 ao acessar"
- Aguarde 2-3 minutos após push (GitHub Pages demora)
- Verifique se a URL está correta na barra de endereço
- Vá em Settings → Pages e confirme que está tudo OK

---

## 📊 Processamento do CSV

Como funciona:

1. **Você commita** → `melhorias_abertas_completo.csv`
2. **GitHub Actions executa** → `npm run generate-data`
3. **Script cria** → `src/data/csvData.js` (automático)
4. **Vite inclui** → dados no bundle final
5. **App carrega** → dados já integrados (sem upload)

O arquivo `csvData.js` é ignorado no Git (`.gitignore`), então cada build regenera automaticamente.

---

## ✅ Checklist Pré-Deploy

- [ ] Tem Node.js 18+ instalado?
- [ ] Criou repositório no GitHub?
- [ ] Executou `./setup.sh` com seu username/repo?
- [ ] Fez `git push -u origin main`?
- [ ] GitHub Pages está ativado em Settings?
- [ ] GitHub Actions rodou com sucesso?
- [ ] Consegue acessar a URL do dashboard?

---

## 🎓 Conceitos Usados

- **Vite**: Build tool de última geração (10x mais rápido)
- **React 18**: Framework ui (já conhecido)
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Biblioteca de gráficos React
- **GitHub Pages**: Hospedagem estática (gratuita)
- **GitHub Actions**: CI/CD automático (gratuito)

---

## 📞 Suporte Rápido

Se encontrar erro:

1. Confira os logs do GitHub Actions (Actions tab no repo)
2. Leia o arquivo `GITHUB_PAGES_SETUP.md`
3. Tente novamente com `npm install --legacy-peer-deps`

Qualquer dúvida, consulte o `README.md` detalhado.

---

**Tudo pronto! 🚀 Seu dashboard está a um push de distância!**
