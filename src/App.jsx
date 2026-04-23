import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AlertTriangle, Server, Cloud, Users, FileText, Activity, Filter, LayoutGrid, LogOut } from 'lucide-react';
import { CSV_DATA } from './data/csvData.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Dicionário NLP - Remoção de jargões para garantir qualidade no agrupamento dos Temas
const stopwords = new Set([
  // Artigos, preposições e conjunções
  "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na",
  "para", "com", "sem", "que", "e", "é", "por", "como", "ao", "aos", "ou", "se", "nao", "não", "mais", "mas",
  "pelo", "pela", "sobre", "novo", "nova", "neste", "desta", "deste", "favor", "pois", "sendo", "assim",
  "apenas", "também", "através", "todos", "todas", "ter", "fazer", "ver", "após", "ser", "já", "ainda",
  "está", "estão", "onde", "quando", "alega",
  // Jargões de template de chamado
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

// Normalização simples de plurais PT-BR
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

// Algoritmo de extração do Tema — usado apenas como fallback quando funcionalidade está vazia
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#6366f1', '#14b8a6'];

const VERTICAIS_EXCLUIDAS = new Set(['sistemas internos', 'não informada', 'plataforma']);

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState(null);
  const [temaSelecionado, setTemaSelecionado] = useState(null);
  
  // Filtros do Dashboard
  const [filtroVertical, setFiltroVertical] = useState('Todas');
  const [filtroSistema, setFiltroSistema] = useState('Todos');

  // Auth: verificar sessão salva ao montar
  useEffect(() => {
    const saved = localStorage.getItem('betha_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email?.endsWith('@betha.com.br')) {
          setUser(parsed);
        } else {
          localStorage.removeItem('betha_user');
        }
      } catch {
        localStorage.removeItem('betha_user');
      }
    }
    setAuthLoading(false);
  }, []);

  // Auth: inicializar Google Identity Services
  useEffect(() => {
    if (user || authLoading) return;
    const init = () => {
      if (!window.google || !GOOGLE_CLIENT_ID) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          const payload = parseJwt(response.credential);
          if (!payload) { setAuthError('Falha ao processar credencial.'); return; }
          if (!payload.email?.endsWith('@betha.com.br')) {
            setAuthError('Acesso restrito a contas @betha.com.br.');
            window.google.accounts.id.disableAutoSelect();
            return;
          }
          const userData = { email: payload.email, name: payload.name, picture: payload.picture };
          localStorage.setItem('betha_user', JSON.stringify(userData));
          setAuthError('');
          setUser(userData);
        },
      });
      const btn = document.getElementById('google-signin-btn');
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR',
        });
      }
    };
    if (window.google) { init(); } else { window.addEventListener('load', init); }
    return () => window.removeEventListener('load', init);
  }, [user, authLoading]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    processData(CSV_DATA);
  }, []);

  function handleLogout() {
    localStorage.removeItem('betha_user');
    setUser(null);
    if (window.google) window.google.accounts.id.disableAutoSelect();
  }

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

  const chamadosDoTema = useMemo(() => {
    if (!temaSelecionado || !data?.rawCloud) return [];
    let filtrados = data.rawCloud.filter(d => {
      const t = (d.funcionalidade && d.funcionalidade.trim())
        ? d.funcionalidade.trim()
        : extrairTema(d.summary, d.description);
      return t === temaSelecionado;
    });
    if (filtroVertical !== 'Todas') filtrados = filtrados.filter(d => d.vertical === filtroVertical);
    if (filtroSistema !== 'Todos') filtrados = filtrados.filter(d => d.sistema === filtroSistema);
    return filtrados;
  }, [temaSelecionado, filtroVertical, filtroSistema, data]);

  const processData = (parsedData) => {
    // 1. Isolar Sistemas Desktop
    const desktop = parsedData.filter(d => d.sistema && d.sistema.toLowerCase().includes('desktop'));
    let cloud = parsedData.filter(d => !(d.sistema && d.sistema.toLowerCase().includes('desktop')));

    // 2. Excluir verticais indesejadas
    cloud = cloud.filter(d => !VERTICAIS_EXCLUIDAS.has((d.vertical || '').toLowerCase().trim()));

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
    const LIMIAR_MINIMO = 3;
    const temasMap = {};
    cloud.forEach(d => {
      const v = d.vertical || 'Não informada';
      const s = d.sistema || 'Não informado';
      const t = (d.funcionalidade && d.funcionalidade.trim())
        ? d.funcionalidade.trim()
        : extrairTema(d.summary, d.description);
      const key = `${v}|${s}|${t}`;
      if (!temasMap[key]) {
        temasMap[key] = { vertical: v, sistema: s, tema: t, quantidade: 0 };
      }
      temasMap[key].quantidade += 1;
    });

    // Agrupa temas com menos de 3 chamados em "Outros"
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
      baseTemasCloud,
      rawCloud: cloud,
    });
    
    // Reseta filtros
    setFiltroVertical('Todas');
    setFiltroSistema('Todos');
  };

  // Tela de carregamento / login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-sm w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Activity className="h-10 w-10 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Análise de Melhorias</h1>
          <p className="text-slate-500 text-sm mb-8">Acesso restrito a colaboradores Betha Sistemas.<br/>Faça login com sua conta <span className="font-semibold text-indigo-600">@betha.com.br</span>.</p>
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{authError}</div>
          )}
          {!GOOGLE_CLIENT_ID ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              Variável <code>VITE_GOOGLE_CLIENT_ID</code> não configurada.
            </div>
          ) : (
            <div id="google-signin-btn" className="flex justify-center" />
          )}
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
            Dashboard com análise automática de todos os dados integrados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />}
          <span className="text-sm text-slate-600 hidden md:block">{user.name}</span>
          <button onClick={handleLogout} title="Sair" className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-colors">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><FileText className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Pedidos Abertos</p>
            <h3 className="text-2xl font-bold text-slate-800">{data?.totalPedidos?.toLocaleString('pt-PT') || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Registos analisados</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><Cloud className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Sistemas Cloud (Ativos)</p>
            <h3 className="text-2xl font-bold text-slate-800">{data?.totalCloud?.toLocaleString('pt-PT') || 0}</h3>
            <p className="text-xs text-emerald-500 mt-1 font-medium">{data ? Math.round((data.totalCloud/data.totalPedidos)*100) : 0}% do Backlog</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Entidades Distintas</p>
            <h3 className="text-2xl font-bold text-slate-800">{data?.entidadesDistintas?.toLocaleString('pt-PT') || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Clientes/Parceiros afetados</p>
          </div>
        </div>

        <div className="bg-rose-50 rounded-xl shadow-sm border border-rose-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-100 rounded-lg text-rose-600"><Server className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-rose-700">Sistemas Desktop</p>
            <h3 className="text-2xl font-bold text-rose-800">{data?.totalDesktop?.toLocaleString('pt-PT') || 0}</h3>
            <p className="text-xs text-rose-500 mt-1 font-medium">Descontinuados - Isolados</p>
          </div>
        </div>
      </div>

      {data && data.totalDesktop > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-amber-800 font-bold">Monitorização de Passivo Tecnológico</h4>
            <p className="text-amber-700 text-sm mt-1">
              Existem {data.totalDesktop.toLocaleString('pt-PT')} pedidos vinculados a sistemas "Desktop". Todos os gráficos de análise de Produto abaixo excluem estes registos para garantir foco nas linhas de produto estratégicas (Cloud).
            </p>
          </div>
        </div>
      )}

      {data && (
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
      )}

      {data && (
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
                <BarChart data={dadosGraficoTemas} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const tema = e.activePayload[0].payload.tema;
                      setTemaSelecionado(prev => prev === tema ? null : tema);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tema" tick={{fontSize: 12, fill: '#475569'}} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{fill: '#475569'}} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="quantidade" name="Chamados Agrupados" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}>
                    {dadosGraficoTemas.map((entry) => (
                      <Cell key={entry.tema} fill={entry.tema === temaSelecionado ? '#6d28d9' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum dado encontrado para este filtro.</p>
              </div>
            )}
          </div>

          {temaSelecionado && chamadosDoTema.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-bold text-slate-800">
                  Chamados do tema: <span className="text-indigo-600">{temaSelecionado}</span>
                  <span className="ml-2 text-sm font-normal text-slate-500">({chamadosDoTema.length} chamados)</span>
                </h4>
                <button onClick={() => setTemaSelecionado(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 hover:border-slate-300">
                  ✕ Fechar
                </button>
              </div>
              <div className="overflow-auto max-h-80 rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-semibold border-b border-slate-200">Chave</th>
                      <th className="px-4 py-2 font-semibold border-b border-slate-200">Resumo</th>
                      <th className="px-4 py-2 font-semibold border-b border-slate-200">Vertical</th>
                      <th className="px-4 py-2 font-semibold border-b border-slate-200">Sistema</th>
                      <th className="px-4 py-2 font-semibold border-b border-slate-200">Entidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chamadosDoTema.map((chamado, idx) => (
                      <tr key={chamado.key || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                          <a href={`https://atendimento.betha.com.br/browse/${chamado.key}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">{chamado.key}</a>
                        </td>
                        <td className="px-4 py-2 text-slate-700 max-w-xs truncate" title={chamado.summary}>{chamado.summary}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{chamado.vertical}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{chamado.sistema}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{chamado.entidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
