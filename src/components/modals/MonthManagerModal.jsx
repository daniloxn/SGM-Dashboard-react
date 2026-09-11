// src/components/modals/MonthManagerModal.jsx
import { useState } from 'react';
import Modal from '../ui/Modal';
import useStore from '../../store/useStore';
import { useFirestore } from '../../hooks/useFirestore';

export default function MonthManagerModal({ open, onClose }) {
  const { ordemMeses, bancoGeral } = useStore();
  const { deletarMes } = useFirestore();
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(mes) {
    const totalOS = bancoGeral.filter(r => r['Aba_Origem'] === mes).length;
    const ok = window.confirm(
      `⚠️ Tem certeza que deseja apagar o mês "${mes}" (${totalOS} O.S.)?\n\nIsso permitirá a reimportação limpa da planilha.`
    );
    if (!ok) return;
    setDeleting(mes);
    try {
      await deletarMes(mes);
    } catch (err) {
      alert('Erro ao excluir mês: ' + err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="📅 Gerenciar Meses" size="md">
      {ordemMeses.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <div className="text-4xl mb-3">📭</div>
          <p>Nenhum mês importado até o momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-400 mb-4">
            Apague um mês para limpar os dados e reimportar uma planilha corrigida.
          </p>
          {ordemMeses.map(mes => {
            const qtd = bancoGeral.filter(r => r['Aba_Origem'] === mes).length;
            const isDeleting = deleting === mes;
            return (
              <div key={mes} className="flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-white">📅 {mes}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {qtd} Ordem{qtd !== 1 ? 's' : ''} de Serviço
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(mes)}
                  disabled={isDeleting || deleting !== null}
                  className="btn-danger text-xs"
                >
                  {isDeleting ? (
                    <><span className="inline-block w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" /> Apagando...</>
                  ) : (
                    <><span>🗑️</span> Apagar Mês</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

