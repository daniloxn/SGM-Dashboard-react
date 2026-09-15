// src/components/tabs/Tab1Geral.jsx — Visão Geral com Controle Mensal Diário e Avisos Opcionais
import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import useStore from '../../store/useStore';
import { CHART_COLORS, normalizarDataObj } from '../../lib/dataUtils';
import Modal from '../ui/Modal';
import HelpButton from '../ui/HelpButton';

function KpiCard({ label, value, sublabel, icon, color = 'text-blue-400', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/80' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {onClick && <span className="text-xs text-blue-600 dark:text-blue-400/80 hover:text-blue-700 dark:hover:text-blue-300 font-medium">Ver detalhes →</span>}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sublabel}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm max-w-xs text-slate-900 dark:text-white">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Tab1Geral() {
  const [modalReincidencia, setModalReincidencia] = useState(false);
  const [mesFiltro, setMesFiltro] = useState('TODOS');

  const {
    bancoGeral = [],
    ordemMeses = [],
    relMeses = {},
    sondasUnicas = [],
    mecanicosUnicos = [],
    falhasGeraisCount = {},
    relCompBaseMes = {},
    reincidenciaKPIs
  } = useStore();

  // Gráfico de Evolução:
  // Se 'TODOS': evolução mensal de O.S.
  // Se mês específico: evolução diária (O.S. em cada dia daquele mês)
  const chartEvolucao = useMemo(() => {
    if (mesFiltro === 'TODOS') {
      return (ordemMeses || []).map(m => ({
        label: m,
        'O.S.': relMeses?.[m] || 0
      }));
    }

    // Mês específico: agrupa O.S. por data dentro do mês
    const counts = {};
    for (let i = 0; i < bancoGeral.length; i++) {
      const r = bancoGeral[i];
      if (r['Aba_Origem'] === mesFiltro) {
        const d = r['Data_Limpa'];
        if (d && d !== 'S/D') {
          counts[d] = (counts[d] || 0) + 1;
        }
      }
    }

    const sortedDates = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return sortedDates.map(data => {
      const obj = normalizarDataObj(data);
      return {
        label: obj ? obj.labelBr : data,
        'O.S.': counts[data]
      };
    });
  }, [mesFiltro, ordemMeses, relMeses, bancoGeral]);

  // Top 10 falhas gerais
  const topFalhas = useMemo(() => {
    return Object.entries(falhasGeraisCount || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([falha, count]) => ({ falha: falha.length > 28 ? falha.slice(0, 27) + '…' : falha, count }));
  }, [falhasGeraisCount]);

  // Top 10 componentes por família
  const topComps = useMemo(() => {
    return Object.entries(relCompBaseMes || {})
      .map(([comp, meses]) => ({ comp, total: Object.values(meses || {}).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [relCompBaseMes]);

  const taxaReinc = reincidenciaKPIs ? reincidenciaKPIs.taxaReincidencia : 0;
  const totalReinc = reincidenciaKPIs ? reincidenciaKPIs.totalReincidentes : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 1. Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="📋" label="Total de O.S." value={bancoGeral.length} color="text-blue-500 dark:text-blue-400" />
        <KpiCard
          icon="🔁"
          label="Taxa de Reincidência"
          value={`${taxaReinc}%`}
          sublabel={`${totalReinc} O.S. repetidas em até 30 dias`}
          color={taxaReinc > 15 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}
          onClick={() => setModalReincidencia(true)}
        />
        <KpiCard icon="🏗️" label="Sondas Ativas" value={sondasUnicas.length} color="text-amber-500 dark:text-amber-400" />
        <KpiCard icon="👷" label="Equipe de Mecânicos" value={mecanicosUnicos.length} color="text-purple-600 dark:text-purple-400" />
      </div>

      {/* 2. Reincidência Detalhada */}
      {reincidenciaKPIs && reincidenciaKPIs.topComponentesReincidentes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔄</span> Componentes com Maior Reincidência
              </h4>
              <button
                onClick={() => setModalReincidencia(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Ver histórico
              </button>
            </div>
            <div className="space-y-1.5">
              {reincidenciaKPIs.topComponentesReincidentes.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 px-3 py-2 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-300 font-medium truncate max-w-[200px]">{item.nome}</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                    {item.count} O.S. repetidas
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏗️</span> Sondas com Mais Reincidências
              </h4>
              <button
                onClick={() => setModalReincidencia(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Ver histórico
              </button>
            </div>
            <div className="space-y-1.5">
              {reincidenciaKPIs.topSondasReincidentes.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 px-3 py-2 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-300 font-semibold">{item.sonda}</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                    {item.count} reincidências
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Gráfico de Evolução (Mensal se 'TODOS' ou Diário se selecionar 1 mês) */}
      <div className="chart-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {mesFiltro === 'TODOS' ? (
                '📈 Evolução Mensal de Ordens de Serviço'
              ) : (
                <>📅 Ocorrências por Dia no Mês — <span className="text-blue-600 dark:text-blue-400">{mesFiltro}</span></>
              )}
            </h3>
            <HelpButton
              title="Evolução de Ordens de Serviço"
              purpose="Acompanhar o volume total de chamados abertos ao longo do tempo para identificar tendências de aumento ou queda nas quebras."
              howItWorks="No modo 'Todos os Meses', soma as ordens de serviço cadastradas mês a mês. Ao escolher um mês específico no seletor, transforma o gráfico em visão diária com o total de cada dia do mês."
              whatToObserve="Picos súbitos em meses ou dias específicos. Se a linha estiver subindo continuamente, indica necessidade de reforço preventivo."
              tips="Selecione um mês no menu ao lado para descobrir os dias exatos em que a oficina recebeu mais demandas."
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Visualizar:</span>
            <select
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TODOS">🌐 Todos os Meses</option>
              {ordemMeses.map(m => (
                <option key={m} value={m}>📅 {m}</option>
              ))}
            </select>
          </div>
        </div>

        {chartEvolucao.length > 0 ? (
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={chartEvolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="linear"
                dataKey="O.S."
                name="Total O.S."
                stroke={CHART_COLORS[0]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLORS[0] }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* 4. Top Falhas e Top Componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-box">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">🔴 Top Tipos de Falhas</h3>
            <HelpButton
              title="Top Tipos de Falhas"
              purpose="Identificar os modos de falha e sintomas mais recorrentes em toda a operação."
              howItWorks="Varre a coluna 'falhas' de todas as ordens de serviço registradas e ranqueia as causas mais frequentes em ordem decrescente."
              whatToObserve="Falhas repetitivas como desgaste excessivo, quebra por impacto ou vazamentos que possam justificar revisão de operação ou lubrificação."
            />
          </div>
          {topFalhas.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topFalhas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="falha" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="chart-box">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">🔩 Top Famílias de Componentes</h3>
            <HelpButton
              title="Top Famílias de Componentes"
              purpose="Apontar quais categorias de equipamentos geram o maior volume absoluto de manutenções na frota."
              howItWorks="Normaliza o nome dos equipamentos retirando numerações individuais e soma o volume total histórico por família base."
              whatToObserve="Equipamentos críticos como Cabeçotes ou Motores no topo da lista sugerem itens prioritários para estoque de reserva e manutenção preventiva."
            />
          </div>
          {topComps.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topComps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="comp" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} name="O.S." />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Modal de Detalhes da Reincidência */}
      <Modal
        open={modalReincidencia}
        onClose={() => setModalReincidencia(false)}
        title="🔁 Detalhamento de O.S. Reincidentes"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ordens de serviço na mesma sonda para o mesmo componente realizadas em um intervalo de até 30 dias (indício de retrabalho ou fadiga precoce).
          </p>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {reincidenciaKPIs && reincidenciaKPIs.detalhesReincidencia.length > 0 ? (
              reincidenciaKPIs.detalhesReincidencia.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      🏗️ {item.sonda} — <span className="text-blue-600 dark:text-blue-400">{item.componenteReal}</span>
                    </span>
                    <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/30">
                      {item.diasEntreFalhas} dias de intervalo
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
                    <span>O.S. Atual: <strong className="text-slate-900 dark:text-slate-200">{item.osAtual}</strong> ({item.dataAtual})</span>
                    <span>O.S. Anterior: <strong className="text-slate-900 dark:text-slate-200">{item.osAnterior}</strong> ({item.dataAnterior})</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">Falha: <span className="text-slate-800 dark:text-slate-300 font-medium">{item.falha}</span></p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-500">Nenhuma reincidência detectada.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
      <div className="text-center">
        <p className="text-3xl mb-2">📭</p>
        <p>Nenhum dado carregado</p>
      </div>
    </div>
  );
}
