import React from 'react';
import { FiUsers, FiPhone, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { formatPhone } from '@/lib/utils';

export default function TabEquipe({
  selectedLead,
  ajudantes,
  checkHelperOverlap,
  handleAddHelperToLead,
  handleRemoveHelperFromLead,
  handleUpdateHelperStatus,
  handleSendHelperAvailabilityCheck,
  handleSendHelperFinalConfirmation,
  handleSendEvolution,
  sendingScript,
  showToast
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiUsers style={{ color: 'var(--primary)' }} /> Equipe do Evento
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => handleSendEvolution('aCaminho')}
              disabled={sendingScript}
              title="Disparar aviso para o cliente avisando que a equipe já partiu para o local"
              style={{ 
                padding: '6px 14px', 
                fontSize: '0.78rem', 
                height: 'auto', 
                background: '#FFD54F', 
                border: 'none', 
                color: '#000', 
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: sendingScript ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🚗 Avisar: Estou a Caminho
            </button>
            {selectedLead.ajudantes && Object.values(selectedLead.ajudantes).some(a => (typeof a === 'object' ? a.status : a) === 'confirmado') && (
              <button
                onClick={handleSendHelperFinalConfirmation}
                disabled={sendingScript}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  height: 'auto', 
                  background: '#4CAF50', 
                  border: 'none', 
                  color: '#000', 
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Confirmar Evento c/ Equipe
              </button>
            )}
          </div>
        </div>

        {/* Add Helper Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <select
            id="add-helper-select"
            className="form-select"
            style={{ 
              marginTop: 0, 
              flex: 1, 
              background: 'var(--bg-input)', 
              borderColor: 'rgba(203, 161, 83, 0.15)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              height: '40px'
            }}
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const overlap = checkHelperOverlap(val);
                if (overlap) {
                  showToast(`Atenção: Este ajudante já está escalado no mesmo dia em: ${overlap}`, 'warning');
                }
                handleAddHelperToLead(val);
                e.target.value = "";
              }
            }}
          >
            <option value="">+ Adicionar Ajudante à Equipe</option>
            {Object.entries(ajudantes || {})
              .filter(([slug]) => !selectedLead.ajudantes || !selectedLead.ajudantes[slug])
              .map(([slug, a]) => {
                const overlap = checkHelperOverlap(slug);
                return (
                  <option key={slug} value={slug}>
                    {a.nome} ({a.especialidade}) {overlap ? '⚠️ (Escalado)' : ''}
                  </option>
                );
              })}
          </select>
        </div>

        {/* Helpers List */}
        {(!selectedLead.ajudantes || Object.keys(selectedLead.ajudantes).length === 0) ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', border: '1px dashed rgba(203, 161, 83, 0.1)', borderRadius: '8px' }}>
            Nenhum ajudante escalado para este evento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(selectedLead.ajudantes).map(([slug, data]) => {
              const helperInfo = (ajudantes && ajudantes[slug]) || { nome: slug, telefone: '', displayName: slug, especialidade: 'Ajudante' };
              const overlap = checkHelperOverlap(slug);
              const helperData = typeof data === 'object' && data !== null ? data : { status: data };
              const helperStatus = helperData.status || 'pendente';
              
              return (
                <div key={slug} style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                        {helperInfo.nome}
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'rgba(203, 161, 83, 0.08)', border: '1px solid rgba(203, 161, 83, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                          {helperInfo.especialidade}
                        </span>
                      </div>
                      {helperInfo.telefone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          📞 {formatPhone(helperInfo.telefone)}
                        </div>
                      )}
                      {overlap && (
                        <div style={{ fontSize: '0.72rem', color: '#FF9800', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ Escalado em: {overlap}
                        </div>
                      )}
                    </div>
                    
                    {/* Badges de Status */}
                    <div>
                      {helperStatus === 'confirmado' && (
                        <span style={{ background: 'rgba(46, 139, 87, 0.12)', color: '#4CAF50', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          ✅ Confirmado
                        </span>
                      )}
                      {(helperStatus === 'indisponivel' || helperStatus === 'recusado') && (
                        <span style={{ background: 'rgba(139, 0, 0, 0.12)', color: '#F44336', border: '1px solid rgba(244, 67, 54, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          ❌ {helperStatus === 'indisponivel' ? 'Indisponível' : 'Recusado'}
                        </span>
                      )}
                      {helperStatus === 'pendente' && (
                        <span style={{ background: 'rgba(203, 161, 83, 0.12)', color: '#FFD54F', border: '1px solid rgba(255, 213, 79, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          ⏳ Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions for helper */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleSendHelperAvailabilityCheck(slug, helperInfo)}
                        disabled={sendingScript || !helperInfo.telefone}
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '0.72rem', 
                          height: 'auto', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          background: 'rgba(203, 161, 83, 0.05)',
                          border: '1px solid rgba(203, 161, 83, 0.2)',
                          color: 'var(--primary)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Perguntar disponibilidade via WhatsApp"
                      >
                        <FiPhone size={10} /> {helperData.perguntouEm ? 'Reenviar Pergunta' : 'Perguntar'}
                      </button>
                      
                      {helperData.perguntouEm && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          Perguntou: {new Date(helperData.perguntouEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleUpdateHelperStatus(slug, 'confirmado')}
                        style={{ 
                          background: helperStatus === 'confirmado' ? 'rgba(76,175,80,0.15)' : 'none', 
                          border: '1px solid #4CAF50', 
                          color: '#4CAF50', 
                          cursor: 'pointer', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 'bold', 
                          minHeight: 30 
                        }}
                      >
                        <FiCheck size={12} /> Confirmado
                      </button>
                      <button
                        onClick={() => handleUpdateHelperStatus(slug, 'indisponivel')}
                        style={{ 
                          background: (helperStatus === 'indisponivel' || helperStatus === 'recusado') ? 'rgba(244,67,54,0.15)' : 'none', 
                          border: '1px solid #F44336', 
                          color: '#F44336', 
                          cursor: 'pointer', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 'bold', 
                          minHeight: 30 
                        }}
                      >
                        <FiX size={12} /> Indisponível
                      </button>
                      <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }} />
                      <button
                        onClick={() => handleRemoveHelperFromLead(slug)}
                        style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '4px' }}
                        title="Remover da equipe"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
