"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiChevronLeft, FiArrowRight } from 'react-icons/fi';
import BackgroundEffects from '../../../components/BackgroundEffects';
import PageLoader from '../../../components/PageLoader';

export default function EventoDetalhes() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fallbacks locais para os tipos padrão caso ainda não estejam populados com descrição no Firebase
  const fallbacks = {
    casamento: {
      label: 'Casamento',
      icon: '💍',
      desc: 'O brinde perfeito para o seu grande dia. Desenvolvemos uma carta de drinks sob medida com atendimento de altíssimo padrão, barmen uniformizados e insumos premium. Surpreenda seus convidados com coquetéis clássicos e criações moleculares exclusivas que combinam perfeitamente com a sofisticação da sua festa.',
      image: ''
    },
    aniversario: {
      label: 'Aniversário',
      icon: '🎂',
      desc: 'Celebre a vida com muito estilo e diversão. Nosso serviço de bar para aniversários leva estruturas dinâmicas, barmen animados e um menu de drinks completo que agrada a todas as idades. Das opções mais refrescantes aos drinks tropicais clássicos, criamos a atmosfera perfeita para a sua festa.',
      image: ''
    },
    corporativo: {
      label: 'Corporativo',
      icon: '🏢',
      desc: 'Sofisticação, agilidade e profissionalismo para destacar a sua marca. Oferecemos uma estrutura de bar executivo de alta performance para confraternizações empresariais, lançamento de produtos, feiras e congressos. Um serviço impecável projetado para impressionar seus clientes e colaboradores.',
      image: ''
    },
    formatura: {
      label: 'Formatura',
      icon: '🎓',
      desc: 'A celebração máxima da sua conquista merece um bar inesquecível. Levamos drinks modernos, shots criativos, copos personalizados e muita energia para animar a pista de dança. Projetado especificamente para formandos e seus convidados com alta rotatividade e qualidade impecável.',
      image: ''
    },
    confraternizacao: {
      label: 'Confraternização',
      icon: '🎉',
      desc: 'Reúna amigos, família ou equipe com a melhor experiência de coquetelaria. Oferecemos um serviço sob medida para encontros de final de ano ou festas sazonais, com foco em drinks clássicos, caipirinhas perfeitas e atendimento ágil.',
      image: ''
    },
    'cha-bar': {
      label: 'Chá Bar',
      icon: '🍸',
      desc: 'Comemore seu chá bar com coquetéis personalizados, bar temático interativo e um menu descontraído projetado para integrar e divertir seus convidados antes do grande dia.',
      image: ''
    },
    debutante: {
      label: 'Debutante',
      icon: '👑',
      desc: 'Os 15 anos merecem um bar dos sonhos. Desenvolvemos uma linha exclusiva de coquetéis sem álcool super coloridos, milkshakes gourmets e drinks com efeitos visuais incríveis (alquimia da fumaça e espumas artesanais) para os jovens, além de uma carta clássica premium para os adultos.'
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchEvento = async () => {
      try {
        const snapshot = await get(ref(db, `config/tiposEvento/${id}`));
        if (snapshot.exists()) {
          setEvento({ id, ...snapshot.val() });
        } else if (fallbacks[id]) {
          setEvento({ id, ...fallbacks[id] });
        } else {
          // Se não houver e não estiver nos fallbacks, mostra default
          setEvento({
            id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
            icon: '✨',
            desc: 'Criamos uma estrutura de bar completa com atendimento profissional e coquetéis personalizados para tornar seu evento memorável.'
          });
        }
      } catch (err) {
        console.error("Erro ao carregar evento:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvento();
  }, [id]);

  if (loading) {
    return <PageLoader />;
  }

  const label = evento?.label || 'Evento Especial';
  const icon = evento?.icon || '✨';
  const desc = evento?.desc || 'Estrutura de bar completa para seu evento.';
  const image = evento?.image;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: 120 }}>
      <BackgroundEffects />

      {/* Header Fixo de Navegação */}
      <header style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFF',
            padding: '8px 16px',
            borderRadius: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.9rem',
            transition: 'background 0.2s, border-color 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(203, 161, 83, 0.15)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
        >
          <FiChevronLeft size={16} /> Voltar para o Início
        </button>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>
        {/* Banner de Capa */}
        <div style={{ height: 'clamp(220px, 40vw, 360px)', width: '100%', position: 'relative', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.25)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', marginBottom: 40 }}>
          {image ? (
            <img src={image} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a140d, #1e3322)' }}>
              <span style={{ fontSize: '5rem' }}>{icon}</span>
            </div>
          )}
          {/* Overlay gradiente */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,20,13,1) 0%, rgba(10,20,13,0.4) 60%, transparent 100%)' }} />
          
          {/* Badge flutuante */}
          <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' }}>{icon}</span>
            <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#FFF', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {label}
            </h1>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(203, 161, 83, 0.1)', borderRadius: 20, padding: '32px 24px', backdropFilter: 'blur(10px)', marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--primary)', fontSize: '1.4rem', margin: '0 0 16px 0' }}>
            A Experiência do Barman
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
            {desc}
          </p>
        </div>

        {/* Destaques / Diferenciais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>✨</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#FFF' }}>Drinks Personalizados</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Criamos uma carta exclusiva adaptada ao perfil do seu evento.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🍸</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#FFF' }}>Insumos Premium</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Frutas frescas, xaropes artesanais e bebidas de marcas reconhecidas.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>👔</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#FFF' }}>Equipe Profissional</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Barmen experientes, uniformizados e focados na excelência.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.1), transparent)', border: '1px solid var(--primary)', borderRadius: 24, padding: '40px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFF', fontSize: '1.6rem', margin: '0 0 12px 0' }}>
            Pronto para encantar seus convidados?
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Faça uma simulação rápida de orçamento e personalize a carta de drinks perfeita para seu {label.toLowerCase()}.
          </p>
          <button
            onClick={() => router.push(`/orcamento?tipo=${id}`)}
            className="btn btn--primary"
            style={{ width: 'auto', padding: '14px 32px', display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: '1.05rem', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(203, 161, 83, 0.3)' }}
          >
            Solicitar Orçamento <FiArrowRight size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}
