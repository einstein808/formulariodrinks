import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { CATEGORY_LABELS } from '@/lib/shoppingCalculator';

export default function TabChecklist({
  checklistInfo,
  selectedEvento,
  onToggleCheckItem,
  onToggleAllChecks
}) {
  const percentChecklist = checklistInfo.total > 0 
    ? Math.round((checklistInfo.checked / checklistInfo.total) * 100) 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
      
      {/* Card de Progresso */}
      <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Progresso dos Insumos
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: percentChecklist === 100 ? '#4CAF50' : 'var(--primary)' }}>
            {checklistInfo.checked} de {checklistInfo.total} conferidos ({percentChecklist}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percentChecklist}%`, background: percentChecklist === 100 ? '#4CAF50' : 'var(--primary)', transition: 'width 0.3s ease' }} />
        </div>

        {/* Ações Rápidas de Marcar/Desmarcar */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onToggleAllChecks(checklistInfo.items.map(i => i.id), true)}
            style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✓ Marcar Todos
          </button>
          <button
            onClick={() => onToggleAllChecks(checklistInfo.items.map(i => i.id), false)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ↺ Desmarcar Todos
          </button>
        </div>
      </div>

      {/* Lista de Itens Agrupados por Categoria */}
      {checklistInfo.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
            const catItems = checklistInfo.items.filter(item => (item.categoria || 'bar') === catKey);
            if (catItems.length === 0) return null;

            return (
              <div key={catKey} style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: catInfo.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {catInfo.label} ({catItems.filter(i => (selectedEvento.shoppingListChecked || {})[i.id]).length}/{catItems.length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {catItems.map(item => {
                    const isChecked = !!(selectedEvento.shoppingListChecked || {})[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => onToggleCheckItem(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(76,175,80,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isChecked ? 'rgba(76,175,80,0.25)' : 'rgba(255,255,255,0.05)'}`,
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: 22, height: 22, borderRadius: '6px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isChecked ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                            color: isChecked ? '#FFF' : 'transparent',
                            flexShrink: 0
                          }}>
                            <FiCheck size={14} />
                          </div>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            fontWeight: isChecked ? 'normal' : '500'
                          }}>
                            {item.nome}
                          </span>
                        </div>

                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold', 
                          color: isChecked ? 'var(--text-muted)' : 'var(--primary)',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {item.quantidade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Nenhum item de insumo encontrado para este evento.
        </div>
      )}
    </div>
  );
}
