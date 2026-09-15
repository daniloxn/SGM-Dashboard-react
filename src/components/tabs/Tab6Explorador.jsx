// src/components/tabs/Tab6Explorador.jsx — Banco de Dados Geral e Explorador
import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { normalizarSonda } from '../../lib/dataUtils';
import HelpButton from '../ui/HelpButton';

export default function Tab6Explorador({ onEdit, onDelete }) {
  const { bancoGeral } = useStore();
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 25;

  // Filtragem
  const registrosFiltrados = useMemo(() => {
    if (!busca.trim()) {
      return bancoGeral.map((r, originalIndex) => ({ ...r, _originalIndex: originalIndex }));
    }
    const termo = busca.trim().toUpperCase();
    return bancoGeral
      .map((r, originalIndex) => ({ ...r, _originalIndex: originalIndex }))
      .filter(r => {
        const os = String(r['OS'] || '').toUpperCase();
        const data = String(r['Data_Limpa'] || '').toUpperCase();
        const mes = String(r['Aba_Origem'] || '').toUpperCase();
        const comp = String(r['Componentes'] || r['COMPONENTES'] || '').toUpperCase();
        const falha = String(r['falhas'] || r['FALHAS'] || '').toUpperCase();
        const sonda = String(r['Causa'] || r['CAUSA'] || '').toUpperCase();
        const mec = String(r['Mecânico'] || r['Mecanico'] || r['MECANICO'] || '').toUpperCase();

        return (
          os.includes(termo) ||
          data.includes(termo) ||
          mes.includes(termo) ||
          comp.includes(termo) ||
          falha.includes(termo) ||
          sonda.includes(termo) ||
          mec.includes(termo)
        );
      });
  }, [bancoGeral, busca]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / ITENS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);

  const dadosPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * ITENS_POR_PAGINA;
    return registrosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [registrosFiltrados, paginaValida]);

  function handleBuscaChange(e) {
    setBusca(e.target.value);
    setPagina(1);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Barra de Busca e Contador */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={busca}
            onChange={handleBuscaChange}
            placeholder="🔍 Buscar por OS, Peça, Falha, Sonda, Mecânico..."
            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {busca && (
            <button
              onClick={() => { setBusca(''); setPagina(1); }}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Exibindo <span className="text-slate-900 dark:text-white font-semibold">{registrosFiltrados.length}</span> registros de {bancoGeral.length}
          </div>
          <HelpButton
            title="Explorador do Banco de Dados Geral"
            purpose="Permitir busca full-text direta, auditoria linha por linha, edição rápida de campos e exclusão cirúrgica de ordens no Firestore."
            howItWorks="Filtra a base inteira em tempo real conforme você digita qualquer termo (número de O.S., nome da peça, defeito, sonda ou mecânico) com paginação de 25 registros por página."
            whatToObserve="Inconsistências em dados brutos (ex: nomes de peças digitados com erros ou sem sonda) que possam estar distorcendo gráficos de outras abas."
            tips="Clique no ícone de lápis para corrigir campos ou na lixeira para remover uma O.S. duplicada da nuvem."
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="chart-box p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="sgm-table">
            <thead>
              <tr>
                <th>OS</th>
                <th>Data</th>
                <th>Mês</th>
                <th>Peça (Original)</th>
                <th>Falha</th>
                <th>Sonda</th>
                <th>Mecânico</th>
                <th className="text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dadosPaginados.length > 0 ? (
                dadosPaginados.map(r => (
                  <tr key={r._docId || r._originalIndex}>
                    <td className="font-semibold text-blue-600 dark:text-blue-400">{r['OS'] || '-'}</td>
                    <td className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{r['Data_Limpa'] || '-'}</td>
                    <td><span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 font-medium">{r['Aba_Origem'] || '-'}</span></td>
                    <td className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[180px]" title={r['Componentes'] || r['COMPONENTES']}>
                      {r['Componentes'] || r['COMPONENTES'] || '-'}
                    </td>
                    <td className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={r['falhas'] || r['FALHAS']}>
                      {r['falhas'] || r['FALHAS'] || '-'}
                    </td>
                    <td className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={r['Causa'] || r['CAUSA']}>
                      {normalizarSonda(r['Causa'] || r['CAUSA']) || '-'}
                    </td>
                    <td className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={r['Mecânico'] || r['MECANICO']}>
                      {r['Mecânico'] || r['MECANICO'] || '-'}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(r._originalIndex, r)}
                          title="Editar Ordem de Serviço"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDelete(r._originalIndex)}
                          title="Excluir Ordem de Serviço"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-12">
                    {bancoGeral.length === 0 ? 'Nenhum dado importado ainda.' : 'Nenhum registro encontrado para a busca.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/5">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Página <strong className="text-slate-900 dark:text-white">{paginaValida}</strong> de <strong className="text-slate-900 dark:text-white">{totalPaginas}</strong>
            </span>
            <div className="flex gap-1">
              <button
                disabled={paginaValida <= 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs text-slate-800 dark:text-slate-200 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={paginaValida >= totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs text-slate-800 dark:text-slate-200 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

