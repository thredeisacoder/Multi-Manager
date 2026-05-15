'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { ACCOUNT_STATUSES } from '@/lib/constants';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getPlatforms, getAccountsDecrypted, addAccount, updateAccount, deleteAccount as delAccount } from '@/lib/store';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';

export default function AccountsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [platforms, setPlatforms] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activePlatform, setActivePlatform] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({});
  const [revealedFields, setRevealedFields] = useState({});
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => { reload(); }, []);

  const reload = async () => {
    const plats = getPlatforms();
    setPlatforms(plats);
    const decryptedAccounts = await getAccountsDecrypted();
    setAccounts(decryptedAccounts);
    if (!activePlatform && plats.length > 0) setActivePlatform(plats[0]);
  };

  // Filter accounts for active platform only
  const platformAccounts = accounts.filter(a => a.platform_id === activePlatform?.id);

  const filtered = platformAccounts.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    const d = a.data || {};
    return Object.values(d).some(v => String(v).toLowerCase().includes(s));
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const columns = activePlatform?.field_schema || [];

  const openAdd = () => {
    if (!activePlatform) return;
    setFormData({});
    setEditingAccount(null);
    setShowForm(true);
  };

  const openEdit = (account) => {
    setFormData(account.data || {});
    setEditingAccount(account);
    setShowForm(true);
  };

  const saveAccountHandler = async () => {
    if (!activePlatform) return;
    if (editingAccount) {
      await updateAccount(editingAccount.id, { data: formData, status: formData.status || editingAccount.status || 'active' });
      toast.success('Account updated');
    } else {
      await addAccount({ platform_id: activePlatform.id, data: formData, status: formData.status || 'active' });
      toast.success('Account created');
    }
    setShowForm(false);
    reload();
  };

  const deleteAccountHandler = async (id) => {
    const ok = await confirm({ title: 'Delete Account', message: 'Are you sure you want to delete this account? This action cannot be undone.' });
    if (!ok) return;
    delAccount(id);
    toast.success('Account deleted');
    reload();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleReveal = (accountId, fieldKey) => {
    const key = `${accountId}_${fieldKey}`;
    setRevealedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const switchPlatform = (plat) => {
    setActivePlatform(plat);
    setSearch('');
    setPage(1);
    setRevealedFields({});
  };

  const renderCellValue = (account, field) => {
    const value = account.data?.[field.key] || '';
    if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

    if (field.key === 'status' || field.type === 'select') {
      const s = value.toLowerCase();
      return <span className={`badge badge-${s}`}><span className={`badge-dot ${s}`} />{value}</span>;
    }

    if (field.encrypted) {
      const revealed = revealedFields[`${account.id}_${field.key}`];
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {revealed ? value : '••••••••'}
          </span>
          <button className="copy-btn" onClick={e => { e.stopPropagation(); toggleReveal(account.id, field.key); }} title="Show/Hide" style={{ flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {revealed
                ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              }
            </svg>
          </button>
          <button className="copy-btn" onClick={e => { e.stopPropagation(); copyToClipboard(value); }} title="Copy" style={{ flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      );
    }

    if (field.type === 'url' && value) {
      return <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: '0.8rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--neon)' }}>{value}</a>;
    }

    return <span style={{ fontSize: '0.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{value}</span>;
  };

  const handleExport = (type) => {
    if (!activePlatform) return;
    const exportData = filtered.map(a => {
      const row = {};
      columns.forEach(f => { row[f.label] = a.data?.[f.key] || ''; });
      return row;
    });
    if (!exportData.length) { toast.warning('No data to export'); return; }
    const name = `${activePlatform.name}_accounts`;
    if (type === 'csv') exportToCSV(exportData, name);
    else exportToExcel([{ name: activePlatform.name, data: exportData }], name);
  };

  // Count accounts per platform
  const countForPlatform = (pid) => accounts.filter(a => a.platform_id === pid).length;

  const isDecryptionFailed = accounts.some(a => a._decryption_failed);

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <div className="page-actions">
          {activePlatform && !isDecryptionFailed && (
            <div className="flex-row" style={{ gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
              <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
              <button className="btn btn-primary" onClick={openAdd}>+ New Account</button>
            </div>
          )}
        </div>
      </div>

      {isDecryptionFailed ? (
        <div className="card" style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', marginTop: 24, padding: '40px 32px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'var(--danger)', color: 'white', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>!</div>
          <div style={{ maxWidth: 500 }}>
            <h3 style={{ color: 'var(--danger)', margin: '0 0 12px 0', fontSize: '1.5rem' }}>Access Denied: Incorrect PIN</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              The data in this workspace is encrypted with a different PIN. To protect your security, sensitive information cannot be displayed or exported. 
              <br /><br />
              Please <strong>log out</strong> and re-enter the correct PIN to unlock this data.
            </p>
          </div>
        </div>
      ) : platforms.length > 0 ? (
        <>
          {/* Platform Tabs */}
          <div className="tabs" style={{ marginBottom: 20 }}>
            {platforms.map(p => (
              <button key={p.id}
                className={`tab ${activePlatform?.id === p.id ? 'active' : ''}`}
                onClick={() => switchPlatform(p)}
                style={activePlatform?.id === p.id ? { background: p.color, color: '#fff' } : {}}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 8 }} />
                {p.name}
                <span style={{ marginLeft: 8, fontSize: '0.75rem', opacity: 0.7 }}>({countForPlatform(p.id)})</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="filters" style={{ marginBottom: 20 }}>
            <div className="search-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder={`Search in ${activePlatform?.name || ''}...`}
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filtered.length} accounts</span>
          </div>

          {/* Table */}
          {paginated.length > 0 ? (
            <>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: columns.length > 5 ? `${columns.length * 140 + 120}px` : '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>#</th>
                      {columns.map(col => (
                        <th key={col.key} style={{ whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                          {col.label}
                          {col.encrypted && <span style={{ marginLeft: 4, color: 'var(--warning)' }}>🔒</span>}
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', right: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a, idx) => (
                      <tr key={a.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                          {(page - 1) * perPage + idx + 1}
                        </td>
                        {columns.map(col => (
                          <td key={col.key} style={{ whiteSpace: 'nowrap' }}>
                            {renderCellValue(a, col)}
                          </td>
                        ))}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', right: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAccountHandler(a.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} className={`pagination-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                  ))}
                  <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <h3>No {activePlatform?.name} Accounts</h3>
                <p>{search ? 'No results found. Try a different search term.' : `Click "+ Add ${activePlatform?.name}" to create your first account.`}</p>
                {!search && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}>+ Add {activePlatform?.name}</button>}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>No Platforms Configured</h3>
            <p>Go to Settings and click &quot;Seed Defaults&quot; to add platform templates first.</p>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingAccount ? `Edit ${activePlatform?.name} Account` : `New ${activePlatform?.name} Account`} large
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveAccountHandler}>Save Account</button></>}>
        {activePlatform && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {columns.map(field => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label} {field.encrypted && <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>🔒</span>}</label>
                {field.type === 'select' ? (
                  <select className="select" value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}>
                    <option value="">Select...</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea className="textarea" value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />
                ) : (
                  <div className="flex-row">
                    <input className="input" type={field.encrypted && !revealedFields[`form_${field.key}`] ? 'password' : (field.type === 'date' ? 'date' : 'text')}
                      value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.label} style={field.encrypted ? { fontFamily: 'var(--font-mono)' } : {}} />
                    {field.encrypted && (
                      <>
                        <button className="copy-btn" onClick={() => setRevealedFields(prev => ({ ...prev, [`form_${field.key}`]: !prev[`form_${field.key}`] }))} title="Show/Hide">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        {formData[field.key] && (
                          <button className="copy-btn" onClick={() => copyToClipboard(formData[field.key])} title="Copy">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
