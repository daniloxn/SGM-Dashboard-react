// src/components/tabs/Tab5Mecanicos.jsx — Controle e Produtividade da Equipe
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';
import useStore from '../../store/useStore';
import { CHART_COLORS } from '../../lib/dataUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p style={{ color: payload[0]?.color }}>O.S.: <strong>{payload[0]?.value}</strong></p>
    </div>
  );
};

export default function Tab5Mecanicos() {
  const { bancoGeral, ordemMeses, mecanicosUnicos, relMecMes, relMecCompMes } = useStore();

  const [selMec, setSelMec] = useState('GERAL');
  const [selMes, setSelMes] = useState('TODOS');

  // Chart data
  const chartData = useMemo(() => {
    if (selMec === 'GERAL') {
      // Ranking de todos os mecânicos no mês selecionado (ou geral)
      return mecanicosUnicos.map(mec => {
        let total = 0;
        if (selMes === 'TODOS') {
          total = Object.values(relMecMes[mec] || {}).reduce((a, b) => a + b, 0);
        } else {
          total = relMecMes[mec]?.[selMes] || 0;
        }
        return { nome: mec, count: total };
      })
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
    } else {
      // Evolução do mecânico selecionado mês a mês
      return ordemMeses.map(mes => ({
        nome: mes,
        count: relMecMes[selMec]?.[mes] || 0
      }));
    }
  }, [selMec, selMes, mecanicosUnicos, ordemMeses, relMecMes]);

  // Tabela de equipamentos trabalhados
  const tabelaEquipamentos = useMemo(() => {
    if (selMec === 'GERAL') {
      // Top equipamentos geral no mês selecionado
      const counts = {};
      bancoGeral.forEach(r => {
        if (selMes !== 'TODOS' && r['Aba_Origem'] !== selMes) return;
        const comp = r['Componentes'] || r['COMPONENTES'] || 'N/A';
        counts[comp] = (counts[comp] || 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([equip, count]) => ({
          equip,
          count,
          pct: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        }));
    } else {
      // Equipamentos do mecânico selecionado
      const counts = {};
      if (selMes === 'TODOS') {
        const mesesObj = relMecCompMes[selMec] || {};
        Object.values(mesesObj).forEach(compMap => {
          Object.entries(compMap).forEach(([comp, qtd]) => {
            counts[comp] = (counts[comp] || 0) + qtd;
          });
        });
      } else {
        const compMap = relMecCompMes[selMec]?.[selMes] || {};
        Object.entries(compMap).forEach(([comp, qtd]) => {
          counts[comp] = (counts[comp] || 0) + qtd;
        });
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([equip, count]) => ({
          equip,
          count,
          pct: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        }));
    }
  }, [selMec, selMes, bancoGeral, relMecCompMes]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Filtros */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Mecânico</label>
          <select
            value={selMec}
            onChange={e => setSelMec(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="GERAL">Ranking Geral da Equipe</option>
            {mecanicosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Mês de Referência</label>
          <select
            value={selMes}
            onChange={e => setSelMes(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Meses</option>
            {ordemMeses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Grid: Gráfico e Tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico */}
        <div className="chart-box lg:col-span-7">
          <h3 className="text-base font-semibold text-white mb-4">
            {selMec === 'GERAL' ? '🏆 Ranking de Atendimentos da Equipe' : `📈 Produtividade: ${selMec}`}
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={chartData}
                layout={selMec === 'GERAL' ? 'vertical' : 'horizontal'}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                {selMec === 'GERAL' ? (
                  <>
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="nome" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  </>
                )}
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="O.S.">
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              <p>Nenhum dado encontrado para os filtros.</p>
            </div>
          )}
        </div>

        {/* Tabela de Equipamentos */}
        <div className="chart-box lg:col-span-5 flex flex-col">
          <h3 className="text-base font-semibold text-white mb-3">
            🔩 Equipamentos Atendidos {selMec !== 'GERAL' ? `(${selMec})` : ''}
          </h3>
          <div className="overflow-y-auto max-h-[380px] pr-1">
            <table className="sgm-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {tabelaEquipamentos.length > 0 ? (
                  tabelaEquipamentos.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-200 truncate max-w-[180px]" title={item.equip}>
                        {item.equip}
                      </td>
                      <td className="text-right font-semibold text-blue-400">{item.count}</td>
                      <td className="text-right text-slate-400">{item.pct}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-500 py-6">
                      Nenhum equipamento registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

