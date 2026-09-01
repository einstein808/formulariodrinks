"use client";
import React from 'react';
import { FiPhone, FiLink, FiCheck, FiCopy, FiTrash2, FiClock, FiEdit2, FiEye, FiEyeOff } from 'react-icons/fi';

function diasDesde(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatPhone(value) {
  if (!value) return '';
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export default function ParceiroCard({
  parceiro,
  categorias,
  siteUrl,
  copiedSlug,
  onCopyLink,
  onEdit,
  onToggleVitrine,
  onDelete
}) {
  const pCats = Array.isArray(parceiro.categorias) 
    ? parceiro.categorias 
    : (parceiro.categoria ? [parceiro.categoria] : ['cerimonialista']);
  
  const isCopied = copiedSlug === parceiro.slug;
  const dias = diasDesde(parceiro.ultimoContato);
  const naVitrine = parceiro.exibirNaVitrine !== false;

  const getCatObj = (catSlug) => {
    return categorias.find(c => c.slug === catSlug) || { nome: catSlug, cor: '#cba153' };
  };

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        transition: 'border-color 0.2s',
        opacity: naVitrine ? 1 : 0.88
      }}
    >
      {/* Info Parceiro com Foto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(203,161,83,0.15)',
          border: '1px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {parceiro.foto ? (
            <img src={parceiro.foto} alt={parceiro.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (parceiro.nome || '?').charAt(0).toUpperCase()
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
              {parceiro.nome}
            </span>

            {/* Badge de Visibilidade na Vitrine */}
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '8px',
                fontWeight: 600,
                background: naVitrine ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.12)',
                color: naVitrine ? '#4CAF50' : '#FFC107',
                border: `1px solid ${naVitrine ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {naVitrine ? <><FiEye size={11} /> Vitrine pública</> : <><FiEyeOff size={11} /> Só indicação</>}
            </span>
          </div>

          {/* Badges de Categorias */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
            {pCats.map(cSlug => {
              const cObj = getCatObj(cSlug);
              return (
                <span
                  key={cSlug}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: `${cObj.cor || '#cba153'}15`,
                    color: cObj.cor || 'var(--primary)',
                    border: `1px solid ${cObj.cor || 'var(--primary)'}30`
                  }}
                >
                  {cObj.nome}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* WhatsApp & Status Último Contato */}
      <div style={{ minWidth: '160px' }}>
        <div style={{ color: '#25D366', fontWeight: 600, fontSize: '0.9rem', marginBottom: '3px' }}>
          <FiPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {formatPhone(parceiro.whatsapp)}
        </div>
        <div style={{ fontSize: '0.75rem', color: dias === null || dias > 30 ? '#FFC107' : 'var(--text-muted)' }}>
          <FiClock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {dias === null ? 'Sem contato registrado' : (dias === 0 ? 'Contatado hoje' : `Último contato: há ${dias} dias`)}
        </div>
      </div>

      {/* Link Rastreável */}
      <div style={{ overflow: 'hidden', minWidth: '130px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>
          <FiLink size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Link rastreável
        </div>
        <div style={{
          fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          /?ref={parceiro.slug}
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Toggle rápido de vitrine */}
        <button
          onClick={() => onToggleVitrine(parceiro.slug, !naVitrine)}
          className="btn btn--outline"
          style={{
            padding: '8px 10px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: naVitrine ? '#4CAF50' : 'var(--text-muted)',
            borderColor: naVitrine ? 'rgba(76, 175, 80, 0.4)' : 'var(--border-color)'
          }}
          title={naVitrine ? 'Ocultar da vitrine pública' : 'Exibir na vitrine pública'}
        >
          {naVitrine ? <FiEye size={14} /> : <FiEyeOff size={14} />}
        </button>

        {/* Copiar Link */}
        <button
          onClick={() => onCopyLink(parceiro.slug)}
          className="btn btn--outline"
          style={{
            padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5,
            borderColor: isCopied ? '#4CAF50' : 'var(--border-color)',
            color: isCopied ? '#4CAF50' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
          title="Copiar link rastreável"
        >
          {isCopied ? <><FiCheck size={14} /> Copiado!</> : <><FiCopy size={14} /> Link</>}
        </button>

        {/* Editar */}
        <button
          onClick={() => onEdit(parceiro)}
          className="btn btn--outline"
          style={{
            padding: '8px 12px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--primary)',
            borderColor: 'rgba(203, 161, 83, 0.3)'
          }}
          title="Editar dados do parceiro"
        >
          <FiEdit2 size={14} /> Editar
        </button>

        {/* Excluir */}
        <button
          onClick={() => onDelete(parceiro.slug, parceiro.nome)}
          style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          title="Excluir parceiro"
        >
          <FiTrash2 size={17} />
        </button>
      </div>
    </div>
  );
}
