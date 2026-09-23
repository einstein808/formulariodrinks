"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { 
  FiUser, FiPhone, FiInstagram, FiMapPin, FiBriefcase, FiDollarSign, 
  FiCalendar, FiTruck, FiCheckCircle, FiAlertCircle, FiSearch, FiCheck, FiArrowRight 
} from 'react-icons/fi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBIlY1_e2_I1Qro82_WTwJH0s3s36J_36o';

const FUNCOES = [
  { id: 'Bartender', label: 'Bartender / Coqueteleiro' },
  { id: 'Barback', label: 'Barback (Auxiliar de Bar)' },
  { id: 'Coordenador', label: 'Chefe de Bar / Coordenador' },
  { id: 'Garcom', label: 'Garçom de Apoio' },
  { id: 'Copeiro', label: 'Copeiro / Lavagem e Higienização' },
  { id: 'Outro', label: 'Outro' }
];

const DIAS_SEMANA = [
  'Sexta-feira',
  'Sábado',
  'Domingo',
  'Feriados e Vésperas',
  'Meio de semana (Segunda a Quinta)'
];

const OPCOES_TRANSPORTE = [
  'Moto própria',
  'Carro próprio',
  'Transporte público (ônibus/van)',
  'Aplicativo (Uber/99)',
  'Outro / Carona'
];

const BAIRROS_JUIZ_DE_FORA = [
  'Alto dos Passos', 'Bairu', 'Benfica', 'Bom Pastor', 'Cascatinha', 
  'Centro', 'Dom Bosco', 'Fábrica', 'Fontesville', 'Gairú', 'Graminha', 
  'Granbery', 'Grajau', 'Ipiranga', 'Jardim Glória', 'Linhares', 
  'Manoel Honório', 'Marilândia', 'Mariano Procópio', 'Monte Castelo', 
  'Morro da Glória', 'Mundo Novo', 'Nova Califórnia', 'Nova Era', 
  'Olavo Costa', 'Paineiras', 'Passos', 'Poço Rico', 'Progresso', 
  'Retiro', 'Santa Cecília', 'Santa Helena', 'Santa Luzia', 'Santa Terezinha', 
  'Santo Antônio', 'Santos Dumont', 'São Mateus', 'São Pedro', 'São Bernardo', 
  'Teixeiras', 'Vale do Ipê', 'Vila Ideal', 'Vila Ozanan'
];

