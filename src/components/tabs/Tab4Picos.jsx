// src/components/tabs/Tab4Picos.jsx — Picos Diários
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';
import useStore from '../../store/useStore';
import { normalizarDataObj, CHART_COLORS } from '../../lib/dataUtils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm text-slate-900 dark:text-white">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      <p style={{ color: payload[0]?.color }}>O.S.: <strong>{payload[0]?.value}</strong></p>
    </div>
  );
};

export default function Tab4Picos() {
  const { bancoGeral, ordemMeses } = useStore();
  const [filtroMes, setFiltroMes] = useState('TODOS');

  const dadosFiltrados = useMemo(() => {
    if (filtroMes === 'TODOS') return bancoGeral;
    return bancoGeral.filter(r => r['Aba_Origem'] === filtroMes);
  }, [bancoGeral, filtroMes]);

  // Daily aggregation
  const dadosDias = useMemo(() => {
    const counts = {};
    dadosFiltrados.forEach(r => {
      const d = r['Data_Limpa'];
      if (d && d !== 'S/D') counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, count]) => {
        const obj = normalizarDataObj(data);
        return { data: obj ? obj.labelBr : data, count, diaSemana: obj ? DIAS_SEMANA[obj.diaSemanaIdx] : '' };
      })
      .slice(-90); // last 90 days
  }, [dadosFiltrados]);

  // Day-of-week aggregation
  const dadosSemana = useMemo(() => {
    const counts = Array(7).fill(0);
    dadosFiltrados.forEach(r => {
      const obj = normalizarDataObj(r['Data_Limpa']);
      if (obj) counts[obj.diaSemanaIdx]++;
    });
    return DIAS_SEMANA.map((d, i) => ({ dia: d, count: counts[i] }));
  }, [dadosFiltrados]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">📅 Picos Diários de Manutenção</h2>
        <select
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          className="bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
        >
          <option value="TODOS">Todos os Meses</option>
          {ordemMeses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Daily chart */}
      <div className="chart-box">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">📊 Ocorrências por Dia (últimos 90 dias)</h3>
        {dadosDias.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dadosDias}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="data" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="O.S." radius={[3, 3, 0, 0]}>
                {dadosDias.map((entry, i) => (
                  <Cell key={i} fill={entry.count >= 5 ? '#ef4444' : entry.count >= 3 ? '#f59e0b' : CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-slate-600 text-sm text-center">
            <div><p className="text-3xl mb-2">📭</p><p>Sem dados de datas</p></div>
          </div>
        )}
      </div>

      {/* Day of week */}
      <div className="chart-box">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">📆 Distribuição por Dia da Semana</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dadosSemana}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} name="O.S." />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

