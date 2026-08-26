import React from 'react';
import { FiHeart, FiTrendingUp } from 'react-icons/fi';

export default function TabParceiros({
  rankingParceiros = [],
  leadsDiretos = [],
  fechadosDiretos = 0
}) {
  const taxaDireta = leadsDiretos.length > 0 ? Math.round((fechadosDiretos / leadsDiretos.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
      
      {/* ── CARD RESUMO CANAL DIRETO ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '18px 22px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>🌐</span>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Captação Direta (Sem Cerimonialista / Tráfego & Indicação Direta)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Leads que chegaram pelo formulário sem código de parceiro.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{leadsDiretos.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Leads</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50' }}>{fechadosDiretos}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fechados</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{taxaDireta}%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Conversão</div>
          </div>
        </div>
      </div>

      {/* ── RANKING DE CERIMONIALISTAS ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiHeart color="#E91E63" /> Ranking de Cerimonialistas Parceiros
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 20px 0' }}>
          Performance e conversão por profissional parceiro.
        </p>

        {rankingParceiros.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {rankingParceiros.map((parc, idx) => (
              <div
                key={parc.slug}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#FFD54F' : (idx === 1 ? '#ECEFF1' : (idx === 2 ? '#FF8A65' : 'rgba(255,255,255,0.1)')),
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{parc.nome}</strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: parc.conversao >= 50 ? '#4CAF50' : 'var(--primary)', fontWeight: 'bold' }}>
                    {parc.conversao}% conv.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Indicações: <strong>{parc.total}</strong></span>
                  <span>Fechados: <strong style={{ color: '#4CAF50' }}>{parc.fechados}</strong></span>
                </div>

                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, parc.conversao)}%`, background: '#E91E63', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum cerimonialista cadastrado ou com indicações registradas.
          </div>
        )}
      </div>

    </div>
  );
}