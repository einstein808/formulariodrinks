"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { FiChevronDown, FiChevronUp, FiSearch, FiHelpCircle } from 'react-icons/fi';
import BackgroundEffects from '../../components/BackgroundEffects';
import Image from 'next/image';

const FAQS = [
  {
    q: "O que está incluso nos pacotes completos de bar?",
    a: "Nossos pacotes completos incluem bartenders qualificados, insumos premium (frutas da estação frescas, xaropes artesanais, destilados nacionais e importados de acordo com a categoria contratada), gelo especial para drinks, copos adequados (acrílico premium ou vidro opcional) e toda a estrutura física de bar iluminada."
  },
  {
    q: "Vocês trabalham apenas com a mão de obra (sem bebidas)?",
    a: "Sim! Oferecemos a opção de contratação apenas da Mão de Obra. Nesse formato, fornecemos toda a nossa equipe de bartenders, os utensílios de bar profissionais e uma lista de compras detalhada com as quantidades de bebidas e insumos que você precisará adquirir."
  },
  {
    q: "Quantos bartenders são enviados para o meu evento?",
    a: "Nós calculamos o tamanho da equipe com base no número total de convidados para garantir um serviço ágil e sem filas. A regra padrão que seguimos é de aproximadamente 1 bartender para cada 40 a 50 convidados."
  },
  {
    q: "Qual é a duração padrão do serviço e posso estender?",
    a: "A duração padrão do nosso serviço é de 5 horas de festa. Caso necessite de mais tempo, é possível contratar horas adicionais antecipadamente no contrato ou solicitar uma extensão de tempo diretamente com o coordenador do bar no dia do evento."
  },
  {
    q: "Com quanta antecedência a equipe chega no local para montagem?",
    a: "Nossa equipe chega de 1h30 a 2 horas antes do horário programado para o início do bar. Esse tempo garante que toda a estrutura física, cortes de frutas, gelo e utensílios estejam organizados para abrirmos pontualmente."
  },
  {
    q: "Vocês fornecem copos de vidro ou acrílico?",
    a: "Trabalhamos com ambas as opções. Nos pacotes convencionais, oferecemos copos de acrílico premium personalizados (resistentes e elegantes). Como opcional, você pode contratar copos e taças de vidro específicas para cada drink (taças de gin, canecas de cobre para Moscow Mule, etc.)."
  },
  {
    q: "Como funciona a escolha dos drinks do cardápio?",
    a: "Após o fechamento do contrato, o cliente tem acesso ao nosso painel exclusivo onde poderá visualizar e selecionar os drinks do seu evento de acordo com a categoria contratada (Standard, Premium, Frozen, etc.)."
  },
  {
    q: "Quais são as formas de pagamento aceitas?",
    a: "Facilitamos o pagamento por meio de PIX, transferência bancária direta ou parcelamento no cartão de crédito em até 12x (com taxas da operadora). O valor total precisa estar quitado até a semana do evento."
  }
];

export default function PerguntasClient() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState(null);
  const [general, setGeneral] = useState(null);

  useEffect(() => {
    const fetchGeneral = async () => {
      try {
        const configSnap = await get(ref(db, 'config/general'));
        if (configSnap.exists()) {
          setGeneral(configSnap.val());
        }
      } catch (err) {
        console.error("Erro ao carregar configurações gerais:", err);
      }
    };
    fetchGeneral();
  }, []);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = FAQS.filter(
    faq =>
      faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '120px' }}>
      <BackgroundEffects />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '32px 16px 24px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <Image 
          src={general?.logoUrl || "/logo.webp"} 
          alt={`Logo ${general?.companyName || "Laboratório de Drinks"}`} 
          width={100}
          height={100}
          priority
          style={{ width: 'clamp(80px, 20vw, 100px)', height: 'auto', marginBottom: 16, filter: 'drop-shadow(0 0 15px rgba(203, 161, 83, 0.3))' }} 
        />
        <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', color: 'var(--primary)', margin: '0 0 8px 0', textShadow: '0 4px 15px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
          Central de Ajuda
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
          Tire suas dúvidas sobre montagem, pacotes, insumos e atendimento do nosso bar de drinks para eventos.
        </p>

        {/* Barra de Pesquisa */}
        <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto 24px' }}>
          <FiSearch size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
          <input 
            type="text" 
            placeholder="Pesquise por uma dúvida (ex: gelo, copos, horas...)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '44px', borderRadius: '30px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(203, 161, 83, 0.15)', color: '#FFF' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/')}
            className="btn btn--outline" 
            style={{ width: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            ← Voltar ao Início
          </button>
          <button 
            onClick={() => router.push('/orcamento')}
            className="btn btn--primary" 
            style={{ width: 'auto', padding: '8px 24px', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            Solicitar Orçamento
          </button>
        </div>
      </header>

      {/* Lista Accordion */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
        {filteredFaqs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid rgba(203, 161, 83, 0.08)', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    transition: 'all 0.3s'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{ 
                      width: '100%', 
                      background: 'transparent', 
                      border: 'none', 
                      padding: '18px 20px', 
                      textAlign: 'left', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      gap: '16px'
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isOpen ? 'var(--primary)' : '#FFF', transition: 'color 0.2s' }}>
                      {faq.q}
                    </span>
                    {isOpen ? <FiChevronUp size={18} color="var(--primary)" /> : <FiChevronDown size={18} color="var(--text-muted)" />}
                  </button>
                  
                  <div 
                    style={{ 
                      maxHeight: isOpen ? '250px' : '0', 
                      opacity: isOpen ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderTop: isOpen ? '1px solid rgba(203, 161, 83, 0.05)' : 'none'
                    }}
                  >
                    <p style={{ margin: 0, padding: '18px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <FiHelpCircle size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
            <p>Nenhuma dúvida encontrada para "{searchTerm}". Tente pesquisar com termos mais simples.</p>
          </div>
        )}

        {/* Rodapé CTA */}
        <div style={{ textAlign: 'center', marginTop: '64px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(203,161,83,0.08)', padding: '40px 24px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFF', fontSize: '1.3rem', marginBottom: '8px' }}>Não Encontrou sua Resposta?</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px' }}>
            Entre em contato conosco pelo nosso formulário inteligente para receber um orçamento completo ou tirar outras dúvidas específicas.
          </p>
          <button 
            onClick={() => router.push('/orcamento')}
            className="btn btn--primary" 
            style={{ width: 'auto', padding: '12px 32px', fontSize: '0.9rem', fontWeight: 'bold' }}
          >
            Fazer Reserva / Solicitar Orçamento
          </button>
        </div>
      </main>
    </div>
  );
}
