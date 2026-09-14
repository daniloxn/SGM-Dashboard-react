// src/components/modals/EditOSModal.jsx
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useFirestore } from '../../hooks/useFirestore';
import { normalizarSonda } from '../../lib/dataUtils';

export default function EditOSModal({ open, onClose, registro, index }) {
  const { salvarEdicaoOS } = useFirestore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    os: '', data: '', mes: '', sonda: '', componente: '', falha: '', mecanico: '',
  });

  useEffect(() => {
    if (registro) {
      setForm({
        os:         registro['OS'] || '',
        data:       registro['Data_Limpa'] || '',
        mes:        registro['Aba_Origem'] || '',
        sonda:      normalizarSonda(registro['Causa'] || ''),
        componente: registro['Componentes'] || registro['COMPONENTES'] || '',
        falha:      registro['falhas'] || registro['FALHAS'] || '',
        mecanico:   registro['Mecânico'] || registro['MECANICO'] || '',
      });
    }
  }, [registro]);

  function handleChange(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    const sondaVal = form.sonda.trim();
    const dadosAtualizados = {
      'OS': form.os.trim(),
      'Data_Limpa': form.data.trim() || 'S/D',
      'Aba_Origem': form.mes.trim().toUpperCase(),
      'Causa': sondaVal ? (sondaVal.startsWith('SD-') ? `MANUTENÇÃO SONDAGEM ${sondaVal}` : sondaVal) : 'MANUTENÇÃO SONDAGEM',
      'Componentes': form.componente.trim().toUpperCase(),
      'COMPONENTES': form.componente.trim().toUpperCase(),
      'falhas': form.falha.trim().toUpperCase(),
      'FALHAS': form.falha.trim().toUpperCase(),
      'Mecânico': form.mecanico.trim().toUpperCase(),
      'MECANICO': form.mecanico.trim().toUpperCase(),
    };
    try {
      await salvarEdicaoOS(index, dadosAtualizados);
      onClose();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all";

  return (
    <Modal open={open} onClose={onClose} title="✏️ Editar Ordem de Serviço" size="md">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Número da O.S.</label>
          <input className={fieldClass} value={form.os} onChange={handleChange('os')} placeholder="Ex: 12345" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Data</label>
          <input className={fieldClass} type="date" value={form.data} onChange={handleChange('data')} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mês (Aba)</label>
          <input className={fieldClass} value={form.mes} onChange={handleChange('mes')} placeholder="Ex: JANEIRO" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sonda</label>
          <input className={fieldClass} value={form.sonda} onChange={handleChange('sonda')} placeholder="Ex: SD-01" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Componente / Tag</label>
          <input className={fieldClass} value={form.componente} onChange={handleChange('componente')} placeholder="Ex: MANDRIL 01" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Falha Reportada</label>
          <input className={fieldClass} value={form.falha} onChange={handleChange('falha')} placeholder="Ex: VAZAMENTO" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mecânico Responsável</label>
          <input className={fieldClass} value={form.mecanico} onChange={handleChange('mecanico')} placeholder="Nome do mecânico" />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
        <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? (
            <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
          ) : '💾 Salvar Alterações'}
        </button>
      </div>
    </Modal>
  );
}

