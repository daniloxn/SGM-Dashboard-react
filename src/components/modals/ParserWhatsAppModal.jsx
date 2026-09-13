// src/components/modals/ParserWhatsAppModal.jsx
import { useState } from 'react';
import Modal from '../ui/Modal';
import { extrairMultiplasMensagens } from '../../lib/whatsappParser';
import { useFirestore } from '../../hooks/useFirestore';

export default function ParserWhatsAppModal({ open, onClose, onSuccess }) {
  const { salvarNovasOsOficina } = useFirestore();
  const [textoColado, setTextoColado] = useState('');
  const [mensagensRevisao, setMensagensRevisao] = useState([]);
  const [etapa, setEtapa] = useState('input'); // 'input' | 'review'
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const exemploMensagem = `ORDEM DE SERVIÇO 

Data: 11/09/2026
Sonda: 14
Turno: 3⁰
Turma: A
Sondador: Marlon Lucas
Componente: Freio de molas 
Saiu N°: 01
Entrou: Nº: 05
Problema: parafusos dos mordentes quebrados 
Hora: 2:20`;

  function handleProcessar() {
    setErro(null);
    if (!textoColado.trim()) {
      setErro('Por favor, cole ao menos uma mensagem de Ordem de Serviço.');
      return;
    }

    const resultado = extrairMultiplasMensagens(textoColado);
    if (resultado.length === 0) {
      setErro('Não foi possível identificar nenhuma Ordem de Serviço no texto. Verifique o formato e tente novamente.');
      return;
    }

    setMensagensRevisao(resultado);
    setEtapa('review');
  }

  function handleCampoChange(index, campo, valor) {
    setMensagensRevisao(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  }

  function handleRemoverItem(index) {
    setMensagensRevisao(prev => prev.filter((_, i) => i !== index));
  }

  function handleAdicionarManual() {
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().slice(0, 5);
    setMensagensRevisao(prev => [
      ...prev,
      {
        _tempId: `tmp_${Date.now()}`,
        data: hoje,
        hora: agora,
        sonda: 'SD-01',
        turno: '1º',
        turma: 'A',
        sondador: '',
        componente: '',
        saiuNumero: '',
        entrouNumero: '',
        problema: '',
        status: 'aberta'
      }
    ]);
  }

  async function handleConfirmarSalvar() {
    if (mensagensRevisao.length === 0) return;
    setSalvando(true);
    setErro(null);

    try {
      await salvarNovasOsOficina(mensagensRevisao);
      if (onSuccess) onSuccess();
      handleFechar();
    } catch (err) {
      console.error('Erro ao salvar O.S.:', err);
      setErro('Erro ao salvar no banco de dados: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleFechar() {
    setTextoColado('');
    setMensagensRevisao([]);
    setEtapa('input');
    setErro(null);
    onClose();
  }

  const inputClass = "w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="📲 Lançamento de O.S. WhatsApp & Oficina"
      size="xl"
    >
      {erro && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
          <span>⚠️ {erro}</span>
          <button onClick={() => setErro(null)} className="text-red-300 font-bold ml-2">✕</button>
        </div>
      )}

      {etapa === 'input' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Cole abaixo uma ou várias mensagens enviadas no grupo do WhatsApp. O sistema detectará automaticamente as O.S., turnos, turmas, peças e horários.
            </p>
            <button
              type="button"
              onClick={() => setTextoColado(exemploMensagem)}
              className="text-xs text-blue-400 hover:text-blue-300 underline font-medium shrink-0 ml-2"
            >
              Colar exemplo
            </button>
          </div>

          <textarea
            value={textoColado}
            onChange={e => setTextoColado(e.target.value)}
            rows={10}
            placeholder="Cole o texto aqui... (ex: ORDEM DE SERVIÇO, Data: 11/09/2026, Sonda: 14, Turno: 3⁰, Componente: Freio de molas, Saiu: 01, Entrou: 05...)"
            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500">
              💡 Dica: Você pode colar múltiplas mensagens de uma única vez.
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={handleFechar} className="btn-secondary text-xs flex-1 sm:flex-initial">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessar}
                className="btn-primary text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-semibold"
              >
                <span>🔍</span> Processar e Conferir
              </button>
            </div>
          </div>
        </div>
      )}

      {etapa === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="text-xs text-blue-300">
              ✅ <strong>{mensagensRevisao.length}</strong> O.S. identificada(s). Confira os dados abaixo e ajuste qualquer campo antes de confirmar.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAdicionarManual}
                className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors font-medium flex items-center gap-1"
              >
                <span>+</span> Adicionar O.S. Manual
              </button>
              <button
                type="button"
                onClick={() => setEtapa('input')}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Voltar ao texto
              </button>
            </div>
          </div>

          {/* Cards de cada OS identificada */}
          <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
            {mensagensRevisao.map((item, idx) => (
              <div
                key={item._tempId || idx}
                className="bg-slate-900/90 border border-white/10 rounded-xl p-3.5 space-y-3 relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-mono">
                      #{idx + 1}
                    </span>
                    O.S. Sonda {item.sonda || 'Não informada'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoverItem(idx)}
                    title="Remover esta O.S."
                    className="text-xs text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                  >
                    🗑️ Excluir
                  </button>
                </div>

                {/* Grid de campos editáveis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Data</label>
                    <input
                      type="date"
                      value={item.data}
                      onChange={e => handleCampoChange(idx, 'data', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Hora</label>
                    <input
                      type="text"
                      placeholder="02:20"
                      value={item.hora}
                      onChange={e => handleCampoChange(idx, 'hora', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Sonda</label>
                    <input
                      type="text"
                      placeholder="SD-14"
                      value={item.sonda}
                      onChange={e => handleCampoChange(idx, 'sonda', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Turno</label>
                    <select
                      value={item.turno}
                      onChange={e => handleCampoChange(idx, 'turno', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Selecione</option>
                      <option value="1º">1º Turno (06h - 14h)</option>
                      <option value="2º">2º Turno (14h - 22h)</option>
                      <option value="3º">3º Turno (22h - 06h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Turma</label>
                    <input
                      type="text"
                      placeholder="A, B, C..."
                      value={item.turma}
                      onChange={e => handleCampoChange(idx, 'turma', e.target.value.toUpperCase())}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Sondador</label>
                    <input
                      type="text"
                      placeholder="Nome do sondador"
                      value={item.sondador}
                      onChange={e => handleCampoChange(idx, 'sondador', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2 md:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Componente / Peça</label>
                    <input
                      type="text"
                      placeholder="Ex: FREIO DE MOLAS, MANDRIL"
                      value={item.componente}
                      onChange={e => handleCampoChange(idx, 'componente', e.target.value.toUpperCase())}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Saiu Nº (Defeito)</label>
                    <input
                      type="text"
                      placeholder="Ex: 01"
                      value={item.saiuNumero}
                      onChange={e => handleCampoChange(idx, 'saiuNumero', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Entrou Nº (Reserva)</label>
                    <input
                      type="text"
                      placeholder="Ex: 05 (ou vazio)"
                      value={item.entrouNumero}
                      onChange={e => handleCampoChange(idx, 'entrouNumero', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-4 md:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Status Inicial</label>
                    <select
                      value={item.status}
                      onChange={e => handleCampoChange(idx, 'status', e.target.value)}
                      className={inputClass}
                    >
                      <option value="aberta">⏳ Aguardando Oficina (Aberta)</option>
                      <option value="em_manutencao">🛠️ Em Manutenção na Oficina</option>
                      <option value="concluida">✅ Concluída</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-4 md:col-span-6">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Problema / Defeito Apresentado</label>
                    <input
                      type="text"
                      placeholder="Descreva o problema"
                      value={item.problema}
                      onChange={e => handleCampoChange(idx, 'problema', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Resumo da movimentação de estoque/peças */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  {item.saiuNumero ? (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                      🔻 <strong>{item.componente || 'Peça'} Nº {item.saiuNumero}</strong> sai da {item.sonda || 'sonda'} ➔ vai para Oficina (Manutenção)
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Sem peça retirada</span>
                  )}

                  {item.entrouNumero ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
                      🔺 <strong>{item.componente || 'Peça'} Nº {item.entrouNumero}</strong> ➔ instalada na {item.sonda || 'sonda'}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px] bg-slate-800/60 px-2 py-0.5 rounded">
                      ⚠️ Não substituída imediatamente na sonda
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setEtapa('input')}
              disabled={salvando}
              className="btn-secondary text-xs"
            >
              Voltar / Editar Texto
            </button>
            <button
              type="button"
              onClick={handleConfirmarSalvar}
              disabled={salvando || mensagensRevisao.length === 0}
              className="btn-primary text-xs font-semibold flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gravando no banco...
                </>
              ) : (
                <>
                  <span>💾</span> Confirmar e Salvar ({mensagensRevisao.length} O.S.)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
