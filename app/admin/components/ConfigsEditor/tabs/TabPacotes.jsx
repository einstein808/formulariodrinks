"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';

export default function TabPacotes() {
  const { pacotes, setPacotes } = useConfigs();

  const loadOfficialPacotesTemplate = () => {
    if (window.confirm('Carregar o modelo oficial dos 3 pacotes (Experimento R$35, Laboratório R$45, Reatividade R$55)? Isso substituirá a lista atual na tela (lembre-se de clicar em Salvar Alterações depois).')) {
      setPacotes([
        {
          id: 'experimento',
          name: 'Experimento',
          emoji: '🧪',
          desc: 'A experiência essencial do Laboratório: drinks preparados na hora, com qualidade, praticidade e estrutura completa.',
          badge: 'Essencial',
          maxDrinks: 4,
          drinksCount: 4,
          hoursLimit: 5,
          order: 0,
          popular: false,
          price: 'R$ 35',
          priceB: 'R$ 35',
          priceLabel: 'por pessoa',
          extraHourPrice: 'R$ 5,00',
          minGuests: 40,
          features: [
            '4 opções de drinks preparados na hora',
            'Bartender profissional + Ajudante',
            'Bancada / Bar do Laboratório',
            'Copos de vidro & Gelo inclusos',
            'Frutas, insumos e xaropes para drinks',
            'Montagem, desmontagem e frete inclusos',
            'Identidade visual do Laboratório'
          ],
          custosPadrao: [
            { item: 'Insumos & Bebidas Base', valor: 120, quantidade: 1, categoria: 'insumos' },
            { item: 'Gelo, Frutas & Perecíveis', valor: 60, quantidade: 1, categoria: 'insumos' },
            { item: 'Bartender + Ajudante', valor: 350, quantidade: 1, categoria: 'equipe' },
            { item: 'Logística & Frete', valor: 60, quantidade: 1, categoria: 'logistica' }
          ],
          pricingMode: 'person',
          priceTiers: [
            { minGuests: 30, maxGuests: 50, fixedPrice: 1750, extraHourPrice: 150 },
            { minGuests: 51, maxGuests: 80, fixedPrice: 2600, extraHourPrice: 200 },
            { minGuests: 81, maxGuests: 120, fixedPrice: 3800, extraHourPrice: 260 },
            { minGuests: 121, maxGuests: 200, fixedPrice: 5800, extraHourPrice: 350 }
          ]
        },
        {
          id: 'laboratorio',
          name: 'Laboratório',
          emoji: '⚗️',
          desc: 'Onde os drinks se transformam em experiência. Cardápio autoral, cordiais artesanais e apresentação surpreendente.',
          badge: '⭐ Mais Escolhido',
          maxDrinks: 5,
          drinksCount: 5,
          hoursLimit: 5,
          order: 1,
          popular: true,
          price: 'R$ 45',
          priceB: 'R$ 45',
          priceLabel: 'por pessoa',
          extraHourPrice: 'R$ 6,00',
          minGuests: 40,
          features: [
            '5 opções de drinks (inclui autorais)',
            'Cordiais e xaropes artesanais',
            'Bancada temática com vidrarias científicas',
            'Backdrop temático do Laboratório',
            'Elementos de decoração científica',
            'Bartender profissional + Ajudante',
            'Copos de vidro, gelo, frutas e frete inclusos'
          ],
          custosPadrao: [
            { item: 'Insumos, Bebidas & Cordiais', valor: 160, quantidade: 1, categoria: 'insumos' },
            { item: 'Gelo, Frutas Frescas & Decoração', valor: 80, quantidade: 1, categoria: 'insumos' },
            { item: 'Bartender + Ajudante', valor: 350, quantidade: 1, categoria: 'equipe' },
            { item: 'Logística & Frete', valor: 60, quantidade: 1, categoria: 'logistica' }
          ],
          pricingMode: 'person',
          priceTiers: [
            { minGuests: 30, maxGuests: 50, fixedPrice: 2250, extraHourPrice: 180 },
            { minGuests: 51, maxGuests: 80, fixedPrice: 3400, extraHourPrice: 240 },
            { minGuests: 81, maxGuests: 120, fixedPrice: 4800, extraHourPrice: 320 },
            { minGuests: 121, maxGuests: 200, fixedPrice: 7200, extraHourPrice: 420 }
          ]
        },
        {
          id: 'reatividade',
          name: 'Reatividade',
          emoji: '🧬',
          desc: 'O bar que vira atração da festa: destilados premium (Absolut & Tanqueray), efeitos com gelo seco e carta autoral.',
          badge: '👑 Premium & Cênico',
          maxDrinks: 6,
          drinksCount: 6,
          hoursLimit: 5,
          order: 2,
          popular: false,
          price: 'R$ 55',
          priceB: 'R$ 55',
          priceLabel: 'por pessoa',
          extraHourPrice: 'R$ 7,00',
          minGuests: 40,
          features: [
            '6 opções de drinks premium',
            'Vodka Absolut & Gin Tanqueray inclusos',
            'Efeitos especiais com gelo seco 💨',
            'Carta de drinks personalizada',
            'Drinks autorais exclusivos',
            'Cordiais, shrubs e xaropes artesanais',
            'Bancada temática + Decoração científica + Backdrop',
            'Apresentação cênica e interativa dos drinks',
            'Bartender profissional + Ajudante',
            'Copos de vidro, gelo, frutas e frete inclusos'
          ],
          custosPadrao: [
            { item: 'Destilados Premium (Absolut, Tanqueray)', valor: 260, quantidade: 1, categoria: 'insumos' },
            { item: 'Insumos, Cordiais, Shrubs & Gelo Seco', valor: 140, quantidade: 1, categoria: 'insumos' },
            { item: 'Bartender Especialista + Ajudante', valor: 450, quantidade: 1, categoria: 'equipe' },
            { item: 'Logística & Frete', valor: 60, quantidade: 1, categoria: 'logistica' }
          ],
          pricingMode: 'person',
          priceTiers: [
            { minGuests: 30, maxGuests: 50, fixedPrice: 2750, extraHourPrice: 220 },
            { minGuests: 51, maxGuests: 80, fixedPrice: 4100, extraHourPrice: 300 },
            { minGuests: 81, maxGuests: 120, fixedPrice: 5800, extraHourPrice: 380 },
            { minGuests: 121, maxGuests: 200, fixedPrice: 8800, extraHourPrice: 500 }
          ]
        },
        {
          id: 'mao-de-obra',
          name: 'Mão de Obra',
          emoji: '🤵',
          desc: 'Contratação exclusiva de equipe de bar profissional (barmans e ajudantes). O cliente fornece os insumos e bebidas.',
          badge: 'Serviço',
          maxDrinks: 0,
          drinksCount: 0,
          hoursLimit: 5,
          order: 3,
          popular: false,
          price: 'R$ 520',
          priceB: 'R$ 520',
          priceLabel: 'valor base',
          extraHourPrice: 'R$ 110,00',
          minGuests: 30,
          features: [
            'Equipe de barman e ajudante dimensionada',
            'Utensílios e acessórios de bar profissionais',
            'Espuma artesanal de gengibre inclusa',
            'Consultoria de lista de compras para o cliente',
            'Até 5 horas de atendimento no evento'
          ],
          custosPadrao: [
            { item: 'Diária Barman + Ajudante', valor: 350, quantidade: 1, categoria: 'equipe' },
            { item: 'Logística & Frete', valor: 50, quantidade: 1, categoria: 'logistica' }
          ],
          pricingMode: 'tier',
          priceTiers: [
            { minGuests: 30, maxGuests: 50, fixedPrice: 520, extraHourPrice: 110 },
            { minGuests: 51, maxGuests: 80, fixedPrice: 700, extraHourPrice: 140 },
            { minGuests: 81, maxGuests: 120, fixedPrice: 1050, extraHourPrice: 180 },
            { minGuests: 121, maxGuests: 200, fixedPrice: 1500, extraHourPrice: 250 }
          ]
        }
      ]);
    }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Configure os pacotes de serviço, regras de precificação por convidado e custos padrão de base.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn--outline" onClick={loadOfficialPacotesTemplate} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔄 Carregar Template Oficial
          </button>
          <button className="btn btn--outline" onClick={addPacote} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <FiPlus /> Novo Pacote
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {pacotes.map((pacote) => (
          <div key={pacote.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>{pacote.emoji}</span>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{pacote.name || 'Sem Nome'}</h3>
              </div>
              <button onClick={() => removePacote(pacote.id)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <FiTrash2 /> Excluir Pacote
              </button>
            </div>

            {/* Linha 1: Dados Básicos */}
            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Emoji</label>
                <input type="text" className="form-input" value={pacote.emoji || ''} onChange={(e) => updatePacote(pacote.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
              </div>
              <div>
                <label className="form-label">Nome do Pacote</label>
                <input type="text" className="form-input" value={pacote.name || ''} onChange={(e) => updatePacote(pacote.id, 'name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Badge de Destaque</label>
                <input type="text" className="form-input" value={pacote.badge || ''} onChange={(e) => updatePacote(pacote.id, 'badge', e.target.value)} placeholder="Ex: Mais Escolhido" />
              </div>
              <div>
                <label className="form-label">Limite Drinks</label>
                <input type="number" className="form-input" value={pacote.maxDrinks ?? ''} onChange={(e) => updatePacote(pacote.id, 'maxDrinks', Number(e.target.value))} />
              </div>
            </div>

            {/* Linha 2: Preços */}
            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Preço A (Padrão)</label>
                <input type="text" className="form-input" value={pacote.price || ''} onChange={(e) => updatePacote(pacote.id, 'price', e.target.value)} placeholder="R$ 45" />
              </div>
              <div>
                <label className="form-label" style={{ color: '#00E5FF' }}>Preço B (Variante A/B)</label>
                <input type="text" className="form-input" value={pacote.priceB || ''} onChange={(e) => updatePacote(pacote.id, 'priceB', e.target.value)} placeholder="R$ 48" style={{ borderColor: '#00E5FF' }} />
              </div>
              <div>
                <label className="form-label">Hora Extra</label>
                <input type="text" className="form-input" value={pacote.extraHourPrice || ''} onChange={(e) => updatePacote(pacote.id, 'extraHourPrice', e.target.value)} placeholder="R$ 6,00" />
              </div>
              <div>
                <label className="form-label">Horas Inclusas</label>
                <input type="number" className="form-input" value={pacote.hoursLimit || 5} onChange={(e) => updatePacote(pacote.id, 'hoursLimit', Number(e.target.value))} />
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Descrição do Pacote</label>
              <textarea className="form-input" rows={2} value={pacote.desc || ''} onChange={(e) => updatePacote(pacote.id, 'desc', e.target.value)} />
            </div>

            {/* Features Inclusas */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Itens Inclusos no Pacote (Features)</h5>
                <button onClick={() => addPacoteFeature(pacote.id)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                  + Adicionar Item
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(pacote.features || []).map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" className="form-input" value={feat} onChange={(e) => updatePacoteFeature(pacote.id, idx, e.target.value)} style={{ padding: '6px 10px', fontSize: '0.82rem' }} />
                    <button onClick={() => removePacoteFeature(pacote.id, idx)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Faixas de Preço (Tiers) */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Faixas de Preço Escalonadas (Tiers)</h5>
                <button onClick={() => addPacoteTier(pacote.id)} style={{ background: 'none', border: '1px solid #00E5FF', color: '#00E5FF', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                  + Adicionar Faixa
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(pacote.priceTiers || []).map((tier, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="number" className="form-input" placeholder="Mín Conv." value={tier.minGuests || ''} onChange={(e) => updatePacoteTier(pacote.id, idx, 'minGuests', Number(e.target.value))} style={{ width: '80px', padding: '6px', fontSize: '0.8rem' }} />
                    <span style={{ color: 'var(--text-muted)' }}>a</span>
                    <input type="number" className="form-input" placeholder="Máx Conv." value={tier.maxGuests || ''} onChange={(e) => updatePacoteTier(pacote.id, idx, 'maxGuests', Number(e.target.value))} style={{ width: '80px', padding: '6px', fontSize: '0.8rem' }} />
                    <span style={{ color: 'var(--text-muted)' }}>= R$</span>
                    <input type="number" className="form-input" placeholder="Valor Fixo" value={tier.fixedPrice || ''} onChange={(e) => updatePacoteTier(pacote.id, idx, 'fixedPrice', Number(e.target.value))} style={{ width: '100px', padding: '6px', fontSize: '0.8rem' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Hora Ext: R$</span>
                    <input type="number" className="form-input" placeholder="Hora Extra" value={tier.extraHourPrice || ''} onChange={(e) => updatePacoteTier(pacote.id, idx, 'extraHourPrice', Number(e.target.value))} style={{ width: '90px', padding: '6px', fontSize: '0.8rem' }} />
                    <button onClick={() => removePacoteTier(pacote.id, idx)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custos Padrão */}
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Custos Padrão Embutidos</h5>
                <button onClick={() => addPacoteCusto(pacote.id)} style={{ background: 'none', border: '1px solid #FFD54F', color: '#FFD54F', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                  + Adicionar Custo
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(pacote.custosPadrao || []).map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Descrição do custo" value={c.item || ''} onChange={(e) => updatePacoteCusto(pacote.id, idx, 'item', e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }} />
                    <input type="number" className="form-input" placeholder="R$" value={c.valor || ''} onChange={(e) => updatePacoteCusto(pacote.id, idx, 'valor', Number(e.target.value))} style={{ width: '90px', padding: '6px', fontSize: '0.8rem' }} />
                    <select className="form-select" value={c.categoria || 'insumos'} onChange={(e) => updatePacoteCusto(pacote.id, idx, 'categoria', e.target.value)} style={{ width: '110px', padding: '6px', fontSize: '0.8rem' }}>
                      <option value="insumos">🧃 Insumos</option>
                      <option value="equipe">👥 Equipe</option>
                      <option value="logistica">🚚 Logística</option>
                      <option value="descartaveis">🥤 Descartáveis</option>
                      <option value="outros">✨ Outros</option>
                    </select>
                    <button onClick={() => removePacoteCusto(pacote.id, idx)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}