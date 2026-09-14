// src/components/tabs/TabConfiguracoes.jsx
import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { useFirestore } from '../../hooks/useFirestore';
import { normalizarDataObj } from '../../lib/dataUtils';
import { baixarModeloExcel } from '../../lib/templateExcel';

export default function TabConfiguracoes({ onOpenImport, onManageMonths }) {
  const [subAba, setSubAba] = useState('interface'); // 'interface' | 'planilhas'
  const [baixandoModelo, setBaixandoModelo] = useState(false);
  
  // Theme state from Zustand
  const { theme, setTheme, ordemMeses = [], bancoGeral = [] } = useStore();
  const { deletarMes, deletarPorData } = useFirestore();

  // State for deletion by date
  const [mesSelecionado, setMesSelecionado] = useState(ordemMeses[0] || '');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [excluindoData, setExcluindoData] = useState(false);
  const [msgSucessoData, setMsgSucessoData] = useState('');

  // State for deletion by month
  const [excluindoMes, setExcluindoMes] = useState(null);
  const [msgSucessoMes, setMsgSucessoMes] = useState('');

  // Update selected month if ordemMeses changes and current selection is empty
  useMemo(() => {
    if ((!mesSelecionado || !ordemMeses.includes(mesSelecionado)) && ordemMeses.length > 0) {
      setMesSelecionado(ordemMeses[0]);
    }
  }, [ordemMeses, mesSelecionado]);

  // Extract distinct dates with counts for the selected month
  const datasDoMes = useMemo(() => {
    if (!mesSelecionado) return [];
    const registrosMes = bancoGeral.filter(r => r['Aba_Origem'] === mesSelecionado);
    const mapaDatas = new Map();

    registrosMes.forEach(r => {
      const dataIso = r['Data_Limpa'] || (r['Início da OS'] ? String(r['Início da OS']).split(' ')[0] : 'S/D');
      const dtObj = normalizarDataObj(dataIso);
      const label = dtObj
        ? `${String(dtObj.dia).padStart(2, '0')}/${String(dtObj.mes).padStart(2, '0')}/${dtObj.ano}`
        : dataIso;
      
      const info = mapaDatas.get(dataIso) || {
        dataIso,
        label,
        count: 0,
        timestamp: dtObj?.timestamp || 0
      };
      info.count++;
      mapaDatas.set(dataIso, info);
    });

    // Sort chronologically ascending
    return Array.from(mapaDatas.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [mesSelecionado, bancoGeral]);

  // Reset selected date if not available in current month
  useMemo(() => {
    if (datasDoMes.length > 0) {
      if (!datasDoMes.some(d => d.dataIso === dataSelecionada)) {
        setDataSelecionada(datasDoMes[0].dataIso);
      }
    } else {
      setDataSelecionada('');
    }
  }, [datasDoMes, dataSelecionada]);

  // Selected date info object
  const infoDataAtiva = useMemo(() => {
    return datasDoMes.find(d => d.dataIso === dataSelecionada) || null;
  }, [datasDoMes, dataSelecionada]);

  // Handler: Delete by Date
  async function handleExcluirData() {
    if (!mesSelecionado || !dataSelecionada || !infoDataAtiva) return;

    const dataLabel = infoDataAtiva.label || dataSelecionada;
    const qtd = infoDataAtiva.count;

    const confirma = window.confirm(
      `⚠️ ATENÇÃO: Confirma a exclusão cirúrgica de todas as ${qtd} O.S. do dia "${dataLabel}" no mês "${mesSelecionado}"?\n\nEsta operação é permanente no banco de dados na nuvem.`
    );
    if (!confirma) return;

    setExcluindoData(true);
    setMsgSucessoData('');
    try {
      await deletarPorData(mesSelecionado, dataSelecionada);
      setMsgSucessoData(`✅ Sucesso: ${qtd} O.S. do dia ${dataLabel} foram apagadas permanentemente.`);
      setTimeout(() => setMsgSucessoData(''), 5000);
    } catch (err) {
      alert('Erro ao excluir registros da data: ' + err.message);
    } finally {
      setExcluindoData(false);
    }
  }

  // Handler: Delete by Month
  async function handleExcluirMes(mes) {
    const qtd = bancoGeral.filter(r => r['Aba_Origem'] === mes).length;
    const confirma = window.confirm(
      `⚠️ ATENÇÃO: Deseja realmente excluir permanentemente TODOS os registros do mês "${mes}" (${qtd} O.S.)?\n\nIsso limpará os dados do mês e permitirá uma reimportação limpa.`
    );
    if (!confirma) return;

    setExcluindoMes(mes);
    setMsgSucessoMes('');
    try {
      await deletarMes(mes);
      setMsgSucessoMes(`✅ Mês "${mes}" e suas ${qtd} ordens foram removidos com sucesso.`);
      setTimeout(() => setMsgSucessoMes(''), 5000);
    } catch (err) {
      alert('Erro ao excluir mês: ' + err.message);
    } finally {
      setExcluindoMes(null);
    }
  }

  // Handler: Baixar Modelo Oficial de Importação
  async function handleBaixarModelo() {
    setBaixandoModelo(true);
    try {
      await baixarModeloExcel();
    } catch (err) {
      alert('Erro ao gerar modelo Excel: ' + err.message);
    } finally {
      setBaixandoModelo(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header & Sub-nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>⚙️</span> Configurações Gerais do Sistema
          </h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Central de personalização visual da interface e controle cirúrgico de dados.
          </p>
        </div>

        {/* Sub-tabs pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSubAba('interface')}
            className={`px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              subAba === 'interface'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🎨</span>
            <span>Personalização & Tema</span>
          </button>
          <button
            onClick={() => setSubAba('planilhas')}
            className={`px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              subAba === 'planilhas'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🗃️</span>
            <span>Manipulação de Dados</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-ABA 1: PERSONALIZAÇÃO & TEMA
          ========================================================================= */}
      {subAba === 'interface' && (
        <div className="space-y-6">
          {/* Card: Alternância de Tema */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🌓</span> Tema do Sistema (Light / Dark Mode)
              </h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Escolha o modo de exibição que melhor se adapta à sua preferência e ao ambiente de trabalho.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Opção Tema Claro */}
              <div
                onClick={() => setTheme('light')}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">☀️</span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Tema Claro (Light Mode)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Visual limpo, fundo neutro suave e alto contraste para ambientes iluminados.
                      </p>
                    </div>
                  </div>
                  {theme === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">Preview do Card</span>
                    <span className="text-emerald-600 font-bold">+14.2%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full w-3/4" />
                </div>
              </div>

              {/* Opção Tema Escuro */}
              <div
                onClick={() => setTheme('dark')}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-indigo-950 text-indigo-400 rounded-xl">🌙</span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Tema Escuro (Dark Mode)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Tons escuros neutros para reduzir o cansaço visual e destacar os gráficos.
                      </p>
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="font-semibold">Preview do Card</span>
                    <span className="text-emerald-400 font-bold">+14.2%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full w-3/4" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Informações de Estilo e Diretrizes UI */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎯</span> Diretrizes Visuais & Foco nos Dados
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🎨</span> Paleta Neutra e Clean
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Menus, fundos, cartões e textos foram ajustados para tons neutros elegantes, diminuindo o cansaço visual em jornadas prolongadas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📊</span> Cores Focadas nas Métricas
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  As cores vivas são mantidas exclusivamente nas barras, linhas e tabelas analíticas para facilitar o diagnóstico rápido de quebras e anomalias.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🔒</span> Backup de Estilo Preservado
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Uma cópia completa do estilo anterior foi salva em <code>src/styles-backup-original/</code>. Se desejar restaurar o tema anterior a qualquer momento, basta solicitar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-ABA 2: MANIPULAÇÃO DE DADOS (PLANILHAS)
          ========================================================================= */}
      {subAba === 'planilhas' && (
        <div className="space-y-6">
          {/* Banner de Aviso e Segurança */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 flex items-start gap-3">
            <span className="text-2xl shrink-0">🛡️</span>
            <div className="text-xs md:text-sm text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Controle Cirúrgico e Seguro do Banco de O.S.</p>
              <p className="text-amber-700 dark:text-amber-300">
                Esta central permite apagar dados com precisão (por dia específico ou por mês completo). Todas as exclusões atualizam a nuvem (Firestore) e recalculam imediatamente os gráficos do dashboard.
              </p>
            </div>
          </div>

          {/* Seção 0: Modelo Oficial de Planilha Excel (Download) */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">📄</span>
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                  Planilha Modelo de Importação (Excel)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                  Modelo Oficial SGM
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Baixe o modelo com a estrutura exata e colunas reconhecidas pelo sistema (<strong>OS</strong>, <strong>Início da OS</strong>, <strong>Componentes</strong>, <strong>falhas</strong>, <strong>Causa</strong> e <strong>Mecânico</strong>). Inclui linhas de exemplo e aba de instruções para preenchimento ágil.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleBaixarModelo}
                disabled={baixandoModelo}
                className="btn-success text-xs sm:text-sm font-semibold py-2.5 px-4 flex items-center gap-2 shadow-md hover:shadow-emerald-500/20 active:scale-95"
                title="Baixar arquivo Excel pré-formatado"
              >
                {baixandoModelo ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Gerando Modelo...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>Baixar Modelo (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seção 1: Exclusão Cirúrgica por Data (Dia Específico) */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📅</span> Exclusão Cirúrgica por Data (Dia Específico)
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                  Mais Seguro
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Selecione o mês e escolha um dia específico para apagar somente os registros daquele dia (ex: corrigir uma importação incorreta sem perder o mês inteiro).
              </p>
            </div>

            {ordemMeses.length === 0 ? (
              <div className="p-6 text-center text-slate-500 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
                Nenhum mês ou dado importado no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Seletores de Mês e Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seletor de Mês */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      1. Selecione o Mês:
                    </label>
                    <select
                      value={mesSelecionado}
                      onChange={(e) => {
                        setMesSelecionado(e.target.value);
                        setMsgSucessoData('');
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      {ordemMeses.map(mes => {
                        const qtd = bancoGeral.filter(r => r['Aba_Origem'] === mes).length;
                        return (
                          <option key={mes} value={mes}>
                            📅 {mes} ({qtd} O.S.)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Seletor de Data */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      2. Selecione o Dia para Excluir:
                    </label>
                    <select
                      value={dataSelecionada}
                      onChange={(e) => {
                        setDataSelecionada(e.target.value);
                        setMsgSucessoData('');
                      }}
                      disabled={datasDoMes.length === 0}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden disabled:opacity-50"
                    >
                      {datasDoMes.length === 0 ? (
                        <option value="">Nenhuma data encontrada</option>
                      ) : (
                        datasDoMes.map(d => (
                          <option key={d.dataIso} value={d.dataIso}>
                            📆 {d.label} — {d.count} Ordem{d.count !== 1 ? 's' : ''} de Serviço
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Resumo do Impacto da Data */}
                {infoDataAtiva && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Alvo selecionado: Dia <span className="text-blue-600 dark:text-blue-400 font-bold">{infoDataAtiva.label}</span> ({mesSelecionado})
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Esta ação removerá exatamente <strong>{infoDataAtiva.count}</strong> O.S. registradas nesta data específica.
                      </p>
                    </div>

                    <button
                      onClick={handleExcluirData}
                      disabled={excluindoData}
                      className="btn-danger shrink-0"
                    >
                      {excluindoData ? (
                        <><span className="inline-block w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" /> Apagando dia...</>
                      ) : (
                        <><span>🗑️</span> Apagar Registros do Dia</>
                      )}
                    </button>
                  </div>
                )}

                {msgSucessoData && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    {msgSucessoData}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 2: Exclusão por Mês Completo */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🗂️</span> Exclusão de Mês Completo
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Remova um mês inteiro do sistema caso precise refazer a importação da planilha daquele período do zero.
              </p>
            </div>

            {msgSucessoMes && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                {msgSucessoMes}
              </div>
            )}

            {ordemMeses.length === 0 ? (
              <div className="p-6 text-center text-slate-500 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
                Nenhum mês importado até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ordemMeses.map(mes => {
                  const qtd = bancoGeral.filter(r => r['Aba_Origem'] === mes).length;
                  const isDeleting = excluindoMes === mes;

                  return (
                    <div
                      key={mes}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>📅</span> {mes}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {qtd} Ordem{qtd !== 1 ? 's' : ''} de Serviço cadastradas
                        </p>
                      </div>

                      <button
                        onClick={() => handleExcluirMes(mes)}
                        disabled={isDeleting || excluindoMes !== null}
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
          </div>

          {/* Seção 3: Ações Rápidas de Planilha */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Central de Operações de Planilha
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Importe novos arquivos, gerencie os meses cadastrados ou recarregue os dados da nuvem.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary text-xs"
                title="Recarregar dados do Firestore"
              >
                <span>🔄</span> Recarregar
              </button>
              {onManageMonths && (
                <button
                  type="button"
                  onClick={onManageMonths}
                  className="btn-secondary text-xs"
                  title="Abrir painel de gerenciamento de meses"
                >
                  <span>📅</span> Gerenciar Meses
                </button>
              )}
              {onOpenImport && (
                <button
                  type="button"
                  onClick={onOpenImport}
                  className="btn-primary text-xs font-semibold"
                  title="Importar nova planilha Excel"
                >
                  <span>📥</span> Importar Planilha
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
