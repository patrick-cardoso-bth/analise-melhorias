import fs from 'fs';
import path from 'path';

// Parser CSV manual simples
function parseCSV(text) {
  let currentLine = [];
  let currentCell = '';
  let insideQuotes = false;
  const parsedRows = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"'; 
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentLine.push(currentCell.trim()); 
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; 
      currentLine.push(currentCell.trim()); 
      parsedRows.push(currentLine);
      currentLine = []; 
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.length > 1 || currentLine[0] !== '') parsedRows.push(currentLine);
  }

  if (parsedRows.length === 0) return [];

  const headers = parsedRows[0].map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());
  const data = [];

  for (let j = 1; j < parsedRows.length; j++) {
    const row = parsedRows[j];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index] || "";
      obj[header] = val.replace(/^"|"$/g, '').trim(); 
    });
    data.push(obj);
  }
  return data;
}

// Ler o CSV
const csvPath = path.join(process.cwd(), 'melhorias_abertas_completo.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parsear CSV
const records = parseCSV(csvContent);

// Gerar arquivo JavaScript
const jsContent = `// Este arquivo é gerado automaticamente durante o build
export const CSV_DATA = ${JSON.stringify(records, null, 2)};
`;

// Criar diretório se não existir
const dataDir = path.join(process.cwd(), 'src', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Escrever arquivo
fs.writeFileSync(path.join(dataDir, 'csvData.js'), jsContent);
console.log('✓ Dados CSV convertidos para arquivo JavaScript com sucesso!');
