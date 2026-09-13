import { useState } from 'react';
import Modal from '../ui/Modal';
import * as XLSX from 'xlsx';
import useStore from '../../store/useStore';
import { useFirestore } from '../../hooks/useFirestore';
import { parseExcelWorkbook } from '../../lib/dataUtils';

export default function ImportModal({ open, onClose }) {
  const [step, setStep] = useState('preview'); // 'preview' | 'loading' | 'done'
  const [preview, setPreview] = useState(null); // { meses, dados, contagemPorMes, ... }
  const [modo, setModo] = useState('upsert'); // 'upsert' (diário) | 'substituir'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const { ordemMeses, bancoGeral } = useStore();
  const { importarDados } = useFirestore();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Pentest security check: validate file size limit (max 25MB) to prevent memory exhaustion / DoS
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. O limite máximo permitido é de 25 MB.');
      e.target.value = '';
      return;
    }

    // Pentest security check: validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('Formato inválido. Por favor, envie apenas arquivos .xlsx ou .xls.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const res = parseExcelWorkbook(wb, XLSX, ordemMeses);

        if (!res.dados || res.dados.length === 0) {
          setError('Nenhum dado encontrado na planilha.');
          return;
        }

        // Count how many OS numbers in preview already exist in bancoGeral
        const osExistentes = new Set(bancoGeral.map(r => r['OS'] ? String(r['OS']).trim() : null).filter(Boolean));
        let countAtualizacoes = 0;
        let countNovas = 0;
        res.dados.forEach(r => {
          const num = r['OS'] ? String(r['OS']).trim() : '';
          if (num && osExistentes.has(num)) countAtualizacoes++;
          else countNovas++;
        });

        setPreview({
          ...res,
          countAtualizacoes,
          countNovas
        });
        setStep('preview');
        setError('');
      } catch (err) {
        setError('Erro ao ler o arquivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function confirmar() {
    if (!preview) return;
    setStep('loading');
    setProgress(0);
    try {
      await importarDados(preview.meses, preview.dados, setProgress, modo);
      setStep('done');
      setTimeout(() => { onClose(); resetModal(); }, 1200);
    } catch (err) {
      setError('Erro ao gravar: ' + err.message);
      setStep('preview');
    }
  }

  function resetModal() {
    setStep('preview');
    setPreview(null);
    setModo('upsert');
    setProgress(0);
    setError('');
  }

  function handleClose() {
    if (step === 'loading') return;
    onClose();
    setTimeout(resetModal, 300);
  }

  return (
    <Modal open={open} onClose={handleClose} title="📥 Importar Planilha de Manutenção" size="md">
      {step === 'preview' && !preview && (
        <div className="space-y-5">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>Identificação Automática:</strong> Não precisa renomear a aba com o nome do mês. O sistema lê a <strong>Data de Início da O.S.</strong> de cada linha e classifica os meses e dias automaticamente!
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-400 text-sm">Selecione o arquivo Excel (.xlsx, .xls) com as Ordens de Serviço.</p>
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-400/40 dark:border-blue-500/30 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 cursor-pointer transition-all">
            <span className="text-3xl mb-2">📂</span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Clique para selecionar o arquivo</span>
            <span className="text-xs text-slate-500 mt-1">Formatos suportados: .xlsx, .xls</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </label>
          {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">⚠️ {error}</div>}
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-4 border border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total de O.S.</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{preview.dados.length}</span>
            </div>

            {preview.usouDetecaoPorData && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                <span>🗓️</span>
                <span><strong>{preview.totalComDataDetectada} O.S.</strong> identificadas e distribuídas pela data real!</span>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Distribuição por Mês:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {preview.meses.map(m => (
                  <span key={m} className="text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 shadow-xs">
                    {m}: <strong>{preview.contagemPorMes[m] || 0}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 border border-slate-200 dark:border-white/5 space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Modo de Importação:</p>
            
            <label className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${modo === 'upsert' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-400 dark:border-blue-500/40 text-blue-900 dark:text-white shadow-xs' : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
              <input
                type="radio"
                name="modoImport"
                value="upsert"
                checked={modo === 'upsert'}
                onChange={() => setModo('upsert')}
                className="mt-1 text-blue-500"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block text-slate-900 dark:text-slate-200">📅 Importação Diária / Incremental (Recomendado)</span>
                Atualiza as O.S. existentes ({preview.countAtualizacoes}) e adiciona as novas ({preview.countNovas}) sem apagar os outros dias do mês.
              </div>
            </label>

            <label className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${modo === 'substituir' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/40 text-amber-900 dark:text-white shadow-xs' : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
              <input
                type="radio"
                name="modoImport"
                value="substituir"
                checked={modo === 'substituir'}
                onChange={() => setModo('substituir')}
                className="mt-1 text-amber-500"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block text-slate-900 dark:text-slate-200">⚠️ Substituir Meses Inteiros</span>
                Apaga todos os dados anteriores dos meses [{preview.meses.join(', ')}] e mantém apenas o arquivo atual.
              </div>
            </label>
          </div>

          {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">⚠️ {error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={confirmar} className="btn-primary text-sm font-semibold">
              💾 {modo === 'upsert' ? 'Sincronizar Diário' : 'Substituir e Salvar'}
            </button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="space-y-5 py-4">
          <div className="text-center">
            <div className="inline-block w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-slate-800 dark:text-slate-300 font-medium">Gravando na nuvem...</p>
            <p className="text-slate-500 text-sm mt-1">{progress}% concluído</p>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg">Importação concluída!</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Os dados foram sincronizados com sucesso.</p>
        </div>
      )}
    </Modal>
  );
}

