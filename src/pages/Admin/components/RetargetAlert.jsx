import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../../firebase';
import { FiBell, FiSend } from 'react-icons/fi';

export default function RetargetAlert() {
  const [leads, setLeads] = useState([]);
  const [configs, setConfigs] = useState(null);
  const [sending, setSending] = useState(false);

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

  leads.forEach(lead => {
    // Ignorar se já fechou, perdeu ou se descadastrou
    if (lead.status === 'fechado' || lead.status === 'perdido' || lead.optout) return;
    if (!lead.dataEvento) return;

    const eventDate = new Date(lead.dataEvento + 'T00:00:00');
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Regra: Exatamente ou menos que 30 dias (mas mais de 15) E não enviou o de 30 ainda
    if (diffDays <= 30 && diffDays > 15 && !lead.retarget30Sent) {
      pending30Days.push(lead);
    }
    
    // Regra: Exatamente ou menos que 15 dias (mas não passou da data) E não enviou o de 15 ainda
    if (diffDays <= 15 && diffDays >= 0 && !lead.retarget15Sent) {
      pending15Days.push(lead);
    }
  });

  const totalPending = pending30Days.length + pending15Days.length;

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

      const optoutLink = `\n\nPara não receber mais lembretes automáticos sobre seu evento, clique aqui: ${baseSiteUrl}/sair/${lead.id}`;
      
      let finalText = scriptObj.text
        .replace(/\{\{nome\}\}/g, lead.nome || '')
        .replace(/\{\{pacote\}\}/g, lead.pacote || '')
        .replace(/\{\{dataEvento\}\}/g, lead.dataEvento || '')
        .replace(/\{\{cidade\}\}/g, lead.cidade || '') 
        + optoutLink;

      const number = '55' + (lead.telefone || '').replace(/\D/g, '');
      
      let endpoint = '';
      let payload = {};

      if (scriptObj.image) {
        endpoint = `${baseUrl}/message/sendMedia/${configs.evolutionApi.instance}`;
        payload = { number, mediatype: "image", media: scriptObj.image, caption: finalText };
      } else {
        endpoint = `${baseUrl}/message/sendText/${configs.evolutionApi.instance}`;
        payload = { number, text: finalText };
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': configs.evolutionApi.apikey },
          body: JSON.stringify(payload)
        });
        return response.ok;
      } catch (err) {
        console.error("Erro no envio individual:", err);
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

    setSending(false);
    alert(`${sentCount} de ${totalPending} mensagens foram enviadas com sucesso!`);
  };

  if (totalPending === 0) return null;

  return (
    <div style={{ background: 'rgba(255, 213, 79, 0.1)', border: '1px solid #FFD54F', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#FFD54F', color: '#000', padding: '8px', borderRadius: '50%', display: 'flex' }}>
          <FiBell size={20} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: '#FFD54F', fontSize: '1rem' }}>Alertas de Eventos Próximos</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Você tem <strong>{pending30Days.length} leads</strong> a menos de 30 dias e <strong>{pending15Days.length} leads</strong> a menos de 15 dias aguardando mensagens automáticas.
          </p>
        </div>
      </div>
      
      <button 
        onClick={handleSendAll}
        disabled={sending}
        className="btn btn--primary" 
        style={{ width: 'auto', background: '#FFD54F', color: '#000', borderColor: '#FFD54F', display: 'flex', gap: '8px', alignItems: 'center' }}
      >
        {sending ? <div className="btn__spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} /> : <FiSend />}
        {sending ? 'Enviando...' : 'Disparar Mensagens Agora'}
      </button>
    </div>
  );
}
