// src/lib/exportExcel.js
import ExcelJS from 'exceljs';
import { normalizarDataObj, limparNomeReal } from './dataUtils';
import { renderEvolutionChartPng, renderHorizontalBarChartPng, renderVerticalBarChartPng } from './chartCanvas';

export async function exportarRelatorioExcel({ bancoGeral, ordemMeses, relMeses, relCompBaseMes }) {
  if (!bancoGeral || bancoGeral.length === 0) {
    throw new Error('Nenhum dado carregado para exportar.');
  }

  const COR = {
    azulEscuro:   'FF1E3A5F',
    azulMedio:    'FF2563A8',
    azulClaro:    'FFD6E4F7',
    azulPale:     'FFEAF3FB',
    verdeEscuro:  'FF145A32',
    verdeClaro:   'FFD5F5E3',
    amareloClaro: 'FFFFF9C4',
    laranjaClaro: 'FFFDE8D8',
    vermelho:     'FFC0392B',
    vermelhoClaro:'FFFBE9E7',
    cinzaBorda:   'FFBDBDBD',
    branco:       'FFFFFFFF',
    textoEscuro:  'FF212121',
  };

  function colParaLetra(c) {
    let letra = '';
    while (c > 0) {
      let mod = (c - 1) % 26;
      letra = String.fromCharCode(65 + mod) + letra;
      c = Math.floor((c - mod) / 26);
    }
    return letra || 'A';
  }

  function aplicarBorda(cell, estilo) {
    const b = { style: estilo || 'thin', color: { argb: COR.cinzaBorda } };
    cell.border = { top: b, left: b, bottom: b, right: b };
  }

  function hdr(ws, row, col, value, bgColor, fontColor, bold, sz, hAlign) {
    const cell = ws.getCell(row, col);
    cell.value     = value;
    cell.font      = { name: 'Calibri', size: sz || 11, bold: !!bold, color: { argb: fontColor || COR.textoEscuro } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor || COR.branco } };
    cell.alignment = { horizontal: hAlign || 'center', vertical: 'middle', wrapText: false };
    aplicarBorda(cell, 'thin');
    return cell;
  }

  function dat(ws, row, col, value, isEven, numFmt, hAlign) {
    const cell = ws.getCell(row, col);
    cell.value     = value;
    cell.font      = { name: 'Calibri', size: 10, color: { argb: COR.textoEscuro } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COR.azulPale : COR.branco } };
    cell.alignment = { horizontal: hAlign || 'left', vertical: 'middle' };
    aplicarBorda(cell, 'hair');
    if (numFmt) cell.numFmt = numFmt;
    return cell;
  }

  const meses = ordemMeses || [];
  const totalOS = bancoGeral.length;
  const sondasSet = new Set(bancoGeral.map(r => String(r['Causa'] || '').match(/(SD-\d+)/)?.[1]).filter(Boolean));
  const sondasList = [...sondasSet].sort();
  const mecSet = new Set(bancoGeral.map(r => r['Mecânico'] || r['MECANICO']).filter(Boolean));

  // Famílias ordenadas por volume
  const familias = Object.keys(relCompBaseMes || {}).sort((a, b) =>
    Object.values(relCompBaseMes[b] || {}).reduce((s, v) => s + v, 0) -
    Object.values(relCompBaseMes[a] || {}).reduce((s, v) => s + v, 0)
  );

  // Mecânicos
  const mecData = {};
  bancoGeral.forEach(r => {
    const mec = r['Mecânico'] || r['MECANICO'] || 'Não informado';
    if (!mecData[mec]) mecData[mec] = { total: 0, meses: {} };
    mecData[mec].total++;
    const mes = r['Aba_Origem'] || '';
    mecData[mec].meses[mes] = (mecData[mec].meses[mes] || 0) + 1;
  });
  const mecsOrd = Object.keys(mecData).sort((a, b) => mecData[b].total - mecData[a].total);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGM - Sistema de Gestão de Manutenção';
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Resumo Geral
  const wsRes = wb.addWorksheet('Resumo Geral', { properties: { tabColor: { argb: 'FF1E3A5F' } } });
  wsRes.views = [{ state: 'frozen', ySplit: 5 }];

  wsRes.mergeCells('A1:H1');
  hdr(wsRes, 1, 1, 'SGM — RELATÓRIO DE MANUTENÇÃO SEMESTRAL', COR.azulEscuro, COR.branco, true, 18, 'center');
  wsRes.getRow(1).height = 42;

  wsRes.mergeCells('A2:H2');
  hdr(wsRes, 2, 1,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}   |   Total de O.S.: ${totalOS}   |   Sondas: ${sondasList.length}   |   Mecânicos: ${mecSet.size}`,
    COR.azulMedio, COR.branco, false, 10, 'center');
  wsRes.getRow(2).height = 20;
  wsRes.getRow(3).height = 8;

  const kpis = [
    ['Total de O.S.', totalOS, COR.azulEscuro],
    ['Sondas Ativas', sondasList.length, COR.azulMedio],
    ['Mecânicos', mecSet.size, COR.verdeEscuro],
    ['Famílias', familias.length, COR.vermelho],
  ];
  kpis.forEach((k, i) => {
    const col = i * 2 + 1;
    wsRes.mergeCells(4, col, 4, col + 1);
    hdr(wsRes, 4, col, k[0], k[2], COR.branco, false, 9, 'center');
    wsRes.mergeCells(5, col, 5, col + 1);
    hdr(wsRes, 5, col, k[1], COR.azulClaro, k[2], true, 22, 'center');
  });
  wsRes.getRow(4).height = 18;
  wsRes.getRow(5).height = 36;
  [14, 12, 14, 12, 14, 12, 14, 12].forEach((w, i) => { wsRes.getColumn(i + 1).width = w; });

  let rRow = 7;
  wsRes.mergeCells(rRow, 1, rRow, 4);
  hdr(wsRes, rRow, 1, 'DISTRIBUIÇÃO MENSAL DE ORDENS DE SERVIÇO', COR.azulEscuro, COR.branco, true, 12, 'left');
  wsRes.getRow(rRow).height = 22;
  rRow++;

  hdr(wsRes, rRow, 1, 'Mês', COR.azulMedio, COR.branco, true, 10);
  hdr(wsRes, rRow, 2, 'Total O.S.', COR.azulMedio, COR.branco, true, 10);
  hdr(wsRes, rRow, 3, '% do Total', COR.azulMedio, COR.branco, true, 10);
  hdr(wsRes, rRow, 4, 'Barra Relativa', COR.azulMedio, COR.branco, true, 10);
  wsRes.getRow(rRow).height = 18;
  rRow++;

  meses.forEach((mes, idx) => {
    const qt = (relMeses || {})[mes] || 0;
    const pct = totalOS > 0 ? qt / totalOS : 0;
    const isEven = idx % 2 === 0;
    dat(wsRes, rRow, 1, mes, isEven, null, 'left');
    dat(wsRes, rRow, 2, qt, isEven, '#,##0', 'center');
    dat(wsRes, rRow, 3, pct, isEven, '0.0%', 'center');
    const bar = wsRes.getCell(rRow, 4);
    bar.value = '\u2588'.repeat(Math.round(pct * 20));
    bar.font = { name: 'Calibri', size: 10, color: { argb: COR.azulMedio } };
    bar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COR.azulPale : COR.branco } };
    bar.alignment = { horizontal: 'left', vertical: 'middle' };
    aplicarBorda(bar, 'hair');
    wsRes.getRow(rRow).height = 17;
    rRow++;
  });

  hdr(wsRes, rRow, 1, 'TOTAL', COR.azulEscuro, COR.branco, true, 11);
  hdr(wsRes, rRow, 2, totalOS, COR.azulEscuro, COR.branco, true, 11);
  hdr(wsRes, rRow, 3, '100%', COR.azulEscuro, COR.branco, true, 11);
  hdr(wsRes, rRow, 4, '', COR.azulEscuro, COR.branco, false, 11);
  wsRes.getRow(rRow).height = 20;

  // Gráfico de Linha (Evolução Mensal) no Resumo Geral
  try {
    const imgEvolucao = renderEvolutionChartPng({
      labels: meses,
      values: meses.map(m => (relMeses || {})[m] || 0),
      title: '📈 Evolução Mensal de Ordens de Serviço'
    });
    const imgIdEvolucao = wb.addImage({
      base64: imgEvolucao,
      extension: 'png',
    });
    wsRes.addImage(imgIdEvolucao, {
      tl: { col: 4.3, row: 6 },
      ext: { width: 500, height: 235 }
    });
  } catch (e) {
    console.warn('Erro ao gerar gráfico de evolução:', e);
  }

  // 2. Famílias
  const wsFam = wb.addWorksheet('Familias', { properties: { tabColor: { argb: 'FF2563A8' } } });
  wsFam.views = [{ state: 'frozen', ySplit: 3 }];
  const ultColFam = colParaLetra(4 + meses.length);
  wsFam.mergeCells(`A1:${ultColFam}1`);
  hdr(wsFam, 1, 1, 'FAMÍLIAS DE COMPONENTES — RANKING POR VOLUME DE O.S.', COR.azulEscuro, COR.branco, true, 14, 'center');
  wsFam.getRow(1).height = 32;

  wsFam.mergeCells(`A2:${ultColFam}2`);
  hdr(wsFam, 2, 1, `Período: ${meses[0] || '?'} a ${meses[meses.length - 1] || '?'}   |   Total: ${totalOS} O.S.`, COR.azulMedio, COR.branco, false, 10, 'center');
  wsFam.getRow(2).height = 18;

  ['#', 'Família de Componente', 'Total O.S.', '% Total', ...meses].forEach((h, i) => {
    hdr(wsFam, 3, i + 1, h, COR.azulEscuro, COR.branco, true, 10, 'center');
  });
  wsFam.getRow(3).height = 20;
  wsFam.getColumn(1).width = 5;
  wsFam.getColumn(2).width = 42;
  wsFam.getColumn(3).width = 12;
  wsFam.getColumn(4).width = 10;
  for (let m = 0; m < meses.length; m++) wsFam.getColumn(5 + m).width = 10;

  let fRow = 4;
  familias.forEach((fam, idx) => {
    const isEven = idx % 2 === 0;
    const totFam = Object.values(relCompBaseMes[fam] || {}).reduce((s, v) => s + v, 0);
    const pct = totalOS > 0 ? totFam / totalOS : 0;
    const bg = idx === 0 ? COR.laranjaClaro : idx === 1 ? COR.amareloClaro : idx === 2 ? COR.azulClaro : (isEven ? COR.azulPale : COR.branco);

    dat(wsFam, fRow, 1, idx + 1, isEven, null, 'center');
    const famCell = wsFam.getCell(fRow, 2);
    famCell.value = fam;
    famCell.font = { name: 'Calibri', size: 10, bold: idx < 3, color: { argb: idx < 3 ? COR.azulMedio : COR.textoEscuro } };
    famCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    famCell.alignment = { horizontal: 'left', vertical: 'middle' };
    aplicarBorda(famCell, 'hair');

    dat(wsFam, fRow, 3, totFam, isEven, '#,##0', 'center');
    dat(wsFam, fRow, 4, pct, isEven, '0.0%', 'center');

    meses.forEach((mes, mi) => {
      const v = (relCompBaseMes[fam] || {})[mes] || 0;
      const c = dat(wsFam, fRow, 5 + mi, v || '', isEven, v ? '#,##0' : null, 'center');
      if (v > 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    });

    wsFam.getRow(fRow).height = 17;
    fRow++;
  });

  hdr(wsFam, fRow, 1, '', COR.azulEscuro, COR.branco, true);
  hdr(wsFam, fRow, 2, 'TOTAL GERAL', COR.azulEscuro, COR.branco, true, 11, 'left');
  hdr(wsFam, fRow, 3, totalOS, COR.azulEscuro, COR.branco, true, 11, 'center');
  hdr(wsFam, fRow, 4, '100%', COR.azulEscuro, COR.branco, true, 11, 'center');
  meses.forEach((mes, mi) => {
    const tot = familias.reduce((s, fam) => s + ((relCompBaseMes[fam] || {})[mes] || 0), 0);
    hdr(wsFam, fRow, 5 + mi, tot || '', COR.azulEscuro, COR.branco, true, 10, 'center');
  });
  wsFam.getRow(fRow).height = 20;

  // Gráfico Top Famílias
  try {
    const imgFam = renderHorizontalBarChartPng({
      items: familias.slice(0, 8).map(fam => ({
        label: fam,
        value: Object.values(relCompBaseMes[fam] || {}).reduce((s, v) => s + v, 0)
      })),
      title: '🔩 Top Famílias com Maior Volume de O.S.',
      color: '#2563eb'
    });
    const imgIdFam = wb.addImage({
      base64: imgFam,
      extension: 'png',
    });
    wsFam.addImage(imgIdFam, {
      tl: { col: 5 + meses.length + 0.5, row: 2 },
      ext: { width: 500, height: 260 }
    });
  } catch (e) {
    console.warn('Erro ao gerar gráfico de famílias:', e);
  }

  // 3. Defeitos
  const wsDef = wb.addWorksheet('Defeitos', { properties: { tabColor: { argb: 'FFC0392B' } } });
  wsDef.views = [{ state: 'frozen', ySplit: 2 }];
  wsDef.getColumn(1).width = 46;
  wsDef.getColumn(2).width = 14;
  wsDef.getColumn(3).width = 14;
  wsDef.getColumn(4).width = 14;

  wsDef.mergeCells('A1:D1');
  hdr(wsDef, 1, 1, 'DEFEITOS POR FAMÍLIA DE COMPONENTE', COR.vermelho, COR.branco, true, 14, 'center');
  wsDef.getRow(1).height = 30;

  // Gráfico Top Falhas no topo da aba Defeitos
  try {
    const todasFalhas = {};
    bancoGeral.forEach(r => {
      const f = String(r['falhas'] || r['FALHAS'] || 'NÃO INFORMADO').toUpperCase().trim();
      todasFalhas[f] = (todasFalhas[f] || 0) + 1;
    });
    const imgFalhas = renderHorizontalBarChartPng({
      items: Object.entries(todasFalhas).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })),
      title: '🔴 Top Tipos de Falhas Recorrentes',
      color: '#dc2626'
    });
    const imgIdFalhas = wb.addImage({
      base64: imgFalhas,
      extension: 'png',
    });
    wsDef.addImage(imgIdFalhas, {
      tl: { col: 4.5, row: 1 },
      ext: { width: 480, height: 260 }
    });
  } catch (e) {
    console.warn('Erro ao gerar gráfico de defeitos:', e);
  }

  ['Família / Tipo de Defeito', 'Qtd. O.S.', '% na Família', '% no Total'].forEach((h, i) => {
    hdr(wsDef, 2, i + 1, h, COR.azulEscuro, COR.branco, true, 10, i === 0 ? 'left' : 'center');
  });
  wsDef.getRow(2).height = 18;

  let dRow = 3;
  familias.forEach(fam => {
    const totFam = Object.values(relCompBaseMes[fam] || {}).reduce((s, v) => s + v, 0);
    wsDef.mergeCells(dRow, 1, dRow, 4);
    const famCell2 = wsDef.getCell(dRow, 1);
    famCell2.value = '\u25B6  ' + fam + '  (' + totFam + ' O.S.)';
    famCell2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COR.branco } };
    famCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.azulMedio } };
    famCell2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    famCell2.border = { bottom: { style: 'medium', color: { argb: COR.azulEscuro } } };
    wsDef.getRow(dRow).height = 20;
    dRow++;

    const falhasMap = {};
    bancoGeral.forEach(r => {
      const compBase = String(r['Componentes'] || r['COMPONENTES'] || '').toUpperCase();
      if (compBase.includes(fam)) {
        const f = String(r['falhas'] || r['FALHAS'] || 'NÃO INFORMADO').toUpperCase();
        falhasMap[f] = (falhasMap[f] || 0) + 1;
      }
    });
    const falhasOrd = Object.entries(falhasMap).sort((a, b) => b[1] - a[1]);

    falhasOrd.forEach(([falha, qt], idx) => {
      const isEven = idx % 2 === 0;
      const pctFam = totFam > 0 ? qt / totFam : 0;
      const pctTot = totalOS > 0 ? qt / totalOS : 0;
      dat(wsDef, dRow, 1, '    ' + falha, isEven, null, 'left');
      dat(wsDef, dRow, 2, qt, isEven, '#,##0', 'center');
      dat(wsDef, dRow, 3, pctFam, isEven, '0.0%', 'center');
      dat(wsDef, dRow, 4, pctTot, isEven, '0.0%', 'center');
      if (idx === 0) {
        [1, 2, 3, 4].forEach(c => {
          const cel = wsDef.getCell(dRow, c);
          cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.vermelhoClaro } };
          cel.font = { ...cel.font, bold: true, color: { argb: COR.vermelho } };
        });
      }
      wsDef.getRow(dRow).height = 16;
      dRow++;
    });
    wsDef.getRow(dRow).height = 6;
    dRow++;
  });

  // 4. Equipe
  const wsMec = wb.addWorksheet('Equipe', { properties: { tabColor: { argb: 'FF145A32' } } });
  wsMec.views = [{ state: 'frozen', ySplit: 2 }];
  const ultColMec = colParaLetra(4 + meses.length);
  wsMec.mergeCells(`A1:${ultColMec}1`);
  hdr(wsMec, 1, 1, 'DESEMPENHO DA EQUIPE DE MECÂNICOS', COR.verdeEscuro, COR.branco, true, 14, 'center');
  wsMec.getRow(1).height = 30;

  ['#', 'Mecânico', 'Total O.S.', '% Total', ...meses].forEach((h, i) => {
    hdr(wsMec, 2, i + 1, h, COR.verdeEscuro, COR.branco, true, 10, 'center');
  });
  wsMec.getRow(2).height = 20;
  wsMec.getColumn(1).width = 5;
  wsMec.getColumn(2).width = 32;
  wsMec.getColumn(3).width = 12;
  wsMec.getColumn(4).width = 10;
  for (let m = 0; m < meses.length; m++) wsMec.getColumn(5 + m).width = 10;

  let mRow = 3;
  mecsOrd.forEach((mec, idx) => {
    const isEven = idx % 2 === 0;
    const tot = mecData[mec].total;
    const pct = totalOS > 0 ? tot / totalOS : 0;
    dat(wsMec, mRow, 1, idx + 1, isEven, null, 'center');
    const mecCell = wsMec.getCell(mRow, 2);
    mecCell.value = mec;
    mecCell.font = { name: 'Calibri', size: 10, bold: idx < 3, color: { argb: idx < 3 ? COR.verdeEscuro : COR.textoEscuro } };
    mecCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COR.verdeClaro : COR.branco } };
    mecCell.alignment = { horizontal: 'left', vertical: 'middle' };
    aplicarBorda(mecCell, 'hair');

    dat(wsMec, mRow, 3, tot, isEven, '#,##0', 'center');
    dat(wsMec, mRow, 4, pct, isEven, '0.0%', 'center');

    meses.forEach((mes, mi) => {
      const v = mecData[mec].meses[mes] || 0;
      const c = dat(wsMec, mRow, 5 + mi, v || '', isEven, v ? '#,##0' : null, 'center');
      if (v > 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COR.verdeClaro : COR.branco } };
    });
    wsMec.getRow(mRow).height = 17;
    mRow++;
  });

  hdr(wsMec, mRow, 1, '', COR.verdeEscuro, COR.branco, true);
  hdr(wsMec, mRow, 2, 'TOTAL GERAL', COR.verdeEscuro, COR.branco, true, 11, 'left');
  hdr(wsMec, mRow, 3, totalOS, COR.verdeEscuro, COR.branco, true, 11, 'center');
  hdr(wsMec, mRow, 4, '100%', COR.verdeEscuro, COR.branco, true, 11, 'center');
  meses.forEach((mes, mi) => {
    const tot = mecsOrd.reduce((s, m) => s + (mecData[m].meses[mes] || 0), 0);
    hdr(wsMec, mRow, 5 + mi, tot || '', COR.verdeEscuro, COR.branco, true, 10, 'center');
  });
  wsMec.getRow(mRow).height = 20;

  // Gráfico de Produtividade dos Mecânicos
  try {
    const imgMec = renderVerticalBarChartPng({
      items: mecsOrd.slice(0, 8).map(m => ({ label: m, value: mecData[m].total })),
      title: '👷 Produtividade por Mecânico (Total O.S.)',
      color: '#059669'
    });
    const imgIdMec = wb.addImage({
      base64: imgMec,
      extension: 'png',
    });
    wsMec.addImage(imgIdMec, {
      tl: { col: 5 + meses.length + 0.5, row: 2 },
      ext: { width: 480, height: 260 }
    });
  } catch (e) {
    console.warn('Erro ao gerar gráfico de equipe:', e);
  }

  // 5. Registros Completos
  const wsReg = wb.addWorksheet('Registros', { properties: { tabColor: { argb: 'FF616161' } } });
  wsReg.views = [{ state: 'frozen', ySplit: 2 }];

  wsReg.mergeCells('A1:G1');
  hdr(wsReg, 1, 1, `REGISTRO COMPLETO DE ORDENS DE SERVIÇO (${totalOS} registros)`, COR.azulEscuro, COR.branco, true, 13, 'center');
  wsReg.getRow(1).height = 28;

  const regHdrs = ['O.S.', 'Data', 'Mês', 'Componente', 'Tipo de Defeito', 'Sonda', 'Mecânico'];
  const regWidths = [10, 14, 14, 40, 45, 10, 25];
  regHdrs.forEach((h, i) => {
    hdr(wsReg, 2, i + 1, h, COR.azulEscuro, COR.branco, true, 10, 'center');
    wsReg.getColumn(i + 1).width = regWidths[i];
  });
  wsReg.getRow(2).height = 18;

  const registrosOrd = [...bancoGeral].sort((a, b) => {
    const dA = normalizarDataObj(String(a['Data_Limpa'] || ''));
    const dB = normalizarDataObj(String(b['Data_Limpa'] || ''));
    return (dA ? dA.timestamp : 0) - (dB ? dB.timestamp : 0);
  });

  let regRow = 3;
  registrosOrd.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const sonda = String(r['Causa'] || '').match(/(SD-\d+)/)?.[1] || String(r['Causa'] || '').trim();
    dat(wsReg, regRow, 1, r['OS'] || '-', isEven, null, 'center');
    dat(wsReg, regRow, 2, r['Data_Limpa'] || '-', isEven, null, 'center');
    dat(wsReg, regRow, 3, r['Aba_Origem'] || '-', isEven, null, 'center');
    dat(wsReg, regRow, 4, limparNomeReal(r['Componentes']) || '-', isEven, null, 'left');
    dat(wsReg, regRow, 5, r['falhas'] || r['FALHAS'] || '-', isEven, null, 'left');
    dat(wsReg, regRow, 6, sonda, isEven, null, 'center');
    dat(wsReg, regRow, 7, r['Mecânico'] || r['MECANICO'] || '-', isEven, null, 'left');
    wsReg.getRow(regRow).height = 15;
    regRow++;
  });

  // Download
  const nomeArq = `SGM_Relatorio_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArq;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 1000);
}

