import React from 'react';
import { FiHeart, FiFileText, FiList } from 'react-icons/fi';
import { formatPhone } from '@/lib/utils';
import AddressMapPicker from '@/components/AddressMapPicker';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';
import { ref, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function TabInfo({
  selectedLead,
  setSelectedLead,
  isEditingLead,
  editLeadData,
  setEditLeadData,
  pacotes,
  cerimonialistas,
  aiFollowupLoading,
  aiFollowupResult,
  aiFollowupCopied,
  handleGenerateFollowup,
  handleCopyFollowup,
  sendingScript,
  showToast,
  showConfirm
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🤖 IA FOLLOW-UP GENERATOR CARD */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(203,161,83,0.08))',
        border: '1px solid rgba(0,229,255,0.25)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <span style={{ fontWeight: 'bold', color: '#00E5FF', fontSize: '0.9rem' }}>Follow-up Inteligente com IA</span>
          </div>
          <button
            onClick={handleGenerateFollowup}
            disabled={aiFollowupLoading}
            style={{
              background: 'linear-gradient(135deg, #00E5FF, #00B4D8)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: aiFollowupLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: aiFollowupLoading ? 0.7 : 1
            }}
          >
            {aiFollowupLoading ? '✨ Escrevendo...' : '✨ Gerar Mensagem Personalizada'}
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          Cria uma mensagem de WhatsApp personalizada para o cliente baseada na data, convidados, pacote e dias desde o contato.
        </p>

        {aiFollowupResult && (
          <div style={{ background: 'var(--bg-main)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.82rem', lineHeight: '1.5', fontFamily: 'inherit' }}>
              {aiFollowupResult}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={handleCopyFollowup}
                style={{
                  flex: 1,
                  background: aiFollowupCopied ? '#4CAF50' : 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
              >
                {aiFollowupCopied ? '✓ Copiado para a área de transferência!' : '📋 Copiar Mensagem'}
              </button>
              <a
                href={`https://wa.me/55${(selectedLead.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(aiFollowupResult)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#25D366',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💬 Abrir no WhatsApp
              </a>
              <button
                onClick={handleGenerateFollowup}
                disabled={aiFollowupLoading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)', borderRadius: '8px', padding: '9px 12px',
                  cursor: aiFollowupLoading ? 'not-allowed' : 'pointer', fontSize: '0.82rem'
                }}
                title="Gerar nova versão"
              >
                🔄
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cerimonialista Parceiro */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FiHeart size={16} style={{ color: '#E91E63', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cerimonialista Parceiro</label>
          <select
            value={selectedLead.cerimonialista || ''}
            onChange={async (e) => {
              const val = e.target.value;
              await update(ref(db, `leads/${selectedLead.id}`), { cerimonialista: val });
              setSelectedLead(prev => ({ ...prev, cerimonialista: val }));
            }}
            className="form-select"
            style={{ 
              marginTop: 0, 
              background: 'var(--bg-input)', 
              borderColor: 'rgba(203, 161, 83, 0.15)',
              borderRadius: '8px',
              padding: '8px 12px',
              height: '40px',
              fontSize: '0.85rem'
            }}
          >
            <option value="">— Sem parceiro / Direto —</option>
            {Object.entries(cerimonialistas || {}).map(([slug, c]) => (
              <option key={slug} value={slug}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Client & Event Data Forms */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
        <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px' }}>
          Dados Cadastrais
        </h4>
        
        {isEditingLead ? (
          <div className="admin-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome</label>
              <input className="form-input" value={editLeadData.nome || ''} onChange={e => setEditLeadData({...editLeadData, nome: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Sobrenome</label>
              <input className="form-input" value={editLeadData.sobrenome || ''} onChange={e => setEditLeadData({...editLeadData, sobrenome: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Telefone</label>
              <input className="form-input" value={editLeadData.telefone || ''} onChange={e => setEditLeadData({...editLeadData, telefone: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cidade</label>
              <input className="form-input" value={editLeadData.cidade || ''} onChange={e => setEditLeadData({...editLeadData, cidade: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Data do Evento</label>
              <input type="date" className="form-input" value={editLeadData.dataEvento || ''} onChange={e => setEditLeadData({...editLeadData, dataEvento: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Horário</label>
              <input type="time" className="form-input" value={editLeadData.horarioEvento || ''} onChange={e => setEditLeadData({...editLeadData, horarioEvento: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Convidados</label>
              <input type="number" className="form-input" value={editLeadData.convidados || ''} onChange={e => setEditLeadData({...editLeadData, convidados: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tipo de Evento</label>
              <input className="form-input" value={editLeadData.tipoEvento || ''} onChange={e => setEditLeadData({...editLeadData, tipoEvento: e.target.value})} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pacote Contratado</label>
              <select className="form-select" value={editLeadData.pacote || ''} onChange={e => setEditLeadData({...editLeadData, pacote: e.target.value})}>
                <option value="">Selecione</option>
                {pacotes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>📍 Endereço & Pino no Mapa do Evento</label>
              <AddressMapPicker
                value={{
                  rua: editLeadData.rua,
                  bairro: editLeadData.bairro,
                  cidade: editLeadData.cidade,
                  lat: editLeadData.lat,
                  lng: editLeadData.lng,
                  fullAddress: [editLeadData.rua, editLeadData.bairro, editLeadData.cidade].filter(Boolean).join(', ')
                }}
                onChange={(loc) => {
                  setEditLeadData(prev => ({
                    ...prev,
                    rua: loc.rua !== undefined ? loc.rua : prev.rua,
                    numero: loc.numero ? loc.numero : prev.numero,
                    bairro: loc.bairro !== undefined ? loc.bairro : prev.bairro,
                    cidade: loc.cidade || prev.cidade,
                    lat: loc.lat !== undefined ? loc.lat : prev.lat,
                    lng: loc.lng !== undefined ? loc.lng : prev.lng,
                    cep: loc.cep || prev.cep
                  }));
                }}
              />
            </div>
          </div>
        ) : (
          <div className="admin-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Cliente:</strong> {selectedLead.nome} {selectedLead.sobrenome || ''}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Telefone:</strong> {formatPhone(selectedLead.telefone)}</div>
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Cidade:</strong> {selectedLead.cidade || '—'}
              {(() => {
                const loc = [selectedLead.rua, selectedLead.numero, selectedLead.bairro, selectedLead.cidade].filter(Boolean).join(', ') || selectedLead.cidade || selectedLead.local || '';
                if (!loc) return null;
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
                const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(loc)}&navigate=yes`;
                return (
                  <span style={{ display: 'inline-flex', gap: '6px', marginLeft: '8px' }}>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(66, 133, 244, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>🗺️ Maps</a>
                    <a href={wazeUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#33CCFF', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(51, 204, 255, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>🚙 Waze</a>
                  </span>
                );
              })()}
            </div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Tipo:</strong> {selectedLead.tipoEvento || '—'}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Data:</strong> {selectedLead.dataEvento ? selectedLead.dataEvento.split('-').reverse().join('/') : '—'}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Horário:</strong> {selectedLead.horarioEvento || '—'}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Convidados:</strong> {selectedLead.convidados || '—'}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Pacote:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedLead.pacote || '—'}</span></div>
          </div>
        )}
      </div>

      {/* ✍️ CONTRATO ASSINADO & HISTÓRICO */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiFileText style={{ color: 'var(--primary)' }} /> Assinatura do Contrato
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Contrato Assinado pelo Cliente</label>
          
          {selectedLead.contratoAssinadoUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(76, 175, 80, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ Contrato Assinado Anexado
                </span>
                <button
                  onClick={() => {
                    showConfirm("Deseja remover o contrato assinado deste lead?", async () => {
                      await update(ref(db, `leads/${selectedLead.id}`), { contratoAssinadoUrl: null });
                      setSelectedLead(prev => ({ ...prev, contratoAssinadoUrl: null }));
                      
                      await push(ref(db, `leads/${selectedLead.id}/messages`), {
                        type: 'contrato_assinado_removido',
                        success: true,
                        sentAt: Date.now()
                      });
                      showToast("Contrato assinado removido com sucesso!", "success");
                    }, "Remover Contrato");
                  }}
                  style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                >
                  Remover
                </button>
              </div>
              <a 
                href={selectedLead.contratoAssinadoUrl} 
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', wordBreak: 'break-all' }}
              >
                Visualizar Contrato Assinado 📄
              </a>
            </div>
          ) : (
            <div style={{ background: 'rgba(255, 213, 79, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 213, 79, 0.12)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              ⏳ Aguardando assinatura do contrato.
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              {selectedLead.contratoAssinadoUrl ? 'Atualizar Contrato Assinado (PDF ou Imagem):' : 'Fazer Upload do Contrato Assinado (PDF ou Imagem):'}
            </label>
            <MinioImageUpload 
              value={selectedLead.contratoAssinadoUrl || ''} 
              accept="application/pdf,image/*"
              placeholder="Cole a URL ou suba o arquivo do contrato"
              onChange={async (url) => {
                if (url) {
                  await update(ref(db, `leads/${selectedLead.id}`), { contratoAssinadoUrl: url });
                  setSelectedLead(prev => ({ ...prev, contratoAssinadoUrl: url }));
                  
                  await push(ref(db, `leads/${selectedLead.id}/messages`), {
                    type: 'contrato_assinado_upload',
                    success: true,
                    sentAt: Date.now()
                  });
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 📜 HISTÓRICO DE INTERAÇÕES */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiList style={{ color: 'var(--primary)' }} /> Histórico de Envios e Interações
        </h4>

        {selectedLead.messages ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {Object.entries(selectedLead.messages)
              .map(([key, val]) => ({ key, ...val }))
              .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))
              .map((msg) => {
                const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleString('pt-BR') : '—';
                let actionLabel = 'Ação registrada';
                let icon = '💬';
                
                if (msg.type === 'orcamento') {
                  actionLabel = 'Orçamento enviado (PDF)';
                  icon = '📄';
                } else if (msg.type === 'contrato_gerado') {
                  actionLabel = 'Contrato gerado pelo cliente';
                  icon = '📝';
                } else if (msg.type === 'contrato_gerado_admin') {
                  actionLabel = 'Contrato gerado pelo admin';
                  icon = '⚙️';
                } else if (msg.type === 'script_contrato') {
                  actionLabel = 'Link do contrato enviado por WhatsApp';
                  icon = '🔗';
                } else if (msg.type?.startsWith('script_')) {
                  const scriptName = msg.type.split('_')[1];
                  const namesMap = { autoridade: '1. Autoridade', escassez: '2. Escassez', posEvento: '3. Pós-Evento' };
                  actionLabel = `Script WhatsApp enviado: ${namesMap[scriptName] || scriptName}`;
                  icon = '📲';
                } else if (msg.type === 'lista_compras') {
                  actionLabel = 'Link da Lista de Compras enviado';
                  icon = '🛒';
                } else if (msg.type === 'notif_cerimonialista') {
                  actionLabel = 'Notificação de fechamento enviada ao Cerimonialista';
                  icon = '🤝';
                } else if (msg.type?.startsWith('availability_check_')) {
                  actionLabel = 'Envio de teste de disponibilidade p/ ajudante';
                  icon = '⏳';
                } else if (msg.type?.startsWith('final_confirmation_')) {
                  actionLabel = 'Confirmação final de escala enviada p/ ajudante';
                  icon = '✅';
                } else if (msg.type === 'contrato_assinado_upload') {
                  actionLabel = 'Contrato assinado anexado pelo admin';
                  icon = '📁';
                } else if (msg.type === 'contrato_assinado_removido') {
                  actionLabel = 'Contrato assinado removido pelo admin';
                  icon = '🗑️';
                }

                const statusColor = msg.success ? '#4CAF50' : '#F44336';
                
                return (
                  <div key={msg.key} style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', borderLeft: `3px solid ${statusColor}`, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{icon} {actionLabel}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      <span>{msg.number ? `Destinatário: ${msg.number}` : ''}</span>
                      <span style={{ color: statusColor, fontWeight: 'bold' }}>
                        {msg.success ? 'Sucesso' : `Erro: ${msg.error || 'Falha no envio'}`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>
            Nenhuma interação registrada para este lead.
          </div>
        )}
      </div>
    </div>
  );
}
