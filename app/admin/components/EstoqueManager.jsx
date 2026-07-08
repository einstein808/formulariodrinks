"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiPackage, FiPlus, FiTrash2, FiX, FiAlertCircle, FiArrowDown, FiArrowUp, FiSearch, FiClock, FiCamera } from 'react-icons/fi';

const CATEGORIAS = [
  { id: 'insumos', label: 'Insumos', emoji: '' },
  { id: 'bebidas', label: 'Bebidas', emoji: '' },
  { id: 'descartaveis', label: 'Descartaveis', emoji: '' },
  { id: 'equipamentos', label: 'Equipamentos', emoji: '' },
  { id: 'outros', label: 'Outros', emoji: '' },
];

const UNIDADES = ['un', 'kg', 'g', 'L', 'mL', 'cx', 'pct', 'dz'];

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

function ItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item ? { ...item } : { nome: '', codigoBarras: '', unidade: 'un', quantidadeAtual: 0, quantidadeMinima: 1, custo: '', categoria: 'insumos' }
  );
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { alert('Nome obrigatorio.'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  const startScanner = async () => {
    if (typeof window === 'undefined') return;
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("modal-qr-reader");
          html5QrCodeRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (w, h) => {
                const s = Math.min(w, h) * 0.7;
                return { width: s, height: s };
              }
            },
            (decodedText) => {
              setForm(f => ({ ...f, codigoBarras: decodedText }));
              stopScanner();
            },
            () => {}
          );
        } catch (e) {
          console.error(e);
          alert('Erro ao acessar a camera.');
          setScanning(false);
        }
      }, 300);
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const iStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(203,161,83,0.18)', borderRadius: '8px', color: 'var(--text-primary)', padding: '10px 12px', fontSize: '0.88rem', outline: 'none', width: '100%' };
  const lStyle = { fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };

  const precoHistArr = item?.historicoPrecos
    ? Object.values(item.historicoPrecos).sort((a, b) => new Date(b.data) - new Date(a.data))
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif' }}>{item ? 'Editar Item' : 'Novo Item de Estoque'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={20} /></button>
        </div>

        {scanning && (
          <div style={{ marginBottom: '14px', width: '100%' }}>
            <div id="modal-qr-reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: '2px solid var(--primary)', background: '#000' }} />
            <button type="button" onClick={stopScanner} style={{ width: '100%', padding: '10px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', color: '#F44336', borderRadius: '8px', cursor: 'pointer', marginTop: '8px', fontSize: '0.85rem' }}>
              Cancelar Leitura
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label style={lStyle}>Nome *</label><input style={iStyle} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Limao Taiti..." /></div>
          
          <div>
            <label style={lStyle}>Codigo de Barras</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={iStyle} inputMode="numeric" value={form.codigoBarras || ''} onChange={e => setForm(f => ({ ...f, codigoBarras: e.target.value }))} placeholder="Escaneie ou digite" />
              {!scanning && (
                <button type="button" onClick={startScanner} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(203,161,83,0.08)', border: '1px solid rgba(203,161,83,0.3)', color: 'var(--primary)', padding: '0 14px', borderRadius: '8px', cursor: 'pointer' }}>
                  <FiCamera size={16} /> Leitor
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}><label style={lStyle}>Categoria</label><select style={{ ...iStyle, cursor: 'pointer' }} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>{CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={lStyle}>Unidade</label><select style={{ ...iStyle, cursor: 'pointer' }} value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}><label style={lStyle}>Qtd. Atual</label><input style={iStyle} type="number" min="0" step="0.01" value={form.quantidadeAtual} onChange={e => setForm(f => ({ ...f, quantidadeAtual: parseFloat(e.target.value) || 0 }))} /></div>
            <div style={{ flex: 1 }}><label style={lStyle}>Qtd. Minima</label><input style={iStyle} type="number" min="0" step="0.01" value={form.quantidadeMinima} onChange={e => setForm(f => ({ ...f, quantidadeMinima: parseFloat(e.target.value) || 0 }))} /></div>
            <div style={{ flex: 1 }}><label style={lStyle}>Custo Unit. R$</label><input style={iStyle} type="number" min="0" step="0.01" value={form.custo || ''} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} placeholder="0.00" /></div>
          </div>

          {item && precoHistArr.length > 0 && (
            <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ ...lStyle, marginBottom: '6px' }}>📈 Histórico de Preços</label>
              <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {precoHistArr.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>{fmtDate(h.data)}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{fmtBRL(h.custo)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '10px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>{saving ? 'Salvando...' : 'Salvar Item'}</button>
        </div>
      </div>
    </div>
  );
}

function AbaItens({ items, onEdit, onDelete, onSelectItem }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    if (q && !i.nome.toLowerCase().includes(q) && !(i.codigoBarras || '').includes(q)) return false;
    if (filterCat && i.categoria !== filterCat) return false;
    return true;
  });
  const lowStock = items.filter(i => i.quantidadeAtual <= i.quantidadeMinima);
  return (
    <div>
      {lowStock.length > 0 && (
        <div style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiAlertCircle size={18} style={{ color: '#F44336', flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', color: '#F44336' }}><strong>{lowStock.length} item(ns)</strong> com estoque baixo: {lowStock.map(i => i.nome).join(', ')}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '160px', position: 'relative' }}>
          <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Buscar por nome ou codigo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 30px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}>
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><FiPackage size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} /><div>Nenhum item encontrado.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(item => {
            const isLow = item.quantidadeAtual <= item.quantidadeMinima;
            const cat = CATEGORIAS.find(c => c.id === item.categoria) || CATEGORIAS[4];
            return (
              <div key={item.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '14px 16px', border: `1px solid ${isLow ? 'rgba(244,67,54,0.35)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{cat.emoji} {item.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{cat.label}{item.codigoBarras ? ` | Cod: ${item.codigoBarras}` : ''}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700', color: isLow ? '#F44336' : '#4CAF50' }}>{item.quantidadeAtual}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.unidade} / min {item.quantidadeMinima}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => onSelectItem(item, 'saida')} style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', color: '#F44336', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><FiArrowDown size={14} /> Baixa</button>
                  <button onClick={() => onSelectItem(item, 'entrada')} style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><FiArrowUp size={14} /> Entrada</button>
                  <button onClick={() => onEdit(item)} style={{ background: 'rgba(203,161,83,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => onDelete(item)} style={{ background: 'rgba(244,67,54,0.06)', border: '1px solid rgba(244,67,54,0.2)', color: '#F44336', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AbaMovimentacao({ tipo, items, leads = [], onMovimentar }) {
  const [barcode, setBarcode] = useState('');
  const [foundItem, setFoundItem] = useState(null);
  const [qty, setQty] = useState('1');
  const [motivo, setMotivo] = useState(tipo === 'entrada' ? 'Compra' : 'Uso em evento');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [scanning, setScanning] = useState(false);

  const barcodeRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    barcodeRef.current?.focus();
    setFoundItem(null);
    setBarcode('');
    setQty('1');
    setSelectedLeadId('');
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [tipo]);

  const handleBarcodeInput = (val) => {
    setBarcode(val);
    setFeedback(null);
    setFoundItem(items.find(i => i.codigoBarras === val.trim()) || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && barcode.trim() && !foundItem) {
      setFeedback({ type: 'error', msg: `Nenhum item com codigo "${barcode}"` });
    }
  };

  const handleConfirm = async () => {
    if (!foundItem) return;
    const q = parseFloat(qty) || 0;
    if (q <= 0) { setFeedback({ type: 'error', msg: 'Quantidade deve ser maior que zero.' }); return; }
    try {
      let finalMotivo = motivo;
      if (tipo === 'saida' && selectedLeadId) {
        const leadObj = leads.find(l => l.id === selectedLeadId);
        if (leadObj) {
          finalMotivo = `Uso no evento: ${leadObj.nome} ${leadObj.sobrenome || ''}`.trim();
        }
      }
      await onMovimentar(foundItem, tipo, q, finalMotivo, selectedLeadId);
      setFeedback({ type: 'success', msg: `${tipo === 'saida' ? 'Baixa' : 'Entrada'} de ${q} ${foundItem.unidade} registrada para "${foundItem.nome}"!` });
      setBarcode(''); setFoundItem(null); setQty('1'); setSelectedLeadId('');
      barcodeRef.current?.focus();
    } catch { setFeedback({ type: 'error', msg: 'Erro ao registrar movimentacao.' }); }
  };

  const startScanner = async () => {
    if (typeof window === 'undefined') return;
    setScanning(true);
    setFeedback(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (w, h) => {
                const s = Math.min(w, h) * 0.7;
                return { width: s, height: s };
              }
            },
            (decodedText) => {
              handleBarcodeInput(decodedText);
              stopScanner();
            },
            () => {}
          );
        } catch (e) {
          console.error(e);
          setFeedback({ type: 'error', msg: 'Erro ao acessar camera. Verifique as permissoes.' });
          setScanning(false);
        }
      }, 300);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Erro ao carregar o leitor.' });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const isEntrada = tipo === 'entrada';
  const ac = isEntrada ? '#4CAF50' : '#F44336';

  return (
    <div>
      <div style={{ background: isEntrada ? 'rgba(76,175,80,0.06)' : 'rgba(244,67,54,0.06)', border: `1px solid ${ac}33`, borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEntrada ? <FiArrowUp size={20} style={{ color: ac }} /> : <FiArrowDown size={20} style={{ color: ac }} />}
            <h3 style={{ margin: 0, color: ac }}>{isEntrada ? 'Registrar Entrada de Estoque' : 'Dar Baixa no Estoque'}</h3>
          </div>
          {!scanning ? (
            <button type="button" onClick={startScanner} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(203,161,83,0.08)', border: '1px solid rgba(203,161,83,0.3)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <FiCamera size={16} /> Usar Camera
            </button>
          ) : (
            <button type="button" onClick={stopScanner} style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', color: '#F44336', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              Cancelar
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {scanning && (
            <div style={{ margin: '0 auto 10px', width: '100%', maxWidth: '360px' }}>
              <div id="qr-reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: `2px solid ${ac}`, background: '#000' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
                Aponte a camera para o codigo de barras ou QR code.
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Codigo de Barras (escaneie ou digite)</label>
            <input ref={barcodeRef} type="text" inputMode="numeric" value={barcode} onChange={e => handleBarcodeInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Aponte o leitor, camera ou digite e pressione Enter..."
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: `2px solid ${foundItem ? ac : 'var(--border-color)'}`, borderRadius: '10px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>OU selecione manualmente</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <select value={foundItem?.id || ''} onChange={e => { const item = items.find(i => i.id === e.target.value); setFoundItem(item || null); if (item) setBarcode(item.codigoBarras || ''); }}
            style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer' }}>
            <option value="">-- Selecionar item --</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.nome} (estoque: {i.quantidadeAtual} {i.unidade})</option>)}
          </select>

          {foundItem && (
            <div style={{ background: `${ac}11`, border: `1px solid ${ac}44`, borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{foundItem.nome}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estoque: <strong style={{ color: foundItem.quantidadeAtual <= foundItem.quantidadeMinima ? '#F44336' : '#4CAF50' }}>{foundItem.quantidadeAtual} {foundItem.unidade}</strong></div>
            </div>
          )}

          {foundItem && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '100px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Quantidade ({foundItem.unidade})</label>
                <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${ac}55`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }} />
              </div>
              <div style={{ flex: 2, minWidth: '160px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Motivo</label>
                <select value={motivo} onChange={e => setMotivo(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${ac}55`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer' }}>
                  {isEntrada ? ['Compra', 'Devolucao', 'Ajuste Manual'].map(m => <option key={m}>{m}</option>) : ['Uso em evento', 'Perda / Vencimento', 'Ajuste Manual'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}

          {foundItem && tipo === 'saida' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Vincular a Evento/Festa (opcional)</label>
              <select
                value={selectedLeadId}
                onChange={e => setSelectedLeadId(e.target.value)}
                style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${ac}55`, borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}
              >
                <option value="">-- Não vincular --</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.nome} {lead.sobrenome || ''} ({lead.dataEvento || 'sem data'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {foundItem && (
            <button onClick={handleConfirm} style={{ padding: '14px', background: ac, border: 'none', color: '#FFF', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
              Confirmar {isEntrada ? 'Entrada' : 'Baixa'} de {qty} {foundItem?.unidade || ''}
            </button>
          )}

          {feedback && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '500', background: feedback.type === 'success' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', color: feedback.type === 'success' ? '#4CAF50' : '#F44336', border: `1px solid ${feedback.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}` }}>
              {feedback.type === 'success' ? 'OK' : 'ERRO'}: {feedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AbaHistorico({ movimentacoes, items }) {
  const getItemNome = (id) => items.find(i => i.id === id)?.nome || id;
  const sorted = [...movimentacoes].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 50);
  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>Ultimas 50 movimentacoes</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><FiClock size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} /><div>Nenhuma movimentacao registrada.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sorted.map(mov => (
            <div key={mov.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '10px', border: `1px solid ${mov.tipo === 'entrada' ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}` }}>
              <div style={{ fontSize: '1.2rem' }}>{mov.tipo === 'entrada' ? '📦' : '📉'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{getItemNome(mov.itemId)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mov.motivo}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', color: mov.tipo === 'entrada' ? '#4CAF50' : '#F44336' }}>{mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade} {items.find(i => i.id === mov.itemId)?.unidade || ''}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(mov.data)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EstoqueManager() {
  const [items, setItems] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itens');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    const unsubItems = onValue(ref(db, 'config/estoque'), snap => {
      setItems(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')) : []);
      setLoading(false);
    });
    const unsubMov = onValue(ref(db, 'config/estoqueMovimentacoes'), snap => {
      setMovimentacoes(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const unsubLeads = onValue(ref(db, 'leads'), snap => {
      setLeads(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    return () => { unsubItems(); unsubMov(); unsubLeads(); };
  }, []);

  const handleSaveItem = async (form) => {
    const oldItem = items.find(i => i.id === form.id);
    const newCusto = parseFloat(form.custo) || 0;
    const oldCusto = oldItem ? (parseFloat(oldItem.custo) || 0) : null;

    let updatedForm = { ...form };
    updatedForm.quantidadeAtual = parseFloat(form.quantidadeAtual) || 0;
    updatedForm.quantidadeMinima = parseFloat(form.quantidadeMinima) || 0;
    updatedForm.custo = parseFloat(form.custo) || 0;

    if (form.id) {
      if (newCusto !== oldCusto) {
        const histRef = push(ref(db, `config/estoque/${form.id}/historicoPrecos`));
        await set(histRef, {
          data: new Date().toISOString(),
          custo: newCusto
        });
      }
      await update(ref(db, `config/estoque/${form.id}`), updatedForm);
      showToast(`"${form.nome}" atualizado.`);
    } else {
      const newRef = push(ref(db, 'config/estoque'));
      const itemId = newRef.key;
      const itemData = {
        ...updatedForm,
        criadoEm: new Date().toISOString()
      };
      await set(newRef, itemData);
      if (newCusto > 0) {
        const histRef = push(ref(db, `config/estoque/${itemId}/historicoPrecos`));
        await set(histRef, {
          data: new Date().toISOString(),
          custo: newCusto
        });
      }
      showToast(`"${form.nome}" criado com sucesso.`);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    await remove(ref(db, `config/estoque/${item.id}`));
    showToast(`"${item.nome}" removido.`, 'warning');
  };

  const handleMovimentar = async (item, tipo, quantidade, motivo, leadId = '') => {
    const novaQtd = tipo === 'entrada' ? (item.quantidadeAtual || 0) + quantidade : Math.max(0, (item.quantidadeAtual || 0) - quantidade);
    await update(ref(db, `config/estoque/${item.id}`), { quantidadeAtual: novaQtd });
    const movRef = push(ref(db, 'config/estoqueMovimentacoes'));
    await set(movRef, {
      itemId: item.id,
      tipo,
      quantidade,
      motivo,
      data: new Date().toISOString(),
      ...(leadId ? { leadId } : {})
    });

    if (tipo === 'saida' && leadId) {
      const costId = `custo-${Date.now()}`;
      const unitCost = parseFloat(item.custo) || 0;
      const totalCost = unitCost * quantidade;
      await set(ref(db, `leads/${leadId}/financeiro/custos/${costId}`), {
        id: costId,
        descricao: item.nome,
        valor: totalCost,
        quantidade: quantidade,
        valorUnitario: unitCost,
        categoria: item.categoria || 'insumos',
        itemIdEstoque: item.id
      });
    }
  };

  const lowStockCount = items.filter(i => i.quantidadeAtual <= i.quantidadeMinima).length;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;

  const tabStyle = (id) => ({
    padding: '10px 18px', background: activeTab === id ? 'rgba(203,161,83,0.10)' : 'transparent',
    border: 'none', borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
    color: activeTab === id ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: activeTab === id ? '600' : 'normal', fontSize: '0.9rem', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
  });

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 9999, background: toast.type === 'success' ? '#1B5E20' : '#E65100', color: '#FFF', padding: '12px 20px', borderRadius: '10px', fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}
      {showModal && <ItemModal item={editingItem} onClose={() => { setShowModal(false); setEditingItem(null); }} onSave={handleSaveItem} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Controle de Estoque</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {items.length} itens cadastrados
            {lowStockCount > 0 && <span style={{ marginLeft: '10px', background: 'rgba(244,67,54,0.12)', color: '#F44336', border: '1px solid rgba(244,67,54,0.3)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>{lowStockCount} com estoque baixo</span>}
          </p>
        </div>
        <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPlus size={18} /> Novo Item
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', overflowX: 'auto', gap: '4px' }}>
        <button style={tabStyle('itens')} onClick={() => setActiveTab('itens')}>
          <FiPackage size={16} /> Itens
          {lowStockCount > 0 && <span style={{ background: '#F44336', color: '#FFF', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', padding: '1px 6px' }}>{lowStockCount}</span>}
        </button>
        <button style={tabStyle('saida')} onClick={() => setActiveTab('saida')}><FiArrowDown size={16} /> Dar Baixa</button>
        <button style={tabStyle('entrada')} onClick={() => setActiveTab('entrada')}><FiArrowUp size={16} /> Entrada</button>
        <button style={tabStyle('historico')} onClick={() => setActiveTab('historico')}><FiClock size={16} /> Historico</button>
      </div>

      {activeTab === 'itens' && <AbaItens items={items} onEdit={item => { setEditingItem(item); setShowModal(true); }} onDelete={handleDeleteItem} onSelectItem={(item, tipo) => setActiveTab(tipo)} />}
      {(activeTab === 'saida' || activeTab === 'entrada') && <AbaMovimentacao tipo={activeTab} items={items} leads={leads} onMovimentar={handleMovimentar} />}
      {activeTab === 'historico' && <AbaHistorico movimentacoes={movimentacoes} items={items} />}
    </div>
  );
}
