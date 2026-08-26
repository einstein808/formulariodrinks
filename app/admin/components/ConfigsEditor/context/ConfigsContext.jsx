"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { firebaseObjToArray, arrayToFirebaseObj } from '@/lib/utils';
import { CUSTOS_CATEGORIAS_DEFAULT } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';

const ConfigsContext = createContext(null);

export function ConfigsProvider({ children }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados das seções
  const [drinks, setDrinks] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [general, setGeneral] = useState({ 
    siteUrl: '', googleReviewLink: '', adminPhone: '', precoCopoVidro: '', googleReviewsPrint: '',
    companyName: '', companyCity: '', primaryColor: '', instagramUrl: '', whatsappNumber: '', 
    logoUrl: '', siteTitle: '', siteSubtitle: '', themeMode: 'dark', orcamentoIntro: '', orcamentoFim: '', contratoLegenda: ''
  });
  const [evolutionApi, setEvolutionApi] = useState({ url: '', instance: '', apikey: '' });
  const [scripts, setScripts] = useState({
    autoridade: { text: '', image: '' },
    escassez: { text: '', image: '' },
    posEvento: { text: '', image: '' },
    contrato: { text: '', image: '' },
    retarget30: { text: '', image: '' },
    retarget15: { text: '', image: '' }
  });
  const [abTesting, setAbTesting] = useState({
    active: false,
    hideMaoDeObraInB: false,
    campaignName: 'campanha_padrao'
  });
  const [shoppingConfig, setShoppingConfig] = useState({
    margemSeguranca: 10,
    nonAlcoholicPercentage: 15,
    itensFixos: []
  });
  const [galeria, setGaleria] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [custosCategorias, setCustosCategorias] = useState(CUSTOS_CATEGORIAS_DEFAULT);
  const [avaliacoes, setAvaliacoes] = useState([]);

  // Assinatura Firebase
  useEffect(() => {
    const configRef = ref(db, 'config');
    const unsubConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.drinksMenu) setDrinks(firebaseObjToArray(data.drinksMenu));
        if (data.pacotes) setPacotes(firebaseObjToArray(data.pacotes));
        if (data.abTesting) setAbTesting(data.abTesting);
        if (data.general) setGeneral(data.general);
        if (data.evolutionApi) setEvolutionApi(data.evolutionApi);
        if (data.scripts) setScripts(data.scripts);
        if (data.galeriaEventos) setGaleria(firebaseObjToArray(data.galeriaEventos));
        if (data.shoppingConfig) {
          const cfg = { ...data.shoppingConfig };
          if (cfg.itensFixos) {
            cfg.itensFixos = cfg.itensFixos.map(item => ({
              ...item,
              tipoCalc: item.tipoCalc || 'porConvidado'
            }));
          }
          setShoppingConfig(cfg);
        }
        if (data.tiposEvento) setTiposEvento(firebaseObjToArray(data.tiposEvento));
        if (data.custosCategorias) {
          setCustosCategorias(firebaseObjToArray(data.custosCategorias));
        } else {
          setCustosCategorias(CUSTOS_CATEGORIAS_DEFAULT);
        }
      }
      setLoading(false);
    });

    const avaliacoesRef = ref(db, 'avaliacoes');
    const unsubAvaliacoes = onValue(avaliacoesRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setAvaliacoes(firebaseObjToArray(val));
      } else {
        setAvaliacoes([]);
      }
    });

    return () => {
      unsubConfig();
      unsubAvaliacoes();
    };
  }, []);

  // Salvar seção ativa com granularidade
  const saveSection = async (activeTab) => {
    setSaving(true);
    try {
      if (activeTab === 'drinks') {
        const sorted = drinks.map((d, i) => ({ ...d, order: i }));
        await set(ref(db, 'config/drinksMenu'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'pacotes') {
        const sorted = pacotes.map((p, i) => ({ ...p, order: i }));
        await set(ref(db, 'config/pacotes'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'abTesting') {
        await set(ref(db, 'config/abTesting'), abTesting);
      } else if (activeTab === 'geral') {
        await set(ref(db, 'config/general'), general);
      } else if (activeTab === 'evolutionApi') {
        await set(ref(db, 'config/evolutionApi'), evolutionApi);
      } else if (activeTab === 'scripts') {
        await set(ref(db, 'config/scripts'), scripts);
        await set(ref(db, 'config/general'), general);
      } else if (activeTab === 'galeria') {
        const sorted = galeria.map((e, i) => ({ ...e, order: i }));
        await set(ref(db, 'config/galeriaEventos'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'shopping') {
        await set(ref(db, 'config/shoppingConfig'), shoppingConfig);
      } else if (activeTab === 'eventos') {
        const sorted = tiposEvento.map((t, i) => ({ ...t, order: i }));
        await set(ref(db, 'config/tiposEvento'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'financeiro') {
        const sorted = custosCategorias.map((c, i) => ({ ...c, order: i }));
        await set(ref(db, 'config/custosCategorias'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'avaliacoes') {
        await set(ref(db, 'avaliacoes'), arrayToFirebaseObj(avaliacoes));
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const value = {
    loading,
    saving,
    drinks, setDrinks,
    pacotes, setPacotes,
    general, setGeneral,
    evolutionApi, setEvolutionApi,
    scripts, setScripts,
    abTesting, setAbTesting,
    shoppingConfig, setShoppingConfig,
    galeria, setGaleria,
    tiposEvento, setTiposEvento,
    custosCategorias, setCustosCategorias,
    avaliacoes, setAvaliacoes,
    saveSection
  };

  return (
    <ConfigsContext.Provider value={value}>
      {children}
    </ConfigsContext.Provider>
  );
}

export function useConfigs() {
  const context = useContext(ConfigsContext);
  if (!context) {
    throw new Error('useConfigs deve ser usado dentro de um ConfigsProvider');
  }
  return context;
}