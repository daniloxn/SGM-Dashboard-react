// src/components/tabs/Tab5Mecanicos.jsx — Controle e Produtividade da Equipe
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';
import useStore from '../../store/useStore';
import { CHART_COLORS, limparNomeBase, limparNomeReal } from '../../lib/dataUtils';
import HelpButton from '../ui/HelpButton';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
      <p style={{ color: payload[0]?.color }}>O.S.: <strong>{payload[0]?.value}</strong></p>
    </div>
  );
};

export default function Tab5Mecanicos() {
  const { bancoGeral, ordemMeses, mecanicosUnicos, relMecMes } = useStore();

  const [selMec, setSelMec] = useState('GERAL');
  const [selMes, setSelMes] = useState('TODOS');
  const [modoVisualizacaoEquip, setModoVisualizacaoEquip] = useState('familia'); // 'familia' | 'tag'

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

  // Tabela de equipamentos trabalhados (agrupada por Família ou por Tag individual)
  const tabelaEquipamentos = useMemo(() => {
    const counts = {};

    bancoGeral.forEach(r => {
      // Filtro de Mês
      if (selMes !== 'TODOS' && r['Aba_Origem'] !== selMes) return;

      // Filtro de Mecânico
      if (selMec !== 'GERAL') {
        const mec = String(r['Mecânico'] || r['MECANICO'] || '').toUpperCase().trim();
        if (mec !== selMec && !mec.includes(selMec)) return;
      }

      const rawComp = r['Componentes'] || r['COMPONENTES'] || '';
      const equip = modoVisualizacaoEquip === 'familia'
        ? limparNomeBase(rawComp)
        : limparNomeReal(rawComp);

      if (equip && equip !== 'NÃO INFORMADO') {
        counts[equip] = (counts[equip] || 0) + 1;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([equip, count]) => ({
        equip,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      }));
  }, [selMec, selMes, modoVisualizacaoEquip, bancoGeral]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Mecânico</label>
          <select
            value={selMec}
            onChange={e => setSelMec(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="GERAL">Ranking Geral da Equipe</option>
            {mecanicosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Mês de Referência</label>
          <select
            value={selMes}
            onChange={e => setSelMes(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {selMec === 'GERAL' ? '🏆 Ranking de Atendimentos da Equipe' : `📈 Produtividade: ${selMec}`}
            </h3>
            <HelpButton
              title="Produtividade da Equipe de Mecânicos"
              purpose="Avaliar a distribuição de carga de trabalho e o volume de ordens atendidas por profissional."
              howItWorks="No modo geral, calcula o total de ordens atendidas por cada mecânico no período selecionado. Se você selecionar um mecânico específico no filtro superior, exibe sua curva de produtividade mês a mês."
              whatToObserve="Desbalanceamento na divisão de tarefas ou sobrecarga crônica em determinados mecânicos especialistas."
              tips="Selecione um profissional no filtro para ver em quais meses ele teve picos de chamados."
            />
          </div>
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
            <div className="flex items-center justify-center h-48 text-slate-500 dark:text-slate-600 text-sm">
              <p>Nenhum dado encontrado para os filtros.</p>
            </div>
          )}
        </div>

        {/* Tabela de Equipamentos */}
        <div className="chart-box lg:col-span-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>🔩</span>
                <span>Equipamentos {selMec !== 'GERAL' ? `(${selMec})` : ''}</span>
              </h3>
              <HelpButton
                title="Equipamentos Atendidos pelo Mecânico"
                purpose="Mapear a especialidade técnica e os componentes mais manuseados por cada mecânico ou pela equipe inteira."
                howItWorks="Conta a frequência de cada componente nas ordens registradas. O switch no canto superior permite agrupar os dados por Família (ex: Cabeçote, Motor) ou inspecionar por Tag individual da peça (ex: Cabeçote 01, Motor 02)."
                whatToObserve="Se mecânicos específicos concentram manutenções de alta precisão ou se a equipe possui conhecimento distribuído para atender múltiplos tipos de equipamentos."
                tips="Alterne entre 'Família' e 'Por Tag' no botão acima para ver o detalhamento fino de cada peça física."
              />
            </div>

            {/* Switch Toggle: Família / Grupo vs Tag */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setModoVisualizacaoEquip('familia')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  modoVisualizacaoEquip === 'familia'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Agrupar peças por Família / Grupo principal"
              >
                Família
              </button>

              <button
                type="button"
                onClick={() => setModoVisualizacaoEquip('tag')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  modoVisualizacaoEquip === 'tag'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Visualizar por Tag individual da peça"
              >
                Por Tag
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[380px] pr-1">
            <table className="sgm-table">
              <thead>
                <tr>
                  <th>{modoVisualizacaoEquip === 'familia' ? 'Família / Grupo' : 'Tag / Código da Peça'}</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {tabelaEquipamentos.length > 0 ? (
                  tabelaEquipamentos.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={item.equip}>
                        {item.equip}
                      </td>
                      <td className="text-right font-semibold text-blue-600 dark:text-blue-400">{item.count}</td>
                      <td className="text-right text-slate-600 dark:text-slate-400">{item.pct}%</td>
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

