// src/lib/kpiUtils.js
// Specialized KPI calculations: Recurrence Rate and Weekly Anomaly Detection

import { normalizarDataObj, limparNomeBase, limparNomeReal, normalizarSonda } from './dataUtils';

/**
 * Calculates recurrence of maintenance orders.
 * A recurrence is flagged when the same drill rig ('Sonda') has maintenance
 * on the same component (family or specific tag) within a defined time window (default 30 days).
 */
export function calcularReincidencia(bancoGeral, janelaDias = 30) {
  if (!bancoGeral || bancoGeral.length === 0) {
    return {
      taxaReincidencia: 0,
      totalReincidentes: 0,
      totalComData: 0,
      topComponentesReincidentes: [],
      topSondasReincidentes: [],
      detalhesReincidencia: []
    };
  }

  // 1. Filter and parse valid dates
  const registrosComData = [];
  bancoGeral.forEach((row, idx) => {
    const dataLimpa = row['Data_Limpa'];
    const dt = normalizarDataObj(dataLimpa);
    if (dt && dt.timestamp) {
      const sonda = normalizarSonda(row['Causa'] || row['CAUSA'] || '') || 'NÃO INFORMADO';
      const compBase = limparNomeBase(row['Componentes'] || row['COMPONENTES']);
      const compReal = limparNomeReal(row['Componentes'] || row['COMPONENTES']);
      const falha = String(row['falhas'] || row['FALHAS'] || 'N/A').toUpperCase().trim();
      const os = row['OS'] || `#${idx + 1}`;

      registrosComData.push({
        origIndex: idx,
        os,
        sonda,
        compBase,
        compReal,
        falha,
        mes: row['Aba_Origem'] || '',
        dataStr: dataLimpa,
        timestamp: dt.timestamp,
        row
      });
    }
  });

  // Sort chronologically
  registrosComData.sort((a, b) => a.timestamp - b.timestamp);

  const reincidentesSet = new Set();
  const detalhes = [];
  const compReincCount = {};
  const sondaReincCount = {};

  const janelaMs = janelaDias * 24 * 60 * 60 * 1000;

  // Track history per (sonda + compBase)
  const historico = new Map();

  for (const item of registrosComData) {
    // Ignore rows where rig or component is undefined/generic
    if (item.sonda === 'NÃO INFORMADO' || item.compBase === 'NÃO INFORMADO') continue;

    const chave = `${item.sonda}___${item.compBase}`;
    const anteriores = historico.get(chave) || [];

    // Check if there is an earlier maintenance within the window
    const recente = anteriores.filter(ant => (item.timestamp - ant.timestamp) <= janelaMs);

    if (recente.length > 0) {
      const ultimaAnterior = recente[recente.length - 1];
      const diasDif = Math.round((item.timestamp - ultimaAnterior.timestamp) / (24 * 60 * 60 * 1000));

      reincidentesSet.add(item.origIndex);

      compReincCount[item.compBase] = (compReincCount[item.compBase] || 0) + 1;
      sondaReincCount[item.sonda] = (sondaReincCount[item.sonda] || 0) + 1;

      detalhes.push({
        osAtual: item.os,
        sonda: item.sonda,
        componente: item.compBase,
        componenteReal: item.compReal,
        dataAtual: item.dataStr,
        osAnterior: ultimaAnterior.os,
        dataAnterior: ultimaAnterior.dataStr,
        diasEntreFalhas: diasDif,
        falha: item.falha
      });
    }

    anteriores.push(item);
    historico.set(chave, anteriores);
  }

  const totalComData = registrosComData.length;
  const totalReincidentes = reincidentesSet.size;
  const taxaReincidencia = totalComData > 0 ? (totalReincidentes / totalComData) * 100 : 0;

  const topComponentesReincidentes = Object.entries(compReincCount)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSondasReincidentes = Object.entries(sondaReincCount)
    .map(([sonda, count]) => ({ sonda, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    taxaReincidencia: Number(taxaReincidencia.toFixed(1)),
    totalReincidentes,
    totalComData,
    janelaDias,
    topComponentesReincidentes,
    topSondasReincidentes,
    detalhesReincidencia: detalhes.reverse() // latest first
  };
}

/**
 * Weekly trends & anomaly detection ("Aumentos Estranhos na Semana").
 * Compares the most recent 7-day period with the preceding 7-day period.
 * Flags components and drill rigs that exhibit sharp increases.
 */
export function detectarAnomaliasSemanais(bancoGeral) {
  if (!bancoGeral || bancoGeral.length === 0) {
    return {
      periodoAtualStr: '',
      totalOSSemanaAtual: 0,
      totalOSSemanaAnterior: 0,
      variacaoGeralPct: 0,
      alertas: [],
      temAlertas: false
    };
  }

  // Collect all timestamps
  const comTimestamp = [];
  bancoGeral.forEach(r => {
    const dt = normalizarDataObj(r['Data_Limpa']);
    if (dt && dt.timestamp) {
      comTimestamp.push({
        ...r,
        _dt: dt,
        _timestamp: dt.timestamp,
        _compBase: limparNomeBase(r['Componentes'] || r['COMPONENTES']),
        _sonda: normalizarSonda(r['Causa'] || r['CAUSA'] || '') || 'NÃO INFORMADO'
      });
    }
  });

  if (comTimestamp.length === 0) {
    return {
      periodoAtualStr: 'Sem datas registradas',
      totalOSSemanaAtual: 0,
      totalOSSemanaAnterior: 0,
      variacaoGeralPct: 0,
      alertas: [],
      temAlertas: false
    };
  }

  // Find max date
  const maxTs = Math.max(...comTimestamp.map(x => x._timestamp));
  const umDiaMs = 24 * 60 * 60 * 1000;
  const seteDiasMs = 7 * umDiaMs;

  const inicioSemanaAtual = maxTs - seteDiasMs + 1000;
  const inicioSemanaAnterior = inicioSemanaAtual - seteDiasMs;

  const semanaAtual = comTimestamp.filter(x => x._timestamp >= inicioSemanaAtual && x._timestamp <= maxTs);
  const semanaAnterior = comTimestamp.filter(x => x._timestamp >= inicioSemanaAnterior && x._timestamp < inicioSemanaAtual);

  const dtFim = new Date(maxTs);
  const dtIni = new Date(inicioSemanaAtual);
  const periodoAtualStr = `${String(dtIni.getDate()).padStart(2, '0')}/${String(dtIni.getMonth() + 1).padStart(2, '0')} a ${String(dtFim.getDate()).padStart(2, '0')}/${String(dtFim.getMonth() + 1).padStart(2, '0')}`;

  // Counts by component
  const countCompAtual = {};
  const countCompAnterior = {};

  semanaAtual.forEach(x => {
    if (x._compBase && x._compBase !== 'NÃO INFORMADO') {
      countCompAtual[x._compBase] = (countCompAtual[x._compBase] || 0) + 1;
    }
  });

  semanaAnterior.forEach(x => {
    if (x._compBase && x._compBase !== 'NÃO INFORMADO') {
      countCompAnterior[x._compBase] = (countCompAnterior[x._compBase] || 0) + 1;
    }
  });

  // Counts by sonda
  const countSondaAtual = {};
  const countSondaAnterior = {};

  semanaAtual.forEach(x => {
    if (x._sonda && x._sonda !== 'NÃO INFORMADO') {
      countSondaAtual[x._sonda] = (countSondaAtual[x._sonda] || 0) + 1;
    }
  });

  semanaAnterior.forEach(x => {
    if (x._sonda && x._sonda !== 'NÃO INFORMADO') {
      countSondaAnterior[x._sonda] = (countSondaAnterior[x._sonda] || 0) + 1;
    }
  });

  const alertas = [];

  // Anomaly criteria for components:
  // 1) >= 3 O.S. in the week AND at least double the previous week (+100%), OR
  // 2) >= 4 O.S. in current week with 0 in previous week
  Object.keys(countCompAtual).forEach(comp => {
    const atual = countCompAtual[comp] || 0;
    const ant = countCompAnterior[comp] || 0;

    let disparo = false;
    let aumentoPct = 0;

    if (ant === 0 && atual >= 3) {
      disparo = true;
      aumentoPct = 100;
    } else if (ant > 0 && atual >= 3 && atual >= ant * 1.5) {
      disparo = true;
      aumentoPct = Math.round(((atual - ant) / ant) * 100);
    }

    if (disparo) {
      alertas.push({
        tipo: 'componente',
        titulo: comp,
        qtdAtual: atual,
        qtdAnterior: ant,
        aumentoPct,
        severidade: atual >= 6 || aumentoPct >= 150 ? 'alta' : 'moderada',
        mensagem: `${atual} O.S. nesta semana (${aumentoPct > 0 ? `+${aumentoPct}%` : 'novo pico'}) vs ${ant} na anterior.`
      });
    }
  });

  // Anomaly criteria for rigs (sondas):
  Object.keys(countSondaAtual).forEach(sonda => {
    const atual = countSondaAtual[sonda] || 0;
    const ant = countSondaAnterior[sonda] || 0;

    let disparo = false;
    let aumentoPct = 0;

    if (ant === 0 && atual >= 4) {
      disparo = true;
      aumentoPct = 100;
    } else if (ant > 0 && atual >= 4 && atual >= ant * 1.5) {
      disparo = true;
      aumentoPct = Math.round(((atual - ant) / ant) * 100);
    }

    if (disparo) {
      alertas.push({
        tipo: 'sonda',
        titulo: sonda,
        qtdAtual: atual,
        qtdAnterior: ant,
        aumentoPct,
        severidade: atual >= 8 || aumentoPct >= 150 ? 'alta' : 'moderada',
        mensagem: `${atual} intervenções nesta semana (${aumentoPct > 0 ? `+${aumentoPct}%` : 'novo pico'}) vs ${ant} na anterior.`
      });
    }
  });

  // Sort alerts by severity and current volume
  alertas.sort((a, b) => (b.severidade === 'alta' ? 1 : 0) - (a.severidade === 'alta' ? 1 : 0) || b.qtdAtual - a.qtdAtual);

  const totalAtual = semanaAtual.length;
  const totalAnt = semanaAnterior.length;
  const variacaoGeralPct = totalAnt > 0 ? Math.round(((totalAtual - totalAnt) / totalAnt) * 100) : 0;

  return {
    periodoAtualStr,
    totalOSSemanaAtual: totalAtual,
    totalOSSemanaAnterior: totalAnt,
    variacaoGeralPct,
    alertas,
    temAlertas: alertas.length > 0
  };
}

