"use client";
import React from 'react';
import { useConfigs } from '../context/ConfigsContext';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';

export default function TabGeral() {
  const { general, setGeneral } = useConfigs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--primary)' }}>Dados da Empresa & White-Label</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
          Personalize as informações da sua empresa de bar, logotipo, cidade de atendimento e links de contato.
        </p>

        <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label">Nome da Empresa</label>
            <input type="text" className="form-input" value={general.companyName || ''} onChange={(e) => setGeneral({ ...general, companyName: e.target.value })} placeholder="Ex: Laboratório de Drinks" />
          </div>
          <div>
            <label className="form-label">Cidade Principal de Atuação</label>
            <input type="text" className="form-input" value={general.companyCity || ''} onChange={(e) => setGeneral({ ...general, companyCity: e.target.value })} placeholder="Ex: Juiz de Fora" />
          </div>
        </div>

        {/* Aparência & Tema */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 14px 0', color: 'var(--primary)', fontSize: '0.92rem' }}>🎨 Identidade Visual & Tema</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Cor de Destaque Primária</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={general.primaryColor || '#cba153'}
                  onChange={(e) => {
                    setGeneral({ ...general, primaryColor: e.target.value });
                    document.documentElement.style.setProperty('--primary', e.target.value);
                    document.documentElement.style.setProperty('--text-accent', e.target.value);
                  }}
                  style={{ width: '44px', height: '44px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={general.primaryColor || ''}
                  onChange={(e) => setGeneral({ ...general, primaryColor: e.target.value })}
                  placeholder="#cba153"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Modo de Exibição</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                {[
                  { value: 'dark', label: '🌙 Escuro' },
                  { value: 'light', label: '☀️ Claro' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setGeneral({ ...general, themeMode: opt.value });
                      document.documentElement.setAttribute('data-theme', opt.value);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${(general.themeMode || 'dark') === opt.value ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: (general.themeMode || 'dark') === opt.value ? 'rgba(203,161,83,0.1)' : 'transparent',
                      color: (general.themeMode || 'dark') === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: (general.themeMode || 'dark') === opt.value ? 'bold' : 'normal'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contatos & Logo */}
        <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label">WhatsApp de Atendimento (Com DDD)</label>
            <input type="text" className="form-input" value={general.whatsappNumber || ''} onChange={(e) => setGeneral({ ...general, whatsappNumber: e.target.value })} placeholder="Ex: 32999999999" />
          </div>
          <div>
            <label className="form-label">Instagram da Empresa</label>
            <input type="text" className="form-input" value={general.instagramUrl || ''} onChange={(e) => setGeneral({ ...general, instagramUrl: e.target.value })} placeholder="https://instagram.com/laboratoriodedrinks" />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Logo da Empresa</label>
          <MinioImageUpload 
            value={general.logoUrl || ''} 
            onChange={(url) => setGeneral({ ...general, logoUrl: url })} 
            placeholder="Selecione o logo oficial da empresa" 
          />
        </div>

        {/* SEO & Textos do Site */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Título Principal da Home (H1)</label>
          <input type="text" className="form-input" value={general.siteTitle || ''} onChange={(e) => setGeneral({ ...general, siteTitle: e.target.value })} placeholder="Barman em Juiz de Fora: Transforme seu evento com o Laboratório de Drinks" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Subtítulo / Descrição da Home</label>
          <textarea 
            className="form-input" 
            rows={2}
            value={general.siteSubtitle || ''} 
            onChange={(e) => setGeneral({ ...general, siteSubtitle: e.target.value })} 
            placeholder="O bar de coquetéis premium que leva sofisticação para a sua festa." 
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

        {/* Alertas Admin & Reviews */}
        <div style={{ marginBottom: '16px', background: 'rgba(255, 213, 79, 0.08)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #FFD54F' }}>
          <label className="form-label" style={{ color: '#FFD54F', fontWeight: 'bold' }}>
            🔔 Telefones do Administrador (Alertas de Festas Próximas)
          </label>
          <input type="text" className="form-input" value={general.adminPhone || ''} onChange={(e) => setGeneral({ ...general, adminPhone: e.target.value })} placeholder="Ex: 32999999999, 32988888888" />
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Números com DDD separados por vírgula. O sistema enviará alertas automáticos de 15, 7 e 3 dias antes dos eventos confirmados.
          </p>
        </div>

        <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label">Link de Avaliação Google Meu Negócio</label>
            <input type="text" className="form-input" value={general.googleReviewLink || ''} onChange={(e) => setGeneral({ ...general, googleReviewLink: e.target.value })} placeholder="https://g.page/r/.../review" />
          </div>
          <div>
            <label className="form-label">Preço Adicional de Copos de Vidro (R$ por convidado)</label>
            <input 
              type="number" 
              step="0.01" 
              min="0"
              className="form-input" 
              value={general.precoCopoVidro !== undefined ? general.precoCopoVidro : ''} 
              onChange={(e) => setGeneral({ ...general, precoCopoVidro: e.target.value === '' ? '' : parseFloat(e.target.value) })} 
              placeholder="Padrão: 3.50" 
            />
          </div>
        </div>

        <div>
          <label className="form-label">Print das Avaliações do Google (Upload Minio)</label>
          <MinioImageUpload 
            value={general.googleReviewsPrint || ''} 
            onChange={(url) => setGeneral({ ...general, googleReviewsPrint: url })} 
            placeholder="Clique para subir o print do Google Reviews" 
          />
        </div>
      </div>
    </div>
  );
}