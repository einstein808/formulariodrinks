import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiPlus, FiTrash2, FiCopy, FiCheck, FiUser, FiPhone, FiLink, FiAlertCircle } from 'react-icons/fi';

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

export default function CerimonialstasManager() {
  const [parceiros, setParceiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [errors, setErrors] = useState({});
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    const r = ref(db, 'config/cerimonialistas');
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([slug, val]) => ({ slug, ...val }));
        arr.sort((a, b) => a.nome.localeCompare(b.nome));
        setParceiros(arr);
      } else {
        setParceiros([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config/general');
    const unsubConfig = onValue(configRef, (snap) => {
      if (snap.exists() && snap.val().siteUrl) {
        const url = snap.val().siteUrl;
        setSiteUrl(url.endsWith('/') ? url.slice(0, -1) : url);
      } else {
        setSiteUrl(window.location.origin);
      }
    });

    return () => { unsub(); unsubConfig(); };
  }, []);

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    const digits = form.whatsapp.replace(/\D/g, '');
    if (digits.length < 10) e.whatsapp = 'WhatsApp inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const slug = slugify(form.nome);
      if (parceiros.some(p => p.slug === slug)) {
        setErrors({ nome: `Já existe um parceiro com slug "${slug}". Use um nome diferente.` });
        setSaving(false);
        return;
      }
      await set(ref(db, `config/cerimonialistas/${slug}`), {
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        slug,
        ativo: true,
        criadoEm: new Date().toISOString(),
      });
      setForm({ nome: '', whatsapp: '' });
      setErrors({});
    } catch (err) {
      console.error('Erro ao salvar parceiro:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug, nome) => {
    if (!window.confirm(`Excluir "${nome}"? Os leads vinculados não serão afetados.`)) return;
    try {
      await remove(ref(db, `config/cerimonialistas/${slug}`));
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir. Tente novamente.');
    }
  };

  const copyLink = (slug) => {
    const link = `${siteUrl}/?ref=${slug}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
          Parceiros Cerimonialistas
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Cadastre seus parceiros e gere links rastreáveis para identificar indicações.
        </p>
      </div>

      {/* Form de Cadastro */}
      <div style={{
        background: 'var(--bg-input)', borderRadius: '12px', padding: '24px',
        border: '1px solid var(--border-color)', marginBottom: '32px',
        borderTop: '4px solid var(--primary)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#FFF', fontSize: '1rem' }}>
          <FiPlus style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Novo Parceiro
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
          {/* Nome */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              <FiUser size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Nome do Cerimonialista
            </label>
            <input
              type="text"
              className={`form-input ${errors.nome ? 'form-input--error' : ''}`}
              placeholder="Ex: Maria Fernanda"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {errors.nome && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.nome}</span>}
            {form.nome && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Link: <code style={{ color: 'var(--primary)' }}>/?ref={slugify(form.nome)}</code>
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
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {errors.whatsapp && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.whatsapp}</span>}
          </div>

          {/* Botão */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn--primary"
            style={{ height: 44, whiteSpace: 'nowrap' }}
          >
            {saving ? <div className="btn__spinner" /> : <><FiPlus size={16} /> Cadastrar</>}
          </button>
        </div>
      </div>

      {/* Lista de Parceiros */}
      {parceiros.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-input)', borderRadius: '12px',
          border: '1px dashed var(--border-color)', color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤝</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>Nenhum parceiro cadastrado ainda.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Cadastre seu primeiro cerimonialista acima!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {parceiros.map((p) => {
            const link = `${siteUrl}/?ref=${p.slug}`;
            const isCopied = copiedSlug === p.slug;
            return (
              <div
                key={p.slug}
                style={{
                  background: 'var(--bg-input)', borderRadius: '10px', padding: '16px 20px',
                  border: '1px solid var(--border-color)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto',
                  gap: '16px', alignItems: 'center',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Nome */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Parceiro</div>
                  <div style={{ fontWeight: 600, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(203,161,83,0.15)', border: '1px solid var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0
                    }}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    {p.nome}
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>WhatsApp</div>
                  <div style={{ color: '#25D366', fontWeight: 500, fontSize: '0.9rem' }}>
                    <FiPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {formatPhone(p.whatsapp)}
                  </div>
                </div>

                {/* Link */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                    <FiLink size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Link rastreável
                  </div>
                  <div style={{
                    fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    /?ref={p.slug}
                  </div>
                </div>

                {/* Copiar Link */}
                <button
                  onClick={() => copyLink(p.slug)}
                  className="btn btn--outline"
                  style={{
                    padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6,
                    borderColor: isCopied ? '#4CAF50' : 'var(--border-color)',
                    color: isCopied ? '#4CAF50' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                  title="Copiar link rastreável"
                >
                  {isCopied ? <><FiCheck size={14} /> Copiado!</> : <><FiCopy size={14} /> Copiar Link</>}
                </button>

                {/* Excluir */}
                <button
                  onClick={() => handleDelete(p.slug, p.nome)}
                  style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
                  title="Excluir parceiro"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
