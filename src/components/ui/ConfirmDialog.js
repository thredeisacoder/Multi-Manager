'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger' });

  const confirm = useCallback(({ title, message, variant = 'danger' }) => {
    return new Promise((resolve) => {
      setState({ isOpen: true, title, message, variant, onConfirm: resolve });
    });
  }, []);

  const handleConfirm = () => { state.onConfirm?.(true); setState(s => ({ ...s, isOpen: false })); };
  const handleCancel = () => { state.onConfirm?.(false); setState(s => ({ ...s, isOpen: false })); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && (
        <div className="modal-overlay active" onClick={handleCancel}>
          <div className="modal confirm-dialog animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="confirm-icon" data-variant={state.variant}>
              {state.variant === 'danger' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
            </div>
            <h3 className="confirm-title">{state.title || 'Confirm'}</h3>
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className={`btn ${state.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm}>
                {state.variant === 'danger' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
