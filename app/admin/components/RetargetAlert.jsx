import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiBell, FiSend, FiX } from 'react-icons/fi';

export default function RetargetAlert() {
  const [leads, setLeads] = useState([]);
  const [configs, setConfigs] = useState(null);
  const [sending, setSending] = useState(false);
  const [dismissedUpcoming, setDismissedUpcoming] = useState(false);
  const [dismissedPending, setDismissedPending] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissedUpcoming(sessionStorage.getItem('dismissed-upcoming') === 'true');
      setDismissedPending(sessionStorage.getItem('dismissed-pending') === 'true');
    }
  }, []);

  const handleDismissUpcoming = () => {
    setDismissedUpcoming(true);
    sessionStorage.setItem('dismissed-upcoming', 'true');
  };

  const handleDismissPending = () => {
    setDismissedPending(true);
    sessionStorage.setItem('dismissed-pending', 'true');
  };

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLeads(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setLeads([]);
      }
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) setConfigs(snapshot.val());
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
  }, []);

  // Filtrar leads
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending30Days = [];
  const pending15Days = [];
  const pendingNPS = [];
  const upcomingEvents = [];

  leads.forEach(lead => {
    // Ignorar se perdeu ou se descadastrou
    if (lead.status === 'perdido' || lead.optout) return;
    if (!lead.dataEvento) return;

    const eventDate = new Date(lead.dataEvento + 'T00:00:00');
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Regra NPS: Evento fechado ou realizado, passou 1 dia ou mais da data, não enviou o NPS ainda
    if ((lead.status === 'fechado' || lead.status === 'realizado') && diffDays <= -1 && !lead.npsSent) {
      pendingNPS.push(lead);
    }
    
    // Regras para Eventos Próximos (Notificação pro Admin)
    if ((lead.status === 'fechado' || lead.status === 'realizado') && diffDays >= 0 && diffDays <= 15) {
      upcomingEvents.push({ ...lead, diffDays });
    }

    // As regras abaixo são apenas para leads não fechados e não realizados
    if (lead.status !== 'fechado' && lead.status !== 'realizado') {
      // Regra: Exatamente ou menos que 30 dias (mas mais de 15) E não enviou o de 30 ainda
      if (diffDays <= 30 && diffDays > 15 && !lead.retarget30Sent) {
        pending30Days.push(lead);
      }
      
      // Regra: Exatamente ou menos que 15 dias (mas não passou da data) E não enviou o de 15 ainda
      if (diffDays <= 15 && diffDays >= 0 && !lead.retarget15Sent) {
        pending15Days.push(lead);
      }
    }
  });

  upcomingEvents.sort((a, b) => a.diffDays - b.diffDays);

  // Auto-send para o Admin (15, 7 e 3 dias)
  useEffect(() => {
    if (!configs?.general?.adminPhone || !configs?.evolutionApi?.url || upcomingEvents.length === 0) return;

    const baseUrl = configs.evolutionApi.url.endsWith('/') ? configs.evolutionApi.url.slice(0, -1) : configs.evolutionApi.url;
    const adminPhone = '55' + configs.general.adminPhone.replace(/\D/g, '');

    upcomingEvents.forEach(async (lead) => {
      let shouldAlert = false;
      let updateField = '';
      let daysStr = '';

      if (lead.diffDays <= 3 && !lead.adminAlert3Sent) {
        shouldAlert = true; updateField = 'adminAlert3Sent'; daysStr = lead.diffDays === 0 ? 'HOJE' : (lead.diffDays === 1 ? 'Amanhã' : '3 dias');
      } else if (lead.diffDays <= 7 && lead.diffDays > 3 && !lead.adminAlert7Sent) {
        shouldAlert = true; updateField = 'adminAlert7Sent'; daysStr = '7 dias';
      } else if (lead.diffDays <= 15 && lead.diffDays > 7 && !lead.adminAlert15Sent) {
        shouldAlert = true; updateField = 'adminAlert15Sent'; daysStr = '15 dias';
      }

      if (shouldAlert) {
        const text = `🚨 *Alerta de Evento Próximo!* 🚨\n\nO evento de *${lead.nome}* (${lead.tipoEvento || 'Festa'}) com o pacote *${lead.pacote || 'Não inf.'}* será em *${daysStr}* (Data: ${lead.dataEvento}).\n\nVerifique se o estoque e os parceiros já estão confirmados!`;
        
        try {
          const endpoint = `${baseUrl}/message/sendText/${configs.evolutionApi.instance}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': configs.evolutionApi.apikey },
            body: JSON.stringify({ number: adminPhone, text, linkPreview: false })
          });
          
          if (response.ok) {
            await update(ref(db, `leads/${lead.id}`), { [updateField]: true });
          }
        } catch (err) {
          console.error("Erro ao enviar alerta automático para o admin", err);
        }
      }
    });
  }, [upcomingEvents, configs]);

  const totalPending = pending30Days.length + pending15Days.length + pendingNPS.length;

  const handleSendAll = async () => {
    if (!configs?.evolutionApi?.url || !configs?.evolutionApi?.instance || !configs?.evolutionApi?.apikey) {
      alert("Configure a Evolution API na aba de Configurações primeiro.");
      return;
    }

    if (!window.confirm(`Deseja disparar ${totalPending} mensagens automáticas agora? Isso não pode ser desfeito.`)) {
      return;
    }

    setSending(true);

    const baseUrl = configs.evolutionApi.url.endsWith('/') ? configs.evolutionApi.url.slice(0, -1) : configs.evolutionApi.url;
    
    const sendMsg = async (lead, scriptObj) => {
      if (!scriptObj || !scriptObj.text) return false;
      
      const baseSiteUrl = configs.general?.siteUrl 
        ? (configs.general.siteUrl.endsWith('/') ? configs.general.siteUrl.slice(0, -1) : configs.general.siteUrl)
        : window.location.origin;

      const optoutLink = `\n\nPara não receber mais mensagens automáticas, clique aqui: ${baseSiteUrl}/sair/${lead.id}`;
      const linkAvaliacao = `${baseSiteUrl}/avaliacao/${lead.id}`;
      
      // Extrair mês e ano
      let mesNome = '';
      let anoEvento = '';
      if (lead.dataEvento) {
        const parts = lead.dataEvento.split('-');
        if (parts.length >= 2) {
          anoEvento = parts[0];
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
          if (monthIndex >= 0 && monthIndex < 12) {
            mesNome = monthNames[monthIndex];
          }
        }
      }

      const hasLinkPlaceholder = /\{\{(linkAvaliacao|linkavaliacao|linkAvaliação|link_avaliacao|linkNps|linknps|linkReview|linkreview)\}\}/gi.test(scriptObj.text);

      let finalText = scriptObj.text
        .replace(/\{\{nome\}\}/gi, lead.nome || '')
        .replace(/\{\{pacote\}\}/gi, lead.pacote || '')
        .replace(/\{\{dataEvento\}\}/gi, lead.dataEvento || '')
        .replace(/\{\{mes\}\}/gi, mesNome)
        .replace(/\{\{ano\}\}/gi, anoEvento)
        .replace(/\{\{cidade\}\}/gi, lead.cidade || '') 
        .replace(/\{\{(linkAvaliacao|linkavaliacao|linkAvaliação|link_avaliacao|linkNps|linknps|linkReview|linkreview)\}\}/gi, linkAvaliacao);

      if (!hasLinkPlaceholder) {
        finalText += `\n\nLink para avaliação: ${linkAvaliacao}`;
      }
      
      finalText += optoutLink;

      const number = '55' + (lead.telefone || '').replace(/\D/g, '');
      
      let endpoint = '';
      let payload = {};

      if (scriptObj.image) {
        const imgStr = scriptObj.image.toLowerCase();
        const isSocialLink = imgStr.includes('instagram.com') || imgStr.includes('youtube.com') || imgStr.includes('tiktok.com') || imgStr.includes('facebook.com') || imgStr.includes('drive.google.com');

        if (isSocialLink) {
          endpoint = `${baseUrl}/message/sendText/${configs.evolutionApi.instance}`;
          payload = { number, text: finalText + '\n\n' + scriptObj.image, linkPreview: false };
        } else {
          endpoint = `${baseUrl}/message/sendMedia/${configs.evolutionApi.instance}`;
          payload = { number, mediatype: "image", media: scriptObj.image, caption: finalText, linkPreview: false };
        }
      } else {
        endpoint = `${baseUrl}/message/sendText/${configs.evolutionApi.instance}`;
        payload = { number, text: finalText, linkPreview: false };
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': configs.evolutionApi.apikey },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro no disparo de ${scriptObj === configs.scripts?.retarget30 ? '30 dias' : 'mensagem'} para ${number}: Status ${response.status} - ${errorText}`);
          return false;
        }
        
        return true;
      } catch (err) {
        console.error("Erro na requisição para Evolution API:", err);
        return false;
      }
    };

    let sentCount = 0;

    // Disparos de 30 dias
    for (const lead of pending30Days) {
      const success = await sendMsg(lead, configs.scripts?.retarget30);
      if (success) {
        await update(ref(db, `leads/${lead.id}`), { retarget30Sent: true });
        sentCount++;
      }
      // Pequeno delay para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 1000));
    }

    // Disparos de 15 dias
    for (const lead of pending15Days) {
      const success = await sendMsg(lead, configs.scripts?.retarget15);
      if (success) {
        await update(ref(db, `leads/${lead.id}`), { retarget15Sent: true });
        sentCount++;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Disparos de NPS
    for (const lead of pendingNPS) {
      const success = await sendMsg(lead, configs.scripts?.posEvento);
      if (success) {
        await update(ref(db, `leads/${lead.id}`), { npsSent: true });
        sentCount++;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    setSending(false);
    alert(`${sentCount} de ${totalPending} mensagens foram enviadas com sucesso!`);
  };

  const showUpcoming = upcomingEvents.length > 0 && !dismissedUpcoming;
  const showPending = totalPending > 0 && !dismissedPending;

  if (!showUpcoming && !showPending) return null;

  return (
    <>
      {showUpcoming && (
        <div style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #F44336', borderRadius: '8px', padding: '16px 48px 16px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative' }}>
          <div style={{ background: '#F44336', color: '#FFF', padding: '8px', borderRadius: '50%', display: 'flex' }}>
            <FiBell size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#F44336', fontSize: '1rem' }}>🚨 Eventos Próximos ({upcomingEvents.length})</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Você tem eventos confirmados chegando nos próximos 15 dias! Lembre-se de organizar as compras.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {upcomingEvents.map(ev => (
                <span key={ev.id} style={{ fontSize: '0.8rem', background: 'rgba(244, 67, 54, 0.2)', padding: '4px 10px', borderRadius: '6px', color: '#FFF', border: '1px solid rgba(244, 67, 54, 0.5)' }}>
                  {ev.nome} (em {ev.diffDays} dia{ev.diffDays !== 1 ? 's' : ''})
                </span>
              ))}
            </div>
            {!configs?.general?.adminPhone && (
              <p style={{ margin: '8px 0 0 0', color: '#FFD54F', fontSize: '0.85rem' }}>⚠️ Configure seu número de WhatsApp nas configurações (Pacotes & Drinks) para receber e-mails/alertas automáticos de 15, 7 e 3 dias.</p>
            )}
          </div>
          <button
            onClick={handleDismissUpcoming}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Dispensar alerta"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {showPending && (
        <div style={{ background: 'rgba(255, 213, 79, 0.1)', border: '1px solid #FFD54F', borderRadius: '8px', padding: '16px 48px 16px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#FFD54F', color: '#000', padding: '8px', borderRadius: '50%', display: 'flex' }}>
              <FiBell size={20} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#FFD54F', fontSize: '1rem' }}>Alertas de Orçamentos e Pós-Eventos</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Você tem <strong>{pending30Days.length} leads</strong> a menos de 30 dias, <strong>{pending15Days.length} leads</strong> a menos de 15 dias e <strong>{pendingNPS.length} avaliações</strong> (NPS) aguardando envio.
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSendAll}
            disabled={sending}
            className="btn btn--primary admin-full-btn" 
            style={{ width: 'auto', background: '#FFD54F', color: '#000', borderColor: '#FFD54F', display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            {sending ? <div className="btn__spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} /> : <FiSend />}
            {sending ? 'Enviando...' : 'Disparar Mensagens Agora'}
          </button>
          
          <button
            onClick={handleDismissPending}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Dispensar alerta"
          >
            <FiX size={18} />
          </button>
        </div>
      )}
    </>
  );
}
