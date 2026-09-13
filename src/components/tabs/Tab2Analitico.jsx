// src/components/tabs/Tab2Analitico.jsx — Painel Analítico de Danos por Família de Componentes
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import useStore from '../../store/useStore';
import MultiSelect from '../ui/MultiSelect';
import ModalDetalhesDia from '../modals/ModalDetalhesDia';
import { limparNomeBase, limparNomeReal, normalizarSonda, normalizarDataObj, CHART_COLORS } from '../../lib/dataUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="bg-slate-800/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs max-w-xs backdrop-blur z-50">
      <p className="font-bold text-white mb-2 pb-1 border-b border-white/10">{label}</p>
      {payload.map((p, i) => {
        const val = Number(p.value) || 0;
        const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
        return (
          <div key={i} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill || '#3b82f6' }} />
              <span className="text-slate-300 truncate">{p.name}</span>
            </div>
            <div className="shrink-0 font-semibold text-white">
              {val} {payload.length > 1 && total > 0 && <span className="text-slate-500 font-normal">({pct}%)</span>}
            </div>
          </div>
        );
      })}
      {payload.length > 1 && (
        <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-white/10 font-bold text-white">
          <span>Total Danos:</span>
          <span>{total}</span>
        </div>
      )}
    </div>
  );
};

