import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import MinioImageUpload from './MinioImageUpload';

function firebaseObjToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function arrayToFirebaseObj(arr) {
  const obj = {};
  arr.forEach(item => {
    const { id, ...rest } = item;
    obj[id] = rest;
  });
  return obj;
}

export default function ConfigsEditor() {
  const [activeGroup, setActiveGroup] = useState('cardapio');
  const [activeTab, setActiveTab] = useState('drinks');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [drinks, setDrinks] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [general, setGeneral] = useState({ 
    siteUrl: '', googleReviewLink: '', adminPhone: '', precoCopoVidro: '', googleReviewsPrint: '',
    companyName: '', companyCity: '', primaryColor: '', instagramUrl: '', whatsappNumber: '', 
    logoUrl: '', siteTitle: '', siteSubtitle: '' 
  });
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [evolutionApi, setEvolutionApi] = useState({ url: '', instance: '', apikey: '' });
  const [scripts, setScripts] = useState({
    autoridade: { text: '', image: '' },
    escassez: { text: '', image: '' },
    posEvento: { text: '', image: '' },
    contrato: { text: '', image: '' }
  });
  const [galeria, setGaleria] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [custosCategorias, setCustosCategorias] = useState([]);
  const [abTesting, setAbTesting] = useState({
    active: false,
    hideMaoDeObraInB: false,
    campaignName: 'campanha_padrao'
  });
  
  // Shopping List Config
  const [shoppingConfig, setShoppingConfig] = useState({
    margemSeguranca: 10,
    nonAlcoholicPercentage: 15,
    itensFixos: [] // { id, nome, quantidadePorConvidado, tipoCalc ('fixo' ou 'porConvidado') }
  });

  useEffect(() => {
    const configRef = ref(db, 'config');
    const unsubscribe = onValue(configRef, (snapshot) => {
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
          setCustosCategorias([
            { id: 'insumos', label: 'Insumos / Bebidas', color: '#00E5FF', emoji: '🧃', order: 0 },
            { id: 'equipe', label: 'Mão de Obra / Equipe', color: '#FFD54F', emoji: '👥', order: 1 },
            { id: 'logistica', label: 'Logística / Transporte', color: '#FF8A65', emoji: '🚚', order: 2 },
            { id: 'descartaveis', label: 'Descartáveis / Copos', color: '#EF5350', emoji: '🥤', order: 3 },
            { id: 'outros', label: 'Outros / Diversos', color: '#a8b8aa', emoji: '✨', order: 4 }
          ]);
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
      unsubscribe();
      unsubAvaliacoes();
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'drinks') {
        // Renumber order
        const sorted = drinks.map((d, i) => ({ ...d, order: i }));
        await set(ref(db, 'config/drinksMenu'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'pacotes') {
        const sorted = pacotes.map((p, i) => ({ ...p, order: i }));
        await set(ref(db, 'config/pacotes'), arrayToFirebaseObj(sorted));
        await set(ref(db, 'config/abTesting'), abTesting);
      } else if (activeTab === 'scripts') {
        await set(ref(db, 'config/general'), general);
        await set(ref(db, 'config/evolutionApi'), evolutionApi);
        await set(ref(db, 'config/scripts'), scripts);
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
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  /* NPS / Google Reviews Handlers */
  const addReview = () => {
    const newId = `review-${Date.now()}`;
    setAvaliacoes([...avaliacoes, { 
      id: newId, 
      nome: 'Novo Cliente', 
      sobrenome: '', 
      feedback: 'Muito bom!', 
      stars: 5, 
      printUrl: '', 
      destacado: false, 
      data: Date.now() 
    }]);
  };
  const updateReview = (id, field, value) => {
    setAvaliacoes(avaliacoes.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const deleteReview = (id) => {
    if (confirm('Deseja realmente excluir esta avaliação?')) {
      setAvaliacoes(avaliacoes.filter(r => r.id !== id));
    }
  };

  /* Costs Categories Handlers */
  const addCustoCategoria = () => {
    const newId = `cat-${Date.now()}`;
    setCustosCategorias([...custosCategorias, { id: newId, label: 'Nova Categoria', color: '#ffd54f', emoji: '✨', order: custosCategorias.length }]);
  };
  const updateCustoCategoria = (id, field, value) => {
    setCustosCategorias(custosCategorias.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeCustoCategoria = (id) => {
    if (confirm('Tem certeza que deseja excluir esta categoria? Os custos associados a ela serão marcados com a categoria padrão.')) {
      setCustosCategorias(custosCategorias.filter(c => c.id !== id));
    }
  };
  const moveCustoCategoria = (index, direction) => {
    const list = [...custosCategorias];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < list.length) {
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      setCustosCategorias(list);
    }
  };

  /* Drinks Handlers */
  const addDrink = () => {
    const newId = `drink-${Date.now()}`;
    setDrinks([...drinks, { id: newId, name: 'Novo Drink', emoji: '🍹', category: 'alcool' }]);
  };
  const updateDrink = (id, field, value) => {
    setDrinks(drinks.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const updateDrinkRecipe = (id, ingredientIndex, field, value) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      const novaReceita = [...(d.receita || [])];
      novaReceita[ingredientIndex] = { ...novaReceita[ingredientIndex], [field]: value };
      return { ...d, receita: novaReceita };
    }));
  };
  const addDrinkRecipeItem = (id) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      return { ...d, receita: [...(d.receita || []), { insumo: '', quantidade: '', unidade: 'ml' }] };
    }));
  };
  const removeDrinkRecipeItem = (id, ingredientIndex) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      const novaReceita = [...(d.receita || [])];
      novaReceita.splice(ingredientIndex, 1);
      return { ...d, receita: novaReceita };
    }));
  };
  const removeDrink = (id) => {
    if (window.confirm('Remover este drink?')) {
      setDrinks(drinks.filter(d => d.id !== id));
    }
  };

  /* Pacotes Handlers */
  const addPacote = () => {
    const newId = `pacote-${Date.now()}`;
    setPacotes([...pacotes, { id: newId, name: 'Novo Pacote', emoji: '📦', price: 'R$ 0,00', priceB: 'R$ 0,00', priceLabel: 'convidado', hoursLimit: 5, extraHourPrice: 'R$ 5,00', features: ['Feature 1'] }]);
  };
  const updatePacote = (id, field, value) => {
    setPacotes(pacotes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const removePacote = (id) => {
    if (window.confirm('Remover este pacote?')) {
      setPacotes(pacotes.filter(p => p.id !== id));
    }
  };
  const updatePacoteFeature = (pacoteId, index, value) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newFeatures = [...p.features];
      newFeatures[index] = value;
      return { ...p, features: newFeatures };
    }));
  };
  const addPacoteFeature = (pacoteId) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      return { ...p, features: [...(p.features || []), 'Nova feature'] };
    }));
  };
  const removePacoteFeature = (pacoteId, index) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newFeatures = [...p.features];
      newFeatures.splice(index, 1);
      return { ...p, features: newFeatures };
    }));
  };
  const addPacoteTier = (pacoteId) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const currentTiers = p.priceTiers || [];
      const lastMax = currentTiers.length > 0 ? (currentTiers[currentTiers.length - 1].maxGuests || 50) : 30;
      const newTier = {
        minGuests: lastMax + 1,
        maxGuests: lastMax + 30,
        fixedPrice: 2000,
        extraHourPrice: 150
      };
      return { ...p, priceTiers: [...currentTiers, newTier] };
    }));
  };
  const updatePacoteTier = (pacoteId, index, field, value) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newTiers = [...(p.priceTiers || [])];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return { ...p, priceTiers: newTiers };
    }));
  };
  const removePacoteTier = (pacoteId, index) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newTiers = [...(p.priceTiers || [])];
      newTiers.splice(index, 1);
      return { ...p, priceTiers: newTiers };
    }));
  };
  const applyRecommendedTiers = (pacoteId) => {
    const recommended = [
      { minGuests: 30, maxGuests: 50, fixedPrice: 1800, extraHourPrice: 150 },
      { minGuests: 51, maxGuests: 80, fixedPrice: 2800, extraHourPrice: 200 },
      { minGuests: 81, maxGuests: 120, fixedPrice: 3800, extraHourPrice: 250 },
      { minGuests: 121, maxGuests: 200, fixedPrice: 5500, extraHourPrice: 350 },
    ];
    setPacotes(pacotes.map(p => p.id === pacoteId ? { ...p, pricingMode: 'tier', priceTiers: recommended } : p));
  };

  const addPacoteCusto = (pacoteId) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const current = p.custosPadrao || [];
      const newCost = { item: 'Novo Item', valor: 100, quantidade: 1, categoria: 'insumos' };
      return { ...p, custosPadrao: [...current, newCost] };
    }));
  };
  const updatePacoteCusto = (pacoteId, index, field, value) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newCosts = [...(p.custosPadrao || [])];
      newCosts[index] = { ...newCosts[index], [field]: value };
      return { ...p, custosPadrao: newCosts };
    }));
  };
  const removePacoteCusto = (pacoteId, index) => {
    setPacotes(pacotes.map(p => {
      if (p.id !== pacoteId) return p;
      const newCosts = [...(p.custosPadrao || [])];
      newCosts.splice(index, 1);
      return { ...p, custosPadrao: newCosts };
    }));
  };
  const applyRecommendedCustos = (pacoteId) => {
    const recommended = [
      { item: 'Insumos & Bebidas Base', valor: 180, quantidade: 1, categoria: 'insumos' },
      { item: 'Gelo, Frutas & Insumos Perecíveis', valor: 80, quantidade: 1, categoria: 'insumos' },
      { item: 'Ajudante / Bartender', valor: 200, quantidade: 1, categoria: 'equipe' },
      { item: 'Frete & Logística', valor: 60, quantidade: 1, categoria: 'logistica' }
    ];
    setPacotes(pacotes.map(p => p.id === pacoteId ? { ...p, custosPadrao: recommended } : p));
  };

  /* Galeria Handlers */
  const addEvento = () => {
    const newId = `evento-${Date.now()}`;
    setGaleria([...galeria, { id: newId, titulo: 'Novo Evento', data: '', cidade: '', capa: '', midias: [] }]);
  };
  const updateEvento = (id, field, value) => {
    setGaleria(galeria.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeEvento = (id) => {
    if (window.confirm('Remover este evento da galeria?')) {
      setGaleria(galeria.filter(e => e.id !== id));
    }
  };
  const addMidia = (eventoId) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      return { ...e, midias: [...(e.midias || []), { url: '', tipo: 'imagem' }] };
    }));
  };
  const updateMidia = (eventoId, index, field, value) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      const newMidias = [...e.midias];
      newMidias[index] = { ...newMidias[index], [field]: value };
      return { ...e, midias: newMidias };
    }));
  };
  const removeMidia = (eventoId, index) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      const newMidias = [...e.midias];
      newMidias.splice(index, 1);
      return { ...e, midias: newMidias };
    }));
  };

  /* TiposEvento Handlers */
  const addTipoEvento = () => {
    const newId = `evento-${Date.now()}`;
    setTiposEvento([...tiposEvento, { id: newId, label: 'Novo Tipo de Evento', icon: '✨', image: '', desc: '' }]);
  };
  const updateTipoEvento = (id, field, value) => {
    setTiposEvento(tiposEvento.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const removeTipoEvento = (id) => {
    if (window.confirm('Remover este tipo de evento?')) {
      setTiposEvento(tiposEvento.filter(t => t.id !== id));
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Configurações</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gerencie o cardápio e os pacotes disponíveis.</p>
        </div>
        <button 
          className={`btn btn--primary ${saving ? 'btn--loading' : ''}`} 
          onClick={handleSave} 
          disabled={saving}
          style={{ width: 'auto' }}
        >
          {saving ? <div className="btn__spinner" /> : <><FiSave /> Salvar Alterações</>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
        {[
          { id: 'cardapio', label: '🍹 Cardápio & Preços' },
          { id: 'integracoes', label: '💬 Integrações & Comunicação' },
          { id: 'conteudo', label: '🌐 Conteúdo & Site' }
        ].map(group => (
          <button
            key={group.id}
            onClick={() => {
              setActiveGroup(group.id);
              if (group.id === 'cardapio') setActiveTab('drinks');
              else if (group.id === 'integracoes') setActiveTab('scripts');
              else if (group.id === 'conteudo') setActiveTab('galeria');
            }}
            style={{
              background: activeGroup === group.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: activeGroup === group.id ? '#000' : '#FFF',
              border: activeGroup === group.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
              flex: '1 1 auto', textAlign: 'center', transition: 'all 0.2s'
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="admin-config-tabs" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {activeGroup === 'cardapio' && [
          { id: 'drinks', label: 'Menu de Drinks' },
          { id: 'pacotes', label: 'Pacotes de Serviços' },
          { id: 'shopping', label: '🛒 Lista de Compras' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-secondary)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)', 
              padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}

        {activeGroup === 'integracoes' && [
          { id: 'scripts', label: 'Configurações & Scripts' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-secondary)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)', 
              padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}

        {activeGroup === 'conteudo' && [
          { id: 'galeria', label: '🎥 Galeria de Eventos' },
          { id: 'eventos', label: '✨ Tipos de Eventos' },
          { id: 'financeiro', label: '💸 Categorias de Custos' },
          { id: 'avaliacoes', label: '⭐ Avaliações' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-secondary)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)', 
              padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drinks' && (
        <div>
          <button className="btn btn--outline" onClick={addDrink} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Novo Drink
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drinks.map((drink) => (
              <div key={drink.id} className="admin-config-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: '60px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Emoji</label>
                    <input type="text" className="form-input" value={drink.emoji || ''} onChange={(e) => updateDrink(drink.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Nome do Drink</label>
                    <input type="text" className="form-input" value={drink.name || ''} onChange={(e) => updateDrink(drink.id, 'name', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Imagem do Drink (Opcional)</label>
                    <MinioImageUpload value={drink.image} onChange={(url) => updateDrink(drink.id, 'image', url)} placeholder="https://link-da-imagem.jpg" />
                  </div>
                  <div style={{ width: '90px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }} title="Maior peso significa que sai mais na festa">Peso (1-10)</label>
                    <input type="number" className="form-input" value={drink.popularityWeight || ''} onChange={(e) => updateDrink(drink.id, 'popularityWeight', Number(e.target.value))} min="1" max="10" placeholder="5" />
                  </div>
                  <div style={{ width: '140px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Categoria</label>
                    <select
                      className="form-select"
                      value={drink.category || (drink.isNonAlcoholic ? 'sem_alcool' : 'alcool')}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setDrinks(drinks.map(d => d.id === drink.id ? { ...d, category: cat, isNonAlcoholic: cat === 'sem_alcool' } : d));
                      }}
                      style={{ padding: '8px', fontSize: '0.85rem', width: '100%' }}
                    >
                      <option value="alcool">🍸 Alcoólico</option>
                      <option value="sem_alcool">🧃 Sem Álcool</option>
                      <option value="sofisticado">✨ Sofisticado</option>
                      <option value="frozen">❄️ Frozen</option>
                    </select>
                  </div>
                  <button onClick={() => removeDrink(drink.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}>
                    <FiTrash2 size={18} />
                  </button>
                </div>
                
                {/* Receita do Drink */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Receita (Base para 1 preparo)</h5>
                    <button onClick={() => addDrinkRecipeItem(drink.id)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      + Adicionar Insumo
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(drink.receita || []).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma receita cadastrada.</span>
                    )}
                    {(drink.receita || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" className="form-input" placeholder="Ex: Vodka" value={item.insumo || ''} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'insumo', e.target.value)} style={{ padding: '6px', fontSize: '0.85rem' }} />
                        <input type="number" className="form-input" placeholder="Ex: 50" value={item.quantidade || ''} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'quantidade', e.target.value)} style={{ width: '80px', padding: '6px', fontSize: '0.85rem' }} />
                        <select className="form-select" value={item.unidade || 'ml'} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'unidade', e.target.value)} style={{ width: '80px', padding: '6px', fontSize: '0.85rem' }}>
                          <option value="ml">ml</option>
                          <option value="g">g</option>
                          <option value="un">un</option>
                          <option value="fatias">fatias</option>
                        </select>
                        <button onClick={() => removeDrinkRecipeItem(drink.id, idx)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pacotes' && (
        <div>
          {/* Painel de Controle do Teste A/B */}
          <div style={{
            background: abTesting.active ? 'rgba(0, 229, 255, 0.05)' : 'var(--bg-input)',
            border: `1px solid ${abTesting.active ? '#00E5FF' : 'var(--border-color)'}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: abTesting.active ? '#00E5FF' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧪 Teste A/B de Preços & Variantes
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Divida novos visitantes 50/50 entre Grupo A (Controle) e Grupo B (Variante com novos preços/regras).
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={abTesting.active || false}
                  onChange={(e) => setAbTesting({ ...abTesting, active: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#00E5FF', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 'bold', color: abTesting.active ? '#00E5FF' : 'var(--text-muted)' }}>
                  {abTesting.active ? 'TESTE A/B ATIVO 🚀' : 'TESTE A/B INATIVO'}
                </span>
              </label>
            </div>

            {abTesting.active && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem', color: '#00E5FF' }}>
                    🏷️ Identificador / Nome da Campanha (ex: aumento_julho_48)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: aumento_julho_48"
                    value={abTesting.campaignName || ''}
                    onChange={(e) => setAbTesting({ ...abTesting, campaignName: e.target.value.toLowerCase().trim().replace(/\s+/g, '_') })}
                    style={{ maxWidth: '350px', borderColor: '#00E5FF' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Nome único para separar este teste dos testes passados no Analytics.
                  </span>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={abTesting.hideMaoDeObraInB || false}
                    onChange={(e) => setAbTesting({ ...abTesting, hideMaoDeObraInB: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#FF9800', cursor: 'pointer' }}
                  />
                  <span>🙈 Ocultar o pacote <strong>Mão de Obra</strong> apenas no Grupo B (testar eliminação da opção barata)</span>
                </label>

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    ⚖️ <strong>Divisão de Tráfego do Teste A/B</strong>:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      style={{ width: '90px', padding: '6px 10px', fontWeight: 'bold' }}
                      value={abTesting.percentA !== undefined ? abTesting.percentA : 70}
                      onChange={(e) => setAbTesting({ ...abTesting, percentA: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                      % para o Grupo A (Por Convidado) &nbsp;•&nbsp; {100 - (abTesting.percentA !== undefined ? abTesting.percentA : 70)}% para o Grupo B (Preço Fixo por Faixa)
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>🔗 Testar Formulário ao Vivo:</span>
                  <a
                    href="/orcamento?ab=A"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60A5FA', padding: '6px 12px', borderRadius: '6px',
                      fontSize: '0.82rem', fontWeight: 'bold', textDecoration: 'none'
                    }}
                  >
                    🅰️ Testar Grupo A ↗️
                  </a>
                  <a
                    href="/orcamento?ab=B"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      color: '#C084FC', padding: '6px 12px', borderRadius: '6px',
                      fontSize: '0.82rem', fontWeight: 'bold', textDecoration: 'none'
                    }}
                  >
                    🧪 Testar Grupo B ↗️
                  </a>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn--outline" onClick={addPacote} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Novo Pacote
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {pacotes.map((pacote) => (
              <div key={pacote.id} style={{
                background: 'var(--bg-input)',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${pacote.hidden ? '#FF9800' : 'var(--border-color)'}`,
                opacity: pacote.hidden ? 0.75 : 1,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>{pacote.name}</h3>
                    {pacote.hidden && (
                      <span style={{
                        background: 'rgba(255,152,0,0.15)', color: '#FF9800',
                        border: '1px solid rgba(255,152,0,0.4)', borderRadius: '6px',
                        fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px',
                        letterSpacing: '0.05em'
                      }}>🙈 OCULTO DA VITRINE</span>
                    )}
                  </div>
                  <button onClick={() => removePacote(pacote.id)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiTrash2 /> Excluir Pacote
                  </button>
                </div>

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">ID (identificador único)</label>
                    <input type="text" className="form-input" value={pacote.id} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="form-label">Nome do Pacote</label>
                    <input type="text" className="form-input" value={pacote.name || ''} onChange={(e) => updatePacote(pacote.id, 'name', e.target.value)} />
                  </div>
                </div>

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Emoji</label>
                    <input type="text" className="form-input" value={pacote.emoji || ''} onChange={(e) => updatePacote(pacote.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="form-label">Modo de Precificação</label>
                    <select
                      className="form-input"
                      value={pacote.pricingMode || 'person'}
                      onChange={(e) => updatePacote(pacote.id, 'pricingMode', e.target.value)}
                      style={{ background: 'var(--bg-input)', color: '#fff' }}
                    >
                      <option value="person">Por Convidado (Preço linear)</option>
                      <option value="tier">Por Faixas (Preço fixo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Preço A (Linear)</label>
                    <input type="text" className="form-input" value={pacote.price || ''} onChange={(e) => updatePacote(pacote.id, 'price', e.target.value)} placeholder="Ex: R$ 40,00" />
                  </div>
                  <div>
                    <label className="form-label" style={{ color: abTesting.active ? '#00E5FF' : 'var(--text-secondary)' }}>Preço B (Variante)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pacote.priceB || ''}
                      onChange={(e) => updatePacote(pacote.id, 'priceB', e.target.value)}
                      placeholder="Ex: R$ 48,00"
                      style={{ borderColor: abTesting.active ? '#00E5FF' : 'var(--border-color)' }}
                    />
                  </div>
                </div>

                {pacote.pricingMode === 'tier' && (
                  <div style={{
                    background: 'rgba(203, 161, 83, 0.08)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(203, 161, 83, 0.3)',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Tabela de Faixas de Preço Fixo
                      </h4>
                      <button
                        type="button"
                        onClick={() => applyRecommendedTiers(pacote.id)}
                        style={{
                          background: 'var(--primary)',
                          color: '#000',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Carregar 4 Faixas Recomendadas
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 40px', gap: '8px', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Mín. Convidados</span>
                        <span>Máx. Convidados</span>
                        <span>Preço Fixo Total (R$)</span>
                        <span>Hora Extra (R$/h)</span>
                        <span></span>
                      </div>
                      {(pacote.priceTiers || []).map((tier, tIdx) => (
                        <div key={tIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 40px', gap: '8px' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={tier.minGuests || ''}
                            onChange={(e) => updatePacoteTier(pacote.id, tIdx, 'minGuests', parseInt(e.target.value, 10) || 0)}
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={tier.maxGuests || ''}
                            onChange={(e) => updatePacoteTier(pacote.id, tIdx, 'maxGuests', parseInt(e.target.value, 10) || 0)}
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={tier.fixedPrice || ''}
                            onChange={(e) => updatePacoteTier(pacote.id, tIdx, 'fixedPrice', parseFloat(e.target.value) || 0)}
                            placeholder="Ex: 1800"
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={tier.extraHourPrice || ''}
                            onChange={(e) => updatePacoteTier(pacote.id, tIdx, 'extraHourPrice', parseFloat(e.target.value) || 0)}
                            placeholder="Ex: 150"
                          />
                          <button
                            type="button"
                            onClick={() => removePacoteTier(pacote.id, tIdx)}
                            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: '#F44336' }}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addPacoteTier(pacote.id)}
                      style={{
                        background: 'none',
                        border: '1px dashed var(--border-color)',
                        color: 'var(--primary)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      + Adicionar Nova Faixa
                    </button>
                  </div>
                )}

                {/* Custos Padrão Estimados por Evento */}
                <div style={{
                  background: 'rgba(255, 152, 0, 0.05)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 152, 0, 0.25)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ margin: 0, color: '#FF9800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 Custos Padrão Estimados por Evento
                    </h4>
                    <button
                      type="button"
                      onClick={() => applyRecommendedCustos(pacote.id)}
                      style={{
                        background: '#FF9800',
                        color: '#000',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Carregar Modelo Sugerido
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', fontWeight: 'bold', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>Descrição do Custo</span>
                      <span>Valor Estimado (R$)</span>
                      <span>Qtd</span>
                      <span></span>
                    </div>
                    {(pacote.custosPadrao || []).map((cItem, cIdx) => (
                      <div key={cIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={cItem.item || ''}
                          onChange={(e) => updatePacoteCusto(pacote.id, cIdx, 'item', e.target.value)}
                          placeholder="Ex: Insumos, Gelo, Garçom"
                        />
                        <input
                          type="number"
                          className="form-input"
                          value={cItem.valor || ''}
                          onChange={(e) => updatePacoteCusto(pacote.id, cIdx, 'valor', parseFloat(e.target.value) || 0)}
                          placeholder="Ex: 150"
                        />
                        <input
                          type="number"
                          className="form-input"
                          value={cItem.quantidade || 1}
                          onChange={(e) => updatePacoteCusto(pacote.id, cIdx, 'quantidade', parseInt(e.target.value, 10) || 1)}
                        />
                        <button
                          type="button"
                          onClick={() => removePacoteCusto(pacote.id, cIdx)}
                          style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: '#F44336' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addPacoteCusto(pacote.id)}
                    style={{
                      background: 'none',
                      border: '1px dashed #FF9800',
                      color: '#FF9800',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                  >
                    + Adicionar Item de Custo Padrão
                  </button>
                </div>

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Limite de Horas Sem Acréscimo (ex: 5)</label>
                    <input type="number" className="form-input" value={pacote.hoursLimit !== undefined ? pacote.hoursLimit : 5} onChange={(e) => updatePacote(pacote.id, 'hoursLimit', parseInt(e.target.value, 10) || 5)} />
                  </div>
                  <div>
                    <label className="form-label">Valor Hora Adicional (ex: R$ 5,00 ou R$ 70,00)</label>
                    <input type="text" className="form-input" value={pacote.extraHourPrice || ''} onChange={(e) => updatePacote(pacote.id, 'extraHourPrice', e.target.value)} placeholder="Ex: R$ 5,00 ou R$ 70,00" />
                  </div>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={pacote.popular || false} onChange={(e) => updatePacote(pacote.id, 'popular', e.target.checked)} />
                    Destacar como "Mais popular"
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pacote.hidden || false}
                      onChange={(e) => updatePacote(pacote.id, 'hidden', e.target.checked)}
                      style={{ accentColor: '#FF9800' }}
                    />
                    <span style={{ color: pacote.hidden ? '#FF9800' : 'inherit' }}>
                      🙈 Ocultar da vitrine (orçamento e contrato)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="form-label">Features inclusas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(pacote.features || []).map((feature, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" className="form-input" value={feature} onChange={(e) => updatePacoteFeature(pacote.id, i, e.target.value)} />
                        <button onClick={() => removePacoteFeature(pacote.id, i)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 12px', cursor: 'pointer', color: '#FFF' }}>X</button>
                      </div>
                    ))}
                    <button onClick={() => addPacoteFeature(pacote.id)} style={{ background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                      + Adicionar linha de feature
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'scripts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Configurações Gerais do Site e White-Label */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Configurações Gerais & White-Label</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Personalize o nome, cores, logo e informações de contato do site para adaptá-lo ao seu cliente (White-Label).
            </p>
            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Nome da Empresa (Ex: Laboratório de Drinks)</label>
                <input type="text" className="form-input" value={general.companyName || ''} onChange={(e) => setGeneral({ ...general, companyName: e.target.value })} placeholder="Laboratório de Drinks" />
              </div>
              <div>
                <label className="form-label">Cidade de Atuação (Ex: Juiz de Fora)</label>
                <input type="text" className="form-input" value={general.companyCity || ''} onChange={(e) => setGeneral({ ...general, companyCity: e.target.value })} placeholder="Juiz de Fora" />
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '0.95rem' }}>🎨 Aparência do Sistema</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Cor de Destaque (Hexadecimal)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={general.primaryColor || '#cba153'}
                      onChange={(e) => {
                        setGeneral({ ...general, primaryColor: e.target.value });
                        // Live preview
                        document.documentElement.style.setProperty('--primary', e.target.value);
                        document.documentElement.style.setProperty('--text-accent', e.target.value);
                      }}
                      style={{ width: '48px', height: '48px', padding: '2px', border: '2px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={general.primaryColor || ''}
                      onChange={(e) => setGeneral({ ...general, primaryColor: e.target.value })}
                      placeholder="#cba153"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Afeta botões, bordas, textos de destaque e ícones em todo o app.</p>
                </div>
                <div>
                  <label className="form-label">Modo de Tema</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {[
                      { value: 'dark', label: '🌙 Escuro', desc: 'Fundo preto (padrão)' },
                      { value: 'light', label: '☀️ Claro', desc: 'Fundo branco-dourado' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setGeneral({ ...general, themeMode: opt.value });
                          document.documentElement.setAttribute('data-theme', opt.value);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${(general.themeMode || 'dark') === opt.value ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: (general.themeMode || 'dark') === opt.value ? 'rgba(203,161,83,0.1)' : 'transparent',
                          color: (general.themeMode || 'dark') === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: (general.themeMode || 'dark') === opt.value ? 'bold' : 'normal',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>{opt.label}</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '3px' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Aplicado em tempo real no admin e nas telas do cliente.</p>
                </div>
              </div>
            </div>

            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Link do Instagram (Ex: https://instagram.com/user)</label>
                <input type="text" className="form-input" value={general.instagramUrl || ''} onChange={(e) => setGeneral({ ...general, instagramUrl: e.target.value })} placeholder="https://instagram.com/laboratoriodedrinks" />
              </div>
            </div>

            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">WhatsApp de Atendimento (Ex: 32999999999)</label>
                <input type="text" className="form-input" value={general.whatsappNumber || ''} onChange={(e) => setGeneral({ ...general, whatsappNumber: e.target.value })} placeholder="32999999999" />
              </div>
              <div>
                <label className="form-label">Logo da Empresa (Upload para o Minio)</label>
                <MinioImageUpload 
                  value={general.logoUrl || ''} 
                  onChange={(url) => setGeneral({ ...general, logoUrl: url })} 
                  placeholder="Selecione o logo (padrão: /logo.webp)" 
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Título Principal do Site (H1 - Ex: Barman em Juiz de Fora...)</label>
              <input type="text" className="form-input" value={general.siteTitle || ''} onChange={(e) => setGeneral({ ...general, siteTitle: e.target.value })} placeholder="Barman em Juiz de Fora: Transforme seu evento com o Laboratório de Drinks" />
            </div>

            <div style={{ marginTop: '16px', marginBottom: '24px' }}>
              <label className="form-label">Subtítulo / Descrição Principal do Site</label>
              <textarea 
                className="form-input" 
                rows={2}
                value={general.siteSubtitle || ''} 
                onChange={(e) => setGeneral({ ...general, siteSubtitle: e.target.value })} 
                placeholder="Ex: O bar de coquetéis premium que leva sofisticação e os melhores profissionais para a sua festa." 
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '24px 0' }} />

            <div>
              <label className="form-label">URL Global do Site (ex: https://meulaboratorio.com.br)</label>
              <input type="text" className="form-input" value={general.siteUrl || ''} onChange={(e) => setGeneral({ ...general, siteUrl: e.target.value })} placeholder="Deixe em branco para usar a URL atual do navegador" />
            </div>
            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Link de Avaliação do Google Meu Negócio</label>
              <input type="text" className="form-input" value={general.googleReviewLink || ''} onChange={(e) => setGeneral({ ...general, googleReviewLink: e.target.value })} placeholder="Ex: https://g.page/r/.../review" />
            </div>
            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Print das Avaliações do Google (Upload para o Minio)</label>
              <MinioImageUpload 
                value={general.googleReviewsPrint || ''} 
                onChange={(url) => setGeneral({ ...general, googleReviewsPrint: url })} 
                placeholder="Clique ou arraste para subir o print do Google Reviews" 
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Se você subir um print, o site de orçamento usará essa imagem no lugar dos depoimentos em texto.
              </p>
            </div>
            <div style={{ marginTop: '16px', background: 'rgba(255, 213, 79, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #FFD54F' }}>
              <label className="form-label" style={{ color: '#FFD54F' }}>Telefones do Admin (Para receber alertas automáticos de festas próximas)</label>
              <input type="text" className="form-input" value={general.adminPhone || ''} onChange={(e) => setGeneral({ ...general, adminPhone: e.target.value })} placeholder="Ex: 32999999999, 32988888888" />
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Apenas números com DDD. Você pode adicionar múltiplos números separados por vírgula. O sistema enviará os avisos de 15, 7 e 3 dias para todos automaticamente.</p>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Preço Adicional de Copos de Vidro (por convidado)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                className="form-input" 
                value={general.precoCopoVidro !== undefined ? general.precoCopoVidro : ''} 
                onChange={(e) => setGeneral({ ...general, precoCopoVidro: e.target.value === '' ? '' : parseFloat(e.target.value) })} 
                placeholder="Padrão: R$ 5,00" 
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor cobrado por convidado caso o opcional de Copos de Vidro seja selecionado no contrato (ex: 5.00).</p>
            </div>
          </div>

          {/* Evolution API Configs */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Credenciais da Evolution API v2</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Configure a API para permitir o envio automático de mensagens e fotos pelo painel Kanban.
            </p>
            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">URL da Evolution API (ex: https://sua-api.com)</label>
                <input type="text" className="form-input" value={evolutionApi.url || ''} onChange={(e) => setEvolutionApi({ ...evolutionApi, url: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Nome da Instância</label>
                <input type="text" className="form-input" value={evolutionApi.instance || ''} onChange={(e) => setEvolutionApi({ ...evolutionApi, instance: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Global API Key</label>
                <input type="password" className="form-input" value={evolutionApi.apikey || ''} onChange={(e) => setEvolutionApi({ ...evolutionApi, apikey: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Scripts Editor */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Textos dos Scripts</h3>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #00E5FF' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#FFF' }}>
                <strong>Variáveis Mágicas:</strong> Você pode usar as tags abaixo no meio do texto e o sistema vai substituir pelos dados do cliente automaticamente:
              </p>
              <code style={{ display: 'block', marginTop: '8px', color: '#00E5FF', fontSize: '0.85rem', lineHeight: '1.5' }}>
                {`{{nome}}`} | {`{{pacote}}`} | {`{{dataEvento}}`} | {`{{mes}}`} | {`{{ano}}`} | {`{{cidade}}`} | {`{{duracao}}`} | {`{{horarioEvento}}`} | {`{{linkAvaliacao}}`}
              </code>
            </div>

            {/* Autoridade */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>📸 1. Mostrar Autoridade</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.autoridade?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, autoridade: { ...scripts.autoridade, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
                placeholder={`Ex: Olá {{nome}}, tudo bem? Lembrei do seu evento...`}
              />
              <label className="form-label">URL da Imagem/Foto ou Link do Instagram (opcional)</label>
              <input type="text" className="form-input" value={scripts.autoridade?.image || ''} onChange={(e) => setScripts({ ...scripts, autoridade: { ...scripts.autoridade, image: e.target.value } })} placeholder="https://..." />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Se você colocar um link do Instagram/YouTube aqui, o sistema enviará como texto para gerar a miniatura do WhatsApp.</p>
            </div>

            {/* Escassez */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>🔥 2. Escassez (Resgate)</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.escassez?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, escassez: { ...scripts.escassez, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
              />
              <label className="form-label">URL da Imagem/Foto ou Link (opcional)</label>
              <input type="text" className="form-input" value={scripts.escassez?.image || ''} onChange={(e) => setScripts({ ...scripts, escassez: { ...scripts.escassez, image: e.target.value } })} placeholder="https://..." />
            </div>

            {/* Pós Evento */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>⭐ 3. Pós-Evento (NPS)</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.posEvento?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, posEvento: { ...scripts.posEvento, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
              />
              <label className="form-label">URL da Imagem/Foto ou Link (opcional)</label>
              <input type="text" className="form-input" value={scripts.posEvento?.image || ''} onChange={(e) => setScripts({ ...scripts, posEvento: { ...scripts.posEvento, image: e.target.value } })} placeholder="https://..." />
            </div>

            {/* Contrato */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>✍️ 4. Envio de Contrato</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.contrato?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, contrato: { ...scripts.contrato, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
                placeholder="Ex: Olá {{nome}}! Preencha seus dados de contrato e escolha seus drinks acessando: {{linkContrato}}"
              />
              <label className="form-label">URL da Imagem/Foto ou Link (opcional)</label>
              <input type="text" className="form-input" value={scripts.contrato?.image || ''} onChange={(e) => setScripts({ ...scripts, contrato: { ...scripts.contrato, image: e.target.value } })} placeholder="https://..." />
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '32px 0' }} />
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Retargeting Automático (Falta 30 e 15 dias)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Textos que serão enviados via "Fake Cron" para clientes não fechados quando o evento estiver se aproximando.
            </p>

            {/* Retarget 30 */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>⏰ Faltam 30 Dias</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.retarget30?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, retarget30: { ...scripts.retarget30, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
                placeholder={`Ex: Oi {{nome}}! Falta 1 mês para o seu evento. Já fechou os drinks?`}
              />
              <label className="form-label">URL da Imagem/Foto ou Link (opcional)</label>
              <input type="text" className="form-input" value={scripts.retarget30?.image || ''} onChange={(e) => setScripts({ ...scripts, retarget30: { ...scripts.retarget30, image: e.target.value } })} placeholder="https://..." />
            </div>

            {/* Retarget 15 */}
            <div>
              <h4 style={{ color: '#FFF', marginBottom: '12px' }}>⏰ Faltam 15 Dias (Urgência)</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={scripts.retarget15?.text || ''} 
                onChange={(e) => setScripts({ ...scripts, retarget15: { ...scripts.retarget15, text: e.target.value } })} 
                style={{ resize: 'vertical', marginBottom: '12px' }}
                placeholder={`Ex: Oi {{nome}}! Seu evento é daqui a 15 dias! Corre que ainda dá tempo de fechar o bar com desconto!`}
              />
              <label className="form-label">URL da Imagem/Foto ou Link (opcional)</label>
              <input type="text" className="form-input" value={scripts.retarget15?.image || ''} onChange={(e) => setScripts({ ...scripts, retarget15: { ...scripts.retarget15, image: e.target.value } })} placeholder="https://..." />
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '32px 0' }} />
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Disparos Automáticos do Sistema</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Edite as mensagens que o sistema envia de forma automática para os clientes ao gerar orçamentos e emitir contratos.
            </p>

            {/* Envio de Orçamento - Introdução */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '8px' }}>💬 Envio de Orçamento: Introdução</h4>
              <textarea 
                className="form-input" 
                rows={4} 
                value={general.orcamentoIntro || ''} 
                onChange={(e) => setGeneral({ ...general, orcamentoIntro: e.target.value })} 
                style={{ resize: 'vertical' }}
                placeholder={`Olá, *{{nome}}*! Tudo bem? 😊\nAgradecemos o interesse no *Laboratório de Drinks*. Para o seu evento com *{{convidados}} convidados*, preparamos os seguintes orçamentos baseados nos nossos pacotes para facilitar sua decisão:\n\n`}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Esta frase é enviada antes de listar os pacotes e preços. Suporta: {`{{nome}}`}, {`{{convidados}}`}, {`{{cidade}}`}.</p>
            </div>

            {/* Envio de Orçamento - Conclusão */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '8px' }}>💬 Envio de Orçamento: Conclusão</h4>
              <textarea 
                className="form-input" 
                rows={3} 
                value={general.orcamentoFim || ''} 
                onChange={(e) => setGeneral({ ...general, orcamentoFim: e.target.value })} 
                style={{ resize: 'vertical' }}
                placeholder={`Qualquer dúvida ou quando quiser fechar um pacote, é só me responder aqui! 🥂`}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Esta frase é enviada ao final do orçamento. Suporta: {`{{nome}}`}, {`{{convidados}}`}, {`{{cidade}}`}.</p>
            </div>

            {/* Legenda do Contrato (Caption do PDF) */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#FFF', marginBottom: '8px' }}>📄 Legenda do PDF do Contrato</h4>
              <textarea 
                className="form-input" 
                rows={3} 
                value={general.contratoLegenda || ''} 
                onChange={(e) => setGeneral({ ...general, contratoLegenda: e.target.value })} 
                style={{ resize: 'vertical' }}
                placeholder={`Segue seu contrato, por gentileza , confira os dados e se estiverem corretos assine e me encaminhe`}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Esta legenda acompanha o arquivo PDF do contrato quando ele é gerado/assinado. Suporta: {`{{nome}}`}, {`{{dataEvento}}`}, {`{{cidade}}`}, {`{{pacote}}`}.</p>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'galeria' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Cadastre os eventos realizados. Cole a URL da foto de capa e adicione as mídias de cada evento.
            </p>
            <button className="btn btn--outline" onClick={addEvento} style={{ width: 'auto', flexShrink: 0 }}>
              <FiPlus /> Novo Evento
            </button>
          </div>

          {galeria.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
              Nenhum evento cadastrado ainda. Clique em "Novo Evento" para começar.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {galeria.map((evento) => (
              <div key={evento.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {/* Header do Evento */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>
                    🎉 {evento.titulo || 'Evento sem título'}
                  </h3>
                  <button onClick={() => removeEvento(evento.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <FiTrash2 size={14} /> Excluir
                  </button>
                </div>

                {/* Dados do Evento */}
                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Título do Evento</label>
                    <input type="text" className="form-input" value={evento.titulo || ''} onChange={(e) => updateEvento(evento.id, 'titulo', e.target.value)} placeholder="Ex: Casamento Silva" />
                  </div>
                  <div>
                    <label className="form-label">Data do Evento</label>
                    <input type="date" className="form-input" value={evento.data || ''} onChange={(e) => updateEvento(evento.id, 'data', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Cidade</label>
                    <input type="text" className="form-input" value={evento.cidade || ''} onChange={(e) => updateEvento(evento.id, 'cidade', e.target.value)} placeholder="Ex: Juiz de Fora" />
                  </div>
                </div>

                {/* Foto de Capa */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Foto de Capa (exibida no card)</label>
                  <MinioImageUpload value={evento.capa} onChange={(url) => updateEvento(evento.id, 'capa', url)} placeholder="https://link-direto-da-imagem.jpg" />
                </div>

                {/* Mídias do Evento */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Mídias do Carrossel ({(evento.midias || []).length} item(s))</label>
                    <button onClick={() => addMidia(evento.id)} style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiPlus size={14} /> Adicionar Mídia
                    </button>
                  </div>

                  {(evento.midias || []).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Nenhuma mídia. Adicione fotos e vídeos para este evento.</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(evento.midias || []).map((midia, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <select
                          className="form-select"
                          value={midia.tipo || 'imagem'}
                          onChange={(e) => updateMidia(evento.id, idx, 'tipo', e.target.value)}
                          style={{ width: '120px', flexShrink: 0 }}
                        >
                          <option value="imagem">🖼️ Imagem</option>
                          <option value="video">🎬 Vídeo</option>
                        </select>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <MinioImageUpload 
                            value={midia.url} 
                            onChange={(url) => updateMidia(evento.id, idx, 'url', url)} 
                            placeholder={midia.tipo === 'video' ? "https://link-do-video.mp4" : "https://link-da-imagem.jpg"} 
                            accept={midia.tipo === 'video' ? "video/*" : "image/*"}
                          />
                          {(!midia.tipo || midia.tipo === 'imagem') && (
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Descrição da imagem (Alt para o Google)..." 
                              value={midia.alt || ''} 
                              onChange={(e) => updateMidia(evento.id, idx, 'alt', e.target.value)} 
                              style={{ padding: '6px 10px', fontSize: '0.82rem', marginTop: '4px' }}
                            />
                          )}
                        </div>
                        <button onClick={() => removeMidia(evento.id, idx)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', padding: '8px', flexShrink: 0 }}>
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'shopping' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Margem de Segurança */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Margem de Segurança Global</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Porcentagem extra adicionada a todos os cálculos de insumos para evitar faltas no evento.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px' }}
                value={shoppingConfig.margemSeguranca || 0} 
                onChange={(e) => setShoppingConfig({ ...shoppingConfig, margemSeguranca: Number(e.target.value) })} 
              />
              <span style={{ color: '#FFF' }}>% extra</span>
            </div>
            
            <hr style={{ borderColor: 'var(--border-color)', margin: '24px 0' }} />
            
            <h3 style={{ margin: '0 0 16px 0', color: '#00E5FF' }}>Proporção de Drinks Sem Álcool</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Se o cliente selecionar drinks sem álcool, qual a porcentagem do consumo total da festa que será destinada a eles? (Recomendado: 10% a 20%)
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px' }}
                value={shoppingConfig.nonAlcoholicPercentage ?? 15} 
                onChange={(e) => setShoppingConfig({ ...shoppingConfig, nonAlcoholicPercentage: Number(e.target.value) })} 
              />
              <span style={{ color: '#FFF' }}>% do total</span>
            </div>
          </div>

          {/* Itens Fixos */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Itens Fixos (Escaláveis)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Ex: Gelo, Copos, Guardanapos. Estes sobem conforme o número de convidados.
                </p>
              </div>
              <button 
                className="btn btn--outline" 
                style={{ width: 'auto' }}
                onClick={() => setShoppingConfig({
                  ...shoppingConfig,
                  itensFixos: [...(shoppingConfig.itensFixos || []), { id: Date.now().toString(), nome: 'Novo Item', quantidade: 1, unidade: 'un', categoria: 'bar', tipoCalc: 'porConvidado' }]
                })}
              >
                <FiPlus /> Novo Item Fixo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(shoppingConfig.itensFixos || []).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum item fixo cadastrado.</div>
              )}
              {(shoppingConfig.itensFixos || []).map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <div style={{ flex: '2 1 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Nome do Item</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={item.nome || ''} 
                      placeholder="Ex: Gelo (Saco 5kg)"
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].nome = e.target.value;
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }} 
                    />
                  </div>
                  <div style={{ width: '130px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Tipo Cálculo</label>
                    <select
                      className="form-select"
                      value={item.tipoCalc || 'porConvidado'}
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].tipoCalc = e.target.value;
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }}
                    >
                      <option value="porConvidado">👥 Por Convidado</option>
                      <option value="fixo">📌 Valor Fixo</option>
                    </select>
                  </div>
                  <div style={{ width: '100px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Quantidade</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={item.quantidade || 0} 
                      step="0.001"
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].quantidade = Number(e.target.value);
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }} 
                    />
                  </div>
                  <div style={{ width: '80px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Unidade</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={item.unidade || ''} 
                      placeholder="sacos"
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].unidade = e.target.value;
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }} 
                    />
                  </div>
                  <div style={{ width: '140px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Categoria</label>
                    <select
                      className="form-select"
                      value={item.categoria || 'bar'}
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].categoria = e.target.value;
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }}
                    >
                      <option value="bar">🍸 Equipamento Bar</option>
                      <option value="insumo">🍋 Insumo Fresco</option>
                      <option value="decoracao">✨ Decoração</option>
                      <option value="descartavel">🧾 Descartável</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      const novos = [...shoppingConfig.itensFixos];
                      novos.splice(idx, 1);
                      setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                    }} 
                    style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong>Dica de cálculo:</strong> Para itens do tipo <strong>Por Convidado</strong>, se você usa 1 saco de gelo a cada 10 pessoas, a quantidade é <strong>0.1</strong>. Para itens <strong>Valor Fixo</strong>, digite a quantidade total (ex: 2 cargas de gás).
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eventos' && (
        <div>
          <button className="btn btn--outline" onClick={addTipoEvento} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Tipo de Evento
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tiposEvento.map((tipo) => (
              <div key={tipo.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>{tipo.label || 'Sem Nome'}</h3>
                  <button onClick={() => removeTipoEvento(tipo.id)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiTrash2 /> Excluir Tipo de Evento
                  </button>
                </div>

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">ID / Slug da Página (ex: casamento)</label>
                    <input type="text" className="form-input" value={tipo.id} onChange={(e) => updateTipoEvento(tipo.id, 'id', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Nome / Título</label>
                    <input type="text" className="form-input" value={tipo.label || ''} onChange={(e) => updateTipoEvento(tipo.id, 'label', e.target.value)} />
                  </div>
                </div>

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Ícone/Emoji (ex: 💍)</label>
                    <input type="text" className="form-input" value={tipo.icon || ''} onChange={(e) => updateTipoEvento(tipo.id, 'icon', e.target.value)} style={{ textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="form-label">Imagem da Capa (MinIO)</label>
                    <MinioImageUpload value={tipo.image} onChange={(url) => updateTipoEvento(tipo.id, 'image', url)} placeholder="https://link-da-imagem.jpg" />
                  </div>
                </div>

                <div>
                  <label className="form-label">Descrição / Detalhes do Evento</label>
                  <textarea 
                    className="form-input" 
                    value={tipo.desc || ''} 
                    onChange={(e) => updateTipoEvento(tipo.id, 'desc', e.target.value)} 
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Descreva a experiência de bar para este tipo de evento..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Gerencie as categorias de custos dos eventos. Estas categorias aparecerão no Kanban do Lead e no Analytics para agrupamento de despesas e insights de margem de lucro.
            </span>
            <button className="btn btn--outline" onClick={addCustoCategoria} style={{ width: 'auto' }}>
              <FiPlus /> Nova Categoria
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {custosCategorias.map((cat, index) => (
              <div key={cat.id} className="admin-config-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <div style={{ width: '60px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Emoji</label>
                  <input type="text" className="form-input" value={cat.emoji || ''} onChange={(e) => updateCustoCategoria(cat.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
                </div>

                <div style={{ flex: 2, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Nome da Categoria</label>
                  <input type="text" className="form-input" value={cat.label || ''} onChange={(e) => updateCustoCategoria(cat.id, 'label', e.target.value)} placeholder="Ex: Mão de Obra, Insumos..." />
                </div>

                <div style={{ width: '130px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Cor de Destaque</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" className="form-input" value={cat.color || '#ffffff'} onChange={(e) => updateCustoCategoria(cat.id, 'color', e.target.value)} style={{ width: '40px', padding: '0', height: '36px', cursor: 'pointer' }} />
                    <input type="text" className="form-input" value={cat.color || ''} onChange={(e) => updateCustoCategoria(cat.id, 'color', e.target.value)} style={{ fontSize: '0.8rem', flex: 1 }} />
                  </div>
                </div>

                <div style={{ width: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>ID (Referência)</label>
                  <input type="text" className="form-input" value={cat.id} disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                  <button
                    className="btn btn--outline"
                    onClick={() => moveCustoCategoria(index, 'up')}
                    disabled={index === 0}
                    style={{ padding: '6px 10px', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Mover para Cima"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn--outline"
                    onClick={() => moveCustoCategoria(index, 'down')}
                    disabled={index === custosCategorias.length - 1}
                    style={{ padding: '6px 10px', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Mover para Baixo"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => removeCustoCategoria(cat.id)}
                    style={{ padding: '6px 10px', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', background: '#F44336', border: 'none' }}
                    title="Excluir Categoria"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'avaliacoes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Gerencie as avaliações dos clientes do site. Cada item permite adicionar o feedback (texto completo/reduzido), a foto/print do Google Reviews, e marcar se é um item destacado para aparecer no site de orçamentos.
            </span>
            <button className="btn btn--outline" onClick={addReview} style={{ width: 'auto' }}>
              <FiPlus /> Novo Depoimento
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {avaliacoes.map((rev) => (
              <div key={rev.id} className="admin-config-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Nome do Cliente</label>
                    <input type="text" className="form-input" value={rev.nome || ''} onChange={(e) => updateReview(rev.id, 'nome', e.target.value)} />
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Sobrenome (Opcional)</label>
                    <input type="text" className="form-input" value={rev.sobrenome || ''} onChange={(e) => updateReview(rev.id, 'sobrenome', e.target.value)} />
                  </div>
                  <div style={{ width: '130px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Estrelas</label>
                    <select className="form-select" value={rev.stars || 5} onChange={(e) => updateReview(rev.id, 'stars', Number(e.target.value))} style={{ padding: '8px', fontSize: '0.85rem', width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}>
                      <option value={5}>⭐⭐⭐⭐⭐</option>
                      <option value={4}>⭐⭐⭐⭐</option>
                      <option value={3}>⭐⭐⭐</option>
                      <option value={2}>⭐⭐</option>
                      <option value={1}>⭐</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                    <input type="checkbox" id={`destacado-${rev.id}`} checked={rev.destacado || false} onChange={(e) => updateReview(rev.id, 'destacado', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    <label htmlFor={`destacado-${rev.id}`} className="form-label" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer' }}>Destaque no Site</label>
                  </div>
                  <div style={{ marginTop: '22px' }}>
                    <button className="btn btn--danger" onClick={() => deleteReview(rev.id)} style={{ padding: '8px 12px', height: '36px', display: 'flex', alignItems: 'center', color: '#FFF', background: '#F44336', border: 'none', borderRadius: '4px' }}>
                      Excluir
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Texto Completo / Feedback (Reduzido)</label>
                    <textarea className="form-input" value={rev.feedback || ''} onChange={(e) => updateReview(rev.id, 'feedback', e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Texto da avaliação..." />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Print da Avaliação do Google (Upload para o Minio)</label>
                    <MinioImageUpload value={rev.printUrl} onChange={(url) => updateReview(rev.id, 'printUrl', url)} placeholder="Clique para subir o print desta avaliação" />
                  </div>
                </div>
              </div>
            ))}
            {avaliacoes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                Nenhuma avaliação encontrada. Clique em "Novo Depoimento" para adicionar manualmente.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
