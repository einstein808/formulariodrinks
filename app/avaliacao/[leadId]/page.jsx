"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiStar, FiCheck, FiSend } from 'react-icons/fi';

export default function NPSReview() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leadSnap = await get(ref(db, `leads/${leadId}`));
        if (leadSnap.exists()) {
          setLead(leadSnap.val());
        }
        
        const configSnap = await get(ref(db, 'config/general'));
        if (configSnap.exists()) {
          setConfig(configSnap.val());
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leadId]);

  const handleRatingClick = async (selectedRating) => {
    setRating(selectedRating);
    
    // Se for 4 ou 5 estrelas, dispara confetes e salva logo
    if (selectedRating >= 4) {
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default || confettiModule;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#CBA153', '#00E5FF', '#FFFFFF']
        });
      });
      
      await saveReview(selectedRating, '');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (rating > 0 && rating < 4) {
      await saveReview(rating, feedback);
    }
  };

  const saveReview = async (stars, text) => {
    setIsSubmitting(true);
    try {
      await set(ref(db, `avaliacoes/${leadId}`), {
        leadId,
        nome: lead?.nome || 'Anônimo',
        sobrenome: lead?.sobrenome || '',
        pacote: lead?.pacote || '',
        stars,
        feedback: text,
        data: serverTimestamp(),
        aprovadoParaSite: stars >= 4 // auto aprova os bons
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Erro ao salvar avaliação:", err);
      alert("Ocorreu um erro. Tente novamente.");
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: '#FFF', textAlign: 'center', padding: 24 }}>
        <h2>Evento não encontrado.</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Verifique se o link está correto.</p>
      </div>
    );
  }

  const googleLink = config?.googleReviewLink || '#';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: 24 }}>
      <div style={{ maxWidth: 500, width: '100%', background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        
        <img src="/logo.webp" alt="Logo" style={{ width: 120, marginBottom: 24 }} />

        {!submitted ? (
          <>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: 8, fontSize: '1.5rem' }}>
              Olá, {lead.nome}!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1rem', lineHeight: 1.5 }}>
              Foi um prazer fazer parte do seu evento. Como você avaliaria a sua experiência com o nosso bar?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    transition: 'transform 0.2s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                >
                  <FiStar
                    size={40}
                    fill={(hoverRating || rating) >= star ? '#FFC107' : 'transparent'}
                    color={(hoverRating || rating) >= star ? '#FFC107' : 'var(--text-muted)'}
                    style={{ transition: 'all 0.2s' }}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && rating < 4 && (
              <div style={{ animation: 'fadeIn 0.5s ease', textAlign: 'left' }}>
                <label className="form-label">O que poderíamos ter feito melhor?</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Sua opinião é muito importante para nós..."
                  style={{ resize: 'vertical', marginBottom: 16 }}
                />
                <button
                  className={`btn btn--primary ${isSubmitting ? 'btn--loading' : ''}`}
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmitting || !feedback.trim()}
                  style={{ width: '100%' }}
                >
                  {isSubmitting ? <div className="btn__spinner" /> : <><FiSend /> Enviar Feedback</>}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <FiCheck size={32} />
            </div>
            
            {rating >= 4 ? (
              <>
                <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: 16, fontSize: '1.5rem' }}>
                  Ficamos muito felizes!
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1rem', lineHeight: 1.5 }}>
                  Você poderia compartilhar essa mesma avaliação no nosso Google? Demora menos de 10 segundos e nos ajuda muito a crescer!
                </p>
                <a
                  href={googleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FFF', color: '#000', borderColor: '#FFF' }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: 20 }} />
                  Avaliar no Google
                </a>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Cinzel, serif', color: '#FFF', marginBottom: 16, fontSize: '1.5rem' }}>
                  Obrigado pelo feedback!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                  Nossa equipe vai analisar seus comentários com atenção para melhorar nossos serviços. Pedimos desculpas se algo não saiu como o esperado.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