export default function Tab2Analitico() {
  const { bancoGeral = [], ordemMeses = [], sondasUnicas = [], mecanicosUnicos = [], compBaseUnicos = [], compReaisUnicos = [] } = useStore();

  const [selMeses,  setSelMeses]  = useState(['TODOS']);
  const [selSondas, setSelSondas] = useState(['TODOS']);
  const [selPecas,  setSelPecas]  = useState(['GERAL']);
  const [selMec,    setSelMec]    = useState('TODOS');
  const [modalDia,  setModalDia]  = useState({ aberto: false, dataIso: '', registros: [] });

  const isSingleMonth = selMeses.length === 1 && selMeses[0] !== 'TODOS';

  const DIAS_SEMANA_NOMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Opções de peças e famílias
  const pecasOptions = useMemo(() => {
    const list = [];
    (compBaseUnicos || []).forEach(b => list.push({ value: `[FAMILIA_SGM] ${b}`, label: `[FAMÍLIA] ${b}` }));
    (compReaisUnicos || []).forEach(r => list.push({ value: r, label: r }));
    return list;
  }, [compBaseUnicos, compReaisUnicos]);

  // Dataset filtrado
  const dadosFiltrados = useMemo(() => {
    return bancoGeral.filter(r => {
      // Filtro Mês
      if (!selMeses.includes('TODOS') && !selMeses.includes(r['Aba_Origem'])) return false;

      // Filtro Sonda
      const sonda = normalizarSonda(r['Causa'] || '');
      if (!selSondas.includes('TODOS') && !selSondas.includes(sonda)) return false;

      // Filtro Mecânico
      const mec = String(r['Mecânico'] || r['MECANICO'] || '').toUpperCase().trim();
      if (selMec !== 'TODOS' && mec !== selMec && !mec.includes(selMec)) return false;

      // Filtro Peças / Famílias
      if (selPecas.includes('GERAL') || selPecas.length === 0) return true;
      const cb = limparNomeBase(r['Componentes']);
      const cr = limparNomeReal(r['Componentes']);
      return selPecas.includes(`[FAMILIA_SGM] ${cb}`) || selPecas.includes(cr);
    });
  }, [bancoGeral, selMeses, selSondas, selMec, selPecas]);

  // Ranking das Famílias Mais Danificadas no contexto filtrado
  const rankingFamilias = useMemo(() => {
    const contagem = {};
    for (let i = 0; i < dadosFiltrados.length; i++) {
      const fam = limparNomeBase(dadosFiltrados[i]['Componentes']);
      if (fam && fam !== 'NÃO INFORMADO') {
        contagem[fam] = (contagem[fam] || 0) + 1;
      }
    }
    const total = Object.values(contagem).reduce((a, b) => a + b, 0);
    return Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .map(([familia, count]) => ({
        familia,
        count,
        pct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
      }));
  }, [dadosFiltrados]);

  // Principais famílias para traçar no gráfico de evolução (Top 6 mais danificadas)
  const topFamiliasEvolucao = useMemo(() => {
    return rankingFamilias.slice(0, 6).map(f => f.familia);
  }, [rankingFamilias]);

  // Dados do gráfico de evolução:
  // Se 1 mês: dia a dia (eixo X = datas) traçando cada família mais danificada
  // Se múltiplos meses: mês a mês traçando cada família mais danificada
  const chartEvolucao = useMemo(() => {
    if (topFamiliasEvolucao.length === 0 || dadosFiltrados.length === 0) {
      return { data: [], series: [], isDiario: isSingleMonth };
    }

    if (isSingleMonth) {
      // Modo Diário no mês selecionado
      const countsPorDia = {};
      dadosFiltrados.forEach(r => {
        const d = r['Data_Limpa'];
        if (d && d !== 'S/D') {
          if (!countsPorDia[d]) countsPorDia[d] = {};
          const fam = limparNomeBase(r['Componentes']);
          countsPorDia[d][fam] = (countsPorDia[d][fam] || 0) + 1;
        }
      });

      const datasOrdenadas = Object.keys(countsPorDia).sort((a, b) => a.localeCompare(b));

      const data = datasOrdenadas.map(d => {
        const dt = normalizarDataObj(d);
        const row = { eixos: dt ? dt.labelBr : d, dataIso: d };
        topFamiliasEvolucao.forEach(fam => {
          row[fam] = countsPorDia[d]?.[fam] || 0;
        });
        return row;
      });

      return {
        data,
        series: topFamiliasEvolucao,
        isDiario: true,
        mesNome: selMeses[0]
      };
    }

    // Modo Mensal Consolidado
    const countsPorMes = {};
    dadosFiltrados.forEach(r => {
      const m = r['Aba_Origem'];
      if (m) {
        if (!countsPorMes[m]) countsPorMes[m] = {};
        const fam = limparNomeBase(r['Componentes']);
        countsPorMes[m][fam] = (countsPorMes[m][fam] || 0) + 1;
      }
    });

    const mesesExibidos = selMeses.includes('TODOS') || selMeses.length === 0
      ? (ordemMeses || [])
      : (ordemMeses || []).filter(m => selMeses.includes(m));

    const data = mesesExibidos.map(m => {
      const row = { eixos: m };
      topFamiliasEvolucao.forEach(fam => {
        row[fam] = countsPorMes[m]?.[fam] || 0;
      });
      return row;
    });

    return {
      data,
      series: topFamiliasEvolucao,
      isDiario: false
    };
  }, [topFamiliasEvolucao, dadosFiltrados, isSingleMonth, selMeses, ordemMeses]);

  // Top falhas no contexto filtrado
  const topFalhas = useMemo(() => {
    const fc = {};
    dadosFiltrados.forEach(r => {
      const f = String(r['falhas'] || r['FALHAS'] || 'N/A').toUpperCase().trim();
      fc[f] = (fc[f] || 0) + 1;
    });
    return Object.entries(fc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([falha, count]) => ({
        falha: falha.length > 30 ? falha.slice(0, 29) + '…' : falha,
        count
      }));
  }, [dadosFiltrados]);

  // Agrupamento detalhado por data quando 1 único mês estiver filtrado
  const resumoDiario = useMemo(() => {
    if (!isSingleMonth) return [];

    const mapaPorDia = {};
    dadosFiltrados.forEach(r => {
      const d = r['Data_Limpa'];
      if (d && d !== 'S/D') {
        if (!mapaPorDia[d]) {
          mapaPorDia[d] = {
            dataIso: d,
            registros: [],
            familias: {}
          };
        }
        mapaPorDia[d].registros.push(r);
        const fam = limparNomeBase(r['Componentes']);
        if (fam) {
          mapaPorDia[d].familias[fam] = (mapaPorDia[d].familias[fam] || 0) + 1;
        }
      }
    });

    const ordenadas = Object.keys(mapaPorDia).sort((a, b) => a.localeCompare(b));
    return ordenadas.map(d => {
      const dt = normalizarDataObj(d);
      const item = mapaPorDia[d];
      const topFam = Object.entries(item.familias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([f, c]) => `${f} (${c})`)
        .join(', ');

      return {
        dataIso: d,
        dataLabel: dt ? `${String(dt.dia).padStart(2, '0')}/${String(dt.mes).padStart(2, '0')}/${dt.ano}` : d,
        diaSemana: dt ? DIAS_SEMANA_NOMES[dt.diaSemanaIdx] : '',
        total: item.registros.length,
        registros: item.registros,
        topFamiliasStr: topFam || '-'
      };
    });
  }, [isSingleMonth, dadosFiltrados]);

  function handleAbrirDia(dataIso, registros = null) {
    const reg = registros || dadosFiltrados.filter(r => r['Data_Limpa'] === dataIso);
    setModalDia({ aberto: true, dataIso, registros: reg });
  }

  // Família mais afetada no momento
  const maisDanificada = rankingFamilias[0] || null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 1. Barra de Filtros */}
      <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span>🎛️</span> Filtros de Análise de Falhas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Período / Meses</label>
            <MultiSelect
              id="filtroMesAnalitico"
              options={ordemMeses}
              selected={selMeses}
              onChange={setSelMeses}
              defaultValue="TODOS"
              defaultLabel="Consolidado (Todos)"
              placeholder="Selecione meses..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Sondas</label>
            <MultiSelect
              id="filtroSondaAnalitico"
              options={sondasUnicas}
              selected={selSondas}
              onChange={setSelSondas}
              defaultValue="TODOS"
              defaultLabel="Todas as Sondas"
              placeholder="Selecione sondas..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Famílias / Peças</label>
            <MultiSelect
              id="filtroPecasAnalitico"
              options={pecasOptions}
              selected={selPecas}
              onChange={setSelPecas}
              defaultValue="GERAL"
              defaultLabel="Visão Geral (Todas as Famílias)"
              placeholder="Selecione peças..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Mecânico</label>
            <select
              value={selMec}
              onChange={e => setSelMec(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="TODOS">Todos os Mecânicos</option>
              {mecanicosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Exibindo <strong className="text-white">{dadosFiltrados.length}</strong> O.S. no escopo selecionado
          </span>
          {maisDanificada && (
            <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 font-medium">
              Peça com mais danos: <strong>{maisDanificada.familia}</strong> ({maisDanificada.count} ocorrências • {maisDanificada.pct}%)
            </span>
          )}
        </div>
      </div>

      {/* 2. Gráfico Principal: Evolução das Famílias que Mais Danificam */}
      <div className="chart-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>📈</span>
              {chartEvolucao.isDiario ? (
                <>Evolução Diária das Famílias Mais Danificadas — <span className="text-blue-400">{chartEvolucao.mesNome}</span></>
              ) : (
                <>Evolução por Família de Componente ao Longo dos Meses</>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {chartEvolucao.isDiario
                ? 'Acompanhe as linhas por família ao longo de cada dia do mês para identificar peças subindo fora da curva'
                : 'Traçado comparativo das famílias com maior volume de quebras em cada mês'}
            </p>
          </div>

          <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-white/10 self-start sm:self-auto shrink-0">
            {chartEvolucao.series.length} famílias monitoradas
          </span>
        </div>

        {chartEvolucao.data && chartEvolucao.data.length > 0 ? (
          <div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartEvolucao.data}
                onClick={e => {
                  if (chartEvolucao.isDiario && e && e.activePayload && e.activePayload.length > 0) {
                    const rawData = e.activePayload[0].payload;
                    if (rawData && rawData.dataIso) {
                      handleAbrirDia(rawData.dataIso);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="eixos" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }} />
                {chartEvolucao.series.map((fam, i) => (
                  <Line
                    key={fam}
                    type="linear"
                    dataKey={fam}
                    name={fam}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: chartEvolucao.isDiario ? 3.5 : 4 }}
                    activeDot={{ r: 6, cursor: chartEvolucao.isDiario ? 'pointer' : 'default' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Tabela de Relação Diária quando 1 único mês for selecionado */}
            {chartEvolucao.isDiario && resumoDiario.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📅</span> Ocorrências por Data no Mês — <span className="text-blue-400">{chartEvolucao.mesNome}</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    💡 Clique em qualquer linha para abrir a relação detalhada das O.S. daquele dia
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 max-h-64 overflow-y-auto">
                  <table className="sgm-table w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900 z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Data</th>
                        <th className="py-2.5 px-3 text-left">Dia da Semana</th>
                        <th className="py-2.5 px-3 text-center">Total de O.S.</th>
                        <th className="py-2.5 px-3 text-left">Famílias Mais Afetadas</th>
                        <th className="py-2.5 px-3 text-center w-28">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumoDiario.map(item => (
                        <tr
                          key={item.dataIso}
                          onClick={() => handleAbrirDia(item.dataIso, item.registros)}
                          className="hover:bg-slate-800/90 cursor-pointer border-b border-white/5 transition-colors group"
                        >
                          <td className="py-2 px-3 font-semibold text-white whitespace-nowrap group-hover:text-blue-400">
                            {item.dataLabel}
                          </td>
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                            {item.diaSemana}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {item.total} O.S.
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 truncate max-w-[280px]" title={item.topFamiliasStr}>
                            {item.topFamiliasStr}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleAbrirDia(item.dataIso, item.registros); }}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 group-hover:bg-blue-600 text-blue-400 group-hover:text-white text-[11px] font-medium transition-all"
                            >
                              Ver O.S. →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm text-center">
            <div>
              <p className="text-3xl mb-2">📭</p>
              <p>Nenhuma ocorrência encontrada para os filtros aplicados</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Grid: Ranking de Famílias Mais Danificadas vs Top Falhas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Famílias Mais Danificadas */}
        <div className="chart-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>🔩</span> Famílias que Mais Danificam (Ranking)
            </h3>
            <span className="text-xs text-slate-400">Por volume de O.S.</span>
          </div>

          {rankingFamilias.length > 0 ? (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rankingFamilias.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis dataKey="familia" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Danos / Quebras" radius={[0, 4, 4, 0]}>
                    {rankingFamilias.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Lista detalhada compacta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                {rankingFamilias.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-lg text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[140px]">
                      {idx + 1}. {item.familia}
                    </span>
                    <span className="font-bold text-white">
                      {item.count} <span className="text-slate-500 font-normal">({item.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm text-center">
              <div>
                <p className="text-3xl mb-2">📭</p>
                <p>Nenhum registro para exibir</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Tipos de Falhas Recorrentes */}
        <div className="chart-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>🔴</span> Tipos de Falhas Associadas
            </h3>
            <span className="text-xs text-slate-400">Contexto filtrado</span>
          </div>

          {topFalhas.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={topFalhas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="falha" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm text-center">
              <div>
                <p className="text-3xl mb-2">📭</p>
                <p>Nenhum dado de falha para os filtros</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal de Detalhes da Data Selecionada */}
      <ModalDetalhesDia
        open={modalDia.aberto}
        onClose={() => setModalDia({ aberto: false, dataIso: '', registros: [] })}
        dataIso={modalDia.dataIso}
        registrosDia={modalDia.registros}
      />
    </div>
  );
}
