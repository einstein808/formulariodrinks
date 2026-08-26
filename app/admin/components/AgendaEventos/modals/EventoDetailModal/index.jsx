import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { calculateShoppingItems } from '@/lib/shoppingCalculator';
import TabGeral from './TabGeral';
import TabChecklist from './TabChecklist';
import TabEquipe from './TabEquipe';
import TabDrinks from './TabDrinks';

export default function EventoDetailModal({
  selectedEvento,
  onClose,
  cerimonialistas,
  ajudantes,
  drinksMenu,
  drinksConfig,
  shoppingConfig,
  onToggleCheckItem,
  onToggleAllChecks
}) {
  const [modalTab, setModalTab] = useState('geral');

  if (!selectedEvento) return null;

  const checklistInfo = calculateShoppingItems(selectedEvento, shoppingConfig, drinksMenu, drinksConfig);
  const ajudantesEntries = selectedEvento?.ajudantes ? Object.entries(selectedEvento.ajudantes) : [];
  const confirmadosCount = ajudantesEntries.filter(([_, val]) => (typeof val === 'object' ? val.status : val) === 'confirmado').length;
  const drinksEscolhidosList = selectedEvento?.drinksEscolhidos || [];

  return (
    <div 
      onClick={onClose}
      className="admin-modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="admin-modal-container"
        style={{
          background: 'var(--bg-card)', width: '100%', maxWidth: '640px',
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
          animation: 'fadeInUp 0.25s ease'
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '1.2rem', letterSpacing: '0.5px' }}>
              {selectedEvento.nome} {selectedEvento.sobrenome || ''}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : ''} · {selectedEvento.cidade || ''}
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 36, justifyContent: 'center' }}
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Barra de Abas Deslizantes */}
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          padding: '10px 16px', 
          background: 'rgba(0,0,0,0.25)', 
          borderBottom: '1px solid var(--border-color)', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          flexShrink: 0
        }}>
          <button
            onClick={() => setModalTab('geral')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: modalTab === 'geral' ? 'bold' : '500',
              cursor: 'pointer',
              background: modalTab === 'geral' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: modalTab === 'geral' ? '#000' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            📋 Visão Geral
          </button>

          <button
            onClick={() => setModalTab('checklist')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: modalTab === 'checklist' ? 'bold' : '500',
              cursor: 'pointer',
              background: modalTab === 'checklist' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: modalTab === 'checklist' ? '#000' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            ✅ Checklist Insumos
            <span style={{ 
              fontSize: '0.7rem', 
              padding: '2px 6px', 
              borderRadius: '10px',
              background: modalTab === 'checklist' ? 'rgba(0,0,0,0.2)' : 'rgba(203,161,83,0.15)',
              color: modalTab === 'checklist' ? '#000' : 'var(--primary)',
              fontWeight: 'bold'
            }}>
              {checklistInfo.checked}/{checklistInfo.total}
            </span>
          </button>

          <button
            onClick={() => setModalTab('equipe')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: modalTab === 'equipe' ? 'bold' : '500',
              cursor: 'pointer',
              background: modalTab === 'equipe' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: modalTab === 'equipe' ? '#000' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            👥 Equipe & Escala
            <span style={{ 
              fontSize: '0.7rem', 
              padding: '2px 6px', 
              borderRadius: '10px',
              background: modalTab === 'equipe' ? 'rgba(0,0,0,0.2)' : 'rgba(76,175,80,0.15)',
              color: modalTab === 'equipe' ? '#000' : '#4CAF50',
              fontWeight: 'bold'
            }}>
              {confirmadosCount}/{ajudantesEntries.length}
            </span>
          </button>

          <button
            onClick={() => setModalTab('drinks')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: modalTab === 'drinks' ? 'bold' : '500',
              cursor: 'pointer',
              background: modalTab === 'drinks' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: modalTab === 'drinks' ? '#000' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            🍸 Drinks ({drinksEscolhidosList.length})
          </button>
        </div>
        
        {/* Modal Body */}
        <div style={{ 
          padding: '20px', 
          overflowY: 'auto', 
          flex: 1, 
          minHeight: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(203, 161, 83, 0.25) transparent'
        }}>
          {modalTab === 'geral' && (
            <TabGeral selectedEvento={selectedEvento} cerimonialistas={cerimonialistas} />
          )}

          {modalTab === 'checklist' && (
            <TabChecklist 
              checklistInfo={checklistInfo} 
              selectedEvento={selectedEvento} 
              onToggleCheckItem={onToggleCheckItem} 
              onToggleAllChecks={onToggleAllChecks} 
            />
          )}

          {modalTab === 'equipe' && (
            <TabEquipe selectedEvento={selectedEvento} ajudantes={ajudantes} />
          )}

          {modalTab === 'drinks' && (
            <TabDrinks selectedEvento={selectedEvento} drinksMenu={drinksMenu} drinksConfig={drinksConfig} />
          )}
        </div>
        
        {/* Modal Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-input)', flexShrink: 0 }}>
          <button 
            onClick={onClose} 
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '8px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