function formatPhone(value) {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

function formatCurrency(value) {
  let v = value.replace(/\D/g, '');
  if (!v) return '';
  v = (Number(v) / 100).toFixed(2) + '';
  v = v.replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return v;
}

export default function TrabalheConoscoClient() {
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    instagram: '',
    funcao: 'Bartender',
    bairro: '',
    cidade: 'Juiz de Fora',
    enderecoCompleto: '',
    lat: null,
    lng: null,
    temExperiencia: 'sim', // 'sim' | 'nao'
    locaisTrabalhados: '',
    diasSemana: ['Sexta-feira', 'Sábado'],
    transporte: 'Moto própria',
    valorCache: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Google Maps Autocomplete states
  const [bairroQuery, setBairroQuery] = useState('');
  const [bairroSuggestions, setBairroSuggestions] = useState([]);
  const [isSearchingBairro, setIsSearchingBairro] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const suggestionsBoxRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Carrega SDK do Google Maps sob demanda (lazy) para não travar a abertura inicial da página
  const loadGoogleMaps = useCallback(() => {
    if (typeof window === 'undefined' || googleLoaded) return;

    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleLoaded(true);
      return;
    }

    const scriptId = 'google-maps-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      document.head.appendChild(script);
    }
  }, [googleLoaded]);

  // Pré-carrega de forma ociosa após 2 segundos sem competir com o carregamento da página
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGoogleMaps();
    }, 2000);
    return () => clearTimeout(timer);
  }, [loadGoogleMaps]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsBoxRef.current && !suggestionsBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca bairros no Google Places / Geocoder com foco em Juiz de Fora e Região
  const searchBairros = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setBairroSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingBairro(true);
    const results = [];
    const cleanQuery = query.trim().toLowerCase();

    // 1. Busca Instantânea na lista curada de Bairros de Juiz de Fora
    const matchingBairros = BAIRROS_JUIZ_DE_FORA.filter(b => 
      b.toLowerCase().includes(cleanQuery)
    );

    matchingBairros.slice(0, 5).forEach(bairroName => {
      results.push({
        mainText: bairroName,
        secondaryText: 'Bairro • Juiz de Fora, MG',
        fullText: `${bairroName}, Juiz de Fora - MG`,
        isBairro: true
      });
    });

    // 2. Google Places AutocompleteService com foco restrito em sublocality / neighborhood
    if (window.google && window.google.maps && window.google.maps.places) {
      try {
        if (!autocompleteServiceRef.current) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }

        await new Promise((resolve) => {
          autocompleteServiceRef.current.getPlacePredictions(
            {
              input: cleanQuery.includes('juiz de fora') ? cleanQuery : `${cleanQuery}, Juiz de Fora, MG`,
              componentRestrictions: { country: 'br' },
              types: ['sublocality', 'neighborhood', 'sublocality_level_1']
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                predictions.forEach(p => {
                  const main = p.structured_formatting?.main_text || p.description.split(',')[0];
                  // Evita adicionar se for apenas "Juiz de Fora" ou se já estiver na lista
                  if (main.toLowerCase() !== 'juiz de fora' && !results.some(r => r.mainText.toLowerCase() === main.toLowerCase())) {
                    results.push({
                      mainText: main,
                      secondaryText: p.structured_formatting?.secondary_text || 'Juiz de Fora, MG',
                      fullText: p.description,
                      placeId: p.place_id,
                      isBairro: true
                    });
                  }
                });
              }
              resolve();
            }
          );
        });
      } catch (err) {
        console.warn('Erro no Google Places Autocomplete:', err);
      }
    }

    // 3. Fallback: Se for uma cidade vizinha ou digitou algo que não é bairro de JF
    if (results.length === 0) {
      results.push({
        mainText: query.trim(),
        secondaryText: 'Juiz de Fora e Região',
        fullText: `${query.trim()}, Juiz de Fora - MG`,
        isBairro: true
      });
    }

    setBairroSuggestions(results.slice(0, 6));
    setShowSuggestions(true);
    setIsSearchingBairro(false);
  }, []);

  const handleBairroInputChange = (e) => {
    const val = e.target.value;
    setBairroQuery(val);
    setForm(p => ({ ...p, bairro: val, enderecoCompleto: val }));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      searchBairros(val);
    }, 250);
  };

  const handleSelectBairro = (sug) => {
    setBairroQuery(sug.mainText);
    setForm(p => ({
      ...p,
      bairro: sug.mainText,
      enderecoCompleto: sug.fullText,
      lat: sug.lat || null,
      lng: sug.lng || null
    }));
    setShowSuggestions(false);
    if (errors.bairro) {
      setErrors(p => ({ ...p, bairro: null }));
    }
  };

  const toggleDiaSemana = (dia) => {
    setForm(p => {
      const exists = p.diasSemana.includes(dia);
      return {
        ...p,
        diasSemana: exists ? p.diasSemana.filter(d => d !== dia) : [...p.diasSemana, dia]
      };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe seu nome completo';
    const rawPhone = form.telefone.replace(/\D/g, '');
    if (rawPhone.length < 10) e.telefone = 'Informe um WhatsApp válido com DDD';
    if (!form.bairro.trim()) e.bairro = 'Informe o bairro ou região onde você mora';
    if (!form.valorCache.trim()) e.valorCache = 'Informe o valor médio pretendido por evento / diária';
    if (form.diasSemana.length === 0) e.diasSemana = 'Selecione ao menos um dia disponível';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const candId = `cand_${Date.now()}`;
    const payload = {
      id: candId,
      nome: form.nome.trim(),
      telefone: form.telefone.replace(/\D/g, ''),
      instagram: form.instagram.trim() ? (form.instagram.startsWith('@') ? form.instagram.trim() : `@${form.instagram.trim()}`) : '',
      funcao: form.funcao,
      bairro: form.bairro.trim(),
      cidade: form.cidade,
      enderecoCompleto: form.enderecoCompleto || `${form.bairro}, Juiz de Fora - MG`,
      lat: form.lat || null,
      lng: form.lng || null,
      temExperiencia: form.temExperiencia === 'sim',
      locaisTrabalhados: form.locaisTrabalhados.trim(),
      diasSemana: form.diasSemana,
      transporte: form.transporte,
      valorCache: form.valorCache.trim(),
      observacoes: form.observacoes.trim(),
      status: 'novo', // 'novo' | 'aprovado' | 'em_espera' | 'recusado'
      criadoEm: new Date().toISOString()
    };

    let saved = false;

    // 1. Tenta API Route /api/candidatos com timeout rígido de 5s
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.success) saved = true;
      }
    } catch (err) {
      console.warn('Tentativa via /api/candidatos:', err?.message || err);
    }

    // 2. Se a rota não respondeu ou falhou, tenta direto via SDK com timeout de 3s
    if (!saved) {
      try {
        const sdkPromise = set(ref(db, `candidatos_freelancers/${candId}`), payload);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout Firebase SDK')), 3000)
        );
        await Promise.race([sdkPromise, timeoutPromise]);
        saved = true;
      } catch (err) {
        console.warn('Tentativa via Firebase SDK direto:', err?.message || err);
      }
    }

    if (saved) {
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    // Se ambas as tentativas falharam (ex: bloqueio de regras do banco)
    setSubmitting(false);
    setSubmitError('Houve uma lentidão no servidor ao confirmar o cadastro. Você pode tentar novamente ou enviar diretamente pelo WhatsApp.');
  };

  const getCandidateWhatsappMessage = () => {
    return encodeURIComponent(
      `Olá! Gostaria de me cadastrar como freelancer no Laboratório de Drinks:\n\n` +
      `*Nome:* ${form.nome || 'Não informado'}\n` +
      `*WhatsApp:* ${form.telefone || 'Não informado'}\n` +
      (form.instagram ? `*Instagram:* ${form.instagram}\n` : '') +
      `*Função:* ${form.funcao}\n` +
      `*Bairro/Região:* ${form.bairro || 'Juiz de Fora'}\n` +
      `*Experiência:* ${form.temExperiencia === 'sim' ? 'Sim (' + (form.locaisTrabalhados || 'Experiente') + ')' : 'Iniciante'}\n` +
      `*Disponibilidade:* ${form.diasSemana.join(', ')}\n` +
      `*Transporte:* ${form.transporte}\n` +
      `*Cachê Pretendido:* R$ ${form.valorCache || 'A combinar'}\n` +
      (form.observacoes ? `*Obs:* ${form.observacoes}\n` : '')
    );
  };

  const zapAdminUrl = `https://wa.me/5532998696519?text=${encodeURIComponent(`Olá! Acabei de me cadastrar como freelancer no Laboratório de Drinks. Meu nome é ${form.nome}.`)}`;
  const zapFallbackUrl = `https://wa.me/5532998696519?text=${getCandidateWhatsappMessage()}`;

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '60px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '16px',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(76, 175, 80, 0.15)', border: '2px solid #4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#4CAF50' }}>
            <FiCheckCircle size={38} />
          </div>

          <h1 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.6rem', margin: '0 0 12px 0' }}>
            Cadastro Recebido com Sucesso!
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Obrigado pelo seu interesse, <strong>{form.nome}</strong>! Seus dados e disponibilidade já estão cadastrados em nosso banco de talentos para eventos em Juiz de Fora e região.
          </p>

          <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', marginBottom: '28px', textAlign: 'left', fontSize: '0.85rem' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}><strong>Resumo do cadastro:</strong></div>
            <div>🍸 <strong>Função:</strong> {form.funcao}</div>
            <div>📍 <strong>Região:</strong> {form.bairro}</div>
            <div>💵 <strong>Cachê pretendido:</strong> R$ {form.valorCache}</div>
            <div>📅 <strong>Disponibilidade:</strong> {form.diasSemana.join(', ')}</div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Assim que surgirem escalas compatíveis com seu perfil, nossa coordenação entrará em contato via WhatsApp.
          </p>

          <a
            href="/"
            className="btn btn--primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '46px', padding: '0 24px', textDecoration: 'none' }}
          >
            Voltar à Página Inicial
          </a>
        </div>
      </main>
    );
  }

  return (
    <main suppressHydrationWarning style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '40px 16px 80px 16px' }}>
      <div suppressHydrationWarning style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* Header da Página */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.webp" 
            alt="Laboratório de Drinks" 
            style={{ width: '100px', height: 'auto', marginBottom: '16px', filter: 'drop-shadow(0 4px 12px rgba(203,161,83,0.3))' }} 
          />
          <h1 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.75rem', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
            Trabalhe Conosco
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 auto', maxWidth: '480px', lineHeight: '1.5' }}>
            Cadastre-se como <strong>bartender, barback ou staff freelancer</strong> para casamentos e eventos sociais do Laboratório de Drinks em Juiz de Fora e região.
          </p>
        </div>

        {/* Card do Formulário */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '28px 24px',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Bloco 1: Dados Pessoais */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiUser /> 1. Dados Pessoais e Contato
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Nome */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.nome ? 'form-input--error' : ''}`}
                    placeholder="Ex: João Vitor Souza"
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                  {errors.nome && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.nome}</span>}
                </div>

                {/* Telefone e Instagram em Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  {/* WhatsApp */}
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      <FaWhatsapp style={{ color: '#25D366', marginRight: 4 }} /> WhatsApp com DDD *
                    </label>
                    <input
                      type="tel"
                      className={`form-input ${errors.telefone ? 'form-input--error' : ''}`}
                      placeholder="(32) 99999-0000"
                      value={form.telefone}
                      onChange={e => setForm(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                    />
                    {errors.telefone && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.telefone}</span>}
                  </div>

                  {/* Instagram */}
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      <FaInstagram style={{ color: '#E1306C', marginRight: 4 }} /> Instagram (opcional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="@seuperfil"
                      value={form.instagram}
                      onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

            {/* Bloco 2: Onde Mora (Google Maps Bairro) */}
            <div ref={suggestionsBoxRef}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiMapPin /> 2. Onde Você Mora (Bairro)
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Bairro onde você mora (Juiz de Fora / Região) *
                </label>
                
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className={`form-input ${errors.bairro ? 'form-input--error' : ''}`}
                    placeholder="Digite seu bairro (Ex: São Mateus, Cascatinha, Benfica, Centro...)"
                    value={bairroQuery}
                    onChange={handleBairroInputChange}
                    onFocus={() => {
                      loadGoogleMaps();
                      if (bairroSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    style={{ paddingLeft: '38px' }}
                  />
                  {isSearchingBairro && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                      <div className="btn__spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    </div>
                  )}
                </div>

                {errors.bairro && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.bairro}</span>}

                {/* Dropdown de Sugestões de Bairro */}
                {showSuggestions && bairroSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {bairroSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectBairro(sug)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: idx < bairroSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.85rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <FiMapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sug.mainText}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sug.secondaryText}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Meio de Transporte */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  <FiTruck style={{ marginRight: 4, verticalAlign: 'middle' }} /> Como você costuma ir até os eventos?
                </label>
                <select
                  className="form-input"
                  value={form.transporte}
                  onChange={e => setForm(p => ({ ...p, transporte: e.target.value }))}
                  style={{ appearance: 'auto', WebkitAppearance: 'auto' }}
                >
                  {OPCOES_TRANSPORTE.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

            {/* Bloco 3: Função e Experiência */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiBriefcase /> 3. Função & Experiência
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Função Principal */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Qual função você tem preferência ou mais experiência?
                  </label>
                  <select
                    className="form-input"
                    value={form.funcao}
                    onChange={e => setForm(p => ({ ...p, funcao: e.target.value }))}
                    style={{ appearance: 'auto', WebkitAppearance: 'auto' }}
                  >
                    {FUNCOES.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Já tem experiência? */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Já trabalhou como freelancer em bares ou eventos antes?
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${form.temExperiencia === 'sim' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: form.temExperiencia === 'sim' ? 'rgba(203, 161, 83, 0.15)' : 'var(--bg-input)',
                      color: form.temExperiencia === 'sim' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <input
                        type="radio"
                        name="temExperiencia"
                        checked={form.temExperiencia === 'sim'}
                        onChange={() => setForm(p => ({ ...p, temExperiencia: 'sim' }))}
                        style={{ display: 'none' }}
                      />
                      <span>Sim, tenho experiência</span>
                    </label>

                    <label style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${form.temExperiencia === 'nao' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: form.temExperiencia === 'nao' ? 'rgba(203, 161, 83, 0.15)' : 'var(--bg-input)',
                      color: form.temExperiencia === 'nao' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <input
                        type="radio"
                        name="temExperiencia"
                        checked={form.temExperiencia === 'nao'}
                        onChange={() => setForm(p => ({ ...p, temExperiencia: 'nao' }))}
                        style={{ display: 'none' }}
                      />
                      <span>Iniciante (Quero aprender)</span>
                    </label>
                  </div>
                </div>

                {/* Onde já trabalhou */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Onde você já trabalhou? (Bares, casas noturnas, buffets ou festas)
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Ex: Trabalhei 1 ano na Avalon, fiz casamentos com buffet tal, trabalhei de barback no Bar X..."
                    value={form.locaisTrabalhados}
                    onChange={e => setForm(p => ({ ...p, locaisTrabalhados: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

            {/* Bloco 4: Disponibilidade & Valor */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiDollarSign /> 4. Disponibilidade e Cachê
              </div>

              {/* Dias da semana */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  <FiCalendar style={{ marginRight: 4, verticalAlign: 'middle' }} /> Dias da semana que você costuma estar livre: *
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {DIAS_SEMANA.map(dia => {
                    const isChecked = form.diasSemana.includes(dia);
                    return (
                      <label
                        key={dia}
                        onClick={() => toggleDiaSemana(dia)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isChecked ? 'rgba(203, 161, 83, 0.15)' : 'var(--bg-input)',
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                          color: isChecked ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          userSelect: 'none',
                          fontWeight: isChecked ? 600 : 400
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--text-muted)'}`,
                          background: isChecked ? 'var(--primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#000',
                          flexShrink: 0
                        }}>
                          {isChecked && <FiCheck size={14} />}
                        </div>
                        <span>{dia}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.diasSemana && <span className="form-error" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.diasSemana}</span>}
              </div>

              {/* Valor cobrado */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Valor da Diária / Cachê Pretendido (R$) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
                    R$
                  </span>
                  <input
                    type="text"
                    className={`form-input ${errors.valorCache ? 'form-input--error' : ''}`}
                    placeholder="Ex: 150,00"
                    value={form.valorCache}
                    onChange={e => setForm(p => ({ ...p, valorCache: formatCurrency(e.target.value) }))}
                    style={{ paddingLeft: '40px', fontWeight: 600, color: '#4CAF50', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Valor médio cobrado por turno/evento de 4 a 6 horas de festa.
                </div>
                {errors.valorCache && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.valorCache}</span>}
              </div>

              {/* Observações */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Observações adicionais (opcional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Tenho kit de coqueteleira próprio, disponibilidade para viagens, etc."
                  value={form.observacoes}
                  onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
            </div>

            {submitError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '0.88rem', fontWeight: 600 }}>
                  <FiAlertCircle size={20} />
                  <span>Aviso no envio</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {submitError}
                </div>
                <a
                  href={zapFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#25D366',
                    color: '#fff',
                    padding: '11px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  <FaWhatsapp size={18} />
                  <span>Enviar Cadastro pelo WhatsApp</span>
                </a>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn--primary"
              style={{
                width: '100%',
                minHeight: '52px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '10px',
                borderRadius: '12px'
              }}
            >
              {submitting ? (
                <>
                  <div className="btn__spinner" />
                  <span>Enviando cadastro...</span>
                </>
              ) : (
                <>
                  <span>Enviar Meu Cadastro</span>
                  <FiArrowRight size={18} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Seus dados serão utilizados exclusivamente para contato profissional sobre vagas de freelancer do Laboratório de Drinks.
            </div>

          </form>
        </div>

      </div>
    </main>
  );
}
