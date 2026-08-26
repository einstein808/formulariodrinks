import React from 'react';
import { FiCalendar, FiMapPin, FiHeart, FiPhone } from 'react-icons/fi';
import { COLUMNS } from '@/lib/constants';
import { getFinanceStatusHelper, hasCustosLancados, getLeadStatusHelper } from '../filters';

export default function LeadCard({
  lead,
  isMobile,
  cerimonialistas,
  onSelectLead,
  onStatusChange,
  onToggleAbGroup
}) {
  const { isStale, followUpCount } = getLeadStatusHelper(lead);
  const isFrozenLead = followUpCount >= 3;
  const fin = getFinanceStatusHelper(lead);
  const semCustos = (lead.status === 'fechado' || lead.status === 'realizado') && !hasCustosLancados(lead);

  return (
    <div 
      draggable={!isMobile}
      onDragStart={(e) => {
        if (isMobile) return;
        e.dataTransfer.setData('text/plain', lead.id);
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onClick={() => onSelectLead(lead)}
      style={{
        background: 'var(--bg-card)',
        padding: '16px',
        borderRadius: '14px',
        cursor: isMobile ? 'pointer' : 'grab', 
        border: isFrozenLead 
          ? '1px solid rgba(0, 229, 255, 0.45)' 
          : (isStale ? '1px solid rgba(244, 67, 54, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)'),
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative'
      }}
    >
      {/* HEADER DO CARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
        <div>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'block', lineHeight: 1.3 }}>
            {lead.nome} {lead.sobrenome}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            {lead.telefone ? lead.telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') : 'Sem telefone'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleAbGroup(lead.id, lead.abGroup); }}
            title="Alternar entre Grupo A (Por Convidado) e Grupo B (Preço Fixo)"
            style={{
              fontSize: '0.68rem',
              fontWeight: 'bold',
              padding: '3px 7px',
              borderRadius: '6px',
              background: lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
              color: lead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
              border: `1px solid ${lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`,
              cursor: 'pointer'
            }}
          >
            {lead.abGroup === 'B' ? '🧪 B' : '🅰️ A'}
          </button>
          {isFrozenLead ? (
            <span style={{ fontSize: '0.7rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>❄️ Esfriou</span>
          ) : (
            isStale && <span style={{ fontSize: '0.7rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>🔥 Esfriando</span>
          )}
        </div>
      </div>

      {/* METADADOS DO EVENTO */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FiCalendar size={13} style={{ color: 'var(--primary)' }} />
          <span>{lead.dataEvento ? lead.dataEvento.split('-').reverse().join('/') : 'Data a definir'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FiMapPin size={13} style={{ color: 'var(--primary)' }} />
          <span>{lead.cidade || 'Cidade não inf.'}</span>
        </div>
      </div>
      
      {/* BADGES (Pacote, Financeiro, Convidados) */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', background: 'rgba(203, 161, 83, 0.14)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '0.2px' }}>
          {lead.pacote || 'Sem pacote'}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: fin.color, background: fin.bg, padding: '3px 7px', borderRadius: '6px', fontWeight: 'bold' }}>
            {fin.label}
          </span>
          {semCustos && (
            <span style={{ fontSize: '0.7rem', color: '#FF9800', background: 'rgba(255, 152, 0, 0.15)', border: '1px solid rgba(255, 152, 0, 0.35)', padding: '3px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
              ⚠️ Custos
            </span>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            👥 {lead.convidados || 0}
          </span>
        </div>
      </div>

      {/* BADGE CERIMONIALISTA */}
      {lead.cerimonialista && cerimonialistas && cerimonialistas[lead.cerimonialista] && (
        <div style={{
          marginTop: 10, fontSize: '0.74rem', color: '#E91E63',
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(233,30,99,0.08)', padding: '4px 10px',
          borderRadius: 6, fontWeight: '600'
        }}>
          <FiHeart size={11} /> {cerimonialistas[lead.cerimonialista].nome}
        </div>
      )}

      {/* BOTÃO RÁPIDO DO WHATSAPP */}
      {lead.telefone && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <a
            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#25D366',
              color: '#FFF',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              textDecoration: 'none',
              minHeight: '38px',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
            }}
          >
            <FiPhone size={14} /> WhatsApp
          </a>
          <a
            href={`tel:${lead.telefone.replace(/\D/g, '')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: '1px solid var(--border-color)',
              minHeight: '38px'
            }}
            title="Ligar para o cliente"
          >
            📞
          </a>
        </div>
      )}

      {/* SELETOR RÁPIDO DE STATUS NO MOBILE */}
      {isMobile && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Etapa:
            </span>
            <select
              value={lead.status || 'novo'}
              onChange={(e) => onStatusChange(lead.id, e.target.value)}
              className="form-select"
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '0.82rem',
                background: 'var(--bg-main)',
                color: 'var(--primary)',
                fontWeight: '600',
                border: '1px solid rgba(203, 161, 83, 0.25)',
                borderRadius: '8px',
                minHeight: '38px'
              }}
            >
              {COLUMNS.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
