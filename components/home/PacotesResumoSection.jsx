"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { FiCheck, FiArrowRight } from 'react-icons/fi';

const PACOTES_RESUMO = [
  {
    id: 'mao-de-obra',
    badge: 'Mão de Obra Especializada',
    nome: 'Mão de Obra Especializada',
    tagline: 'Para quem já comprou as bebidas e quer deixar o bar por nossa conta',
    descricao: 'Você adquire as bebidas (com nossa consultoria e lista exata de compras) e nós entramos com os barmen experientes, utensílios completos e total organização.',
    features: [
      'Barmen profissionais uniformizados',
      'Kit completo de coqueteleiras, dosadores e barware',
      'Consultoria e lista exata para você economizar',
      'Até 5 horas de evento com atendimento ágil'
    ],
    destaque: false
  },
  {
    id: 'experimento',
    badge: 'Melhor Custo-Benefício',
    nome: 'Pacote Experimento',
    tagline: 'Para quem quer tranquilidade sem gastar muito',
    descricao: 'O formato clássico com tudo incluso para você não se preocupar com nada no supermercado. 4 opções consagradas de drinks com excelente rotatividade.',
    features: [
      '4 opções de drinks (Caipirinha, Fitzgerald, Mojito e mocktail)',
      'Frutas frescas do dia e insumos inclusos',
      'Equipe completa com bar móvel elegante',
      'Gelo, copos e canudos biodegradáveis'
    ],
    destaque: false
  },
  {
    id: 'laboratorio',
    badge: 'O Mais Escolhido',
    nome: 'Pacote Laboratório',
    tagline: 'O equilíbrio perfeito entre clássico e autoral',
    descricao: 'Ideal para casamentos e grandes comemorações. 5 opções de drinks com apresentações marcantes, xaropes artesanais e coquetéis autorais da casa.',
    features: [
      '5 opções de drinks (inclui Moscow Mule com espuma própria)',
      'Xaropes artesanais e cordiais produzidos por nós',
      'Taças e copos especiais para cada coquetel',
      'Insumos e destilados selecionados'
    ],
    destaque: true
  },
  {
    id: 'reatividade',
    badge: 'Experiência Completa',
    nome: 'Pacote Reatividade',
    tagline: 'Para quem deseja coquetelaria cênica e marcante',
    descricao: 'O menu mais completo para impressionar os paladares mais exigentes, com 6 opções de drinks sofisticados e finalizações aromáticas.',
    features: [
      '6 opções de drinks com botânicos e defumação',
      'Destilados e tônicas selecionadas',
      'Apresentação cênica com taças especiais',
      'Operação ampliada com alta agilidade'
    ],
    destaque: false
  }
];

export default function PacotesResumoSection() {
  const router = useRouter();

  return (
    <section id="pacotes" style={{ position: 'relative', zIndex: 10, padding: '40px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Nossos Formatos
        </span>
        <h2 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: 'clamp(1.4rem, 4vw, 2.1rem)',
          color: '#FFFFFF',
          margin: '8px 0 12px 0',
          lineHeight: 1.25
        }}>
          Escolha como você quer contratar
        </h2>
        <p style={{ fontSize: 'clamp(0.92rem, 2vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto' }}>
          Encontre o formato ideal para sua celebração de 30 a 150 convidados. Desde a mão de obra especializada até o open bar completo.
        </p>
      </div>

      {/* Grid de Pacotes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18,
        alignItems: 'stretch'
      }}>
        {PACOTES_RESUMO.map((pkg) => (
          <div
            key={pkg.id}
            style={{
              background: 'var(--bg-card)',
              border: pkg.destaque ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: pkg.destaque ? '0 8px 30px rgba(203, 161, 83, 0.2)' : 'var(--shadow-md)',
              zIndex: pkg.destaque ? 2 : 1
            }}
          >
            <div>
              {/* Badge */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: pkg.destaque ? 'rgba(203, 161, 83, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                  color: pkg.destaque ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'inline-block'
                }}>
                  {pkg.badge}
                </span>
              </div>

              {/* Nome & Tagline */}
              <h3 style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '1.2rem',
                color: '#FFFFFF',
                margin: '0 0 6px 0',
                lineHeight: 1.3
              }}>
                {pkg.nome}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, margin: '0 0 14px 0', lineHeight: 1.4 }}>
                {pkg.tagline}
              </p>

              {/* Descrição */}
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {pkg.descricao}
              </p>

              {/* Itens inclusos */}
              <ul style={{ margin: '0 0 24px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pkg.features.map((feat, fIdx) => (
                  <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    <FiCheck size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA do card */}
            <button
              onClick={() => router.push(`/orcamento?pacote=${pkg.id}`)}
              className="btn btn--outline"
              style={{
                width: '100%',
                fontSize: '0.88rem',
                padding: '11px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
                borderColor: pkg.destaque ? 'var(--primary)' : undefined,
                color: pkg.destaque ? 'var(--primary)' : undefined,
              }}
            >
              Simular este pacote <FiArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Nota de rodapé da seção */}
      <div style={{
        marginTop: 28,
        textAlign: 'center',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Precisa de um formato personalizado ou quer adicionar chopeira ou máquina de frozen?{' '}
          <strong style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => router.push('/orcamento')}>
            Monte seu orçamento completo online em 1 minuto →
          </strong>
        </p>
      </div>
    </section>
  );
}
