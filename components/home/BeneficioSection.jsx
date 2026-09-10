"use client";
import React from 'react';
import { FiCheck, FiXCircle } from 'react-icons/fi';

export default function BeneficioSection() {
  return (
    <section id="beneficio" style={{ position: 'relative', zIndex: 10, padding: '24px 20px', maxWidth: 840, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(203, 161, 83, 0.08) 0%, rgba(12, 22, 16, 0.6) 100%)',
        border: '1px solid rgba(203, 161, 83, 0.22)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(24px, 5vw, 40px)',
        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45)',
        textAlign: 'center'
      }}>
        {/* Sub-badge */}
        <span style={{
          display: 'inline-block',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 12
        }}>
          A Filosofia do Laboratório
        </span>

        {/* Título Principal */}
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.4rem, 4.2vw, 2.1rem)',
          color: '#FFFFFF',
          margin: '0 0 16px 0',
          lineHeight: 1.25
        }}>
          Você quer um bar bom. <span style={{ color: 'var(--primary)' }}>Não uma conta absurda.</span>
        </h2>

        {/* Texto Manifesto Encurtado e Direto */}
        <p style={{
          fontSize: 'clamp(0.98rem, 2.1vw, 1.12rem)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '640px',
          margin: '0 auto 24px'
        }}>
          Somos <strong style={{ color: 'var(--text-primary)' }}>especialistas em eventos de 30 a 150 convidados</strong>. Você tem coquetelaria de verdade, atendimento rápido e um bar impecável — sem precisar pagar por estruturas pesadas e inflacionadas que não fazem sentido para a sua festa.
        </p>

        {/* Comparativo Prático Rápido */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          textAlign: 'left',
          marginTop: 10
        }}>
          {/* Card O Que Evitamos */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px'
          }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#e57373', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FiXCircle size={16} /> O que você evita:
            </span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>Estruturas gigantes que roubam espaço da pista</li>
              <li>Exigência de contratos mínimos para 200+ pessoas</li>
              <li>Preocupação e estresse comprando insumos no mercado</li>
            </ul>
          </div>

          {/* Card O Que Entregamos */}
          <div style={{
            background: 'rgba(203, 161, 83, 0.05)',
            border: '1px solid rgba(203, 161, 83, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px'
          }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FiCheck size={16} /> O que você ganha com o Laboratório:
            </span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <li><strong>Drinks bem preparados</strong> com frutas frescas e dosagem certa</li>
              <li><strong>Atendimento rápido</strong> e simpático, sem filas no balcão</li>
              <li><strong>Bar bonito e organizado</strong> que valoriza as fotos da festa</li>
              <li><strong>Zero dor de cabeça:</strong> cuidamos de tudo ou te damos a lista exata</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
