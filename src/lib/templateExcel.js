// src/lib/templateExcel.js
import ExcelJS from 'exceljs';

/**
 * Gera e realiza o download do arquivo modelo oficial Excel (.xlsx)
 * contendo a estrutura de colunas exata esperada pelo SGM Dashboard.
 */
export async function baixarModeloExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGM - Sistema de Gestão de Manutenção';
  wb.created = new Date();
  wb.modified = new Date();

  // Cores do SGM
  const COR = {
    azulCabecalho: 'FF1E3A5F',
    azulLinhaPar: 'FFF0F7FF',
    branco: 'FFFFFFFF',
    cinzaBorda: 'FFD1D5DB',
    cinzaInstrucao: 'FFF8FAFC',
    textoEscuro: 'FF1E293B',
    textoMuted: 'FF64748B',
    verdeDestaque: 'FF059669',
  };

  function aplicarBorda(cell, estilo = 'thin', corArgb = COR.cinzaBorda) {
    const b = { style: estilo, color: { argb: corArgb } };
    cell.border = { top: b, left: b, bottom: b, right: b };
  }

  // ==========================================
  // ABA 1: PLANILHA DE DADOS (MODELO OFICIAL)
  // ==========================================
  const ws = wb.addWorksheet('DADOS_SGM', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Definição das colunas esperadas pelo parser
  const colunas = [
    { header: 'OS', key: 'os', width: 14 },
    { header: 'Início da OS', key: 'inicio', width: 20 },
    { header: 'Componentes', key: 'componentes', width: 32 },
    { header: 'falhas', key: 'falhas', width: 32 },
    { header: 'Causa', key: 'causa', width: 30 },
    { header: 'Mecânico', key: 'mecanico', width: 26 },
  ];

  ws.columns = colunas;

  // Estilização da linha de cabeçalho
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COR.branco } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.azulCabecalho } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    aplicarBorda(cell, 'medium', COR.azulCabecalho);
  });

  // Dados de Exemplo (para guiar o usuário com valores válidos)
  const exemplos = [
    {
      os: '1001',
      inicio: '15/09/2026',
      componentes: 'MANDRIL 01',
      falhas: 'VAZAMENTO DE ÓLEO',
      causa: 'MANUTENÇÃO SONDAGEM SD-01',
      mecanico: 'CARLOS SILVA',
    },
    {
      os: '1002',
      inicio: '15/09/2026',
      componentes: 'CABEÇOTE 02',
      falhas: 'DESGASTE EXCESSIVO',
      causa: 'MANUTENÇÃO SONDAGEM SD-03',
      mecanico: 'JOÃO SOUZA',
    },
    {
      os: '1003',
      inicio: '16/09/2026',
      componentes: 'FREIO DE MOLAS 01',
      falhas: 'PARAFUSOS QUEBRADOS',
      causa: 'MANUTENÇÃO SONDAGEM SD-14',
      mecanico: 'MARCOS LIMA',
    },
    {
      os: '1004',
      inicio: '16/09/2026',
      componentes: 'BOMBA D\'ÁGUA 01',
      falhas: 'TRAVAMENTO',
      causa: 'MANUTENÇÃO SONDAGEM SD-01',
      mecanico: 'CARLOS SILVA',
    },
    {
      os: '1005',
      inicio: '17/09/2026',
      componentes: 'GUINCHO PRINCIPAL 02',
      falhas: 'ROMPIMENTO DE CABO',
      causa: 'MANUTENÇÃO SONDAGEM SD-08',
      mecanico: 'ANTONIO PEREIRA',
    },
  ];

  exemplos.forEach((item, idx) => {
    const row = ws.addRow([
      item.os,
      item.inicio,
      item.componentes,
      item.falhas,
      item.causa,
      item.mecanico,
    ]);
    row.height = 20;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: COR.textoEscuro } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COR.azulLinhaPar : COR.branco }
      };
      // Alinhamento
      if (colNum === 1 || colNum === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      aplicarBorda(cell, 'thin');
    });
  });

  // ==========================================
  // ABA 2: INSTRUÇÕES DE PREENCHIMENTO
  // ==========================================
  const wsInfo = wb.addWorksheet('COMO_PREENCHER', { properties: { tabColor: { argb: 'FF059669' } } });
  wsInfo.columns = [
    { header: 'Coluna', width: 18 },
    { header: 'Obrigatório?', width: 16 },
    { header: 'Formato / Exemplo', width: 30 },
    { header: 'Descrição e Dica de Importação', width: 55 },
  ];

  const infoHeader = wsInfo.getRow(1);
  infoHeader.height = 28;
  infoHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COR.branco } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.verdeDestaque } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    aplicarBorda(cell, 'medium', COR.verdeDestaque);
  });

  const instrucoes = [
    ['OS', 'Sim', '1001, 10452', 'Número identificador único da Ordem de Serviço.'],
    ['Início da OS', 'Sim', 'DD/MM/AAAA ou AAAA-MM-DD', 'Data em que o serviço iniciou. O sistema agrupa meses e dias automaticamente por este campo!'],
    ['Componentes', 'Sim', 'MANDRIL 01, CABEÇOTE 02', 'Nome do componente e tag/numeração da peça física.'],
    ['falhas', 'Sim', 'VAZAMENTO, QUEBRA, DESGASTE', 'Descrição da anomalia ou defeito ocorrido no equipamento.'],
    ['Causa', 'Recomendado', 'MANUTENÇÃO SONDAGEM SD-01', 'Identificação da Sonda atendida (ex: SD-01, SD-14, etc.).'],
    ['Mecânico', 'Recomendado', 'CARLOS SILVA, JOÃO SOUZA', 'Nome do mecânico ou técnico que realizou o reparo.'],
  ];

  instrucoes.forEach((ins, i) => {
    const row = wsInfo.addRow(ins);
    row.height = 22;
    const isEven = i % 2 === 0;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: COR.textoEscuro } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COR.azulLinhaPar : COR.branco }
      };
      cell.alignment = { horizontal: colNum <= 2 ? 'center' : 'left', vertical: 'middle' };
      aplicarBorda(cell, 'thin');
    });
  });

  // Download do arquivo
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Modelo_Importacao_SGM.xlsx';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}
