# Instruções de Deploy no GitHub Pages

## 1️⃣ Setup Inicial Rápido

### A. Criar/Configurar repositório GitHub

```bash
# Opção 1: Se não tem repositório local ainda
git init
git add .
git commit -m "Initial commit - Dashboard Melhorias"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

### B. Configurar GitHub Pages (uma única vez)

1. Acesse: https://github.com/seu-usuario/seu-repositorio/settings/pages
2. Em "Build and deployment":
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `(root)`
3. Clique em "Save"

---

## 2️⃣ Configurar URLs Corretas

### No arquivo `package.json`:
```json
"homepage": "https://seu-usuario.github.io/seu-repositorio"
```

Substitua:
- `seu-usuario` → seu username GitHub
- `seu-repositorio` → nome do repositório

### No arquivo `vite.config.js`:
```javascript
base: '/seu-repositorio/',
```

---

## 3️⃣ Em Caso de Domínio Customizado

Se você quer usar um domínio próprio (ex: `melhorias.seu-dominio.com`):

1. Edite `.github/workflows/deploy.yml`:
   ```yaml
   cname: melhorias.seu-dominio.com
   ```

2. Configure seu domínio no DNS:
   - Adicionar um CNAME record apontando para `seu-usuario.github.io`

3. Em GitHub Settings → Pages:
   - Coloque o domínio customizado
   - Deixe "Enforce HTTPS" marcado

---

## 4️⃣ Primeiro Deploy

```bash
# 1. Instale as dependências
npm install

# 2. Gere os dados do CSV
npm run generate-data

# 3. Teste localmente
npm run dev

# 4. Faça build
npm run build

# 5. Se tudo OK, faça push
git push origin main
```

---

## 5️⃣ Deploy Automático em Próximos Pushes

Depois do primeiro setup, **não precisa fazer mais nada**! 🎉

Simplesmente:
```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

GitHub Actions automaticamente:
- ✅ Instala dependências
- ✅ Gera dados do CSV
- ✅ Faz build
- ✅ Publica no GitHub Pages

**Status do deploy**: https://github.com/seu-usuario/seu-repositorio/actions

---

## 6️⃣ Atualizar Dados

Para atualizar os dados do dashboard:

1. Substitua o arquivo `melhorias_abertas_completo.csv` com novos dados
2. Faça:
   ```bash
   git add melhorias_abertas_completo.csv
   git commit -m "Atualizar dados de melhorias"
   git push origin main
   ```
3. Pronto! GitHub Actions vai regenerar o dashboard automaticamente

---

## ✅ Checklist Final

- [ ] `homepage` em `package.json` está correto?
- [ ] `base` em `vite.config.js` está correto?
- [ ] `gh-pages` branch foi criada automaticamente pelo GitHub?
- [ ] GitHub Pages está ativado nas Settings?
- [ ] Primeiro push foi feito na branch `main`?
- [ ] GitHub Actions completou com sucesso?
- [ ] Dashboard está acessível na URL esperada?

---

## 🆘 Troubleshooting

### Problema: "404 - Page Not Found"
- Verifique se a URL `base` em `vite.config.js` bate com a estrutura
- Aguarde alguns minutos após o deploy

### Problema: "Dados não carregam"
- Verifique se o CSV foi processado corretamente: `npm run generate-data`
- Procure por `src/data/csvData.js` (deve existir após o build)

### Problema: "Failed to deploy"
- Verificar logs em: Actions → workflow run → Logs
- Confirmar que `npm install` passou sem erros

### Problema: "Build Error"
```bash
# Tente limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📞 Próximas Steps

1. **Customizar**: Edite `src/App.jsx` para alterar cores, textos, etc.
2. **Monitorar**: Acompanhe builds em Actions
3. **Atualizar dados**: Sempre que tiver novo CSV, repita o passo 6

Pronto! 🚀 Seu dashboard está no ar!
