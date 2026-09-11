// src/hooks/useFirestore.js
// Handles all Firestore data operations cleanly and stably
import { useCallback } from 'react';
import {
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc,
  query, orderBy, writeBatch, where, setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useStore from '../store/useStore';

export function useFirestore() {
  /** Load all data from Firestore on mount */
  const carregarDados = useCallback(async () => {
    const { setDbStatus, setBancoGeral } = useStore.getState();
    setDbStatus('syncing', 'Buscando dados...');
    try {
      const mesesSnap = await getDocs(query(collection(db, 'sgm_meses'), orderBy('ordem', 'asc')));
      const mesesExistentes = mesesSnap.docs.map(d => d.id);

      const osSnap = await getDocs(collection(db, 'sgm_ordens'));
      if (!osSnap.empty) {
        const banco = osSnap.docs.map(d => ({ ...d.data(), _docId: d.id }));
        const ordemFinal = mesesExistentes.length > 0
          ? mesesExistentes
          : [...new Set(banco.map(r => r['Aba_Origem']))];
        setBancoGeral(banco, ordemFinal);
        setDbStatus('online', `Nuvem: ${banco.length} O.S.`);
      } else {
        setDbStatus('online', 'Nuvem vazia (aguardando dados)');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Firestore:', err);
      setDbStatus('error', 'Erro ao sincronizar');
    }
  }, []);

  /** Import Excel data in batches — supports 'upsert' (daily) and 'substituir' */
  const importarDados = useCallback(async (meses, dados, onProgress, modo = 'upsert') => {
    const { setDbStatus, mesclarDados, ordemMeses, bancoGeral } = useStore.getState();
    setDbStatus('syncing', 'Gravando na nuvem...');
    try {
      if (modo === 'substituir') {
        // 1. Delete old records for the specified months
        for (const mes of meses) {
          const snapAntigo = await getDocs(
            query(collection(db, 'sgm_ordens'), where('Aba_Origem', '==', mes))
          );
          if (!snapAntigo.empty) {
            const chunks = [];
            let batch = writeBatch(db);
            let count = 0;
            snapAntigo.forEach(d => {
              batch.delete(d.ref);
              count++;
              if (count === 450) { chunks.push(batch.commit()); batch = writeBatch(db); count = 0; }
            });
            if (count > 0) chunks.push(batch.commit());
            await Promise.all(chunks);
          }
        }
      }
      if (onProgress) onProgress(25);

      // 2. Write months metadata
      for (let i = 0; i < meses.length; i++) {
        const mesNome = meses[i];
        if (!mesNome) continue;
        const ordem = ordemMeses.indexOf(mesNome) >= 0 ? ordemMeses.indexOf(mesNome) : ordemMeses.length + i;
        await setDoc(doc(db, 'sgm_meses', mesNome), {
          nome: mesNome, ordem, atualizadoEm: new Date().toISOString()
        }, { merge: true });
      }
      if (onProgress) onProgress(40);

      // 3. Map existing records by OS number for smart upsert
      const mapaDocsExistentes = new Map();
      if (modo === 'upsert') {
        bancoGeral.forEach(r => {
          if (r._docId && r['OS']) {
            mapaDocsExistentes.set(String(r['OS']).trim(), r._docId);
          }
        });
      }

      // 4. Batch write records
      let batch = writeBatch(db);
      let counter = 0;
      let gravados = 0;
      const total = dados.length;

      for (const item of dados) {
        const numOS = item['OS'] ? String(item['OS']).trim() : '';
        const docExistenteId = modo === 'upsert' && numOS ? mapaDocsExistentes.get(numOS) : null;

        const docRef = docExistenteId
          ? doc(db, 'sgm_ordens', docExistenteId)
          : doc(collection(db, 'sgm_ordens'));

        const payload = {
          'OS': item['OS'] || '',
          'Início da OS': item['Início da OS'] || item['INÍCIO DA OS'] || '',
          'Data_Limpa': item['Data_Limpa'] || 'S/D',
          'Aba_Origem': item['Aba_Origem'] || '',
          'Componentes': item['Componentes'] || item['COMPONENTES'] || '',
          'falhas': item['falhas'] || item['FALHAS'] || '',
          'Causa': item['Causa'] || item['CAUSA'] || '',
          'Mecânico': item['Mecânico'] || item['MECANICO'] || '',
          'atualizadoEm': new Date().toISOString()
        };

        batch.set(docRef, payload, { merge: true });
        item._docId = docRef.id;

        counter++;
        gravados++;
        if (counter === 450) {
          await batch.commit();
          batch = writeBatch(db);
          counter = 0;
          if (onProgress) onProgress(40 + Math.round((gravados / total) * 55));
        }
      }
      if (counter > 0) await batch.commit();
      if (onProgress) onProgress(100);

      mesclarDados(meses, dados, modo);
      const novoTotal = useStore.getState().bancoGeral.length;
      setDbStatus('online', `Nuvem: ${novoTotal} O.S.`);
    } catch (err) {
      setDbStatus('error', 'Erro ao gravar');
      throw err;
    }
  }, []);

  /** Delete entire month from Firestore + store */
  const deletarMes = useCallback(async (nomeMes) => {
    const { setDbStatus, excluirMes } = useStore.getState();
    setDbStatus('syncing', `Apagando ${nomeMes}...`);
    try {
      await deleteDoc(doc(db, 'sgm_meses', nomeMes)).catch(() => {});
      const snap = await getDocs(
        query(collection(db, 'sgm_ordens'), where('Aba_Origem', '==', nomeMes))
      );
      if (!snap.empty) {
        const chunks = [];
        let batch = writeBatch(db);
        let count = 0;
        snap.forEach(d => {
          batch.delete(d.ref);
          count++;
          if (count === 400) { chunks.push(batch.commit()); batch = writeBatch(db); count = 0; }
        });
        if (count > 0) chunks.push(batch.commit());
        await Promise.all(chunks);
      }
      excluirMes(nomeMes);
      const { bancoGeral } = useStore.getState();
      setDbStatus('online', `Nuvem: ${bancoGeral.length} O.S.`);
    } catch (err) {
      setDbStatus('error', 'Erro ao excluir mês');
      throw err;
    }
  }, []);

  /** Delete one OS from Firestore + store */
  const deletarOS = useCallback(async (index) => {
    const { bancoGeral, excluirOS, setDbStatus } = useStore.getState();
    const registro = bancoGeral[index];
    if (!registro) return;
    try {
      if (registro._docId) {
        await deleteDoc(doc(db, 'sgm_ordens', registro._docId));
      }
      excluirOS(index);
      const novo = useStore.getState().bancoGeral;
      setDbStatus('online', `Nuvem: ${novo.length} O.S.`);
    } catch (err) {
      setDbStatus('error', 'Erro ao excluir O.S.');
      throw err;
    }
  }, []);

  /** Update one OS in Firestore + store */
  const salvarEdicaoOS = useCallback(async (index, dadosAtualizados) => {
    const { bancoGeral, atualizarOS, setDbStatus } = useStore.getState();
    const registro = bancoGeral[index];
    if (!registro) return;
    try {
      if (registro._docId) {
        await updateDoc(doc(db, 'sgm_ordens', registro._docId), dadosAtualizados);
      } else {
        const novoDoc = await addDoc(collection(db, 'sgm_ordens'), dadosAtualizados);
        dadosAtualizados._docId = novoDoc.id;
      }
      atualizarOS(index, dadosAtualizados);
    } catch (err) {
      setDbStatus('error', 'Erro ao salvar');
      throw err;
    }
  }, []);

  return { carregarDados, importarDados, deletarMes, deletarOS, salvarEdicaoOS };
}
