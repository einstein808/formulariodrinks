"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ref, get, onValue, update, push } from 'firebase/database';
import { db } from '../../../lib/firebase';
import AddressMapPicker from '../../../components/AddressMapPicker';
import { calculatePackagePrice, DEFAULT_MAO_DE_OBRA_TIERS } from '../../../lib/pricingUtils';
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

const maskWhatsApp = (value) => {
  if (!value) return '';
  let v = String(value).replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
};

const maskCPF = (value) => {
  if (!value) return '';
  let v = String(value).replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  if (v.length > 6) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  if (v.length > 3) return `${v.slice(0, 3)}.${v.slice(3)}`;
  return v;
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
    coposDeVidro: false,
    desconto: 0,
    aplicarDescontoMaoDeObra: false,
    abGroup: 'A'
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

        // Fetch pacotes config
        let loadedPacotes = [];
        const pacotesSnapshot = await get(ref(db, 'config/pacotes'));
        if (pacotesSnapshot.exists()) {
          loadedPacotes = Object.entries(pacotesSnapshot.val()).map(([id, val]) => ({ id, ...val }));
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
              }
            });
          }

          // Map service / packet
          let servicoText = lead.pacote || '';
          if (servicoText) {
            const foundPacote = loadedPacotes.find(p => p.id === servicoText || p.name.toLowerCase() === servicoText.toLowerCase());
            if (foundPacote) {
              servicoText = foundPacote.name;
            } else {
              if (servicoText.toLowerCase().includes('premium')) servicoText = 'Premium';
              else if (servicoText.toLowerCase().includes('frozen') || servicoText.toLowerCase().includes('standard + frozen')) servicoText = 'Standard + Frozen';
              else if (servicoText.toLowerCase().includes('inicial') || servicoText.toLowerCase().includes('standard')) servicoText = 'Standard';
              else if (servicoText.toLowerCase().includes('ajudante')) servicoText = 'Mão de Obra + Ajudante';
              else if (servicoText.toLowerCase().includes('obra')) servicoText = 'Mão de Obra';
            }
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
          let ajudantesVal = 0;
          if (lead.ajudantesCount !== undefined) {
            ajudantesVal = parseInt(lead.ajudantesCount, 10) || 0;
          } else if (lead.ajudantes !== undefined && typeof lead.ajudantes !== 'object') {
            ajudantesVal = parseInt(lead.ajudantes, 10) || 0;
          }

          if (isMaoDeObraPkg && lead.barmans === undefined && lead.ajudantesCount === undefined && typeof lead.ajudantes !== 'number' && lead.convidados) {
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
            lat: lead.lat || null,
            lng: lead.lng || null,
            cep: lead.cep || '',
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
            coposDeVidro: lead.coposDeVidro !== undefined ? lead.coposDeVidro : false,
            desconto: lead.financeiro?.desconto || 0,
            aplicarDescontoMaoDeObra: lead.financeiro?.aplicarDescontoMaoDeObra || false,
            abGroup: lead.abGroup || 'A'
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

  const servicoNorm = (formData.Servico || '').toLowerCase();
  const isExperimento = servicoNorm.includes('experimento');
  const isLaboratorio = servicoNorm.includes('laborat') || servicoNorm.includes('standard');
  const isReatividade = servicoNorm.includes('reatividade') || servicoNorm.includes('premium');
  const isPremium = isReatividade;
  const isFrozen = servicoNorm.includes('frozen') || isPremium;
  const isMaoDeObra = servicoNorm.includes('mão de obra') || servicoNorm.includes('mao de obra');

  const DRINKS_ALCOOL = allDrinks.filter(d => d.category === 'alcool');
  const DRINKS_NA = allDrinks.filter(d => d.category === 'sem_alcool');
  const DRINKS_SOFISTICADOS = allDrinks.filter(d => d.category === 'sofisticado');
  const DRINKS_FROZEN = allDrinks.filter(d => d.category === 'frozen');

  // Limite de drinks por pacote: Experimento = 4, Laboratório = 5, Reatividade = 6
  const limitAlcoolTotal = isReatividade ? 6 : (isExperimento ? 4 : 5);
  const limitNA = 2;
  const limitSofisticado = isReatividade ? 1 : 0;
  const limitFrozen = isFrozen ? 2 : 0;

  const countAlcool = formData.drinks_alcool.length + 
    (limitSofisticado > 0 ? formData.drinks_sofisticados.length : 0) + 
    (limitFrozen > 0 ? (formData.drinks_frozen || []).length : 0);
  const countNA = formData.drinks_sem_alcool.length;
  const countSofisticados = limitSofisticado > 0 ? formData.drinks_sofisticados.length : 0;
  const countFrozen = limitFrozen > 0 ? (formData.drinks_frozen || []).length : 0;

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

    const formatBRL = (val) => {
      return Number(val || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const formatBRLCurrency = (val) => {
      return Number(val || 0).toLocaleString('pt-BR', {
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
    const horarioEvento = formData.hora && horaFim ? `${formData.hora} às ${horaFim}` : (formData.hora || '');

    // Localizar pacote no Firebase config (suporta busca por id ou nome)
    const pacote = pacotes.find(p => 
      p.id === formData.pacote || 
      p.name === formData.Servico || 
      p.id === formData.Servico ||
      (p.name && formData.Servico && (
        p.name.toLowerCase() === formData.Servico.toLowerCase() ||
        formData.Servico.toLowerCase().includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(formData.Servico.toLowerCase())
      ))
    );

    const isGroupB = formData.abGroup === 'B';
    const isTier = (isGroupB && pacote && pacote.pricingMode === 'tier' && pacote.priceTiers && pacote.priceTiers.length > 0) || (pacote && pacote.pricingMode === 'tier' && pacote.priceTiers && pacote.priceTiers.length > 0) || isMaoDeObra;
    
    if (isTier) {
      const calc = calculatePackagePrice(pacote || { name: 'Mão de Obra', id: 'mao-de-obra', pricingMode: 'tier' }, convidadosInformados, formData.duracao || 5, {
        upsellFrozen: formData.upsellFrozen,
        abGroup: formData.abGroup || 'A'
      });

      const precoCopo = parseFloat(generalConfig?.precoCopoVidro !== undefined && generalConfig?.precoCopoVidro !== '' ? generalConfig.precoCopoVidro : 3.5);
      const valorCopos = (isMaoDeObra && formData.coposDeVidro) ? (convidadosInformados * precoCopo) : 0;

      let valorTotal = calc.finalPrice + valorCopos;
      const descontoValue = (isMaoDeObra && !formData.aplicarDescontoMaoDeObra) ? 0 : (parseFloat(formData.desconto) || 0);
      const valorOriginal = valorTotal;
      valorTotal = Math.max(0, valorTotal - descontoValue);

      const parcela1 = +(valorTotal / 2).toFixed(2);
      const parcela2 = +(valorTotal - parcela1).toFixed(2);

      return {
        is_per_person: false,
        is_tier: true,
        tier_label: calc.tierLabel || '',
        convidados_informados: convidadosInformados,
        minimo_convidados: 0,
        convidados_cobrados: convidadosInformados,
        valor_por_convidado: 0,
        valor_por_convidado_formatado: '0,00',
        valor_original: valorOriginal,
        valor_original_formatado: formatBRL(valorOriginal),
        desconto: descontoValue,
        desconto_formatado: formatBRL(descontoValue),
        valor_total: valorTotal,
        valor_total_formatado: formatBRLCurrency(valorTotal),
        
        parcela_1_valor: parcela1,
        parcela_1_valor_formatado: formatBRL(parcela1),
        parcela_1_data: hojeFormatado,

        parcela_2_valor: parcela2,
        parcela_2_valor_formatado: formatBRL(parcela2),
        parcela_2_data: formatDateBR(formData.data),

        valor_entrada: parcela1,
        valor_entrada_formatado: formatBRLCurrency(parcela1),
        valor_final: parcela2,
        valor_final_formatado: formatBRLCurrency(parcela2),
        valor_mao_de_obra: valorTotal,
        valor_mao_de_obra_formatado: formatBRLCurrency(valorTotal),
        valor_ajudante: 0,
        valor_ajudante_formatado: '',
        
        valor_hora_extra: calc.tier?.extraHourPrice || (isMaoDeObra ? (barmansCount * 70 + ajudantesCount * 40) : 0),
        valor_hora_extra_formatado: formatBRL(calc.tier?.extraHourPrice || (isMaoDeObra ? (barmansCount * 70 + ajudantesCount * 40) : 0)),
        valor_hora_extra_barman: 70,
        valor_hora_extra_barman_formatado: '70,00',
        valor_hora_extra_ajudante: 40,
        valor_hora_extra_ajudante_formatado: '40,00',

        data_formatada: formatDateBR(formData.data),
        hora_inicio: formData.hora || '',
        hora_fim: horaFim,
        horario_evento: horarioEvento,
        data_contrato_formatada: hojeFormatado,
        local_data_assinatura: `Juiz de Fora - MG, ${hojeFormatado}`
      };
    }

    let valorPorConvidado = 0;
    let valorBase = 0;
    let isPerPerson = true;

    const rawPrice = (isGroupB && pacote?.priceB && pacote.priceB.trim() !== '') ? pacote.priceB : (pacote?.price || '');

    if (isMaoDeObra) {
      isPerPerson = false;
      const barmansBase = barmansCount > 0 ? 350 + (barmansCount - 1) * 200 : 0;
      valorBase = barmansBase + (ajudantesCount * 170);
    } else if (pacote) {
      const label = (pacote.priceLabel || '').toLowerCase();
      isPerPerson = label.includes('pessoa') || label.includes('convidado') || label.includes('cliente');
      const numericPrice = parseFloat(rawPrice.replace(/[^\d]/g, '')) || 0;
      
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

    // Duração do evento e limites de horas (fixado em 5 horas)
    const totalHours = parseInt(formData.duracao || 5, 10);
    const hoursLimit = 5;
    const additionalHours = Math.max(0, totalHours - hoursLimit);

    // Preço da hora adicional
    let precoHoraAdicional = 0;
    if (isMaoDeObra) {
      precoHoraAdicional = barmansCount * 70 + ajudantesCount * 40;
    } else if (pacote && pacote.extraHourPrice && parseFloat(String(pacote.extraHourPrice).replace(/[^\d]/g, '')) > 0) {
      precoHoraAdicional = parseFloat(String(pacote.extraHourPrice).replace(/[^\d]/g, '')) || 0;
    } else {
      if (isPerPerson) {
        precoHoraAdicional = (formData.Servico || '').toLowerCase().includes('premium') ? 7 : 5;
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

    // Adicional de copos de vidro: apenas para Mão de Obra
    const precoCopo = parseFloat(generalConfig?.precoCopoVidro !== undefined && generalConfig?.precoCopoVidro !== '' ? generalConfig.precoCopoVidro : 3.5);
    if (isMaoDeObra && formData.coposDeVidro) {
      valorTotal += precoCopo * convidadosInformados;
    }

    const descontoValue = (isMaoDeObra && !formData.aplicarDescontoMaoDeObra) ? 0 : (parseFloat(formData.desconto) || 0);
    const valorOriginal = valorTotal;
    valorTotal = Math.max(0, valorTotal - descontoValue);

    const parcela1 = +(valorTotal / 2).toFixed(2);
    const parcela2 = +(valorTotal - parcela1).toFixed(2);

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
    let horaExtraRate = 0;
    let valorHoraExtraBarman = 0;
    let valorHoraExtraAjudante = 0;

    if (isPerPerson) {
      const rawExtra = pacote && pacote.extraHourPrice ? parseFloat(String(pacote.extraHourPrice).replace(/[^\d]/g, '')) || 0 : 0;
      const ratePerGuest = rawExtra > 0 ? rawExtra : ((formData.Servico || '').toLowerCase().includes('premium') ? 7 : 5);
      const convidadosParaCalc = Math.max(convidadosInformados || 0, minimoConvidados || 40);

      if (ratePerGuest > 20) {
        horaExtraRate = ratePerGuest;
      } else {
        horaExtraRate = ratePerGuest * convidadosParaCalc;
      }
    } else if (isMaoDeObra) {
      horaExtraRate = barmansCount * 70 + ajudantesCount * 40;
      valorHoraExtraBarman = 70;
      valorHoraExtraAjudante = 40;
    } else if (formData.Servico === 'Mão de Obra + Ajudante') {
      const totalExtra = pacote && pacote.extraHourPrice ? precoHoraAdicional : 110;
      valorHoraExtraBarman = pacote && pacote.extraHourPrice ? (totalExtra * (70 / 110)) : 70;
      valorHoraExtraAjudante = pacote && pacote.extraHourPrice ? (totalExtra * (40 / 110)) : 40;
      horaExtraRate = totalExtra;
    } else {
      horaExtraRate = pacote && pacote.extraHourPrice ? parseFloat(String(pacote.extraHourPrice).replace(/[^\d]/g, '')) || 70 : 70;
      valorHoraExtraBarman = horaExtraRate;
    }

    return {
      is_per_person: isPerPerson,
      is_tier: isTier,
      tier_label: '',
      convidados_informados: convidadosInformados,
      minimo_convidados: isPerPerson ? minimoConvidados : 0,
      convidados_cobrados: isPerPerson ? convidadosCobrados : 0,
      valor_por_convidado: valorPorConvidado,
      valor_por_convidado_formatado: formatBRL(valorPorConvidado),
      valor_original: valorOriginal,
      valor_original_formatado: formatBRL(valorOriginal),
      desconto: descontoValue,
      desconto_formatado: formatBRL(descontoValue),
      valor_total: valorTotal,
      valor_total_formatado: isTier ? formatBRLCurrency(valorTotal) : (isPerPerson ? formatBRL(valorTotal) : formatBRLCurrency(valorTotal)),
      
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
      valor_hora_extra: horaExtraRate,
      valor_hora_extra_formatado: formatBRL(horaExtraRate),
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
      const chosenDrinks = [
        ...formData.drinks_alcool,
        ...(limitSofisticado > 0 ? formData.drinks_sofisticados : []),
        ...formData.drinks_sem_alcool,
        ...(limitFrozen > 0 ? (formData.drinks_frozen || []) : [])
      ];

      // Dynamic shopping list calculation upon contract submission
      let calculatedShoppingList = null;
      try {
        const [drinksMenuSnap, shoppingConfigSnap] = await Promise.all([
          get(ref(db, 'config/drinksMenu')),
          get(ref(db, 'config/shoppingConfig'))
        ]);

        if (drinksMenuSnap.exists()) {
          const drinksConfig = drinksMenuSnap.val();
          const shoppingConfig = shoppingConfigSnap.exists() ? shoppingConfigSnap.val() : {};

          const convidadosVal = Math.max(Number(formData.convidados) || 0, 40);
          const totalDrinksFesta = Math.ceil(convidadosVal * 3.5);
          const margem = shoppingConfig.margemSeguranca ? (1 + (Number(shoppingConfig.margemSeguranca) / 100)) : 1.10;

          const agregadorInsumos = {};
          
          const selectedDrinksList = chosenDrinks.map(drinkId => {
            const rawDrink = drinksConfig[drinkId] || Object.values(drinksConfig).find(d => d.name === drinkId);
            return rawDrink ? { id: drinkId, ...rawDrink } : null;
          }).filter(Boolean);

          const selectedAlcool = selectedDrinksList.filter(d => d.category !== 'sem_alcool' && !d.isNonAlcoholic);
          const selectedSemAlcool = selectedDrinksList.filter(d => d.category === 'sem_alcool' || d.isNonAlcoholic);

          const pctSemAlcool = selectedSemAlcool.length > 0 ? (Number(shoppingConfig.nonAlcoholicPercentage) || 15) / 100 : 0;
          const pctAlcool = 1 - pctSemAlcool;

          const totalDrinksFestaAlcool = Math.ceil(totalDrinksFesta * pctAlcool);
          const totalDrinksFestaSemAlcool = Math.ceil(totalDrinksFesta * pctSemAlcool);

          const totalWeightAlcool = selectedAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);
          const totalWeightSemAlcool = selectedSemAlcool.reduce((sum, d) => sum + (Number(d.popularityWeight) || 5), 0);

          selectedDrinksList.forEach(drink => {
            const isNonAlc = drink.category === 'sem_alcool' || drink.isNonAlcoholic;
            const pesoDrink = Number(drink.popularityWeight) || 5;
            
            let proportion = 0;
            let drinksDesteTipo = 0;

            if (isNonAlc) {
              proportion = totalWeightSemAlcool > 0 ? pesoDrink / totalWeightSemAlcool : 1 / selectedSemAlcool.length;
              drinksDesteTipo = Math.ceil(totalDrinksFestaSemAlcool * proportion);
            } else {
              proportion = totalWeightAlcool > 0 ? pesoDrink / totalWeightAlcool : 1 / selectedAlcool.length;
              drinksDesteTipo = Math.ceil(totalDrinksFestaAlcool * proportion);
            }

            if (drink.receita && Array.isArray(drink.receita)) {
              drink.receita.forEach(item => {
                if (!item.insumo || !item.quantidade) return;
                
                const qtdTotalBase = Number(item.quantidade) * drinksDesteTipo;
                const qtdComMargem = qtdTotalBase * margem;
                
                const chaveBase = item.insumo.trim().toLowerCase();
                const chave = chaveBase.charAt(0).toUpperCase() + chaveBase.slice(1);
                
                if (!agregadorInsumos[chave]) {
                  agregadorInsumos[chave] = { qtd: 0, unidade: item.unidade || 'ml' };
                }
                agregadorInsumos[chave].qtd += qtdComMargem;
              });
            }
          });

          // Format Insumos
          const insumosFormatados = {};
          Object.entries(agregadorInsumos).forEach(([nome, data]) => {
            let qtdFinal = data.qtd;
            let undFinal = data.unidade;

            if (undFinal === 'ml') {
              qtdFinal = Math.ceil(qtdFinal / 1000);
              undFinal = 'Litros';
            } else if (undFinal === 'g' && qtdFinal >= 1000) {
              qtdFinal = Math.ceil(qtdFinal / 1000);
              undFinal = 'Kg';
            } else {
              qtdFinal = Math.ceil(qtdFinal);
            }
            insumosFormatados[nome] = `${qtdFinal} ${undFinal}`;
          });

          const DEFAULT_FIXED_ITEMS = [
            { id: 'sifao_espuma', nome: 'Sifão de Espuma (carga)', categoria: 'bar', tipoCalc: 'fixo', quantidade: 6, unidade: 'un' },
            { id: 'limoes', nome: 'Limões', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.04, unidade: 'kg' },
            { id: 'gelo', nome: 'Gelo', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.2, unidade: 'kg' },
            { id: 'hortela', nome: 'Hortelã', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.02, unidade: 'maço' },
            { id: 'decoracao', nome: 'Decoração de Mesa', categoria: 'decoracao', tipoCalc: 'fixo', quantidade: 1, unidade: 'kit' },
            { id: 'guardanapos', nome: 'Guardanapos', categoria: 'descartavel', tipoCalc: 'porConvidado', quantidade: 0.05, unidade: 'pct' },
            { id: 'canudos', nome: 'Canudos', categoria: 'descartavel', tipoCalc: 'fixo', quantidade: 2, unidade: 'pct' },
          ];

          const fixosBase = (shoppingConfig.itensFixos && shoppingConfig.itensFixos.length > 0)
            ? shoppingConfig.itensFixos
            : DEFAULT_FIXED_ITEMS;

          const fixosFormatados = fixosBase.map(fixo => {
            if (!fixo.nome) return null;
            const total = fixo.tipoCalc === 'porConvidado'
              ? Math.ceil(Number(fixo.quantidade) * convidadosVal)
              : Math.ceil(Number(fixo.quantidade));
            return {
              id: fixo.id || fixo.nome.toLowerCase().replace(/\s+/g, '_'),
              nome: fixo.nome,
              quantidade: total,
              unidade: fixo.unidade || 'un',
              categoria: fixo.categoria || 'bar',
            };
          }).filter(Boolean);

          calculatedShoppingList = {
            insumos: insumosFormatados,
            fixos: fixosFormatados,
            drinksEscolhidos: chosenDrinks,
            convidadosCalculados: convidadosVal
          };
        }
      } catch (calcError) {
        console.error("Erro ao calcular a lista de compras no contrato:", calcError);
      }

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
        lat: formData.lat || null,
        lng: formData.lng || null,
        cep: formData.cep || '',
        dataEvento: formData.data,
        horarioEvento: formData.hora,
        duracao: formData.duracao,
        convidados: formData.convidados,
        pacote: formData.Servico,
        tiposDrinks: databaseTiposDrinks,
        drinksEscolhidos: chosenDrinks,
        drinks_frozen: formData.drinks_frozen || [],
        shoppingListFinalizada: true,
        shoppingListResult: calculatedShoppingList || {},
        barmans: formData.barmans !== undefined ? parseInt(formData.barmans, 10) : 1,
        ajudantesCount: formData.ajudantes !== undefined ? parseInt(formData.ajudantes, 10) : 0,
        autorizarimagem: formData.autorizarimagem !== undefined ? formData.autorizarimagem : true,
        coposDeVidro: formData.coposDeVidro || false,
        // Calculated values
        valorTotal: financials.valor_total,
        valorTotalFormatado: financials.valor_total_formatado,
        parcela1Valor: financials.parcela_1_valor,
        parcela2Valor: financials.parcela_2_valor,
        // Financeiro sync
        'financeiro/faturamento': financials.valor_original,
        'financeiro/desconto': financials.desconto,
        'financeiro/aplicarDescontoMaoDeObra': formData.aplicarDescontoMaoDeObra || false
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '16px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="contrato-container">
        
        {/* LOGO HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <img src="/logo.webp" alt="Logo Formulário Drinks" style={{ width: '105px', height: 'auto' }} />
        </div>

        {/* STEP STATUS INDICATOR (MOBILE-FIRST) */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '2px' }}>
            {[
              { num: 1, label: 'Contratante', icon: FiUser },
              { num: 2, label: 'Evento', icon: FiCalendar },
              { num: 3, label: 'Drinks', icon: FiBookOpen },
            ].map((s, idx) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <React.Fragment key={s.num}>
                  <div
                    onClick={() => isPast && setStep(s.num)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isPast ? 'pointer' : 'default',
                      opacity: isActive || isPast ? 1 : 0.4
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary)' : (isPast ? '#2e8b57' : 'rgba(255,255,255,0.08)'),
                      color: isActive ? '#000' : '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      flexShrink: 0
                    }}>
                      {isPast ? '✓' : s.num}
                    </div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 'bold' : '500',
                      color: isActive ? 'var(--primary)' : (isPast ? '#FFF' : 'var(--text-muted)'),
                      whiteSpace: 'nowrap'
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: step > idx + 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      margin: '0 8px',
                      transition: 'background 0.3s'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: CONTRATANTE & ENDEREÇO ────────────────────── */}
        {step === 1 && (
          <div className="contrato-card">
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.25rem', margin: '0 0 4px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUser /> 1. Informações do Contratante & Endereço
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
              Olá! Para gerarmos o seu contrato, preencha os seus dados de faturamento e o endereço onde o bar será montado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nome Completo *</label>
                <input type="text" name="nome" className={`form-input ${errors.nome ? 'form-input--error' : ''}`} placeholder="Nome do titular do contrato" value={formData.nome} onChange={handleInput} />
                {errors.nome && <span style={{ color: '#F44336', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{errors.nome}</span>}
              </div>

              <div className="contrato-grid-2">
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

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#FFF', margin: 0 }}>📍 Endereço de Montagem do Bar</h3>

                <AddressMapPicker
                  value={{
                    rua: formData.rua,
                    numero: formData.numero,
                    bairro: formData.bairro,
                    cidade: formData.cidade,
                    lat: formData.lat,
                    lng: formData.lng,
                    fullAddress: [formData.rua, formData.numero, formData.bairro, formData.cidade].filter(Boolean).join(', ')
                  }}
                  onChange={(loc) => {
                    setFormData(prev => ({
                      ...prev,
                      rua: loc.rua !== undefined ? loc.rua : prev.rua,
                      numero: loc.numero ? loc.numero : prev.numero,
                      bairro: loc.bairro !== undefined ? loc.bairro : prev.bairro,
                      cidade: loc.cidade || prev.cidade,
                      lat: loc.lat !== undefined ? loc.lat : prev.lat,
                      lng: loc.lng !== undefined ? loc.lng : prev.lng,
                      cep: loc.cep || prev.cep
                    }));
                    setErrors(prev => {
                      const next = { ...prev };
                      if (loc.rua) delete next.rua;
                      if (loc.numero) delete next.numero;
                      if (loc.bairro) delete next.bairro;
                      if (loc.cidade) delete next.cidade;
                      return next;
                    });
                  }}
                  placeholder="Pesquise o buffet, sítio ou rua do evento..."
                />
                
                <div className="contrato-grid-street">
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

                <div className="contrato-grid-2">
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

            <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px', marginTop: '4px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Autoriza o uso de fotos/vídeos para divulgação? (LGPD) *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, autorizarimagem: true }))}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (formData.autorizarimagem ? 'var(--primary)' : 'rgba(203, 161, 83, 0.15)'),
                    background: formData.autorizarimagem ? 'rgba(203, 161, 83, 0.15)' : 'transparent',
                    color: formData.autorizarimagem ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
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
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid ' + (!formData.autorizarimagem ? 'var(--primary)' : 'rgba(203, 161, 83, 0.15)'),
                    background: !formData.autorizarimagem ? 'rgba(203, 161, 83, 0.15)' : 'transparent',
                    color: !formData.autorizarimagem ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Não autorizo
                </button>
              </div>
            </div>

            <div className="contrato-actions">
              <div></div>
              <button className="btn btn--primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Avançar <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: EVENTO & BAR CONFIG ──────────────────────── */}
        {step === 2 && (
          <div className="contrato-card">
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.25rem', margin: '0 0 4px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCalendar /> 2. Detalhes do Evento & Pacote
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
              Os dados abaixo foram importados do seu orçamento inicial. Você pode ajustar qualquer informação se necessário.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="contrato-grid-2">
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

              <div className="contrato-grid-2">
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

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#FFF', fontWeight: 'bold', marginBottom: '10px' }}>Tipo de Serviço (Pacote) *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {pacotes.filter(p => !p.hidden).map(p => (
                    <div
                      key={p.name}
                      onClick={() => handleInput({ target: { name: 'Servico', value: p.name } })}
                      style={{
                        padding: '12px', borderRadius: '8px', cursor: 'pointer',
                        border: formData.Servico === p.name ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: formData.Servico === p.name ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: formData.Servico === p.name ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s', textAlign: 'center', fontSize: '0.88rem', fontWeight: formData.Servico === p.name ? 'bold' : 'normal'
                      }}
                    >
                      {p.emoji || '📦'} {p.name}
                    </div>
                  ))}
                </div>
                {selectedPackage && (
                  <div style={{ marginTop: '12px', background: 'rgba(203, 161, 83, 0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)', lineHeight: '1.5' }}>
                    <strong>{selectedPackage.name}:</strong> {selectedPackage.features ? selectedPackage.features.join(' • ') : (isPremium ? 'Até 6 drinks alcoólicos no total (máximo 2 sofisticados) e 3 sem álcool.' : 'Até 5 drinks alcoólicos e 2 sem álcool.')}
                  </div>
                )}
              </div>

              {isMaoDeObra && (
                <div style={{
                  background: 'rgba(203, 161, 83, 0.03)',
                  border: '1px solid rgba(203, 161, 83, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginTop: '4px'
                }}>
                  <h3 style={{
                    fontFamily: 'Cinzel, serif',
                    color: 'var(--primary)',
                    fontSize: '1rem',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🤵 Equipe de Mão de Obra
                  </h3>
                  
                  <div className="contrato-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Quantidade de Barmans</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, (formData.barmans !== undefined ? formData.barmans : 1) - 1);
                            setFormData(prev => ({ ...prev, barmans: val }));
                          }}
                          style={{
                            width: '42px', height: '42px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', minWidth: '28px', textAlign: 'center' }}>
                          {formData.barmans !== undefined ? formData.barmans : 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (formData.barmans !== undefined ? formData.barmans : 1) + 1;
                            setFormData(prev => ({ ...prev, barmans: val }));
                          }}
                          style={{
                            width: '42px', height: '42px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Quantidade de Ajudantes</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (formData.ajudantes !== undefined ? formData.ajudantes : 0) - 1);
                            setFormData(prev => ({ ...prev, ajudantes: val }));
                          }}
                          style={{
                            width: '42px', height: '42px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', minWidth: '28px', textAlign: 'center' }}>
                          {formData.ajudantes !== undefined ? formData.ajudantes : 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (formData.ajudantes !== undefined ? formData.ajudantes : 0) + 1;
                            setFormData(prev => ({ ...prev, ajudantes: val }));
                          }}
                          style={{
                            width: '42px', height: '42px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.3)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none'
                          }}
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
                        gap: '10px',
                        background: 'rgba(203, 161, 83, 0.06)',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        borderLeft: '4px solid var(--primary)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              Aplicar ✨
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#FFF', fontWeight: 'bold', marginBottom: '10px' }}>Tipos de Drink na Festa *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['Com e sem álcool', 'Apenas sem álcool'].map(t => (
                    <div
                      key={t}
                      onClick={() => handleInput({ target: { name: 'tipodrink', value: t } })}
                      style={{
                        padding: '12px', borderRadius: '8px', cursor: 'pointer',
                        border: formData.tipodrink === t ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: formData.tipodrink === t ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: formData.tipodrink === t ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s', textAlign: 'center', fontSize: '0.85rem', fontWeight: formData.tipodrink === t ? 'bold' : 'normal'
                      }}
                    >
                      {t === 'Com e sem álcool' ? '🍸 Alcoólicos + Não Alcoólicos' : '🍹 Apenas Drinks Sem Álcool'}
                    </div>
                  ))}
                </div>
              </div>

              {/* COPOS DE VIDRO (ADICIONAL) - APENAS PARA MÃO DE OBRA */}
              {isMaoDeObra && (
                <div style={{
                  background: formData.coposDeVidro ? 'rgba(203, 161, 83, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: formData.coposDeVidro ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setFormData(prev => ({ ...prev, coposDeVidro: !prev.coposDeVidro }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: formData.coposDeVidro ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: formData.coposDeVidro ? '#000' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0
                    }}>
                      🍸
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>
                        Adicionar Copos e Taças de Vidro
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Higienizados para todo o evento (+ R$ 3,50 / convidado)
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1.5px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: formData.coposDeVidro ? 'var(--primary)' : 'transparent',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {formData.coposDeVidro && '✓'}
                  </div>
                </div>
              )}

              {/* CARD DE ESTIMATIVA DE INVESTIMENTO */}
              <div style={{
                background: 'rgba(203, 161, 83, 0.08)',
                border: '1px solid var(--primary)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Investimento Previsto
                  </span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'Cinzel, serif', marginTop: '2px' }}>
                    {financials.valor_total_formatado}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {formData.convidados || 0} convidados • {formData.duracao || 5}h de evento
                </div>
              </div>
            </div>

            <div className="contrato-actions">
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
          <div className="contrato-card">
            <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.25rem', margin: '0 0 4px 0', borderBottom: '1px solid rgba(203,161,83,0.15)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiBookOpen /> 3. Escolha do Cardápio de Drinks
            </h2>

            {/* STICKY / FLOATING MOBILE DRINK COUNTER */}
            <div style={{
              position: 'sticky',
              top: '8px',
              zIndex: 100,
              background: 'rgba(12, 22, 16, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--primary)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <span style={{ color: countAlcool >= limitAlcoolTotal ? '#4CAF50' : 'var(--primary)', fontWeight: 'bold' }}>
                  🍸 Alcoólicos: {countAlcool} / {limitAlcoolTotal}
                </span>
                {isFrozen && (
                  <span style={{ color: countFrozen >= limitFrozen ? '#4CAF50' : 'var(--primary-light)', fontWeight: 'bold' }}>
                    🧊 Frozen: {countFrozen} / {limitFrozen}
                  </span>
                )}
                {isPremium && (
                  <span style={{ color: countSofisticados >= limitSofisticado ? '#4CAF50' : 'var(--primary-light)', fontWeight: 'bold' }}>
                    ⭐ Sofisticados: {countSofisticados} / {limitSofisticado}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                🍹 Sem Álcool: {formData.drinks_sem_alcool.length}
              </span>
            </div>

            {/* ALCOHOLIC DRINKS */}
            <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto' }}>
              <h3 style={{ color: '#FFF', fontSize: '1rem', margin: '0 0 4px 0' }}>Drinks Alcoólicos (Regulares)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 12px 0' }}>
                {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Selecione até ${limitAlcoolTotal} drinks no total do bar.`}
              </p>
              <div className="contrato-drinks-grid">
                {DRINKS_ALCOOL.map(d => {
                  const isSelected = formData.drinks_alcool.includes(d.id);
                  const isLimitReached = !isSelected && countAlcool >= limitAlcoolTotal;
                  return (
                    <div
                      key={d.id}
                      onClick={() => !isLimitReached && toggleDrink('drinks_alcool', d.id)}
                      className="contrato-drink-item"
                      style={{
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)',
                        cursor: isLimitReached ? 'not-allowed' : 'pointer',
                        opacity: isLimitReached ? 0.5 : 1
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '4px', border: '1.5px solid var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                      }}>
                        {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      {d.image && (
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                          {isNextImageAllowed(d.image) ? (
                            <Image
                              src={d.image}
                              alt={d.rawName}
                              fill
                              sizes="44px"
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
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.88rem' }}>{d.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>{d.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FROZEN DRINKS */}
            {isFrozen && (
              <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px' }}>
                <h3 style={{ color: 'var(--primary)', fontSize: '1rem', margin: '0 0 4px 0' }}>Drinks Frozen (Consome limite do bar)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 12px 0' }}>
                  {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Máx ${limitFrozen} drinks frozen. (Selecionados: ${countFrozen} / ${limitFrozen})`}
                </p>
                <div className="contrato-drinks-grid">
                  {DRINKS_FROZEN.map(d => {
                    const isSelected = (formData.drinks_frozen || []).includes(d.id);
                    const isLimitReached = !isSelected && (countFrozen >= limitFrozen || countAlcool >= limitAlcoolTotal);
                    return (
                      <div
                        key={d.id}
                        onClick={() => !isLimitReached && toggleDrink('drinks_frozen', d.id)}
                        className="contrato-drink-item"
                        style={{
                          border: isSelected ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)',
                          cursor: isLimitReached ? 'not-allowed' : 'pointer',
                          opacity: isLimitReached ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '4px', border: '1.5px solid var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                        </div>
                        {d.image && (
                          <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                            {isNextImageAllowed(d.image) ? (
                              <Image
                                src={d.image}
                                alt={d.rawName}
                                fill
                                sizes="44px"
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
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.88rem' }}>{d.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>{d.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PREMIUM / SOFISTICADOS DRINKS */}
            {isPremium && (
              <div style={{ opacity: disableAlcoolGroup ? 0.4 : 1, pointerEvents: disableAlcoolGroup ? 'none' : 'auto', borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px' }}>
                <h3 style={{ color: 'var(--primary)', fontSize: '1rem', margin: '0 0 4px 0' }}>Drinks Sofisticados (Consome limite do bar)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 12px 0' }}>
                  {disableAlcoolGroup ? 'Desabilitado pela escolha do tipo de drink.' : `Máx ${limitSofisticado} drink sofisticado. (Selecionados: ${countSofisticados} / ${limitSofisticado})`}
                </p>
                <div className="contrato-drinks-grid">
                  {DRINKS_SOFISTICADOS.map(d => {
                    const isSelected = formData.drinks_sofisticados.includes(d.id);
                    const isLimitReached = !isSelected && (countSofisticados >= limitSofisticado || countAlcool >= limitAlcoolTotal);
                    return (
                      <div
                        key={d.id}
                        onClick={() => !isLimitReached && toggleDrink('drinks_sofisticados', d.id)}
                        className="contrato-drink-item"
                        style={{
                          border: isSelected ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)',
                          cursor: isLimitReached ? 'not-allowed' : 'pointer',
                          opacity: isLimitReached ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '4px', border: '1.5px solid var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                        </div>
                        {d.image && (
                          <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                            {isNextImageAllowed(d.image) ? (
                              <Image
                                src={d.image}
                                alt={d.rawName}
                                fill
                                sizes="44px"
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
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.88rem' }}>{d.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>{d.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NON-ALCOHOLIC DRINKS */}
            <div style={{ borderTop: '1px solid rgba(203,161,83,0.1)', paddingTop: '16px' }}>
              <h3 style={{ color: '#FFF', fontSize: '1rem', margin: '0 0 4px 0' }}>Drinks Sem Álcool (Sucos, Coquetéis & Mocktails)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 12px 0' }}>
                Selecione quantos desejar para o cardápio sem álcool do evento. (Selecionados: {formData.drinks_sem_alcool.length})
              </p>
              <div className="contrato-drinks-grid">
                {DRINKS_NA.map(d => {
                  const isSelected = formData.drinks_sem_alcool.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleDrink('drinks_sem_alcool', d.id)}
                      className="contrato-drink-item"
                      style={{
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '4px', border: '1.5px solid var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent', flexShrink: 0
                      }}>
                        {isSelected && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      {d.image && (
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(203, 161, 83, 0.2)' }}>
                          {isNextImageAllowed(d.image) ? (
                            <Image
                              src={d.image}
                              alt={d.rawName}
                              fill
                              sizes="44px"
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
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <strong style={{ color: isSelected ? 'var(--primary)' : '#FFF', fontSize: '0.88rem' }}>{d.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>{d.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {submitStatus === 'error' && (
              <div style={{ background: 'rgba(244, 67, 54, 0.12)', border: '1px solid #F44336', color: '#F44336', padding: '14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                Ocorreu um erro ao salvar suas escolhas ou ao gerar o contrato. Por favor, tente novamente ou fale com a nossa equipe.
              </div>
            )}

            <div className="contrato-actions">
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
          <div className="contrato-card" style={{ textAlign: 'center', alignItems: 'center', padding: '40px 20px', gap: '14px' }}>
            <FiCheckCircle size={56} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            <h2 style={{ fontFamily: 'Cinzel, serif', color: '#FFF', fontSize: '1.6rem', margin: 0 }}>Tudo Pronto!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0, maxWidth: '500px', lineHeight: '1.5' }}>
              Parabéns! Seus dados cadastrais e o cardápio de drinks da festa foram salvos com sucesso.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, maxWidth: '500px', lineHeight: '1.5' }}>
              O contrato em PDF com todas as cláusulas e o cardápio oficial selecionado está sendo gerado e será enviado no seu WhatsApp em breve para assinatura digital!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
