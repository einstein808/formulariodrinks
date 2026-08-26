import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiPlus, FiTrash2, FiUser, FiPhone, FiBriefcase, FiX } from 'react-icons/fi';

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

export default function AjudantesManager() {
  const [ajudantes, setAjudantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', telefone: '', especialidade: 'Bartender' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'warning' }
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, onCancel }

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

  // Listen to popstate to close confirmModal on mobile back button
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
    const r = ref(db, 'config/ajudantes');
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([slug, val]) => ({ slug, ...val }));
        arr.sort((a, b) => a.nome.localeCompare(b.nome));
        setAjudantes(arr);
      } else {
        setAjudantes([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    const digits = form.telefone.replace(/\D/g, '');
    if (digits.length < 10) e.telefone = 'Telefone inválido';
    if (!form.especialidade.trim()) e.especialidade = 'Especialidade é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const slug = slugify(form.nome);
      if (ajudantes.some(a => a.slug === slug)) {
        setErrors({ nome: `Já existe um ajudante com slug "${slug}". Use um nome diferente ou sobrenome.` });
        setSaving(false);
        return;
      }
      await set(ref(db, `config/ajudantes/${slug}`), {
        nome: form.nome.trim(),
        telefone: form.telefone.replace(/\D/g, ''),
        especialidade: form.especialidade.trim(),
        slug,
        ativo: true,
        criadoEm: new Date().toISOString(),
      });
      setForm({ nome: '', telefone: '', especialidade: 'Bartender' });
      setErrors({});
      showToast('Ajudante cadastrado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar ajudante:', err);
      showToast('Erro ao salvar ajudante. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug, nome) => {
    showConfirm(`Excluir ajudante "${nome}"? Os eventos passados onde ele foi vinculado manterão seu registro.`, async () => {
      try {
        await remove(ref(db, `config/ajudantes/${slug}`));
        showToast('Ajudante excluído com sucesso!', 'success');
      } catch (err) {
        console.error('Erro ao excluir ajudante:', err);
        showToast('Erro ao excluir ajudante. Tente novamente.', 'error');
      }
    }, 'Excluir Ajudante');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="btn__spinner" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
          Equipe de Ajudantes (Bartenders/Staff)
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Cadastre os membros da equipe para atribuí-los a eventos, verificar disponibilidade e confirmar escalas.
        </p>
      </div>

      {/* Form de Cadastro */}
      <div style={{
        background: 'var(--bg-input)', borderRadius: '12px', padding: '24px',
        border: '1px solid var(--border-color)', marginBottom: '32px',
        borderTop: '4px solid var(--primary)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
          <FiPlus style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Novo Ajudante
        </h3>

        <div className="admin-team-grid">
          {/* Nome */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              <FiUser size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Nome Completo
            </label>
            <input
              type="text"
              className={`form-input ${errors.nome ? 'form-input--error' : ''}`}
              placeholder="Ex: João Silva"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {errors.nome && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.nome}</span>}
          </div>

          {/* Telefone */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              <FiPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Telefone (WhatsApp)
            </label>
            <input
              type="tel"
              className={`form-input ${errors.telefone ? 'form-input--error' : ''}`}
              placeholder="(32) 99999-0000"
              value={form.telefone}
              onChange={e => setForm(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {errors.telefone && <span className="form-error" style={{ fontSize: '0.75rem' }}>{errors.telefone}</span>}
          </div>

          {/* Especialidade */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              <FiBriefcase size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Especialidade
            </label>
            <select
              className="form-input"
              value={form.especialidade}
              onChange={e => setForm(p => ({ ...p, especialidade: e.target.value }))}
              style={{ appearance: 'auto', WebkitAppearance: 'auto' }}
            >
              <option value="Bartender">Bartender</option>
              <option value="Barback / Auxiliar">Barback / Auxiliar</option>
              <option value="Coordenador">Coordenador</option>
              <option value="Garçom">Garçom</option>
              <option value="Hostess">Hostess</option>
              <option value="Outro">Outro</option>
            </select>
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

      {/* Lista de Ajudantes */}
      {ajudantes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-input)', borderRadius: '12px',
          border: '1px dashed var(--border-color)', color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍹</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>Nenhum ajudante cadastrado ainda.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Cadastre os primeiros membros da sua equipe acima!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ajudantes.map((a) => (
            <div
              key={a.slug}
              className="admin-team-list-grid"
              style={{
                background: 'var(--bg-input)', borderRadius: '10px', padding: '16px 20px',
                border: '1px solid var(--border-color)',
                transition: 'border-color 0.2s'
              }}
            >
              {/* Nome */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Nome</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(203,161,83,0.15)', border: '1px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0
                  }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  {a.nome}
                </div>
              </div>

              {/* Telefone */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Telefone</div>
                <div style={{ color: '#25D366', fontWeight: 500, fontSize: '0.9rem' }}>
                  <FiPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {formatPhone(a.telefone)}
                </div>
              </div>

              {/* Especialidade */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Função</div>
                <div style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiBriefcase size={12} />
                  {a.especialidade}
                </div>
              </div>

              {/* Ações */}
              <button
                onClick={() => handleDelete(a.slug, a.nome)}
                style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
                title="Excluir ajudante"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
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
