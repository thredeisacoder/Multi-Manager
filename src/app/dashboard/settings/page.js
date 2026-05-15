'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { PLATFORMS } from '@/lib/constants';
import { getPlatforms, addPlatform, deletePlatform, seedPlatforms, exportAllData, importData, changePin } from '@/lib/store';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { v4 as uuidv4 } from 'uuid';

export default function SettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [platforms, setPlatforms] = useState([]);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [platForm, setPlatForm] = useState({ name: '', slug: '', color: '#00ff6a', field_schema: [] });
  const fileInputRef = useRef(null);
  
  // PIN Change State
  const [pinForm, setPinForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => { reload(); }, []);

  const reload = () => { setPlatforms(getPlatforms()); };

  const handleSeed = async () => {
    const ok = await confirm({ title: 'Seed Defaults', message: 'This will add default platform templates (Etsy, eBay, Gmail). Continue?', variant: 'info' });
    if (!ok) return;
    seedPlatforms(PLATFORMS);
    toast.success('Default platforms added');
    reload();
  };

  const handleDeletePlatform = async (p) => {
    const ok = await confirm({ title: 'Delete Platform', message: `Delete platform "${p.name}"? All associated accounts will also be deleted.`, variant: 'danger' });
    if (!ok) return;
    deletePlatform(p.id);
    toast.success('Platform deleted');
    reload();
  };

  const addFieldToForm = () => {
    setPlatForm({ ...platForm, field_schema: [...platForm.field_schema, { key: '', label: '', type: 'text', encrypted: false }] });
  };

  const updateFieldInForm = (idx, updates) => {
    const schema = [...platForm.field_schema];
    schema[idx] = { ...schema[idx], ...updates };
    setPlatForm({ ...platForm, field_schema: schema });
  };

  const removeFieldFromForm = (idx) => {
    setPlatForm({ ...platForm, field_schema: platForm.field_schema.filter((_, i) => i !== idx) });
  };

  const savePlatformHandler = () => {
    if (!platForm.name || !platForm.slug) { toast.error('Name and slug are required'); return; }
    addPlatform(platForm);
    toast.success('Platform created');
    setShowAddPlatform(false);
    setPlatForm({ name: '', slug: '', color: '#00ff6a', field_schema: [] });
    reload();
  };

  const handlePinChange = async (e) => {
    e.preventDefault();
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error('New PIN and Confirmation do not match');
      return;
    }
    if (pinForm.newPin.length < 4) {
      toast.error('New PIN must be at least 4 digits');
      return;
    }

    setIsChangingPin(true);
    try {
      await changePin(pinForm.oldPin, pinForm.newPin);
      toast.success('PIN changed successfully. All data re-encrypted.');
      setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change PIN');
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Logout Session', message: 'All sensitive data will be locked until you enter your PIN again.', variant: 'danger' });
    if (ok) {
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const handleExport = () => { exportAllData(); toast.success('Data exported'); };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importData(file);
      toast.success('Data imported successfully!');
      window.location.reload();
    } catch (err) { toast.error('Import failed: ' + err.message); }
    e.target.value = '';
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
        {/* Security & Session */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Security & Session</h3>
          </div>
          
          <form onSubmit={handlePinChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Old PIN</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Current PIN"
                  value={pinForm.oldPin}
                  onChange={e => setPinForm({ ...pinForm, oldPin: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">New PIN</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Min 4 digits"
                  value={pinForm.newPin}
                  onChange={e => setPinForm({ ...pinForm, newPin: e.target.value })}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New PIN</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Confirm new PIN"
                value={pinForm.confirmPin}
                onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                required 
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={isChangingPin} style={{ width: '100%' }}>
              {isChangingPin ? 'Updating & Re-encrypting...' : 'Change Security PIN'}
            </button>
          </form>

          <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
              Log Out Current Session
            </button>
          </div>
        </div>

        {/* Data Management Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Status</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Encryption Algorithm</p>
              <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--neon)' }}>AES-256-GCM (Military Grade)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Workspace Identity</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Administrator / Local Mode</p>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              💡 All encryption and decryption happens locally in your browser. Your PIN is never sent to any server.
            </p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Data Management</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          Export your data as JSON to back up or transfer to another computer. Import a previously exported file to restore your data.
        </p>
        <div className="flex-row" style={{ gap: 12 }}>
          <button className="btn btn-primary" onClick={handleExport}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export All Data
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Data
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>

        <div style={{ marginTop: 16, padding: 16, background: 'rgba(0,255,106,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            💡 <strong>Tip:</strong> Export your data regularly as backup. To use on another computer, export here → transfer the JSON file → import on the other machine.
          </p>
        </div>
      </div>

      {/* Platform Templates */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Platform Templates</h3>
          <div className="flex-row">
            <button className="btn btn-secondary btn-sm" onClick={handleSeed}>Seed Defaults</button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPlatForm({ name: '', slug: '', color: '#00ff6a', field_schema: [] });
              setShowAddPlatform(true);
            }}>+ Add Platform</button>
          </div>
        </div>

        {platforms.length > 0 ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Platform</th><th>Slug</th><th>Fields</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {platforms.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 8 }} />{p.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{p.slug}</td>
                    <td>{(p.field_schema || []).length} fields</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlatform(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No Platforms</h3>
            <p>Click &quot;Seed Defaults&quot; to add Etsy, eBay, Gmail templates</p>
          </div>
        )}
      </div>

      <Modal isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} title="Add Custom Platform" large
        footer={<><button className="btn btn-secondary" onClick={() => setShowAddPlatform(false)}>Cancel</button><button className="btn btn-primary" onClick={savePlatformHandler}>Save</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Name</label><input className="input" value={platForm.name} onChange={e => setPlatForm({ ...platForm, name: e.target.value })} placeholder="e.g. Shopify" /></div>
            <div className="form-group"><label className="form-label">Slug</label><input className="input" value={platForm.slug} onChange={e => setPlatForm({ ...platForm, slug: e.target.value })} placeholder="e.g. shopify" /></div>
          </div>
          <div className="form-group"><label className="form-label">Color</label><input type="color" value={platForm.color} onChange={e => setPlatForm({ ...platForm, color: e.target.value })} style={{ width: 60, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} /></div>
          <div>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <label className="form-label">Fields</label>
              <button className="btn btn-ghost btn-sm" onClick={addFieldToForm}>+ Add Field</button>
            </div>
            {platForm.field_schema.map((f, i) => (
              <div key={i} className="flex-row" style={{ marginBottom: 8 }}>
                <input className="input" style={{ flex: 1 }} value={f.label} onChange={e => updateFieldInForm(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="Field label" />
                <select className="select" style={{ width: 100 }} value={f.type} onChange={e => updateFieldInForm(i, { type: e.target.value })}>
                  <option value="text">Text</option><option value="email">Email</option><option value="url">URL</option>
                  <option value="date">Date</option><option value="textarea">Textarea</option><option value="select">Select</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={f.encrypted} onChange={e => updateFieldInForm(i, { encrypted: e.target.checked })} /> 🔒
                </label>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeFieldFromForm(i)}>
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
