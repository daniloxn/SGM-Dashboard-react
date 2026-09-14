// src/components/modals/EditarOsOficinaModal.jsx
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useFirestore } from '../../hooks/useFirestore';
import { formatarDataHora, formatarSonda } from '../../lib/whatsappParser';

export default function EditarOsOficinaModal({ open, onClose, osItem, onSuccess }) {
  const { atualizarOsOficina } = useFirestore();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const [form, setForm] = useState({
    data: '',
    hora: '',
    sonda: '',
    turno: '',
    turma: '',
    sondador: '',
    componente: '',
    saiuNumero: '',
    entrouNumero: '',
    problema: '',
    status: 'aberta'
  });

  useEffect(() => {
    if (osItem) {
      setForm({
        data: osItem.data || '',
        hora: osItem.hora || '',
        sonda: osItem.sonda || '',
        turno: osItem.turno || '',
        turma: osItem.turma || '',
        sondador: osItem.sondador || '',
        componente: osItem.componente || '',
        saiuNumero: osItem.saiuNumero || '',
        entrouNumero: osItem.entrouNumero || '',
        problema: osItem.problema || '',
        status: osItem.status || 'aberta'
      });
      setErro(null);
    }
  }, [osItem]);

  function handleChange(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSalvar() {
    if (!osItem) return;
    setSalvando(true);
    setErro(null);

    const dtInfo = formatarDataHora(form.data, form.hora);
    const dadosAtualizados = {
      data: dtInfo.data,
      dataBr: dtInfo.dataBr,
      hora: dtInfo.hora,
      dataHoraISO: dtInfo.dataHoraISO,
      timestamp: dtInfo.timestamp,
      sonda: formatarSonda(form.sonda),
      turno: form.turno,
      turma: form.turma.toUpperCase().trim(),
      sondador: form.sondador.trim(),
      componente: form.componente.toUpperCase().trim(),
      saiuNumero: form.saiuNumero.trim(),
      entrouNumero: form.entrouNumero.trim(),
      problema: form.problema.trim(),
      status: form.status
    };

    try {
      await atualizarOsOficina(osItem.id, dadosAtualizados);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao editar O.S.:', err);
      setErro('Erro ao salvar alterações: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  const fieldClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  if (!osItem) return null;

  return (
    <Modal open={open} onClose={onClose} title="✏️ Editar Ordem de Serviço da Oficina" size="md">
      <div className="space-y-4">
        {erro && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
            ⚠️ {erro}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Data</label>
            <input type="date" className={fieldClass} value={form.data} onChange={handleChange('data')} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Hora</label>
            <input type="text" placeholder="02:20" className={fieldClass} value={form.hora} onChange={handleChange('hora')} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Sonda</label>
            <input type="text" placeholder="SD-14" className={fieldClass} value={form.sonda} onChange={handleChange('sonda')} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Turno</label>
            <select className={fieldClass} value={form.turno} onChange={handleChange('turno')}>
              <option value="">Selecione</option>
              <option value="1º">1º Turno (06h - 14h)</option>
              <option value="2º">2º Turno (14h - 22h)</option>
              <option value="3º">3º Turno (22h - 06h)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Turma</label>
            <input type="text" placeholder="A, B, C..." className={fieldClass} value={form.turma} onChange={handleChange('turma')} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <select className={fieldClass} value={form.status} onChange={handleChange('status')}>
              <option value="aberta">⏳ Aguardando Oficina</option>
              <option value="em_manutencao">🛠️ Em Manutenção</option>
              <option value="concluida">✅ Concluída</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Sondador</label>
            <input type="text" placeholder="Nome do sondador" className={fieldClass} value={form.sondador} onChange={handleChange('sondador')} />
          </div>

          <div className="col-span-2 sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Componente / Peça</label>
            <input type="text" placeholder="Ex: FREIO DE MOLAS, MANDRIL" className={fieldClass} value={form.componente} onChange={handleChange('componente')} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Saiu Nº (Defeito)</label>
            <input type="text" placeholder="Ex: 01" className={fieldClass} value={form.saiuNumero} onChange={handleChange('saiuNumero')} />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Entrou Nº (Substituição na Sonda)</label>
            <input type="text" placeholder="Ex: 05 (ou vazio)" className={fieldClass} value={form.entrouNumero} onChange={handleChange('entrouNumero')} />
          </div>

          <div className="col-span-2 sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Problema / Defeito</label>
            <textarea
              rows={2}
              placeholder="Descrição do problema"
              className={fieldClass}
              value={form.problema}
              onChange={handleChange('problema')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
          <button type="button" onClick={onClose} className="btn-secondary text-xs" disabled={salvando}>
            Cancelar
          </button>
          <button type="button" onClick={handleSalvar} className="btn-primary text-xs font-semibold" disabled={salvando}>
            {salvando ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
