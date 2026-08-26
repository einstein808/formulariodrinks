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
  const [allAjudantes, setAllAjudantes] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [choice, setChoice] = useState(null); // 'confirmado' | 'indisponivel'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!leadId) {
        setLoading(false);
        return;
      }
      try {
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (leadSnap.exists()) {
          const leadData = leadSnap.val();
          setLead(leadData);
          if (helperSlug && leadData.ajudantes && leadData.ajudantes[helperSlug]) {
            const hVal = leadData.ajudantes[helperSlug];
            setCurrentStatus(typeof hVal === 'object' ? hVal.status : hVal);
          }
        }

        const allHelpersSnap = await get(ref(db, 'config/ajudantes'));
        if (allHelpersSnap.exists()) {
          setAllAjudantes(allHelpersSnap.val());
        }

        if (helperSlug) {
          const helperSnap = await get(ref(db, `config/ajudantes/${helperSlug}`));
          if (helperSnap.exists()) {
            setHelper(helperSnap.val());
          } else {
            setHelper({ nome: helperSlug.replace(/-/g, ' ') });
          }
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
    setShowConfirmModal(true);
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

  if (!lead) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: '#FFF', textAlign: 'center', padding: 24 }}>
        <FiAlertTriangle size={48} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <h2>Evento ou Link Não Encontrado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Não encontramos um evento com este identificador.</p>
      </div>
    );
  }

  const dataStr = lead.dataEvento ? lead.dataEvento.split('-').reverse().join('/') : '—';
  const horarioStr = lead.horarioEvento || '—';
  const cidadeStr = [lead.rua, lead.numero, lead.bairro, lead.cidade].filter(Boolean).join(', ') || lead.cidade || '—';
  const tipoStr = lead.tipoEvento || 'Evento';

  // ── VISÃO GERAL DO ADMIN / EQUIPE COMPLETA (SEM HELPER SLUG) ──
  if (!helperSlug) {
    const ajudantesObj = lead.ajudantes || {};
    const ajudantesEntries = Object.entries(ajudantesObj);
    const confirmadosCount = ajudantesEntries.filter(([_, val]) => (typeof val === 'object' ? val.status : val) === 'confirmado').length;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '24px 16px' }}>
        <div style={{ maxWidth: 620, width: '100%', background: 'var(--bg-card)', padding: '32px 24px', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.webp" alt="Logo" style={{ width: 100, marginBottom: 16 }} />
            <h1 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.5rem', margin: '0 0 6px 0' }}>
              Escala da Equipe
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Evento de <strong style={{ color: 'var(--text-primary)' }}>{lead.nome} {lead.sobrenome || ''}</strong>
            </div>
          </div>

          {/* Card com Detalhes do Evento */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiCalendar style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Data</span>
                  <span style={{ fontSize: '0.88rem', color: '#FFF', fontWeight: 'bold' }}>{dataStr}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiClock style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Horário</span>
                  <span style={{ fontSize: '0.88rem', color: '#FFF', fontWeight: 'bold' }}>{horarioStr}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                <FiMapPin style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Local / Endereço</span>
                  <span style={{ fontSize: '0.88rem', color: '#FFF', fontWeight: 500 }}>{cidadeStr}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Roster de Membros da Equipe */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiUser style={{ color: 'var(--primary)' }} /> Membros Escalados ({ajudantesEntries.length})
              </h3>
              <span style={{ fontSize: '0.75rem', background: 'rgba(76,175,80,0.15)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                {confirmadosCount} de {ajudantesEntries.length} confirmados
              </span>
            </div>

            {ajudantesEntries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ajudantesEntries.map(([slug, statusVal]) => {
                  const helperInfo = allAjudantes[slug];
                  const helperStatus = typeof statusVal === 'object' && statusVal !== null
                    ? (statusVal.status || 'pendente')
                    : (statusVal || 'pendente');
                  const isConfirmed = helperStatus === 'confirmado';
                  const isRefused = helperStatus === 'recusado' || helperStatus === 'indisponivel';
                  const nomeHelper = helperInfo?.nome || slug.replace(/-/g, ' ');
                  const especialidade = helperInfo?.especialidade || 'Barman / Staff';
                  const telHelper = helperInfo?.telefone;

                  return (
                    <div key={slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {nomeHelper}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {especialidade} {telHelper ? `· ${telHelper}` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          padding: '4px 10px', 
                          borderRadius: '12px',
                          background: isConfirmed ? 'rgba(76, 175, 80, 0.15)' : (isRefused ? 'rgba(244, 67, 54, 0.15)' : 'rgba(203, 161, 83, 0.15)'),
                          color: isConfirmed ? '#4CAF50' : (isRefused ? '#F44336' : '#FFD54F'),
                          border: `1px solid ${isConfirmed ? 'rgba(76, 175, 80, 0.3)' : (isRefused ? 'rgba(244, 67, 54, 0.3)' : 'rgba(203, 161, 83, 0.3)')}`
                        }}>
                          {isConfirmed ? '✅ Confirmado' : (isRefused ? '❌ Indisponível' : '⏳ Pendente')}
                        </span>

                        {telHelper && (
                          <a
                            href={`https://wa.me/55${telHelper.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${nomeHelper}! Sobre sua escala para o evento do dia ${dataStr}...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25D366',
                              color: '#FFF',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Conversar no WhatsApp"
                          >
                            💬
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum membro da equipe foi adicionado à escala deste evento ainda.
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <a 
              href="/admin" 
              style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              ← Voltar ao Painel Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── VISÃO INDIVIDUAL DO AJUDANTE (COM HELPER SLUG) ──
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
