import React, { useState } from 'react';
import { FiX, FiUsers, FiDollarSign } from 'react-icons/fi';
import { formatPhone } from '@/lib/utils';
import { COLUMNS } from '@/lib/constants';
import { getLeadStatusHelper } from '@/app/admin/components/LeadsKanban/filters';
import TabInfo from './TabInfo';
import TabFinanceiro from './TabFinanceiro';
import TabEquipe from './TabEquipe';
import TabDrinks from './TabDrinks';
import TabScripts from './TabScripts';

export default function LeadDetailModal({
  selectedLead,
  setSelectedLead,
  onClose,
  onStatusChange,
  onToggleAbGroup,
  onSaveEditLead,
  pacotes,
  cerimonialistas,
  drinksMenu,
  ajudantes,
  estoque,
  financeiroPresets,
  custosCategorias,
  evolutionApi,
  scripts,
  generalConfigs,
  setPreviewUrl,
  sendingScript,
  showToast,
  showConfirm,
  // Actions
  handleUpdateFaturamento,
  handleUpdateDesconto,
  handleImportFromPackage,
  handleUpdateAplicarDescontoMaoDeObra,
  handleRegisterRecebimento,
  handleDeleteRecebimento,
  handleAddCost,
  handleUpdateCostCategory,
  handleRemoveCost,
  handleApplyPackageCostsTemplate,
  checkHelperOverlap,
  handleAddHelperToLead,
  handleRemoveHelperFromLead,
  handleUpdateHelperStatus,
  handleSendHelperAvailabilityCheck,
  handleSendHelperFinalConfirmation,
  handleSendShoppingListViaApi,
  handleResendQuote,
  handleSendEvolution,
  aiFollowupLoading,
  aiFollowupResult,
  aiFollowupCopied,
  handleGenerateFollowup,
  handleCopyFollowup,
  // Shopping list edit state
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
  // Search state
  modalSearchTerm,
  setModalSearchTerm,
  modalCategoryFilter,
  setModalCategoryFilter,
  faturamentoInput,
  setFaturamentoInput,
  descontoInput,
  setDescontoInput,
  newCost,
  setNewCost
}) {
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'financeiro' | 'equipe' | 'drinks' | 'scripts'
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadData, setEditLeadData] = useState({
    nome: selectedLead?.nome || '',
    sobrenome: selectedLead?.sobrenome || '',
    telefone: selectedLead?.telefone || '',
    cidade: selectedLead?.cidade || '',
    dataEvento: selectedLead?.dataEvento || '',
    horarioEvento: selectedLead?.horarioEvento || '',
    convidados: selectedLead?.convidados || '',
    tipoEvento: selectedLead?.tipoEvento || '',
    pacote: selectedLead?.pacote || '',
    rua: selectedLead?.rua || '',
    bairro: selectedLead?.bairro || '',
    lat: selectedLead?.lat || null,
    lng: selectedLead?.lng || null,
    cep: selectedLead?.cep || ''
  });

  if (!selectedLead) return null;

  const { isStale, followUpCount } = getLeadStatusHelper(selectedLead);

  const startEditing = () => {
    setEditLeadData({
      nome: selectedLead.nome || '',
      sobrenome: selectedLead.sobrenome || '',
      telefone: selectedLead.telefone || '',
      cidade: selectedLead.cidade || '',
      dataEvento: selectedLead.dataEvento || '',
      horarioEvento: selectedLead.horarioEvento || '',
      convidados: selectedLead.convidados || '',
      tipoEvento: selectedLead.tipoEvento || '',
      pacote: selectedLead.pacote || '',
      rua: selectedLead.rua || '',
      bairro: selectedLead.bairro || '',
      lat: selectedLead.lat || null,
      lng: selectedLead.lng || null,
      cep: selectedLead.cep || ''
    });
    setIsEditingLead(true);
  };

  const handleSave = async () => {
    await onSaveEditLead(editLeadData);
    setIsEditingLead(false);
  };

  return (
    <div 
      onClick={onClose}
      className="admin-modal-overlay"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="admin-modal-container"
        style={{
          background: 'var(--bg-main)',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.8)'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-input)',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '1.25rem' }}>
                {selectedLead.nome} {selectedLead.sobrenome}
              </h2>
              <button
                type="button"
                onClick={() => onToggleAbGroup(selectedLead.id, selectedLead.abGroup)}
                title="Clique para alternar entre Grupo A (Por Convidado) e Grupo B (Preço Fixo por Faixa)"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: selectedLead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                  color: selectedLead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
                  border: `1px solid ${selectedLead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {selectedLead.abGroup === 'B' ? '🧪 Grupo B (Preço Fixo) 🔄' : '🅰️ Grupo A (Por Convidado) 🔄'}
              </button>
              {followUpCount >= 3 ? (
                <span style={{ fontSize: '0.7rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>❄️ Esfriou</span>
              ) : (
                isStale && <span style={{ fontSize: '0.7rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>🔥 Esfriando</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Telefone: {formatPhone(selectedLead.telefone)}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Status</label>
              <select 
                value={selectedLead.status || 'novo'}
                onChange={(e) => onStatusChange(selectedLead.id, e.target.value)}
                className="form-select"
                style={{ 
                  marginTop: 0, 
                  padding: '4px 10px', 
                  fontSize: '0.8rem', 
                  borderRadius: '6px', 
                  background: 'var(--bg-input)', 
                  borderColor: 'rgba(203, 161, 83, 0.3)',
                  color: 'var(--primary)',
                  fontWeight: 'bold',
                  height: '32px',
                  width: '140px'
                }}
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.02)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          flexShrink: 0,
          minHeight: '46px'
        }}>
          {[
            { id: 'info', label: '📋 Dados Gerais' },
            { id: 'financeiro', label: '💰 Financeiro', icon: FiDollarSign },
            { id: 'equipe', label: '👥 Equipe & Escala', icon: FiUsers },
            { id: 'drinks', label: '🍹 Drinks & Insumos' },
            { id: 'scripts', label: '💬 Scripts WhatsApp' }
          ].map(tab => {
            const isActive = modalTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setModalTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: isActive ? 'rgba(203,161,83,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {modalTab === 'info' && (
            <TabInfo
              selectedLead={selectedLead}
              setSelectedLead={setSelectedLead}
              isEditingLead={isEditingLead}
              editLeadData={editLeadData}
              setEditLeadData={setEditLeadData}
              pacotes={pacotes}
              cerimonialistas={cerimonialistas}
              aiFollowupLoading={aiFollowupLoading}
              aiFollowupResult={aiFollowupResult}
              aiFollowupCopied={aiFollowupCopied}
              handleGenerateFollowup={handleGenerateFollowup}
              handleCopyFollowup={handleCopyFollowup}
              sendingScript={sendingScript}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          )}

          {modalTab === 'financeiro' && (
            <TabFinanceiro
              selectedLead={selectedLead}
              faturamentoInput={faturamentoInput}
              setFaturamentoInput={setFaturamentoInput}
              descontoInput={descontoInput}
              setDescontoInput={setDescontoInput}
              handleUpdateFaturamento={handleUpdateFaturamento}
              handleUpdateDesconto={handleUpdateDesconto}
              handleImportFromPackage={handleImportFromPackage}
              handleUpdateAplicarDescontoMaoDeObra={handleUpdateAplicarDescontoMaoDeObra}
              handleRegisterRecebimento={handleRegisterRecebimento}
              handleDeleteRecebimento={handleDeleteRecebimento}
              handleAddCost={handleAddCost}
              handleUpdateCostCategory={handleUpdateCostCategory}
              handleRemoveCost={handleRemoveCost}
              handleApplyPackageCostsTemplate={handleApplyPackageCostsTemplate}
              financeiroPresets={financeiroPresets}
              custosCategorias={custosCategorias}
              estoque={estoque}
              newCost={newCost}
              setNewCost={setNewCost}
            />
          )}

          {modalTab === 'equipe' && (
            <TabEquipe
              selectedLead={selectedLead}
              ajudantes={ajudantes}
              checkHelperOverlap={checkHelperOverlap}
              handleAddHelperToLead={handleAddHelperToLead}
              handleRemoveHelperFromLead={handleRemoveHelperFromLead}
              handleUpdateHelperStatus={handleUpdateHelperStatus}
              handleSendHelperAvailabilityCheck={handleSendHelperAvailabilityCheck}
              handleSendHelperFinalConfirmation={handleSendHelperFinalConfirmation}
              handleSendEvolution={handleSendEvolution}
              sendingScript={sendingScript}
              showToast={showToast}
            />
          )}

          {modalTab === 'drinks' && (
            <TabDrinks
              selectedLead={selectedLead}
              drinksMenu={drinksMenu}
              generalConfigs={generalConfigs}
              setPreviewUrl={setPreviewUrl}
              sendingScript={sendingScript}
              handleSendShoppingListViaApi={handleSendShoppingListViaApi}
              isEditingShoppingList={isEditingShoppingList}
              setIsEditingShoppingList={setIsEditingShoppingList}
              editedShoppingList={editedShoppingList}
              setEditedShoppingList={setEditedShoppingList}
              handleStartEditShoppingList={handleStartEditShoppingList}
              handleSaveShoppingList={handleSaveShoppingList}
              toggleShoppingListItem={toggleShoppingListItem}
              updateInsumoKey={updateInsumoKey}
              updateInsumoVal={updateInsumoVal}
              deleteInsumo={deleteInsumo}
              addInsumo={addInsumo}
              updateFixoField={updateFixoField}
              deleteFixo={deleteFixo}
              addFixo={addFixo}
              modalSearchTerm={modalSearchTerm}
              setModalSearchTerm={setModalSearchTerm}
              modalCategoryFilter={modalCategoryFilter}
              setModalCategoryFilter={setModalCategoryFilter}
              showToast={showToast}
            />
          )}

          {modalTab === 'scripts' && (
            <TabScripts
              selectedLead={selectedLead}
              sendingScript={sendingScript}
              handleResendQuote={handleResendQuote}
              handleSendEvolution={handleSendEvolution}
            />
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(203, 161, 83, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-app)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
            {selectedLead.telefone && (
              <a
                href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#25D366',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: 40
                }}
              >
                💬 WhatsApp
              </a>
            )}
            <a
              href={`/contrato/${selectedLead.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(203, 161, 83, 0.12)',
                border: '1px solid rgba(203, 161, 83, 0.3)',
                color: 'var(--primary)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: 40
              }}
            >
              📄 Contrato
            </a>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditingLead ? (
              <button
                onClick={startEditing}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  minHeight: 40,
                  fontWeight: 'bold'
                }}
              >
                ✏️ Editar
              </button>
            ) : (
              <button
                onClick={handleSave}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#000',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  minHeight: 40,
                  fontWeight: 'bold'
                }}
              >
                💾 Salvar
              </button>
            )}
            <button 
              onClick={onClose} 
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-secondary)',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                minHeight: 40
              }}
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
