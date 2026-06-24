"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { db } from '../../../lib/firebase';

export default function NPSReview() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);

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

  const handleGoogleClick = async () => {
    if (clicked) return;
    setClicked(true);
    
    try {
      await set(ref(db, `avaliacoes/${leadId}`), {
        leadId,
        nome: lead?.nome || 'Anônimo',
        sobrenome: lead?.sobrenome || '',
        pacote: lead?.pacote || '',
        stars: 5,
        feedback: 'Redirecionado para Google Reviews',
        data: serverTimestamp(),
        aprovadoParaSite: true,
        googleRedirect: true
      });
    } catch (err) {
      console.error("Erro ao registrar clique:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a06' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a06', color: '#FFF', textAlign: 'center', padding: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#cba153' }}>Evento não encontrado.</h2>
          <p style={{ color: '#8c9e8e' }}>Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  const googleLink = config?.googleReviewLink || 'https://g.page/r/CYEiI4om8ooXEBM/review';

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#050a06', 
      color: '#FFF', 
      padding: 24 
    }}>
      <div style={{ 
        maxWidth: 440, 
        width: '100%', 
        textAlign: 'center',
        animation: 'fadeIn 0.6s ease'
      }}>
        
        {/* Logo */}
        <img 
          src="/logo.webp" 
          alt="Logo" 
          style={{ width: 100, marginBottom: 32, opacity: 0.9 }} 
        />

        {/* Greeting */}
        <h1 style={{ 
          fontFamily: 'Cinzel, serif', 
          color: '#cba153', 
          marginBottom: 12, 
          fontSize: '1.6rem',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          Olá, {lead.nome}!
        </h1>
        
        <p style={{ 
          color: '#b0b8a8', 
          marginBottom: 40, 
          fontSize: '1rem', 
          lineHeight: 1.6,
          maxWidth: 360,
          margin: '0 auto 40px auto'
        }}>
          Foi um prazer participar do seu evento! Sua opinião é muito importante para nós. 
          Poderia nos avaliar no Google? Leva menos de 10 segundos.
        </p>

        {/* Google Review CTA */}
        <a
          href={googleLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleGoogleClick}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 12, 
            background: '#FFFFFF', 
            color: '#1a1a1a', 
            border: 'none',
            padding: '16px 32px', 
            borderRadius: 12,
            fontSize: '1rem',
            fontWeight: 700,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
            minHeight: 56,
            width: '100%',
            maxWidth: 340,
            margin: '0 auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.1)';
          }}
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
            alt="Google" 
            style={{ width: 22, height: 22 }} 
          />
          Avaliar no Google
        </a>

        {/* Thank you note */}
        <p style={{ 
          color: '#5a6a5c', 
          fontSize: '0.78rem', 
          marginTop: 32,
          lineHeight: 1.5
        }}>
          Muito obrigado por confiar no nosso trabalho! ✨
        </p>
      </div>
    </div>
  );
}
