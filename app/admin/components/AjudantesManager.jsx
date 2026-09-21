import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { 
  FiPlus, FiTrash2, FiUser, FiPhone, FiBriefcase, FiX, 
  FiMapPin, FiCalendar, FiDollarSign, FiCheck, FiShare2, 
  FiCopy, FiExternalLink, FiSearch, FiFilter 
} from 'react-icons/fi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

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
  let v = (value || '').replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export default function AjudantesManager() {
  const [activeSubTab, setActiveSubTab] = useState('equipe'); // 'equipe' | 'candidatos'
  const [ajudantes, setAjudantes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', telefone: '', especialidade: 'Bartender' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Filtros de candidatos
  const [candidatosSearch, setCandidatosSearch] = useState('');
  const [candidatosFiltroFuncao, setCandidatosFiltroFuncao] = useState('todos');
  const [candidatosFiltroExp, setCandidatosFiltroExp] = useState('todos');

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

  // Listeners Firebase: Ajudantes e Candidatos Freelancer
  useEffect(() => {
    const unsubAjudantes = onValue(ref(db, 'config/ajudantes'), (snap) => {
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

    const unsubCandidatos = onValue(ref(db, 'candidatos_freelancers'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        arr.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
        setCandidatos(arr);
      } else {
        setCandidatos([]);
      }
    });

    return () => {
      unsubAjudantes();
      unsubCandidatos();
    };
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

  // Aprova candidato promovendo-o a membro da Equipe Oficial
  const handleAprovarCandidato = (candidato) => {
    showConfirm(`Deseja aprovar "${candidato.nome}" e adicioná-lo à Equipe Oficial de Ajudantes? Ele ficará imediatamente disponível para escalas de eventos.`, async () => {
      try {
        let slug = slugify(candidato.nome);
        if (ajudantes.some(a => a.slug === slug)) {
          slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        // 1. Cadastra na equipe oficial
        await set(ref(db, `config/ajudantes/${slug}`), {
          nome: candidato.nome.trim(),
          telefone: (candidato.telefone || '').replace(/\D/g, ''),
          especialidade: candidato.funcao || 'Bartender',
          slug,
          bairro: candidato.bairro || '',
          valorCache: candidato.valorCache || '',
          instagram: candidato.instagram || '',
          origem: 'trabalhe-conosco',
          ativo: true,
          criadoEm: new Date().toISOString()
        });

        // 2. Atualiza status no banco de candidatos
        await update(ref(db, `candidatos_freelancers/${candidato.id}`), {
          status: 'aprovado',
          aprovadoEm: new Date().toISOString()
        });

        showToast(`"${candidato.nome}" aprovado e adicionado à equipe com sucesso!`, 'success');
      } catch (err) {
        console.error('Erro ao aprovar candidato:', err);
        showToast('Erro ao aprovar candidato. Tente novamente.', 'error');
      }
    }, 'Aprovar Candidato');
  };

  const handleExcluirCandidato = (candidato) => {
    showConfirm(`Excluir cadastro de "${candidato.nome}" do banco de talentos?`, async () => {
      try {
        await remove(ref(db, `candidatos_freelancers/${candidato.id}`));
        showToast('Candidato removido com sucesso.', 'success');
      } catch (err) {
        console.error('Erro ao excluir candidato:', err);
        showToast('Erro ao excluir candidato.', 'error');
      }
    }, 'Excluir Cadastro');
  };

  const copyLinkTrabalheConosco = () => {
    const url = `${window.location.origin}/trabalhe-conosco`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link do Trabalhe Conosco copiado para a área de transferência!', 'success');
    }).catch(() => {
      showToast(url, 'info');
    });
  };

  // Filtragem de Candidatos
  const filteredCandidatos = candidatos.filter(c => {
    const q = candidatosSearch.toLowerCase().trim();
    const matchQuery = !q || 
      (c.nome && c.nome.toLowerCase().includes(q)) ||
      (c.bairro && c.bairro.toLowerCase().includes(q)) ||
      (c.telefone && c.telefone.includes(q)) ||
      (c.locaisTrabalhados && c.locaisTrabalhados.toLowerCase().includes(q));

    const matchFuncao = candidatosFiltroFuncao === 'todos' || c.funcao === candidatosFiltroFuncao;
    const matchExp = candidatosFiltroExp === 'todos' || 
      (candidatosFiltroExp === 'com_exp' && c.temExperiencia) ||
      (candidatosFiltroExp === 'sem_exp' && !c.temExperiencia);

    return matchQuery && matchFuncao && matchExp;
  });

  const countCandidatosNovos = candidatos.filter(c => c.status !== 'aprovado').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="btn__spinner" />
      </div>
    );
  }

  return (
    <div>
      {/* Header com Abas e Botão de Compartilhar Link */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
            Equipe de Ajudantes & Freelancers
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            Gerencie sua equipe ativa para escalas de eventos e avalie novos candidatos do banco de talentos.
          </p>
        </div>

        {/* Botão de Copiar Link do Formulário Público */}
        <button
          type="button"
          onClick={copyLinkTrabalheConosco}
          className="btn btn--outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.85rem',
            borderRadius: '10px',
            background: 'rgba(203, 161, 83, 0.1)',
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
          title="Copiar link público para enviar a novos candidatos no WhatsApp"
        >
          <FiShare2 size={16} />
          <span>Copiar Link Trabalhe Conosco</span>
        </button>
      </div>

      {/* Seletor de Sub-Abas: Equipe Ativa vs Banco de Talentos */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '10px'
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('equipe')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: `1px solid ${activeSubTab === 'equipe' ? 'var(--primary)' : 'var(--border-color)'}`,
            background: activeSubTab === 'equipe' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
            color: activeSubTab === 'equipe' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>👥 Equipe Ativa ({ajudantes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('candidatos')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: `1px solid ${activeSubTab === 'candidatos' ? 'var(--primary)' : 'var(--border-color)'}`,
            background: activeSubTab === 'candidatos' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
            color: activeSubTab === 'candidatos' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📥 Banco de Talentos ({candidatos.length})</span>
          {countCandidatosNovos > 0 && (
            <span style={{
              background: activeSubTab === 'candidatos' ? '#000' : '#FF9800',
              color: activeSubTab === 'candidatos' ? '#FFF' : '#000',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {countCandidatosNovos} novos
            </span>
          )}
        </button>
      </div>

      {/* ── ABA 1: EQUIPE ATIVA ───────────────────────────────── */}
      {activeSubTab === 'equipe' && (
        <>
          {/* Form de Cadastro Direto */}
          <div style={{
            background: 'var(--bg-input)', borderRadius: '12px', padding: '24px',
            border: '1px solid var(--border-color)', marginBottom: '32px',
            borderTop: '4px solid var(--primary)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
              <FiPlus style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Adicionar Membro à Equipe
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

          {/* Lista de Ajudantes Ativos */}
          {ajudantes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--bg-input)', borderRadius: '12px',
              border: '1px dashed var(--border-color)', color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍹</div>
              <p style={{ margin: 0, fontSize: '1rem' }}>Nenhum ajudante na equipe oficial ainda.</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Cadastre acima ou aprove candidatos do Banco de Talentos!</p>
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
                      <div>
                        <div>{a.nome}</div>
                        {a.bairro && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            📍 {a.bairro}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Telefone */}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Telefone</div>
                    <a
                      href={`https://wa.me/55${(a.telefone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#25D366', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <FaWhatsapp size={13} />
                      {formatPhone(a.telefone)}
                    </a>
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
        </>
      )}

      {/* ── ABA 2: BANCO DE TALENTOS / CANDIDATOS ─────────────── */}
      {activeSubTab === 'candidatos' && (
        <div>
          {/* Barra de Filtros e Busca */}
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Campo de Busca */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por nome, bairro ou local..."
                className="form-input"
                value={candidatosSearch}
                onChange={e => setCandidatosSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filtro Função */}
              <select
                className="form-input"
                value={candidatosFiltroFuncao}
                onChange={e => setCandidatosFiltroFuncao(e.target.value)}
                style={{ height: '40px', fontSize: '0.85rem', appearance: 'auto', WebkitAppearance: 'auto' }}
              >
                <option value="todos">Todas as Funções</option>
                <option value="Bartender">Bartender</option>
                <option value="Barback">Barback</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Garcom">Garçom</option>
                <option value="Copeiro">Copeiro</option>
              </select>

              {/* Filtro Experiência */}
              <select
                className="form-input"
                value={candidatosFiltroExp}
                onChange={e => setCandidatosFiltroExp(e.target.value)}
                style={{ height: '40px', fontSize: '0.85rem', appearance: 'auto', WebkitAppearance: 'auto' }}
              >
                <option value="todos">Toda Experiência</option>
                <option value="com_exp">Com Experiência</option>
                <option value="sem_exp">Iniciantes</option>
              </select>
            </div>
          </div>

          {/* Cards de Candidatos */}
          {filteredCandidatos.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--bg-input)', borderRadius: '12px',
              border: '1px dashed var(--border-color)', color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nenhum candidato encontrado.</p>
              <p style={{ margin: '8px 0 16px 0', fontSize: '0.85rem' }}>
                Envie o link da página <strong>/trabalhe-conosco</strong> para bartenders e ajudantes se cadastrarem!
              </p>
              <button
                type="button"
                onClick={copyLinkTrabalheConosco}
                className="btn btn--primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <FiCopy size={16} /> Copiar Link do Formulário
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredCandidatos.map((cand) => {
                const isAprovado = cand.status === 'aprovado';
                const zapUrl = `https://wa.me/55${(cand.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${cand.nome}! Aqui é do Laboratório de Drinks. Vimos seu cadastro como freelancer e gostaríamos de conversar sobre disponibilidade para um evento!`)}`;
                const instaUrl = cand.instagram ? (cand.instagram.startsWith('http') ? cand.instagram : `https://instagram.com/${cand.instagram.replace('@', '')}`) : null;

                return (
                  <div
                    key={cand.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: `1px solid ${isAprovado ? 'rgba(76, 175, 80, 0.4)' : 'var(--border-color)'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                      borderTop: `4px solid ${isAprovado ? '#4CAF50' : 'var(--primary)'}`
                    }}
                  >
                    {/* Topo do Card: Nome, Função e Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {cand.nome}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>
                          🍸 {cand.funcao}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isAprovado ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                        color: isAprovado ? '#4CAF50' : '#FF9800',
                        border: `1px solid ${isAprovado ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
                      }}>
                        {isAprovado ? '✓ Na Equipe' : 'Novo'}
                      </span>
                    </div>

                    {/* Informações detalhadas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      {/* Bairro / Região */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiMapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span><strong>Bairro:</strong> {cand.bairro} ({cand.cidade || 'JF'})</span>
                      </div>

                      {/* Cachê Pretendido */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiDollarSign size={14} style={{ color: '#4CAF50', flexShrink: 0 }} />
                        <span><strong>Cachê pretendido:</strong> <span style={{ color: '#4CAF50', fontWeight: 700 }}>R$ {cand.valorCache}</span></span>
                      </div>

                      {/* Experiência */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiBriefcase size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span><strong>Experiência:</strong> {cand.temExperiencia ? 'Sim (Já atuou na área)' : 'Iniciante'}</span>
                      </div>

                      {/* Locais Trabalhados */}
                      {cand.locaisTrabalhados && (
                        <div style={{ marginTop: '2px', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <strong>Locais:</strong> {cand.locaisTrabalhados}
                        </div>
                      )}

                      {/* Disponibilidade */}
                      {Array.isArray(cand.diasSemana) && cand.diasSemana.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: 4 }}>
                          <FiCalendar size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong>Livre:</strong> {cand.diasSemana.join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Transporte */}
                      {cand.transporte && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          🚗 Transporte: {cand.transporte}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                      {/* WhatsApp */}
                      <a
                        href={zapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          background: '#25D366',
                          color: '#FFF',
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}
                      >
                        <FaWhatsapp size={16} />
                        <span>Chamar no Zap</span>
                      </a>

                      {/* Instagram se houver */}
                      {instaUrl && (
                        <a
                          href={instaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{
                            background: 'rgba(225, 48, 108, 0.15)',
                            color: '#E1306C',
                            border: '1px solid rgba(225, 48, 108, 0.3)',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 600
                          }}
                          title={`Ver perfil no Instagram (${cand.instagram})`}
                        >
                          <FaInstagram size={14} />
                          <span>Perfil</span>
                        </a>
                      )}

                      {/* Aprovar para Equipe (se ainda não aprovado) */}
                      {!isAprovado && (
                        <button
                          type="button"
                          onClick={() => handleAprovarCandidato(cand)}
                          style={{
                            background: 'rgba(203, 161, 83, 0.15)',
                            color: 'var(--primary)',
                            border: '1px solid var(--primary)',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Aprovar e adicionar à lista oficial de Ajudantes escaláveis"
                        >
                          <FiCheck size={14} />
                          <span>Aprovar</span>
                        </button>
                      )}

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => handleExcluirCandidato(cand)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#F44336',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remover candidato"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
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
