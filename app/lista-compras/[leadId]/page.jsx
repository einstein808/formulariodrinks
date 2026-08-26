"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, get, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiCheck, FiShoppingCart, FiChevronRight, FiShare2, FiRefreshCw } from 'react-icons/fi';
import { DEFAULT_FIXED_ITEMS, CATEGORY_LABELS } from '@/lib/shoppingCalculator';

function ShoppingListContent() {
  const { leadId } = useParams();
  const searchParams = useSearchParams();
  const isBarmanView = searchParams.get('barman') === 'true' || searchParams.get('role') === 'barman';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (!leadSnap.exists()) { setError('Lead não encontrado.'); setLoading(false); return; }
        const leadData = leadSnap.val();
        setLead(leadData);
        setConvidadosLocal(leadData.convidados || '');
        if (leadData.shoppingListChecked) setCheckedItems(leadData.shoppingListChecked);
        // Control step and checklist initialization
        if (isBarmanView) {
          setStep(3);
          if (leadData.shoppingListResult) {
            setDrinksEscolhidos(leadData.shoppingListResult.drinksEscolhidos || []);
            setListaGerada(leadData.shoppingListResult);
          } else {
            setDrinksEscolhidos(leadData.drinksEscolhidos || []);
          }
        } else {
          if (leadData.shoppingListFinalizada && leadData.shoppingListResult) {
            setDrinksEscolhidos(leadData.shoppingListResult.drinksEscolhidos || []);
            setListaGerada(leadData.shoppingListResult);
            setStep(3);
          } else {
            setStep(1);
          }
        }

        // Fetch Configs
        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const config = configSnap.val();
          
          let fetchedDrinksMenu = [];
          if (config.drinksMenu) {
            fetchedDrinksMenu = Object.entries(config.drinksMenu)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setDrinksMenu(fetchedDrinksMenu);
          }
          
          let fetchedShoppingConfig = { margemSeguranca: 10, itensFixos: [] };
          if (config.shoppingConfig) {
            fetchedShoppingConfig = config.shoppingConfig;
            setShoppingConfig(fetchedShoppingConfig);
          } else {
            setShoppingConfig(fetchedShoppingConfig);
          }

          if (config.maxDrinks) {
            setMaxDrinks(config.maxDrinks);
          }

          // If barman view and no list generated, calculate it automatically on-the-fly!
          if (isBarmanView && !leadData.shoppingListResult) {
            const initialDrinks = leadData.drinksEscolhidos || [];
            const conv = Math.max(Number(leadData.convidados) || 0, 40);
            const totalDrinks = Math.ceil(conv * 3.5);
            const margem = fetchedShoppingConfig.margemSeguranca ? (1 + (Number(fetchedShoppingConfig.margemSeguranca) / 100)) : 1.10;
            
            const drinksSel = fetchedDrinksMenu.filter(d => initialDrinks.includes(d.id));
            
            if (drinksSel.length > 0) {
              const agregInsumos = {};
              const selAlcool = drinksSel.filter(d => !d.isNonAlcoholic);
              const selSemAlcool = drinksSel.filter(d => d.isNonAlcoholic);
              const pctSemAlcool = selSemAlcool.length > 0 ? (Number(fetchedShoppingConfig.nonAlcoholicPercentage) || 15) / 100 : 0;
              const pctAlcool = 1 - pctSemAlcool;
              
              const totalAlcool = Math.ceil(totalDrinks * pctAlcool);
              const totalSemAlcool = Math.ceil(totalDrinks * pctSemAlcool);
              
              const totalWAlcool = selAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);
              const totalWSemAlcool = selSemAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);
              
              drinksSel.forEach(drink => {
                const isNonAlc = drink.isNonAlcoholic;
                const peso = Number(drink.popularityWeight) || 5;
                let proportion = 0;
                let drinksDesteTipo = 0;
                if (isNonAlc) {
                  proportion = totalWSemAlcool > 0 ? peso / totalWSemAlcool : 1 / selSemAlcool.length;
                  drinksDesteTipo = Math.ceil(totalSemAlcool * proportion);
                } else {
                  proportion = totalWAlcool > 0 ? peso / totalWAlcool : 1 / selAlcool.length;
                  drinksDesteTipo = Math.ceil(totalAlcool * proportion);
                }
                if (drink.receita && Array.isArray(drink.receita)) {
                  drink.receita.forEach(item => {
                    if (!item.insumo || !item.quantidade) return;
                    const baseQ = Number(item.quantidade) * drinksDesteTipo;
                    const key = item.insumo.trim().charAt(0).toUpperCase() + item.insumo.trim().slice(1).toLowerCase();
                    if (!agregInsumos[key]) {
                      agregInsumos[key] = { qtd: 0, unidade: item.unidade || 'ml' };
                    }
                    agregInsumos[key].qtd += (baseQ * margem);
                  });
                }
              });
              
              const insFormatados = {};
              Object.entries(agregInsumos).forEach(([nome, data]) => {
                let q = data.qtd;
                let u = data.unidade;
                if (u === 'ml') {
                  q = Math.ceil(q / 1000);
                  u = 'Litros';
                } else if (u === 'g' && q >= 1000) {
                  q = Math.ceil(q / 1000);
                  u = 'Kg';
                } else {
                  q = Math.ceil(q);
                }
                insFormatados[nome] = `${q} ${u}`;
              });
              
              const fixBase = fetchedShoppingConfig.itensFixos && fetchedShoppingConfig.itensFixos.length > 0 ? fetchedShoppingConfig.itensFixos : DEFAULT_FIXED_ITEMS;
              const fixFormatados = fixBase.map(fixo => {
                if (!fixo.nome) return null;
                const tot = fixo.tipoCalc === 'porConvidado' ? Math.ceil(Number(fixo.quantidade) * conv) : Math.ceil(Number(fixo.quantidade));
                return {
                  id: fixo.id || fixo.nome.toLowerCase().replace(/\s+/g, '_'),
                  nome: fixo.nome,
                  quantidade: tot,
                  unidade: fixo.unidade || 'un',
                  categoria: fixo.categoria || 'bar',
                };
              }).filter(Boolean);
              
              setListaGerada({
                insumos: insFormatados,
                fixos: fixFormatados,
                drinksEscolhidos: initialDrinks,
                convidadosCalculados: conv
              });
            } else {
              const fixBase = fetchedShoppingConfig.itensFixos && fetchedShoppingConfig.itensFixos.length > 0 ? fetchedShoppingConfig.itensFixos : DEFAULT_FIXED_ITEMS;
              const fixFormatados = fixBase.map(fixo => {
                if (!fixo.nome) return null;
                const tot = fixo.tipoCalc === 'porConvidado' ? Math.ceil(Number(fixo.quantidade) * conv) : Math.ceil(Number(fixo.quantidade));
                return {
                  id: fixo.id || fixo.nome.toLowerCase().replace(/\s+/g, '_'),
                  nome: fixo.nome,
                  quantidade: tot,
                  unidade: fixo.unidade || 'un',
                  categoria: fixo.categoria || 'bar',
                };
              }).filter(Boolean);

              setListaGerada({
                insumos: {},
                fixos: fixFormatados,
                drinksEscolhidos: [],
                convidadosCalculados: conv
              });
            }
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
      const total = fixo.tipoCalc === 'fixo'
        ? Math.ceil(Number(fixo.quantidade))
        : Math.ceil(Number(fixo.quantidade) * convidados);
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
                          <img src={d.image} alt={d.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                              <img src={d.image} alt={d.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              {isBarmanView ? (
                /* 📋 BARMAN VIEW: INTERACTIVE CHECKLIST */
                <>
                  {(() => {
                    const flatItems = [
                      ...Object.entries(listaGerada.insumos).map(([nome, qtd]) => ({
                        id: `insumo_${nome}`,
                        nome,
                        quantidade: qtd,
                        categoria: 'drinks',
                      })),
                      ...(listaGerada.fixos || []).map((f, idx) => ({
                        id: `fixo_${f.id || f.nome?.toLowerCase().replace(/\s+/g, '_') || idx}`,
                        nome: f.nome,
                        quantidade: `${f.quantidade} ${f.unidade}`,
                        categoria: f.categoria || 'bar',
                      }))
                    ];

                    const totalCount = flatItems.length;
                    const checkedCount = flatItems.filter(item => checkedItems[item.id]).length;
                    const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                    const filteredItems = flatItems.filter(item => {
                      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
                      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    return (
                      <>
                        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', marginBottom: '20px' }}>
                          
                          {/* OPERATIONAL HEADER */}
                          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  Painel Operacional do Bartender
                                </span>
                                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                  Conferência de Insumos e Materiais
                                </h2>
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  Evento para {listaGerada.convidadosCalculados || convidadosLocal} convidados · Margem de {shoppingConfig?.margemSeguranca || 10}% ativa
                                </p>
                              </div>
                              <div style={{ background: progressPct === 100 ? 'rgba(76,175,80,0.1)' : 'rgba(203,161,83,0.08)', border: `1px solid ${progressPct === 100 ? '#4CAF50' : 'var(--border-color)'}`, padding: '8px 16px', borderRadius: '8px', textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Status Geral</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: progressPct === 100 ? '#4CAF50' : 'var(--primary)' }}>
                                  {progressPct === 100 ? 'Concluído' : `${progressPct}% Conferido`}
                                </div>
                              </div>
                            </div>

                            {/* Operational Progress Bar */}
                            <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden', marginTop: '16px' }}>
                              <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? '#4CAF50' : 'var(--primary)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                            </div>
                            
                            {saving && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <div className="btn__spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                                Sincronizando com o painel administrador...
                              </div>
                            )}
                          </div>

                          {/* SEARCH & FILTERS BAR */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {/* Search bar */}
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Pesquisar item na lista..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px', height: '40px', fontSize: '0.9rem', width: '100%', background: 'var(--bg-input)' }}
                              />
                              {searchTerm && (
                                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                  Limpar
                                </button>
                              )}
                            </div>

                            {/* Category Filter Tabs */}
                            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                              {[
                                { id: 'all', label: '📋 Todos' },
                                { id: 'drinks', label: '🍹 Bebidas/Insumos' },
                                { id: 'insumo', label: '🍋 Frescos' },
                                { id: 'bar', label: '🍸 Equipamentos' },
                                { id: 'descartavel', label: '🧾 Descartáveis' },
                                { id: 'decoracao', label: '✨ Decoração' }
                              ].map(tab => {
                                const isActive = categoryFilter === tab.id;
                                return (
                                  <button
                                    key={tab.id}
                                    onClick={() => setCategoryFilter(tab.id)}
                                    style={{
                                      padding: '8px 14px',
                                      fontSize: '0.8rem',
                                      fontWeight: isActive ? 'bold' : 'normal',
                                      borderRadius: '20px',
                                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                                      background: isActive ? 'var(--primary)' : 'var(--bg-input)',
                                      color: isActive ? '#000' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {tab.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* INVENTORY CHECKLIST TABLE */}
                          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--border-color)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            {/* Table Headers */}
                            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '10px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              <div style={{ width: '40px' }}>Status</div>
                              <div style={{ flex: 1, paddingLeft: '8px' }}>Item</div>
                              <div style={{ width: '100px', textAlign: 'right' }}>Qtd</div>
                            </div>

                            {/* Table Body Rows */}
                            {filteredItems.length === 0 ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', fontSize: '0.85rem' }}>
                                Nenhum item encontrado para esta busca ou categoria.
                              </div>
                            ) : (
                              filteredItems.map(item => {
                                const isChecked = !!checkedItems[item.id];
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '12px 16px',
                                      background: isChecked ? 'rgba(76,175,80,0.04)' : 'var(--bg-card)',
                                      borderBottom: '1px solid var(--border-color)',
                                      cursor: 'pointer',
                                      transition: 'background 0.15s ease',
                                      userSelect: 'none'
                                    }}
                                  >
                                    {/* Checked Box */}
                                    <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
                                      <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        border: `2px solid ${isChecked ? '#4CAF50' : 'var(--border-color)'}`,
                                        background: isChecked ? '#4CAF50' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.1s ease'
                                      }}>
                                        {isChecked && <FiCheck size={12} color="#fff" strokeWidth={3} />}
                                      </div>
                                    </div>

                                    {/* Item Details */}
                                    <div style={{ flex: 1, paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                                        textDecoration: isChecked ? 'line-through' : 'none'
                                      }}>
                                        {item.nome}
                                      </span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <span style={{
                                          fontSize: '0.7rem',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          background: 'rgba(255,255,255,0.04)',
                                          border: '1px solid var(--border-color)',
                                          color: 'var(--text-muted)'
                                        }}>
                                          {CATEGORY_LABELS[item.categoria]?.label.split(' ').slice(1).join(' ') || item.categoria}
                                        </span>
                                        <span style={{
                                          fontSize: '0.7rem',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          background: isChecked ? 'rgba(76,175,80,0.1)' : 'rgba(203,161,83,0.06)',
                                          color: isChecked ? '#4CAF50' : 'var(--primary)',
                                          fontWeight: 'bold'
                                        }}>
                                          {isChecked ? 'CONFERIDO' : 'PENDENTE'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Quantity */}
                                    <div style={{ width: '100px', textAlign: 'right' }}>
                                      <strong style={{
                                        fontSize: '0.9rem',
                                        color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)'
                                      }}>
                                        {item.quantidade}
                                      </strong>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                        </div>

                        {/* Backoffice Footer Info */}
                        <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                          <span>Fim da lista de insumos. Todas as alterações são salvas automaticamente na nuvem.</span>
                          <button className="btn btn--outline" onClick={compartilharLista} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiShare2 size={12} /> Copiar Link
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                /* 👤 CLIENT VIEW: CLEAN STATIC SUMMARY */
                <>
                  <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(203, 161, 83, 0.1)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '16px' }}>
                        <FiCheck size={32} />
                      </div>
                      <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Sua Lista está Pronta!</h2>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>
                        Calculada para {listaGerada.convidadosCalculados || convidadosLocal} convidados (com margem de segurança de {shoppingConfig?.margemSeguranca || 10}%).
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '12px', lineHeight: 1.4 }}>
                        Abaixo estão os insumos necessários para comprar. Tire um print ou compartilhe a lista por WhatsApp!
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Bebidas e Insumos */}
                      <div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '1rem' }}>
                          🍹 Bebidas e Insumos Necessários
                        </h3>
                        {Object.keys(listaGerada.insumos).length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum insumo calculado.</p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {Object.entries(listaGerada.insumos).map(([insumo, qtd]) => (
                              <div key={insumo} style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{insumo}</span>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{qtd}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Descartáveis e Fixos */}
                      {listaGerada.fixos && listaGerada.fixos.length > 0 && (
                        <div>
                          <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '1rem' }}>
                            📦 Descartáveis e Itens de Bar
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {listaGerada.fixos.map((item, idx) => (
                              <div key={idx} style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.nome}</span>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.quantidade} {item.unidade}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drinks no cardápio */}
                      <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Seus Drinks Escolhidos:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {drinksMenu.filter(d => listaGerada.drinksEscolhidos.includes(d.id)).map(d => (
                            <span key={d.id} style={{ background: 'rgba(203,161,83,0.06)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {d.emoji} {d.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Client */}
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
                      <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Tudo pronto. Nossa equipe foi notificada e cuidará dos preparativos!</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function ShoppingListClient() {
  return (
    <Suspense fallback={<div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>}>
      <ShoppingListContent />
    </Suspense>
  );
}
