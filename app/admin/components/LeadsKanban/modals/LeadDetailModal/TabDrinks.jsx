import React from 'react';
import { FiEye, FiPhone, FiCheck, FiTrash2 } from 'react-icons/fi';

export default function TabDrinks({
  selectedLead,
  drinksMenu = {},
  generalConfigs,
  setPreviewUrl,
  sendingScript,
  handleSendShoppingListViaApi,
  isEditingShoppingList,
  setIsEditingShoppingList,
  editedShoppingList,
  setEditedShoppingList,
  handleStartEditShoppingList,
  handleSaveShoppingList,
  toggleShoppingListItem,
  updateInsumoKey,
  updateInsumoVal,
  deleteInsumo,
  addInsumo,
  updateFixoField,
  deleteFixo,
  addFixo,
  modalSearchTerm,
  setModalSearchTerm,
  modalCategoryFilter,
  setModalCategoryFilter,
  showToast
}) {
  const baseSiteUrl = generalConfigs?.siteUrl 
    ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const clientListUrl = `${baseSiteUrl}/lista-compras/${selectedLead.id}`;
  const barmanListUrl = `${baseSiteUrl}/lista-compras/${selectedLead.id}?barman=true`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
      {/* Generate shopping list widget */}
      <div style={{ background: 'rgba(0, 229, 255, 0.03)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
          🛒 Lista de Compras (Insumos)
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 12px 0' }}>
          Acesse a lista interativa de compras para visualizar, marcar os itens e escolher os drinks.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
          {/* Client link */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>🔗 Link do Cliente (Escolher Drinks)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={clientListUrl}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
                id="client-list-link-input"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('client-list-link-input');
                  if (input) {
                    input.select();
                    navigator.clipboard.writeText(input.value);
                    showToast('Link do cliente copiado!', 'success');
                  }
                }}
                className="btn"
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Copiar
              </button>
              <button
                onClick={() => setPreviewUrl(clientListUrl)}
                className="btn"
                style={{
                  padding: '8px 14px',
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FiEye size={12} /> Abrir
              </button>
            </div>
          </div>

          {/* Barman link */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>📋 Checklist do Barman (Marcar Itens Comprados)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={barmanListUrl}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
                id="barman-list-link-input"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('barman-list-link-input');
                  if (input) {
                    input.select();
                    navigator.clipboard.writeText(input.value);
                    showToast('Link do barman copiado!', 'success');
                  }
                }}
                className="btn"
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Copiar
              </button>
              <button
                onClick={() => setPreviewUrl(barmanListUrl)}
                className="btn"
                style={{
                  padding: '8px 14px',
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 'bold'
                }}
              >
                <FiEye size={12} /> Abrir
              </button>
            </div>
          </div>
        </div>
        
        {selectedLead.shoppingListFinalizada ? (
          <div style={{ padding: '10px 12px', background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '6px', color: '#4CAF50', fontSize: '0.85rem' }}>
            ✅ <strong>A lista já foi finalizada!</strong> Veja os insumos detalhados abaixo ou acesse o Checklist do Barman para gerenciar as compras.
          </div>
        ) : (
          <button 
            onClick={() => handleSendShoppingListViaApi(selectedLead)}
            disabled={sendingScript}
            className="btn"
            style={{ 
              borderColor: '#00E5FF', 
              color: '#00E5FF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              width: '100%', 
              background: 'none', 
              cursor: sendingScript ? 'not-allowed' : 'pointer',
              border: '1px solid #00E5FF',
              minHeight: 46,
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            <FiPhone /> Enviar Link de Seleção ao Cliente via WhatsApp
          </button>
        )}
      </div>

      {/* Chosen drinks */}
      <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
        <h4 style={{ margin: '0 0 14px 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
          Escolhas de Bebidas
        </h4>
        <div style={{ fontSize: '0.88rem' }}>
          <div style={{ marginBottom: '14px' }}>
            <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Drinks Selecionados pelo Cliente:</strong>
            {selectedLead.drinksEscolhidos && selectedLead.drinksEscolhidos.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedLead.drinksEscolhidos.map(d => {
                  const drinkInfo = drinksMenu[d];
                  const displayName = drinkInfo ? `${drinkInfo.emoji || '🍹'} ${drinkInfo.name}`.trim() : d;
                  return (
                    <span key={d} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', color: '#e8eade' }}>
                      {displayName}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum drink selecionado ainda.</span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Chopp:</strong> {selectedLead.upsellChopp ? 'Sim 🍺' : 'Não'}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Frozen:</strong> {selectedLead.upsellFrozen ? 'Sim ❄️' : 'Não'}</div>
          </div>
        </div>
      </div>

      {/* Shopping List Results */}
      {selectedLead.shoppingListFinalizada && selectedLead.shoppingListResult && (
        <div style={{ background: 'rgba(76, 175, 80, 0.04)', borderRadius: '12px', padding: '20px', border: 'none', borderLeft: '4px solid #4CAF50' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(76, 175, 80, 0.06)', paddingBottom: '8px', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, color: '#4CAF50', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛒 Detalhes dos Insumos (Lista Calculada)
            </h4>
            {!isEditingShoppingList ? (
              <button
                onClick={handleStartEditShoppingList}
                className="btn btn--outline"
                style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', borderColor: '#4CAF50', color: '#4CAF50' }}
              >
                Editar Itens
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setIsEditingShoppingList(false); setEditedShoppingList(null); }}
                  className="btn btn--outline"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveShoppingList}
                  className="btn btn--primary"
                  style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', background: '#4CAF50', color: '#FFF', border: 'none' }}
                >
                  Salvar
                </button>
              </div>
            )}
          </div>

          {!isEditingShoppingList ? (
            /* 🔍 INTERACTIVE CHECKLIST VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              {(() => {
                const flatItems = [
                  ...Object.entries(selectedLead.shoppingListResult.insumos || {}).map(([nome, qtd]) => ({
                    id: `insumo_${nome}`,
                    nome,
                    quantidade: qtd,
                    categoria: 'drinks',
                  })),
                  ...(selectedLead.shoppingListResult.fixos || []).map((f, idx) => ({
                    id: `fixo_${f.id || f.nome?.toLowerCase().replace(/\s+/g, '_') || idx}`,
                    nome: f.nome,
                    quantidade: `${f.quantidade} ${f.unidade}`,
                    categoria: f.categoria || 'bar',
                  }))
                ];

                const totalCount = flatItems.length;
                const checkedCount = flatItems.filter(item => selectedLead.shoppingListChecked && selectedLead.shoppingListChecked[item.id]).length;
                const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                const filteredItems = flatItems.filter(item => {
                  const matchesCategory = modalCategoryFilter === 'all' || item.categoria === modalCategoryFilter;
                  const matchesSearch = (item.nome || '').toLowerCase().includes(modalSearchTerm.toLowerCase());
                  return matchesCategory && matchesSearch;
                });

                return (
                  <>
                    {/* Progress feedback */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Status da Conferência:</span>
                        <strong style={{ color: progressPct === 100 ? '#4CAF50' : 'var(--primary)' }}>
                          {checkedCount}/{totalCount} itens ({progressPct}%)
                        </strong>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? '#4CAF50' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>

                    {/* SEARCH & FILTER CHIPS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Pesquisar item..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                          style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem', width: '100%', background: 'var(--bg-input)' }}
                        />
                        <span style={{ position: 'absolute', left: '10px', top: '52%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                        {modalSearchTerm && (
                          <button onClick={() => setModalSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Limpar
                          </button>
                        )}
                      </div>

                      {/* Categories pills */}
                      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'drinks', label: 'Bebidas/Insumos' },
                          { id: 'insumo', label: 'Frescos' },
                          { id: 'bar', label: 'Equipamentos' },
                          { id: 'descartavel', label: 'Descartáveis' },
                          { id: 'decoracao', label: 'Decoração' }
                        ].map(tab => {
                          const isActive = modalCategoryFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setModalCategoryFilter(tab.id)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                borderRadius: '12px',
                                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                                background: isActive ? 'var(--primary)' : 'var(--bg-input)',
                                color: isActive ? '#000' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.1s ease'
                              }}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TABLE LIST */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--border-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '350px', overflowY: 'auto' }}>
                      <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '8px 12px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
                        <div style={{ width: '32px' }}>Status</div>
                        <div style={{ flex: 1, paddingLeft: '6px' }}>Item</div>
                        <div style={{ width: '80px', textAlign: 'right' }}>Qtd</div>
                      </div>

                      {filteredItems.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', fontSize: '0.8rem' }}>
                          Nenhum item localizado.
                        </div>
                      ) : (
                        filteredItems.map(item => {
                          const isChecked = !!(selectedLead.shoppingListChecked && selectedLead.shoppingListChecked[item.id]);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleShoppingListItem(selectedLead, item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 12px',
                                background: isChecked ? 'rgba(76,175,80,0.04)' : 'var(--bg-card)',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                fontSize: '0.8rem'
                              }}
                            >
                              <div style={{ width: '32px', display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '3px',
                                  border: `2px solid ${isChecked ? '#4CAF50' : 'var(--border-color)'}`,
                                  background: isChecked ? '#4CAF50' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.1s ease'
                                }}>
                                  {isChecked && <FiCheck size={10} color="#fff" strokeWidth={3} />}
                                </div>
                              </div>

                              <div style={{ flex: 1, paddingLeft: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{
                                  fontWeight: '600',
                                  color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: isChecked ? 'line-through' : 'none'
                                }}>
                                  {item.nome}
                                </span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                    {item.categoria === 'drinks' ? 'Insumo Bebida' : (item.categoria === 'bar' ? 'Equipamento' : (item.categoria === 'insumo' ? 'Fresco' : (item.categoria === 'descartavel' ? 'Descartável' : 'Decoração')))}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: isChecked ? 'rgba(76,175,80,0.08)' : 'rgba(203,161,83,0.04)', color: isChecked ? '#4CAF50' : 'var(--primary)', fontWeight: 'bold' }}>
                                    {isChecked ? 'CONFERIDO' : 'PENDENTE'}
                                  </span>
                                </div>
                              </div>

                              <div style={{ width: '80px', textAlign: 'right' }}>
                                <strong style={{ color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                  {item.quantidade}
                                </strong>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* ✍️ EDITOR VIEW */
            editedShoppingList && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Insumos e Bebidas:</strong>
                    <button
                      onClick={addInsumo}
                      className="btn btn--outline"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto', minHeight: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      + Add Insumo
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.keys(editedShoppingList.insumos || {}).length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum insumo.</div>
                    )}
                    {Object.entries(editedShoppingList.insumos || {}).map(([insumo, qtd]) => (
                      <div key={insumo} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={insumo}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 1 }}
                          onChange={(e) => updateInsumoKey(insumo, e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={qtd}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: '120px' }}
                          onChange={(e) => updateInsumoVal(insumo, e.target.value)}
                        />
                        <button
                          onClick={() => deleteInsumo(insumo)}
                          style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '6px' }}
                          title="Remover"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Itens Fixos / Descartáveis:</strong>
                    <button
                      onClick={addFixo}
                      className="btn btn--outline"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto', minHeight: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      + Add Item Fixo
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(editedShoppingList.fixos || []).length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum item fixo.</div>
                    )}
                    {(editedShoppingList.fixos || []).map((item, idx) => (
                      <div key={item.id || idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={item.nome || ''}
                          placeholder="Nome"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 2, minWidth: '120px' }}
                          onChange={(e) => updateFixoField(idx, 'nome', e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input"
                          value={item.quantidade ?? ''}
                          placeholder="Qtd"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: '80px' }}
                          onChange={(e) => updateFixoField(idx, 'quantidade', Number(e.target.value))}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={item.unidade || ''}
                          placeholder="Un"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: '70px' }}
                          onChange={(e) => updateFixoField(idx, 'unidade', e.target.value)}
                        />
                        <select
                          className="form-select"
                          value={item.categoria || 'bar'}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: '110px' }}
                          onChange={(e) => updateFixoField(idx, 'categoria', e.target.value)}
                        >
                          <option value="bar">🍸 Bar</option>
                          <option value="insumo">🍋 Fresco</option>
                          <option value="decoracao">✨ Decoração</option>
                          <option value="descartavel">🧾 Descartável</option>
                        </select>
                        <button
                          onClick={() => deleteFixo(idx)}
                          style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '6px' }}
                          title="Remover"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
