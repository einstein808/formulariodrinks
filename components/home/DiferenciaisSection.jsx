"use client";
import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

const PILARES = [
  {
    num: '01',
    titulo: 'Drinks de verdade',
    desc: 'Receitas bem executadas com frutas frescas, xaropes artesanais e dosagens corretas. Nada de pozinho artificial ou ingredientes de baixa qualidade.'
  },
  {
    num: '02',
    titulo: 'Um bar que respeita seu orçamento',
    desc: 'Você escolhe o formato: desde contratar apenas os barmen profissionais (caso já tenha comprado bebidas) até o serviço completo com todos os insumos inclusos.'
  },
  {
    num: '03',
    titulo: 'Atendimento atencioso e pontual',
    desc: 'Nossa equipe chega com antecedência para a montagem, atende seus convidados com simpatia e mantém o balcão sempre limpo para você curtir a festa sem estresse.'
  },
  {
    num: '04',
    titulo: 'Estrutura funcional e bem apresentada',
    desc: 'Um bar móvel moderno e elegante que valoriza o visual do evento e as fotos dos seus convidados, sem ocupar espaço excessivo ou atrapalhar a circulação.'
  },
  {
    num: '05',
    titulo: 'Preço claro desde o início',
    desc: 'Você sabe exatamente o que está incluso: horas de serviço, copos e insumos. Sem taxas surpresa ou cobranças extras após a festa.'
  }
];

export default function DiferenciaisSection() {
  return (
    <section style={{ position: 'relative', zIndex: 10, padding: '40px 20px', maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Por Que Contratar o Laboratório?
        </span>
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.4rem, 4vw, 2.1rem)',
          color: '#FFFFFF',
          margin: '8px 0 12px 0',
          lineHeight: 1.25
        }}>
          Qualidade sem complicação para a sua festa
        </h2>
        <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          Não usamos termos vazios nem promessas mirabolantes. Entregamos aquilo que realmente importa para fazer seu evento ser inesquecível.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {PILARES.map((p) => (
          <div
            key={p.num}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'border-color 0.2s ease'
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <span style={{
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'rgba(203, 161, 83, 0.1)',
                padding: '2px 8px',
                borderRadius: 4
              }}>
                {p.num}
              </span>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '1.08rem',
              color: '#FFFFFF',
              margin: '2px 0 0',
              lineHeight: 1.3
            }}>
              {p.titulo}
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
