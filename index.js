import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AlertTriangle, Server, Cloud, Users, FileText, Activity, Filter, LayoutGrid, UploadCloud, RefreshCw } from 'lucide-react';

// Dicionário NLP - Remoção de jargões para garantir qualidade no agrupamento dos Temas
const stopwords = new Set([
  // Artigos, preposições e conjunções
  "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na",
  "para", "com", "sem", "que", "e", "é", "por", "como", "ao", "aos", "ou", "se", "nao", "não", "mais", "mas",
  "pelo", "pela", "sobre", "novo", "nova", "neste", "desta", "deste", "favor", "pois", "sendo", "assim",
  "apenas", "também", "através", "todos", "todas", "ter", "fazer", "ver", "após", "ser", "já", "ainda",
  "está", "estão", "onde", "quando", "alega",
  // Jargões de template de chamado (removidos antes do NLP)
  "inclusão", "inserir", "erro", "cliente", "solicita", "solicitação", "necessidade", "melhoria",
  "deseja", "opção", "descrição", "passos", "simulação", "motivo", "sugestão",
  // Vocabulário genérico do domínio ERP municipal (sem valor discriminativo)
  "cadastro", "emissão", "relatório", "lançamento", "consulta", "campo", "verificar",
  "informar", "possível", "permite", "gerado", "arquivo", "data", "valor", "número",
  "tela", "forma", "botão", "filtro", "lista", "acesso", "processo", "rotina",
  "usuário", "usuários", "salvar", "gravar", "exibir", "mostrar", "apresentar",
  "retornar", "retorna", "gerar", "gera", "imprimir", "imprime", "alterar", "altera",
  "atualizar", "atualiza", "excluir", "exclui", "incluir", "inclui", "listar"
]);

// Remove blocos de template fixo das descrições de chamados
function limparDescricao(text) {
  return (text || '')
    .replace(/PASSOS PARA SIMULA[ÇC][ÃA]O\s*:?/gi, ' ')
    .replace(/DESCRI[ÇC][ÃA]O DA NECESSIDADE\s*:?/gi, ' ')
    .replace(/Necessidade\s*:\s*[^\n]*/gi, ' ')
    .replace(/Motivo\s*:\s*[^\n]*/gi, ' ')
    .replace(/Observa[çc][õo]es\s*:\s*/gi, ' ')
    .replace(/Descri[çc][ãa]o\s*:\s*/gi, ' ');
}

