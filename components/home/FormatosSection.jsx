"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';

const FORMATOS = [
  {
    id: 'mini-wedding',
    badge: 'Casamentos & Mini Weddings',
    titulo: 'Mini Weddings & Casamentos',
    faixa: 'Ideal para 30 a 120 convidados',
    descricao: 'A sofisticação e o encanto que seu casamento merece, com uma carta de drinks equilibrada e custo proporcional ao tamanho da sua celebração.',
    destaques: ['Carta com drinks clássicos e autorais', 'Bar bonito e elegante que compõe a decoração', 'Atendimento atencioso e sem filas']
  },
  {
    id: 'aniversario',
    badge: 'Aniversários & Festas Privadas',
    titulo: 'Aniversários & Festas Privadas',
    faixa: 'Para celebrar de 30 a 150 pessoas',
    descricao: 'Coquetéis preparados na hora que mantêm a festa animada do início ao fim, com opções alcoólicas marcantes e opções sem álcool refrescantes.',
    destaques: ['Drinks refrescantes com frutas frescas', 'Atendimento rápido e equipe simpática', 'Tudo organizado para você curtir sem preocupação']
  },
  {
    id: 'corporativo',
    badge: 'Confraternizações & Empresas',
    titulo: 'Confraternizações & Eventos',
    faixa: 'De 30 a 150 convidados',
    descricao: 'Estrutura compacta, coquetelaria refinada e operação organizada para surpreender seus convidados sem nenhuma dor de cabeça com compras.',
    destaques: ['Drinks bem dosados e de alta saída', 'Bar moderno e funcional sem tomar espaço', 'Você não precisa se preocupar com as compras']
  }
];

export default function FormatosSection() {
  const router = useRouter();

  return (
    <section style={{ position: 'relative', zIndex: 10, padding: '36px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Formatos Sob Medida
        </span>
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.4rem, 4vw, 2.1rem)',
          color: '#FFFFFF',
          margin: '8px 0 12px 0',
          lineHeight: 1.25
        }}>
          O tamanho certo para a sua celebração
        </h2>
        <p style={{ fontSize: 'clamp(0.92rem, 2.1vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Especialistas em eventos pequenos e médios, de 30 a 150 convidados.</strong> Montamos uma operação elegante que se encaixa perfeitamente no seu espaço e no seu orçamento.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: 20
      }}>
        {FORMATOS.map((f) => (
          <div
            key={f.id}
            style={{
              background: 'var(--bg-card)',
              border: f.id === 'mini-wedding' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: f.id === 'mini-wedding' ? '0 8px 30px rgba(203, 161, 83, 0.15)' : 'var(--shadow-md)',
              transition: 'transform 0.25s ease, border-color 0.25s ease'
            }}
          >
            <div>
              {/* Badge */}
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: f.id === 'mini-wedding' ? 'rgba(203, 161, 83, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: f.id === 'mini-wedding' ? 'var(--primary)' : 'var(--text-secondary)'
                }}>
                  {f.badge}
                </span>
              </div>

              {/* Título & Faixa */}
              <h3 style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '1.25rem',
                color: '#FFFFFF',
                margin: '0 0 4px 0',
                lineHeight: 1.3
              }}>
                {f.titulo}
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                {f.faixa}
              </span>

              {/* Descrição */}
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 16px 0' }}>
                {f.descricao}
              </p>

              {/* Destaques */}
              <ul style={{ margin: '0 0 20px 0', paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {f.destaques.map((item, idx) => (
                  <li key={idx} style={{ color: 'var(--text-primary)' }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Botão de ação do card */}
            <button
              onClick={() => router.push('/orcamento')}
              className="btn btn--outline"
              style={{
                width: '100%',
                fontSize: '0.88rem',
                padding: '10px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderColor: f.id === 'mini-wedding' ? 'var(--primary)' : 'var(--border-color)',
                color: f.id === 'mini-wedding' ? 'var(--primary)' : 'var(--text-primary)'
              }}
            >
              Simular para este formato <FiArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
