"use client";
import React from 'react';
import { FiPlus, FiUser, FiPhone, FiImage, FiTag, FiCheck, FiEdit2, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import MinioImageUpload from '../MinioImageUpload';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function formatPhone(value) {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export default function ParceiroForm({
  form,
  setForm,
  errors,
  saving,
  categorias,
  editingSlug,
  onSave,
  onCancelEdit
}) {
  const isEditing = Boolean(editingSlug);

  const toggleCategory = (catSlug) => {
    setForm(prev => {
      const exists = prev.categorias.includes(catSlug);
      if (exists) {
        if (prev.categorias.length === 1) return prev;
        return { ...prev, categorias: prev.categorias.filter(c => c !== catSlug) };
      } else {
        return { ...prev, categorias: [...prev.categorias, catSlug] };
      }
    });
  };

  return (
    <div
      id="form-parceiro"
      style={{
        background: 'var(--bg-input)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        marginBottom: '32px',
        borderTop: isEditing ? '4px solid #4CAF50' : '4px solid var(--primary)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing ? (
            <>
              <FiEdit2 style={{ color: '#4CAF50' }} />
              Editar Parceiro: <span style={{ color: 'var(--primary)' }}>{form.nome || editingSlug}</span>
            </>
          ) : (
            <>
              <FiPlus style={{ color: 'var(--primary)' }} />
              Novo Parceiro
            </>
          )}
        </h3>

        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn btn--outline"
            style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto', minHeight: '34px', color: '#F44336', borderColor: 'rgba(244, 67, 54, 0.4)' }}
          >
            <FiX size={14} style={{ marginRight: 4 }} /> Cancelar Edição
          </button>
        )}
      </div>

      <div className="admin-team-grid" style={{ alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Nome */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            <FiUser size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Nome do Parceiro / Empresa
          </label>
          <input
            type="text"
            className={`form-input ${errors.nome ? 'form-input--error' : ''}`}
            placeholder="Ex: Cerimonial Maria Fernanda"
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSave()}
          />
          {errors.nome && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.nome}</span>}
          {form.nome && !isEditing && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Link de indicação: <code style={{ color: 'var(--primary)' }}>/?ref={slugify(form.nome)}</code>
            </span>
          )}
          {isEditing && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Slug do link mantido: <code style={{ color: 'var(--primary)' }}>/?ref={editingSlug}</code>
            </span>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            <FiPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            WhatsApp
          </label>
          <input
            type="tel"
            className={`form-input ${errors.whatsapp ? 'form-input--error' : ''}`}
            placeholder="(32) 99999-0000"
            value={form.whatsapp}
            onChange={e => setForm(p => ({ ...p, whatsapp: formatPhone(e.target.value) }))}
            onKeyDown={e => e.key === 'Enter' && onSave()}
          />
          {errors.whatsapp && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.whatsapp}</span>}
        </div>
      </div>

      {/* Upload de Foto (S3) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
          <FiImage size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Foto ou Logo do Parceiro (S3 / Upload)
        </label>
        <MinioImageUpload
          value={form.foto}
          onChange={(url) => setForm(p => ({ ...p, foto: url }))}
          placeholder="Faça upload da foto para exibição na vitrine pública..."
        />
      </div>

      {/* Categorias (Multi-select) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
          <FiTag size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Categorias do Parceiro (Selecione uma ou mais)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categorias.map(cat => {
            const isSelected = form.categorias.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: isSelected ? `1px solid ${cat.cor || 'var(--primary)'}` : '1px solid var(--border-color)',
                  background: isSelected ? (cat.cor || 'var(--primary)') : 'var(--bg-card)',
                  color: isSelected ? '#000' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                {isSelected && <FiCheck size={14} />}
                {cat.nome}
              </button>
            );
          })}
        </div>
        {errors.categorias && <span className="form-error" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.categorias}</span>}
      </div>

      {/* Opção de Exibir na Vitrine Pública */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '10px',
        padding: '14px 16px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: form.exibirNaVitrine ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: form.exibirNaVitrine ? '#4CAF50' : '#FFC107',
            flexShrink: 0
          }}>
            {form.exibirNaVitrine ? <FiEye size={18} /> : <FiEyeOff size={18} />}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {form.exibirNaVitrine ? 'Visível na Vitrine Pública (/parceiros)' : 'Oculto da Vitrine Pública (Apenas Indicação)'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {form.exibirNaVitrine 
                ? 'Aparecerá para clientes na página /parceiros com botão de WhatsApp.' 
                : 'Não aparecerá na página /parceiros, mas continuará ativo para links rastreáveis e campanhas.'}
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: form.exibirNaVitrine ? '#4CAF50' : 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={Boolean(form.exibirNaVitrine)}
            onChange={(e) => setForm(p => ({ ...p, exibirNaVitrine: e.target.checked }))}
            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span>{form.exibirNaVitrine ? 'Exibir na Vitrine' : 'Ocultar da Vitrine'}</span>
        </label>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn--primary"
          style={{ height: 44, padding: '0 24px' }}
        >
          {saving ? (
            <div className="btn__spinner" />
          ) : isEditing ? (
            <><FiCheck size={16} /> Salvar Alterações</>
          ) : (
            <><FiPlus size={16} /> Cadastrar Parceiro</>
          )}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn btn--outline"
            style={{ height: 44, padding: '0 20px' }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
