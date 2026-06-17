"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, get, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiCheck, FiX, FiCalendar, FiClock, FiMapPin, FiUser, FiAlertTriangle } from 'react-icons/fi';

function EscalaContent() {
  const { leadId } = useParams();
  const searchParams = useSearchParams();
  const helperSlug = searchParams.get('h') || searchParams.get('ajudante');

  const [lead, setLead] = useState(null);
  const [helper, setHelper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [choice, setChoice] = useState(null); // 'confirmado' | 'indisponivel'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!leadId || !helperSlug) {
        setLoading(false);
        return;
      }
      try {
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (leadSnap.exists()) {
          const leadData = leadSnap.val();
          setLead(leadData);
          if (leadData.ajudantes && leadData.ajudantes[helperSlug]) {
            setCurrentStatus(leadData.ajudantes[helperSlug].status);
          }
        }

        const helperSnap = await get(ref(db, `config/ajudantes/${helperSlug}`));
        if (helperSnap.exists()) {
          setHelper(helperSnap.val());
        } else {
          // Se não estiver no cadastro global, tenta usar a informação do lead
          setHelper({ nome: helperSlug.replace(/-/g, ' ') });
        }
      } catch (err) {
        console.error("Erro ao carregar escala:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leadId, helperSlug]);

  const handleChoiceClick = (selectedChoice) => {
    setChoice(selectedChoice);
    setShowConfirmModal(true); // Exibe o modal de confirmação (Dupla Validação)
  };

  const handleConfirmSubmit = async () => {
    if (!leadId || !helperSlug || !choice) return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const path = `leads/${leadId}/ajudantes/${helperSlug}`;
      
      const updateData = {
        status: choice,
      };

      if (choice === 'confirmado') {
        updateData.confirmouEm = now;
      } else {
        updateData.confirmouEm = null;
      }

      await update(ref(db, path), updateData);
      setCurrentStatus(choice);
      setSubmitted(true);
      setShowConfirmModal(false);
    } catch (err) {
      console.error("Erro ao atualizar escala:", err);
      alert("Ocorreu um erro ao salvar sua resposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!lead || !helperSlug) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: '#FFF', textAlign: 'center', padding: 24 }}>
        <FiAlertTriangle size={48} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <h2>Escala ou Link Inválido</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Verifique se o link recebido no WhatsApp está completo.</p>
      </div>
    );
  }

  const dataStr = lead.dataEvento ? lead.dataEvento.split('-').reverse().join('/') : '—';
  const horarioStr = lead.horarioEvento || '—';
  const cidadeStr = lead.cidade || '—';
  const tipoStr = lead.tipoEvento || 'Evento';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: 24 }}>
      <div style={{ maxWidth: 500, width: '100%', background: 'var(--bg-card)', padding: '32px 24px', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        
        <img src="/logo.webp" alt="Logo" style={{ width: 120, marginBottom: 24 }} />

        {!submitted ? (
          <>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: 8, fontSize: '1.4rem' }}>
              Olá, {helper?.nome}!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
              Você está sendo escalado para trabalhar no seguinte evento:
            </p>

            {/* Card com Detalhes do Evento */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                <FiUser style={{ color: 'var(--primary)' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Função</span>
                  <span style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600 }}>{helper?.especialidade || 'Staff'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiCalendar style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Data</span>
                    <span style={{ fontSize: '0.85rem', color: '#FFF', fontWeight: 500 }}>{dataStr}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiClock style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Horário</span>
                    <span style={{ fontSize: '0.85rem', color: '#FFF', fontWeight: 500 }}>{horarioStr}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2', marginTop: 4 }}>
                  <FiMapPin style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Cidade / Local</span>
                    <span style={{ fontSize: '0.85rem', color: '#FFF', fontWeight: 500 }}>{cidadeStr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informar se já respondeu antes */}
            {currentStatus && currentStatus !== 'pendente' && (
              <div style={{ 
                marginBottom: 20, padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem',
                background: currentStatus === 'confirmado' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                border: currentStatus === 'confirmado' ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)',
                color: currentStatus === 'confirmado' ? '#4CAF50' : '#F44336'
              }}>
                Você já respondeu que está <strong>{currentStatus === 'confirmado' ? 'DISPONÍVEL' : 'INDISPONÍVEL'}</strong>. Mas pode alterar sua resposta abaixo se desejar.
              </div>
            )}

            <p style={{ color: '#FFF', fontSize: '0.95rem', fontWeight: 500, marginBottom: 20 }}>
              Você tem disponibilidade para esta data?
            </p>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => handleChoiceClick('confirmado')}
                className="btn"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#4CAF50', borderColor: '#4CAF50', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <FiCheck size={18} /> Sim, Confirmar
              </button>
              <button
                onClick={() => handleChoiceClick('indisponivel')}
                className="btn btn--outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: '#F44336', color: '#F44336', padding: '12px', borderRadius: '8px', background: 'none', cursor: 'pointer' }}
              >
                <FiX size={18} /> Não posso ir
              </button>
            </div>
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease', padding: '16px 0' }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
              background: choice === 'confirmado' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              color: choice === 'confirmado' ? '#4CAF50' : '#F44336'
            }}>
              {choice === 'confirmado' ? <FiCheck size={32} /> : <FiX size={32} />}
            </div>
            
            <h2 style={{ fontFamily: 'Cinzel, serif', color: choice === 'confirmado' ? '#4CAF50' : '#FFF', marginBottom: 16, fontSize: '1.4rem' }}>
              {choice === 'confirmado' ? 'Escalado com Sucesso!' : 'Obrigado por avisar!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {choice === 'confirmado' 
                ? 'Sua presença foi confirmada na escala deste evento. Em breve você receberá os detalhes finais de confirmação.' 
                : 'Confirmamos que você não está disponível para esta data. Te avisaremos nos próximos eventos!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal de Dupla Validação */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: '400px',
            borderRadius: '12px', border: '1px solid var(--border-color)',
            padding: '24px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: 16, fontSize: '1.2rem' }}>
              Confirmar Resposta?
            </h3>
            
            <p style={{ color: '#FFF', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
              {choice === 'confirmado' 
                ? `Você tem certeza que deseja confirmar sua disponibilidade para trabalhar dia ${dataStr}?`
                : `Você tem certeza que deseja recusar a escala para o evento do dia ${dataStr}?`
              }
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="btn btn--primary"
                style={{ 
                  flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  background: choice === 'confirmado' ? '#4CAF50' : '#F44336', 
                  borderColor: choice === 'confirmado' ? '#4CAF50' : '#F44336', 
                  color: 'white', fontWeight: 'bold' 
                }}
              >
                {isSubmitting ? <div className="btn__spinner" /> : 'Confirmar Resposta'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="btn btn--outline"
                style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', borderColor: 'var(--border-color)', background: 'none' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EscalaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    }>
      <EscalaContent />
    </Suspense>
  );
}
