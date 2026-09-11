// src/components/tabs/Tab1Geral.jsx — Visão Geral com Controle Mensal Diário e Avisos Opcionais
import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import useStore from '../../store/useStore';
import { CHART_COLORS, normalizarDataObj } from '../../lib/dataUtils';
import Modal from '../ui/Modal';

function KpiCard({ label, value, sublabel, icon, color = 'text-blue-400', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-500/40 hover:bg-slate-800/80' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {onClick && <span className="text-xs text-blue-400/80 hover:text-blue-300">Ver detalhes →</span>}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sublabel}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm max-w-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
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
  const [mostrarAlertas, setMostrarAlertas] = useState(false);

  const {
    bancoGeral = [],
    ordemMeses = [],
    relMeses = {},
    sondasUnicas = [],
    mecanicosUnicos = [],
    falhasGeraisCount = {},
    relCompBaseMes = {},
    reincidenciaKPIs,
    alertasSemanais
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
  const qtdAlertas = alertasSemanais ? alertasSemanais.alertas.length : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 1. Radar de Anomalias Semanal (Discreto e Opcional para não poluir a tela) */}
      {alertasSemanais && (
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{alertasSemanais.temAlertas ? '🚨' : '🛡️'}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-white">
                  Radar Semanal de Anomalias
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${alertasSemanais.temAlertas ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {alertasSemanais.temAlertas ? `${qtdAlertas} alerta(s)` : 'Operação Estável'}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  ({alertasSemanais.periodoAtualStr})
                </span>
              </div>
            </div>

            <button
              onClick={() => setMostrarAlertas(v => !v)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors font-medium flex items-center gap-1 shrink-0"
            >
              {mostrarAlertas ? 'Ocultar avisos ✕' : 'Ver avisos 👁️'}
            </button>
          </div>

          {mostrarAlertas && (
            <div className="mt-3 pt-3 border-t border-white/5">
              {alertasSemanais.temAlertas ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {alertasSemanais.alertas.map((alerta, i) => (
                    <div key={i} className="bg-slate-900/80 rounded-xl p-3 border border-red-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-300 uppercase tracking-wide">
                          {alerta.tipo === 'componente' ? '⚙️ Peça:' : '🏗️ Sonda:'} {alerta.titulo}
                        </span>
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
                          {alerta.aumentoPct > 0 ? `+${alerta.aumentoPct}%` : 'Pico'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{alerta.mensagem}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-1">
                  Nenhum aumento anômalo identificado nos últimos 7 dias.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="📋" label="Total de O.S." value={bancoGeral.length} color="text-blue-400" />
        <KpiCard
          icon="🔁"
          label="Taxa de Reincidência"
          value={`${taxaReinc}%`}
          sublabel={`${totalReinc} O.S. repetidas em até 30 dias`}
          color={taxaReinc > 15 ? 'text-rose-400' : 'text-emerald-400'}
          onClick={() => setModalReincidencia(true)}
        />
        <KpiCard icon="🏗️" label="Sondas Ativas" value={sondasUnicas.length} color="text-amber-400" />
        <KpiCard icon="👷" label="Equipe de Mecânicos" value={mecanicosUnicos.length} color="text-purple-400" />
      </div>

      {/* 3. Reincidência Detalhada */}
      {reincidenciaKPIs && reincidenciaKPIs.topComponentesReincidentes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔄</span> Componentes com Maior Reincidência
              </h4>
              <button
                onClick={() => setModalReincidencia(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Ver histórico
              </button>
            </div>
            <div className="space-y-1.5">
              {reincidenciaKPIs.topComponentesReincidentes.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-900/50 px-3 py-2 rounded-lg">
                  <span className="text-slate-300 truncate max-w-[200px]">{item.nome}</span>
                  <span className="font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {item.count} O.S. repetidas
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏗️</span> Sondas com Mais Reincidências
              </h4>
              <button
                onClick={() => setModalReincidencia(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Ver histórico
              </button>
            </div>
            <div className="space-y-1.5">
              {reincidenciaKPIs.topSondasReincidentes.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-900/50 px-3 py-2 rounded-lg">
                  <span className="text-slate-300 font-semibold">{item.sonda}</span>
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {item.count} reincidências
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Gráfico de Evolução (Mensal se 'TODOS' ou Diário se selecionar 1 mês) */}
      <div className="chart-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-white">
            {mesFiltro === 'TODOS' ? (
              '📈 Evolução Mensal de Ordens de Serviço'
            ) : (
              <>📅 Ocorrências por Dia no Mês — <span className="text-blue-400">{mesFiltro}</span></>
            )}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Visualizar:</span>
            <select
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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

      {/* 5. Top Falhas e Top Componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-box">
          <h3 className="text-base font-semibold text-white mb-4">🔴 Top Tipos de Falhas</h3>
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
          <h3 className="text-base font-semibold text-white mb-4">🔩 Top Famílias de Componentes</h3>
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
          <p className="text-xs text-slate-400">
            Ordens de serviço na mesma sonda para o mesmo componente realizadas em um intervalo de até 30 dias (indício de retrabalho ou fadiga precoce).
          </p>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {reincidenciaKPIs && reincidenciaKPIs.detalhesReincidencia.length > 0 ? (
              reincidenciaKPIs.detalhesReincidencia.map((item, idx) => (
                <div key={idx} className="bg-slate-900/70 border border-white/5 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      🏗️ {item.sonda} — <span className="text-blue-400">{item.componenteReal}</span>
                    </span>
                    <span className="bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded">
                      {item.diasEntreFalhas} dias de intervalo
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                    <span>O.S. Atual: <strong className="text-slate-200">{item.osAtual}</strong> ({item.dataAtual})</span>
                    <span>O.S. Anterior: <strong className="text-slate-200">{item.osAnterior}</strong> ({item.dataAnterior})</span>
                  </div>
                  <p className="text-slate-400">Falha: <span className="text-slate-300">{item.falha}</span></p>
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
