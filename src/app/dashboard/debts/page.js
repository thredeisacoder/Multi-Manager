'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getDebts, addDebt, deleteDebt, getAllRecords, getSegments } from '@/lib/store';

const fmt = (n, currency = 'USD') => new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(n || 0);

export default function DebtsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [debts, setDebts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', initial_amount: 0, currency: 'VND' });

  useEffect(() => { loadDebts(); }, []);

  const loadDebts = () => {
    const allDebts = getDebts();
    const allRecords = getAllRecords();
    const validSegIds = new Set(getSegments().map(s => s.id));
    // Only count repayments from records belonging to existing segments
    const records = allRecords.filter(r => validSegIds.has(r.segment_id));
    
    // Calculate repaid amount dynamically based on finance records
    const enriched = allDebts.map(d => {
      let repaid = 0;
      records.forEach(r => {
        if (r.values && r.values._dynamic_debts) {
          r.values._dynamic_debts.forEach(p => {
            const isValidId = allDebts.some(ad => ad.id === p.debt_id);
            const isOrphanAndOnlyDebt = !isValidId && allDebts.length === 1 && allDebts[0].id === d.id;
            if (p.debt_id === d.id || isOrphanAndOnlyDebt) {
              repaid += parseFloat(p.amount) || 0;
            }
          });
        }
      });
      return { ...d, repaid, remaining: d.initial_amount - repaid };
    });
    setDebts(enriched);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.initial_amount <= 0) return toast.error('Invalid input');
    addDebt({ name: form.name, initial_amount: parseFloat(form.initial_amount), currency: form.currency });
    toast.success('Debt created');
    setShowModal(false);
    loadDebts();
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: 'Delete Debt', message: 'Delete this debt?', variant: 'danger' })) {
      deleteDebt(id);
      toast.success('Deleted');
      loadDebts();
    }
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Global Debts</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setForm({ name: '', initial_amount: 0, currency: 'VND' }); setShowModal(true); }}>+ New Debt</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {debts.map(d => (
          <div key={d.id} className="card">
            <div className="card-header">
              <h3 className="card-title">{d.name}</h3>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--expense)' }} onClick={() => handleDelete(d.id)}>Delete</button>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Initial Amount</span>
                <span>{fmt(d.initial_amount, d.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--expense)' }}>
                <span>Repaid (Via Finance)</span>
                <span>{fmt(d.repaid, d.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 600, color: d.remaining > 0 ? '#ff9f43' : 'var(--income)' }}>
                <span>Remaining</span>
                <span>{fmt(d.remaining, d.currency)}</span>
              </div>
            </div>
          </div>
        ))}
        {debts.length === 0 && <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No debts registered. Create one to link it in Finance Tracker.</div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Debt Entity"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-group">
          <label className="form-label">Debt Name</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Home Loan" />
        </div>
        <div className="form-group">
          <label className="form-label">Initial Borrowed Amount</label>
          <input className="input" type="number" value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
