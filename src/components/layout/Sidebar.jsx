// src/components/layout/Sidebar.jsx
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import useStore from '../../store/useStore';

const tabs = [
  { id: 'aba1', icon: '📊', label: 'Visão Geral' },
  { id: 'aba7', icon: '🛠️', label: 'Oficina & WhatsApp' },
  { id: 'aba2', icon: '🔬', label: 'Painel Analítico' },
  { id: 'aba3', icon: '📈', label: 'Evolução Famílias' },
  { id: 'aba4', icon: '📅', label: 'Picos Diários' },
  { id: 'aba5', icon: '🔧', label: 'Por Mecânico' },
  { id: 'aba6', icon: '🗂️', label: 'Explorador' },
  { id: 'config', icon: '⚙️', label: 'Configurações' },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  onImport,
  onManageMonths,
  onExport,
  mobileOpen = false,
  onCloseMobile
}) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sgm_sidebar_collapsed') === 'true');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const dbStatus = useStore(s => s.dbStatus);
  const dbMsg = useStore(s => s.dbMsg);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sgm_sidebar_collapsed', next);
    // Let charts resize
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }

  async function handleLogout() {
    await signOut(auth);
  }

  // Close menu on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusColor = {
    idle: 'bg-slate-400 dark:bg-slate-500',
    syncing: 'bg-amber-500 dark:bg-yellow-400 animate-pulse',
    online: 'bg-emerald-500 dark:bg-emerald-400',
    error: 'bg-red-500',
  }[dbStatus] || 'bg-slate-400';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={clsx(
        'fixed md:static inset-y-0 left-0 z-50 flex flex-col h-screen bg-white/95 dark:bg-slate-900/90 backdrop-blur border-r border-slate-200 dark:border-white/5 transition-all duration-300 shrink-0 shadow-xl md:shadow-none',
        collapsed ? 'w-16' : 'w-60 md:w-56',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
      {/* Top: Logo + Collapse toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-200 dark:border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900 dark:text-white">SGM</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">⚙️</span>}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className={clsx(
            'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-all',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* DB Status */}
      {!collapsed && (
        <div className="px-3 py-2 flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full shrink-0', statusColor)} />
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{dbMsg}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id);
              if (onCloseMobile) onCloseMobile();
            }}
            title={collapsed ? tab.label : undefined}
            className={clsx(
              'sidebar-nav-btn',
              activeTab === tab.id && 'active',
              collapsed && 'justify-center px-0'
            )}
          >
            <span className="text-base shrink-0">{tab.icon}</span>
            {!collapsed && <span className="text-sm truncate">{tab.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-3 space-y-1 border-t border-slate-200 dark:border-white/5 pt-2">
        {/* Data menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            title="Dados & Planilhas"
            className={clsx(
              'sidebar-nav-btn',
              collapsed && 'justify-center px-0'
            )}
          >
            <span className="text-base">🗃️</span>
            {!collapsed && (
              <>
                <span className="text-sm flex-1">Dados & Planilhas</span>
                <svg className={clsx('w-3 h-3 text-slate-400 transition-transform', menuOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {/* Popover menu */}
          {menuOpen && (
            <div className={clsx(
              'absolute z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1 min-w-[200px]',
              collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-1 left-0 right-0'
            )}>
              <label className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-lg mx-1">
                <span>📥</span> Importar Planilha
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
              </label>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onTabChange('config');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-lg mx-1 w-full text-left"
              >
                <span>⚙️</span> Controle de Dados
              </button>
              <button
                onClick={() => { setMenuOpen(false); onManageMonths(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-lg mx-1 w-full text-left"
              >
                <span>📅</span> Gerenciar Meses
              </button>
              <div className="border-t border-slate-200 dark:border-white/5 my-1" />
              <button
                onClick={() => { setMenuOpen(false); window.location.reload(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-lg mx-1 w-full text-left"
              >
                <span>🔄</span> Recarregar Dados
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sair"
          className={clsx(
            'sidebar-nav-btn text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10',
            collapsed && 'justify-center px-0'
          )}
        >
          <span className="text-base">🚪</span>
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </aside>
  </>
  );
}

