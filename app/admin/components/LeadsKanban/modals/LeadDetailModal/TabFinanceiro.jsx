import React, { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { formatCurrency, getCustoValor, detectCategoryByDescription } from '@/lib/utils';
import { CUSTOS_CATEGORIAS_DEFAULT } from '@/lib/constants';

export default function TabFinanceiro({
  selectedLead,
  faturamentoInput,
  setFaturamentoInput,
  descontoInput,
  setDescontoInput,
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
  financeiroPresets,
  custosCategorias,
  estoque,
  newCost,
  setNewCost
}) {
  const [newPaymentVal, setNewPaymentVal] = useState('');
  const [newPaymentForma, setNewPaymentForma] = useState('Pix');

  const faturamento = selectedLead ? (parseFloat(selectedLead.financeiro?.faturamento) || 0) : 0;
  const desconto = selectedLead ? (parseFloat(selectedLead.financeiro?.desconto) || 0) : 0;
  const valorPago = selectedLead ? (parseFloat(selectedLead.financeiro?.valorPago) || 0) : 0;
  const valorRestante = Math.max(0, (faturamento - desconto) - valorPago);
  const custosObj = selectedLead?.financeiro?.custos || {};
  const custosLista = Object.values(custosObj);
  const totalCustos = custosLista.reduce((acc, c) => acc + getCustoValor(c), 0);
  const lucro = (faturamento - desconto) - totalCustos;

  const allCats = custosCategorias && custosCategorias.length > 0 ? custosCategorias : CUSTOS_CATEGORIAS_DEFAULT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>

      {/* ── KPI BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
        {[
          { label: 'Faturamento', value: faturamento, color: 'var(--text-primary)', icon: '💰' },
          { label: 'Já Pago', value: valorPago, color: '#4CAF50', icon: '✅' },
          { label: valorRestante > 0 ? 'Falta Pagar' : 'Quitado!', value: valorRestante, color: valorRestante > 0 ? '#FFD54F' : '#4CAF50', icon: valorRestante > 0 ? '⏳' : '🎉' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>{kpi.icon} {kpi.label}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: kpi.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {kpi.label === 'Quitado!' ? '🎉' : formatCurrency(kpi.value)}
            </div>
          </div>
        ))}
      </div>

      {/* ── CUSTOS vs LUCRO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(244,67,54,0.05)', border: '1px solid rgba(244,67,54,0.15)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#F44336', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>💸 Custos</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#F44336' }}>{formatCurrency(totalCustos)}</div>
        </div>
        <div style={{ background: 'rgba(203,161,83,0.05)', border: '1px solid rgba(203,161,83,0.15)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>📈 Lucro</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(lucro)}</div>
        </div>
      </div>

      {/* ── RECEBER PAGAMENTO ── */}
      <div style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '0.82rem', color: '#4CAF50', fontWeight: 'bold', marginBottom: '10px' }}>💰 Registrar Pagamento Recebido</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input
              type="number"
              placeholder="Valor (R$)"
              value={newPaymentVal}
              onChange={(e) => setNewPaymentVal(e.target.value)}
              style={{ background: '#0c1610', border: '1px solid rgba(76,175,80,0.2)', borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px', fontSize: '0.9rem', outline: 'none', height: '42px' }}
            />
            <select
              value={newPaymentForma}
              onChange={(e) => setNewPaymentForma(e.target.value)}
              style={{ background: '#0c1610', border: '1px solid rgba(76,175,80,0.2)', borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px', fontSize: '0.88rem', outline: 'none', cursor: 'pointer', height: '42px' }}
            >
              {['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={async () => { await handleRegisterRecebimento(newPaymentVal, newPaymentForma); setNewPaymentVal(''); }}
            style={{ background: '#4CAF50', border: 'none', color: '#000', fontWeight: 'bold', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', minHeight: '42px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✓ Confirmar Pagamento
          </button>
        </div>

        {/* Histórico compacto */}
        {selectedLead.financeiro?.recebimentos && Object.values(selectedLead.financeiro.recebimentos).length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.values(selectedLead.financeiro.recebimentos)
              .sort((a, b) => new Date(b.data) - new Date(a.data))
              .map((rec) => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(76,175,80,0.04)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(76,175,80,0.1)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{formatCurrency(rec.valor)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{rec.formaPagamento} · {new Date(rec.data).toLocaleDateString('pt-BR')}</span>
                  <button type="button" onClick={() => handleDeleteRecebimento(rec.id)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '2px 4px' }}><FiTrash2 size={13} /></button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── LANÇAR CUSTO ── */}
      <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>💸 Lançar Custo</div>
          <button
            type="button"
            onClick={() => handleApplyPackageCostsTemplate(selectedLead)}
            style={{
              background: 'rgba(203,161,83,0.12)',
              border: '1px solid rgba(203,161,83,0.3)',
              color: 'var(--primary)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ⚡ Importar Custos Padrão do Pacote
          </button>
        </div>

        {/* Formulário de Custo */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Descrição (ex: Gelo, Barman Extra)"
            value={newCost.descricao || ''}
            onChange={(e) => setNewCost(prev => ({ ...prev, descricao: e.target.value }))}
            list="custos-autocomplete-list"
            style={{ flex: '2', minWidth: '130px', background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px', fontSize: '0.88rem', outline: 'none' }}
          />
          <input
            type="number"
            placeholder="Qtd"
            value={newCost.quantidade || ''}
            onChange={(e) => setNewCost(prev => ({ ...prev, quantidade: e.target.value }))}
            style={{ width: '60px', background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#f0f2ec', padding: '10px 8px', fontSize: '0.88rem', outline: 'none', textAlign: 'center' }}
          />
          <input
            type="number"
            placeholder="R$ Unit."
            value={newCost.valorUnitario || ''}
            onChange={(e) => setNewCost(prev => ({ ...prev, valorUnitario: e.target.value }))}
            style={{ width: '80px', background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#f0f2ec', padding: '10px 8px', fontSize: '0.88rem', outline: 'none' }}
          />
          <select
            value={newCost.categoria || 'insumos'}
            onChange={(e) => setNewCost(prev => ({ ...prev, categoria: e.target.value }))}
            title="Categoria do custo"
            style={{ background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#FFD54F', padding: '10px 6px', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
          >
            {allCats.map(cat => (
              <option key={cat.id} value={cat.id} style={{ background: '#111', color: '#fff' }}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { handleAddCost(newCost.descricao, newCost.valor, newCost.categoria); setNewCost({ descricao: '', valor: '', categoria: 'insumos', quantidade: '', valorUnitario: '', itemIdEstoque: '' }); }}
            style={{ background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 'bold', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', height: '42px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FiPlus size={15} /> Adicionar
          </button>
        </div>

        {/* Lista de custos */}
        {custosLista.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {custosLista.map((custo) => {
              const catId = custo.categoria || detectCategoryByDescription(custo.descricao);
              const matched = allCats.find(c => c.id === catId) || { label: 'Outros', emoji: '✨', color: '#a8b8aa' };
              const numQ = parseFloat(custo.quantidade) || 0;
              const numU = parseFloat(custo.valorUnitario) || 0;
              return (
                <div key={custo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem', gap: '6px' }}>
                  <select
                    value={catId}
                    onChange={(e) => handleUpdateCostCategory(custo.id, e.target.value)}
                    title="Clique para alterar a categoria deste custo"
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: matched.color || 'var(--text-secondary)', padding: '2px 4px', fontSize: '0.78rem', cursor: 'pointer', outline: 'none' }}
                  >
                    {allCats.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#111', color: '#fff' }}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.85rem' }}>{custo.descricao}</span>
                    {numQ > 0 && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: '500', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ background: 'rgba(203,161,83,0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(203,161,83,0.25)' }}>
                          {numQ}x {numU > 0 ? formatCurrency(numU) : ''}
                        </span>
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '6px' }}>
                    <span style={{ color: '#F44336', fontWeight: 'bold', fontSize: '0.88rem' }}>
                      {formatCurrency(getCustoValor(custo))}
                    </span>
                  </div>
                  <button type="button" onClick={() => handleRemoveCost(custo.id)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title="Remover custo">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontWeight: 'bold', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total de Custos</span>
              <span style={{ color: '#F44336' }}>{formatCurrency(totalCustos)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── CONFIGURAÇÕES AVANÇADAS ── */}
      <details style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
        <summary style={{ padding: '12px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚙️ Ajustar Faturamento & Desconto</span>
          <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>▼</span>
        </summary>
        <div style={{ padding: '12px 14px', paddingTop: 0, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Faturamento (R$)</label>
              <button type="button" onClick={handleImportFromPackage} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}>📋 do Pacote</button>
            </div>
            <input type="number" placeholder="0.00" value={faturamentoInput} onChange={(e) => setFaturamentoInput(e.target.value)} onBlur={() => handleUpdateFaturamento(faturamentoInput)} style={{ background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#f0f2ec', padding: '8px 12px', fontSize: '0.88rem', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ flex: '1', minWidth: '140px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Desconto (R$)</label>
            <input type="number" placeholder="0.00" value={descontoInput} onChange={(e) => setDescontoInput(e.target.value)} onBlur={() => handleUpdateDesconto(descontoInput)} style={{ background: '#0c1610', border: '1px solid rgba(203,161,83,0.12)', borderRadius: '8px', color: '#f0f2ec', padding: '8px 12px', fontSize: '0.88rem', outline: 'none', width: '100%' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '6px' }}>
              <input type="checkbox" checked={selectedLead?.financeiro?.aplicarDescontoMaoDeObra || false} onChange={(e) => handleUpdateAplicarDescontoMaoDeObra(e.target.checked)} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Aplicar na Mão de Obra</span>
            </label>
          </div>
        </div>
      </details>

    </div>
  );
}
