"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, get, update } from 'firebase/database';
import { db } from '../../../lib/firebase';

import { FiCheck, FiShoppingCart, FiChevronRight } from 'react-icons/fi';

export default function ShoppingListClient() {
  const { leadId } = useParams();
  const router = useRouter();
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Lead
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (!leadSnap.exists()) {
          setError("Lead não encontrado.");
          setLoading(false);
          return;
        }
        const leadData = leadSnap.val();
        setLead(leadData);
        setConvidadosLocal(leadData.convidados || '');

        // Se o lead já finalizou a lista, pula direto pro passo 3 com os dados
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

    // Calcular Fixos
    const fixosFormatados = [];
    if (shoppingConfig?.itensFixos && Array.isArray(shoppingConfig.itensFixos)) {
      shoppingConfig.itensFixos.forEach(fixo => {
        if (!fixo.nome || !fixo.quantidade) return;
        const total = Math.ceil(Number(fixo.quantidade) * convidados);
        fixosFormatados.push({
          nome: fixo.nome,
          quantidade: total,
          unidade: fixo.unidade || 'un'
        });
      });
    }

    const resultado = {
      insumos: insumosFormatados,
      fixos: fixosFormatados,
      drinksEscolhidos,
      convidadosCalculados: convidados
    };

    setListaGerada(resultado);
    setStep(3);
  };

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
              <div style={{ background: 'var(--bg-main)', padding: '32px', borderRadius: '16px', border: '1px solid var(--primary)', boxShadow: '0 8px 32px rgba(203, 161, 83, 0.1)', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '50%', marginBottom: '16px' }}>
                    <FiShoppingCart size={32} />
                  </div>
                  <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Sua Lista está Pronta!</h2>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Calculada para {listaGerada.convidadosCalculados || convidadosLocal} convidados (já incluindo margem de segurança de {shoppingConfig?.margemSeguranca || 10}%).
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Bebidas e Insumos */}
                  <div>
                    <h3 style={{ margin: '0 0 16px 0', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>🍹 Bebidas e Insumos</h3>
                    {Object.keys(listaGerada.insumos).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>Nenhuma receita cadastrada para os drinks escolhidos.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {Object.entries(listaGerada.insumos).map(([insumo, qtd]) => (
                          <li key={insumo} style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{insumo}</span>
                            <strong style={{ color: 'var(--primary)' }}>{qtd}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Fixos e Descartáveis */}
                  {listaGerada.fixos && listaGerada.fixos.length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 16px 0', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>📦 Descartáveis e Itens Fixos</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {listaGerada.fixos.map((item, idx) => (
                          <li key={idx} style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{item.nome}</span>
                            <strong style={{ color: '#00E5FF' }}>{item.quantidade} {item.unidade}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Drinks Escolhidos */}
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drinks que farão parte do seu cardápio:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {drinksMenu.filter(d => listaGerada.drinksEscolhidos.includes(d.id)).map(d => (
                        <span key={d.id} style={{ background: '#222', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', color: '#FFF' }}>
                          {d.emoji} {d.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {!lead.shoppingListFinalizada && (
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button className="btn btn--secondary" onClick={() => setStep(2)} style={{ width: 'auto' }} disabled={isSubmitting}>
                    Refazer Escolhas
                  </button>
                  <button 
                    className="btn btn--primary" 
                    onClick={salvarListaNoFirebase}
                    disabled={isSubmitting}
                    style={{ width: 'auto' }}
                  >
                    {isSubmitting ? 'Salvando...' : <><FiCheck /> Confirmar e Enviar para Equipe</>}
                  </button>
                </div>
              )}

              {lead.shoppingListFinalizada && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                  ✅ <strong>Lista finalizada e enviada para nossa equipe!</strong><br/>
                  Você pode tirar um print desta tela para levar ao mercado.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
