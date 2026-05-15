'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { href: '/dashboard/finance', label: 'Finance', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { href: '/dashboard/debts', label: 'Debts & Loans', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { href: '/dashboard/accounts', label: 'Accounts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { href: '/dashboard/settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export default function Sidebar({ isOpen, onToggle, onDataChange }) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const confirm = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Logout Session',
      message: 'Are you sure you want to log out? All sensitive data will be locked until you enter your PIN again.',
      confirmText: 'Logout',
      type: 'danger'
    });
    
    if (ok) {
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Overlay to close user menu when clicking outside */}
      {userMenuOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 290 }} 
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      <button className="mobile-toggle btn btn-ghost" onClick={onToggle}
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 200 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ zIndex: 300 }}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">M</div>
          <span className="sidebar-logo-text">Multi Manager</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && onToggle?.()}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer" style={{ position: 'relative' }}>
          {/* User Popup Menu */}
          {userMenuOpen && (
            <div 
              className="animate-slideUp" 
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: '10px',
                right: '10px',
                background: 'rgba(30, 30, 30, 0.98)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                zIndex: 310,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>System Status</div>
                <div style={{ fontSize: '0.85rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ecc71' }}></div>
                  Secure Session Active
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Version</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>v1.2.0-Secure</div>
              </div>

              <button 
                className="btn btn-danger" 
                onClick={handleLogout}
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          )}

          <div 
            className={`sidebar-user ${userMenuOpen ? 'active' : ''}`} 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{ 
              cursor: 'pointer', 
              padding: '10px', 
              borderRadius: '10px', 
              transition: 'background 0.2s',
              background: userMenuOpen ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}
          >
            <div className="sidebar-avatar" style={{ background: userMenuOpen ? 'var(--primary)' : '' }}>A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin</div>
              <div className="sidebar-user-role">Local Mode</div>
            </div>
            <svg style={{ marginLeft: 'auto', opacity: 0.5, transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
          </div>
        </div>
      </aside>
    </>
  );
}
