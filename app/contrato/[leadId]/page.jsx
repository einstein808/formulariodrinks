"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, onValue, update, push } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiUser, FiCalendar, FiBookOpen, FiArrowRight, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Image from 'next/image';

// Drinks will be loaded dynamically from Firebase Database config/drinks

const getRecommendation = (guestsCount) => {
  const qty = parseInt(guestsCount || 0, 10);
  if (qty <= 0) return { barmans: 1, ajudantes: 0 };
  if (qty <= 60) return { barmans: 1, ajudantes: 1 };
  if (qty <= 100) return { barmans: 2, ajudantes: 0 };
  
  const extras = qty - 100;
  const staffExtra = Math.ceil(extras / 40);
  const barmans = 2 + Math.floor(staffExtra / 2);
  const ajudantes = Math.ceil(staffExtra / 2);
  return { barmans, ajudantes };
};

const isNextImageAllowed = (src) => {
  if (!src) return false;
  if (src.startsWith('/') || src.startsWith('.')) return true;
  return src.includes('s3.gabryelamaro.com');
};

export default function ClienteContratoPage() {
  const { leadId } = useParams();
  const [loading, setLoading] = useState(true);
  const [leadExists, setLeadExists] = useState(false);
  const [pacotes, setPacotes] = useState([]);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [allDrinks, setAllDrinks] = useState([]);
  const [generalConfig, setGeneralConfig] = useState({});

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    whatsapp: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    referencia: '',
    data: '',
    hora: '',
    duracao: '5',
    convidados: '',
    Servico: 'Pacote Inicial',
    tipodrink: 'Com e sem álcool',
    drinks_alcool: [],
    drinks_sofisticados: [],
    drinks_sem_alcool: [],
    drinks_frozen: [],
    barmans: 1,
    ajudantes: 0,
    autorizarimagem: true,
    coposDeVidro: false
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // 1. Fetch config/pacotes
    const pacotesRef = ref(db, 'config/pacotes');
    const unsubscribePacotes = onValue(pacotesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pacotesArray = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setPacotes(pacotesArray);
      }
    });

    // 2. Fetch lead details
    const fetchLeadData = async () => {
      try {
        // Fetch general config
        const generalSnapshot = await get(ref(db, 'config/general'));
        if (generalSnapshot.exists()) {
          setGeneralConfig(generalSnapshot.val());
        }
        // Fetch drinks first
        let loadedDrinks = [];
        const drinksSnapshot = await get(ref(db, 'config/drinksMenu'));
        if (drinksSnapshot.exists()) {
          const data = drinksSnapshot.val();
          loadedDrinks = Object.entries(data)
            .map(([id, val]) => ({
              id: id,
              nameKey: val.name || id,
              rawName: val.name || id,
              name: `${val.emoji || '🍹'} ${val.name || id}`,
              desc: val.receita ? val.receita.map(r => r.insumo).filter(Boolean).join(', ') : '',
              image: val.image || '',
              category: val.category || (val.isNonAlcoholic ? 'sem_alcool' : 'alcool'),
              order: val.order ?? 0
            }))
            .sort((a, b) => a.order - b.order);
          setAllDrinks(loadedDrinks);
        }

        const snapshot = await get(ref(db, `leads/${leadId}`));
        if (snapshot.exists()) {
          const lead = snapshot.val();
          setLeadExists(true);

          // Map drinks selected
          const mappedAlcool = [];
          const mappedSofisticados = [];
          const mappedNA = [];
          const mappedFrozen = [];

          if (lead.drinksEscolhidos) {
            lead.drinksEscolhidos.forEach(drinkId => {
              const found = loadedDrinks.find(d => d.id === drinkId || d.nameKey === drinkId);
              if (found) {
                if (found.category === 'alcool') mappedAlcool.push(found.id);
                else if (found.category === 'sofisticado') mappedSofisticados.push(found.id);
                else if (found.category === 'sem_alcool') mappedNA.push(found.id);
                else if (found.category === 'frozen') mappedFrozen.push(found.id);
              } else {
                if (drinkId.toLowerCase().includes('sem álcool') || drinkId.toLowerCase().includes('sem alcool')) {
                  mappedNA.push(drinkId);
                } else if (drinkId.toLowerCase().includes('aperol') || drinkId.toLowerCase().includes('negroni') || drinkId.toLowerCase().includes('lagoa azul')) {
                  mappedSofisticados.push(drinkId);
                } else {
                  mappedAlcool.push(drinkId);
                }
              }
            });
          }

          // Map service / packet
          let servicoText = lead.pacote || '';
          if (servicoText) {
            if (servicoText.toLowerCase().includes('premium')) servicoText = 'Premium';
            else if (servicoText.toLowerCase().includes('inicial') || servicoText.toLowerCase().includes('standard')) servicoText = 'Standard';
            else if (servicoText.toLowerCase().includes('ajudante')) servicoText = 'Mão de Obra + Ajudante';
            else if (servicoText.toLowerCase().includes('obra')) servicoText = 'Mão de Obra';
          }

          // Map drink types
          let tipodrink = 'Com e sem álcool';
          if (lead.tiposDrinks) {
            const temAlcool = lead.tiposDrinks.includes('alcool') || lead.tiposDrinks.includes('alcoólicos');
            const temSemAlcool = lead.tiposDrinks.includes('sem_alcool') || lead.tiposDrinks.includes('não-alcoólicos');
            if (temAlcool && temSemAlcool) tipodrink = 'Com e sem álcool';
            else if (temAlcool) tipodrink = 'Com álcool';
            else if (temSemAlcool) tipodrink = 'Sem álcool';
          }

          const isMaoDeObraPkg = (servicoText || '').toLowerCase().includes('mão de obra');
          let barmansVal = lead.barmans !== undefined ? lead.barmans : 1;
          let ajudantesVal = lead.ajudantes !== undefined ? lead.ajudantes : 0;
          if (isMaoDeObraPkg && lead.barmans === undefined && lead.ajudantes === undefined && lead.convidados) {
            const rec = getRecommendation(lead.convidados);
            barmansVal = rec.barmans;
            ajudantesVal = rec.ajudantes;
          }

          setFormData({
            nome: `${lead.nome || ''} ${lead.sobrenome || ''}`.trim(),
            cpf: lead.cpf || '',
            whatsapp: lead.telefone ? maskWhatsApp(lead.telefone) : '',
            rua: lead.rua || '',
            numero: lead.numero || '',
            bairro: lead.bairro || '',
            cidade: lead.cidade || '',
            referencia: lead.referencia || '',
            data: lead.dataEvento || '',
            hora: lead.horarioEvento || '',
            duracao: lead.duracao || '5',
            convidados: lead.convidados || '',
            Servico: servicoText || 'Standard',
            tipodrink: tipodrink,
            drinks_alcool: mappedAlcool,
            drinks_sofisticados: mappedSofisticados,
            drinks_sem_alcool: mappedNA,
            drinks_frozen: lead.drinks_frozen || mappedFrozen,
            barmans: barmansVal,
            ajudantes: ajudantesVal,
            autorizarimagem: lead.autorizarimagem !== undefined ? lead.autorizarimagem : true,
            coposDeVidro: lead.coposDeVidro !== undefined ? lead.coposDeVidro : false
          });
        }
      } catch (err) {
        console.error("Erro ao carregar dados do lead:", err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLeadData();
    }

    return () => unsubscribePacotes();
  }, [leadId]);

  // Sync drink selections on type changes
  useEffect(() => {
    if (formData.tipodrink === 'Com álcool') {
      setFormData(prev => ({ ...prev, drinks_sem_alcool: [] }));
    } else if (formData.tipodrink === 'Sem álcool') {
      setFormData(prev => ({ ...prev, drinks_alcool: [], drinks_sofisticados: [], drinks_frozen: [] }));
    }
  }, [formData.tipodrink]);

  const isPremium = (formData.Servico || '').toLowerCase().includes('premium');
  const isFrozen = (formData.Servico || '').toLowerCase().includes('frozen') || isPremium;
  const isMaoDeObra = (formData.Servico || '').toLowerCase().includes('mão de obra');

  const DRINKS_ALCOOL = allDrinks.filter(d => d.category === 'alcool');
  const DRINKS_NA = allDrinks.filter(d => d.category === 'sem_alcool');
  const DRINKS_SOFISTICADOS = allDrinks.filter(d => d.category === 'sofisticado');
  const DRINKS_FROZEN = allDrinks.filter(d => d.category === 'frozen');

  const limitAlcoolTotal = isPremium ? 6 : 5;
  const limitNA = 2;
  const limitSofisticado = isPremium ? 1 : 0;
  const limitFrozen = isFrozen ? 2 : 0;

  const countAlcool = formData.drinks_alcool.length + formData.drinks_sofisticados.length + (formData.drinks_frozen || []).length;
  const countNA = formData.drinks_sem_alcool.length;
  const countSofisticados = formData.drinks_sofisticados.length;
  const countFrozen = (formData.drinks_frozen || []).length;

  const showAlcoolGroup = formData.tipodrink === 'Com álcool' || formData.tipodrink === 'Com e sem álcool' || formData.tipodrink === '';
  const showNAGroup = formData.tipodrink === 'Sem álcool' || formData.tipodrink === 'Com e sem álcool' || formData.tipodrink === '';
  const disableAlcoolGroup = formData.tipodrink === 'Sem álcool';
  const disableNAGroup = formData.tipodrink === 'Com álcool';

  // Financial calculations helper
  const getFinancials = () => {
    const convidadosInformados = parseInt(formData.convidados || 0, 10);
    const minimoConvidados = 40;
    const barmansCount = parseInt(formData.barmans !== undefined ? formData.barmans : 1, 10);
    const ajudantesCount = parseInt(formData.ajudantes !== undefined ? formData.ajudantes : 0, 10);

    // Localizar pacote no Firebase config
    const pacote = pacotes.find(p => p.name === formData.Servico);
    let valorPorConvidado = 0;
    let valorBase = 0;
    let isPerPerson = true;

    if (isMaoDeObra) {
      isPerPerson = false;
      const barmansBase = barmansCount > 0 ? 350 + (barmansCount - 1) * 200 : 0;
      valorBase = barmansBase + (ajudantesCount * 170);
    } else if (pacote) {
      const label = (pacote.priceLabel || '').toLowerCase();
      isPerPerson = label.includes('pessoa') || label.includes('convidado') || label.includes('cliente');
      const numericPrice = parseFloat((pacote.price || '').replace(/[^\d]/g, '')) || 0;
      
      if (isPerPerson) {
        valorPorConvidado = numericPrice;
      } else {
        valorBase = numericPrice;
      }
    } else {
      // Fallback switch case para nomes conhecidos
      if (formData.Servico === 'Pacote Inicial' || formData.Servico === 'Standard') {
        valorPorConvidado = 30;
      } else if (formData.Servico === 'Pacote Premium' || formData.Servico === 'Premium' || formData.Servico === 'Standard + Frozen') {
        valorPorConvidado = formData.Servico.includes('Premium') ? 42 : 40;
      } else if (formData.Servico === 'Mão de Obra') {
        valorBase = 350;
        isPerPerson = false;
      } else if (formData.Servico === 'Mão de Obra + Ajudante') {
        valorBase = 520;
        isPerPerson = false;
      } else {
        isPerPerson = false;
      }
    }

    // Duração do evento e limites de horas
    const totalHours = parseInt(formData.duracao || 5, 10);
    const hoursLimit = pacote && pacote.hoursLimit !== undefined ? parseInt(pacote.hoursLimit, 10) : 5;
    const additionalHours = Math.max(0, totalHours - hoursLimit);

    // Preço da hora adicional
    let precoHoraAdicional = 0;
    if (isMaoDeObra) {
      precoHoraAdicional = barmansCount * 70 + ajudantesCount * 40;
    } else if (pacote && pacote.extraHourPrice) {
      precoHoraAdicional = parseFloat(pacote.extraHourPrice.replace(/[^\d]/g, '')) || 0;
    } else {
      if (isPerPerson) {
        precoHoraAdicional = formData.Servico.includes('Premium') ? 7 : 5;
      } else {
        precoHoraAdicional = (formData.Servico === 'Mão de Obra + Ajudante') ? 110 : 70;
      }
    }

    // Aplicar preço mais alto caso cliente escolha mais de 5 horas de evento
    if (isPerPerson) {
      valorPorConvidado = valorPorConvidado + (additionalHours * precoHoraAdicional);
    } else {
      valorBase = valorBase + (additionalHours * precoHoraAdicional);
    }

    const convidadosCobrados = isPerPerson ? Math.max(convidadosInformados, minimoConvidados) : 0;
    let valorTotal = isPerPerson ? (convidadosCobrados * valorPorConvidado) : valorBase;

    // Adicional de copos de vidro: preço dinâmico por convidado
    const precoCopo = parseFloat(generalConfig.precoCopoVidro !== undefined ? generalConfig.precoCopoVidro : 5);
    if (formData.coposDeVidro) {
      valorTotal += precoCopo * convidadosInformados;
    }

    const parcela1 = +(valorTotal / 2).toFixed(2);
    const parcela2 = +(valorTotal - parcela1).toFixed(2);

    const formatBRL = (val) => {
      return Number(val).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const formatBRLCurrency = (val) => {
      return Number(val).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    const formatDateBR = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const hojeFormatado = `${dia}/${mes}/${ano}`;

    // Somar hora inicial + duração
    let horaFim = '';
    if (formData.hora && formData.duracao) {
      const [h, m] = formData.hora.split(':').map(Number);
      const fim = new Date();
      fim.setHours(h, m || 0, 0, 0);
      fim.setHours(fim.getHours() + parseInt(formData.duracao, 10));
      horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
    }
    const horarioEvento = formData.hora && horaFim ? `${formData.hora} às ${horaFim}` : '';

    // Divisão para Mão de Obra + Ajudante
    let valorAjudante = 0;
    let valorMaoDeObra = 0;
    if (!isPerPerson) {
      if (isMaoDeObra) {
        valorAjudante = ajudantesCount * 170 + (additionalHours * ajudantesCount * 40);
        valorMaoDeObra = valorTotal - valorAjudante;
      } else if (formData.Servico === 'Mão de Obra + Ajudante') {
        const precoHoraAdicionalAjudante = pacote && pacote.extraHourPrice ? (precoHoraAdicional * (40 / 110)) : 40;
        valorAjudante = 170 + (additionalHours * precoHoraAdicionalAjudante);
        valorMaoDeObra = valorTotal - valorAjudante;
      } else {
        valorMaoDeObra = valorTotal;
      }
    }

    // Cálculo das taxas de Hora Extra on-the-spot para os contratos
    const valorHoraExtraStandard = isPerPerson ? (valorTotal / 5) * 1.3 : 0;
    
    let valorHoraExtraBarman = 0;
    let valorHoraExtraAjudante = 0;
    if (!isPerPerson) {
      if (isMaoDeObra) {
        valorHoraExtraBarman = 70;
        valorHoraExtraAjudante = 40;
      } else if (formData.Servico === 'Mão de Obra + Ajudante') {
        const totalExtra = pacote && pacote.extraHourPrice ? precoHoraAdicional : 110;
        valorHoraExtraBarman = pacote && pacote.extraHourPrice ? (totalExtra * (70 / 110)) : 70;
        valorHoraExtraAjudante = pacote && pacote.extraHourPrice ? (totalExtra * (40 / 110)) : 40;
      } else {
        valorHoraExtraBarman = pacote && pacote.extraHourPrice ? precoHoraAdicional : 70;
      }
    }

    return {
      convidados_informados: convidadosInformados,
      minimo_convidados: isPerPerson ? minimoConvidados : 0,
      convidados_cobrados: isPerPerson ? convidadosCobrados : 0,
      valor_por_convidado: valorPorConvidado,
      valor_por_convidado_formatado: formatBRL(valorPorConvidado),
      valor_total: valorTotal,
      valor_total_formatado: isPerPerson ? formatBRL(valorTotal) : formatBRLCurrency(valorTotal),
      
      parcela_1_valor: parcela1,
      parcela_1_valor_formatado: formatBRL(parcela1),
      parcela_1_data: hojeFormatado,

      parcela_2_valor: parcela2,
      parcela_2_valor_formatado: formatBRL(parcela2),
      parcela_2_data: formatDateBR(formData.data),

      // Mão de Obra extras (HTML1 expects these variables)
      valor_entrada: parcela1,
      valor_entrada_formatado: formatBRLCurrency(parcela1),
      valor_final: parcela2,
      valor_final_formatado: formatBRLCurrency(parcela2),
      valor_mao_de_obra: isPerPerson ? 0 : valorMaoDeObra,
      valor_mao_de_obra_formatado: isPerPerson ? '' : formatBRLCurrency(valorMaoDeObra),
      valor_ajudante: valorAjudante,
      valor_ajudante_formatado: isPerPerson ? '' : (valorAjudante > 0 ? formatBRLCurrency(valorAjudante) : ''),
      
      // Hora Extra taxas pré-calculadas
      valor_hora_extra: valorHoraExtraStandard,
      valor_hora_extra_formatado: formatBRL(valorHoraExtraStandard),
      valor_hora_extra_barman: valorHoraExtraBarman,
      valor_hora_extra_barman_formatado: formatBRL(valorHoraExtraBarman),
      valor_hora_extra_ajudante: valorHoraExtraAjudante,
      valor_hora_extra_ajudante_formatado: formatBRL(valorHoraExtraAjudante),

      data_formatada: formatDateBR(formData.data),
      hora_inicio: formData.hora || '',
      hora_fim: horaFim,
      horario_evento: horarioEvento,
      data_contrato_formatada: hojeFormatado,
      local_data_assinatura: `Juiz de Fora - MG, ${hojeFormatado}`
    };
  };

  const financials = getFinancials();

  const maskCPF = (value) => {
    let v = value.replace(/\D/g, '');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v.substring(0, 14);
  };

  const maskWhatsApp = (value) => {
    let v = value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
    return v.substring(0, 15);
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0; let resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;
    return true;
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpf') finalValue = maskCPF(value);
    if (name === 'whatsapp') finalValue = maskWhatsApp(value);

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleDrink = (group, id) => {
    setFormData(prev => {
      const isSelected = prev[group].includes(id);
      
      if (!isSelected) {
        if (group === 'drinks_sem_alcool' && countNA >= limitNA) {
          alert(`Você pode escolher no máximo ${limitNA} drinks sem álcool.`);
          return prev;
        }
        if (group === 'drinks_sofisticados') {
          if (countSofisticados >= limitSofisticado) {
            alert(`Você pode escolher no máximo ${limitSofisticado} drinks sofisticados.`);
            return prev;
          }
          if (countAlcool >= limitAlcoolTotal) {
            alert(`Você pode escolher no máximo ${limitAlcoolTotal} drinks no total do bar.`);
            return prev;
          }
        }
        if (group === 'drinks_frozen') {
          if (countFrozen >= limitFrozen) {
            alert(`Você pode escolher no máximo ${limitFrozen} drinks frozen.`);
            return prev;
          }
          if (countAlcool >= limitAlcoolTotal) {
            alert(`Você pode escolher no máximo ${limitAlcoolTotal} drinks no total do bar.`);
            return prev;
          }
        }
        if (group === 'drinks_alcool' && countAlcool >= limitAlcoolTotal) {
          alert(`Você pode escolher no máximo ${limitAlcoolTotal} drinks no total do bar.`);
          return prev;
        }
      }

      return {
        ...prev,
        [group]: isSelected ? prev[group].filter(d => d !== id) : [...prev[group], id]
      };
    });
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.nome) newErrors.nome = 'Nome completo é obrigatório';
      if (!formData.cpf || !validarCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
      const whatsNumbers = formData.whatsapp.replace(/\D/g, '');
      if (whatsNumbers.length < 10) newErrors.whatsapp = 'WhatsApp inválido';
      if (!formData.rua) newErrors.rua = 'Rua é obrigatória';
      if (!formData.numero) newErrors.numero = 'Número é obrigatório';
      if (!formData.bairro) newErrors.bairro = 'Bairro é obrigatório';
      if (!formData.cidade) newErrors.cidade = 'Cidade é obrigatória';
    }
    if (step === 2) {
      if (!formData.data) newErrors.data = 'Data é obrigatória';
      if (!formData.hora) newErrors.hora = 'Hora de início é obrigatória';
      if (!formData.convidados) newErrors.convidados = 'Número de convidados é obrigatório';
      if (!formData.Servico) newErrors.Servico = 'Tipo de Serviço é obrigatório';
      if (!formData.tipodrink) newErrors.tipodrink = 'Tipo de Drink é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };
  
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;

    if (formData.tipodrink !== 'Sem álcool' && countAlcool > limitAlcoolTotal) return;
    if (formData.tipodrink !== 'Com álcool' && countNA > limitNA) return;
    if (countSofisticados > limitSofisticado) return;
    if (countFrozen > limitFrozen) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // 1. Save data back to Firebase Lead
      const chosenDrinks = [...formData.drinks_alcool, ...formData.drinks_sofisticados, ...formData.drinks_sem_alcool, ...(formData.drinks_frozen || [])];
      
      let databaseTiposDrinks = 'alcool_sem_alcool';
      if (formData.tipodrink === 'Com álcool') databaseTiposDrinks = 'alcool';
      else if (formData.tipodrink === 'Sem álcool') databaseTiposDrinks = 'sem_alcool';

      await update(ref(db, `leads/${leadId}`), {
        cpf: formData.cpf,
        rua: formData.rua,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        referencia: formData.referencia,
        dataEvento: formData.data,
        horarioEvento: formData.hora,
        duracao: formData.duracao,
        convidados: formData.convidados,
        pacote: formData.Servico,
        tiposDrinks: databaseTiposDrinks,
        drinksEscolhidos: chosenDrinks,
        drinks_frozen: formData.drinks_frozen || [],
        barmans: formData.barmans !== undefined ? parseInt(formData.barmans, 10) : 1,
        ajudantes: formData.ajudantes !== undefined ? parseInt(formData.ajudantes, 10) : 0,
        autorizarimagem: formData.autorizarimagem !== undefined ? formData.autorizarimagem : true,
        coposDeVidro: formData.coposDeVidro || false,
        // Calculated values
        valorTotal: financials.valor_total,
        valorTotalFormatado: financials.valor_total_formatado,
        parcela1Valor: financials.parcela_1_valor,
        parcela2Valor: financials.parcela_2_valor,
      });

      // Log contract generation in lead messages
      try {
        await push(ref(db, `leads/${leadId}/messages`), {
          type: 'contrato_gerado',
          success: true,
          sentAt: Date.now()
        });
      } catch (err) {
        console.error('Error logging contract generation:', err);
      }

      // 2. Dispatch to the PDF generation Webhook (form details + financials) as JSON
      const mapKeysToNames = (keys) => {
        return (keys || []).map(key => {
          const found = allDrinks.find(d => d.id === key);
          return found ? found.rawName : key;
        });
      };

      const payload = {
        ...formData,
        drinks_alcool: mapKeysToNames(formData.drinks_alcool),
        drinks_sem_alcool: mapKeysToNames(formData.drinks_sem_alcool),
        drinks_sofisticados: mapKeysToNames(formData.drinks_sofisticados),
        drinks_frozen: mapKeysToNames(formData.drinks_frozen || []),
        precoCopoVidro: parseFloat(generalConfig.precoCopoVidro !== undefined ? generalConfig.precoCopoVidro : 5),
        ...financials
      };

      const response = await fetch('/api/gerar-contrato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao enviar dados para geração de contrato');
      
      setSubmitStatus('success');
      setStep(4);
    } catch(err) {
      console.error(err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070e09' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!leadExists) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#070e09', color: '#FFF', textAlign: 'center', padding: 24 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: 8 }}>Link de Contrato Expirado ou Inválido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Por favor, solicite um novo link de contrato com os administradores.</p>
      </div>
    );
  }

  const selectedPackage = pacotes.find(p => p.name === formData.Servico);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '850px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* LOGO HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img src="/logo.webp" alt="Logo Formulário Drinks" style={{ width: '120px', height: 'auto' }} />
        </div>

        {/* STEP STATUS INDICATOR */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: step === 1 ? 'var(--primary)' : 'inherit', fontWeight: step === 1 ? 'bold' : 'normal' }}>1. Contratante</span>
            <span style={{ color: step === 2 ? 'var(--primary)' : 'inherit', fontWeight: step === 2 ? 'bold' : 'normal' }}>2. Evento & Pacote</span>
            <span style={{ color: step === 3 ? 'var(--primary)' : 'inherit', fontWeight: step === 3 ? 'bold' : 'normal' }}>3. Bebidas</span>
          </div>
        )}

        {/* ── STEP 1: CONTRATANTE & ENDEREÇO ────────────────────── */}
        {step === 1 && (
          <div style={{ background: '#0a140d', padding: '28px', borderRadius: '16px', border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 10px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUser /> 1. Informações do Contratante & Endereço
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: '1.4' }}>
              Olá! Para gerarmos o seu contrato, preencha os seus dados de faturamento e o endereço onde o bar será montado.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nome Completo *</label>
                <input type="text" name="nome" className={`form-input ${errors.nome ? 'form-input--error' : ''}`} placeholder="Nome do titular do contrato" value={formData.nome} onChange={handleInput} />
                {errors.nome && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.nome}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>CPF *</label>
                  <input type="text" name="cpf" className={`form-input ${errors.cpf ? 'form-input--error' : ''}`} placeholder="000.000.000-00" value={formData.cpf} onChange={handleInput} />
                  {errors.cpf && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.cpf}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>WhatsApp *</label>
                  <input type="text" name="whatsapp" className={`form-input ${errors.whatsapp ? 'form-input--error' : ''}`} placeholder="(00) 00000-0000" value={formData.whatsapp} onChange={handleInput} />
                  {errors.whatsapp && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.whatsapp}</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#FFF', margin: 0 }}>Endereço de Montagem do Bar</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Rua *</label>
                    <input type="text" name="rua" className={`form-input ${errors.rua ? 'form-input--error' : ''}`} placeholder="Rua / Avenida" value={formData.rua} onChange={handleInput} />
                    {errors.rua && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.rua}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Número *</label>
                    <input type="text" name="numero" className={`form-input ${errors.numero ? 'form-input--error' : ''}`} placeholder="Nº" value={formData.numero} onChange={handleInput} />
                    {errors.numero && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.numero}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bairro *</label>
                    <input type="text" name="bairro" className={`form-input ${errors.bairro ? 'form-input--error' : ''}`} placeholder="Bairro" value={formData.bairro} onChange={handleInput} />
                    {errors.bairro && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.bairro}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Cidade *</label>
                    <input type="text" name="cidade" className={`form-input ${errors.cidade ? 'form-input--error' : ''}`} placeholder="Cidade" value={formData.cidade} onChange={handleInput} />
                    {errors.cidade && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.cidade}</span>}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Referência (Opcional)</label>
                  <input type="text" name="referencia" className="form-input" placeholder="Ex: Próximo à igreja matriz, portão verde" value={formData.referencia} onChange={handleInput} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px', marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Autoriza o uso de fotos/vídeos para divulgação? (LGPD) *
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, autorizarimagem: true }))}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid ' + (formData.autorizarimagem ? 'var(--primary)' : 'rgba(203, 161, 83, 0.15)'),
                    background: formData.autorizarimagem ? 'rgba(203, 161, 83, 0.15)' : 'transparent',
                    color: formData.autorizarimagem ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                >
                  Sim, autorizo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, autorizarimagem: false }))}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid ' + (!formData.autorizarimagem ? 'var(--primary)' : 'rgba(203, 161, 83, 0.15)'),
                    background: !formData.autorizarimagem ? 'rgba(203, 161, 83, 0.15)' : 'transparent',
                    color: !formData.autorizarimagem ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                >
                  Não autorizo
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn--primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Avançar <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: EVENTO & BAR CONFIG ──────────────────────── */}
        {step === 2 && (
          <div style={{ background: '#0a140d', padding: '28px', borderRadius: '16px', border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 10px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCalendar /> 2. Detalhes do Evento & Pacote
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: '1.4' }}>
              Os dados abaixo foram importados do seu orçamento inicial. Sinta-se livre para corrigir qualquer informação (como convidados, data ou alterar o pacote contratado) se necessário.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Data do Evento *</label>
                  <input type="date" name="data" className={`form-input ${errors.data ? 'form-input--error' : ''}`} value={formData.data} onChange={handleInput} />
                  {errors.data && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.data}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Hora de Início *</label>
                  <input type="time" name="hora" className={`form-input ${errors.hora ? 'form-input--error' : ''}`} value={formData.hora} onChange={handleInput} />
                  {errors.hora && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.hora}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Duração do Evento *</label>
                  <select name="duracao" className="form-input" value={formData.duracao} onChange={handleInput}>
                    {[4, 5, 6, 7, 8].map(h => <option value={h} key={h}>{h} horas</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nº de Convidados *</label>
                  <input type="number" name="convidados" className={`form-input ${errors.convidados ? 'form-input--error' : ''}`} min="1" value={formData.convidados} onChange={handleInput} />
                  {errors.convidados && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.convidados}</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#FFF', fontWeight: 'bold', marginBottom: '12px' }}>Tipo de Serviço (Pacote) *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {pacotes.map(p => (
                    <div
                      key={p.name}
                      onClick={() => handleInput({ target: { name: 'Servico', value: p.name } })}
                      style={{
                        padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: '1 1 calc(50% - 10px)',
                        border: formData.Servico === p.name ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: formData.Servico === p.name ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.02)',
                        color: formData.Servico === p.name ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.25s', minWidth: '130px', textAlign: 'center', fontSize: '0.88rem'
                      }}
                    >
                      {p.emoji || '📦'} {p.name}
                    </div>
                  ))}
                </div>
                {selectedPackage && (
                  <div style={{ marginTop: '14px', background: 'rgba(203, 161, 83, 0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)', lineHeight: '1.5' }}>
                    <strong>{selectedPackage.name}:</strong> {selectedPackage.features ? selectedPackage.features.join(' • ') : (isPremium ? 'Até 6 drinks alcoólicos no total (máximo 2 sofisticados) e 3 sem álcool.' : 'Até 5 drinks alcoólicos e 2 sem álcool.')}
                  </div>
                )}
              </div>

              {isMaoDeObra && (
                <div style={{
                  background: 'rgba(203, 161, 83, 0.03)',
                  border: '1px solid rgba(203, 161, 83, 0.15)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginTop: '10px'
                }}>
                  <h3 style={{
                    fontFamily: 'Cinzel, serif',
                    color: 'var(--primary)',
                    fontSize: '1.05rem',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🤵 Equipe de Mão de Obra
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Quantidade de Barmans</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, (formData.barmans !== undefined ? formData.barmans : 1) - 1);
                            setFormData(prev => ({ ...prev, barmans: val }));
                          }}
                          style={{
                            width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifycontent: 'center', userSelect: 'none', transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', minWidth: '24px', textAlign: 'center' }}>
                          {formData.barmans !== undefined ? formData.barmans : 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (formData.barmans !== undefined ? formData.barmans : 1) + 1;
                            setFormData(prev => ({ ...prev, barmans: val }));
                          }}
                          style={{
                            width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifycontent: 'center', userSelect: 'none', transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Quantidade de Ajudantes</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (formData.ajudantes !== undefined ? formData.ajudantes : 0) - 1);
                            setFormData(prev => ({ ...prev, ajudantes: val }));
                          }}
                          style={{
                            width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifycontent: 'center', userSelect: 'none', transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', minWidth: '24px', textAlign: 'center' }}>
                          {formData.ajudantes !== undefined ? formData.ajudantes : 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (formData.ajudantes !== undefined ? formData.ajudantes : 0) + 1;
                            setFormData(prev => ({ ...prev, ajudantes: val }));
                          }}
                          style={{
                            width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifycontent: 'center', userSelect: 'none', transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const rec = getRecommendation(formData.convidados);
                    const showApplyBtn = (formData.barmans !== rec.barmans || formData.ajudantes !== rec.ajudantes) && rec.barmans > 0;
                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: 'rgba(203, 161, 83, 0.06)',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        borderLeft: '4px solid var(--primary)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            🤵 <strong>Recomendação para {formData.convidados || 0} convidados:</strong> {rec.barmans} {rec.barmans === 1 ? 'Barman' : 'Barmans'} e {rec.ajudantes} {rec.ajudantes === 1 ? 'Ajudante' : 'Ajudantes'}.
                          </span>
                          {showApplyBtn && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, barmans: rec.barmans, ajudantes: rec.ajudantes }));
                              }}
                              style={{
                                background: 'var(--primary)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.1s, opacity 0.2s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              Aplicar Recomendação ✨
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#FFF', fontWeight: 'bold', marginBottom: '12px' }}>Tipos de Drink na Festa *</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Com álcool', 'Sem álcool', 'Com e sem álcool'].map(s => (
                    <div
                      key={s}
                      onClick={() => handleInput({ target: { name: 'tipodrink', value: s } })}
                      style={{
                        padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1, minWidth: '100px',
                        border: formData.tipodrink === s ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: formData.tipodrink === s ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.02)',
                        color: formData.tipodrink === s ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.25s', textAlign: 'center', fontSize: '0.85rem'
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* ADICIONAIS / OPCIONAIS */}
              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#FFF', fontWeight: 'bold', marginBottom: '12px' }}>Opcionais Adicionais</label>
                <div
                  onClick={() => setFormData(prev => ({ ...prev, coposDeVidro: !prev.coposDeVidro }))}
                  style={{
                    padding: '14px 16px', borderRadius: '8px', cursor: 'pointer',
                    border: formData.coposDeVidro ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.coposDeVidro ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.02)',
                    color: formData.coposDeVidro ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '12px'
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: formData.coposDeVidro ? 'var(--primary)' : 'transparent', flexShrink: 0
                  }}>
                    {formData.coposDeVidro && <span style={{ color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: formData.coposDeVidro ? 'var(--primary)' : '#FFF' }}>
                      Adicional de Copos de Vidro 🍷
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Fornecimento de copos de vidro para o evento (5 copos por convidado) • + R$ {parseFloat(generalConfig.precoCopoVidro !== undefined ? generalConfig.precoCopoVidro : 5).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por convidado
                    </span>
                  </div>
                </div>
              </div>

              {/* ESTIMATED FINANCIAL SUMMARY CARD */}
              {formData.Servico && (
                <div style={{
                  background: 'rgba(203, 161, 83, 0.05)',
                  border: '1px solid rgba(203, 161, 83, 0.25)',
                  borderRadius: '10px',
                  padding: '20px',
                  marginTop: '10px'
                }}>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 12px 0', fontFamily: 'Cinzel, serif', borderBottom: '1px solid rgba(203,161,83,0.1)', paddingBottom: '6px' }}>
                    💰 Resumo Financeiro Estimado
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Mínimo de Convidados:</span> {financials.minimo_convidados || 'N/A (Fixo)'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Convidados Cobrados:</span> {financials.convidados_cobrados || 'N/A (Fixo)'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Valor por Convidado:</span> {financials.valor_por_convidado ? `R$ ${financials.valor_por_convidado_formatado}` : 'N/A'}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#FFF' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>Valor Total:</span> {financials.valor_total_formatado.includes('R$') ? financials.valor_total_formatado : `R$ ${financials.valor_total_formatado}`}
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong>Forma de Pagamento sugerida (50/50):</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                      <li>Entrada: R$ {financials.parcela_1_valor_formatado} (no ato da assinatura)</li>
                      <li>Sinal Final: R$ {financials.parcela_2_valor_formatado} (no dia do evento: {financials.parcela_2_data || '—'})</li>
                    </ul>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button className="btn btn--secondary" onClick={prevStep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiArrowLeft /> Voltar
              </button>
              <button className="btn btn--primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Avançar <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DRINKS SELECTION ────────────────────────── */}
        {step === 3 && (
          <div style={{ background: '#0a140d', padding: '28px', borderRadius: '16px', border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 10px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiBookOpen /> 3. Escolha do Cardápio de Drinks
            </h2>

            {/* ALCOHOLIC DRINKS */}
            <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto' }}>
              <h3 style={{ color: '#FFF', fontSize: '1.05rem', margin: '0 0 4px 0' }}>Drinks Alcoólicos (Regulares)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 16px 0' }}>
                {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Selecione até ${limitAlcoolTotal} drinks no total do bar. (Selecionados: ${countAlcool} / ${limitAlcoolTotal})`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {DRINKS_ALCOOL.map(d => {
                  const isSelected = formData.drinks_alcool.includes(d.id);
                  const isLimitReached = !isSelected && countAlcool >= limitAlcoolTotal;
                  return (
                    <div
                      key={d.id}
                      onClick={() => !isLimitReached && toggleDrink('drinks_alcool', d.id)}
                      style={{
                        padding: '12px', borderRadius: '8px', border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.01)',
                        cursor: isLimitReached ? 'not-allowed' : 'pointer', opacity: isLimitReached ? 0.5 : 1,
                        display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                      }}>
                        {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      {d.image && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                          {isNextImageAllowed(d.image) ? (
                            <Image
                              src={d.image}
                              alt={d.rawName}
                              fill
                              sizes="40px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <img
                              src={d.image}
                              alt={d.rawName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.85rem' }}>{d.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', lineHeight: '1.2' }}>{d.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FROZEN DRINKS */}
            {isFrozen && (
              <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
                <h3 style={{ color: 'var(--primary)', fontSize: '1.05rem', margin: '0 0 4px 0' }}>Drinks Frozen (Consome limite do bar)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 16px 0' }}>
                  {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Máx ${limitFrozen} drinks frozen. (Selecionados: ${countFrozen} / ${limitFrozen})`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {DRINKS_FROZEN.map(d => {
                    const isSelected = (formData.drinks_frozen || []).includes(d.id);
                    const isLimitReached = !isSelected && (countFrozen >= limitFrozen || countAlcool >= limitAlcoolTotal);
                    return (
                      <div
                        key={d.id}
                        onClick={() => !isLimitReached && toggleDrink('drinks_frozen', d.id)}
                        style={{
                          padding: '12px', borderRadius: '8px', border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.01)',
                          cursor: isLimitReached ? 'not-allowed' : 'pointer', opacity: isLimitReached ? 0.5 : 1,
                          display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                        </div>
                        {d.image && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                            {isNextImageAllowed(d.image) ? (
                              <Image
                                src={d.image}
                                alt={d.rawName}
                                fill
                                sizes="40px"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <img
                                src={d.image}
                                alt={d.rawName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.85rem' }}>{d.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', lineHeight: '1.2' }}>{d.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PREMIUM / SOFISTICADOS DRINKS */}
            {isPremium && (
              <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
                <h3 style={{ color: 'var(--primary)', fontSize: '1.05rem', margin: '0 0 4px 0' }}>Drinks Sofisticados (Consome limite do bar)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 16px 0' }}>
                  {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Máx ${limitSofisticado} drink sofisticado. (Selecionados: ${countSofisticados} / ${limitSofisticado})`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {DRINKS_SOFISTICADOS.map(d => {
                    const isSelected = formData.drinks_sofisticados.includes(d.id);
                    const isLimitReached = !isSelected && (countSofisticados >= limitSofisticado || countAlcool >= limitAlcoolTotal);
                    return (
                      <div
                        key={d.id}
                        onClick={() => !isLimitReached && toggleDrink('drinks_sofisticados', d.id)}
                        style={{
                          padding: '12px', borderRadius: '8px', border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.01)',
                          cursor: isLimitReached ? 'not-allowed' : 'pointer', opacity: isLimitReached ? 0.5 : 1,
                          display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                        </div>
                        {d.image && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                            {isNextImageAllowed(d.image) ? (
                              <Image
                                src={d.image}
                                alt={d.rawName}
                                fill
                                sizes="40px"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <img
                                src={d.image}
                                alt={d.rawName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.85rem' }}>{d.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', lineHeight: '1.2' }}>{d.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NON-ALCOHOLIC DRINKS */}
            <div style={{ opacity: disableNAGroup ? 0.4 : 1, pointerEvents: disableNAGroup ? 'none' : 'auto', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '20px' }}>
              <h3 style={{ color: '#FFF', fontSize: '1.05rem', margin: '0 0 4px 0' }}>Drinks Sem Álcool (Extras)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 16px 0' }}>
                {disableNAGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Selecione até ${limitNA} drinks sem álcool. (Selecionados: ${countNA} / ${limitNA})`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {DRINKS_NA.map(d => {
                  const isSelected = formData.drinks_sem_alcool.includes(d.id);
                  const isLimitReached = !isSelected && countNA >= limitNA;
                  return (
                    <div
                      key={d.id}
                      onClick={() => !isLimitReached && toggleDrink('drinks_sem_alcool', d.id)}
                      style={{
                        padding: '12px', borderRadius: '8px', border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.01)',
                        cursor: isLimitReached ? 'not-allowed' : 'pointer', opacity: isLimitReached ? 0.5 : 1,
                        display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                      }}>
                        {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      {d.image && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                          {isNextImageAllowed(d.image) ? (
                            <Image
                              src={d.image}
                              alt={d.rawName}
                              fill
                              sizes="40px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <img
                              src={d.image}
                              alt={d.rawName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.85rem' }}>{d.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', lineHeight: '1.2' }}>{d.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {submitStatus === 'error' && (
              <div style={{ background: 'rgba(244, 67, 54, 0.12)', border: '1px solid #F44336', color: '#F44336', padding: '16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                Ocorreu um erro ao salvar suas escolhas ou ao gerar o contrato. Por favor, tente novamente ou fale com a nossa equipe.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button className="btn btn--secondary" onClick={prevStep} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiArrowLeft /> Voltar
              </button>
              <button className="btn btn--primary" onClick={handleSubmit} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSubmitting ? 'Enviando Dados... ⏳' : 'Finalizar & Gerar Contrato 🚀'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUCCESS VIEW ────────────────────────────── */}
        {step === 4 && (
          <div style={{ background: '#0a140d', padding: '48px 32px', borderRadius: '16px', border: '1px solid rgba(203, 161, 83, 0.25)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <FiCheckCircle size={64} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
            <h2 style={{ fontFamily: 'Cinzel, serif', color: '#FFF', fontSize: '1.8rem', margin: 0 }}>Tudo Pronto!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, maxWidth: '500px', lineHeight: '1.6' }}>
              Parabéns! Seus dados cadastrais e o cardápio de drinks da festa foram salvos com sucesso.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, maxWidth: '500px', lineHeight: '1.6' }}>
              O contrato em PDF com todas as cláusulas e o cardápio oficial selecionado está sendo gerado e será enviado no seu WhatsApp em breve para assinatura digital!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
