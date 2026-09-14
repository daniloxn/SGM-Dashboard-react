// src/components/tabs/Tab7Oficina.jsx — Controle de O.S. Oficina & WhatsApp e Rastreabilidade de Peças
import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { useFirestore } from '../../hooks/useFirestore';
import ParserWhatsAppModal from '../modals/ParserWhatsAppModal';
import AssociarSodepModal from '../modals/AssociarSodepModal';
import EditarOsOficinaModal from '../modals/EditarOsOficinaModal';
import HistoricoComponenteModal from '../modals/HistoricoComponenteModal';

export default function Tab7Oficina() {
  const { osOficinaList, componentesList } = useStore();
  const {
    atualizarOsOficina,
    excluirOsOficina,
    concluirOsOficinaManual,
    carregarOsOficina,
    carregarComponentes,
    sincronizarRastreabilidade
  } = useFirestore();

  // Sub-abas
  const [subAba, setSubAba] = useState('ordens'); // 'ordens' | 'componentes'
  const [sincronizando, setSincronizando] = useState(false);
  const [msgSincronizado, setMsgSincronizado] = useState('');

  // Modais
  const [modalParserAberto, setModalParserAberto] = useState(false);
  const [modalAssociar, setModalAssociar] = useState({ aberto: false, osItem: null });
  const [modalEditar, setModalEditar] = useState({ aberto: false, osItem: null });
  const [modalHistorico, setModalHistorico] = useState({ aberto: false, componente: null });

  // Filtros de O.S.
  const [buscaOS, setBuscaOS] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroSonda, setFiltroSonda] = useState('TODOS');
  const [ordemCrescente, setOrdemCrescente] = useState(false);

  // Filtros de Componentes
  const [buscaComp, setBuscaComp] = useState('');
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('TODOS');

  // KPIs
  const kpis = useMemo(() => {
    let abertas = 0, emManutencao = 0, concluidas = 0;
    osOficinaList.forEach(o => {
      if (o.status === 'aberta') abertas++;
      else if (o.status === 'em_manutencao') emManutencao++;
      else if (o.status === 'concluida') concluidas++;
    });

    let oficinaManut = 0, oficinaReserva = 0, emSonda = 0;
    componentesList.forEach(c => {
      if (c.localizacao === 'OFICINA_MANUTENCAO') oficinaManut++;
      else if (c.localizacao === 'OFICINA_RESERVA') oficinaReserva++;
      else if (c.localizacao === 'SONDA') emSonda++;
    });

    return {
      abertas,
      emManutencao,
      concluidas,
      pecasOficina: oficinaManut + oficinaReserva,
      oficinaManut,
      oficinaReserva,
      emSonda
    };
  }, [osOficinaList, componentesList]);

  // Lista de Sondas únicas nas OS da oficina
  const sondasOpcoes = useMemo(() => {
    const s = new Set();
    osOficinaList.forEach(o => { if (o.sonda) s.add(o.sonda); });
    return Array.from(s).sort();
  }, [osOficinaList]);

  // Filtragem e ordenação das O.S.
  const osFiltradas = useMemo(() => {
    return osOficinaList
      .filter(o => {
        if (filtroStatus !== 'TODOS' && o.status !== filtroStatus) return false;
        if (filtroSonda !== 'TODOS' && o.sonda !== filtroSonda) return false;

        if (buscaOS.trim()) {
          const t = buscaOS.trim().toUpperCase();
          const comp = String(o.componente || '').toUpperCase();
          const sonda = String(o.sonda || '').toUpperCase();
          const sondador = String(o.sondador || '').toUpperCase();
          const prob = String(o.problema || '').toUpperCase();
          const sodep = String(o.osSodepAssociada || '').toUpperCase();
          const saiu = String(o.saiuNumero || '').toUpperCase();
          const entrou = String(o.entrouNumero || '').toUpperCase();

          const match = comp.includes(t) || sonda.includes(t) || sondador.includes(t) ||
            prob.includes(t) || sodep.includes(t) || saiu.includes(t) || entrou.includes(t);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dataHoraISO || a.data || 0).getTime();
        const timeB = new Date(b.dataHoraISO || b.data || 0).getTime();
        return ordemCrescente ? timeA - timeB : timeB - timeA;
      });
  }, [osOficinaList, filtroStatus, filtroSonda, buscaOS, ordemCrescente]);

  // Filtragem dos Componentes
  const componentesFiltrados = useMemo(() => {
    return componentesList
      .filter(c => {
        if (filtroLocalizacao !== 'TODOS' && c.localizacao !== filtroLocalizacao) return false;
        if (buscaComp.trim()) {
          const t = buscaComp.trim().toUpperCase();
          const tipo = String(c.tipo || '').toUpperCase();
          const num = String(c.numero || '').toUpperCase();
          const sonda = String(c.sondaAtual || '').toUpperCase();
          return tipo.includes(t) || num.includes(t) || sonda.includes(t);
        }
        return true;
      })
      .sort((a, b) => (a.tipo || '').localeCompare(b.tipo || ''));
  }, [componentesList, filtroLocalizacao, buscaComp]);

  // Ações de O.S.
  async function handleIniciarManutencao(id) {
    try {
      await atualizarOsOficina(id, { status: 'em_manutencao' });
    } catch (err) {
      alert('Erro ao iniciar manutenção: ' + err.message);
    }
  }

  async function handleConcluirManual(id) {
    const ok = window.confirm('Deseja marcar esta O.S. como CONCLUÍDA na oficina? (O componente retirado ficará disponível como reserva)');
    if (!ok) return;
    try {
      await concluirOsOficinaManual(id, 'Concluída manualmente na oficina.');
    } catch (err) {
      alert('Erro ao concluir O.S.: ' + err.message);
    }
  }

  async function handleExcluirOS(id) {
    const ok = window.confirm('Tem certeza de que deseja excluir permanentemente esta O.S. da oficina?');
    if (!ok) return;
    try {
      await excluirOsOficina(id);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  async function handleSincronizarDatas() {
    setSincronizando(true);
    setMsgSincronizado('');
    try {
      await sincronizarRastreabilidade();
      setMsgSincronizado('Datas reconciliadas com sucesso!');
      setTimeout(() => setMsgSincronizado(''), 4000);
    } catch (err) {
      alert('Erro ao sincronizar: ' + err.message);
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛠️</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-wide">
              Controle de O.S. Oficina & WhatsApp
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Triagem pré-SODEP das mensagens do WhatsApp, monitoramento de turnos e rastreabilidade contínua de peças.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalParserAberto(true)}
          className="btn-primary text-xs sm:text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-blue-500/20"
        >
          <span>📲</span>
          <span>+ Lançar Mensagens WhatsApp</span>
        </button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="kpi-card bg-white dark:bg-slate-900/60 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⏳</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 dark:text-amber-400 font-bold px-2 py-0.5 rounded">
              Pendente
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-amber-500 dark:text-amber-400">{kpis.abertas}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Aguardando Oficina</p>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900/60 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🛠️</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
              Na Bancada
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{kpis.emManutencao}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Em Manutenção</p>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900/60 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-2xl">✅</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">
              Finalizadas
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{kpis.concluidas}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Concluídas / Associadas</p>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900/60 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-2xl">📦</span>
            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded">
              Oficina
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-purple-600 dark:text-purple-400">{kpis.pecasOficina}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Peças na Oficina ({kpis.oficinaManut} em conserto • {kpis.oficinaReserva} reservas)
          </p>
        </div>
      </div>

      {/* Sub-navegação */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setSubAba('ordens')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
            subAba === 'ordens'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>📋</span> O.S. da Oficina & WhatsApp ({osFiltradas.length})
        </button>

        <button
          type="button"
          onClick={() => setSubAba('componentes')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
            subAba === 'componentes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>📍</span> Rastreabilidade de Componentes ({componentesFiltrados.length})
        </button>
      </div>

      {/* SUB-ABA 1: LISTAGEM DE ORDENS DE SERVIÇO DA OFICINA */}
      {subAba === 'ordens' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={buscaOS}
                onChange={e => setBuscaOS(e.target.value)}
                placeholder="🔍 Buscar por Sonda, Peça, Defeito, O.S. SODEP..."
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {buscaOS && (
                <button onClick={() => setBuscaOS('')} className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="aberta">⏳ Aguardando Oficina</option>
                <option value="em_manutencao">🛠️ Em Manutenção</option>
                <option value="concluida">✅ Concluídas</option>
              </select>

              <select
                value={filtroSonda}
                onChange={e => setFiltroSonda(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TODOS">Todas as Sondas</option>
                {sondasOpcoes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                type="button"
                onClick={() => setOrdemCrescente(v => !v)}
                title="Inverter ordenação cronológica"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
              >
                <span>{ordemCrescente ? '⬆️ Mais Antigas' : '⬇️ Mais Recentes'}</span>
              </button>
            </div>
          </div>

          {/* Tabela de O.S. da Oficina */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="overflow-x-auto">
              <table className="sgm-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-3 text-left">Data & Hora</th>
                    <th className="py-3 px-3 text-left">Sonda / Turno</th>
                    <th className="py-3 px-3 text-left">Componente & Problema</th>
                    <th className="py-3 px-3 text-left">Movimentação Peças</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Vínculo SODEP</th>
                    <th className="py-3 px-3 text-center w-40">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {osFiltradas.length > 0 ? (
                    osFiltradas.map(os => {
                      const dtFormatada = os.dataBr || os.data;

                      return (
                        <tr key={os.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-white/5 transition-colors">
                          {/* Data e Hora */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">{dtFormatada}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <span>🕒 {os.hora}</span>
                            </div>
                          </td>

                          {/* Sonda, Turno e Turma */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-blue-600 dark:text-blue-400">{os.sonda || '-'}</div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              Turno: <strong className="text-slate-800 dark:text-slate-300">{os.turno || '-'}</strong> • Turma: <strong className="text-slate-800 dark:text-slate-300">{os.turma || '-'}</strong>
                            </div>
                            {os.sondador && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={os.sondador}>
                                👷 {os.sondador}
                              </div>
                            )}
                          </td>

                          {/* Componente e Defeito */}
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <div className="font-bold text-slate-900 dark:text-slate-200 truncate" title={os.componente}>
                              {os.componente || 'Não especificado'}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5" title={os.problema}>
                              {os.problema || 'Sem descrição'}
                            </div>
                          </td>

                          {/* Peças que saíram e entraram */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="space-y-1">
                              {os.saiuNumero ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                                  🔻 Saiu Nº <strong>{os.saiuNumero}</strong>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Sem peça retirada</span>
                              )}

                              {os.entrouNumero ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                                  🔺 Entrou Nº <strong>{os.entrouNumero}</strong>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Não substituída</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {os.status === 'aberta' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                ⏳ Aguardando
                              </span>
                            )}
                            {os.status === 'em_manutencao' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                🛠️ Na Bancada
                              </span>
                            )}
                            {os.status === 'concluida' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                ✅ Concluída
                              </span>
                            )}
                          </td>

                          {/* Vínculo SODEP */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {os.osSodepAssociada ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                                  🔗 O.S. {os.osSodepAssociada}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  Vinculada e fechada
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                Não vinculada
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Iniciar manutenção */}
                              {os.status === 'aberta' && (
                                <button
                                  type="button"
                                  onClick={() => handleIniciarManutencao(os.id)}
                                  title="Iniciar Manutenção na Oficina"
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                                >
                                  🛠️
                                </button>
                              )}

                              {/* Dar OK / Concluir */}
                              {os.status !== 'concluida' && (
                                <button
                                  type="button"
                                  onClick={() => handleConcluirManual(os.id)}
                                  title="Dar Baixa / Concluir na Oficina"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                >
                                  ✅
                                </button>
                              )}

                              {/* Vincular com SODEP */}
                              <button
                                type="button"
                                onClick={() => setModalAssociar({ aberto: true, osItem: os })}
                                title="Vincular à O.S. SODEP Fechada"
                                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                              >
                                🔗
                              </button>

                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => setModalEditar({ aberto: true, osItem: os })}
                                title="Editar dados da O.S."
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                ✏️
                              </button>

                              {/* Excluir */}
                              <button
                                type="button"
                                onClick={() => handleExcluirOS(os.id)}
                                title="Excluir O.S."
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        <div className="space-y-2">
                          <p className="text-3xl">📭</p>
                          <p className="text-sm font-semibold">Nenhuma O.S. encontrada na oficina.</p>
                          <p className="text-xs text-slate-500">
                            Clique no botão "+ Lançar Mensagens WhatsApp" no topo para registrar as ordens de serviço.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: RASTREAMENTO E INVENTÁRIO DE COMPONENTES */}
      {subAba === 'componentes' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Componentes */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={buscaComp}
                onChange={e => setBuscaComp(e.target.value)}
                placeholder="🔍 Buscar por Tipo, Número ou Sonda..."
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {buscaComp && (
                <button onClick={() => setBuscaComp('')} className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroLocalizacao}
                onChange={e => setFiltroLocalizacao(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TODOS">Todas as Localizações</option>
                <option value="OFICINA_MANUTENCAO">🛠️ Na Oficina (Em Manutenção)</option>
                <option value="OFICINA_RESERVA">📦 Na Oficina (Pronta / Reserva)</option>
                <option value="SONDA">🏗️ Em Sonda Ativa</option>
              </select>

              <button
                type="button"
                onClick={handleSincronizarDatas}
                disabled={sincronizando}
                title="Reconcilia a localização e o histórico de todas as peças baseado na cronologia de datas de cada O.S."
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-blue-500/40 rounded-lg px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span>{sincronizando ? '⏳' : '🔄'}</span>
                <span>{sincronizando ? 'Reconciliando...' : 'Reconciliar por Datas'}</span>
              </button>

              {msgSincronizado && (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg animate-pulse">
                  ✓ {msgSincronizado}
                </span>
              )}
            </div>
          </div>

          {/* Grid / Tabela de Componentes */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="overflow-x-auto">
              <table className="sgm-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-3 text-left">Componente & Número</th>
                    <th className="py-3 px-3 text-center">Localização Atual</th>
                    <th className="py-3 px-3 text-left">Última Movimentação</th>
                    <th className="py-3 px-3 text-center">Total de Históricos</th>
                    <th className="py-3 px-3 text-center w-36">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {componentesFiltrados.length > 0 ? (
                    componentesFiltrados.map(comp => {
                      const ultimoEvento = comp.historico?.[0];
                      const dtUltimo = ultimoEvento?.dataHora
                        ? new Date(ultimoEvento.dataHora).toLocaleString('pt-BR')
                        : 'Sem registro';

                      return (
                        <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-white/5 transition-colors">
                          {/* Nome e Número */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {comp.tipo} <span className="text-blue-600 dark:text-blue-400 font-mono font-black">Nº {comp.numero}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {comp.id}
                            </div>
                          </td>

                          {/* Localização */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {comp.localizacao === 'OFICINA_MANUTENCAO' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                🛠️ Na Oficina (Em Manutenção)
                              </span>
                            )}
                            {comp.localizacao === 'OFICINA_RESERVA' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                📦 Na Oficina (Pronta / Reserva)
                              </span>
                            )}
                            {comp.localizacao === 'SONDA' && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                🏗️ Na Sonda {comp.sondaAtual || '-'}
                              </span>
                            )}
                          </td>

                          {/* Detalhe da Última Movimentação */}
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate" title={ultimoEvento?.observacao || '-'}>
                              {ultimoEvento?.observacao || 'Nenhuma movimentação detalhada'}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {dtUltimo}
                            </div>
                          </td>

                          {/* Total de Históricos */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                              {comp.historico?.length || 0} evento(s)
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setModalHistorico({ aberto: true, componente: comp })}
                              className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto"
                            >
                              <span>🕒</span> Ver Histórico
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        <div className="space-y-2">
                          <p className="text-3xl">⚙️</p>
                          <p className="text-sm font-semibold">Nenhum componente rastreado ainda.</p>
                          <p className="text-xs text-slate-500">
                            Ao registrar mensagens de O.S. no WhatsApp com os números de entrada e saída, os componentes serão mapeados automaticamente aqui!
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modais Integrados */}
      <ParserWhatsAppModal
        open={modalParserAberto}
        onClose={() => setModalParserAberto(false)}
        onSuccess={() => {
          carregarOsOficina();
          carregarComponentes();
        }}
      />

      <AssociarSodepModal
        open={modalAssociar.aberto}
        onClose={() => setModalAssociar({ aberto: false, osItem: null })}
        osOficina={modalAssociar.osItem}
        onSuccess={() => {
          carregarOsOficina();
          carregarComponentes();
        }}
      />

      <EditarOsOficinaModal
        open={modalEditar.aberto}
        onClose={() => setModalEditar({ aberto: false, osItem: null })}
        osItem={modalEditar.osItem}
        onSuccess={() => {
          carregarOsOficina();
          carregarComponentes();
        }}
      />

      <HistoricoComponenteModal
        open={modalHistorico.aberto}
        onClose={() => setModalHistorico({ aberto: false, componente: null })}
        componente={modalHistorico.componente}
        onSuccess={() => {
          carregarComponentes();
        }}
      />
    </div>
  );
}
