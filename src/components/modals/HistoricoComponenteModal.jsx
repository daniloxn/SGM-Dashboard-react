// src/components/modals/HistoricoComponenteModal.jsx
import { useState } from 'react';
import Modal from '../ui/Modal';
import { useFirestore } from '../../hooks/useFirestore';
import useStore from '../../store/useStore';

export default function HistoricoComponenteModal({ open, onClose, componente, onSuccess }) {
  const { ajustarComponenteManual } = useFirestore();
  const { sondasUnicas } = useStore();

  const [modoAjuste, setModoAjuste] = useState(false);
  const [novaLocalizacao, setNovaLocalizacao] = useState('OFICINA_RESERVA');
  const [sondaDestino, setSondaDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  if (!componente) return null;

  async function handleSalvarAjuste() {
    setSalvando(true);
    setErro(null);
    try {
      if (novaLocalizacao === 'SONDA' && !sondaDestino.trim()) {
        throw new Error('Informe a sonda em que a peça foi alocada.');
      }
      await ajustarComponenteManual(componente.id, novaLocalizacao, sondaDestino.trim(), motivo.trim());
      setModoAjuste(false);
      setMotivo('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao ajustar componente:', err);
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const badgeLocalizacao = {
    OFICINA_MANUTENCAO: { text: '🛠️ Na Oficina (Em Manutenção)', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
    OFICINA_RESERVA: { text: '📦 Na Oficina (Pronta / Reserva)', bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
    SONDA: { text: `🏗️ Na Sonda ${componente.sondaAtual || '-'}`, bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
  }[componente.localizacao] || { text: componente.localizacao || 'Desconhecida', bg: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`📍 Histórico do Componente: ${componente.tipo} Nº ${componente.numero}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Status Atual */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold uppercase">Localização Atual</span>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeLocalizacao.bg}`}>
              {badgeLocalizacao.text}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setModoAjuste(v => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors font-medium"
          >
            {modoAjuste ? 'Cancelar Ajuste ✕' : '⚙️ Ajustar Manualmente'}
          </button>
        </div>

        {erro && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
            ⚠️ {erro}
          </div>
        )}

        {/* Formulário de Ajuste Manual */}
        {modoAjuste && (
          <div className="bg-slate-50 dark:bg-slate-900/90 border border-blue-500/30 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300">
              Ajuste Manual de Localização (Inventário Físico)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nova Localização</label>
                <select
                  value={novaLocalizacao}
                  onChange={e => setNovaLocalizacao(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="OFICINA_RESERVA">📦 Na Oficina (Pronta / Reserva)</option>
                  <option value="OFICINA_MANUTENCAO">🛠️ Na Oficina (Em Manutenção)</option>
                  <option value="SONDA">🏗️ Em uma Sonda</option>
                </select>
              </div>

              {novaLocalizacao === 'SONDA' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Sonda Alocada</label>
                  <input
                    type="text"
                    placeholder="Ex: SD-14"
                    value={sondaDestino}
                    onChange={e => setSondaDestino(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Motivo do Ajuste</label>
                <input
                  type="text"
                  placeholder="Ex: Contagem física na oficina, troca de turno..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModoAjuste(false)}
                className="btn-secondary text-xs"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarAjuste}
                disabled={salvando}
                className="btn-primary text-xs font-semibold"
              >
                {salvando ? 'Salvando...' : 'Gravar Ajuste'}
              </button>
            </div>
          </div>
        )}

        {/* Linha do Tempo (Timeline) */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2">
            🕒 Histórico de Movimentações ({componente.historico?.length || 0})
          </h4>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {componente.historico && componente.historico.length > 0 ? (
              componente.historico.map((ev, idx) => {
                const dataFormatada = ev.dataHora
                  ? new Date(ev.dataHora).toLocaleString('pt-BR')
                  : 'Data não informada';

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ev.tipoEvento === 'saiu_sonda' && `🔻 Saiu da Sonda ${ev.sonda || ''}`}
                        {ev.tipoEvento === 'entrou_sonda' && `🔺 Instalado na Sonda ${ev.sonda || ''}`}
                        {ev.tipoEvento === 'conclusao_manutencao' && '✅ Manutenção Concluída'}
                        {ev.tipoEvento === 'ajuste_manual' && '⚙️ Ajuste Manual'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{dataFormatada}</span>
                    </div>
                    {ev.observacao && (
                      <p className="text-slate-700 dark:text-slate-300 text-[11px]">{ev.observacao}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-xs text-slate-500">
                Nenhum histórico registrado ainda para este componente.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/5">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
