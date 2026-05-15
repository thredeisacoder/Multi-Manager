'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { migrateEncryptAccounts } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If they already logged in this session, skip
    if (sessionStorage.getItem('auth') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('app_pin');
    
    if (!savedPin) {
      if (pin.length < 4) {
        setError('Please enter at least 4 characters to set your PIN.');
        return;
      }
      localStorage.setItem('app_pin', pin);
      sessionStorage.setItem('auth', 'true');
      // Encrypt existing plaintext accounts with the new PIN
      await migrateEncryptAccounts();
      router.replace('/dashboard');
    } else {
      if (pin === savedPin) {
        sessionStorage.setItem('auth', 'true');
        // Encrypt any remaining plaintext accounts
        await migrateEncryptAccounts();
        router.replace('/dashboard');
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  if (!mounted) return null;

  const isSetup = !localStorage.getItem('app_pin');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: '40px 32px', textAlign: 'center', margin: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div className="sidebar-logo-icon" style={{ width: 64, height: 64, fontSize: '2rem', background: 'transparent' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8, color: 'var(--text-primary)' }}>{isSetup ? 'Welcome to Multi Manager' : 'Welcome Back'}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.9rem' }}>
          {isSetup ? 'Create a secure PIN to protect your financial data offline.' : 'Enter your secure PIN to access your workspace.'}
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <input 
              type="password" 
              className="input" 
              style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.5rem', padding: '16px' }}
              value={pin} 
              onChange={e => { setPin(e.target.value); setError(''); }} 
              placeholder="••••" 
              autoFocus
            />
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>{error}</div>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
            {isSetup ? 'Set PIN & Enter' : 'Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
