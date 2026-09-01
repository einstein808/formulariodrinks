"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiLink, FiX, FiSend } from 'react-icons/fi';
import CategoriasManagerSection from './parceiros/CategoriasManagerSection';
import ParceiroForm from './parceiros/ParceiroForm';
import ParceiroCard from './parceiros/ParceiroCard';

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
  if (!value) return '';
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

const CATEGORIAS_DEFAULT = [
  { slug: 'cerimonialista', nome: 'Cerimonialista', cor: '#cba153' },
  { slug: 'cantor', nome: 'Cantor', cor: '#4cbb7b' },
  { slug: 'pagodeiro', nome: 'Pagodeiro', cor: '#e67e22' },
  { slug: 'decoracao', nome: 'Decoração', cor: '#e84393' },
];

export default function CerimonialstasManager() {
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form & Edit state
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    foto: '',
    categorias: ['cerimonialista'],
    exibirNaVitrine: true
  });
  const [saving, setSaving] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [errors, setErrors] = useState({});
  const [siteUrl, setSiteUrl] = useState('');

  // Toast & Modals
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const confirmModalRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const showConfirm = (message, onConfirm, title = "Confirmação") => {
    setConfirmModal({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      },
      onCancel: () => {
        setConfirmModal(null);
      }
    });
    window.history.pushState({ modal: 'confirm' }, '');
    confirmModalRef.current = true;
  };

  useEffect(() => {
    const handlePopState = () => {
      if (confirmModalRef.current) {
        confirmModalRef.current = false;
        setConfirmModal(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Parceiros
    const unsubParceiros = onValue(ref(db, 'config/cerimonialistas'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([slug, val]) => ({ slug, ...val }));
        arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        setParceiros(arr);
      } else {
        setParceiros([]);
      }
      setLoading(false);
    });

    // Categorias
    const unsubCats = onValue(ref(db, 'config/categorias-parceiros'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([slug, val]) => ({ slug, ...val }));
        arr.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
        setCategorias(arr);
      } else {
        CATEGORIAS_DEFAULT.forEach((cat, index) => {
          set(ref(db, `config/categorias-parceiros/${cat.slug}`), {
            ...cat,
            ordem: index
          });
        });
        setCategorias(CATEGORIAS_DEFAULT);
      }
    });

    // Site URL
    const unsubConfig = onValue(ref(db, 'config/general'), (snap) => {
      if (snap.exists() && snap.val().siteUrl) {
        const url = snap.val().siteUrl;
        setSiteUrl(url.endsWith('/') ? url.slice(0, -1) : url);
      } else {
        setSiteUrl(typeof window !== 'undefined' ? window.location.origin : '');
      }
    });

    return () => {
      unsubParceiros();
      unsubCats();
      unsubConfig();
    };
  }, []);

  // CRUD Categorias
  const handleAddCategory = async (nome, cor) => {
    const catSlug = slugify(nome);
    try {
      await set(ref(db, `config/categorias-parceiros/${catSlug}`), {
        slug: catSlug,
        nome,
        cor: cor || '#cba153',
        ordem: categorias.length
      });
      showToast(`Categoria "${nome}" adicionada!`, 'success');
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      showToast('Erro ao criar categoria.', 'error');
    }
  };

  const handleDeleteCategory = (catSlug, catNome) => {
    showConfirm(`Deseja excluir a categoria "${catNome}"?`, async () => {
      try {
        await remove(ref(db, `config/categorias-parceiros/${catSlug}`));
        showToast('Categoria removida!', 'success');
      } catch (err) {
        console.error('Erro ao excluir categoria:', err);
        showToast('Erro ao excluir categoria.', 'error');
      }
    }, 'Excluir Categoria');
  };

  // Edição de Parceiro
  const handleStartEdit = (parceiro) => {
    setEditingSlug(parceiro.slug);
    const pCats = Array.isArray(parceiro.categorias) 
      ? parceiro.categorias 
      : (parceiro.categoria ? [parceiro.categoria] : ['cerimonialista']);
    
    setForm({
      nome: parceiro.nome || '',
      whatsapp: formatPhone(parceiro.whatsapp),
      foto: parceiro.foto || '',
      categorias: pCats,
      exibirNaVitrine: parceiro.exibirNaVitrine !== false
    });
    setErrors({});

    // Scroll até o formulário
    const el = document.getElementById('form-parceiro');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingSlug(null);
    setForm({
      nome: '',
      whatsapp: '',
      foto: '',
      categorias: categorias.length > 0 ? [categorias[0].slug] : ['cerimonialista'],
      exibirNaVitrine: true
    });
    setErrors({});
  };

  // Toggle rápido de exibição na vitrine direto do card
  const handleToggleVitrine = async (slug, novoStatus) => {
    try {
      await update(ref(db, `config/cerimonialistas/${slug}`), {
        exibirNaVitrine: novoStatus
      });
      showToast(
        novoStatus ? 'Parceiro agora está visível na vitrine pública!' : 'Parceiro agora está oculto da vitrine (apenas indicação)',
        'success'
      );
    } catch (err) {
      console.error('Erro ao alterar visibilidade na vitrine:', err);
      showToast('Erro ao atualizar visibilidade.', 'error');
    }
  };

  // Validação do Form
  const validateForm = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    const digits = form.whatsapp.replace(/\D/g, '');
    if (digits.length < 10) e.whatsapp = 'WhatsApp inválido';
    if (!form.categorias || form.categorias.length === 0) e.categorias = 'Selecione pelo menos uma categoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveParceiro = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingSlug) {
        // Modo Edição
        await update(ref(db, `config/cerimonialistas/${editingSlug}`), {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.replace(/\D/g, ''),
          foto: form.foto || '',
          categorias: form.categorias,
          exibirNaVitrine: Boolean(form.exibirNaVitrine),
          atualizadoEm: new Date().toISOString()
        });

        showToast('Parceiro atualizado com sucesso!', 'success');
        handleCancelEdit();
      } else {
        // Modo Criação
        const slug = slugify(form.nome);
        if (parceiros.some(p => p.slug === slug)) {
          setErrors({ nome: `Já existe um parceiro com slug "${slug}". Use um nome diferente.` });
          setSaving(false);
          return;
        }

        await set(ref(db, `config/cerimonialistas/${slug}`), {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.replace(/\D/g, ''),
          foto: form.foto || '',
          categorias: form.categorias,
          exibirNaVitrine: Boolean(form.exibirNaVitrine),
          slug,
          ativo: true,
          criadoEm: new Date().toISOString(),
        });

        setForm({
          nome: '',
          whatsapp: '',
          foto: '',
          categorias: categorias.length > 0 ? [categorias[0].slug] : ['cerimonialista'],
          exibirNaVitrine: true
        });
        setErrors({});
        showToast('Parceiro cadastrado com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar parceiro:', err);
      showToast('Erro ao salvar parceiro. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParceiro = async (slug, nome) => {
    showConfirm(`Excluir "${nome}"? Os leads vinculados não serão afetados.`, async () => {
      try {
        await remove(ref(db, `config/cerimonialistas/${slug}`));
        if (editingSlug === slug) handleCancelEdit();
        showToast('Parceiro excluído com sucesso!', 'success');
      } catch (err) {
        console.error('Erro ao excluir:', err);
        showToast('Erro ao excluir parceiro. Tente novamente.', 'error');
      }
    }, 'Excluir Parceiro');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
              Gestão de Parceiros
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Cadastre, edite e categorize cantores, pagodeiros, decoradores e cerimonialistas. Defina quem aparece na vitrine pública ou apenas como parceiro de indicação.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/parceiros"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '8px 16px' }}
            >
              <FiLink size={14} /> Ver Vitrine Pública (/parceiros)
            </a>
          </div>
        </div>
      </div>

      {/* 1. Categorias */}
      <CategoriasManagerSection
        categorias={categorias}
        onAddCategoria={handleAddCategory}
        onDeleteCategoria={handleDeleteCategory}
      />

      {/* 2. Formulário (Novo ou Edição) */}
      <ParceiroForm
        form={form}
        setForm={setForm}
        errors={errors}
        saving={saving}
        categorias={categorias}
        editingSlug={editingSlug}
        onSave={handleSaveParceiro}
        onCancelEdit={handleCancelEdit}
      />

      {/* 3. Lista de Parceiros */}
      {parceiros.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-input)', borderRadius: '12px',
          border: '1px dashed var(--border-color)', color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤝</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>Nenhum parceiro cadastrado ainda.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Cadastre cantores, cerimonialistas ou decoradores acima!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {parceiros.map((p) => (
            <ParceiroCard
              key={p.slug}
              parceiro={p}
              categorias={categorias}
              siteUrl={siteUrl}
              copiedSlug={copiedSlug}
              onCopyLink={copyLink}
              onEdit={handleStartEdit}
              onToggleVitrine={handleToggleVitrine}
              onDelete={handleDeleteParceiro}
            />
          ))}
        </div>
      )}

      {/* ── TOAST NOTIFICATION ───────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(14, 26, 18, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${
            toast.type === 'success' ? '#4CAF50' : 
            toast.type === 'error' ? '#F44336' : '#FFD54F'
          }`,
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '360px',
          animation: 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 
              toast.type === 'success' ? '#4CAF50' : 
              toast.type === 'error' ? '#F44336' : '#FFD54F',
            boxShadow: `0 0 8px ${
              toast.type === 'success' ? '#4CAF50' : 
              toast.type === 'error' ? '#F44336' : '#FFD54F'
            }`,
            flexShrink: 0
          }} />
          <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500', lineHeight: 1.4 }}>
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* ── CUSTOM CONFIRM MODAL ─────────────────────────────── */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 10, 6, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.15rem' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={confirmModal.onCancel}
                className="btn btn--outline"
                style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="btn btn--primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none', color: 'var(--bg-dark)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