// Normalização simples de plurais PT-BR para agrupar variantes da mesma raiz
function normalizarPalavra(w) {
  if (w.endsWith('ões')) return w.slice(0, -3) + 'ão';
  if (w.endsWith('ães')) return w.slice(0, -3) + 'ão';
  if (w.endsWith('ais')) return w.slice(0, -2) + 'l';
  if (w.endsWith('eis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('éis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('óis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('uis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('ntos')) return w.slice(0, -1); // faturamentos → faturamento
  if (w.endsWith('ntas')) return w.slice(0, -1);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 4) return w.slice(0, -1);
  return w;
}

// Algoritmo de extração do Tema — usado apenas como fallback quando funcionalidade está vazia
function extrairTema(summary, description) {
  // Peso triplo ao título (mais discriminativo), descrição limpa de templates
  const descLimpa = limparDescricao(description);
  let text = ((summary || '') + " " + (summary || '') + " " + (summary || '') + " " + descLimpa).toLowerCase();
  text = text.replace(/[^\w\s\u00C0-\u00FF]/g, ' ');

  const words = text.split(/\s+/).filter(w => !stopwords.has(w) && w.length > 3 && isNaN(w));
  if (words.length === 0) return "Outros";

  // Conta frequência com normalização de plural
  const counts = {};
  for (const w of words) {
    const raiz = normalizarPalavra(w);
    counts[raiz] = (counts[raiz] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  // Extrai apenas a palavra mais relevante para reduzir fragmentação
  const topWord = sorted[0][0];
  return topWord.charAt(0).toUpperCase() + topWord.slice(1);
}

// Analisador CSV Robusto
const parseCSV = (text) => {
  let currentLine = [];
  let currentCell = '';
  let insideQuotes = false;
  const parsedRows = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"'; i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentLine.push(currentCell.trim()); currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; 
      currentLine.push(currentCell.trim()); parsedRows.push(currentLine);
      currentLine = []; currentCell = '';
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
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#6366f1', '#14b8a6'];

export default function App() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [encoding, setEncoding] = useState('utf-8');

  // Filtros do Dashboard
  const [filtroVertical, setFiltroVertical] = useState('Todas');
  const [filtroSistema, setFiltroSistema] = useState('Todos');

  // Lógica dos Filtros movida para ANTES do return condicional para respeitar as Rules of Hooks do React
  const verticaisUnicas = useMemo(() => {
    if (!data || !data.baseTemasCloud) return ['Todas'];
    return ['Todas', ...new Set(data.baseTemasCloud.map(item => item.vertical))].sort();
  }, [data]);
  
  const sistemasDisponiveis = useMemo(() => {
    if (!data || !data.baseTemasCloud) return ['Todos'];
    let filtrados = data.baseTemasCloud;
    if (filtroVertical !== 'Todas') {
      filtrados = filtrados.filter(item => item.vertical === filtroVertical);
    }
    return ['Todos', ...new Set(filtrados.map(item => item.sistema))].sort();
  }, [filtroVertical, data]);

  useEffect(() => {
    if (filtroSistema !== 'Todos' && !sistemasDisponiveis.includes(filtroSistema)) {
      setFiltroSistema('Todos');
    }
  }, [filtroVertical, sistemasDisponiveis, filtroSistema]);

  const dadosGraficoTemas = useMemo(() => {
    if (!data || !data.baseTemasCloud) return [];
    let filtrados = data.baseTemasCloud;

    if (filtroVertical !== 'Todas') filtrados = filtrados.filter(item => item.vertical === filtroVertical);
    if (filtroSistema !== 'Todos') filtrados = filtrados.filter(item => item.sistema === filtroSistema);

    const agrupado = filtrados.reduce((acc, curr) => {
      if (!acc[curr.tema]) acc[curr.tema] = { tema: curr.tema, quantidade: 0 };
      acc[curr.tema].quantidade += curr.quantidade;
      return acc;
    }, {});

    return Object.values(agrupado)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filtroVertical, filtroSistema, data]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const text = evt.target.result;
          const parsedData = parseCSV(text);
          processData(parsedData);
        } catch (err) {
          setError('Erro ao processar o ficheiro. Verifique se é um ficheiro CSV válido.');
        }
        setIsLoading(false);
      }, 100);
    };
    reader.readAsText(file, encoding);
  };

  const processData = (parsedData) => {
    // 1. Isolar Sistemas Desktop
    const desktop = parsedData.filter(d => d.sistema && d.sistema.toLowerCase().includes('desktop'));
    const cloud = parsedData.filter(d => !(d.sistema && d.sistema.toLowerCase().includes('desktop')));

    // 2. Ranking de Entidades (Cloud)
    const entidadesMap = {};
    cloud.forEach(d => {
      const e = d.entidade || 'Não informada';
      entidadesMap[e] = (entidadesMap[e] || 0) + 1;
    });
    const topEntidades = Object.entries(entidadesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, pedidos]) => ({ name, pedidos }));

    // 3. Distribuição por Verticais
    const verticaisMap = {};
    cloud.forEach(d => {
      const v = d.vertical || 'Não informada';
      verticaisMap[v] = (verticaisMap[v] || 0) + 1;
    });
    let distribuicaoVertical = Object.entries(verticaisMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    if (distribuicaoVertical.length > 7) {
      const top = distribuicaoVertical.slice(0, 6);
      const restValue = distribuicaoVertical.slice(6).reduce((acc, curr) => acc + curr.value, 0);
      distribuicaoVertical = [...top, { name: 'Outras', value: restValue }];
    }

    // 4. Agrupamento de Temas (Cloud) — prioriza funcionalidade, NLP como fallback
    const temasMap = {};
    cloud.forEach(d => {
      const v = d.vertical || 'Não informada';
      const s = d.sistema || 'Não informado';
      // Fase 2: usa funcionalidade (campo curado por humano) como tema principal
      // Fase 3 (fallback): extrai tema via NLP apenas se funcionalidade ausente
      const t = (d.funcionalidade && d.funcionalidade.trim())
        ? d.funcionalidade.trim()
        : extrairTema(d.summary, d.description);

      const key = `${v}|${s}|${t}`;
      if (!temasMap[key]) {
        temasMap[key] = { vertical: v, sistema: s, tema: t, quantidade: 0 };
      }
      temasMap[key].quantidade += 1;
    });

    // Fase 3: agrupa temas com menos de 3 chamados em "Outros - {sistema}"
    const LIMIAR_MINIMO = 3;
    const outrosMap = {};
    const temasConsolidados = {};
    Object.values(temasMap).forEach(item => {
      if (item.quantidade < LIMIAR_MINIMO) {
        const outrosKey = `${item.vertical}|${item.sistema}|Outros`;
        if (!outrosMap[outrosKey]) {
          outrosMap[outrosKey] = { vertical: item.vertical, sistema: item.sistema, tema: 'Outros', quantidade: 0 };
        }
        outrosMap[outrosKey].quantidade += item.quantidade;
      } else {
        temasConsolidados[`${item.vertical}|${item.sistema}|${item.tema}`] = item;
      }
    });
    const baseTemasCloud = [...Object.values(temasConsolidados), ...Object.values(outrosMap)]
      .sort((a, b) => b.quantidade - a.quantidade);

    // 5. Atualizar Estado
    setData({
      totalPedidos: parsedData.length,
      totalDesktop: desktop.length,
      totalCloud: cloud.length,
      entidadesDistintas: Object.keys(entidadesMap).length,
      topEntidades,
      distribuicaoVertical,
      baseTemasCloud
    });
    
    // Reseta filtros
    setFiltroVertical('Todas');
    setFiltroSistema('Todos');
  };

  // Ecrã de Upload (Estado Inicial)
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
        <div className="bg-white p-10 rounded-xl shadow-lg max-w-lg w-full text-center border border-slate-200">
          <UploadCloud className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Análise Estratégica Completa</h2>
          <p className="text-slate-500 mb-6 leading-relaxed text-sm">
            Para garantir que o Dashboard processa <strong>todos os milhares de registos</strong>, faça upload do seu ficheiro principal <code>melhorias_abertas_completo.csv</code>. Iremos aplicar filtros semânticos em tempo real no seu ecrã.
          </p>

          <div className="mb-6 flex flex-col items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Codificação do Ficheiro (Opcional)</label>
            <select 
              value={encoding} 
              onChange={e => setEncoding(e.target.value)} 
              className="text-sm bg-slate-50 border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="utf-8">UTF-8 (Padrão Cloud)</option>
              <option value="windows-1252">Windows-1252 (Exportação Excel)</option>
            </select>
          </div>

          <label className={`cursor-pointer ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 w-full shadow-sm`}>
            {isLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {isLoading ? 'A processar milhares de registos...' : 'Selecionar Ficheiro CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isLoading} />
          </label>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm font-medium">{error}</div>}
        </div>
      </div>
    );
  }

  // Ecrã Principal do Dashboard
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      <header className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-600" />
            Visão Estratégica de Melhorias
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Dashboard processado a partir do seu ficheiro original, contendo todos os dados.
          </p>
        </div>
        <button 
          onClick={() => setData(null)}
          className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md shadow-sm transition-colors"
        >
          <UploadCloud className="h-4 w-4" /> Carregar Novo Ficheiro
        </button>
      </header>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><FileText className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Pedidos Abertos</p>
            <h3 className="text-2xl font-bold text-slate-800">{data.totalPedidos.toLocaleString('pt-PT')}</h3>
            <p className="text-xs text-slate-400 mt-1">Registos analisados</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><Cloud className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Sistemas Cloud (Ativos)</p>
            <h3 className="text-2xl font-bold text-slate-800">{data.totalCloud.toLocaleString('pt-PT')}</h3>
            <p className="text-xs text-emerald-500 mt-1 font-medium">{Math.round((data.totalCloud/data.totalPedidos)*100)}% do Backlog</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Entidades Distintas</p>
            <h3 className="text-2xl font-bold text-slate-800">{data.entidadesDistintas.toLocaleString('pt-PT')}</h3>
            <p className="text-xs text-slate-400 mt-1">Clientes/Parceiros afetados</p>
          </div>
        </div>

        <div className="bg-rose-50 rounded-xl shadow-sm border border-rose-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-100 rounded-lg text-rose-600"><Server className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-rose-700">Sistemas Desktop</p>
            <h3 className="text-2xl font-bold text-rose-800">{data.totalDesktop.toLocaleString('pt-PT')}</h3>
            <p className="text-xs text-rose-500 mt-1 font-medium">Descontinuados - Isolados</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-amber-800 font-bold">Monitorização de Passivo Tecnológico</h4>
          <p className="text-amber-700 text-sm mt-1">
            Existem {data.totalDesktop.toLocaleString('pt-PT')} pedidos vinculados a sistemas "Desktop". Todos os gráficos de análise de Produto abaixo excluem estes registos para garantir foco nas linhas de produto estratégicas (Cloud).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Top 5 Maiores Solicitantes (Cloud)</h3>
          <p className="text-sm text-slate-500 mb-4">Entidades com maior volume de tickets pendentes.</p>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topEntidades} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fill: '#475569'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="pedidos" name="Total Pedidos" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Distribuição de Pedidos por Vertical</h3>
          <p className="text-sm text-slate-500 mb-4">Volume concentrado por grande área de negócio.</p>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.distribuicaoVertical} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={4} dataKey="value">
                  {data.distribuicaoVertical.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-indigo-600" /> Temas Mais Solicitados (Extração Inteligente)
            </h3>
            <p className="text-sm text-slate-500 mt-1">Filtre por Vertical e Sistema para identificar padrões reais baseados nos textos de {data.totalCloud.toLocaleString('pt-PT')} chamados.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-inner">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Vertical</label>
              <select value={filtroVertical} onChange={(e) => setFiltroVertical(e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 w-40">
                {verticaisUnicas.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Sistema</label>
              <select value={filtroSistema} onChange={(e) => setFiltroSistema(e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 w-48" disabled={filtroVertical === 'Todas' && sistemasDisponiveis.length === 1}>
                {sistemasDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-80">
          {dadosGraficoTemas.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGraficoTemas} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tema" tick={{fontSize: 12, fill: '#475569'}} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{fill: '#475569'}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="quantidade" name="Chamados Agrupados" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum dado encontrado para este filtro.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}