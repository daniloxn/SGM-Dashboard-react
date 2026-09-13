// src/hooks/useFirestore.js
// Handles all Firestore data operations cleanly and stably
import { useCallback } from 'react';
import {
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc,
  query, orderBy, writeBatch, where, setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useStore from '../store/useStore';
import {
  reconciliarComponente,
  sincronizarComponentesComOrdens,
  getEventoTimestamp,
  limparNomeBase
} from '../lib/dataUtils';
import { formatarSonda } from '../lib/whatsappParser';

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

  /** Delete records of a specific date in a month from Firestore + store */
  const deletarPorData = useCallback(async (nomeMes, dataStr) => {
    const { setDbStatus, excluirPorData, bancoGeral } = useStore.getState();
    setDbStatus('syncing', `Apagando ${dataStr} em ${nomeMes}...`);
    try {
      const docsParaExcluir = bancoGeral.filter(r =>
        r['Aba_Origem'] === nomeMes &&
        (r['Data_Limpa'] === dataStr || r['Início da OS']?.startsWith?.(dataStr) || r['Data']?.startsWith?.(dataStr))
      );

      const chunks = [];
      let batch = writeBatch(db);
      let count = 0;
      const idsExcluidos = new Set();

      for (const reg of docsParaExcluir) {
        if (reg._docId) {
          batch.delete(doc(db, 'sgm_ordens', reg._docId));
          idsExcluidos.add(reg._docId);
          count++;
          if (count === 400) {
            chunks.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        }
      }

      // Consulta de segurança caso haja documentos no Firestore com Data_Limpa igual
      try {
        const snap = await getDocs(
          query(collection(db, 'sgm_ordens'), where('Aba_Origem', '==', nomeMes), where('Data_Limpa', '==', dataStr))
        );
        snap.forEach(d => {
          if (!idsExcluidos.has(d.id)) {
            batch.delete(d.ref);
            idsExcluidos.add(d.id);
            count++;
            if (count === 400) {
              chunks.push(batch.commit());
              batch = writeBatch(db);
              count = 0;
            }
          }
        });
      } catch (e) {
        // Fallback silencioso se o índice composto não existir
      }

      if (count > 0) chunks.push(batch.commit());
      await Promise.all(chunks);

      // Exclui do Zustand
      excluirPorData(nomeMes, dataStr);

      // Se o mês não tem mais ordens restantes, remove de sgm_meses
      const restante = useStore.getState().bancoGeral.filter(r => r['Aba_Origem'] === nomeMes);
      if (restante.length === 0) {
        await deleteDoc(doc(db, 'sgm_meses', nomeMes)).catch(() => {});
      }

      const novoBanco = useStore.getState().bancoGeral;
      setDbStatus('online', `Nuvem: ${novoBanco.length} O.S.`);
      return { totalExcluidos: idsExcluidos.size || docsParaExcluir.length };
    } catch (err) {
      setDbStatus('error', 'Erro ao excluir por data');
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

  /** Carrega todas as O.S. da Oficina do Firestore */
  const carregarOsOficina = useCallback(async () => {
    const { setOsOficinaList } = useStore.getState();
    try {
      const snap = await getDocs(query(collection(db, 'sgm_os_oficina'), orderBy('dataHoraISO', 'desc')));
      const lista = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setOsOficinaList(lista);
      return lista;
    } catch (err) {
      console.error('Erro ao carregar O.S. da oficina:', err);
      // Fallback sem orderBy caso o índice composto do Firestore ainda não exista
      try {
        const snap = await getDocs(collection(db, 'sgm_os_oficina'));
        const lista = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        lista.sort((a, b) => new Date(b.dataHoraISO || 0) - new Date(a.dataHoraISO || 0));
        setOsOficinaList(lista);
        return lista;
      } catch (e) {
        console.error('Falha no fallback de O.S. oficina:', e);
        return [];
      }
    }
  }, []);

  /** Carrega o inventário e histórico de todos os componentes com reconciliação cronológica automática */
  const carregarComponentes = useCallback(async (osListaParam = null) => {
    const { setComponentesList, osOficinaList } = useStore.getState();
    try {
      let ordens = osListaParam || osOficinaList;
      if (!ordens || ordens.length === 0) {
        try {
          const snapOs = await getDocs(collection(db, 'sgm_os_oficina'));
          ordens = snapOs.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (e) {
          ordens = [];
        }
      }

      const snap = await getDocs(collection(db, 'sgm_componentes'));
      const componentesBrutos = snap.docs.map(d => ({ ...d.data(), id: d.id }));

      // Sincroniza e reconcilia estritamente por ordem cronológica de datas
      const listaSincronizada = sincronizarComponentesComOrdens(ordens, componentesBrutos);
      setComponentesList(listaSincronizada);

      // Auto-heal: Atualiza no Firestore quaisquer componentes que estavam com status invertido/antigo
      const batch = writeBatch(db);
      let houveAlteracao = false;
      listaSincronizada.forEach(comp => {
        const antigo = componentesBrutos.find(c => c.id === comp.id);
        const mudouLocal = !antigo || antigo.localizacao !== comp.localizacao || antigo.sondaAtual !== comp.sondaAtual;
        const mudouHist = !antigo || (antigo.historico?.length || 0) !== (comp.historico?.length || 0);
        if (mudouLocal || mudouHist) {
          batch.set(doc(db, 'sgm_componentes', comp.id), comp, { merge: true });
          houveAlteracao = true;
        }
      });
      if (houveAlteracao) {
        await batch.commit().catch(e => console.warn('Aviso ao sincronizar componentes com Firestore:', e));
      }

      return listaSincronizada;
    } catch (err) {
      console.error('Erro ao carregar componentes:', err);
      return [];
    }
  }, []);

  /** Grava novas O.S. vindas do WhatsApp e atualiza o rastreamento dos componentes com validação estrita de datas */
  const salvarNovasOsOficina = useCallback(async (novasOs) => {
    const { osOficinaList, setOsOficinaList, componentesList, setComponentesList } = useStore.getState();
    const batch = writeBatch(db);
    const osAdicionadas = [];

    // Clona o mapa de componentes existentes
    const componentesMap = new Map(componentesList.map(c => [c.id, {
      ...c,
      historico: [...(c.historico || [])]
    }]));

    for (const item of novasOs) {
      const docRef = doc(collection(db, 'sgm_os_oficina'));
      const agora = new Date().toISOString();
      const sondaFormatada = formatarSonda(item.sonda || '');
      const payloadOs = {
        data: item.data || '',
        dataBr: item.dataBr || '',
        hora: item.hora || '00:00',
        dataHoraISO: item.dataHoraISO || `${item.data}T${item.hora || '00:00'}:00`,
        timestamp: item.timestamp || getEventoTimestamp(item),
        sonda: sondaFormatada,
        turno: item.turno || '',
        turma: item.turma || '',
        sondador: item.sondador || '',
        componente: item.componente || '',
        saiuNumero: item.saiuNumero || '',
        entrouNumero: item.entrouNumero || '',
        problema: item.problema || '',
        status: item.status || 'aberta',
        osSodepAssociada: item.osSodepAssociada || null,
        docSodepAssociadoId: item.docSodepAssociadoId || null,
        dataConclusao: item.dataConclusao || null,
        criadoEm: agora,
        atualizadoEm: agora,
        textoOriginal: item.textoOriginal || ''
      };

      batch.set(docRef, payloadOs);
      const osItemCompleta = { ...payloadOs, id: docRef.id };
      osAdicionadas.push(osItemCompleta);

      const compFamilia = limparNomeBase(item.componente || '');
      const dataHoraEvento = payloadOs.dataHoraISO;
      const tsEvento = payloadOs.timestamp;

      // 1. Componente que SAIU: adiciona o evento e recalcula estado por ordem de data
      if (compFamilia && item.saiuNumero) {
        const compId = `${compFamilia}_${String(item.saiuNumero).trim()}`.replace(/\s+/g, '_');
        const existente = componentesMap.get(compId) || {
          id: compId,
          tipo: compFamilia,
          numero: String(item.saiuNumero).trim(),
          historico: []
        };

        const novoEvento = {
          dataHora: dataHoraEvento,
          timestamp: tsEvento,
          tipoEvento: 'saiu_sonda',
          sonda: sondaFormatada,
          osOficinaId: docRef.id,
          observacao: `Saiu da sonda ${sondaFormatada}. Problema: ${item.problema || 'Não especificado'}`
        };

        const compAtualizado = reconciliarComponente({
          ...existente,
          tipo: compFamilia,
          numero: String(item.saiuNumero).trim(),
          historico: [novoEvento, ...(existente.historico || [])],
          atualizadoEm: agora
        });

        componentesMap.set(compId, compAtualizado);
      }

      // 2. Componente que ENTROU: adiciona o evento e recalcula estado por ordem de data
      if (compFamilia && item.entrouNumero) {
        const compId = `${compFamilia}_${String(item.entrouNumero).trim()}`.replace(/\s+/g, '_');
        const existente = componentesMap.get(compId) || {
          id: compId,
          tipo: compFamilia,
          numero: String(item.entrouNumero).trim(),
          historico: []
        };

        const novoEvento = {
          dataHora: dataHoraEvento,
          timestamp: tsEvento,
          tipoEvento: 'entrou_sonda',
          sonda: sondaFormatada,
          osOficinaId: docRef.id,
          observacao: `Instalado na sonda ${sondaFormatada} (Turno ${item.turno || '-'}, Turma ${item.turma || '-'})`
        };

        const compAtualizado = reconciliarComponente({
          ...existente,
          tipo: compFamilia,
          numero: String(item.entrouNumero).trim(),
          historico: [novoEvento, ...(existente.historico || [])],
          atualizadoEm: agora
        });

        componentesMap.set(compId, compAtualizado);
      }
    }

    // Persiste no batch todos os componentes reconciliados
    componentesMap.forEach((comp, compId) => {
      batch.set(doc(db, 'sgm_componentes', compId), comp, { merge: true });
    });

    await batch.commit();

    // Atualiza estado local no Zustand
    const novaListaOs = [...osAdicionadas, ...osOficinaList].sort((a, b) => getEventoTimestamp(b) - getEventoTimestamp(a));
    setOsOficinaList(novaListaOs);
    setComponentesList(Array.from(componentesMap.values()));

    return osAdicionadas;
  }, []);

  /** Atualiza uma O.S. da Oficina e recalcula a rastreabilidade dos componentes afetados */
  const atualizarOsOficina = useCallback(async (id, dadosAtualizados) => {
    const { osOficinaList, setOsOficinaList, componentesList, setComponentesList } = useStore.getState();
    const agora = new Date().toISOString();
    const payload = { ...dadosAtualizados, atualizadoEm: agora };
    await updateDoc(doc(db, 'sgm_os_oficina', id), payload);

    const novaListaOs = osOficinaList.map(o => (o.id === id ? { ...o, ...payload } : o));
    setOsOficinaList(novaListaOs);

    // Reconcilia os componentes afetados com a nova lista de OS
    const componentesReconciliados = sincronizarComponentesComOrdens(novaListaOs, componentesList);
    setComponentesList(componentesReconciliados);

    // Atualiza no Firestore os componentes que mudaram
    const batch = writeBatch(db);
    componentesReconciliados.forEach(c => {
      batch.set(doc(db, 'sgm_componentes', c.id), c, { merge: true });
    });
    await batch.commit().catch(e => console.warn('Erro ao atualizar componentes no Firestore:', e));
  }, []);

  /** Exclui uma O.S. da Oficina e restabelece a localização anterior das peças */
  const excluirOsOficina = useCallback(async (id) => {
    const { osOficinaList, setOsOficinaList, componentesList, setComponentesList } = useStore.getState();
    await deleteDoc(doc(db, 'sgm_os_oficina', id));

    const novaListaOs = osOficinaList.filter(o => o.id !== id);
    setOsOficinaList(novaListaOs);

    // Reconcilia os componentes sem a OS excluída (reverte para o estado da data anterior)
    const componentesReconciliados = sincronizarComponentesComOrdens(novaListaOs, componentesList);
    setComponentesList(componentesReconciliados);

    const batch = writeBatch(db);
    componentesReconciliados.forEach(c => {
      batch.set(doc(db, 'sgm_componentes', c.id), c, { merge: true });
    });
    await batch.commit().catch(e => console.warn('Erro ao sincronizar componentes após exclusão:', e));
  }, []);

  /** Conclui uma O.S. da oficina manualmente (sem vínculo obrigatório com SODEP) */
  const concluirOsOficinaManual = useCallback(async (id, observacao = '') => {
    const { osOficinaList, atualizarOsOficinaState, componentesList, setComponentesList } = useStore.getState();
    const osItem = osOficinaList.find(o => o.id === id);
    if (!osItem) return;

    const agora = new Date().toISOString();
    const payload = {
      status: 'concluida',
      dataConclusao: agora,
      atualizadoEm: agora
    };

    const batch = writeBatch(db);
    batch.update(doc(db, 'sgm_os_oficina', id), payload);

    const compFamilia = limparNomeBase(osItem.componente || '');
    let componentesAtualizados = [...componentesList];

    if (compFamilia && osItem.saiuNumero) {
      const compId = `${compFamilia}_${String(osItem.saiuNumero).trim()}`.replace(/\s+/g, '_');
      const compExistente = componentesList.find(c => c.id === compId) || {
        id: compId, tipo: compFamilia, numero: String(osItem.saiuNumero).trim(), historico: []
      };

      const novoEvento = {
        dataHora: agora,
        timestamp: Date.now(),
        tipoEvento: 'conclusao_manutencao',
        osOficinaId: id,
        observacao: observacao || 'Manutenção concluída na oficina. Componente pronto na reserva.'
      };

      const compFinal = reconciliarComponente({
        ...compExistente,
        historico: [novoEvento, ...(compExistente.historico || [])],
        atualizadoEm: agora
      });

      batch.set(doc(db, 'sgm_componentes', compId), compFinal, { merge: true });
      componentesAtualizados = componentesAtualizados.map(c => c.id === compId ? compFinal : c);
      if (!componentesList.some(c => c.id === compId)) {
        componentesAtualizados.push(compFinal);
      }
    }

    await batch.commit();
    atualizarOsOficinaState(id, payload);
    setComponentesList(componentesAtualizados);
  }, []);

  /** Associa a O.S. do WhatsApp à O.S. Fechada do sistema SODEP com validação temporal estrita */
  const associarOsSodep = useCallback(async (osOficinaId, osSodepNum, docSodepId, dadosSodep) => {
    const { osOficinaList, atualizarOsOficinaState, componentesList, setComponentesList } = useStore.getState();
    const osItem = osOficinaList.find(o => o.id === osOficinaId);
    if (!osItem) throw new Error('O.S. da oficina não encontrada.');

    // Validação temporal: data/hora da O.S. SODEP deve ser maior ou igual à data/hora de abertura
    const timeAbertura = getEventoTimestamp(osItem);

    // Obter data/hora da O.S. SODEP
    let timeFechamento = null;
    if (dadosSodep) {
      const inicioSodep = dadosSodep['Início da OS'] || dadosSodep['INÍCIO DA OS'] || dadosSodep['Data_Limpa'];
      if (inicioSodep) {
        timeFechamento = getEventoTimestamp({ dataHora: inicioSodep });
      }
    }

    // Se ambos tiverem timestamps válidos, verifica se fechada é anterior à abertura
    if (timeFechamento && timeAbertura && timeFechamento < timeAbertura) {
      throw new Error(
        `Inconsistência temporal: A O.S. SODEP (${new Date(timeFechamento).toLocaleString('pt-BR')}) ` +
        `não pode ter horário anterior à abertura da O.S. no WhatsApp (${new Date(timeAbertura).toLocaleString('pt-BR')}).`
      );
    }

    const agora = new Date().toISOString();
    const payload = {
      status: 'concluida',
      osSodepAssociada: String(osSodepNum).trim(),
      docSodepAssociadoId: docSodepId || null,
      dataConclusao: agora,
      atualizadoEm: agora
    };

    const batch = writeBatch(db);
    batch.update(doc(db, 'sgm_os_oficina', osOficinaId), payload);

    // Atualiza componente que saiu para OFICINA_RESERVA
    const compFamilia = limparNomeBase(osItem.componente || '');
    let componentesAtualizados = [...componentesList];

    if (compFamilia && osItem.saiuNumero) {
      const compId = `${compFamilia}_${String(osItem.saiuNumero).trim()}`.replace(/\s+/g, '_');
      const compExistente = componentesList.find(c => c.id === compId) || {
        id: compId, tipo: compFamilia, numero: String(osItem.saiuNumero).trim(), historico: []
      };

      const novoEvento = {
        dataHora: agora,
        timestamp: Date.now(),
        tipoEvento: 'conclusao_manutencao',
        osOficinaId: osOficinaId,
        osSodep: String(osSodepNum).trim(),
        observacao: `Associada à O.S. SODEP ${osSodepNum}. Manutenção finalizada e componente disponível na reserva.`
      };

      const compFinal = reconciliarComponente({
        ...compExistente,
        historico: [novoEvento, ...(compExistente.historico || [])],
        atualizadoEm: agora
      });

      batch.set(doc(db, 'sgm_componentes', compId), compFinal, { merge: true });
      componentesAtualizados = componentesAtualizados.map(c => c.id === compId ? compFinal : c);
      if (!componentesList.some(c => c.id === compId)) {
        componentesAtualizados.push(compFinal);
      }
    }

    await batch.commit();
    atualizarOsOficinaState(osOficinaId, payload);
    setComponentesList(componentesAtualizados);
  }, []);

  /** Ajuste manual da localização de um componente (inventário físico) */
  const ajustarComponenteManual = useCallback(async (componenteId, novaLocalizacao, sonda = null, motivo = '') => {
    const { componentesList, setComponentesList } = useStore.getState();
    const compExistente = componentesList.find(c => c.id === componenteId);
    if (!compExistente) throw new Error('Componente não encontrado.');

    const agora = new Date().toISOString();
    const sondaFormatada = formatarSonda(sonda || '');
    const novoEvento = {
      dataHora: agora,
      timestamp: Date.now(),
      tipoEvento: 'ajuste_manual',
      novaLocalizacao,
      sonda: novaLocalizacao === 'SONDA' ? sondaFormatada : null,
      observacao: motivo ? `Ajuste manual: ${motivo}` : 'Ajuste manual de localização'
    };

    const compAtualizado = reconciliarComponente({
      ...compExistente,
      historico: [novoEvento, ...(compExistente.historico || [])],
      atualizadoEm: agora
    });

    await setDoc(doc(db, 'sgm_componentes', componenteId), compAtualizado, { merge: true });
    setComponentesList(componentesList.map(c => c.id === componenteId ? compAtualizado : c));
  }, []);

  /** Força uma sincronização/reconciliação completa de todas as peças com base nas datas de todas as O.S. */
  const sincronizarRastreabilidade = useCallback(async () => {
    const { osOficinaList, componentesList, setComponentesList } = useStore.getState();
    let todasOs = osOficinaList;
    if (!todasOs || todasOs.length === 0) {
      const snapOs = await getDocs(collection(db, 'sgm_os_oficina'));
      todasOs = snapOs.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    const snapComp = await getDocs(collection(db, 'sgm_componentes'));
    const compExistentes = snapComp.docs.map(d => ({ ...d.data(), id: d.id }));

    const listaReconciliada = sincronizarComponentesComOrdens(todasOs, compExistentes.length > 0 ? compExistentes : componentesList);
    setComponentesList(listaReconciliada);

    const batch = writeBatch(db);
    listaReconciliada.forEach(c => {
      batch.set(doc(db, 'sgm_componentes', c.id), c, { merge: true });
    });
    await batch.commit().catch(e => console.warn('Aviso ao sincronizar componentes:', e));
    return listaReconciliada;
  }, []);

  return {
    carregarDados,
    importarDados,
    deletarMes,
    deletarPorData,
    deletarOS,
    salvarEdicaoOS,
    carregarOsOficina,
    carregarComponentes,
    salvarNovasOsOficina,
    atualizarOsOficina,
    excluirOsOficina,
    concluirOsOficinaManual,
    associarOsSodep,
    ajustarComponenteManual,
    sincronizarRastreabilidade
  };
}
