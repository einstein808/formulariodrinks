"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';

const DRINKS_CARTA = [
  {
    nome: 'Caipirinha',
    tag: 'Clássico Brasileiro',
    destilado: 'Cachaça Artesanal ou Vodka',
    descricao: 'Limão tahiti fresco espremido na hora, açúcar cristal balanceado e maceração suave. Variações com morango e maracujá fresco.',
    emoji: '🍋'
  },
  {
    nome: 'Fitzgerald',
    tag: 'Elegância & Equilíbrio',
    destilado: 'London Dry Gin',
    descricao: 'Limão siciliano fresco, xarope simples artesanal da casa e gotas de Angostura bitters para o equilíbrio cítrico perfeito.',
    emoji: '🍸'
  },
  {
    nome: 'Moscow Mule da Casa',
    tag: 'O Mais Pedido',
    destilado: 'Vodka Selecionada',
    descricao: 'Suco de limão tahiti, toque cítrico e a nossa famosa espuma artesanal densa de gengibre fresco, servido na clássica caneca de cobre.',
    emoji: '🍺'
  },
  {
    nome: 'Piña Colada',
    tag: 'Tropical & Aveludado',
    destilado: 'Rum Prata',
    descricao: 'Abacaxi fresco macerado na hora, leite de coco cremoso e xarope artesanal suave. Doçura equilibrada sem enjoar.',
    emoji: '🍍'
  },
  {
    nome: 'Mojito Cubano',
    tag: 'Refrescância Pura',
    destilado: 'Rum Branco',
    descricao: 'Hortelã fresca macerada suavemente para liberar os óleos aromáticos, suco de limão, açúcar e club soda bem gelado.',
    emoji: '🌿'
  },
  {
    nome: 'Mocktail Frutas Vermelhas',
    tag: '100% Sem Álcool',
    destilado: 'Base Refrescante Zero Álcool',
    descricao: 'Cordial artesanal de morango, amora e framboesa, limão e água gaseificada. Uma opção sofisticada para todas as idades.',
    emoji: '🍓'
  }
];

export default function CartaDrinksSection() {
  const router = useRouter();

  return (
    <section id="coquetelaria" style={{ position: 'relative', zIndex: 10, padding: '48px 20px', maxWidth: 1140, margin: '0 auto' }}>
      {/* Header da Seção */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          A Coquetelaria do Laboratório
        </span>
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
          color: '#FFFFFF',
          margin: '8px 0 12px 0',
          lineHeight: 1.25
        }}>
          Drinks reais, preparados na hora
        </h2>
        <p style={{ fontSize: 'clamp(0.92rem, 2vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: 660, margin: '0 auto' }}>
          Não usamos pós químicos nem xaropes industriais enjoativos. Criamos coquetéis equilibrados com frutas frescas, cordiais da casa e apresentação bonita que valoriza o seu evento.
        </p>
      </div>

      {/* Grid de Drinks da Carta */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 18,
        marginBottom: 36
      }}>
        {DRINKS_CARTA.map((drink, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              transition: 'border-color 0.25s ease, transform 0.25s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(203, 161, 83, 0.12)',
                  color: 'var(--primary)',
                  letterSpacing: '0.04em'
                }}>
                  {drink.tag}
                </span>
                <span style={{ fontSize: '1.4rem' }}>{drink.emoji}</span>
              </div>

              <h3 style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '1.18rem',
                color: '#FFFFFF',
                margin: '0 0 4px 0',
                lineHeight: 1.3
              }}>
                {drink.nome}
              </h3>

              <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>
                Base: {drink.destilado}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                {drink.descricao}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Direto e Elegante */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <button
          onClick={() => router.push('/orcamento')}
          className="btn btn--primary"
          style={{
            padding: '14px 28px',
            fontSize: '0.98rem',
            fontWeight: 700,
            color: '#0a100d',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(203, 161, 83, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          Personalizar carta no orçamento <FiArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
