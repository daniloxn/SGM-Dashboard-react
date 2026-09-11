// src/components/tabs/Tab3Familias.jsx — Evolução Famílias e Tags
import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import useStore from '../../store/useStore';
import MultiSelect from '../ui/MultiSelect';
import { limparNomeBase, limparNomeReal, CHART_COLORS } from '../../lib/dataUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm max-w-xs">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p, i) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
        return (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
            <span className="text-slate-400 ml-1">({pct}%)</span>
          </p>
        );
      })}
    </div>
  );
};

export default function Tab3Familias() {
  const {
    bancoGeral = [],
    ordemMeses = [],
    compBaseUnicos = [],
    compReaisUnicos = [],
    relCompBaseMes = {},
    relCompRealMes = {},
    relCompBaseFalhaMes = {},
    relCompRealFalhaMes = {}
  } = useStore();

  // Options: families + tags
  const componentOptions = useMemo(() => [
    ...compBaseUnicos.sort().map(c => `[FAMILIA_SGM] ${c}`),
    ...compReaisUnicos.sort().map(c => `[TAG_SGM] ${c}`),
  ], [compBaseUnicos, compReaisUnicos]);

  const falhaOptions = useMemo(() => [
    ...compBaseUnicos.sort().map(c => `[FAMILIA_SGM] ${c}`),
    ...compReaisUnicos.sort().map(c => `[TAG_SGM] ${c}`),
  ], [compBaseUnicos, compReaisUnicos]);

  const [selComp, setSelComp] = useState(['GERAL']);
  const [selFalhaComp, setSelFalhaComp] = useState(['GERAL']);
  const [selFalha, setSelFalha] = useState('TODOS');

  // Gráfico 1: Evolução temporal de família/tag selecionada
  const evolucaoData = useMemo(() => {
    const isGeral = selComp.includes('GERAL') || selComp.length === 0;

    let keys = [];
    if (isGeral) {
      // Top 10 families by total
      const totals = compBaseUnicos.map(c => ({
        k: c, t: ordemMeses.reduce((s, m) => s + (relCompBaseMes[c]?.[m] || 0), 0)
      }));
      totals.sort((a, b) => b.t - a.t);
      keys = totals.slice(0, 10).map(x => ({ key: x.k, type: 'family' }));
    } else {
      selComp.forEach(v => {
        if (v.startsWith('[FAMILIA_SGM]')) keys.push({ key: v.replace('[FAMILIA_SGM] ', ''), type: 'family' });
        else if (v.startsWith('[TAG_SGM]'))   keys.push({ key: v.replace('[TAG_SGM] ', ''),    type: 'tag' });
      });
    }

    return ordemMeses.map(mes => {
      const row = { mes };
      keys.forEach(({ key, type }) => {
        const source = type === 'family' ? relCompBaseMes : relCompRealMes;
        row[key] = source[key]?.[mes] || 0;
      });
      return row;
    });
  }, [selComp, ordemMeses, compBaseUnicos, relCompBaseMes, relCompRealMes]);

  const evolucaoKeys = evolucaoData.length > 0 ? Object.keys(evolucaoData[0]).filter(k => k !== 'mes') : [];

  // Gráfico 2: Falhas por comp/tag selecionado
  const falhasDisponiveis = useMemo(() => {
    const isGeral = selFalhaComp.includes('GERAL') || selFalhaComp.length === 0;
    const fc = {};

    selFalhaComp.forEach(v => {
      if (v === 'GERAL') {
        // all
        Object.values(relCompBaseFalhaMes).forEach(fMap => {
          Object.entries(fMap).forEach(([f, mMap]) => {
            fc[f] = (fc[f] || 0) + Object.values(mMap).reduce((a, b) => a + b, 0);
          });
        });
      } else if (v.startsWith('[FAMILIA_SGM]')) {
        const k = v.replace('[FAMILIA_SGM] ', '');
        if (relCompBaseFalhaMes[k]) {
          Object.entries(relCompBaseFalhaMes[k]).forEach(([f, mMap]) => {
            fc[f] = (fc[f] || 0) + Object.values(mMap).reduce((a, b) => a + b, 0);
          });
        }
      } else if (v.startsWith('[TAG_SGM]')) {
        const k = v.replace('[TAG_SGM] ', '');
        if (relCompRealFalhaMes[k]) {
          Object.entries(relCompRealFalhaMes[k]).forEach(([f, mMap]) => {
            fc[f] = (fc[f] || 0) + Object.values(mMap).reduce((a, b) => a + b, 0);
          });
        }
      }
    });

    return Object.entries(fc).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [selFalhaComp, relCompBaseFalhaMes, relCompRealFalhaMes]);

  // Chart 2 data: temporal evolution of specific failure across selected components
  const falhaData = useMemo(() => {
    const isGeralComp = selFalhaComp.includes('GERAL') || selFalhaComp.length === 0;
    const isGeralFalha = selFalha === 'TODOS';

    if (selFalhaComp.length <= 1 || isGeralComp) {
      // Single comp or general: bar chart of top failures
      const fc = {};
      selFalhaComp.forEach(v => {
        if (v === 'GERAL') {
          bancoGeral.forEach(r => {
            const f = String(r['falhas'] || r['FALHAS'] || 'N/A').toUpperCase().trim();
            fc[f] = (fc[f] || 0) + 1;
          });
        } else if (v.startsWith('[FAMILIA_SGM]')) {
          const k = v.replace('[FAMILIA_SGM] ', '');
          if (relCompBaseFalhaMes[k]) {
            Object.entries(relCompBaseFalhaMes[k]).forEach(([f, mMap]) => {
              fc[f] = (fc[f] || 0) + Object.values(mMap).reduce((a, b) => a + b, 0);
            });
          }
        } else if (v.startsWith('[TAG_SGM]')) {
          const k = v.replace('[TAG_SGM] ', '');
          if (relCompRealFalhaMes[k]) {
            Object.entries(relCompRealFalhaMes[k]).forEach(([f, mMap]) => {
              fc[f] = (fc[f] || 0) + Object.values(mMap).reduce((a, b) => a + b, 0);
            });
          }
        }
      });
      return {
        type: 'bar',
        data: Object.entries(fc).sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([f, c]) => ({ falha: f.length > 35 ? f.slice(0, 35) + '…' : f, count: c }))
      };
    }

    // Multi-comp + specific failure: line chart per comp over time
    return {
      type: 'line',
      data: ordemMeses.map(mes => {
        const row = { mes };
        selFalhaComp.forEach(v => {
          let label, source, key;
          if (v.startsWith('[FAMILIA_SGM]')) { key = v.replace('[FAMILIA_SGM] ', ''); label = key; source = relCompBaseFalhaMes; }
          else if (v.startsWith('[TAG_SGM]'))   { key = v.replace('[TAG_SGM] ', '');    label = key; source = relCompRealFalhaMes; }
          else return;
          if (isGeralFalha) {
            row[label] = source[key] ? Object.values(source[key]).reduce((s, mMap) => s + (mMap[mes] || 0), 0) : 0;
          } else {
            row[label] = source[key]?.[selFalha]?.[mes] || 0;
          }
        });
        return row;
      }),
      keys: selFalhaComp.map(v => v.startsWith('[FAMILIA_SGM]') ? v.replace('[FAMILIA_SGM] ', '') : v.replace('[TAG_SGM] ', ''))
    };
  }, [selFalhaComp, selFalha, bancoGeral, ordemMeses, relCompBaseFalhaMes, relCompRealFalhaMes]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Chart 1: Component evolution */}
      <div className="chart-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-white">📈 Evolução por Família / Tag</h3>
          <div className="w-full sm:w-72">
            <MultiSelect
              id="filtroCompEvolucao"
              options={componentOptions}
              selected={selComp}
              onChange={setSelComp}
              defaultValue="GERAL"
              defaultLabel="Visão Geral (Top 10 Famílias)"
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolucaoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            {evolucaoKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Failures per component */}
      <div className="chart-box">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">🔴 Falhas por Família / Tag</h3>
            <div className="w-full sm:w-72">
              <MultiSelect
                id="filtroFalhaComp"
                options={falhaOptions}
                selected={selFalhaComp}
                onChange={setSelFalhaComp}
                defaultValue="GERAL"
                defaultLabel="Visão Geral (Top 10 Defeitos)"
              />
            </div>
          </div>
          {falhasDisponiveis.length > 0 && selFalhaComp.length > 1 && !selFalhaComp.includes('GERAL') && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 shrink-0">Falha específica:</label>
              <select
                value={selFalha}
                onChange={e => setSelFalha(e.target.value)}
                className="flex-1 max-w-xs bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TODOS">Todas as Falhas</option>
                {falhasDisponiveis.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>

        {falhaData.type === 'bar' ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={falhaData.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="falha" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={150} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} name="Ocorrências">
                {falhaData.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={falhaData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {(falhaData.keys || []).map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

