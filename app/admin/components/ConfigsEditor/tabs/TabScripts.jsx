"use client";
import React from 'react';
import { useConfigs } from '../context/ConfigsContext';

export default function TabScripts() {
  const { scripts, setScripts, general, setGeneral } = useConfigs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      
      {/* Bloco de Variáveis Mágicas */}
      <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #00E5FF' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#FFF' }}>
          <strong>Variáveis Mágicas:</strong> Você pode usar as tags abaixo no meio dos textos e o sistema substituirá automaticamente pelos dados de cada cliente ao enviar:
        </p>
        <code style={{ display: 'block', marginTop: '8px', color: '#00E5FF', fontSize: '0.82rem', lineHeight: '1.6' }}>
          {`{{nome}}`} | {`{{pacote}}`} | {`{{dataEvento}}`} | {`{{mes}}`} | {`{{ano}}`} | {`{{cidade}}`} | {`{{convidados}}`} | {`{{duracao}}`} | {`{{linkContrato}}`} | {`{{linkAvaliacao}}`}
        </code>
      </div>

      <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Scripts de Atendimento do WhatsApp</h3>

        {/* 1. Autoridade */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>📸 1. Mostrar Autoridade</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.autoridade?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, autoridade: { ...scripts.autoridade, text: e.target.value } })} 
            placeholder="Ex: Olá {{nome}}, tudo bem? Lembrei do seu evento..."
            style={{ resize: 'vertical', marginBottom: '8px' }}
          />
          <label className="form-label" style={{ fontSize: '0.78rem' }}>URL da Imagem / Post do Instagram (Opcional)</label>
          <input type="text" className="form-input" value={scripts.autoridade?.image || ''} onChange={(e) => setScripts({ ...scripts, autoridade: { ...scripts.autoridade, image: e.target.value } })} placeholder="https://..." />
        </div>

        {/* 2. Escassez */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>🔥 2. Escassez & Fechamento</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.escassez?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, escassez: { ...scripts.escassez, text: e.target.value } })} 
            style={{ resize: 'vertical', marginBottom: '8px' }}
          />
          <label className="form-label" style={{ fontSize: '0.78rem' }}>URL da Imagem / Foto (Opcional)</label>
          <input type="text" className="form-input" value={scripts.escassez?.image || ''} onChange={(e) => setScripts({ ...scripts, escassez: { ...scripts.escassez, image: e.target.value } })} placeholder="https://..." />
        </div>

        {/* 3. Pós-Evento */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>⭐ 3. Pós-Evento (NPS & Avaliação)</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.posEvento?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, posEvento: { ...scripts.posEvento, text: e.target.value } })} 
            style={{ resize: 'vertical', marginBottom: '8px' }}
          />
          <label className="form-label" style={{ fontSize: '0.78rem' }}>URL da Imagem / Foto (Opcional)</label>
          <input type="text" className="form-input" value={scripts.posEvento?.image || ''} onChange={(e) => setScripts({ ...scripts, posEvento: { ...scripts.posEvento, image: e.target.value } })} placeholder="https://..." />
        </div>

        {/* 4. Envio de Contrato */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>✍️ 4. Envio de Contrato</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.contrato?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, contrato: { ...scripts.contrato, text: e.target.value } })} 
            placeholder="Ex: Olá {{nome}}! Acesse seu contrato digital e selecione seus drinks em: {{linkContrato}}"
            style={{ resize: 'vertical', marginBottom: '8px' }}
          />
          <label className="form-label" style={{ fontSize: '0.78rem' }}>URL da Imagem (Opcional)</label>
          <input type="text" className="form-input" value={scripts.contrato?.image || ''} onChange={(e) => setScripts({ ...scripts, contrato: { ...scripts.contrato, image: e.target.value } })} placeholder="https://..." />
        </div>

        {/* 5. Estou a Caminho (Saída da Equipe) */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#FFD54F', marginBottom: '8px', fontSize: '0.95rem' }}>🚗 5. Estou a Caminho (Saída da Equipe)</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.aCaminho?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, aCaminho: { ...scripts.aCaminho, text: e.target.value } })} 
            placeholder="Ex: Olá, {{nome}}! 🚗💨 A equipe do Laboratório de Drinks já está a caminho do seu evento em {{cidade}}! Qualquer orientação sobre a chegada, pode nos avisar por aqui. Até breve! 🍸"
            style={{ resize: 'vertical', marginBottom: '8px' }}
          />
          <label className="form-label" style={{ fontSize: '0.78rem' }}>URL da Imagem / Foto da Equipe (Opcional)</label>
          <input type="text" className="form-input" value={scripts.aCaminho?.image || ''} onChange={(e) => setScripts({ ...scripts, aCaminho: { ...scripts.aCaminho, image: e.target.value } })} placeholder="https://..." />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>⏰ Retargeting Automático (Falta 30 e 15 dias)</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Textos enviados automaticamente para leads ainda não fechados quando a data do evento estiver próxima.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>⏰ Faltam 30 Dias</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.retarget30?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, retarget30: { ...scripts.retarget30, text: e.target.value } })} 
            style={{ resize: 'vertical', marginBottom: '8px' }}
            placeholder="Ex: Oi {{nome}}! Falta 1 mês para o seu evento. Já fechou a equipe de bar?"
          />
          <input type="text" className="form-input" value={scripts.retarget30?.image || ''} onChange={(e) => setScripts({ ...scripts, retarget30: { ...scripts.retarget30, image: e.target.value } })} placeholder="URL da foto/vídeo (opcional)" />
        </div>

        <div>
          <h4 style={{ color: '#FFF', marginBottom: '8px', fontSize: '0.95rem' }}>⏰ Faltam 15 Dias (Urgência)</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={scripts.retarget15?.text || ''} 
            onChange={(e) => setScripts({ ...scripts, retarget15: { ...scripts.retarget15, text: e.target.value } })} 
            style={{ resize: 'vertical', marginBottom: '8px' }}
            placeholder="Ex: Oi {{nome}}! Seu evento é daqui a 15 dias! Corre que ainda temos a data disponível!"
          />
          <input type="text" className="form-input" value={scripts.retarget15?.image || ''} onChange={(e) => setScripts({ ...scripts, retarget15: { ...scripts.retarget15, image: e.target.value } })} placeholder="URL da foto/vídeo (opcional)" />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>💬 Textos Padrão de Proposta e PDF</h3>

        <div style={{ marginBottom: '18px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '6px', fontSize: '0.95rem' }}>Introdução da Mensagem de Orçamento</h4>
          <textarea 
            className="form-input" 
            rows={3} 
            value={general.orcamentoIntro || ''} 
            onChange={(e) => setGeneral({ ...general, orcamentoIntro: e.target.value })} 
            placeholder="Olá, *{{nome}}*! Tudo bem? 😊 Preparamos os seguintes orçamentos para o seu evento com *{{convidados}} convidados*..."
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '6px', fontSize: '0.95rem' }}>Fechamento da Mensagem de Orçamento</h4>
          <textarea 
            className="form-input" 
            rows={2} 
            value={general.orcamentoFim || ''} 
            onChange={(e) => setGeneral({ ...general, orcamentoFim: e.target.value })} 
            placeholder="Qualquer dúvida ou quando quiser garantir sua data, é só responder aqui! 🥂"
          />
        </div>

        <div>
          <h4 style={{ color: '#FFF', marginBottom: '6px', fontSize: '0.95rem' }}>Legenda do Arquivo PDF do Contrato</h4>
          <textarea 
            className="form-input" 
            rows={2} 
            value={general.contratoLegenda || ''} 
            onChange={(e) => setGeneral({ ...general, contratoLegenda: e.target.value })} 
            placeholder="Segue seu contrato em anexo. Por gentileza, confira os dados e nos envie assinado."
          />
        </div>

      </div>
    </div>
  );
}