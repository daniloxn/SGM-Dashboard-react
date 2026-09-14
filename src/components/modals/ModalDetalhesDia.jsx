// src/components/modals/ModalDetalhesDia.jsx
import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { normalizarDataObj, normalizarSonda } from '../../lib/dataUtils';

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function ModalDetalhesDia({ open, onClose, dataIso, registrosDia = [] }) {
  const [busca, setBusca] = useState('');

  const dtObj = useMemo(() => normalizarDataObj(dataIso), [dataIso]);

  const tituloData = useMemo(() => {
    if (!dtObj) return dataIso || 'Data Selecionada';
    const diaSemana = DIAS_SEMANA[dtObj.diaSemanaIdx] || '';
    return `${String(dtObj.dia).padStart(2, '0')}/${String(dtObj.mes).padStart(2, '0')}/${dtObj.ano} (${diaSemana})`;
  }, [dtObj, dataIso]);

  // Filtrar registros do dia pela busca interna
  const registrosFiltrados = useMemo(() => {
    if (!busca.trim()) return registrosDia;
    const termo = busca.trim().toUpperCase();
    return registrosDia.filter(r => {
      const os = String(r['OS'] || '').toUpperCase();
      const comp = String(r['Componentes'] || r['COMPONENTES'] || '').toUpperCase();
      const falha = String(r['falhas'] || r['FALHAS'] || '').toUpperCase();
      const sonda = String(r['Causa'] || r['CAUSA'] || '').toUpperCase();
      const mec = String(r['Mecânico'] || r['MECANICO'] || '').toUpperCase();
      return os.includes(termo) || comp.includes(termo) || falha.includes(termo) || sonda.includes(termo) || mec.includes(termo);
    });
  }, [registrosDia, busca]);

  // KPIs rápidos do dia
  const kpisDia = useMemo(() => {
    const sondas = new Set();
    const mecanicos = new Set();
    registrosDia.forEach(r => {
      const s = normalizarSonda(r['Causa'] || r['CAUSA']);
      if (s) sondas.add(s);
      const m = r['Mecânico'] || r['MECANICO'];
      if (m) mecanicos.add(m);
    });
    return {
      total: registrosDia.length,
      totalSondas: sondas.size,
      totalMec: mecanicos.size
    };
  }, [registrosDia]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`📅 Ocorrências do Dia — ${tituloData}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* KPIs do dia */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block uppercase font-semibold">Total de O.S.</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{kpisDia.total}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block uppercase font-semibold">Sondas com Falhas</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{kpisDia.totalSondas}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block uppercase font-semibold">Mecânicos Envolvidos</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpisDia.totalMec}</span>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Filtrar O.S. deste dia por número, peça, falha, sonda ou mecânico..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabela de O.S. do Dia */}
        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="sgm-table w-full text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-left">Nº O.S.</th>
                  <th className="py-2.5 px-3 text-left">Início / Hora</th>
                  <th className="py-2.5 px-3 text-left">Sonda</th>
                  <th className="py-2.5 px-3 text-left">Componente</th>
                  <th className="py-2.5 px-3 text-left">Falha</th>
                  <th className="py-2.5 px-3 text-left">Mecânico</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.length > 0 ? (
                  registrosFiltrados.map((r, idx) => (
                    <tr key={r._docId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-200 dark:border-white/5">
                      <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {r['OS'] || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {r['Início da OS'] || r['INÍCIO DA OS'] || r['Data_Limpa'] || '-'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                        {normalizarSonda(r['Causa'] || r['CAUSA']) || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-900 dark:text-slate-200 font-medium truncate max-w-[180px]" title={r['Componentes'] || r['COMPONENTES']}>
                        {r['Componentes'] || r['COMPONENTES'] || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={r['falhas'] || r['FALHAS']}>
                        {r['falhas'] || r['FALHAS'] || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={r['Mecânico'] || r['MECANICO']}>
                        {r['Mecânico'] || r['MECANICO'] || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                      Nenhuma O.S. encontrada para o filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400">
          <span>Exibindo <strong>{registrosFiltrados.length}</strong> de <strong>{registrosDia.length}</strong> O.S.</span>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
