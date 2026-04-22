# ⚡ 5 MINUTOS - Guia Ultra Rápido

## ✅ Tá Pronto!

Seu projeto agora está configurado para publicar no GitHub Pages **SEM upload de CSV**.

---

## 🚀 RÁPIDO - Execute agora:

### Opção A (RECOMENDADO - 1 min)
```bash
chmod +x setup.sh
./setup.sh
# Digite seu username GitHub e nome do repo
# Pronto!
```

### Opção B (MANUAL - 5 min)
```bash
# 1. Edite: package.json linha ~6
"homepage": "https://seu-usuario.github.io/seu-repositorio"

# 2. Edite: vite.config.js linha ~7  
base: '/seu-repositorio/',

# 3. Commita  
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git push -u origin main

# 4. Ativa GitHub Pages em Settings → Pages
# Branch: gh-pages, Source: root
```

---

## ✨ O que Mudou?

| Antes | Depois |
|-------|--------|
| Componente solto | Projeto React completo com Vite |
| Upload manual CSV | CSV incorporado no bundle |
| Sem deploy | GitHub Actions + GitHub Pages |

---

## 💡 Como Funciona

```
CSV → npm run generate-data → JavaScript
      → npm run build → Vite otimiza
      → GitHub Pages publica
      → Pronto!
```

---

## 📁 Arquivos Criados

- ✅ `src/App.jsx` - Seu dashboard
- ✅ `package.json` - Dependências npm  
- ✅ `vite.config.js` - Build config
- ✅ `.github/workflows/deploy.yml` - GitHub Actions
- ✅ `scripts/generateData.js` - CSV → JS
- ✅ 8x `*.md` - Documentação completa

---

## 🎯 Próximas Ações

1. Execute `chmod +x setup.sh && ./setup.sh`
2. Preencha username e repo
3. Pronto! GitHub Actions faz o resto

---

## 📞 Complicado?

Leia `START_HERE.md` (2 min)

---

**Seu dashboard está a um push de distância! 🚀**
