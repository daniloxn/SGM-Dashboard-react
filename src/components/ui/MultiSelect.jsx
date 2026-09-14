// src/components/ui/MultiSelect.jsx
// Reusable multi-select checkbox dropdown component
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

/**
 * Props:
 *  - id: string (unique DOM ID for the list)
 *  - options: Array<string | { value: string, label: string, type?: 'family'|'tag' }>
 *  - selected: string[]
 *  - onChange: (selected: string[]) => void
 *  - defaultValue: string   (the "all" sentinel value, e.g. 'TODOS' or 'GERAL')
 *  - defaultLabel: string   (label shown for the "all" option)
 *  - placeholder: string    (text in the trigger button when nothing selected)
 *  - className: string
 */
export default function MultiSelect({
  id,
  options = [],
  selected = [],
  onChange,
  defaultValue = 'TODOS',
  defaultLabel = 'Todos',
  placeholder = 'Selecione...',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAll = selected.length === 0 || selected.includes(defaultValue);

  // Normalize option to { value, label, type }
  const normalized = options.map(o => {
    if (typeof o === 'string') {
      if (o.startsWith('[FAMILIA_SGM]')) return { value: o, label: o.replace('[FAMILIA_SGM] ', ''), type: 'family' };
      if (o.startsWith('[TAG_SGM]'))    return { value: o, label: o.replace('[TAG_SGM] ', ''),    type: 'tag' };
      return { value: o, label: o, type: null };
    }
    return o;
  });

  const filtered = search.trim()
    ? normalized.filter(o => o.label.toUpperCase().includes(search.toUpperCase()))
    : normalized;

  function toggle(value) {
    if (value === defaultValue) {
      onChange([defaultValue]);
      return;
    }
    let next = selected.filter(v => v !== defaultValue);
    if (next.includes(value)) {
      next = next.filter(v => v !== value);
    } else {
      next = [...next, value];
    }
    if (next.length === 0) next = [defaultValue];
    onChange(next);
  }

  function selectAll() {
    const all = filtered.map(o => o.value);
    const next = all.length ? all : [defaultValue];
    onChange(next);
  }

  function clearAll() {
    onChange([defaultValue]);
    setSearch('');
  }

  // Header label
  let headerLabel = placeholder;
  if (isAll) {
    headerLabel = defaultLabel;
  } else if (selected.length === 1) {
    const found = normalized.find(o => o.value === selected[0]);
    if (found) {
      const prefix = found.type === 'family' ? 'FAM: ' : found.type === 'tag' ? 'TAG: ' : '';
      headerLabel = prefix + found.label;
    } else {
      headerLabel = selected[0];
    }
  } else {
    headerLabel = `${selected.length} selecionados`;
  }

  return (
    <div ref={ref} className={clsx('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-200 hover:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all gap-2 shadow-xs"
      >
        <span className="truncate text-left font-medium">{headerLabel}</span>
        <svg className={clsx('w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden text-slate-900 dark:text-white">
          {/* Toolbar */}
          <div className="p-2 border-b border-slate-200 dark:border-white/5 space-y-2 bg-slate-50/50 dark:bg-transparent">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar..."
              onClick={e => e.stopPropagation()}
              className="w-full bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <div className="flex items-center justify-between px-0.5">
              <div className="flex gap-2">
                <button onClick={selectAll} type="button" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">Marcar Todos</button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button onClick={clearAll} type="button" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Limpar</button>
              </div>
              <span className="text-xs text-slate-500">
                {search ? `${filtered.length} de ${normalized.length}` : `${normalized.length} opções`}
              </span>
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {/* Default "all" option */}
            <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-800"
                checked={isAll}
                onChange={() => clearAll()}
              />
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{defaultLabel}</span>
            </label>

            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-500">Nenhum resultado encontrado</div>
            )}

            {filtered.map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-800"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span className="text-sm flex items-center gap-1.5 min-w-0 font-medium">
                  {opt.type === 'family' && <span className="badge-family shrink-0">FAM.</span>}
                  {opt.type === 'tag'    && <span className="badge-tag shrink-0">TAG</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

