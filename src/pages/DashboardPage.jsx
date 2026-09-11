// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { useFirestore } from '../hooks/useFirestore';
import { exportarRelatorioExcel } from '../lib/exportExcel';

import Sidebar from '../components/layout/Sidebar';
import Tab1Geral from '../components/tabs/Tab1Geral';
import Tab2Analitico from '../components/tabs/Tab2Analitico';
import Tab3Familias from '../components/tabs/Tab3Familias';
import Tab4Picos from '../components/tabs/Tab4Picos';
import Tab5Mecanicos from '../components/tabs/Tab5Mecanicos';
import Tab6Explorador from '../components/tabs/Tab6Explorador';

import ImportModal from '../components/modals/ImportModal';
import MonthManagerModal from '../components/modals/MonthManagerModal';
import EditOSModal from '../components/modals/EditOSModal';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('aba1');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManageMonthsOpen, setIsManageMonthsOpen] = useState(false);
  const [editState, setEditState] = useState({ open: false, index: null, record: null });
  const [exporting, setExporting] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { bancoGeral, ordemMeses, relMeses, relCompBaseMes } = useStore();
  const { carregarDados, deletarOS } = useFirestore();

  // Load Firestore on mount
  useEffect(() => {
    carregarDados();
  }, []);

  // Handle Excel Export
  async function handleExport() {
    if (bancoGeral.length === 0) {
      alert('Nenhum dado carregado para exportar.');
      return;
    }
    setExporting(true);
    try {
      await exportarRelatorioExcel({ bancoGeral, ordemMeses, relMeses, relCompBaseMes });
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  // Handle Edit OS
  function handleOpenEdit(index, record) {
    setEditState({ open: true, index, record });
  }

  // Handle Delete OS
  async function handleDeleteOS(index) {
    const record = bancoGeral[index];
    const osNum = record ? record['OS'] || 'Sem número' : '';
    const ok = window.confirm(`Deseja realmente excluir permanentemente a O.S. "${osNum}"?`);
    if (!ok) return;
    try {
      await deletarOS(index);
    } catch (err) {
      alert('Erro ao excluir O.S.: ' + err.message);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      {/* Sidebar (Responsive desktop & mobile drawer) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onImport={() => setIsImportOpen(true)}
        onManageMonths={() => setIsManageMonthsOpen(true)}
        onExport={handleExport}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 px-4 md:px-6 bg-slate-900/80 backdrop-blur border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Abrir Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="text-sm md:text-lg font-bold text-white tracking-wide truncate">
              {activeTab === 'aba1' && '📊 Visão Geral'}
              {activeTab === 'aba2' && '🔬 Painel Analítico'}
              {activeTab === 'aba3' && '📈 Evolução de Famílias e Falhas'}
              {activeTab === 'aba4' && '📅 Levantamento de Picos Diários'}
              {activeTab === 'aba5' && '👨‍🔧 Controle e Produtividade da Equipe'}
              {activeTab === 'aba6' && '🗂️ Banco de Dados Geral (Explorador)'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {bancoGeral.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-success text-xs font-semibold py-1.5 px-2.5 md:px-3 flex items-center gap-1.5"
                title="Exportar Planilha Excel com Gráficos"
              >
                {exporting ? (
                  <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> <span className="hidden sm:inline">Gerando...</span></>
                ) : (
                  <><span>📥</span> <span className="hidden sm:inline">Exportar Excel</span><span className="sm:hidden">Excel</span></>
                )}
              </button>
            )}

            <button
              onClick={() => setIsImportOpen(true)}
              className="btn-primary text-xs font-semibold py-1.5 px-2.5 md:px-3 flex items-center gap-1.5"
              title="Importar Planilha"
            >
              <span>📁</span> <span className="hidden sm:inline">Importar Planilha</span><span className="sm:hidden">Importar</span>
            </button>
          </div>
        </header>

        {/* Tab Content with Scroll */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'aba1' && <Tab1Geral />}
          {activeTab === 'aba2' && <Tab2Analitico />}
          {activeTab === 'aba3' && <Tab3Familias />}
          {activeTab === 'aba4' && <Tab4Picos />}
          {activeTab === 'aba5' && <Tab5Mecanicos />}
          {activeTab === 'aba6' && (
            <Tab6Explorador
              onEdit={handleOpenEdit}
              onDelete={handleDeleteOS}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <MonthManagerModal
        open={isManageMonthsOpen}
        onClose={() => setIsManageMonthsOpen(false)}
      />

      <EditOSModal
        open={editState.open}
        onClose={() => setEditState({ open: false, index: null, record: null })}
        registro={editState.record}
        index={editState.index}
      />
    </div>
  );
}

