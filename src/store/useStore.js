// src/store/useStore.js
// Zustand global state — replaces all window.* globals from vanilla JS
import { create } from 'zustand';
import { processarAnalisesGlobais } from '../lib/dataUtils';

const useStore = create((set, get) => ({
  // ---- Auth ----
  user: null,
  authInitialized: false,
  setUser: (user) => set({ user, authInitialized: true }),

  // ---- DB Status ----
  dbStatus: 'idle', // 'idle' | 'syncing' | 'online' | 'error'
  dbMsg: 'Aguardando...',
  setDbStatus: (dbStatus, dbMsg) => set({ dbStatus, dbMsg }),

  // ---- Raw Data ----
  bancoGeral: [],
  ordemMeses: [],

  // ---- Computed Indexes ----
  relMeses: {},
  relDias: {},
  relCompBaseMes: {},
  relCompBaseFalhaMes: {},
  relCompRealMes: {},
  relCompRealFalhaMes: {},
  relMecMes: {},
  relMecCompMes: {},
  falhasGeraisCount: {},
  sondasUnicas: [],
  mecanicosUnicos: [],
  compBaseUnicos: [],
  compReaisUnicos: [],
  reincidenciaKPIs: null,
  alertasSemanais: null,

  // ---- Actions ----
  setBancoGeral: (bancoGeral, ordemMeses) => {
    const computed = processarAnalisesGlobais(bancoGeral);
    set({
      bancoGeral,
      ordemMeses,
      ...computed,
    });
  },

  /** Recalculate indexes after in-place mutation (edit/delete) */
  recalcular: () => {
    const { bancoGeral } = get();
    const computed = processarAnalisesGlobais(bancoGeral);
    set(computed);
  },

  /** Merge new months/records (import) — supports 'upsert' (daily) or 'substituir' */
  mesclarDados: (meses, dados, modo = 'upsert') => {
    const state = get();
    let novoBanco;

    if (modo === 'upsert') {
      // Index existing records by unique key (OS + Sonda or just OS)
      const mapaExistente = new Map();
      state.bancoGeral.forEach((r, idx) => {
        const chave = r['OS'] ? `OS_${String(r['OS']).trim()}` : `ROW_${idx}`;
        mapaExistente.set(chave, { ...r });
      });

      // Upsert new records
      dados.forEach((novo, idx) => {
        const chave = novo['OS'] ? `OS_${String(novo['OS']).trim()}` : `NEW_${idx}_${Date.now()}`;
        const existente = mapaExistente.get(chave) || {};
        mapaExistente.set(chave, { ...existente, ...novo });
      });

      novoBanco = Array.from(mapaExistente.values());
    } else {
      // Substituir meses selecionados
      const filtrado = state.bancoGeral.filter(r => !meses.includes(r['Aba_Origem']));
      novoBanco = [...filtrado, ...dados];
    }

    const novosMeses = [...state.ordemMeses];
    meses.forEach(m => { if (m && !novosMeses.includes(m)) novosMeses.push(m); });

    const computed = processarAnalisesGlobais(novoBanco);
    set({ bancoGeral: novoBanco, ordemMeses: novosMeses, ...computed });
  },

  /** Delete one OS record by index */
  excluirOS: (index) => {
    const state = get();
    const novoBanco = [...state.bancoGeral];
    novoBanco.splice(index, 1);
    const computed = processarAnalisesGlobais(novoBanco);
    set({ bancoGeral: novoBanco, ...computed });
  },

  /** Update one OS record by index */
  atualizarOS: (index, dadosAtualizados) => {
    const state = get();
    const novoBanco = [...state.bancoGeral];
    novoBanco[index] = { ...novoBanco[index], ...dadosAtualizados };
    const novosMeses = [...state.ordemMeses];
    const mesAba = dadosAtualizados['Aba_Origem'];
    if (mesAba && !novosMeses.includes(mesAba)) novosMeses.push(mesAba);
    const computed = processarAnalisesGlobais(novoBanco);
    set({ bancoGeral: novoBanco, ordemMeses: novosMeses, ...computed });
  },

  /** Delete entire month */
  excluirMes: (nomeMes) => {
    const state = get();
    const novoBanco = state.bancoGeral.filter(r => r['Aba_Origem'] !== nomeMes);
    const novosMeses = state.ordemMeses.filter(m => m !== nomeMes);
    const computed = processarAnalisesGlobais(novoBanco);
    set({ bancoGeral: novoBanco, ordemMeses: novosMeses, ...computed });
  },
}));

export default useStore;

