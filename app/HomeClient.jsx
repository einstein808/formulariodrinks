"use client";
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { useRouter } from 'next/navigation';

import BackgroundEffects from '../components/BackgroundEffects';
import HeroSection from '../components/home/HeroSection';
import BeneficioSection from '../components/home/BeneficioSection';
import FormatosSection from '../components/home/FormatosSection';
import CartaDrinksSection from '../components/home/CartaDrinksSection';
import DiferenciaisSection from '../components/home/DiferenciaisSection';
import PacotesResumoSection from '../components/home/PacotesResumoSection';
import GaleriaSection from '../components/home/GaleriaSection';
import AvaliacoesSection from '../components/home/AvaliacoesSection';
import ParceirosBanner from '../components/home/ParceirosBanner';
import EventoModal from '../components/home/EventoModal';
import Navbar from '../components/home/Navbar';

export default function HomeClient() {
  const [general, setGeneral] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventoAberto, setEventoAberto] = useState(null);
  const [midiaAtual, setMidiaAtual] = useState(0);
  const [verTodosEventos, setVerTodosEventos] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const configData = configSnap.val();
          if (configData.general) {
            setGeneral(configData.general);
          }
          if (configData.galeriaEventos) {
            const galeriaArray = Object.entries(configData.galeriaEventos)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => {
                if (a.data && b.data) return new Date(b.data) - new Date(a.data);
                return (a.order ?? 0) - (b.order ?? 0);
              });
            setGaleria(galeriaArray);
          }
        }

        const avaliacoesSnap = await get(ref(db, 'avaliacoes'));
        if (avaliacoesSnap.exists()) {
          const avaArray = Object.entries(avaliacoesSnap.val())
            .map(([id, val]) => ({ id, ...val }))
            .filter(a => a.stars >= 4 && (Boolean(a.printUrl) || (a.feedback && a.feedback !== 'Redirecionado para Google Reviews')));
          
          avaArray.sort((a, b) => {
            if (a.printUrl && !b.printUrl) return -1;
            if (!a.printUrl && b.printUrl) return 1;
            if (a.destacado && !b.destacado) return -1;
            if (!a.destacado && b.destacado) return 1;
            return 0;
          });

          setAvaliacoes(avaArray);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do portfólio:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (eventoAberto) {
        setEventoAberto(null);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [eventoAberto]);

  const abrirEvento = (evento) => {
    setEventoAberto(evento);
    setMidiaAtual(0);
    document.body.style.overflow = 'hidden';
    window.history.pushState({ modalOpen: true }, '');
  };

  const fecharEvento = () => {
    setEventoAberto(null);
    document.body.style.overflow = '';
    if (window.history.state?.modalOpen) {
      window.history.back();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [ano, mes, dia] = dateStr.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`;
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: 60 }}>
      <BackgroundEffects />

      {/* Navbar fixa */}
      <Navbar general={general} />

      {/* 1. Header / Hero */}
      {/* hero-offset: no desktop compensa navbar top (56px), no mobile zero (barra fica embaixo) */}
      <style>{`
        .hero-offset { padding-top: 56px; }
        @media (max-width: 767px) { .hero-offset { padding-top: 0; } }
        main { padding-bottom: 60px !important; }
        @media (min-width: 768px) { main { padding-bottom: 20px !important; } }
      `}</style>
      <div className="hero-offset">
        <HeroSection general={general} />
      </div>

      {/* 2. Manifesto do Benefício: "Bar bom, não conta absurda" */}
      <BeneficioSection />

      {/* 3. Formatos em Destaque: Mini Wedding, Aniversários, Corporativo */}
      <FormatosSection />

      {/* 4. A Coquetelaria do Laboratório: Drinks Reais e Preparos Artesanais */}
      <CartaDrinksSection />

      {/* 5. Diferenciais Racionais: 5 Pilares */}
      <DiferenciaisSection />

      {/* 6. Comparativo Descomplicado de Formatos / Pacotes */}
      <PacotesResumoSection />

      {/* 6. Galeria de Eventos Realizados (Prova Visual) */}
      <GaleriaSection
        galeria={galeria}
        loading={loading}
        verTodosEventos={verTodosEventos}
        setVerTodosEventos={setVerTodosEventos}
        abrirEvento={abrirEvento}
        formatDate={formatDate}
      />

      {/* 7. Depoimentos Reais (Google Reviews & WhatsApp) */}
      <AvaliacoesSection
        avaliacoes={avaliacoes}
        general={general}
        loading={loading}
      />

      {/* 8. Banner Guia de Parceiros */}
      <ParceirosBanner />



      {/* 6. Modal Carrossel de Evento */}
      <EventoModal
        evento={eventoAberto}
        midiaAtual={midiaAtual}
        setMidiaAtual={setMidiaAtual}
        onClose={fecharEvento}
        formatDate={formatDate}
      />
      
      {/* Global Scoped Keyframes for Ken Burns & Shimmer */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(203,161,83,0.18) 50%, rgba(255,255,255,0.04) 80%) !important;
          background-size: 200% 100% !important;
          animation: shimmer 1.6s ease-in-out infinite !important;
        }
        .skeleton-card {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .galeria-nav-btn:hover { background: rgba(203, 161, 83, 0.3) !important; }

        .galeria-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        @media (max-width: 600px) {
          .galeria-grid { grid-template-columns: 1fr; gap: 16px; }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .galeria-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .ken-burns {
          will-change: transform;
          animation-duration: 6s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }
        .ken-burns.kb-0 { animation-name: kb-zoom-tl; }
        .ken-burns.kb-1 { animation-name: kb-zoom-br; }
        .ken-burns.kb-2 { animation-name: kb-zoom-tr; }
        .ken-burns.kb-3 { animation-name: kb-zoom-bl; }

        @keyframes kb-zoom-tl {
          0%   { transform: scale(1) translateX(0) translateY(0); }
          100% { transform: scale(1.12) translateX(-2%) translateY(-2%); }
        }
        @keyframes kb-zoom-br {
          0%   { transform: scale(1) translateX(0) translateY(0); }
          100% { transform: scale(1.12) translateX(2%) translateY(2%); }
        }
        @keyframes kb-zoom-tr {
          0%   { transform: scale(1) translateX(0) translateY(0); }
          100% { transform: scale(1.12) translateX(2%) translateY(-2%); }
        }
        @keyframes kb-zoom-bl {
          0%   { transform: scale(1) translateX(0) translateY(0); }
          100% { transform: scale(1.12) translateX(-2%) translateY(2%); }
        }
      `}</style>
    </main>
  );
}
