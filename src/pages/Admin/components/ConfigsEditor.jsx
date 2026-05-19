import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../../firebase';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';

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
  const [activeTab, setActiveTab] = useState('drinks');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [drinks, setDrinks] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [general, setGeneral] = useState({ siteUrl: '', googleReviewLink: '' });
  const [evolutionApi, setEvolutionApi] = useState({ url: '', instance: '', apikey: '' });
  const [scripts, setScripts] = useState({
    autoridade: { text: '', image: '' },
    escassez: { text: '', image: '' },
    posEvento: { text: '', image: '' }
  });
  const [galeria, setGaleria] = useState([]);
  
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
        if (data.general) setGeneral(data.general);
        if (data.evolutionApi) setEvolutionApi(data.evolutionApi);
        if (data.scripts) setScripts(data.scripts);
        if (data.galeriaEventos) setGaleria(firebaseObjToArray(data.galeriaEventos));
        if (data.shoppingConfig) setShoppingConfig(data.shoppingConfig);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
      } else if (activeTab === 'scripts') {
        await set(ref(db, 'config/general'), general);
        await set(ref(db, 'config/evolutionApi'), evolutionApi);
        await set(ref(db, 'config/scripts'), scripts);
      } else if (activeTab === 'galeria') {
        const sorted = galeria.map((e, i) => ({ ...e, order: i }));
        await set(ref(db, 'config/galeriaEventos'), arrayToFirebaseObj(sorted));
      } else if (activeTab === 'shopping') {
        await set(ref(db, 'config/shoppingConfig'), shoppingConfig);
      }
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  /* Drinks Handlers */
  const addDrink = () => {
    const newId = `drink-${Date.now()}`;
    setDrinks([...drinks, { id: newId, name: 'Novo Drink', emoji: '🍹' }]);
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
    setPacotes([...pacotes, { id: newId, name: 'Novo Pacote', emoji: '📦', price: 'R$ 0,00', priceLabel: 'convidado', features: ['Feature 1'] }]);
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

      <div className="admin-config-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('drinks')}
          style={{
            background: activeTab === 'drinks' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'drinks' ? '#000' : '#FFF',
            border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Menu de Drinks
        </button>
        <button
          onClick={() => setActiveTab('pacotes')}
          style={{
            background: activeTab === 'pacotes' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'pacotes' ? '#000' : '#FFF',
            border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Pacotes de Serviços
        </button>
        <button
          onClick={() => setActiveTab('scripts')}
          style={{
            background: activeTab === 'scripts' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'scripts' ? '#000' : '#FFF',
            border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Scripts de Vendas (WhatsApp)
        </button>
        <button
          onClick={() => setActiveTab('galeria')}
          style={{
            background: activeTab === 'galeria' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'galeria' ? '#000' : '#FFF',
            border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🎥 Galeria de Eventos
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          style={{
            background: activeTab === 'shopping' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'shopping' ? '#000' : '#FFF',
            border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🛒 Lista de Compras
        </button>
      </div>

      {activeTab === 'drinks' && (
        <div>
          <button className="btn btn--outline" onClick={addDrink} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Novo Drink
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drinks.map((drink) => (
              <div key={drink.id} className="admin-config-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '60px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Emoji</label>
                    <input type="text" className="form-input" value={drink.emoji || ''} onChange={(e) => updateDrink(drink.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Nome do Drink</label>
                    <input type="text" className="form-input" value={drink.name || ''} onChange={(e) => updateDrink(drink.id, 'name', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>URL da Imagem (Opcional)</label>
                    <input type="text" className="form-input" value={drink.image || ''} onChange={(e) => updateDrink(drink.id, 'image', e.target.value)} placeholder="https://..." />
                  </div>
                  <div style={{ width: '90px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }} title="Maior peso significa que sai mais na festa">Peso (1-10)</label>
                    <input type="number" className="form-input" value={drink.popularityWeight || ''} onChange={(e) => updateDrink(drink.id, 'popularityWeight', Number(e.target.value))} min="1" max="10" placeholder="5" />
                  </div>
                  <div style={{ width: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Sem Álcool?</label>
                    <input type="checkbox" checked={drink.isNonAlcoholic || false} onChange={(e) => updateDrink(drink.id, 'isNonAlcoholic', e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '4px', cursor: 'pointer' }} />
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
          <button className="btn btn--outline" onClick={addPacote} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Novo Pacote
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {pacotes.map((pacote) => (
              <div key={pacote.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>{pacote.name}</h3>
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

                <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Emoji</label>
                    <input type="text" className="form-input" value={pacote.emoji || ''} onChange={(e) => updatePacote(pacote.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="form-label">Preço (ex: R$ 40,00)</label>
                    <input type="text" className="form-input" value={pacote.price || ''} onChange={(e) => updatePacote(pacote.id, 'price', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Unidade (ex: convidado)</label>
                    <input type="text" className="form-input" value={pacote.priceLabel || ''} onChange={(e) => updatePacote(pacote.id, 'priceLabel', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={pacote.popular || false} onChange={(e) => updatePacote(pacote.id, 'popular', e.target.checked)} />
                    Destacar como "Mais popular"
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
          
          {/* Configurações Gerais do Site */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Configurações Gerais</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Defina a URL base do seu site. Isso é importante para gerar links corretos (como o link de descadastro/opt-out) caso este painel admin esteja hospedado em um subdomínio diferente do site principal.
            </p>
            <div>
              <label className="form-label">URL Global do Site (ex: https://meulaboratorio.com.br)</label>
              <input type="text" className="form-input" value={general.siteUrl || ''} onChange={(e) => setGeneral({ ...general, siteUrl: e.target.value })} placeholder="Deixe em branco para usar a URL atual do navegador" />
            </div>
            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Link de Avaliação do Google Meu Negócio</label>
              <input type="text" className="form-input" value={general.googleReviewLink || ''} onChange={(e) => setGeneral({ ...general, googleReviewLink: e.target.value })} placeholder="Ex: https://g.page/r/.../review" />
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
                {`{{nome}}`} | {`{{pacote}}`} | {`{{dataEvento}}`} | {`{{mes}}`} | {`{{ano}}`} | {`{{cidade}}`} | {`{{linkAvaliacao}}`}
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
                  <label className="form-label">URL da Foto de Capa (exibida no card)</label>
                  <input type="text" className="form-input" value={evento.capa || ''} onChange={(e) => updateEvento(evento.id, 'capa', e.target.value)} placeholder="https://link-direto-da-imagem.jpg" />
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
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <select
                          className="form-select"
                          value={midia.tipo || 'imagem'}
                          onChange={(e) => updateMidia(evento.id, idx, 'tipo', e.target.value)}
                          style={{ width: '120px', flexShrink: 0 }}
                        >
                          <option value="imagem">🖼️ Imagem</option>
                          <option value="video">🎬 Vídeo</option>
                        </select>
                        <input
                          type="text"
                          className="form-input"
                          value={midia.url || ''}
                          onChange={(e) => updateMidia(evento.id, idx, 'url', e.target.value)}
                          placeholder={midia.tipo === 'video' ? 'https://...video.mp4' : 'https://...foto.jpg'}
                          style={{ flex: 1 }}
                        />
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
                  itensFixos: [...(shoppingConfig.itensFixos || []), { id: Date.now().toString(), nome: 'Novo Item', quantidade: 1, unidade: 'un' }]
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
                <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ flex: 1 }}>
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
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Qtd por Convidado</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '120px' }}
                      value={item.quantidade || 0} 
                      step="0.1"
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].quantidade = Number(e.target.value);
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }} 
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Unidade</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: '80px' }}
                      value={item.unidade || ''} 
                      placeholder="sacos"
                      onChange={(e) => {
                        const novos = [...shoppingConfig.itensFixos];
                        novos[idx].unidade = e.target.value;
                        setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                      }} 
                    />
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
              <strong>Dica de cálculo:</strong> Se você usa 1 saco de gelo a cada 10 pessoas, a "Qtd por Convidado" é <strong>0.1</strong>. 
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
