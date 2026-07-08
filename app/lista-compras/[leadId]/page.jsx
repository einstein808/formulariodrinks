"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiCheck, FiShoppingCart, FiChevronRight, FiShare2, FiRefreshCw } from 'react-icons/fi';

const DEFAULT_FIXED_ITEMS = [
  { id: 'sifao_espuma', nome: 'Sifão de Espuma (carga)', categoria: 'bar', tipoCalc: 'fixo', quantidade: 6, unidade: 'un' },
  { id: 'limoes', nome: 'Limões', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.04, unidade: 'kg' },
  { id: 'gelo', nome: 'Gelo', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.2, unidade: 'kg' },
  { id: 'hortela', nome: 'Hortelã', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.02, unidade: 'maço' },
  { id: 'decoracao', nome: 'Decoração de Mesa', categoria: 'decoracao', tipoCalc: 'fixo', quantidade: 1, unidade: 'kit' },
  { id: 'guardanapos', nome: 'Guardanapos', categoria: 'descartavel', tipoCalc: 'porConvidado', quantidade: 0.05, unidade: 'pct' },
  { id: 'canudos', nome: 'Canudos', categoria: 'descartavel', tipoCalc: 'fixo', quantidade: 2, unidade: 'pct' },
];

const CATEGORY_LABELS = {
  bar:        { label: '🍸 Equipamentos de Bar', color: '#cba153' },
  insumo:     { label: '🍋 Insumos Frescos', color: '#4CAF50' },
  decoracao:  { label: '✨ Decoração', color: '#CE93D8' },
  descartavel:{ label: '🧾 Descartáveis', color: '#00E5FF' },
  drinks:     { label: '🍹 Bebidas e Insumos Calculados', color: '#FF9800' },
};
export default function ShoppingListClient() {
  const { leadId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lead, setLead] = useState(null);
  const [drinksMenu, setDrinksMenu] = useState([]);
  const [shoppingConfig, setShoppingConfig] = useState(null);
  const [step, setStep] = useState(1);
  const [drinksEscolhidos, setDrinksEscolhidos] = useState([]);
  const [maxDrinks, setMaxDrinks] = useState(5);
  const [listaGerada, setListaGerada] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convidadosLocal, setConvidadosLocal] = useState('');
  const [checkedItems, setCheckedItems] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (!leadSnap.exists()) { setError('Lead não encontrado.'); setLoading(false); return; }
        const leadData = leadSnap.val();
        setLead(leadData);
        setConvidadosLocal(leadData.convidados || '');
        if (leadData.shoppingListChecked) setCheckedItems(leadData.shoppingListChecked);
        if (leadData.shoppingListFinalizada && leadData.shoppingListResult) {
          setDrinksEscolhidos(leadData.shoppingListResult.drinksEscolhidos || []);
          setListaGerada(leadData.shoppingListResult);
          setStep(3);
        }

        // Fetch Configs
        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const config = configSnap.val();
          
          if (config.drinksMenu) {
            const drinksArr = Object.entries(config.drinksMenu)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setDrinksMenu(drinksArr);
          }
          
          if (config.shoppingConfig) {
            setShoppingConfig(config.shoppingConfig);
          } else {
            // Default se não existir
            setShoppingConfig({ margemSeguranca: 10, itensFixos: [] });
          }

          if (config.maxDrinks) {
            setMaxDrinks(config.maxDrinks);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar as informações.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leadId]);

  const toggleDrink = (id) => {
    if (drinksEscolhidos.includes(id)) {
      setDrinksEscolhidos(drinksEscolhidos.filter(d => d !== id));
    } else {
      const drinkInfo = drinksMenu.find(d => d.id === id);
      const isNonAlc = drinkInfo?.isNonAlcoholic;
      
      const currentCount = drinksEscolhidos.filter(dId => {
        const dInfo = drinksMenu.find(d => d.id === dId);
        return isNonAlc ? dInfo?.isNonAlcoholic : !dInfo?.isNonAlcoholic;
      }).length;

      const maxAllowed = isNonAlc ? 2 : maxDrinks;
      
      if (currentCount >= maxAllowed) {
        alert(`Você já escolheu o máximo permitido para essa categoria (${maxAllowed}).`);
        return;
      }
      setDrinksEscolhidos([...drinksEscolhidos, id]);
    }
  };

  const calcularLista = () => {
    if (drinksEscolhidos.length === 0) return;

    const convidados = Math.max(Number(convidadosLocal) || 0, 40);
    const totalDrinksFesta = Math.ceil(convidados * 3.5);

    const margem = shoppingConfig?.margemSeguranca ? (1 + (Number(shoppingConfig.margemSeguranca) / 100)) : 1.10;

    const agregadorInsumos = {}; // { "Vodka": { qtd: 1000, unidade: "ml" } }

    const drinksSelecionados = drinksMenu.filter(d => drinksEscolhidos.includes(d.id));
    const selectedAlcool = drinksSelecionados.filter(d => !d.isNonAlcoholic);
    const selectedSemAlcool = drinksSelecionados.filter(d => d.isNonAlcoholic);

    const pctSemAlcool = selectedSemAlcool.length > 0 ? (Number(shoppingConfig?.nonAlcoholicPercentage) || 15) / 100 : 0;
    const pctAlcool = 1 - pctSemAlcool;

    const totalDrinksFestaAlcool = Math.ceil(totalDrinksFesta * pctAlcool);
    const totalDrinksFestaSemAlcool = Math.ceil(totalDrinksFesta * pctSemAlcool);

    const totalWeightAlcool = selectedAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);
    const totalWeightSemAlcool = selectedSemAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);

    drinksSelecionados.forEach(drink => {
      const isNonAlc = drink.isNonAlcoholic;
      const pesoDrink = Number(drink.popularityWeight) || 5;
      
      let proportion = 0;
      let drinksDesteTipo = 0;

      if (isNonAlc) {
        proportion = totalWeightSemAlcool > 0 ? pesoDrink / totalWeightSemAlcool : 1 / selectedSemAlcool.length;
        drinksDesteTipo = Math.ceil(totalDrinksFestaSemAlcool * proportion);
      } else {
        proportion = totalWeightAlcool > 0 ? pesoDrink / totalWeightAlcool : 1 / selectedAlcool.length;
        drinksDesteTipo = Math.ceil(totalDrinksFestaAlcool * proportion);
      }

      if (drink.receita && Array.isArray(drink.receita)) {
        drink.receita.forEach(item => {
          if (!item.insumo || !item.quantidade) return;
          
          const qtdTotalBase = Number(item.quantidade) * drinksDesteTipo;
          const qtdComMargem = qtdTotalBase * margem;
          
          // Agrupa os itens ignorando maiúsculas/minúsculas
          const chaveBase = item.insumo.trim().toLowerCase();
          const chave = chaveBase.charAt(0).toUpperCase() + chaveBase.slice(1);
          
          if (!agregadorInsumos[chave]) {
            agregadorInsumos[chave] = { qtd: 0, unidade: item.unidade || 'ml' };
          }
          agregadorInsumos[chave].qtd += qtdComMargem;
        });
      }
    });

    // Formatar Insumos
    const insumosFormatados = {};
    Object.entries(agregadorInsumos).forEach(([nome, data]) => {
      let qtdFinal = data.qtd;
      let undFinal = data.unidade;

      // Simplificação básica de ML para Litros (sempre converte e arredonda para cima)
      if (undFinal === 'ml') {
        qtdFinal = Math.ceil(qtdFinal / 1000);
        undFinal = 'Litros';
      } else if (undFinal === 'g' && qtdFinal >= 1000) {
        qtdFinal = Math.ceil(qtdFinal / 1000);
        undFinal = 'Kg';
      } else {
        qtdFinal = Math.ceil(qtdFinal);
      }

      insumosFormatados[nome] = `${qtdFinal} ${undFinal}`;
    });

    // Calcular Fixos (usa DEFAULT_FIXED_ITEMS se não houver config)
    const fixosBase = (shoppingConfig?.itensFixos && shoppingConfig.itensFixos.length > 0)
      ? shoppingConfig.itensFixos
      : DEFAULT_FIXED_ITEMS;

    const fixosFormatados = fixosBase.map(fixo => {
      if (!fixo.nome) return null;
      const total = fixo.tipoCalc === 'porConvidado'
        ? Math.ceil(Number(fixo.quantidade) * convidados)
        : Math.ceil(Number(fixo.quantidade));
      return {
        id: fixo.id || fixo.nome.toLowerCase().replace(/\s+/g, '_'),
        nome: fixo.nome,
        quantidade: total,
        unidade: fixo.unidade || 'un',
        categoria: fixo.categoria || 'bar',
      };
    }).filter(Boolean);

    const resultado = {
      insumos: insumosFormatados,
      fixos: fixosFormatados,
      drinksEscolhidos,
      convidadosCalculados: convidados
    };

    setListaGerada(resultado);
    setStep(3);
  };

  const toggleItem = useCallback(async (itemId) => {
    const newChecked = { ...checkedItems, [itemId]: !checkedItems[itemId] };
    setCheckedItems(newChecked);
    setSaving(true);
    try { await update(ref(db, `leads/${leadId}`), { shoppingListChecked: newChecked }); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, [checkedItems, leadId]);

  const compartilharLista = () => {
    if (!listaGerada) return;
    let texto = `🛒 Lista de Compras — ${lead?.nome || 'Evento'}\n👥 ${listaGerada.convidadosCalculados} convidados\n\n🍹 BEBIDAS E INSUMOS:\n`;
    Object.entries(listaGerada.insumos).forEach(([nome, qtd]) => { texto += `  ${checkedItems[`insumo_${nome}`] ? '✅' : '⬜'} ${nome}: ${qtd}\n`; });
    const fixosPorCat = (listaGerada.fixos || []).reduce((acc, f) => { const c = f.categoria || 'bar'; if (!acc[c]) acc[c] = []; acc[c].push(f); return acc; }, {});
    Object.entries(fixosPorCat).forEach(([cat, items]) => {
      texto += `\n${CATEGORY_LABELS[cat]?.label || cat.toUpperCase()}:\n`;
      items.forEach(f => { texto += `  ${checkedItems[`fixo_${f.id}`] ? '✅' : '⬜'} ${f.nome}: ${f.quantidade} ${f.unidade}\n`; });
    });
    if (navigator.share) { navigator.share({ title: 'Lista de Compras', text: texto }); }
    else { navigator.clipboard.writeText(texto).then(() => alert('Lista copiada para a área de transferência!')); }
  };

  const allItemIds = listaGerada ? [
    ...Object.keys(listaGerada.insumos).map(n => `insumo_${n}`),
    ...(listaGerada.fixos || []).map(f => `fixo_${f.id}`),
  ] : [];
  const checkedCount = allItemIds.filter(id => checkedItems[id]).length;
  const totalCount = allItemIds.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;


  const salvarListaNoFirebase = async () => {
    setIsSubmitting(true);
    try {
      await update(ref(db, `leads/${leadId}`), {
        shoppingListFinalizada: true,
        shoppingListResult: listaGerada,
        convidados: convidadosLocal,
        status: 'fechado' // Força ou garante que continua fechado
      });

      // Envia os dados para o Webhook do n8n (Geração de PDF)
      const webhookUrl = 'https://webhook.gabryelamaro.com/webhook/1e022a86-2a9d-4764-a635-3478b405ef89';
      
      const payload = {
        leadId: leadId,
        nome: lead.nome || '',
        telefone: lead.telefone || '',
        dataEvento: lead.dataEvento || '',
        cidade: lead.cidade || '',
        pacote: lead.pacote || '',
        convidados: convidadosLocal,
        listaGerada: listaGerada
      };

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
      } catch (webhookErr) {
        console.error("Erro ao enviar para webhook n8n:", webhookErr);
        // Não bloqueia o fluxo principal se o webhook falhar
      }

      setLead(prev => ({ ...prev, shoppingListFinalizada: true, convidados: convidadosLocal }));
      alert("Lista salva com sucesso! Nossa equipe já foi notificada.");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a lista. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h2 style={{ color: '#F44336' }}>Oops!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  return (
    <>

      
      <div className="bg-effects">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>
      <div className="bg-grid" />

      <div className="app" style={{ minHeight: '100vh', paddingBottom: '40px' }}>
        <header className="header">
          <img src="/logo.webp" alt="Logo" style={{ width: 140, marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(203, 161, 83, 0.4))' }} />
          <h1 className="header__title">Lista de Compras</h1>
          <p className="header__subtitle">Vamos preparar a lista exata para o seu evento.</p>
        </header>

        <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* STEP 1: Confirmação */}
          {step === 1 && (
            <div className="step-enter" style={{ background: 'var(--bg-main)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: '16px' }}>Olá, {lead.nome}! 👋</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                Estamos animados para o seu evento em <strong>{lead.dataEvento}</strong>.<br/>
                Como você fechou o pacote <strong>Mão de Obra</strong>, você precisa nos dizer quais drinks deseja servir. Nossa plataforma vai calcular exatamente os insumos necessários!
              </p>
              
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', margin: '0 auto 24px auto', maxWidth: '300px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Quantidade de Convidados:
                </label>
                <input 
                  type="number" 
                  value={convidadosLocal}
                  onChange={(e) => setConvidadosLocal(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: '#FFF', fontSize: '1.2rem', textAlign: 'center', outline: 'none' }}
                  min="40"
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                  Você pode ajustar este número caso a quantidade tenha mudado.
                </p>
              </div>
              
              <button 
                className="btn btn--primary" 
                onClick={() => setStep(2)}
                style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}
              >
                Escolher Meus Drinks <FiChevronRight />
              </button>
            </div>
          )}

          {/* STEP 2: Escolher Drinks */}
          {step === 2 && (
            <div className="step-enter">
              <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#FFF' }}>Escolha até {maxDrinks} drinks com álcool</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 24px 0' }}>Selecione os favoritos para a sua festa. Nós calcularemos os insumos baseados nesta escolha.</p>
                
                <div className="drinks-grid">
                  {drinksMenu.filter(d => !d.isNonAlcoholic).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className={`drink-card ${drinksEscolhidos.includes(d.id) ? 'drink-card--selected' : ''}`}
                      onClick={() => toggleDrink(d.id)}
                    >
                      {d.image ? (
                        <div className="drink-card__image-container" style={{ width: 70, height: 70, borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 8, border: '1px solid var(--primary)', zIndex: 1, flexShrink: 0 }}>
                          <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <span className="drink-card__emoji">{d.emoji}</span>
                      )}
                      <span className="drink-card__name">{d.name}</span>
                    </button>
                  ))}
                </div>
                
                <div className="drinks-counter" style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <strong>{drinksEscolhidos.filter(dId => !drinksMenu.find(d => d.id === dId)?.isNonAlcoholic).length}</strong> de <strong>{maxDrinks}</strong> drinks selecionados
                </div>

                {drinksMenu.filter(d => d.isNonAlcoholic).length > 0 && (
                  <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px dashed var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#00E5FF' }}>Opções Sem Álcool (Escolha até 2)</h3>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 24px 0' }}>Bônus! Estes drinks não ocupam as vagas do seu pacote principal.</p>
                    
                    <div className="drinks-grid">
                      {drinksMenu.filter(d => d.isNonAlcoholic).map(d => (
                        <button
                          key={d.id}
                          type="button"
                          className={`drink-card ${drinksEscolhidos.includes(d.id) ? 'drink-card--selected' : ''}`}
                          onClick={() => toggleDrink(d.id)}
                          style={{ borderColor: drinksEscolhidos.includes(d.id) ? '#00E5FF' : 'var(--border-color)', background: drinksEscolhidos.includes(d.id) ? 'rgba(0, 229, 255, 0.1)' : 'var(--bg-input)' }}
                        >
                          {d.image ? (
                            <div className="drink-card__image-container" style={{ width: 70, height: 70, borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 8, border: '1px solid #00E5FF', zIndex: 1, flexShrink: 0 }}>
                              <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <span className="drink-card__emoji">{d.emoji}</span>
                          )}
                          <span className="drink-card__name">{d.name}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="drinks-counter" style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <strong>{drinksEscolhidos.filter(dId => drinksMenu.find(d => d.id === dId)?.isNonAlcoholic).length}</strong> de <strong>2</strong> opções selecionadas
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button className="btn btn--secondary" onClick={() => setStep(1)} style={{ width: 'auto' }}>
                  Voltar
                </button>
                <button 
                  className="btn btn--primary" 
                  onClick={calcularLista}
                  disabled={drinksEscolhidos.length === 0}
                  style={{ width: 'auto' }}
                >
                  <FiShoppingCart /> Gerar Minha Lista
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Lista Gerada */}
          {step === 3 && listaGerada && (
            <div className="step-enter">
              {/* Card principal */}
              <div style={{ background: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', marginBottom: '20px' }}>
                
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(76,175,80,0.1)', color: '#4CAF50', borderRadius: '50%', marginBottom: '12px' }}>
                    <FiShoppingCart size={32} />
                  </div>
                  <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Sua Lista de Compras</h2>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem' }}>
                    Para {listaGerada.convidadosCalculados || convidadosLocal} convidados · margem de {shoppingConfig?.margemSeguranca || 10}% incluída
                  </p>
                  {saving && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>💾 Salvando...</p>}
                </div>

                {/* Barra de Progresso */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Itens comprados</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: progressPct === 100 ? '#4CAF50' : 'var(--primary)' }}>
                      {checkedCount} / {totalCount} {progressPct === 100 ? '🎉 Tudo pronto!' : `(${progressPct}%)`}
                    </span>
                  </div>
                  <div style={{ height: '10px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' : 'linear-gradient(90deg, var(--primary-dark), var(--primary))', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Bebidas e Insumos Calculados */}
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ margin: '0 0 14px 0', color: CATEGORY_LABELS.drinks.color, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1rem' }}>
                    {CATEGORY_LABELS.drinks.label}
                  </h3>
                  {Object.keys(listaGerada.insumos).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma receita cadastrada para os drinks selecionados.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {Object.entries(listaGerada.insumos).map(([nome, qtd]) => {
                        const id = `insumo_${nome}`;
                        const checked = !!checkedItems[id];
                        return (
                          <div key={id} onClick={() => toggleItem(id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${checked ? '#4CAF50' : 'var(--border-color)'}`, background: checked ? 'rgba(76,175,80,0.06)' : 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.2s ease', userSelect: 'none' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '6px', border: `2px solid ${checked ? '#4CAF50' : 'var(--border-color)'}`, background: checked ? '#4CAF50' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s ease' }}>
                              {checked && <FiCheck size={14} color="#fff" strokeWidth={3} />}
                            </div>
                            <span style={{ flex: 1, color: checked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checked ? 'line-through' : 'none', fontSize: '0.95rem' }}>{nome}</span>
                            <strong style={{ color: checked ? 'var(--text-muted)' : 'var(--primary)', flexShrink: 0, fontSize: '0.9rem' }}>{qtd}</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Itens Fixos agrupados por categoria */}
                {Object.entries(
                  (listaGerada.fixos || []).reduce((acc, f) => {
                    const cat = f.categoria || 'bar';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(f);
                    return acc;
                  }, {})
                ).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 14px 0', color: CATEGORY_LABELS[cat]?.color || 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1rem' }}>
                      {CATEGORY_LABELS[cat]?.label || cat}
                    </h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {items.map(f => {
                        const id = `fixo_${f.id}`;
                        const checked = !!checkedItems[id];
                        const catColor = CATEGORY_LABELS[cat]?.color || 'var(--primary)';
                        return (
                          <div key={id} onClick={() => toggleItem(id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${checked ? '#4CAF50' : 'var(--border-color)'}`, background: checked ? 'rgba(76,175,80,0.06)' : 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.2s ease', userSelect: 'none' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '6px', border: `2px solid ${checked ? '#4CAF50' : 'var(--border-color)'}`, background: checked ? '#4CAF50' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s ease' }}>
                              {checked && <FiCheck size={14} color="#fff" strokeWidth={3} />}
                            </div>
                            <span style={{ flex: 1, color: checked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checked ? 'line-through' : 'none', fontSize: '0.95rem' }}>{f.nome}</span>
                            <strong style={{ color: checked ? 'var(--text-muted)' : catColor, flexShrink: 0, fontSize: '0.9rem' }}>{f.quantidade} {f.unidade}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Drinks no cardápio */}
                <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drinks no cardápio:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {drinksMenu.filter(d => listaGerada.drinksEscolhidos.includes(d.id)).map(d => (
                      <span key={d.id} style={{ background: 'rgba(203,161,83,0.08)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {d.emoji} {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {!lead.shoppingListFinalizada && (
                  <>
                    <button className="btn btn--secondary" onClick={() => setStep(2)} disabled={isSubmitting} style={{ width: 'auto', gap: '6px' }}>
                      <FiRefreshCw size={14} /> Refazer Escolhas
                    </button>
                    <button className="btn btn--primary" onClick={salvarListaNoFirebase} disabled={isSubmitting} style={{ width: 'auto' }}>
                      {isSubmitting ? 'Salvando...' : <><FiCheck /> Confirmar e Enviar para Equipe</>}
                    </button>
                  </>
                )}
                <button className="btn btn--secondary" onClick={compartilharLista} style={{ width: 'auto', gap: '6px' }}>
                  <FiShare2 size={14} /> Compartilhar Lista
                </button>
              </div>

              {lead.shoppingListFinalizada && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#4CAF50', background: 'rgba(76,175,80,0.08)', borderRadius: '8px', border: '1px solid #4CAF50', marginTop: '16px' }}>
                  ✅ <strong>Lista finalizada e enviada para nossa equipe!</strong><br />
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Continue marcando os itens conforme for comprando.</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
