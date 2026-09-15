// src/components/ui/HelpButton.jsx
import { useState } from 'react';
import Modal from './Modal';

export default function HelpButton({
  title,
  purpose,
  howItWorks,
  whatToObserve,
  tips
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-300/80 dark:border-white/10 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 dark:bg-slate-800/80 dark:hover:bg-blue-900/30 dark:text-slate-400 dark:hover:text-blue-300 text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 shrink-0"
        title="Ajuda sobre esta análise"
        aria-label="Ajuda sobre esta análise"
      >
        ?
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`💡 Ajuda: ${title}`}
        size="md"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {/* Objetivo / Intuito */}
          {purpose && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-500/20 space-y-1">
              <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <span>🎯</span> Intuito da Análise
              </p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {purpose}
              </p>
            </div>
          )}

          {/* Como Funciona */}
          {howItWorks && (
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>⚙️</span> Como Funciona
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {howItWorks}
              </p>
            </div>
          )}

          {/* O que pode ser observado */}
          {whatToObserve && (
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🔍</span> O que Observar
              </p>
              <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {whatToObserve}
              </div>
            </div>
          )}

          {/* Dicas extras */}
          {tips && (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                <span>💡</span> Dica de Diagnóstico
              </p>
              <p className="text-amber-800 dark:text-amber-200/90 text-xs leading-relaxed">
                {tips}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
