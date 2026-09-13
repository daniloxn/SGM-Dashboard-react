// src/components/modals/AssociarSodepModal.jsx
import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import useStore from '../../store/useStore';
import { useFirestore } from '../../hooks/useFirestore';
import { normalizarSonda, limparNomeBase } from '../../lib/dataUtils';

export default function AssociarSodepModal({ open, onClose, osOficina, onSuccess }) {
  const { bancoGeral } = useStore();
  const { associarOsSodep } = useFirestore();

  const [busca, setBusca] = useState('');
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  // Timestamp de abertura da OS do WhatsApp
  const timeAbertura = useMemo(() => {
    if (!osOficina) return 0;
    const dt = new Date(osOficina.dataHoraISO || `${osOficina.data}T${osOficina.hora}:00`);
    return !isNaN(dt.getTime()) ? dt.getTime() : 0;
  }, [osOficina]);

  // Candidatas sugeridas automaticamente por Sonda e Componente com data posterior/igual
  const sugestoes = useMemo(() => {
    if (!osOficina || !bancoGeral) return [];

    const sondaAlvo = normalizarSonda(osOficina.sonda || '').toUpperCase();
    const compBaseAlvo = limparNomeBase(osOficina.componente || '');

    return bancoGeral
      .filter(r => {
        // Checar compatibilidade de sonda
        const sondaR = normalizarSonda(r['Causa'] || r['CAUSA'] || '').toUpperCase();
        const sondaMatch = sondaAlvo && sondaR && (sondaR.includes(sondaAlvo) || sondaAlvo.includes(sondaR));

        // Checar compatibilidade de componente
        const compBaseR = limparNomeBase(r['Componentes'] || r['COMPONENTES']);
        const compMatch = compBaseAlvo && compBaseR && (compBaseR.includes(compBaseAlvo) || compBaseAlvo.includes(compBaseR));

        return sondaMatch || compMatch;
      })
      .map(r => {
        // Obter timestamp da O.S. SODEP
        const dataStr = r['Início da OS'] || r['INÍCIO DA OS'] || r['Data_Limpa'] || '';
        const dt = new Date(dataStr);
        const ts = !isNaN(dt.getTime()) ? dt.getTime() : 0;
        const ePosterior = ts >= timeAbertura;

        return {
          ...r,
          _timestamp: ts,
          _eValida: ePosterior,
          _dataExibicao: dataStr || r['Data_Limpa'] || 'S/D'
        };
      })
      .sort((a, b) => {
        // Coloca as válidas primeiro, e mais recentes primeiro
        if (a._eValida && !b._eValida) return -1;
        if (!a._eValida && b._eValida) return 1;
        return a._timestamp - b._timestamp;
      })
      .slice(0, 15);
  }, [osOficina, bancoGeral, timeAbertura]);

  // Resultados de busca manual
  const resultadosBusca = useMemo(() => {
    if (!busca.trim() || !bancoGeral) return [];
    const termo = busca.trim().toUpperCase();

    return bancoGeral
      .filter(r => {
        const numOS = String(r['OS'] || '').toUpperCase();
        const comp = String(r['Componentes'] || r['COMPONENTES'] || '').toUpperCase();
        const sonda = String(r['Causa'] || r['CAUSA'] || '').toUpperCase();
        const mec = String(r['Mecânico'] || r['MECANICO'] || '').toUpperCase();
        return numOS.includes(termo) || comp.includes(termo) || sonda.includes(termo) || mec.includes(termo);
      })
      .map(r => {
        const dataStr = r['Início da OS'] || r['INÍCIO DA OS'] || r['Data_Limpa'] || '';
        const dt = new Date(dataStr);
        const ts = !isNaN(dt.getTime()) ? dt.getTime() : 0;
        const ePosterior = ts >= timeAbertura;
        return {
          ...r,
          _timestamp: ts,
          _eValida: ePosterior,
          _dataExibicao: dataStr || r['Data_Limpa'] || 'S/D'
        };
      })
      .slice(0, 15);
  }, [busca, bancoGeral, timeAbertura]);

  const listaExibicao = busca.trim() ? resultadosBusca : sugestoes;

  // Validação temporal do registro atualmente selecionado
  const validacaoTemporal = useMemo(() => {
    if (!registroSelecionado || !timeAbertura) return { ok: true, msg: '' };
    if (!registroSelecionado._eValida && registroSelecionado._timestamp > 0) {
      const dataSodep = new Date(registroSelecionado._timestamp).toLocaleString('pt-BR');
      const dataAbertura = new Date(timeAbertura).toLocaleString('pt-BR');
      return {
        ok: false,
        msg: `Inconsistência de horário: Esta O.S. SODEP possui data/hora (${dataSodep}) ANTERIOR à abertura da O.S. no WhatsApp (${dataAbertura}). Não é possível vincular!`
      };
    }
    return { ok: true, msg: '' };
  }, [registroSelecionado, timeAbertura]);

  async function handleConfirmarAssociacao() {
    if (!registroSelecionado || !validacaoTemporal.ok) return;
    setSalvando(true);
    setErro(null);

    try {
      const numOS = registroSelecionado['OS'] || 'SEM_NUMERO';
      const docId = registroSelecionado._docId || null;
      await associarOsSodep(osOficina.id, numOS, docId, registroSelecionado);
      if (onSuccess) onSuccess();
      handleFechar();
    } catch (err) {
      console.error('Erro ao associar:', err);
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleFechar() {
    setBusca('');
    setRegistroSelecionado(null);
    setErro(null);
    onClose();
  }

  if (!osOficina) return null;

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="🔗 Associar O.S. Aberta à O.S. Fechada (SODEP)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Card de Resumo da O.S. WhatsApp (Aberta) */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
              📋 O.S. Aberta (WhatsApp)
            </span>
            <span className="bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded text-[10px]">
              Aguardando Fechamento
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Data & Hora Abertura:</span>
              <strong className="text-white">
                {osOficina.dataBr || osOficina.data} às {osOficina.hora}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Sonda:</span>
              <strong className="text-white">{osOficina.sonda || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Componente:</span>
              <strong className="text-white">{osOficina.componente || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Peça Saiu / Entrou:</span>
              <strong className="text-white">
                {osOficina.saiuNumero ? `Saiu: ${osOficina.saiuNumero}` : 'Saiu: -'}
                {osOficina.entrouNumero ? ` | Entrou: ${osOficina.entrouNumero}` : ''}
              </strong>
            </div>
          </div>

          <div className="pt-1 text-slate-400">
            <span className="text-slate-500">Problema: </span>
            <span className="text-slate-200">{osOficina.problema || '-'}</span>
          </div>
        </div>

        {/* Alerta de erro */}
        {erro && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
            <span>⚠️ {erro}</span>
            <button onClick={() => setErro(null)} className="text-red-300 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Campo de Busca de O.S. SODEP */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Localizar O.S. Fechada do SODEP:
          </label>
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Digite o número da O.S., componente, mecânico ou sonda..."
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {busca.trim()
              ? `Resultados para "${busca}":`
              : '💡 Sugestões automáticas por compatibilidade de sonda e componente:'}
          </p>
        </div>

        {/* Lista de O.S. SODEP Selecionáveis */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {listaExibicao.length > 0 ? (
            listaExibicao.map((r, i) => {
              const selecionado = registroSelecionado && registroSelecionado['OS'] === r['OS'];
              return (
                <div
                  key={r._docId || i}
                  onClick={() => setRegistroSelecionado(r)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selecionado
                      ? 'bg-blue-600/20 border-blue-500 shadow-md'
                      : r._eValida
                      ? 'bg-slate-900/60 border-white/5 hover:border-blue-500/40 hover:bg-slate-800/80'
                      : 'bg-red-950/20 border-red-500/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span className="text-blue-400">O.S. {r['OS'] || 'S/N'}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({r['Aba_Origem'] || 'Mês'})
                      </span>
                    </span>

                    {r._eValida ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                        ✓ Horário Válido
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-500/20 text-red-300 font-semibold px-2 py-0.5 rounded border border-red-500/30" title="Data/hora anterior à abertura">
                        ✕ Anterior à Abertura
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500">Início: </span>
                      <strong>{r._dataExibicao}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Sonda: </span>
                      <strong>{normalizarSonda(r['Causa'] || r['CAUSA']) || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Mecânico: </span>
                      <strong>{r['Mecânico'] || r['MECANICO'] || '-'}</strong>
                    </div>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3">
                    <span>Peça: <strong className="text-slate-200">{r['Componentes'] || r['COMPONENTES'] || '-'}</strong></span>
                    <span>Falha: <strong className="text-slate-200">{r['falhas'] || r['FALHAS'] || '-'}</strong></span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma O.S. SODEP encontrada com esses filtros. Digite o número da O.S. acima para buscar.
            </div>
          )}
        </div>

        {/* Alerta de Inconsistência Temporal */}
        {!validacaoTemporal.ok && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🚫</span> Associação Bloqueada
            </p>
            <p>{validacaoTemporal.msg}</p>
          </div>
        )}

        {/* Rodapé com botões de ação */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="text-xs text-slate-400">
            {registroSelecionado ? (
              <span>
                Selecionada: <strong className="text-white">O.S. {registroSelecionado['OS']}</strong>
              </span>
            ) : (
              <span className="text-slate-500">Selecione uma O.S. acima</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFechar}
              disabled={salvando}
              className="btn-secondary text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarAssociacao}
              disabled={!registroSelecionado || !validacaoTemporal.ok || salvando}
              className="btn-primary text-xs font-semibold flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Concluindo e Associando...
                </>
              ) : (
                <>
                  <span>✅</span> Concluir e Vincular O.S.
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
