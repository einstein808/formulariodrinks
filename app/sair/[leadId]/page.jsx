"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ref, update, get } from 'firebase/database';
import { db } from '../../../lib/firebase';

export default function Optout() {
  const { leadId } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading', 'confirm', 'success', 'error', 'not_found'
  const [leadName, setLeadName] = useState('');

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const snapshot = await get(ref(db, `leads/${leadId}`));
        if (snapshot.exists()) {
          setLeadName(snapshot.val().nome || '');
          setStatus('confirm');
        } else {
          setStatus('not_found');
        }
      } catch (err) {
        console.error("Erro ao buscar lead:", err);
        setStatus('error');
      }
    };
    fetchLead();
  }, [leadId]);

  const handleOptout = async () => {
    setStatus('loading');
    try {
      await update(ref(db, `leads/${leadId}`), { optout: true });
      setStatus('success');
    } catch (err) {
      console.error("Erro ao atualizar optout:", err);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg-main)' }}>
      <div style={{ background: 'var(--bg-input)', padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        
        <h1 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: '24px', fontSize: '1.8rem' }}>
          Laboratório de Drinks
        </h1>

        {status === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="btn__spinner" style={{ width: '30px', height: '30px' }} />
          </div>
        )}

        {status === 'not_found' && (
          <div>
            <h2 style={{ color: '#FFF', fontSize: '1.2rem', marginBottom: '16px' }}>Cadastro não encontrado</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Não encontramos um orçamento vinculado a este link.</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 style={{ color: '#F44336', fontSize: '1.2rem', marginBottom: '16px' }}>Ocorreu um erro</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Não foi possível processar sua solicitação no momento. Tente novamente mais tarde.</p>
          </div>
        )}

        {status === 'confirm' && (
          <div>
            <h2 style={{ color: '#FFF', fontSize: '1.2rem', marginBottom: '16px' }}>Olá{leadName ? ` ${leadName}` : ''}!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.5' }}>
              Ao confirmar abaixo, você deixará de receber mensagens automáticas sobre o seu evento pelo nosso sistema.
            </p>
            <button onClick={handleOptout} className="btn btn--primary" style={{ width: '100%', background: '#F44336', borderColor: '#F44336', color: '#FFF' }}>
              Confirmar Descadastro
            </button>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#4CAF50', fontSize: '1.2rem', marginBottom: '16px' }}>Descadastro Concluído</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Você não receberá mais nossos lembretes automáticos.</p>
          </div>
        )}

      </div>
    </div>
  );
}
