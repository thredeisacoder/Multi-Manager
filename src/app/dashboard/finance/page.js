'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { DEFAULT_FINANCE_FIELDS, DEFAULT_PERSONAL_FINANCE_FIELDS } from '@/lib/constants';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getSegments, addSegment, updateSegment, deleteSegment as delSegment, getRecord, upsertRecord, getRecords, getDebts, cleanupOrphanedRecords } from '@/lib/store';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { v4 as uuidv4 } from 'uuid';

const fmt = (n, currency = 'USD') => new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(n || 0);

export default function FinancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeMainTab, setActiveMainTab] = useState('business');
  const [segments, setSegments] = useState([]);
  const [activeSegment, setActiveSegment] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formValues, setFormValues] = useState({});
  const [note, setNote] = useState('');
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [segmentForm, setSegmentForm] = useState({ name: '', platform: '', color: '#00ff6a', category: 'business', currency: 'USD', initialMonth: new Date().toISOString().slice(0, 7) });
  const [segmentFields, setSegmentFields] = useState([]);
  const [editingSegment, setEditingSegment] = useState(null);
  const [globalDebts, setGlobalDebts] = useState([]);
  const [dynamicDebts, setDynamicDebts] = useState([]);
  const [txLog, setTxLog] = useState([]); // expense/income transaction log
  const [addingTxForField, setAddingTxForField] = useState(null);
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  const [pendingTxs, setPendingTxs] = useState([]); // pending revenue log
  const [addingPending, setAddingPending] = useState(false);
  const [pendingForm, setPendingForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });

  useEffect(() => { 
    cleanupOrphanedRecords(); // remove records from deleted segments
    loadSegments(); 
    setGlobalDebts(getDebts());
  }, []);
  useEffect(() => { if (activeSegment) loadRecord(); }, [activeSegment, selectedMonth]);

  const loadSegments = () => {
    const segs = getSegments();
    
    // Auto-create default Personal Wallet if none exists
    const hasPersonal = segs.some(s => s.category === 'personal');
    if (!hasPersonal) {
      const defaultPersonal = {
        name: 'Personal Wallet',
        platform: 'Finance',
        color: '#ff9f43',
        category: 'personal',
        currency: 'USD',
        fields: DEFAULT_PERSONAL_FINANCE_FIELDS
      };
      const newSeg = addSegment(defaultPersonal);
      segs.push(newSeg);
    }

    setSegments(segs);
    
    // Update activeSegment based on main tab
    const filtered = segs.filter(s => s.category === activeMainTab);
    if (filtered.length > 0) {
      // If current activeSegment is not in the new filtered list, switch to first one
      if (!activeSegment || activeSegment.category !== activeMainTab) {
        setActiveSegment(filtered[0]);
      }
    } else {
      setActiveSegment(null);
    }
  };

  useEffect(() => { loadSegments(); }, [activeMainTab]);

  const loadRecord = () => {
    if (!activeSegment) return;
    const rec = getRecord(activeSegment.id, selectedMonth);
    if (rec) {
      setFormValues(rec.values || {});
      setNote(rec.note || '');
      setDynamicDebts(rec.values?._dynamic_debts || []);
      setTxLog(rec.values?._tx_log || []);
      setPendingTxs(rec.values?._pending_txs || []);
    } else {
      setFormValues({});
      setNote('');
      setDynamicDebts([]);
      setTxLog([]);
      setPendingTxs([]);
    }
    setAddingTxForField(null);
    setAddingPending(false);
    setTxForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
    setPendingForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  };

  const saveRecord = () => {
    if (!activeSegment) return;
    const pendingTotal = pendingTxs.reduce((s, t) => s + t.amount, 0);
    const finalValues = { ...formValues, _dynamic_debts: dynamicDebts, _tx_log: txLog, _pending_txs: pendingTxs, _pending_amount: pendingTotal };
    upsertRecord(activeSegment.id, selectedMonth, finalValues, note);
    toast.success('Record saved successfully');
    loadRecord();
  };

  const addPendingTx = () => {
    const amount = parseFloat(pendingForm.amount) || 0;
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    const tx = { id: uuidv4(), date: pendingForm.date || new Date().toISOString().slice(0, 10), description: pendingForm.description.trim() || '—', amount };
    setPendingTxs(prev => [...prev, tx]);
    setAddingPending(false);
    setPendingForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  };

  const deletePendingTx = (txId) => {
    setPendingTxs(prev => prev.filter(t => t.id !== txId));
  };

  const addExpenseTx = (fieldId) => {
    const amount = parseFloat(txForm.amount) || 0;
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    const tx = { id: uuidv4(), date: txForm.date || new Date().toISOString().slice(0, 10), description: txForm.description.trim() || '—', field_id: fieldId, amount, kind: 'expense' };
    setTxLog(prev => [...prev, tx]);
    setFormValues(prev => ({ ...prev, [fieldId]: (parseFloat(prev[fieldId]) || 0) + amount }));
    setAddingTxForField(null);
    setTxForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  };

  const deleteExpenseTx = (txId) => {
    const tx = txLog.find(t => t.id === txId);
    if (!tx) return;
    setTxLog(prev => prev.filter(t => t.id !== txId));
    setFormValues(prev => ({ ...prev, [tx.field_id]: Math.max(0, (parseFloat(prev[tx.field_id]) || 0) - tx.amount) }));
  };

  const addIncomeTx = (fieldId) => {
    const amount = parseFloat(txForm.amount) || 0;
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    const tx = { id: uuidv4(), date: txForm.date || new Date().toISOString().slice(0, 10), description: txForm.description.trim() || '—', field_id: fieldId, amount, kind: 'income' };
    setTxLog(prev => [...prev, tx]);
    setFormValues(prev => ({ ...prev, [fieldId]: (parseFloat(prev[fieldId]) || 0) + amount }));
    setAddingTxForField(null);
    setTxForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  };

  const deleteIncomeTx = (txId) => {
    const tx = txLog.find(t => t.id === txId);
    if (!tx) return;
    setTxLog(prev => prev.filter(t => t.id !== txId));
    setFormValues(prev => ({ ...prev, [tx.field_id]: Math.max(0, (parseFloat(prev[tx.field_id]) || 0) - tx.amount) }));
  };

  // Reusable tx-log field renderer
  const renderTxField = (f, kind) => {
    const color = kind === 'income' ? 'var(--income)' : 'var(--expense)';
    const bg = kind === 'income' ? 'rgba(0,255,106,0.05)' : 'rgba(255,71,87,0.05)';
    const border = kind === 'income' ? 'rgba(0,255,106,0.15)' : 'rgba(255,71,87,0.15)';
    const onAdd = kind === 'income' ? addIncomeTx : addExpenseTx;
    const onDelete = kind === 'income' ? deleteIncomeTx : deleteExpenseTx;
    const emptyMsg = kind === 'income' ? 'No income logged yet. Click + Add to record a payment.' : 'No transactions logged yet. Click + Add to record a spend.';
    const fieldTxs = txLog.filter(t => t.field_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
    const fieldTotal = fieldTxs.reduce((s, t) => s + t.amount, 0);
    return (
      <div key={f.id} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="form-label" style={{ margin: 0 }}>{f.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 700, fontSize: '0.95rem' }}>
              {fmt(fieldTotal, activeSegment.currency)}
            </span>
            <button className="btn btn-ghost btn-sm" style={{ color, fontSize: '0.8rem', padding: '3px 10px' }}
              onClick={() => setAddingTxForField(addingTxForField === f.id ? null : f.id)}>
              + Add
            </button>
          </div>
        </div>
        {addingTxForField === f.id && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" className="input" style={{ flex: '0 0 140px', fontSize: '0.85rem' }}
                value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
              <input className="input" placeholder="Description" style={{ flex: 1, minWidth: 120, fontSize: '0.85rem' }}
                value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
              <input type="number" className="input" placeholder="Amount" style={{ width: 120, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && onAdd(f.id)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setAddingTxForField(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => onAdd(f.id)}>Add</button>
            </div>
          </div>
        )}
        {fieldTxs.length > 0 ? (
          <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {fieldTxs.map((tx, i) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: i % 2 === 0 ? 'var(--bg-input)' : 'transparent', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', minWidth: 68 }}>{tx.date}</span>
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{tx.description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>{fmt(tx.amount, activeSegment.currency)}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1 }}
                  onClick={() => onDelete(tx.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '4px 0' }}>{emptyMsg}</div>
        )}
      </div>
    );
  };

  const openAddSegment = () => {
    setSegmentForm({ name: '', platform: '', color: '#00ff6a', category: 'business', currency: 'USD', initialMonth: new Date().toISOString().slice(0, 7) });
    setSegmentFields(DEFAULT_FINANCE_FIELDS.map(f => ({ ...f, id: uuidv4() })));
    setEditingSegment(null);
    setShowAddSegment(true);
  };

  const openEditSegment = (seg) => {
    setSegmentForm({ name: seg.name, platform: seg.platform || '', color: seg.color || '#00ff6a', category: seg.category || 'business', currency: seg.currency || 'USD', initialMonth: '' });
    setSegmentFields((seg.fields || []).map(f => ({ ...f })));
    setEditingSegment(seg);
    setShowAddSegment(true);
  };

  const saveSegmentHandler = () => {
    if (!segmentForm.name.trim()) { toast.error('Segment name is required'); return; }
    const payload = { name: segmentForm.name, platform: segmentForm.platform, color: segmentForm.color, category: segmentForm.category, currency: segmentForm.currency, fields: segmentFields };
    if (editingSegment) {
      updateSegment(editingSegment.id, payload);
      toast.success('Segment updated');
    } else {
      const newSeg = addSegment(payload);
      setActiveSegment(newSeg);
      if (segmentForm.initialMonth) setSelectedMonth(segmentForm.initialMonth);
      toast.success('Segment created');
    }
    setShowAddSegment(false);
    loadSegments();
  };

  const deleteSegmentHandler = async (seg) => {
    const ok = await confirm({ title: 'Delete Segment', message: `Delete segment "${seg.name}"? All records will be lost.`, variant: 'danger' });
    if (!ok) return;
    delSegment(seg.id);
    toast.success('Segment deleted');
    if (activeSegment?.id === seg.id) setActiveSegment(null);
    loadSegments();
  };

  const addField = () => setSegmentFields([...segmentFields, { id: uuidv4(), name: '', type: 'expense' }]);
  const removeField = (id) => setSegmentFields(segmentFields.filter(f => f.id !== id));
  const updateField = (id, key, val) => setSegmentFields(segmentFields.map(f => f.id === id ? { ...f, [key]: val } : f));

  let incomeFields = [], expenseFields = [];
  let totalIncome = 0, totalExpense = 0, netProfit = 0;
  
  if (activeSegment) {
    incomeFields = activeSegment.fields.filter(f => f.type === 'income');
    expenseFields = activeSegment.fields.filter(f => f.type === 'expense');

    // Business: income also from tx log; Personal: income from manual formValues
    if (activeSegment.category === 'business') {
      incomeFields.forEach(f => {
        totalIncome += txLog.filter(t => t.field_id === f.id).reduce((s, t) => s + t.amount, 0);
      });
    } else {
      incomeFields.forEach(f => { totalIncome += parseFloat(formValues[f.id]) || 0; });
    }
    // Expense total from transaction log
    expenseFields.forEach(f => {
      totalExpense += txLog.filter(t => t.field_id === f.id).reduce((s, t) => s + t.amount, 0);
    });
    dynamicDebts.forEach(d => { totalExpense += parseFloat(d.amount) || 0; });
    netProfit = totalIncome - totalExpense;
  }

  const handleExport = (type) => {
    if (!activeSegment) return;
    const allRecords = getRecords(activeSegment.id);
    if (!allRecords.length) { toast.warning('No data to export'); return; }
    const exportData = allRecords.map(r => {
      const row = { Month: r.month };
      activeSegment.fields.forEach(f => { row[f.name] = r.values?.[f.id] || 0; });
      row['Note'] = r.note || '';
      return row;
    });
    if (type === 'csv') exportToCSV(exportData, `${activeSegment.name}_finance`);
    else exportToExcel([{ name: activeSegment.name, data: exportData }], `${activeSegment.name}_finance`);
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Finance</h1>
        <div className="page-actions">
          {activeSegment && (
            <div className="flex-row" style={{ gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
              <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
            </div>
          )}
          <div className="flex-row" style={{ gap: '8px' }}>
            {activeMainTab === 'business' && (
              <button className="btn btn-primary" onClick={openAddSegment}>+ New Segment</button>
            )}
          </div>
        </div>
      </div>

      <div className="tabs main-tabs" style={{ marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button className={`tab ${activeMainTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveMainTab('personal')}>Personal</button>
        <button className={`tab ${activeMainTab === 'business' ? 'active' : ''}`} onClick={() => setActiveMainTab('business')}>Business</button>
      </div>

      {segments.length > 0 ? (
        <>
          {activeMainTab === 'business' && (
            <div className="tabs sub-tabs" style={{ marginBottom: 20 }}>
              {segments.filter(s => s.category === 'business').map(s => (
                <button key={s.id} className={`tab ${activeSegment?.id === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSegment(s)} style={activeSegment?.id === s.id ? { background: s.color || 'var(--neon)' } : {}}>
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {activeSegment && (
              <>
                <div className="flex-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div className="month-picker" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Data for Month:</label>
                  <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                </div>
                <div className="flex-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditSegment(activeSegment)}>Edit Segment</button>
                  {activeSegment.category !== 'personal' && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteSegmentHandler(activeSegment)}>Delete</button>
                  )}
                </div>
              </div>

              <div className="finance-summary" style={{ gridTemplateColumns: `repeat(3, 1fr)`, marginBottom: 20 }}>
                <div className="summary-card">
                  <div className="stat-label">Total Inflow / Revenue</div>
                  <div className="summary-value income">{fmt(totalIncome, activeSegment.currency)}</div>
                </div>
                <div className="summary-card">
                  <div className="stat-label">Total Outflow / Expenses</div>
                  <div className="summary-value" style={{ color: 'var(--expense)' }}>{fmt(totalExpense, activeSegment.currency)}</div>
                </div>
                <div className="summary-card">
                  <div className="stat-label">Net Balance</div>
                  <div className="summary-value" style={{ color: netProfit >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmt(netProfit, activeSegment.currency)}</div>
                </div>
              </div>

              <div className={`grid-${[(incomeFields.length > 0 || activeSegment.category === 'business'), expenseFields.length > 0, activeSegment.category === 'personal'].filter(Boolean).length || 1}`} style={{ marginTop: 20 }}>
                {(incomeFields.length > 0 || activeSegment.category === 'business') && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title" style={{ color: 'var(--income)' }}>Income</h3>
                      <span className="badge badge-income">
                        {activeSegment.category === 'business'
                          ? `${txLog.filter(t => incomeFields.some(f => f.id === t.field_id)).length} transactions`
                          : `${incomeFields.length} fields`}
                      </span>
                    </div>

                    {/* Business: tx-log per income field */}
                    {activeSegment.category === 'business' && incomeFields.map(f => renderTxField(f, 'income'))}

                    {/* Personal: manual input per income field */}
                    {activeSegment.category === 'personal' && incomeFields.map(f => (
                      <div key={f.id} className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">{f.name}</label>
                        <input className="input" type="number" placeholder="0.00"
                          value={formValues[f.id] || ''} onChange={e => setFormValues({ ...formValues, [f.id]: e.target.value })} style={{ fontFamily: 'var(--font-mono)' }} />
                      </div>
                    ))}

                    {activeSegment.category === 'business' && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span className="form-label" style={{ margin: 0, color: '#54a0ff' }}>Pending Revenue</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#54a0ff', fontWeight: 700, fontSize: '0.95rem' }}>
                              {fmt(pendingTxs.reduce((s, t) => s + t.amount, 0), activeSegment.currency)}
                            </span>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#54a0ff', fontSize: '0.8rem', padding: '3px 10px' }}
                              onClick={() => setAddingPending(!addingPending)}>+ Add</button>
                          </div>
                        </div>

                        {addingPending && (
                          <div style={{ background: 'rgba(84,160,255,0.05)', border: '1px solid rgba(84,160,255,0.2)', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <input type="date" className="input" style={{ flex: '0 0 140px', fontSize: '0.85rem' }}
                                value={pendingForm.date} onChange={e => setPendingForm({ ...pendingForm, date: e.target.value })} />
                              <input className="input" placeholder="e.g. Order #123" style={{ flex: 1, minWidth: 120, fontSize: '0.85rem' }}
                                value={pendingForm.description} onChange={e => setPendingForm({ ...pendingForm, description: e.target.value })} />
                              <input type="number" className="input" placeholder="Amount" style={{ width: 120, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                                value={pendingForm.amount} onChange={e => setPendingForm({ ...pendingForm, amount: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && addPendingTx()} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setAddingPending(false)}>Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={addPendingTx}>Add</button>
                            </div>
                          </div>
                        )}

                        {pendingTxs.length > 0 ? (
                          <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(84,160,255,0.2)' }}>
                            {[...pendingTxs].sort((a, b) => b.date.localeCompare(a.date)).map((tx, i) => (
                              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: i % 2 === 0 ? 'var(--bg-input)' : 'transparent', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', minWidth: 68 }}>{tx.date}</span>
                                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{tx.description}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: '#54a0ff', fontWeight: 600 }}>{fmt(tx.amount, activeSegment.currency)}</span>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1 }}
                                  onClick={() => deletePendingTx(tx.id)} title="Delete">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '4px 0' }}>No pending revenue logged. Click + Add to record an outstanding order.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {expenseFields.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title" style={{ color: 'var(--expense)' }}>Expenses</h3>
                      <span className="badge badge-expense">{txLog.filter(t => expenseFields.some(f => f.id === t.field_id)).length} transactions</span>
                    </div>
                    {expenseFields.map(f => renderTxField(f, 'expense'))}
                  </div>
                )}
                {activeSegment.category === 'personal' && (
                  <div className="card" style={{ border: '1px solid rgba(255, 159, 67, 0.2)' }}>
                    <div className="card-header" style={{ marginBottom: 12 }}>
                      <h3 className="card-title" style={{ color: '#ff9f43' }}>Debt Repayments</h3>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ff9f43' }} onClick={() => setDynamicDebts([...dynamicDebts, { id: uuidv4(), debt_id: globalDebts.length === 1 ? globalDebts[0].id : '', amount: '' }])}>+ Add Payment</button>
                    </div>
                    {dynamicDebts.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em', fontStyle: 'italic' }}>No debt payments logged for this month.</div>
                    ) : (
                      dynamicDebts.map(d => (
                        <div key={d.id} className="flex-row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <select className="select" style={{ flex: 1, minWidth: 150 }} value={d.debt_id} onChange={e => setDynamicDebts(dynamicDebts.map(x => x.id === d.id ? { ...x, debt_id: e.target.value } : x))}>
                            <option value="" disabled>Select Debt...</option>
                            {globalDebts.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                          <input className="input" type="number" placeholder="0.00" style={{ width: 140, fontFamily: 'var(--font-mono)' }} value={d.amount} onChange={e => setDynamicDebts(dynamicDebts.map(x => x.id === d.id ? { ...x, amount: e.target.value } : x))} />
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDynamicDebts(dynamicDebts.filter(x => x.id !== d.id))}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                

              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea className="textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for this month..." />
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={saveRecord}>Save Record</button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card">
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <h3>No Segments Yet</h3>
            <p>Create your first business segment to start tracking finances</p>
            <button className="btn btn-primary" onClick={openAddSegment}>+ Create Segment</button>
          </div>
        </div>
      )}

      <Modal isOpen={showAddSegment} onClose={() => setShowAddSegment(false)} title={editingSegment ? 'Edit Segment' : 'New Segment'} large
        footer={<><button className="btn btn-secondary" onClick={() => setShowAddSegment(false)}>Cancel</button><button className="btn btn-primary" onClick={saveSegmentHandler}>Save Segment</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Segment Name</label>
              <input className="input" value={segmentForm.name} onChange={e => setSegmentForm({ ...segmentForm, name: e.target.value })} placeholder="e.g. Etsy Store" />
            </div>
            {!editingSegment && (
              <div className="form-group">
                <label className="form-label">Data for Month</label>
                <input className="input" type="month" value={segmentForm.initialMonth} onChange={e => setSegmentForm({ ...segmentForm, initialMonth: e.target.value })} />
              </div>
            )}
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="select" value={segmentForm.currency} onChange={e => setSegmentForm({ ...segmentForm, currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Platform</label>
              <input className="input" value={segmentForm.platform} onChange={e => setSegmentForm({ ...segmentForm, platform: e.target.value })} placeholder="e.g. etsy" />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input type="color" value={segmentForm.color} onChange={e => setSegmentForm({ ...segmentForm, color: e.target.value })} style={{ width: '100%', height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
          </div>
          <div>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <label className="form-label">Fields</label>
              <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
            </div>
            {segmentFields.map(f => (
              <div key={f.id} className="flex-row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 1, minWidth: 150 }} value={f.name} onChange={e => updateField(f.id, 'name', e.target.value)} placeholder="Field name" />
                <select className="select" style={{ width: 140 }} value={f.type} onChange={e => updateField(f.id, 'type', e.target.value)}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeField(f.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
