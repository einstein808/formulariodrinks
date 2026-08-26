import React, { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';

export default function AddLeadModal({
  isOpen,
  onClose,
  onSave,
  pacotes = [],
  cerimonialistas = {}
}) {
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    dataEvento: '',
    horarioEvento: '',
    cidade: '',
    convidados: '',
    tipoEvento: '',
    pacote: '',
    cerimonialista: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-main)',
          width: '100%',
          maxWidth: '500px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif' }}>Novo Lead Manual</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiX size={24} />
          </button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Nome *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={formData.nome} 
                  onChange={e => setFormData({ ...formData, nome: e.target.value })} 
                />
              </div>
              <div>
                <label className="form-label">Sobrenome</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.sobrenome} 
                  onChange={e => setFormData({ ...formData, sobrenome: e.target.value })} 
                />
              </div>
            </div>
            
            <div>
              <label className="form-label">Telefone/WhatsApp *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                value={formData.telefone} 
                onChange={e => setFormData({ ...formData, telefone: e.target.value })} 
                placeholder="Ex: 32999999999" 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Data do Evento</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.dataEvento} 
                  onChange={e => setFormData({ ...formData, dataEvento: e.target.value })} 
                />
              </div>
              <div>
                <label className="form-label">Horário</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={formData.horarioEvento} 
                  onChange={e => setFormData({ ...formData, horarioEvento: e.target.value })} 
                />
              </div>
              <div>
                <label className="form-label">Cidade</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.cidade} 
                  onChange={e => setFormData({ ...formData, cidade: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Tipo de Evento</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.tipoEvento} 
                  onChange={e => setFormData({ ...formData, tipoEvento: e.target.value })} 
                  placeholder="Ex: Casamento" 
                />
              </div>
              <div>
                <label className="form-label">Convidados</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.convidados} 
                  onChange={e => setFormData({ ...formData, convidados: e.target.value })} 
                />
              </div>
            </div>

            <div>
              <label className="form-label">Pacote de Interesse</label>
              <select 
                className="form-select" 
                value={formData.pacote} 
                onChange={e => setFormData({ ...formData, pacote: e.target.value })}
              >
                <option value="">Selecione um pacote</option>
                {pacotes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Cerimonialista Parceiro</label>
              <select 
                className="form-select" 
                value={formData.cerimonialista} 
                onChange={e => setFormData({ ...formData, cerimonialista: e.target.value })}
              >
                <option value="">— Nenhum / Sem parceiro —</option>
                {Object.entries(cerimonialistas).map(([slug, c]) => (
                  <option key={slug} value={slug}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={onClose} className="btn btn--outline" style={{ color: 'var(--text-primary)' }}>Cancelar</button>
              <button type="submit" className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiPlus size={18} /> Salvar Lead
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
