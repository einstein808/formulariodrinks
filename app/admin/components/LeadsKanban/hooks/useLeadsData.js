import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { firebaseObjToArray } from '@/lib/utils';
import { CUSTOS_CATEGORIAS_DEFAULT } from '@/lib/constants';

export function useLeadsData() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [drinksMenu, setDrinksMenu] = useState({});
  const [pacotes, setPacotes] = useState([]);
  const [ajudantes, setAjudantes] = useState({});
  const [estoque, setEstoque] = useState([]);
  const [financeiroPresets, setFinanceiroPresets] = useState({});
  const [custosCategorias, setCustosCategorias] = useState(CUSTOS_CATEGORIAS_DEFAULT);
  const [evolutionApi, setEvolutionApi] = useState(null);
  const [scripts, setScripts] = useState(null);
  const [generalConfigs, setGeneralConfigs] = useState(null);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const leadsArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        leadsArray.sort((a, b) => {
          const timeA = new Date(a.criadoEm || a.atualizadoEm || 0).getTime();
          const timeB = new Date(b.criadoEm || b.atualizadoEm || 0).getTime();
          return timeB - timeA;
        });
        
        const updates = {};
        leadsArray.forEach(lead => {
          const custos = lead?.financeiro?.custos;
          if (!custos) return;
          Object.entries(custos).forEach(([cid, c]) => {
            const q = parseFloat(c.quantidade) || 0;
            const u = parseFloat(c.valorUnitario) || 0;
            const v = parseFloat(c.valor) || 0;
            if (q > 0 && u > 0) {
              const correctVal = q * u;
              if (Math.abs(v - correctVal) > 0.01) {
                updates[`leads/${lead.id}/financeiro/custos/${cid}/valor`] = correctVal;
                c.valor = correctVal;
              }
            }
          });
        });
        if (Object.keys(updates).length > 0) {
          update(ref(db), updates).catch(() => {});
        }

        setLeads(leadsArray);
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.evolutionApi) setEvolutionApi(data.evolutionApi);
        if (data.scripts) setScripts(data.scripts);
        if (data.general) setGeneralConfigs(data.general);
        if (data.cerimonialistas) setCerimonialistas(data.cerimonialistas);
        if (data.drinksMenu) setDrinksMenu(data.drinksMenu);
        if (data.pacotes) setPacotes(firebaseObjToArray(data.pacotes));
        if (data.ajudantes) setAjudantes(data.ajudantes); else setAjudantes({});
        if (data.estoque) {
          setEstoque(Object.entries(data.estoque).map(([id, val]) => ({ id, ...val })));
        } else {
          setEstoque([]);
        }
        if (data.financeiroPresets) {
          setFinanceiroPresets(data.financeiroPresets);
        } else {
          setFinanceiroPresets({
            'barman': { descricao: 'Barman', valor: 150 },
            'ajudante': { descricao: 'Ajudante', valor: 120 },
            'transporte': { descricao: 'Transporte', valor: 80 },
            'outros': { descricao: 'Outros', valor: 0 }
          });
        }
        if (data.custosCategorias) {
          setCustosCategorias(firebaseObjToArray(data.custosCategorias));
        } else {
          setCustosCategorias(CUSTOS_CATEGORIAS_DEFAULT);
        }
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
  }, []);

  return {
    leads,
    setLeads,
    loading,
    cerimonialistas,
    drinksMenu,
    pacotes,
    ajudantes,
    estoque,
    financeiroPresets,
    setFinanceiroPresets,
    custosCategorias,
    evolutionApi,
    scripts,
    generalConfigs
  };
}
export default useLeadsData;
