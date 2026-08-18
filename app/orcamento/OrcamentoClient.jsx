"use client";
import { useState, useCallback, useEffect, useRef } from 'react'
import { ref, push, get, set, update, serverTimestamp } from 'firebase/database'
import { db } from '../../lib/firebase'
import {
  FiChevronRight, FiChevronLeft, FiCheck, FiUser,
  FiPhone, FiMapPin, FiCalendar, FiUsers, FiSend
} from 'react-icons/fi'
import { BiDrink, BiParty } from 'react-icons/bi'
import { MdCelebration } from 'react-icons/md'
import { sendWhatsAppQuote } from '../../lib/whatsappService'
import { calculatePackagePrice, getMinTierPrice } from '../../lib/pricingUtils'
import BackgroundEffects from '../../components/BackgroundEffects'


/* ============================

/* ============================
   Helpers
   ============================ */
function firebaseObjToArray(obj) {
  if (!obj) return []
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// Reviews reais via TrustIndex widget (veja componente TrustIndexWidget)

const STEPS = [
  { title: 'Seus Dados', desc: 'Para onde enviamos seu orçamento?' },
  { title: 'Sobre seu Evento', desc: 'Detalhes e extras para seu evento' },
  { title: 'Escolha seu Pacote', desc: 'Selecione o pacote ideal para seu evento' },
]

const DRAFT_KEY = 'orcamento_draft'
const DRAFT_TTL = 24 * 60 * 60 * 1000 // 24 horas

/* ============================
   Component
   ============================ */
export default function OrcamentoClient() {
  const [configLoading, setConfigLoading] = useState(true)
  const [pacotes, setPacotes] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [tiposDrinks, setTiposDrinks] = useState([])
  const [drinksMenu, setDrinksMenu] = useState([])
  const [cidades, setCidades] = useState([])
  const [maxDrinks, setMaxDrinks] = useState(5)
  const [showDrinksModal, setShowDrinksModal] = useState(false)

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [pendingDraft, setPendingDraft] = useState(null) // { formData, step }
  

  const [currentLeadId, setCurrentLeadId] = useState(null)
  const [general, setGeneral] = useState(null)

  const [abGroup, setAbGroup] = useState('A')
  const [abTestingConfig, setAbTestingConfig] = useState(null)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const forced = params.get('ab')?.toUpperCase();
        if (forced === 'A' || forced === 'B') {
          localStorage.setItem('DRINKS_AB_GROUP', forced);
          setAbGroup(forced);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (configLoading) return;
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const forced = params.get('ab')?.toUpperCase();
        if (forced === 'A' || forced === 'B') {
          setAbGroup(forced);
          return;
        }
      }

      let group = localStorage.getItem('DRINKS_AB_GROUP');
      const targetPercentA = abTestingConfig && abTestingConfig.percentA !== undefined ? parseInt(abTestingConfig.percentA, 10) : 70;
      const thresholdA = targetPercentA / 100;

      if (!group) {
        group = Math.random() < thresholdA ? 'A' : 'B';
        localStorage.setItem('DRINKS_AB_GROUP', group);
      }
      setAbGroup(group);
    } catch (e) {
      setAbGroup('A');
    }
  }, [configLoading, abTestingConfig]);

  useEffect(() => {
    get(ref(db, 'config'))
      .then((snap) => {
        if (!snap.exists()) return
        const d = snap.val()
        if (d.pacotes) setPacotes(firebaseObjToArray(d.pacotes))
        if (d.tiposEvento) setTiposEvento(firebaseObjToArray(d.tiposEvento))
        if (d.tiposDrinks) setTiposDrinks(firebaseObjToArray(d.tiposDrinks))
        if (d.drinksMenu) setDrinksMenu(firebaseObjToArray(d.drinksMenu))
        if (d.cidades) {
          const cidadesArray = Object.values(d.cidades);
          cidadesArray.sort((a, b) => (b.count || 0) - (a.count || 0));
          
          const topCities = ['Juiz de Fora', 'Matias Barbosa', 'Simão Pereira'];
          const topList = [];
          const othersList = [];
          
          topCities.forEach(tc => {
            topList.push(tc);
          });

          cidadesArray.forEach(c => {
            if (!topCities.some(tc => tc.toLowerCase() === c.name.toLowerCase()) && c.name.toLowerCase() !== 'outra cidade...') {
              othersList.push(c.name);
            }
          });

          setCidades([...topList, ...othersList, 'Outra cidade...']);
        }
        if (d.maxDrinks) setMaxDrinks(d.maxDrinks)
        if (d.general) {
          setGeneral(d.general)
        }
        if (d.abTesting) setAbTestingConfig(d.abTesting)
      })
      .catch((err) => console.error('Erro ao carregar config:', err))
      .finally(() => setConfigLoading(false))
  }, [])

  const lastStepRef = useRef(0);

  // Initialize history state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.history.state === null || window.history.state.step === undefined) {
        window.history.replaceState({ step: 0 }, '');
      } else {
        setCurrentStep(window.history.state.step);
      }
    }
  }, []);

  // Listen to popstate (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state) {
        if (typeof e.state.step === 'number') {
          lastStepRef.current = e.state.step;
          setCurrentStep(e.state.step);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state when currentStep changes
  useEffect(() => {
    if (currentStep !== lastStepRef.current) {
      window.history.pushState({ step: currentStep }, '');
      lastStepRef.current = currentStep;
    }
  }, [currentStep]);

  const getWhatsAppNumber = () => {
    let num = general?.whatsappNumber || '';
    if (!num && general?.adminPhone) {
      num = general.adminPhone.split(',')[0].trim();
    }
    if (!num) return '5532998696519'; // User's confirmed real number
    const cleanNum = num.replace(/\D/g, '');
    return cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;
  };



  const [formData, setFormData] = useState({
    pacote: '',
    nome: '',
    sobrenome: '',
    telefone: '',
    cidade: '',
    novaCidade: '',
    convidados: 40,
    dataEvento: '',
    tipoEvento: '',
    duracao: 5,
    horarioEvento: '',
    tiposDrinks: [],
    drinksEscolhidos: [],
    upsellChopp: false,
    upsellFrozen: false,
    cerimonialista: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    try {

      const savedLeadId = localStorage.getItem('CURRENT_LEAD_ID');
      if (savedLeadId) setCurrentLeadId(savedLeadId);
    } catch (e) {}

    const params = new URLSearchParams(window.location.search);
    const pacoteId = params.get('pacote');
    const refSlug = params.get('ref'); // ?ref= tem prioridade máxima

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const { formData: saved, step: savedStep, savedAt } = JSON.parse(raw);
        if (Date.now() - savedAt < DRAFT_TTL) {
          // Cerimonialista: URL vence o cache
          const cerimSlug = refSlug || saved.cerimonialista || '';

          if (pacoteId) {
            // Veio de link de pacote — restaura sem perguntar
            setFormData(prev => ({ ...prev, pacote: pacoteId, cerimonialista: cerimSlug }));
            setCurrentStep(1);
            return;
          }

          if (savedStep > 0) {
            // Aplica cerimonialista imediatamente (independente da escolha do cliente)
            setFormData(prev => ({ ...prev, cerimonialista: cerimSlug }));
            // Guarda rascunho para o cliente decidir
            setPendingDraft({ formData: { ...saved, cerimonialista: cerimSlug }, step: Math.min(savedStep, STEPS.length - 1) });
            return;
          }
        }
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {
      localStorage.removeItem(DRAFT_KEY);
    }

    // Sem rascunho — apenas aplicar params da URL
    setFormData(prev => ({
      ...prev,
      ...(pacoteId ? { pacote: pacoteId } : {}),
      ...(refSlug ? { cerimonialista: refSlug } : {}),
    }));
    if (pacoteId) setCurrentStep(1);
  }, []);

  // Salvar rascunho no localStorage a cada mudança
  useEffect(() => {
    if (isSuccess) return;
    if (currentStep === 0 && !formData.pacote) return; // nada relevante ainda
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        formData,
        step: currentStep,
        savedAt: Date.now(),
      }));
    } catch (e) {}
  }, [formData, currentStep, isSuccess]);

  /* ---- Handlers ---- */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [])

  const toggleArrayField = useCallback((field, id) => {
    setFormData(prev => {
      const current = prev[field]
      if (current.includes(id)) {
        return { ...prev, [field]: current.filter(x => x !== id) }
      }
      if (field === 'drinksEscolhidos' && current.length >= maxDrinks) return prev
      return { ...prev, [field]: [...current, id] }
    })
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [])

  /* ---- Phone mask ---- */
  const handlePhoneChange = useCallback((e) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 7) {
      v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
    } else if (v.length > 2) {
      v = `(${v.slice(0,2)}) ${v.slice(2)}`
    } else if (v.length > 0) {
      v = `(${v}`
    }
    updateField('telefone', v)
  }, [updateField])

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.sobrenome.trim() || !formData.telefone || formData.telefone.replace(/\D/g, '').length < 10) {
      alert("Por favor, preencha seu nome, sobrenome e um WhatsApp válido.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const isAbActive = abTestingConfig?.active;
      const leadDataToSave = {
        nome: formData.nome.trim(),
        sobrenome: formData.sobrenome.trim(),
        telefone: formData.telefone,
        convidados: formData.convidados || 40,
        dataEvento: formData.dataEvento || '',
        horarioEvento: formData.horarioEvento || '',
        abGroup: abGroup || 'A',
        abCampaign: isAbActive ? (abTestingConfig?.campaignName || 'padrao') : 'padrao',
        status: 'novo',
        criadoEm: serverTimestamp(),
      };
      
      const newLeadRef = push(ref(db, 'leads'));
      await set(newLeadRef, leadDataToSave);
      
      setCurrentLeadId(newLeadRef.key);
      setIsPriceUnlocked(true);
      handleCloseUnlockModal();
      
      try {
        localStorage.setItem('DRINKS_UNLOCKED', 'true');
        localStorage.setItem('CURRENT_LEAD_ID', newLeadRef.key);
      } catch (err) {}
      
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      alert("Erro ao conectar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---- Validation ---- */
  const validateStep = useCallback((step) => {
    const e = {}
    switch (step) {
      case 0: // Dados Pessoais (primeiro passo)
        if (!formData.nome.trim()) e.nome = 'Nome é obrigatório'
        if (!formData.sobrenome.trim()) e.sobrenome = 'Sobrenome é obrigatório'
        if (!formData.telefone || formData.telefone.replace(/\D/g, '').length < 10)
          e.telefone = 'Insira um número válido'
        if (!formData.cidade) e.cidade = 'Selecione uma cidade'
        else if (formData.cidade === 'Outra cidade...' && !formData.novaCidade.trim()) {
          e.novaCidade = 'Digite o nome da cidade'
        }
        break
      case 1: // Sobre seu Evento
        if (!formData.dataEvento) e.dataEvento = 'Data é obrigatória'
        if (!formData.tipoEvento) e.tipoEvento = 'Selecione o tipo de evento'
        if (!formData.horarioEvento) e.horarioEvento = 'Horário de início é obrigatório'
        break
      case 2: // Escolha seu Pacote (último passo)
        if (!formData.pacote) e.pacote = 'Selecione um pacote'
        break
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [formData])

  const nextStep = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    // Save lead to Firebase after step 0 (personal data collected)
    if (currentStep === 0 && !currentLeadId) {
      try {
        let finalCity = formData.cidade;
        if (formData.cidade === 'Outra cidade...') finalCity = formData.novaCidade.trim();
        const leadSnap = {
          ...formData,
          cidade: finalCity,
          status: 'novo',
          criadoEm: Date.now(),
          abGroup: abGroup || 'A',
        };
        delete leadSnap.novaCidade;
        const newRef = await push(ref(db, 'leads'), leadSnap);
        setCurrentLeadId(newRef.key);
        try { localStorage.setItem('CURRENT_LEAD_ID', newRef.key); } catch (_) {}
      } catch (err) {
        console.warn('Aviso ao pré-salvar lead:', err);
      }
    }

    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, validateStep, formData, currentLeadId, abGroup])

  const prevStep = useCallback(() => {
    if (window.history.state?.step !== undefined && window.history.state.step > 0) {
      window.history.back();
    } else {
      setCurrentStep(s => Math.max(s - 1, 0));
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  /* ---- Submit ---- */
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      let finalCity = formData.cidade;
      
      if (formData.cidade === 'Outra cidade...') {
        finalCity = formData.novaCidade.trim();
      }

      // Incrementar a contagem da cidade no Firebase
      if (finalCity) {
        const normalizeString = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const cityKey = normalizeString(finalCity);
        const cityRef = ref(db, `config/cidades/${cityKey}`);
        
        get(cityRef).then(snap => {
          if (snap.exists()) {
            update(cityRef, { count: (snap.val().count || 0) + 1 }).catch(() => {});
          } else {
            set(cityRef, { name: finalCity, count: 1 }).catch(() => {});
          }
        }).catch(() => {});
      }

      const isAbActive = abTestingConfig?.active;
      const leadDataToSave = {
        ...formData,
        cidade: finalCity,
        abGroup: abGroup || 'A',
        abCampaign: isAbActive ? (abTestingConfig?.campaignName || formData.abCampaign || 'padrao') : (formData.abCampaign || 'padrao'),
        status: 'novo',
      }
      delete leadDataToSave.novaCidade;

      let finalLeadId = currentLeadId;
      if (currentLeadId) {
        await update(ref(db, `leads/${currentLeadId}`), leadDataToSave);
      } else {
        leadDataToSave.criadoEm = serverTimestamp();
        const newRef = await push(ref(db, 'leads'), leadDataToSave);
        finalLeadId = newRef.key;
      }
      
      // Enviar mensagem via WhatsApp sem travar a conclusão do orçamento se o número não existir ou houver falha de API
      try {
        await sendWhatsAppQuote(leadDataToSave, visiblePacotes, finalLeadId);
      } catch (waErr) {
        console.warn('Aviso no disparo de WhatsApp:', waErr);
      }

      setIsSuccess(true)
      try { localStorage.removeItem(DRAFT_KEY) } catch (e) {}
    } catch (err) {
      console.error('Erro ao enviar:', err)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, currentStep, validateStep, pacotes, cidades])

  const resetForm = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY) } catch (e) {}
    setFormData({
      pacote: '', nome: '', sobrenome: '', telefone: '', cidade: '', novaCidade: '',
      convidados: 40, dataEvento: '', tipoEvento: '',
      duracao: 5, horarioEvento: '',
      tiposDrinks: [], drinksEscolhidos: [],
      upsellChopp: false, upsellFrozen: false,
      cerimonialista: '',
    })
    setCurrentStep(0)
    setIsSuccess(false)
    setPendingDraft(null)
    setErrors({})
  }, [])

  /* ============================
     Render Steps
     ============================ */

  /* ---- Visible packages computation (handles A/B testing & hidden flags) ---- */
  const isGroupB = abGroup === 'B';

  const visiblePacotes = pacotes
    .filter(p => !p.hidden)
    .filter(p => {
      if (isGroupB && abTestingConfig?.hideMaoDeObraInB) {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        if (name.includes('obra') || id.includes('obra')) return false;
      }
      return true;
    })
    .map(p => {
      if (isGroupB && p.priceB && p.priceB.trim() !== '') {
        return { ...p, price: p.priceB };
      }
      return p;
    });

  /* ---- Render Steps ---- */
  const renderStep = () => {
    switch (currentStep) {
      /* ---- Step 2: Package Selection ---- */
      case 2:
        return (
          <div className="step-enter" key="step-2">
            <div className="packages-grid">
              {visiblePacotes.map(p => {
                const isSelected = formData.pacote === p.id;
                const nameLower = (p.name || '').toLowerCase();
                const idLower = (p.id || '').toLowerCase();
                const isReatividade = nameLower.includes('reatividade') || idLower.includes('reatividade') || (nameLower.includes('premium') && !nameLower.includes('mão'));
                const isLaboratorio = (nameLower.includes('laborat') || p.popular) && !isReatividade;
                const isExperimento = nameLower.includes('experimento') || idLower.includes('experimento');

                // Drinks tag
                let drinkPillText = '🍸 Opções de Drinks';
                if (p.drinksCount || p.maxDrinks) {
                  const count = p.drinksCount || p.maxDrinks;
                  if (count === 4 || isExperimento) drinkPillText = '🍸 4 Opções de Drinks';
                  else if (count === 5 || isLaboratorio) drinkPillText = '🍹 5 Opções • Inclui Autorais';
                  else if (count === 6 || isReatividade) drinkPillText = '💎 6 Opções • Destilados Premium';
                  else drinkPillText = `🍸 ${count} Opções de Drinks`;
                } else if (isExperimento) {
                  drinkPillText = '🍸 4 Opções de Drinks';
                } else if (isLaboratorio) {
                  drinkPillText = '🍹 5 Opções • Inclui Autorais';
                } else if (isReatividade) {
                  drinkPillText = '💎 6 Opções • Destilados Premium';
                }

                const calc = calculatePackagePrice(p, formData.convidados || 40, formData.duracao || 5, { 
                  upsellFrozen: formData.upsellFrozen,
                  abGroup 
                });

                return (
                  <div
                    key={p.id}
                    id={`pacote-${p.id}`}
                    className={`package-card ${isSelected ? 'package-card--selected' : ''} ${isLaboratorio ? 'package-card--popular' : ''} ${isReatividade ? 'package-card--premium' : ''}`}
                    onClick={() => {
                      updateField('pacote', p.id);
                    }}
                  >
                    {isLaboratorio && (
                      <span className="package-card__badge">
                        ⭐ Experiência Mais Escolhida
                      </span>
                    )}
                    {isReatividade && (
                      <span className="package-card__badge package-card__badge--premium">
                        👑 Experiência Premium & Cênica
                      </span>
                    )}

                    <span className="package-card__emoji">{p.emoji || (isExperimento ? '🧪' : isLaboratorio ? '⚗️' : '🧬')}</span>
                    
                    <h3 className="package-card__name">{p.name}</h3>

                    <div className="package-card__pill">
                      {drinkPillText}
                    </div>

                    {p.desc && (
                      <p className="package-card__desc">
                        {p.desc}
                      </p>
                    )}

                    <div className="package-card__price">
                      <div className="package-card__price-row">
                        {isGroupB && calc.isTier ? (
                          <>
                            <span className="package-card__price-value">
                              R$ {calc.finalPrice.toLocaleString('pt-BR')}
                            </span>
                            {calc.tierLabel && (
                              <span className="package-card__price-label">
                                ({calc.tierLabel})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="package-card__price-value">{p.price}</span>
                            <span className="package-card__price-label">/{p.priceLabel || 'por pessoa'}</span>
                          </>
                        )}
                      </div>

                      {/* Estimativa do Total do Evento apenas no Grupo A (Preço por pessoa) */}
                      {(!isGroupB || !calc.isTier) && (
                        <div className="package-card__price-total">
                          ✨ Total: R$ {calc.finalPrice.toLocaleString('pt-BR')} para {formData.convidados || 40} convidados
                        </div>
                      )}
                    </div>

                    {isGroupB && p.priceTiers?.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'rgba(203, 161, 83, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(203, 161, 83, 0.18)',
                        textAlign: 'left',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '6px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📋 Tabela de Preços por Convidados
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {p.priceTiers.map((t, tIdx) => {
                            const isCurrent = (formData.convidados >= t.minGuests && formData.convidados <= t.maxGuests);
                            return (
                              <div
                                key={tIdx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: isCurrent ? 'rgba(203, 161, 83, 0.25)' : 'transparent',
                                  border: isCurrent ? '1px solid var(--primary)' : '1px solid transparent',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <span style={{ color: isCurrent ? '#FFF' : 'var(--text-secondary)', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                                  {(t.minGuests <= 30 && t.maxGuests === 50) ? 'Até 50 pessoas:' : `${t.minGuests}–${t.maxGuests} pessoas:`}
                                </span>
                                <span style={{ color: isCurrent ? 'var(--primary)' : '#DDD', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                                  R$ {Number(t.fixedPrice).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <ul className="package-card__features">
                      {(p.features || []).map((f, i) => (
                        <li key={i}>
                          <FiCheck size={14} /> 
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="package-card__select-btn"
                    >
                      {isSelected ? '✓ Pacote Selecionado' : 'Selecionar este Pacote'}
                    </button>
                  </div>
                );
              })}
            </div>
            {errors.pacote && <span className="form-error" style={{textAlign:'center',display:'block',marginTop:12}}>{errors.pacote}</span>}
          </div>
        )

      /* ---- Step 1: Event Details ---- */
      case 1:
        return (
          <div className="step-enter" key="step-1">
            <div className="form-group">
              <label htmlFor="convidadosInput" className="form-label">Quantidade de Convidados</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <input
                  id="convidadosInput"
                  type="number"
                  className="form-input"
                  min="30"
                  max="1000"
                  placeholder="Ex: 50"
                  value={formData.convidados || ''}
                  onChange={e => updateField('convidados', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ fontSize: '1.25rem', fontWeight: 'bold', width: '150px', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  convidados (Mínimo recomendado: 40)
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="dataEvento" className="form-label">Data do Evento</label>
                <input
                  id="dataEvento"
                  type="date"
                  className={`form-input ${errors.dataEvento ? 'form-input--error' : ''}`}
                  value={formData.dataEvento}
                  onChange={e => updateField('dataEvento', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.dataEvento && <span className="form-error">{errors.dataEvento}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="horarioEvento" className="form-label">Horário de Início</label>
                <input
                  id="horarioEvento"
                  type="time"
                  className={`form-input ${errors.horarioEvento ? 'form-input--error' : ''}`}
                  value={formData.horarioEvento || ''}
                  onChange={e => updateField('horarioEvento', e.target.value)}
                  style={{ width: '100%' }}
                />
                {errors.horarioEvento && <span className="form-error">{errors.horarioEvento}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Evento</label>
              <div className="chips-grid">
                {tiposEvento.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    id={`evento-${t.id}`}
                    className={`chip ${formData.tipoEvento === t.id ? 'chip--selected' : ''}`}
                    onClick={() => updateField('tipoEvento', t.id)}
                  >
                    <span className="chip__icon">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.tipoEvento && <span className="form-error">{errors.tipoEvento}</span>}
            </div>

            <div style={{ marginTop: '32px', borderTop: '1px solid rgba(203, 161, 83, 0.15)', paddingTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Extras para seu evento</h3>
              <div className="upsell-container" style={{display:'flex', flexDirection:'column', gap:24}}>
                
                {/* Highlighted Frozen Upsell - Hidden only for standard-frozen */}
                {formData.pacote !== 'standard-frozen' && (
                <div style={{
                  background: 'linear-gradient(145deg, #1A237E, #311B92)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  border: formData.upsellFrozen ? '3px solid #00E5FF' : '3px solid transparent',
                  boxShadow: formData.upsellFrozen ? '0 0 24px rgba(0, 229, 255, 0.4)' : '0 8px 32px rgba(0,0,0,0.3)',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    position: 'absolute', top: -40, right: -40, width: 150, height: 150, 
                    background: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 100, height: 100, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                        border: '2px solid rgba(0, 229, 255, 0.5)', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                      }}>
                        <img src="/frozen.jpg" alt="Frozen Experience" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: '#00E5FF' }}>
                          Laboratório Frozen ❄️
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#E0E0E0', lineHeight: 1.4 }}>
                          A experiência visual definitiva para o seu evento. Máquina de drinks congelados tipo raspadinha com fumaça e cores vibrantes.
                        </p>
                        <div style={{ marginTop: 8, fontWeight: 'bold', color: '#00E5FF', fontSize: '1.1rem' }}>
                          {formData.pacote === 'mao-de-obra' ? (
                            <>+ R$ 250,00 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#A0A0A0' }}>(Adicional Fixo)</span></>
                          ) : (
                            <>+ R$ 10,00 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#A0A0A0' }}>(Por Convidado)</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateField('upsellFrozen', !formData.upsellFrozen)}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                        background: formData.upsellFrozen ? 'rgba(0, 229, 255, 0.1)' : '#00E5FF',
                        color: formData.upsellFrozen ? '#00E5FF' : '#000',
                        border: formData.upsellFrozen ? '2px solid #00E5FF' : 'none',
                        fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                        transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      {formData.upsellFrozen ? (
                        <><FiCheck size={20} /> Máquina Adicionada!</>
                      ) : (
                        <>Sim! Quero a Máquina de Frozen</>
                      )}
                    </button>
                  </div>
                </div>
                )}

                {/* Secondary Upsell - Chopp */}
                <button
                  type="button"
                  className={`upsell-card ${formData.upsellChopp ? 'upsell-card--selected' : ''}`}
                  onClick={() => updateField('upsellChopp', !formData.upsellChopp)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                    background: 'var(--bg-input)', border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    borderColor: formData.upsellChopp ? 'var(--primary)' : 'var(--border-color)',
                    opacity: 0.85
                  }}
                >
                  <div className="upsell-card__check" style={{
                    width: 20, height: 20, borderRadius: '50%', border: '2px solid',
                    borderColor: formData.upsellChopp ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: formData.upsellChopp ? 'var(--primary)' : 'transparent',
                    color: 'white', flexShrink: 0
                  }}>
                    {formData.upsellChopp && <FiCheck size={12} />}
                  </div>
                  <div className="upsell-card__content">
                    <h4 style={{ margin: '0 0 4px 0', fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', fontSize: '1rem' }}>
                      🍺 Adicionar Máquina de Chopp a Gelo
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Chopp trincando sem desperdício de espuma.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button type="button" className="btn btn--outline" onClick={() => setShowDrinksModal(true)} style={{ width: '100%' }}>
                👀 Ver drinks disponíveis
              </button>
            </div>

          </div>
        )

      /* ---- Step 0: Personal Info ---- */
      case 0:
        return (
          <div className="step-enter" key="step-0">

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nome" className="form-label">Nome</label>
                <input
                  id="nome"
                  type="text"
                  className={`form-input ${errors.nome ? 'form-input--error' : ''}`}
                  placeholder="Nome"
                  value={formData.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
                {errors.nome && <span className="form-error">{errors.nome}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="sobrenome" className="form-label">Sobrenome</label>
                <input
                  id="sobrenome"
                  type="text"
                  className={`form-input ${errors.sobrenome ? 'form-input--error' : ''}`}
                  placeholder="Sobrenome"
                  value={formData.sobrenome}
                  onChange={e => updateField('sobrenome', e.target.value)}
                />
                {errors.sobrenome && <span className="form-error">{errors.sobrenome}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="telefone" className="form-label">Telefone (WhatsApp)</label>
              <input
                id="telefone"
                type="tel"
                className={`form-input ${errors.telefone ? 'form-input--error' : ''}`}
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={handlePhoneChange}
              />
              {errors.telefone
                ? <span className="form-error">{errors.telefone}</span>
                : <span className="form-hint">Enviaremos o orçamento para este WhatsApp</span>
              }
            </div>

            <div className="form-group">
              <label htmlFor="cidade" className="form-label">Cidade do Evento *</label>
              <select
                id="cidade"
                className={`form-select ${errors.cidade ? 'form-input--error' : ''}`}
                value={formData.cidade}
                onChange={e => updateField('cidade', e.target.value)}
              >
                <option value="">Selecione sua cidade</option>
                {cidades.filter(c => !c.hidden).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.cidade && <span className="form-error">{errors.cidade}</span>}
            </div>

            {formData.cidade === 'Outra cidade...' && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="novaCidade" className="form-label">Qual cidade?</label>
                <input
                  id="novaCidade"
                  type="text"
                  className={`form-input ${errors.novaCidade ? 'form-input--error' : ''}`}
                  placeholder="Digite o nome da sua cidade"
                  value={formData.novaCidade}
                  onChange={e => updateField('novaCidade', e.target.value)}
                />
                {errors.novaCidade && <span className="form-error">{errors.novaCidade}</span>}
              </div>
            )}




          </div>
        )
      default:
        return null
    }
  }

  /* ============================
     Main Render
     ============================ */
  const getCategory = (d) => {
    if (d.category) return d.category;
    return d.isNonAlcoholic ? 'sem_alcool' : 'alcool';
  };

  const drinksAlcool = drinksMenu.filter(d => getCategory(d) === 'alcool');
  const drinksPremium = drinksMenu.filter(d => getCategory(d) === 'sofisticado');
  const drinksFrozen = drinksMenu.filter(d => getCategory(d) === 'frozen');
  const drinksSemAlcool = drinksMenu.filter(d => getCategory(d) === 'sem_alcool');

  const renderDrinkCard = (d) => (
    <div
      key={d.id}
      className="drink-card"
      style={{ cursor: 'default', userSelect: 'none' }}
    >
      {d.image ? (
        <div className="drink-card__image-container" style={{
          width: 70, height: 70, borderRadius: 'var(--radius-sm)', overflow: 'hidden', 
          marginBottom: 8, border: '1px solid rgba(203, 161, 83, 0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 1, flexShrink: 0
        }}>
          <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <span className="drink-card__emoji">{d.emoji}</span>
      )}
      <span className="drink-card__name">{d.name}</span>
    </div>
  );

  return (
    <>
      <BackgroundEffects />

      {/* Modal Drinks */}
      {showDrinksModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowDrinksModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', maxWidth: 700, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>Drinks Disponíveis</h3>
              <button type="button" onClick={() => setShowDrinksModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* 🍸 Alcoólicos */}
              {drinksAlcool.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.15)', paddingBottom: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🍸 Alcoólicos
                  </h3>
                  <div className="drinks-grid">
                    {drinksAlcool.map(d => renderDrinkCard(d))}
                  </div>
                </div>
              )}

              {/* ✨ Premium */}
              {drinksPremium.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.15)', paddingBottom: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✨ Premium
                  </h3>
                  <div className="drinks-grid">
                    {drinksPremium.map(d => renderDrinkCard(d))}
                  </div>
                </div>
              )}

              {/* ❄️ Frozen */}
              {drinksFrozen.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.15)', paddingBottom: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ❄️ Frozen
                  </h3>
                  <div className="drinks-grid">
                    {drinksFrozen.map(d => renderDrinkCard(d))}
                  </div>
                </div>
              )}

              {/* 🧃 Sem Álcool */}
              {drinksSemAlcool.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.15)', paddingBottom: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🧃 Sem Álcool
                  </h3>
                  <div className="drinks-grid">
                    {drinksSemAlcool.map(d => renderDrinkCard(d))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}


      <div className="app">
        {configLoading ? (
          <div className="loading-screen">
            <div className="btn__spinner" style={{width:40,height:40,borderWidth:3}} />
            <p style={{marginTop:16,color:'var(--text-secondary)'}}>Carregando...</p>
          </div>
        ) : (
        <>
        <header className="header">
          <img 
            src={general?.logoUrl || "/logo.webp"} 
            alt="Logo" 
            style={{ 
              width: 140, 
              height: 'auto', 
              marginBottom: 24, 
              filter: 'drop-shadow(0 0 20px rgba(203, 161, 83, 0.4))' 
            }} 
          />
          <h1 className="header__title">{general?.companyName || "Laboratório de Drinks"}</h1>
          <p className="header__subtitle">{general?.siteSubtitle || "Desperte a química perfeita no seu evento com drinks inovadores"}</p>
        </header>

        {!isSuccess ? (
          <>


            {/* Modal: Rascunho encontrado */}
            {pendingDraft && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{
                  background: 'var(--bg-main)', borderRadius: '16px', padding: '32px',
                  maxWidth: 400, width: '100%', border: '1px solid var(--border-color)',
                  borderTop: '4px solid var(--primary)', textAlign: 'center',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
                  <h3 style={{ margin: '0 0 8px', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
                    Rascunho Encontrado!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 24px', lineHeight: 1.5 }}>
                    Encontramos um preenchimento incompleto. Deseja continuar de onde parou?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      className="btn btn--primary"
                      onClick={() => {
                        setFormData(pendingDraft.formData);
                        setCurrentStep(Math.min(pendingDraft.step, STEPS.length - 1));
                        setPendingDraft(null);
                      }}
                    >
                      ✅ Sim, continuar de onde parei
                    </button>
                    <button
                      className="btn btn--secondary"
                      onClick={() => setPendingDraft(null)}
                      style={{ fontSize: '0.9rem' }}
                    >
                      🔄 Não, começar do zero
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            <nav className="progress" aria-label="Progresso do formulário">
              {STEPS.map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                  <div
                    className={`progress__step ${
                      i === currentStep ? 'progress__step--active' :
                      i < currentStep ? 'progress__step--completed' : ''
                    }`}
                  >
                    {i < currentStep ? <FiCheck size={16} /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`progress__line ${i < currentStep ? 'progress__line--active' : ''}`} />
                  )}
                </div>
              ))}
            </nav>

            {/* Form Card */}
            <main className="form-card">
              <h2 className="form-card__step-title">{STEPS[currentStep].title}</h2>
              <p className="form-card__step-desc">{STEPS[currentStep].desc}</p>

              {renderStep()}

              <div className="form-actions">
                {currentStep > 0 && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={prevStep}
                    id="btn-prev"
                  >
                    <FiChevronLeft size={18} />
                    Voltar
                  </button>
                )}

                {currentStep < STEPS.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={nextStep}
                    id="btn-next"
                  >
                    Próximo
                    <FiChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn btn--primary ${isSubmitting ? 'btn--loading' : ''}`}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    id="btn-submit"
                  >
                    {isSubmitting ? (
                      <div className="btn__spinner" />
                    ) : (
                      <>
                        <FiSend size={18} />
                        Enviar Pedido
                      </>
                    )}
                  </button>
                )}
              </div>
            </main>
          </>
        ) : (
          /* Success Screen */
          <main className="form-card">
            <div className="success-screen">
              <div className="success-screen__icon">
                <FiCheck size={40} />
              </div>
              <h2 className="success-screen__title">Pedido Gerado! 🎉</h2>
              <p className="success-screen__text">
                Obrigado, <strong>{formData.nome}</strong>! Seu orçamento está pronto.
                <br />
                Toque no botão para recebê-lo agora mesmo via WhatsApp.
              </p>
              
              <div style={{display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:300}}>
                <a
                  href={`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(`Olá! Acabei de preencher o formulário para o meu evento (Pacote ${formData.pacote}). Meu nome é ${formData.nome} ${formData.sobrenome}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary success-screen__btn"
                  style={{background:'#25D366', borderColor:'#25D366', color:'white', textDecoration:'none', width:'100%'}}
                >
                  <FiPhone size={20} />
                  Enviar WhatsApp
                </a>
                
                <button
                  type="button"
                  className="btn btn--outline success-screen__btn"
                  onClick={resetForm}
                  id="btn-new-order"
                >
                  Fazer novo orçamento
                </button>
              </div>


            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>© {new Date().getFullYear()} Drinks Premium — Todos os direitos reservados</p>
        </footer>
        </>
        )}
      </div>
    </>
  )
}
