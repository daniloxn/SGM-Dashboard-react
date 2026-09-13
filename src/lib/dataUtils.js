// src/lib/dataUtils.js
// Utility functions — ported from vanilla JS data.js and charts.js
import { calcularReincidencia, detectarAnomaliasSemanais } from './kpiUtils';

/**
 * Strips numbers to get the component "family" name
 * e.g. "MANDRIL 01" -> "MANDRIL"
 */
export function limparNomeBase(t) {
  if (!t) return 'NÃO INFORMADO';
  return String(t)
    .toUpperCase()
    .trim()
    .split('/')[0]
    .replace(/[0-9]+/g, '')
    .replace(/\b(NSA|MT|OP|N\/A)\b/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns component name as uppercase — keeps number/tag
 * e.g. "MANDRIL 01" -> "MANDRIL 01"
 */
export function limparNomeReal(t) {
  return t ? String(t).toUpperCase().trim() : 'NÃO INFORMADO';
}

/**
 * Normalizes the "Causa" field to extract just the drill rig code
 */
export function normalizarSonda(causa) {
  return String(causa || '')
    .replace(/MANUTEN[^\s]+O\s+SONDAGEM/i, '')
    .replace(/MANUTENCAO\s+SONDAGEM/i, '')
    .trim();
}

/**
 * Normalizes any date string or Excel serial number into a standard object
 * Supports: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, Excel serials, ISO dates
 */
export function normalizarDataObj(dStr) {
  if (!dStr || dStr === 'S/D') return null;

  // Handle Excel serial date numbers (e.g., 45300)
  if (typeof dStr === 'number' || (!isNaN(Number(dStr)) && !String(dStr).includes('/') && !String(dStr).includes('-'))) {
    const num = Number(dStr);
    if (num > 30000 && num < 60000) {
      // Excel base date: Dec 30, 1899
      const ms = (num - 25569) * 86400 * 1000;
      const dt = new Date(ms);
      if (!isNaN(dt.getTime())) {
        const ano = dt.getUTCFullYear();
        const mes = dt.getUTCMonth() + 1;
        const dia = dt.getUTCDate();
        return {
          iso: `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
          ano, mes, dia,
          diaSemanaIdx: dt.getUTCDay(),
          timestamp: Date.UTC(ano, mes - 1, dia),
          labelBr: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
        };
      }
    }
  }

  let str = String(dStr).trim().split(' ')[0].split('T')[0];
  let ano = 0, mes = 0, dia = 0;

  if (str.includes('/')) {
    const p = str.split('/');
    if (p.length === 3) {
      if (p[0].length === 4) { ano = +p[0]; mes = +p[1]; dia = +p[2]; }
      else { dia = +p[0]; mes = +p[1]; ano = +p[2]; }
    }
  } else if (str.includes('-')) {
    const p = str.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) { ano = +p[0]; mes = +p[1]; dia = +p[2]; }
      else { dia = +p[0]; mes = +p[1]; ano = +p[2]; }
    }
  }

  if (ano > 0 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
    if (ano < 100) ano += 2000;
    const iso = `${String(ano).padStart(4,'0')}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const dt = new Date(ano, mes - 1, dia);
    return {
      iso, ano, mes, dia,
      diaSemanaIdx: dt.getDay(),
      timestamp: dt.getTime(),
      labelBr: `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}`
    };
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    const a = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
    return {
      iso: `${String(a).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      ano: a, mes: m, dia: d,
      diaSemanaIdx: dt.getDay(),
      timestamp: dt.getTime(),
      labelBr: `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`
    };
  }
  return null;
}

export const MESES_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

/**
 * Extracts standard month label from any date string or object
 * If matching month already exists in mesesExistentes, prefers that format
 */
export function extrairMesDaData(dStr, mesesExistentes = []) {
  const dt = normalizarDataObj(dStr);
  if (!dt) return null;

  const nomeMes = MESES_PT[dt.mes - 1];
  const padraoComAno = `${nomeMes} ${dt.ano}`;
  const padraoBarra = `${nomeMes}/${dt.ano}`;

  // Check if existing list has an exact or near match
  for (const m of mesesExistentes) {
    const mUpper = String(m).toUpperCase().trim();
    if (mUpper === nomeMes || mUpper === padraoComAno || mUpper === padraoBarra) {
      return m;
    }
  }

  // If existing list only uses simple names like "JANEIRO", match by name
  const todosSimples = mesesExistentes.length > 0 && mesesExistentes.every(m => !/\d{4}/.test(m));
  if (todosSimples) {
    return nomeMes;
  }

  // Default: "JANEIRO 2026"
  return padraoComAno;
}

/**
 * Processes all global analysis indexes from raw bancoGeral records
 * Returns an object with all the computed maps used throughout the dashboard
 */
export function processarAnalisesGlobais(bancoGeral) {
  const relMeses = {};
  const relDias = {};
  const relCompBaseMes = {};
  const relCompBaseFalhaMes = {};
  const relCompRealMes = {};
  const relCompRealFalhaMes = {};
  const relMecMes = {};
  const relMecCompMes = {};
  const falhasGeraisCount = {};

  const sondasUnicas = new Set();
  const mecanicosUnicos = new Set();
  const compBaseUnicos = new Set();
  const compReaisUnicos = new Set();

  bancoGeral.forEach(row => {
    const compBase = limparNomeBase(row['Componentes'] || row['COMPONENTES']);
    const compReal = limparNomeReal(row['Componentes'] || row['COMPONENTES']);
    const falha = String(row['falhas'] || row['FALHAS'] || 'N/A').toUpperCase().trim();
    const mes = row['Aba_Origem'];
    const dia = row['Data_Limpa'];
    const mec = String(row['Mecânico'] || row['Mecanico'] || row['MECANICO'] || '').toUpperCase().trim();
    const sonda = normalizarSonda(row['Causa'] || row['CAUSA'] || '');

    sondasUnicas.add(sonda);
    mecanicosUnicos.add(mec);
    compBaseUnicos.add(compBase);
    compReaisUnicos.add(compReal);

    relMeses[mes] = (relMeses[mes] || 0) + 1;
    if (dia && dia !== 'S/D') relDias[dia] = (relDias[dia] || 0) + 1;
    falhasGeraisCount[falha] = (falhasGeraisCount[falha] || 0) + 1;

    // By base family
    if (!relCompBaseMes[compBase]) relCompBaseMes[compBase] = {};
    relCompBaseMes[compBase][mes] = (relCompBaseMes[compBase][mes] || 0) + 1;

    if (!relCompBaseFalhaMes[compBase]) relCompBaseFalhaMes[compBase] = {};
    if (!relCompBaseFalhaMes[compBase][falha]) relCompBaseFalhaMes[compBase][falha] = {};
    relCompBaseFalhaMes[compBase][falha][mes] = (relCompBaseFalhaMes[compBase][falha][mes] || 0) + 1;

    // By specific component/tag
    if (!relCompRealMes[compReal]) relCompRealMes[compReal] = {};
    relCompRealMes[compReal][mes] = (relCompRealMes[compReal][mes] || 0) + 1;

    if (!relCompRealFalhaMes[compReal]) relCompRealFalhaMes[compReal] = {};
    if (!relCompRealFalhaMes[compReal][falha]) relCompRealFalhaMes[compReal][falha] = {};
    relCompRealFalhaMes[compReal][falha][mes] = (relCompRealFalhaMes[compReal][falha][mes] || 0) + 1;

    // By mechanic
    if (!relMecMes[mec]) relMecMes[mec] = {};
    relMecMes[mec][mes] = (relMecMes[mec][mes] || 0) + 1;
    if (!relMecCompMes[mec]) relMecCompMes[mec] = {};
    if (!relMecCompMes[mec][mes]) relMecCompMes[mec][mes] = {};
    relMecCompMes[mec][mes][compReal] = (relMecCompMes[mec][mes][compReal] || 0) + 1;
  });

  const reincidenciaKPIs = calcularReincidencia(bancoGeral);
  const alertasSemanais = detectarAnomaliasSemanais(bancoGeral);

  return {
    relMeses, relDias,
    relCompBaseMes, relCompBaseFalhaMes,
    relCompRealMes, relCompRealFalhaMes,
    relMecMes, relMecCompMes,
    falhasGeraisCount,
    sondasUnicas: Array.from(sondasUnicas).sort(),
    mecanicosUnicos: Array.from(mecanicosUnicos).sort(),
    compBaseUnicos: Array.from(compBaseUnicos).sort(),
    compReaisUnicos: Array.from(compReaisUnicos).sort(),
    reincidenciaKPIs,
    alertasSemanais,
  };
}

/**
 * Reads an Excel workbook and returns { meses, dados, statsPorMes }
 * Automatically identifies months and days by OS start date,
 * allowing daily imports without requiring specific sheet names!
 */
export function parseExcelWorkbook(workbook, XLSXInstance, mesesExistentes = []) {
  const XLSX = XLSXInstance || window._XLSX;
  let dados = [];
  const mesesDetectadosSet = new Set();
  const contagemPorMes = {};
  let totalComDataDetectada = 0;

  const sheetNames = workbook.SheetNames || [];
  sheetNames.forEach(nomeAba => {
    const json = XLSX && XLSX.utils
      ? XLSX.utils.sheet_to_json(workbook.Sheets[nomeAba], { raw: false, dateNF: 'yyyy-mm-dd' })
      : [];

    json.forEach(row => {
      // Look for date in common column name variations
      const dataBruta =
        row['Início da OS'] ??
        row['INÍCIO DA OS'] ??
        row['Inicio da OS'] ??
        row['INICIO DA OS'] ??
        row['Data'] ??
        row['DATA'] ??
        row['Data Início'] ??
        row['DATA INÍCIO'] ??
        row['Data da OS'] ??
        '';

      const dtObj = normalizarDataObj(dataBruta);
      let mesFinal = '';

      if (dtObj) {
        totalComDataDetectada++;
        row['Data_Limpa'] = dtObj.iso;
        mesFinal = extrairMesDaData(dataBruta, mesesExistentes) || nomeAba;
      } else {
        row['Data_Limpa'] = String(dataBruta).split(' ')[0].split('T')[0] || 'S/D';
        // If sheet name looks like a month, use it; otherwise fallback
        mesFinal = nomeAba;
      }

      row['Aba_Origem'] = mesFinal;
      mesesDetectadosSet.add(mesFinal);
      contagemPorMes[mesFinal] = (contagemPorMes[mesFinal] || 0) + 1;
      dados.push(row);
    });
  });

  const meses = Array.from(mesesDetectadosSet);

  return {
    meses,
    dados,
    contagemPorMes,
    totalComDataDetectada,
    usouDetecaoPorData: totalComDataDetectada > 0
  };
}

export const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6',
  '#64748b', '#d946ef'
];

/**
 * Extrai um timestamp numérico seguro em milissegundos a partir de qualquer
 * objeto de evento ou data/hora (ISO, BR, timestamp, objeto).
 */
export function getEventoTimestamp(ev) {
  if (!ev) return 0;
  if (typeof ev.timestamp === 'number' && !isNaN(ev.timestamp) && ev.timestamp > 0) {
    return ev.timestamp;
  }
  const str = ev.dataHoraISO || ev.dataHora || ev.data;
  if (!str) return 0;
  if (typeof str === 'number' && !isNaN(str)) return str;

  // Formato ISO ou parse direto pelo Date
  const parsed = new Date(str).getTime();
  if (!isNaN(parsed) && parsed > 0) return parsed;

  // Formato brasileiro DD/MM/AAAA ou DD/MM/AAAA HH:mm
  if (typeof str === 'string' && str.includes('/')) {
    const [datePart, timePart] = str.split(' ');
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      let h = 0, min = 0;
      if (timePart && timePart.includes(':')) {
        const [hStr, mStr] = timePart.split(':');
        h = parseInt(hStr, 10) || 0;
        min = parseInt(mStr, 10) || 0;
      }
      const dt = new Date(y < 100 ? 2000 + y : y, m - 1, d, h, min, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  return 0;
}

/**
 * Reconcilia um componente ordenando seu histórico estritamente por data/hora decrescente
 * e definindo sua localização e sondaAtual baseadas na informação do evento mais recente.
 */
export function reconciliarComponente(comp) {
  if (!comp) return comp;
  const eventos = [...(comp.historico || [])];

  // Ordena do mais recente para o mais antigo com desempate por prioridade de evento
  const prioridadeEvento = {
    'ajuste_manual': 4,
    'entrou_sonda': 3,
    'conclusao_manutencao': 2,
    'saiu_sonda': 1
  };

  eventos.sort((a, b) => {
    const timeA = getEventoTimestamp(a);
    const timeB = getEventoTimestamp(b);
    if (timeB !== timeA) return timeB - timeA;
    // Desempate no mesmo minuto: prioridade do tipo de evento
    return (prioridadeEvento[b.tipoEvento] || 0) - (prioridadeEvento[a.tipoEvento] || 0);
  });

  const ultimoEvento = eventos[0];
  let localizacao = comp.localizacao || 'OFICINA_RESERVA';
  let sondaAtual = comp.sondaAtual || null;

  if (ultimoEvento) {
    switch (ultimoEvento.tipoEvento) {
      case 'entrou_sonda':
        localizacao = 'SONDA';
        sondaAtual = ultimoEvento.sonda || null;
        break;
      case 'saiu_sonda':
        localizacao = 'OFICINA_MANUTENCAO';
        sondaAtual = null;
        break;
      case 'conclusao_manutencao':
        localizacao = 'OFICINA_RESERVA';
        sondaAtual = null;
        break;
      case 'ajuste_manual':
        localizacao = ultimoEvento.novaLocalizacao || (ultimoEvento.sonda ? 'SONDA' : 'OFICINA_RESERVA');
        sondaAtual = localizacao === 'SONDA' ? (ultimoEvento.sonda || null) : null;
        break;
      default:
        break;
    }
  }

  return {
    ...comp,
    localizacao,
    sondaAtual,
    historico: eventos
  };
}

/**
 * Reconcilia uma lista de componentes com base no histórico completo de O.S. da Oficina
 * garantindo consistência temporal perfeita mesmo se ordens forem inseridas fora de ordem.
 */
export function sincronizarComponentesComOrdens(osOficinaList = [], componentesList = []) {
  const map = new Map();

  // 1. Inicializa o mapa com os componentes existentes, preservando ajustes manuais
  componentesList.forEach(c => {
    if (c && c.id) {
      map.set(c.id, {
        ...c,
        historico: [...(c.historico || [])]
      });
    }
  });

  // 2. Extrai eventos de todas as O.S. da Oficina
  osOficinaList.forEach(os => {
    const compFamilia = limparNomeBase(os.componente || '');
    if (!compFamilia || compFamilia === 'NÃO INFORMADO') return;

    const ts = getEventoTimestamp(os);
    const dataHoraIso = os.dataHoraISO || (os.data ? `${os.data}T${os.hora || '00:00'}:00` : new Date(ts).toISOString());

    // Evento de saída (peça que saiu da sonda com defeito)
    if (os.saiuNumero) {
      const compId = `${compFamilia}_${String(os.saiuNumero).trim()}`.replace(/\s+/g, '_');
      if (!map.has(compId)) {
        map.set(compId, {
          id: compId,
          tipo: compFamilia,
          numero: String(os.saiuNumero).trim(),
          historico: []
        });
      }
      const comp = map.get(compId);

      // Checa se evento já existe para não duplicar
      const jaExiste = comp.historico.some(e => e.osOficinaId === os.id && e.tipoEvento === 'saiu_sonda');
      if (!jaExiste) {
        comp.historico.push({
          dataHora: dataHoraIso,
          timestamp: ts,
          tipoEvento: 'saiu_sonda',
          sonda: os.sonda || '',
          osOficinaId: os.id,
          observacao: `Saiu da sonda ${os.sonda || '-'}. Problema: ${os.problema || 'Não especificado'}`
        });
      }

      // Se a OS está concluída, gera também o evento de conclusão
      if (os.status === 'concluida') {
        const jaConcluido = comp.historico.some(e => e.osOficinaId === os.id && e.tipoEvento === 'conclusao_manutencao');
        if (!jaConcluido) {
          const dtConc = os.dataConclusao || dataHoraIso;
          comp.historico.push({
            dataHora: dtConc,
            timestamp: getEventoTimestamp({ dataHora: dtConc }),
            tipoEvento: 'conclusao_manutencao',
            osOficinaId: os.id,
            osSodep: os.osSodepAssociada || null,
            observacao: os.osSodepAssociada
              ? `Associada à O.S. SODEP ${os.osSodepAssociada}. Manutenção finalizada e componente disponível na reserva.`
              : 'Manutenção concluída na oficina. Componente pronto na reserva.'
          });
        }
      }
    }

    // Evento de entrada (peça instalada na sonda)
    if (os.entrouNumero) {
      const compId = `${compFamilia}_${String(os.entrouNumero).trim()}`.replace(/\s+/g, '_');
      if (!map.has(compId)) {
        map.set(compId, {
          id: compId,
          tipo: compFamilia,
          numero: String(os.entrouNumero).trim(),
          historico: []
        });
      }
      const comp = map.get(compId);
      const jaExiste = comp.historico.some(e => e.osOficinaId === os.id && e.tipoEvento === 'entrou_sonda');
      if (!jaExiste) {
        comp.historico.push({
          dataHora: dataHoraIso,
          timestamp: ts,
          tipoEvento: 'entrou_sonda',
          sonda: os.sonda || '',
          osOficinaId: os.id,
          observacao: `Instalado na sonda ${os.sonda || '-'} (Turno ${os.turno || '-'}, Turma ${os.turma || '-'})`
        });
      }
    }
  });

  // 3. Reconcilia cada componente ordenando seu histórico e determinando a localização pela data mais recente
  const listaReconciliada = [];
  map.forEach(comp => {
    listaReconciliada.push(reconciliarComponente(comp));
  });

  return listaReconciliada.sort((a, b) => (a.tipo || '').localeCompare(b.tipo || ''));
}


