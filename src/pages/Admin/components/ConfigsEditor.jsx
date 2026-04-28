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
  const [general, setGeneral] = useState({ siteUrl: '' });
  const [evolutionApi, setEvolutionApi] = useState({ url: '', instance: '', apikey: '' });
  const [scripts, setScripts] = useState({
    autoridade: { text: '', image: '' },
    escassez: { text: '', image: '' },
    posEvento: { text: '', image: '' }
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
      </div>

      {activeTab === 'drinks' && (
        <div>
          <button className="btn btn--outline" onClick={addDrink} style={{ marginBottom: '16px', width: 'auto' }}>
            <FiPlus /> Adicionar Novo Drink
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drinks.map((drink) => (
              <div key={drink.id} className="admin-config-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
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
                <button onClick={() => removeDrink(drink.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}>
                  <FiTrash2 size={18} />
                </button>
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
              <code style={{ display: 'block', marginTop: '8px', color: '#00E5FF', fontSize: '0.85rem' }}>
                {`{{nome}}`} | {`{{pacote}}`} | {`{{dataEvento}}`} | {`{{cidade}}`}
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
              <label className="form-label">URL da Imagem/Foto (opcional)</label>
              <input type="text" className="form-input" value={scripts.autoridade?.image || ''} onChange={(e) => setScripts({ ...scripts, autoridade: { ...scripts.autoridade, image: e.target.value } })} placeholder="https://..." />
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
              <label className="form-label">URL da Imagem/Foto (opcional)</label>
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
              <label className="form-label">URL da Imagem/Foto (opcional)</label>
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
              <label className="form-label">URL da Imagem/Foto (opcional)</label>
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
              <label className="form-label">URL da Imagem/Foto (opcional)</label>
              <input type="text" className="form-input" value={scripts.retarget15?.image || ''} onChange={(e) => setScripts({ ...scripts, retarget15: { ...scripts.retarget15, image: e.target.value } })} placeholder="https://..." />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
