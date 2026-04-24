import { useState, useCallback, useEffect } from 'react'
import { ref, push, get, serverTimestamp } from 'firebase/database'
import { db } from './firebase'
import {
  FiChevronRight, FiChevronLeft, FiCheck, FiUser,
  FiPhone, FiMapPin, FiCalendar, FiUsers, FiSend
} from 'react-icons/fi'
import { BiDrink, BiParty } from 'react-icons/bi'
import { MdCelebration } from 'react-icons/md'
import { sendWhatsAppQuote } from './services/whatsappService'

/* ============================
   Helpers
   ============================ */
function firebaseObjToArray(obj) {
  if (!obj) return []
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

const STEPS = [
  { title: 'Escolha seu Pacote', desc: 'Selecione o pacote ideal para seu evento' },
  { title: 'Detalhes do Evento', desc: 'Informações sobre seu evento' },
  { title: 'Tipos de Drinks', desc: 'Selecione as categorias desejadas' },
  { title: 'Escolha seus Drinks', desc: 'Selecione até 5 drinks favoritos' },
  { title: 'Turbine seu Evento', desc: 'Adicione experiências exclusivas ao seu bar' },
  { title: 'Dados Pessoais', desc: 'Para onde enviamos seu orçamento?' },
]

/* ============================
   Component
   ============================ */
export default function App() {
  const [configLoading, setConfigLoading] = useState(true)
  const [pacotes, setPacotes] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [tiposDrinks, setTiposDrinks] = useState([])
  const [drinksMenu, setDrinksMenu] = useState([])
  const [cidades, setCidades] = useState([])
  const [maxDrinks, setMaxDrinks] = useState(5)

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    get(ref(db, 'config'))
      .then((snap) => {
        if (!snap.exists()) return
        const d = snap.val()
        if (d.pacotes) setPacotes(firebaseObjToArray(d.pacotes))
        if (d.tiposEvento) setTiposEvento(firebaseObjToArray(d.tiposEvento))
        if (d.tiposDrinks) setTiposDrinks(firebaseObjToArray(d.tiposDrinks))
        if (d.drinksMenu) setDrinksMenu(firebaseObjToArray(d.drinksMenu))
        if (d.cidades) setCidades(d.cidades)
        if (d.maxDrinks) setMaxDrinks(d.maxDrinks)
      })
      .catch((err) => console.error('Erro ao carregar config:', err))
      .finally(() => setConfigLoading(false))
  }, [])

  const [formData, setFormData] = useState({
    pacote: '',
    nome: '',
    sobrenome: '',
    telefone: '',
    cidade: '',
    convidados: 30,
    dataEvento: '',
    tipoEvento: '',
    tiposDrinks: [],
    drinksEscolhidos: [],
    upsellChopp: false,
    upsellFrozen: false,
  })

  const [errors, setErrors] = useState({})

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

  /* ---- Validation ---- */
  const validateStep = useCallback((step) => {
    const e = {}
    switch (step) {
      case 0: // Pacote
        if (!formData.pacote) e.pacote = 'Selecione um pacote'
        break
      case 1: // Evento
        if (!formData.dataEvento) e.dataEvento = 'Data é obrigatória'
        if (!formData.tipoEvento) e.tipoEvento = 'Selecione o tipo de evento'
        break
      case 2: // Tipos de Drinks
        if (formData.tiposDrinks.length === 0) e.tiposDrinks = 'Selecione pelo menos uma categoria'
        break
      case 3: // Drinks
        if (formData.drinksEscolhidos.length === 0) e.drinksEscolhidos = 'Selecione pelo menos 1 drink'
        break
      case 4: // Upsell
        // Opcional, sem validação
        break
      case 5: // Dados Pessoais
        if (!formData.nome.trim()) e.nome = 'Nome é obrigatório'
        if (!formData.sobrenome.trim()) e.sobrenome = 'Sobrenome é obrigatório'
        if (!formData.telefone || formData.telefone.replace(/\D/g, '').length < 10)
          e.telefone = 'Insira um número válido'
        if (!formData.cidade) e.cidade = 'Selecione uma cidade'
        break
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [formData])

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
    }
  }, [currentStep, validateStep])

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0))
  }, [])

  /* ---- Submit ---- */
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      await push(ref(db, 'leads'), {
        ...formData,
        criadoEm: serverTimestamp(),
        status: 'novo',
      })
      
      // Enviar mensagem via WhatsApp com resumo dos pacotes
      await sendWhatsAppQuote(formData, pacotes)

      setIsSuccess(true)
    } catch (err) {
      console.error('Erro ao enviar:', err)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, currentStep, validateStep, pacotes])

  const resetForm = useCallback(() => {
    setFormData({
      pacote: '', nome: '', sobrenome: '', telefone: '', cidade: '',
      convidados: 30, dataEvento: '', tipoEvento: '',
      tiposDrinks: [], drinksEscolhidos: [],
      upsellChopp: false, upsellFrozen: false,
    })
    setCurrentStep(0)
    setIsSuccess(false)
    setErrors({})
  }, [])

  /* ============================
     Render Steps
     ============================ */
  const renderStep = () => {
    switch (currentStep) {
      /* ---- Step 0: Package Selection ---- */
      case 0:
        return (
          <div className="step-enter" key="step-0">
            <div className="packages-grid">
              {pacotes.filter(p => p.id !== 'standard-frozen').map(p => (
                <button
                  key={p.id}
                  type="button"
                  id={`pacote-${p.id}`}
                  className={`package-card ${formData.pacote === p.id ? 'package-card--selected' : ''} ${p.popular ? 'package-card--popular' : ''}`}
                  onClick={() => updateField('pacote', p.id)}
                >
                  {p.popular && <span className="package-card__badge">🔥 Mais contratado</span>}
                  <span className="package-card__emoji">{p.emoji}</span>
                  <h3 className="package-card__name">{p.name}</h3>
                  <div className="package-card__price">
                    <span className="package-card__price-value">{p.price}</span>
                    <span className="package-card__price-label">/{p.priceLabel}</span>
                  </div>
                  <ul className="package-card__features">
                    {p.features.map((f, i) => (
                      <li key={i}><FiCheck size={14} /> {f}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            {errors.pacote && <span className="form-error" style={{textAlign:'center',display:'block',marginTop:12}}>{errors.pacote}</span>}
          </div>
        )

      /* ---- Step 1: Event Details ---- */
      case 1:
        return (
          <div className="step-enter" key="step-1">
            <div className="form-group">
              <label className="form-label">Quantidade de Convidados</label>
              <div className="slider-container">
                <div className="slider-value">
                  {formData.convidados} <span>convidados</span>
                </div>
                <input
                  type="range"
                  id="convidados"
                  className="form-slider"
                  min="10"
                  max="500"
                  step="5"
                  value={formData.convidados}
                  onChange={e => updateField('convidados', Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, var(--primary) ${((formData.convidados - 10) / 490) * 100}%, var(--bg-input) ${((formData.convidados - 10) / 490) * 100}%)`
                  }}
                />
                <div className="slider-labels">
                  <span>10</span>
                  <span>Número total de convidados</span>
                  <span>500</span>
                </div>
              </div>
            </div>

            <div className="form-group">
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
          </div>
        )

      /* ---- Step 2: Drink Types ---- */
      case 2:
        return (
          <div className="step-enter" key="step-2">
            <div className="form-group">
              <label className="form-label">Selecione os tipos de drinks desejados</label>
              <div className="chips-grid">
                {tiposDrinks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    id={`drink-type-${t.id}`}
                    className={`chip ${formData.tiposDrinks.includes(t.id) ? 'chip--selected' : ''}`}
                    onClick={() => toggleArrayField('tiposDrinks', t.id)}
                  >
                    <span className="chip__icon">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.tiposDrinks && <span className="form-error">{errors.tiposDrinks}</span>}
            </div>
          </div>
        )

      /* ---- Step 3: Choose Drinks ---- */
      case 3:
        return (
          <div className="step-enter" key="step-3">
            <div className="form-group">
              <label className="form-label">Escolha até {maxDrinks} drinks</label>
              <div className="drinks-grid">
                {drinksMenu.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    id={`drink-${d.id}`}
                    className={`drink-card ${formData.drinksEscolhidos.includes(d.id) ? 'drink-card--selected' : ''}`}
                    onClick={() => toggleArrayField('drinksEscolhidos', d.id)}
                  >
                    {d.image ? (
                      <div className="drink-card__image-container" style={{
                        width: 70, height: 70, borderRadius: 'var(--radius-sm)', overflow: 'hidden', 
                        marginBottom: 8, border: '1px solid var(--primary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 1, flexShrink: 0
                      }}>
                        <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <span className="drink-card__emoji">{d.emoji}</span>
                    )}
                    <span className="drink-card__name">{d.name}</span>
                  </button>
                ))}
              </div>
              <div className="drinks-counter">
                <strong>{formData.drinksEscolhidos.length}</strong> de <strong>{maxDrinks}</strong> drinks selecionados
              </div>
              {errors.drinksEscolhidos && <span className="form-error">{errors.drinksEscolhidos}</span>}
            </div>
          </div>
        )

      /* ---- Step 4: Upsell ---- */
      case 4:
        return (
          <div className="step-enter" key="step-4">
            <div className="upsell-container" style={{display:'flex', flexDirection:'column', gap:24}}>
              
              {/* Highlighted Frozen Upsell */}
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
                        + R$ 250,00 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#A0A0A0' }}>(Adicional Fixo)</span>
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
        )

      /* ---- Step 5: Personal Info ---- */
      case 5:
        return (
          <div className="step-enter" key="step-5">
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
              <label htmlFor="cidade" className="form-label">Cidade</label>
              <select
                id="cidade"
                className={`form-select ${errors.cidade ? 'form-input--error' : ''}`}
                value={formData.cidade}
                onChange={e => updateField('cidade', e.target.value)}
              >
                <option value="">Selecione sua cidade</option>
                {cidades.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.cidade && <span className="form-error">{errors.cidade}</span>}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  /* ============================
     Main Render
     ============================ */
  return (
    <>
      {/* Background Effects */}
      <div className="bg-effects">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>
      <div className="bg-grid" />

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
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: 140, 
              height: 'auto', 
              marginBottom: 24, 
              filter: 'drop-shadow(0 0 20px rgba(203, 161, 83, 0.4))' 
            }} 
          />
          <h1 className="header__title">Laboratório de Drinks</h1>
          <p className="header__subtitle">Desperte a química perfeita no seu evento com drinks inovadores</p>
        </header>

        {!isSuccess ? (
          <>
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
              <h2 className="success-screen__title">Pedido Gerado!</h2>
              <p className="success-screen__text">
                Obrigado, <strong>{formData.nome}</strong>! Quase tudo pronto para o seu evento.
                <br /><br />
                Para receber o seu orçamento agora mesmo, clique no botão abaixo e nos envie uma mensagem no WhatsApp.
              </p>
              
              <div style={{display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:300}}>
                <a
                  href={`https://wa.me/5561999999999?text=${encodeURIComponent(`Olá! Acabei de preencher o formulário para o meu evento (Pacote ${formData.pacote}). Meu nome é ${formData.nome} ${formData.sobrenome}.`)}`}
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
