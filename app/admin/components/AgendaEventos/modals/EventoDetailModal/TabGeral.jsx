import React from 'react';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiPackage, FiHeart, FiPhone } from 'react-icons/fi';

export default function TabGeral({ selectedEvento, cerimonialistas }) {
  const isRealizado = selectedEvento.status === 'realizado';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.2s ease' }}>
      
      {/* Status Badge */}
      <div style={{ textAlign: 'center' }}>
        {isRealizado ? (
          <span style={{ 
            background: 'rgba(0, 229, 255, 0.15)', 
            color: '#00E5FF', 
            border: '1px solid rgba(0, 229, 255, 0.35)', 
            padding: '4px 14px', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            display: 'inline-block' 
          }}>
            🎉 Evento Realizado
          </span>
        ) : (
          <span style={{ 
            background: 'rgba(76, 175, 80, 0.15)', 
            color: '#4CAF50', 
            border: '1px solid rgba(76, 175, 80, 0.35)', 
            padding: '4px 14px', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            display: 'inline-block' 
          }}>
            📅 Evento Confirmado
          </span>
        )}
      </div>

      {/* Botões de Ação Primária */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!isRealizado && (
          <a 
            href={`https://wa.me/55${selectedEvento.telefone ? selectedEvento.telefone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(`Olá, ${selectedEvento.nome}! 🚗💨 A equipe do Laboratório de Drinks já está a caminho do seu evento em ${selectedEvento.cidade || 'seu local'}! Qualquer orientação sobre a chegada, pode nos avisar por aqui. Até logo! 🍸`)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn"
            style={{ background: '#FFD54F', border: 'none', color: '#000', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', minHeight: 44, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 2px 10px rgba(255, 213, 79, 0.2)' }}
          >
            🚗 Avisar: Estou a Caminho
          </a>
        )}

        <a 
          href={`https://wa.me/55${selectedEvento.telefone ? selectedEvento.telefone.replace(/\D/g, '') : ''}`}
          target="_blank" rel="noopener noreferrer"
          className="btn"
          style={{ background: '#25D366', border: 'none', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', minHeight: 44, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem' }}
        >
          <FiPhone size={15} /> Conversar no WhatsApp
        </a>
      </div>

      {/* Grid de Informações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiCalendar size={12} style={{ color: 'var(--primary)' }} /> Data</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            {selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : '—'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiClock size={12} style={{ color: 'var(--primary)' }} /> Horário</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedEvento.horarioEvento || '—'}</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 6 }}><FiMapPin size={12} style={{ color: 'var(--primary)' }} /> Localização & Endereço</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                {[selectedEvento.rua, selectedEvento.numero, selectedEvento.bairro].filter(Boolean).join(', ') || selectedEvento.cidade || '—'}
              </div>
              {selectedEvento.rua && selectedEvento.cidade && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedEvento.cidade}
                </div>
              )}
            </div>
            {(() => {
              const loc = [selectedEvento.rua, selectedEvento.numero, selectedEvento.bairro, selectedEvento.cidade].filter(Boolean).join(', ') || selectedEvento.cidade || selectedEvento.local || '';
              if (!loc) return null;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
              const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(loc)}&navigate=yes`;
              return (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.4)', color: '#4285F4', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none' }}>🗺️ Maps</a>
                  <a href={wazeUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(51, 204, 255, 0.15)', border: '1px solid rgba(51, 204, 255, 0.4)', color: '#33CCFF', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none' }}>🚙 Waze</a>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiUsers size={12} style={{ color: 'var(--primary)' }} /> Convidados</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedEvento.convidados || '—'}</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiPackage size={12} style={{ color: 'var(--primary)' }} /> Pacote</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedEvento.pacote || '—'}</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiHeart size={12} style={{ color: '#E91E63' }} /> Cerimonialista Parceiro</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {selectedEvento.cerimonialista && cerimonialistas[selectedEvento.cerimonialista]
              ? cerimonialistas[selectedEvento.cerimonialista].nome
              : '— Sem parceiro / Direto —'}
          </div>
        </div>
      </div>
    </div>
  );
}
