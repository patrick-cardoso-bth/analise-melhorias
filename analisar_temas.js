import fs from 'fs';
import path from 'path';

// === Lógica sincronizada com index.js ===

const stopwords = new Set([
  "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na",
  "para", "com", "sem", "que", "e", "é", "por", "como", "ao", "aos", "ou", "se", "nao", "não", "mais", "mas",
  "pelo", "pela", "sobre", "novo", "nova", "neste", "desta", "deste", "favor", "pois", "sendo", "assim",
  "apenas", "também", "através", "todos", "todas", "ter", "fazer", "ver", "após", "ser", "já", "ainda",
  "está", "estão", "onde", "quando", "alega",
  "inclusão", "inserir", "erro", "cliente", "solicita", "solicitação", "necessidade", "melhoria",
  "deseja", "opção", "descrição", "passos", "simulação", "motivo", "sugestão",
  "cadastro", "emissão", "relatório", "lançamento", "consulta", "campo", "verificar",
  "informar", "possível", "permite", "gerado", "arquivo", "data", "valor", "número",
  "tela", "forma", "botão", "filtro", "lista", "acesso", "processo", "rotina",
  "usuário", "usuários", "salvar", "gravar", "exibir", "mostrar", "apresentar",
  "retornar", "retorna", "gerar", "gera", "imprimir", "imprime", "alterar", "altera",
  "atualizar", "atualiza", "excluir", "exclui", "incluir", "inclui", "listar"
]);

function limparDescricao(text) {
  return (text || '')
    .replace(/PASSOS PARA SIMULA[ÇC][ÃA]O\s*:?/gi, ' ')
    .replace(/DESCRI[ÇC][ÃA]O DA NECESSIDADE\s*:?/gi, ' ')
    .replace(/Necessidade\s*:\s*[^\n]*/gi, ' ')
    .replace(/Motivo\s*:\s*[^\n]*/gi, ' ')
    .replace(/Observa[çc][õo]es\s*:\s*/gi, ' ')
    .replace(/Descri[çc][ãa]o\s*:\s*/gi, ' ');
}

function normalizarPalavra(w) {
  if (w.endsWith('ões')) return w.slice(0, -3) + 'ão';
  if (w.endsWith('ães')) return w.slice(0, -3) + 'ão';
  if (w.endsWith('ais')) return w.slice(0, -2) + 'l';
  if (w.endsWith('eis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('éis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('óis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('uis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('ntos')) return w.slice(0, -1);
  if (w.endsWith('ntas')) return w.slice(0, -1);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 4) return w.slice(0, -1);
  return w;
}

function extrairTema(summary, description) {
  const descLimpa = limparDescricao(description);
  let text = ((summary || '') + " " + (summary || '') + " " + (summary || '') + " " + descLimpa).toLowerCase();
  text = text.replace(/[^\w\s\u00C0-\u00FF]/g, ' ');
  const words = text.split(/\s+/).filter(w => !stopwords.has(w) && w.length > 3 && isNaN(w));
  if (words.length === 0) return "Outros";
  const counts = {};
  for (const w of words) {
    const raiz = normalizarPalavra(w);
    counts[raiz] = (counts[raiz] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topWord = sorted[0][0];
  return topWord.charAt(0).toUpperCase() + topWord.slice(1);
}

// --- Parser CSV ---
function parseCSV(text) {
  let currentLine = [], currentCell = '', insideQuotes = false;
  const parsedRows = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i], nextChar = text[i + 1];
    if (char === '"' && insideQuotes && nextChar === '"') { currentCell += '"'; i++; }
    else if (char === '"') { insideQuotes = !insideQuotes; }
    else if (char === ',' && !insideQuotes) { currentLine.push(currentCell.trim()); currentCell = ''; }
    else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentCell.trim()); parsedRows.push(currentLine);
      currentLine = []; currentCell = '';
    } else { currentCell += char; }
  }
  if (currentCell || currentLine.length > 0) { currentLine.push(currentCell.trim()); parsedRows.push(currentLine); }
  const headers = parsedRows[0].map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());
  return parsedRows.slice(1).filter(r => r.length > 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

// --- Main ---
const csv = fs.readFileSync(path.join(process.cwd(), 'melhorias_abertas_completo.csv'), 'utf-8');
const records = parseCSV(csv);

// Filtrar apenas Cloud (excluir Desktop)
const cloud = records.filter(d => !(d.sistema && d.sistema.toLowerCase().includes('desktop')));

// Fase 2: usa funcionalidade como tema principal; NLP como fallback
const LIMIAR_MINIMO = 3;
const temasMap = {};
cloud.forEach(d => {
  const v = d.vertical || 'Não informada';
  const s = d.sistema || 'Não informado';
  const t = (d.funcionalidade && d.funcionalidade.trim())
    ? d.funcionalidade.trim()
    : extrairTema(d.summary, d.description);
  const key = `${v}|${s}|${t}`;
  if (!temasMap[key]) temasMap[key] = { vertical: v, sistema: s, tema: t, quantidade: 0 };
  temasMap[key].quantidade += 1;
});

// Fase 3: agrupa temas abaixo do limiar em "Outros"
const outrosMap = {};
const temasConsolidados = {};
Object.values(temasMap).forEach(item => {
  if (item.quantidade < LIMIAR_MINIMO) {
    const key = `${item.vertical}|${item.sistema}|Outros`;
    if (!outrosMap[key]) outrosMap[key] = { vertical: item.vertical, sistema: item.sistema, tema: 'Outros', quantidade: 0 };
    outrosMap[key].quantidade += item.quantidade;
  } else {
    temasConsolidados[`${item.vertical}|${item.sistema}|${item.tema}`] = item;
  }
});

const resultado = [...Object.values(temasConsolidados), ...Object.values(outrosMap)]
  .sort((a, b) => b.quantidade - a.quantidade);

// Exportar CSV
const linhas = ['Vertical,Sistema,Tema,Quantidade'];
resultado.forEach(r => {
  linhas.push(`"${r.vertical}","${r.sistema}","${r.tema}",${r.quantidade}`);
});
fs.writeFileSync('temas_classificados.csv', linhas.join('\n'), 'utf-8');

// Exibir top 30 no console
const totalAntes = Object.keys(temasMap).length;
const totalDepois = resultado.length;
const totalOutros = Object.values(outrosMap).reduce((acc, o) => acc + o.quantidade, 0);

console.log('\n=== TOP 30 TEMAS (novas regras) ===');
console.log('Vertical | Sistema | Tema | Quantidade');
console.log('-------------------------------------------');
resultado.slice(0, 30).forEach(r => {
  console.log(`${r.vertical} | ${r.sistema} | ${r.tema} | ${r.quantidade}`);
});
console.log(`\nTemas distintos (antes do limiar): ${totalAntes}`);
console.log(`Temas distintos (após consolidar Outros): ${totalDepois}`);
console.log(`Chamados agrupados em "Outros" (< ${LIMIAR_MINIMO} chamados): ${totalOutros}`);
console.log('Arquivo completo salvo em: temas_classificados.csv');