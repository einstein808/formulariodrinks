"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

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

const DIFERENCIAIS_LAB = [
  { titulo: 'Frutas frescas do dia', desc: 'Nada de polpas congeladas ou pós químicos. Cortamos e preparamos no dia do seu evento.' },
  { titulo: 'Xaropes e cordiais artesanais', desc: 'Preparamos nossas próprias bases e infusões botânicas para garantir um sabor que você não encontra em buffets convencionais.' },
  { titulo: 'Equilíbrio e dosagem precisa', desc: 'Técnica de coquetelaria internacional com dosadores. Seus convidados bebem um coquetel equilibrado do primeiro ao último brinde.' },
  { titulo: 'Atendimento rápido e ágil', desc: 'Estação de bar planejada para preparo simultâneo. Zero filas longas para você curtir a festa.' }
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

      {/* Box de Diferenciação: Por que Laboratório? */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(203, 161, 83, 0.06) 0%, rgba(12, 22, 16, 0.7) 100%)',
        border: '1px solid rgba(203, 161, 83, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(24px, 4vw, 36px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 'clamp(1.15rem, 3.2vw, 1.5rem)',
            color: '#FFFFFF',
            margin: '0 0 8px 0'
          }}>
            O que faz o Laboratório ser diferente de um buffet comum?
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
            Cuidamos de cada detalhe para que seus convidados sintam a diferença no primeiro gole:
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}>
          {DIFERENCIAIS_LAB.map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCheck size={16} /> {item.titulo}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* CTA da Seção */}
        <div style={{ textAlign: 'center' }}>
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
            Calcular orçamento com esses drinks <FiArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
