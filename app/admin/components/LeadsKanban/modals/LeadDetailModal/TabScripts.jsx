import React from 'react';
import { FiPhone, FiFileText } from 'react-icons/fi';

export default function TabScripts({
  selectedLead,
  sendingScript,
  handleResendQuote,
  handleSendEvolution
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
      
      {/* WhatsApp actions */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px', border: 'none' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
          Disparador de Mensagens
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Reenviar Orçamento */}
          <button 
            onClick={() => handleResendQuote(selectedLead)}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: '#000', background: 'var(--primary)', 
              border: '1px solid var(--primary)', cursor: sendingScript ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
              borderRadius: '8px', minHeight: 46
            }}
          >
            <FiPhone size={14} /> Reenviar PDF de Orçamento (Completo)
          </button>

          {/* Enviar Contrato */}
          <button 
            onClick={() => handleSendEvolution('contrato')}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: '#000', background: 'var(--primary)', 
              border: '1px solid var(--primary)', cursor: sendingScript ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
              borderRadius: '8px', minHeight: 46
            }}
          >
            <FiFileText size={14} /> Enviar Contrato via WhatsApp
          </button>

          {/* Script 1: Autoridade */}
          <button 
            onClick={() => handleSendEvolution('autoridade')}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
              background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
              borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
            }}
          >
            <span style={{ color: '#00E5FF', marginRight: '8px', fontWeight: 'bold' }}>📸 1. Autoridade:</span>
            Disparo de imagens/portfólio cadastrado.
          </button>

          {/* Script 2: Escassez */}
          <button 
            onClick={() => handleSendEvolution('escassez')}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
              background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
              borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
            }}
          >
            <span style={{ color: '#F44336', marginRight: '8px', fontWeight: 'bold' }}>🔥 2. Escassez:</span>
            Disparo de aviso de bloqueio de data/escassez.
          </button>

          {/* Script 3: Pós-Evento */}
          <button 
            onClick={() => handleSendEvolution('posEvento')}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
              background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
              borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
            }}
          >
            <span style={{ color: '#4CAF50', marginRight: '8px', fontWeight: 'bold' }}>⭐ 3. NPS / Pós:</span>
            Mensagem pós-evento (feedback/avaliação).
          </button>

          {/* Script 4: Estou a Caminho */}
          <button 
            onClick={() => handleSendEvolution('aCaminho')}
            disabled={sendingScript}
            style={{ 
              textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
              color: '#000', border: '1px solid #FFD54F', 
              background: '#FFD54F', cursor: sendingScript ? 'not-allowed' : 'pointer',
              borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46,
              fontWeight: 'bold', boxShadow: '0 2px 10px rgba(255, 213, 79, 0.2)'
            }}
          >
            <span style={{ marginRight: '8px' }}>🚗</span>
            4. Estou a Caminho (Avisar Saída da Equipe)
          </button>
        </div>
      </div>

      {/* Message history */}
      {selectedLead.messages && (
        <div style={{ background: 'rgba(0, 229, 255, 0.04)', borderRadius: '12px', padding: '18px', border: 'none', borderLeft: '4px solid #00E5FF' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#00E5FF', borderBottom: '1px solid rgba(0, 229, 255, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
            📋 Histórico de Envios
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {Object.entries(selectedLead.messages)
              .map(([id, msg]) => ({ id, ...msg }))
              .sort((a, b) => {
                const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
                const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
                return timeB - timeA;
              })
              .map(msg => {
                const typeLabels = {
                  'orcamento': '💰 Orçamento',
                  'script_autoridade': '📸 Autoridade',
                  'script_escassez': '🔥 Escassez',
                  'script_posEvento': '⭐ NPS Pós',
                  'script_contrato': '📄 Contrato',
                  'lista_compras': '🛒 Lista Compras',
                  'notif_cerimonialista': '💌 Cerimonialista',
                };
                const label = typeLabels[msg.type] || msg.type;
                const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

                return (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem',
                    background: msg.success ? 'rgba(76, 175, 80, 0.06)' : 'rgba(244, 67, 54, 0.06)',
                    border: `1px solid ${msg.success ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: msg.success ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                        {msg.success ? '✓' : '✗'}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {msg.error && (
                        <span title={msg.error} style={{ fontSize: '0.72rem', color: '#F44336', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.error}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {dateStr}
                      </span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
