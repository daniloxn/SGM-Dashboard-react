// src/lib/whatsappParser.js
// Parser resiliente para mensagens de Ordem de Serviço enviadas no WhatsApp

/**
 * Normaliza o formato de sonda (ex: "14" -> "SD-14", "sd14" -> "SD-14")
 */
export function formatarSonda(sondaRaw) {
  if (!sondaRaw) return '';
  const limpo = String(sondaRaw).trim().toUpperCase();
  if (limpo.startsWith('SD-')) return limpo;
  if (limpo.startsWith('SD')) {
    const num = limpo.replace(/^SD\s*-?/i, '').trim();
    return `SD-${num.padStart(2, '0')}`;
  }
  const apenasNum = limpo.replace(/\D/g, '');
  if (apenasNum) {
    return `SD-${apenasNum.padStart(2, '0')}`;
  }
  return limpo;
}

/**
 * Converte data DD/MM/AAAA e hora HH:mm em objeto normalizado e string ISO
 */
export function formatarDataHora(dataStr, horaStr) {
  let dia = 1, mes = 1, ano = new Date().getFullYear();
  if (dataStr) {
    const partes = String(dataStr).trim().split(/[/\-.]/);
    if (partes.length === 3) {
      if (partes[0].length === 4) {
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        dia = parseInt(partes[2], 10);
      } else {
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        ano = parseInt(partes[2], 10);
      }
    }
  }

  let hora = 0, minuto = 0;
  if (horaStr) {
    const limpo = String(horaStr).trim().toLowerCase().replace(/h/g, ':');
    const partesHora = limpo.split(':');
    if (partesHora.length >= 2) {
      hora = parseInt(partesHora[0], 10) || 0;
      minuto = parseInt(partesHora[1], 10) || 0;
    }
  }

  if (ano < 100) ano += 2000;

  const dataFormatada = `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const horaFormatada = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  const dataHoraISO = `${dataFormatada}T${horaFormatada}:00`;
  const timestamp = new Date(ano, mes - 1, dia, hora, minuto, 0).getTime();

  return {
    data: dataFormatada,
    dataBr: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`,
    hora: horaFormatada,
    dataHoraISO,
    timestamp
  };
}

/**
 * Normaliza número do componente (remove "Nº", "N°", etc)
 */
function limparNumeroComponente(val) {
  if (!val) return '';
  const limpo = String(val)
    .replace(/[Nn][º°o.]?:?/g, '')
    .trim();
  if (limpo === '-' || limpo.toUpperCase() === 'N/A' || limpo.toUpperCase() === 'NÃO' || limpo.toUpperCase() === 'NAO') {
    return '';
  }
  return limpo;
}

/**
 * Faz o parse de uma única mensagem de O.S. do WhatsApp
 */
export function parseMensagemWhatsapp(texto) {
  if (!texto || typeof texto !== 'string') return null;

  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (linhas.length === 0) return null;

  const dados = {
    data: '',
    sonda: '',
    turno: '',
    turma: '',
    sondador: '',
    componente: '',
    saiuNumero: '',
    entrouNumero: '',
    problema: '',
    hora: ''
  };

  linhas.forEach(linha => {
    // Data: 11/09/2026
    const mData = linha.match(/^data\s*:\s*(.+)$/i);
    if (mData) dados.data = mData[1].trim();

    // Sonda: 14 ou SD-14
    const mSonda = linha.match(/^sonda\s*:\s*(.+)$/i);
    if (mSonda) dados.sonda = formatarSonda(mSonda[1].trim());

    // Turno: 3⁰ ou 3° ou 3
    const mTurno = linha.match(/^turno\s*:\s*(.+)$/i);
    if (mTurno) {
      let t = mTurno[1].trim().replace(/[º°o⁰\u2070]/g, '');
      dados.turno = t ? `${t}º` : '';
    }

    // Turma: A
    const mTurma = linha.match(/^turma\s*:\s*(.+)$/i);
    if (mTurma) dados.turma = mTurma[1].trim().toUpperCase();

    // Sondador: Marlon Lucas
    const mSondador = linha.match(/^sondador\s*:\s*(.+)$/i);
    if (mSondador) dados.sondador = mSondador[1].trim();

    // Componente: Freio de molas
    const mComponente = linha.match(/^componente\s*:\s*(.+)$/i);
    if (mComponente) dados.componente = mComponente[1].trim().toUpperCase();

    // Saiu N°: 01 ou Saiu: 01
    const mSaiu = linha.match(/^saiu(?:\s*[Nn][º°o.]?)?\s*:\s*(.+)$/i);
    if (mSaiu) dados.saiuNumero = limparNumeroComponente(mSaiu[1]);

    // Entrou: Nº: 05 ou Entrou N°: 05 ou Entrou: 05
    const mEntrou = linha.match(/^entrou(?:\s*[Nn][º°o.]?|\s*:\s*[Nn][º°o.]?)?\s*:\s*(.+)$/i);
    if (mEntrou) dados.entrouNumero = limparNumeroComponente(mEntrou[1]);

    // Problema: parafusos dos mordentes quebrados
    const mProblema = linha.match(/^(?:problema|falha|defeito)\s*:\s*(.+)$/i);
    if (mProblema) dados.problema = mProblema[1].trim();

    // Hora: 2:20 ou 02:20
    const mHora = linha.match(/^hora\s*:\s*(.+)$/i);
    if (mHora) dados.hora = mHora[1].trim();
  });

  // Se não encontrou pelo menos Sonda ou Componente ou Problema, não é uma O.S. válida
  if (!dados.sonda && !dados.componente && !dados.problema) {
    return null;
  }

  const dtInfo = formatarDataHora(dados.data, dados.hora);

  return {
    ...dados,
    data: dtInfo.data,
    dataBr: dtInfo.dataBr,
    hora: dtInfo.hora,
    dataHoraISO: dtInfo.dataHoraISO,
    timestamp: dtInfo.timestamp,
    status: 'aberta', // 'aberta' | 'em_manutencao' | 'concluida'
    osSodepAssociada: null,
    docSodepAssociadoId: null,
    dataConclusao: null,
    textoOriginal: texto
  };
}

/**
 * Processa um bloco de texto grande com uma ou múltiplas mensagens coladas
 */
export function extrairMultiplasMensagens(textoCompleto) {
  if (!textoCompleto || typeof textoCompleto !== 'string') return [];

  // Quebra por marcadores comuns de nova mensagem ou "ORDEM DE SERVIÇO"
  // Também suporta mensagens separadas por linhas em branco duplas
  const partes = textoCompleto.split(/(?=ORDEM\s+DE\s+SERVI[CÇ]O)/i);

  const mensagensParsed = [];

  partes.forEach(parte => {
    const limpo = parte.trim();
    if (!limpo) return;

    // Se dentro da parte ainda houver mais de uma mensagem separada por muitas quebras de linha
    const subPartes = limpo.split(/\n\s*\n(?=Data\s*:|Sonda\s*:)/i);
    subPartes.forEach(sub => {
      const parsed = parseMensagemWhatsapp(sub);
      if (parsed) {
        mensagensParsed.push({
          ...parsed,
          _tempId: `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
    });
  });

  // Se não conseguiu separar por marcadores, tenta parsear o texto inteiro direto
  if (mensagensParsed.length === 0) {
    const single = parseMensagemWhatsapp(textoCompleto);
    if (single) {
      mensagensParsed.push({
        ...single,
        _tempId: `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }
  }

  // Ordena por data e hora cronológica
  return mensagensParsed.sort((a, b) => a.timestamp - b.timestamp);
}
