# Análise Estratégica de Melhorias - Dashboard

Dashboard interativo para análise de melhorias com dados integrados. Publicado automaticamente no GitHub Pages.

## 🚀 Instalação e Setup

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Passos para Deploy no GitHub Pages

1. **Clone ou crie um repositório no GitHub**
   ```bash
   git init
   git remote add origin https://github.com/seu-usuario/seu-repositorio.git
   ```

2. **Configure o repositório para GitHub Pages**
   - Vá para Settings → Pages
   - Selecione "Deploy from a branch"
   - Escolha `gh-pages` como branch
   - Deixe `/root` como pasta

3. **Atualize o `package.json`**
   - Substitua `seu-usuario` e `seu-repositorio` na URL `homepage`
   - Se usar domínio customizado, adicione o CNAME no arquivo `.github/workflows/deploy.yml`

4. **Instale as dependências localmente**
   ```bash
   npm install
   ```

5. **Gere os dados e faça o build**
   ```bash
   npm run generate-data
   npm run build
   ```

6. **Teste localmente antes de fazer push**
   ```bash
   npm run dev
   ```

7. **Faça push para o GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

## 🔄 Processo de Deploy Automático

Quando você faz `push` para a branch `main`:

1. GitHub Actions automaticamente:
   - Instala as dependências
   - Converte o CSV em dados JavaScript
   - Faz o build da aplicação
   - Deploy para GitHub Pages

2. Acesse seu dashboard em:
   - `https://seu-usuario.github.io/seu-repositorio/`

## 📁 Estrutura do Projeto

```
├── index.html                  # Arquivo HTML principal
├── package.json               # Dependências do projeto
├── vite.config.js            # Configuração do Vite
├── tailwind.config.js        # Configuração do Tailwind
├── melhorias_abertas_completo.csv  # Dados CSV
├── src/
│   ├── App.jsx               # Componente React principal
│   ├── main.jsx              # Entry point
│   └── index.css             # Estilos
├── scripts/
│   └── generateData.js       # Script que converte CSV em JS
└── .github/workflows/
    └── deploy.yml            # GitHub Actions workflow
```

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Visualizar build localmente
npm run preview
```

## 📊 Dados

Os dados são lidos do arquivo `melhorias_abertas_completo.csv` durante o build e incorporados diretamente na aplicação. Não há necessidade de upload de arquivo no dashboard.

### Para atualizar os dados:

1. Substitua o arquivo `melhorias_abertas_completo.csv`
2. Faça push para o repositório
3. GitHub Actions automaticamente gerará um novo build e deploy

## ⚙️ Personalizações

### Alterar a URL base (se usar um subdiretório)
Edite `vite.config.js`:
```javascript
base: '/seu-repositorio/',
```

### Usar domínio customizado
1. Faça o CNAME apontar para `seu-usuario.github.io`
2. Descomente a linha `cname` em `.github/workflows/deploy.yml`

### Ajustar stopwords para tema extraction
Edite a array `stopwords` em `src/App.jsx`

## 🎨 Customizações de Estilo

Tailwind CSS está configurado. Edite `tailwind.config.js` para customizar cores e temas.

## 📝 Notas Importantes

- O arquivo `src/data/csvData.js` é gerado automaticamente e não deve ser commitado (está no `.gitignore`)
- Os dados são incorporados no bundle durante o build, tornando a aplicação completamente standalone
- O dashboard funciona offline após o primeiro carregamento

## 🤝 Contribuições

Para contribuir:
1. Clone o repositório
2. Crie uma branch para sua feature
3. Faça as alterações
4. Abra um Pull Request

## 📄 Licença

MIT
