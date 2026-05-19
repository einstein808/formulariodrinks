import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../../../firebase';
import { FiPhone, FiCalendar, FiMapPin, FiClock, FiX, FiTrash2, FiHeart } from 'react-icons/fi';

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: '#00E5FF' },
  { id: 'negociacao', title: 'Em Negociação', color: '#FFD54F' },
  { id: 'fechado', title: 'Fechado (Ganho)', color: '#4CAF50' },
  { id: 'perdido', title: 'Perdido', color: '#F44336' }
];

export default function LeadsKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [cerimonialistas, setCerimonialistas] = useState({});
  
  const [evolutionApi, setEvolutionApi] = useState(null);
  const [scripts, setScripts] = useState(null);
  const [generalConfigs, setGeneralConfigs] = useState(null);
  const [sendingScript, setSendingScript] = useState(false);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const leadsArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        leadsArray.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
        setLeads(leadsArray);
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.evolutionApi) setEvolutionApi(data.evolutionApi);
        if (data.scripts) setScripts(data.scripts);
        if (data.general) setGeneralConfigs(data.general);
        if (data.cerimonialistas) setCerimonialistas(data.cerimonialistas);
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
  }, []);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await update(ref(db, `leads/${leadId}`), { status: newStatus });

      // Notificação WhatsApp para cerimonialista ao fechar
      if (newStatus === 'fechado') {
        const lead = leads.find(l => l.id === leadId) || selectedLead;
        if (lead?.cerimonialista && cerimonialistas[lead.cerimonialista]) {
          const cerim = cerimonialistas[lead.cerimonialista];
          notificarCerimonialista(lead, cerim);
        }
      }

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar o status.");
    }
  };

  const notificarCerimonialista = async (lead, cerim) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) return;
    try {
      const number = '55' + cerim.whatsapp.replace(/\D/g, '');
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const nomeCliente = `${lead.nome} ${lead.sobrenome}`.trim();
      const text =
        `Olá *${cerim.nome}*! 🎉 Boa notícia!\n\n` +
        `O cliente *${nomeCliente}* (evento em *${lead.dataEvento || 'data n/inf.'}*) que veio da sua indicação acabou de *fechar o pacote ${lead.pacote || ''}* conosco!\n\n` +
        `Obrigado pela parceria! 🥂`;
      await fetch(`${baseUrl}/message/sendText/${evolutionApi.instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApi.apikey },
        body: JSON.stringify({ number, text }),
      });
    } catch (err) {
      console.error('Erro ao notificar cerimonialista:', err);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (window.confirm("Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.")) {
      try {
        await remove(ref(db, `leads/${leadId}`));
        setSelectedLead(null); // Fecha o modal após excluir
      } catch (error) {
        console.error("Erro ao excluir lead:", error);
        alert("Erro ao excluir o lead.");
      }
    }
  };

  const handleSendEvolution = async (scriptType) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert("A API Evolution não está configurada corretamente. Vá até a aba 'Pacotes & Drinks' > 'Scripts de Vendas' para configurar.");
      return;
    }
    
    const scriptConfig = scripts?.[scriptType];
    if (!scriptConfig || !scriptConfig.text) {
      alert("O texto deste script não está configurado. Vá até as configurações para escrevê-lo.");
      return;
    }

    if (!window.confirm("Deseja enviar essa mensagem automaticamente pelo WhatsApp agora?")) {
      return;
    }

    setSendingScript(true);
    try {
      // Preparar Link de Avaliação
      const baseSiteUrl = generalConfigs?.siteUrl 
        ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
        : window.location.origin;
      const linkAvaliacao = `${baseSiteUrl}/avaliacao/${selectedLead.id}`;

      // Extrair mês e ano
      let mesNome = '';
      let anoEvento = '';
      if (selectedLead.dataEvento) {
        const parts = selectedLead.dataEvento.split('-');
        if (parts.length >= 2) {
          anoEvento = parts[0];
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
          if (monthIndex >= 0 && monthIndex < 12) {
            mesNome = monthNames[monthIndex];
          }
        }
      }

      // Substituir variáveis
      let finalText = scriptConfig.text
        .replace(/\{\{nome\}\}/g, selectedLead.nome || '')
        .replace(/\{\{pacote\}\}/g, selectedLead.pacote || '')
        .replace(/\{\{dataEvento\}\}/g, selectedLead.dataEvento || '')
        .replace(/\{\{mes\}\}/g, mesNome)
        .replace(/\{\{ano\}\}/g, anoEvento)
        .replace(/\{\{cidade\}\}/g, selectedLead.cidade || '')
        .replace(/\{\{linkAvaliacao\}\}/g, linkAvaliacao);

      const number = '55' + selectedLead.telefone.replace(/\D/g, '');
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      
      let endpoint = '';
      let payload = {};

      if (scriptConfig.image) {
        const imgStr = scriptConfig.image.toLowerCase();
        const isSocialLink = imgStr.includes('instagram.com') || imgStr.includes('youtube.com') || imgStr.includes('tiktok.com') || imgStr.includes('facebook.com') || imgStr.includes('drive.google.com');

        if (isSocialLink) {
          endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;
          payload = {
            number: number,
            text: finalText + '\n\n' + scriptConfig.image
          };
        } else {
          endpoint = `${baseUrl}/message/sendMedia/${evolutionApi.instance}`;
          payload = {
            number: number,
            mediatype: "image",
            media: scriptConfig.image,
            caption: finalText
          };
        }
      } else {
        endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;
        payload = {
          number: number,
          text: finalText
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApi.apikey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status} - ${errorText}`);
      }

      alert("Mensagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      alert("Erro ao enviar. Se você colocou um link na imagem, ele DEVE terminar em .jpg ou .png (ser um link direto da foto). Detalhes do erro: " + err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const handleSendShoppingListViaApi = async (lead) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert("A API Evolution não está configurada corretamente.");
      return;
    }
    
    if (!window.confirm("Deseja enviar o link da lista de compras automaticamente pelo WhatsApp via API agora?")) {
      return;
    }

    setSendingScript(true);
    try {
      const baseSiteUrl = generalConfigs?.siteUrl 
        ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
        : window.location.origin;
      const linkCompras = `${baseSiteUrl}/lista-compras/${lead.id}`;
      
      const text = `Olá ${lead.nome}, acesse este link para escolher os drinks do seu evento e gerar a lista de compras exata do que você precisa comprar:\n\n${linkCompras}`;

      const number = '55' + lead.telefone.replace(/\D/g, '');
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApi.apikey
        },
        body: JSON.stringify({ number, text })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status} - ${errorText}`);
      }

      alert("Link da lista de compras enviado com sucesso via API!");
    } catch (err) {
      console.error("Erro ao enviar link da lista:", err);
      alert("Erro ao enviar. Detalhes: " + err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const getLeadsByStatus = (statusId) => {
    return leads.filter(l => (l.status || 'novo') === statusId);
  };

  const totalLeads = leads.length;
  const fechadosCount = getLeadsByStatus('fechado').length;
  const conversao = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Gestão de Leads</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Acompanhe os orçamentos solicitados.</p>
        </div>
        
        {/* Simplified Analytics Bar */}
        <div className="admin-stats" style={{ display: 'flex', gap: '16px', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFF' }}>{totalLeads}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Leads</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>{fechadosCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fechados</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{conversao}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversão</div>
          </div>
        </div>
      </div>

      <div className="admin-kanban-container" style={{ 
        display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: 'calc(100vh - 150px)' 
      }}>
        {COLUMNS.map(col => {
          const colLeads = getLeadsByStatus(col.id);
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => {
                e.preventDefault(); // Necessário para permitir o onDrop
                e.currentTarget.style.background = '#222'; // Efeito visual ao arrastar por cima
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = '#1A1A1A'; // Remove efeito
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = '#1A1A1A';
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) {
                  handleStatusChange(leadId, col.id);
                }
              }}
              className="admin-kanban-col"
              style={{ 
                minWidth: '300px', flex: 1, background: '#1A1A1A', borderRadius: '12px', padding: '16px',
                display: 'flex', flexDirection: 'column', borderTop: `4px solid ${col.color}`,
                transition: 'background 0.2s'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#FFF' }}>{col.title}</h3>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                  {colLeads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {colLeads.map(lead => {
                  let isStale = false;
                  if ((!lead.status || lead.status === 'novo' || lead.status === 'negociacao') && lead.criadoEm) {
                    const createdTime = new Date(lead.criadoEm).getTime();
                    // 48 horas = 172800000 ms
                    if (Date.now() - createdTime > 172800000) {
                      isStale = true;
                    }
                  }

                  return (
                    <div 
                      key={lead.id}
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', lead.id);
                        e.currentTarget.style.opacity = '0.5'; // Efeito visual no item sendo arrastado
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onClick={() => setSelectedLead(lead)}
                      style={{
                        background: 'var(--bg-input)', padding: '16px', borderRadius: '8px',
                        cursor: 'grab', border: isStale ? '1px solid #F44336' : '1px solid var(--border-color)',
                        transition: 'border-color 0.2s', ':hover': { borderColor: 'var(--primary)' }
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px', color: '#FFF', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{lead.nome} {lead.sobrenome}</span>
                        {isStale && <span title="Lead parado há mais de 48h!" style={{ fontSize: '0.8rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>🔥 Esfriando</span>}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <FiCalendar /> {lead.dataEvento || 'Data não inf.'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiMapPin /> {lead.cidade}
                      </div>
                      
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(203, 161, 83, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {lead.pacote}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {lead.convidados} conv.
                        </span>
                      </div>

                      {/* Badge cerimonialista */}
                      {lead.cerimonialista && cerimonialistas[lead.cerimonialista] && (
                        <div style={{
                          marginTop: 8, fontSize: '0.75rem', color: '#E91E63',
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'rgba(233,30,99,0.08)', padding: '2px 6px',
                          borderRadius: 4, border: '1px solid rgba(233,30,99,0.2)'
                        }}>
                          <FiHeart size={10} /> {cerimonialistas[lead.cerimonialista].nome}
                        </div>
                      )}
                    </div>
                  );
                })}
                {colLeads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum lead nesta etapa.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes do Lead */}
      {selectedLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-main)', width: '100%', maxWidth: '600px',
            borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif' }}>Detalhes do Lead</h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => handleDeleteLead(selectedLead.id)} title="Excluir Lead" style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <FiTrash2 size={20} />
                </button>
                <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <FiX size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div className="admin-modal-actions" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status do Lead</label>
                  <select 
                    value={selectedLead.status || 'novo'}
                    onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                    className="form-select"
                    style={{ marginTop: '4px' }}
                  >
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <a 
                    href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedLead.nome}, vi que solicitou um orçamento para o pacote ${selectedLead.pacote}!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn--primary"
                    style={{ background: '#25D366', borderColor: '#25D366', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                  >
                    <FiPhone /> Chamar no WhatsApp
                  </a>
                </div>
              </div>

              {/* Campo Cerimonialista */}
              <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FiHeart size={16} style={{ color: '#E91E63', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cerimonialista Parceiro</label>
                  <select
                    value={selectedLead.cerimonialista || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      await update(ref(db, `leads/${selectedLead.id}`), { cerimonialista: val });
                      setSelectedLead(prev => ({ ...prev, cerimonialista: val }));
                    }}
                    className="form-select"
                    style={{ marginTop: 0 }}
                  >
                    <option value="">— Sem parceiro / Direto —</option>
                    {Object.entries(cerimonialistas).map(([slug, c]) => (
                      <option key={slug} value={slug}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botão Gerar Lista de Compras (Apenas para pacote Mão de Obra ou Genérico) */}
              <div style={{ background: 'rgba(0, 229, 255, 0.05)', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛒 Lista de Compras (Insumos)
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px 0' }}>
                  O cliente receberá um link para escolher os drinks e o sistema calculará os insumos.
                </p>
                
                {selectedLead.shoppingListFinalizada ? (
                  <div style={{ padding: '12px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', borderRadius: '6px', color: '#4CAF50', fontSize: '0.9rem' }}>
                    ✅ <strong>O cliente já finalizou a lista!</strong> Confira a lista gerada no card abaixo.
                  </div>
                ) : (
                  <button 
                    onClick={() => handleSendShoppingListViaApi(selectedLead)}
                    disabled={sendingScript}
                    className="btn btn--outline"
                    style={{ borderColor: '#00E5FF', color: '#00E5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: 'none', cursor: sendingScript ? 'not-allowed' : 'pointer' }}
                  >
                    <FiPhone /> Enviar Link via API WhatsApp
                  </button>
                )}
              </div>

              <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px', marginBottom: '16px', borderLeft: '4px solid var(--primary)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#FFF' }}>Ações Rápidas (Integração WhatsApp API)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Script 1: Autoridade */}
                  <button 
                    onClick={() => handleSendEvolution('autoridade')}
                    disabled={sendingScript}
                    className="btn btn--outline"
                    style={{ textAlign: 'left', fontSize: '0.85rem', padding: '8px 12px', justifyContent: 'flex-start', color: '#FFF', borderColor: 'var(--border-color)', background: 'none', cursor: sendingScript ? 'not-allowed' : 'pointer' }}
                  >
                    <span style={{ color: '#00E5FF', marginRight: '8px' }}>📸 1. Mostrar Autoridade:</span>
                    Disparo automático usando o texto/imagem configurados.
                  </button>

                  {/* Script 2: Escassez / Resgate */}
                  <button 
                    onClick={() => handleSendEvolution('escassez')}
                    disabled={sendingScript}
                    className="btn btn--outline"
                    style={{ textAlign: 'left', fontSize: '0.85rem', padding: '8px 12px', justifyContent: 'flex-start', color: '#FFF', borderColor: 'var(--border-color)', background: 'none', cursor: sendingScript ? 'not-allowed' : 'pointer' }}
                  >
                    <span style={{ color: '#F44336', marginRight: '8px' }}>🔥 2. Escassez (Resgate):</span>
                    Disparo automático usando o texto/imagem configurados.
                  </button>

                  {/* Script 3: Pós-Evento */}
                  <button 
                    onClick={() => handleSendEvolution('posEvento')}
                    disabled={sendingScript}
                    className="btn btn--outline"
                    style={{ textAlign: 'left', fontSize: '0.85rem', padding: '8px 12px', justifyContent: 'flex-start', color: '#FFF', borderColor: 'var(--border-color)', background: 'none', cursor: sendingScript ? 'not-allowed' : 'pointer' }}
                  >
                    <span style={{ color: '#4CAF50', marginRight: '8px' }}>⭐ 3. Pós-Evento (NPS):</span>
                    Disparo automático usando o texto/imagem configurados.
                  </button>

                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Dados do Cliente</h4>
                <div className="admin-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Nome:</strong> {selectedLead.nome} {selectedLead.sobrenome}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Telefone:</strong> {selectedLead.telefone}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Cidade:</strong> {selectedLead.cidade}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Dados do Evento</h4>
                <div className="admin-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Data:</strong> {selectedLead.dataEvento}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Convidados:</strong> {selectedLead.convidados}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Tipo:</strong> {selectedLead.tipoEvento}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Pacote:</strong> <span style={{ color: 'var(--primary)' }}>{selectedLead.pacote}</span></div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Escolhas Adicionais</h4>
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Drinks Escolhidos:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedLead.drinksEscolhidos?.map(d => (
                        <span key={d} style={{ background: '#333', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Chopp:</strong> {selectedLead.upsellChopp ? 'Sim 🍺' : 'Não'}</div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Frozen:</strong> {selectedLead.upsellFrozen ? 'Sim ❄️' : 'Não'}</div>
                  </div>
                </div>
              </div>

              {selectedLead.shoppingListFinalizada && selectedLead.shoppingListResult && (
                <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px', marginBottom: '16px', borderLeft: '4px solid #4CAF50' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#4CAF50', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>🛒 Lista de Compras Gerada</h4>
                  <div style={{ fontSize: '0.9rem' }}>
                    
                    {selectedLead.shoppingListResult.insumos && Object.keys(selectedLead.shoppingListResult.insumos).length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Insumos e Bebidas:</strong>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#FFF' }}>
                          {Object.entries(selectedLead.shoppingListResult.insumos).map(([insumo, qtd]) => (
                            <li key={insumo} style={{ marginBottom: '4px' }}>
                              {insumo}: <strong style={{ color: 'var(--primary)' }}>{qtd}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedLead.shoppingListResult.fixos && selectedLead.shoppingListResult.fixos.length > 0 && (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Itens Fixos / Descartáveis:</strong>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#FFF' }}>
                          {selectedLead.shoppingListResult.fixos.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>
                              {item.nome}: <strong style={{ color: 'var(--primary)' }}>{item.quantidade} {item.unidade}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
