import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Ler o CSV
const csvPath = path.join(process.cwd(), 'melhorias_abertas_completo.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parsear CSV
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});

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
