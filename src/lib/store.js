'use client';

import { v4 as uuidv4 } from 'uuid';
import { encryptAccountData, decryptAccountData, getPin, isSensitiveField, encrypt, verifyMasterKey, MASTER_CHECK_KEY } from './crypto';

const STORAGE_KEY = 'multi_manager_data';

function getDefaultData() {
  return {
    platforms: [],
    accounts: [],
    finance_segments: [],
    finance_records: [],
    wallets: [],
    debts: [],
    transactions: [],
  };
}

function load() {
  if (typeof window === 'undefined') return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultData();
  } catch { return getDefaultData(); }
}

function save(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// =================== CLEANUP ===================
// Removes finance_records whose segment no longer exists. Call on app init.
export function cleanupOrphanedRecords() {
  const data = load();
  const validSegIds = new Set((data.finance_segments || []).map(s => s.id));
  const before = (data.finance_records || []).length;
  data.finance_records = (data.finance_records || []).filter(r => validSegIds.has(r.segment_id));
  if (data.finance_records.length !== before) save(data);
}

// =================== PLATFORMS ===================
export function getPlatforms() { return load().platforms; }

export function addPlatform(platform) {
  const data = load();
  const p = { id: uuidv4(), ...platform, created_at: new Date().toISOString() };
  data.platforms.push(p);
  save(data);
  return p;
}

export function deletePlatform(id) {
  const data = load();
  data.platforms = data.platforms.filter(p => p.id !== id);
  data.accounts = data.accounts.filter(a => a.platform_id !== id);
  save(data);
}

// =================== ACCOUNTS ===================
export function getAccounts() { return load().accounts; }

// Get accounts with decrypted sensitive fields (async)
export async function getAccountsDecrypted() {
  const pin = getPin();
  const data = load();
  const accounts = data.accounts || [];
  if (!pin || accounts.length === 0) return accounts;
  
  // PRE-FLIGHT CHECK: Verify PIN against master check
  if (data[MASTER_CHECK_KEY]) {
    const isPinCorrect = await verifyMasterKey(data[MASTER_CHECK_KEY], pin);
    if (!isPinCorrect) {
      console.warn('[Crypto] PIN is incorrect for this data. Skipping decryption.');
      // Return accounts with a special flag so UI can show a warning if needed
      return accounts.map(a => ({ ...a, _decryption_failed: true }));
    }
  }

  return Promise.all(accounts.map(async (a) => {
    return { ...a, data: await decryptAccountData(a.data, pin) };
  }));
}

// Get single account decrypted (async)
export async function getAccountDecrypted(id) {
  const pin = getPin();
  const account = load().accounts.find(a => a.id === id);
  if (!account) return null;
  if (!pin) return account;
  return { ...account, data: await decryptAccountData(account.data, pin) };
}

export async function addAccount(account) {
  const data = load();
  const pin = getPin();
  const encryptedData = pin ? await encryptAccountData(account.data, pin) : account.data;
  const a = { id: uuidv4(), ...account, data: encryptedData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.accounts.push(a);
  save(data);
  return a;
}

export async function updateAccount(id, updates) {
  const data = load();
  const pin = getPin();
  if (updates.data && pin) {
    updates.data = await encryptAccountData(updates.data, pin);
  }
  data.accounts = data.accounts.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a);
  save(data);
}

export function deleteAccount(id) {
  const data = load();
  data.accounts = data.accounts.filter(a => a.id !== id);
  save(data);
}

// =================== FINANCE SEGMENTS ===================
export function getSegments() { return load().finance_segments; }

export function addSegment(segment) {
  const data = load();
  const s = { id: uuidv4(), ...segment, created_at: new Date().toISOString() };
  data.finance_segments.push(s);
  save(data);
  return s;
}

export function updateSegment(id, updates) {
  const data = load();
  data.finance_segments = data.finance_segments.map(s => s.id === id ? { ...s, ...updates } : s);
  save(data);
}

export function deleteSegment(id) {
  const data = load();
  data.finance_segments = data.finance_segments.filter(s => s.id !== id);
  data.finance_records = data.finance_records.filter(r => r.segment_id !== id);
  save(data);
}

// =================== WALLETS ===================
export function getWallets() { return load().wallets || []; }

export function addWallet(wallet) {
  const data = load();
  if (!data.wallets) data.wallets = [];
  const w = { id: uuidv4(), ...wallet, created_at: new Date().toISOString() };
  data.wallets.push(w);
  save(data);
  return w;
}

export function updateWallet(id, payload) {
  const data = load();
  const idx = data.wallets.findIndex(w => w.id === id);
  if (idx !== -1) {
    data.wallets[idx] = { ...data.wallets[idx], ...payload, updated_at: new Date().toISOString() };
    save(data);
  }
}

export function deleteWallet(id) {
  const data = load();
  data.wallets = data.wallets.filter(w => w.id !== id);
  save(data);
}

// =================== DEBTS ===================
export function getDebts() { return load().debts || []; }

export function addDebt(debt) {
  const data = load();
  if (!data.debts) data.debts = [];
  const d = { id: uuidv4(), ...debt, created_at: new Date().toISOString() };
  data.debts.push(d);
  save(data);
  return d;
}

export function updateDebt(id, payload) {
  const data = load();
  const idx = data.debts.findIndex(d => d.id === id);
  if (idx !== -1) {
    data.debts[idx] = { ...data.debts[idx], ...payload, updated_at: new Date().toISOString() };
    save(data);
  }
}

export function deleteDebt(id) {
  const data = load();
  data.debts = data.debts.filter(d => d.id !== id);
  // Also delete related transactions
  data.transactions = (data.transactions || []).filter(t => t.debt_id !== id);
  save(data);
}

// =================== TRANSACTIONS ===================
export function getTransactions() { return load().transactions || []; }

export function addTransaction(transaction) {
  const data = load();
  if (!data.transactions) data.transactions = [];
  const t = { id: uuidv4(), ...transaction, created_at: new Date().toISOString() };
  data.transactions.push(t);
  
  // Update wallet balance if applicable
  if (t.wallet_id && data.wallets) {
    const wIdx = data.wallets.findIndex(w => w.id === t.wallet_id);
    if (wIdx !== -1) {
      if (t.type === 'income' || t.type === 'borrow') {
        data.wallets[wIdx].balance += t.amount;
      } else if (t.type === 'expense' || t.type === 'repay_principal' || t.type === 'repay_interest') {
        data.wallets[wIdx].balance -= t.amount;
      }
    }
  }

  // Update debt balance if applicable
  if (t.debt_id && data.debts) {
    const dIdx = data.debts.findIndex(d => d.id === t.debt_id);
    if (dIdx !== -1) {
      if (t.type === 'borrow') {
        data.debts[dIdx].remaining += t.amount;
        data.debts[dIdx].principal += t.amount;
      } else if (t.type === 'repay_principal') {
        data.debts[dIdx].remaining -= t.amount;
      } else if (t.type === 'repay_interest') {
        data.debts[dIdx].interest_paid = (data.debts[dIdx].interest_paid || 0) + t.amount;
      }
    }
  }

  save(data);
  return t;
}

export function deleteTransaction(id) {
  const data = load();
  if (!data.transactions) return;
  const tIdx = data.transactions.findIndex(t => t.id === id);
  if (tIdx === -1) return;
  const t = data.transactions[tIdx];
  
  // Revert wallet
  if (t.wallet_id && data.wallets) {
    const wIdx = data.wallets.findIndex(w => w.id === t.wallet_id);
    if (wIdx !== -1) {
      if (t.type === 'income' || t.type === 'borrow') {
        data.wallets[wIdx].balance -= t.amount;
      } else if (t.type === 'expense' || t.type === 'repay_principal' || t.type === 'repay_interest') {
        data.wallets[wIdx].balance += t.amount;
      }
    }
  }

  // Revert debt
  if (t.debt_id && data.debts) {
    const dIdx = data.debts.findIndex(d => d.id === t.debt_id);
    if (dIdx !== -1) {
      if (t.type === 'borrow') {
        data.debts[dIdx].remaining -= t.amount;
        data.debts[dIdx].principal -= t.amount;
      } else if (t.type === 'repay_principal') {
        data.debts[dIdx].remaining += t.amount;
      } else if (t.type === 'repay_interest') {
        data.debts[dIdx].interest_paid -= t.amount;
      }
    }
  }

  data.transactions.splice(tIdx, 1);
  save(data);
}

// =================== FINANCE RECORDS ===================
export function getRecords(segmentId) {
  return load().finance_records.filter(r => r.segment_id === segmentId);
}

export function getAllRecords() { return load().finance_records; }

export function getRecord(segmentId, month) {
  return load().finance_records.find(r => r.segment_id === segmentId && r.month === month) || null;
}

export function upsertRecord(segmentId, month, values, note) {
  const data = load();
  const idx = data.finance_records.findIndex(r => r.segment_id === segmentId && r.month === month);
  if (idx >= 0) {
    data.finance_records[idx] = { ...data.finance_records[idx], values, note, updated_at: new Date().toISOString() };
  } else {
    data.finance_records.push({ id: uuidv4(), segment_id: segmentId, month, values, note, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  save(data);
}

// =================== MIGRATION: Encrypt existing plaintext accounts ===================
export async function migrateEncryptAccounts() {
  const pin = getPin();
  if (!pin) { console.log('[Crypto] No PIN found, skipping migration'); return; }
  const data = load();
  let changed = false;

  // Ensure Master Check exists
  if (!data[MASTER_CHECK_KEY]) {
    data[MASTER_CHECK_KEY] = await encrypt('OK', pin);
    changed = true;
  }

  let encryptedCount = 0;
  for (let i = 0; i < data.accounts.length; i++) {
    const acc = data.accounts[i];
    if (!acc.data) continue;
    // Check if any sensitive field is still plaintext (not starting with 'ENC:')
    const plaintextFields = Object.entries(acc.data).filter(([key, val]) => {
      if (typeof val !== 'string') return false;
      if (val === '' || val === 'None') return false;
      return !val.startsWith('ENC:') && isSensitiveField(key);
    });
    if (plaintextFields.length > 0) {
      console.log(`[Crypto] Encrypting account ${i + 1}/${data.accounts.length}: ${plaintextFields.length} plaintext fields found (${plaintextFields.map(([k]) => k).join(', ')})`);
      data.accounts[i].data = await encryptAccountData(acc.data, pin);
      changed = true;
      encryptedCount++;
    }
  }
  if (changed) {
    save(data);
    console.log(`[Crypto] Migration complete: ${encryptedCount} account(s) encrypted`);
  } else {
    console.log(`[Crypto] All ${data.accounts.length} account(s) already encrypted or no sensitive data`);
  }
}

// =================== PIN MANAGEMENT ===================
export async function changePin(oldPin, newPin) {
  const data = load();
  
  // 1. Verify old PIN against master check
  if (data[MASTER_CHECK_KEY]) {
    const isOldPinCorrect = await verifyMasterKey(data[MASTER_CHECK_KEY], oldPin);
    if (!isOldPinCorrect) throw new Error('Old PIN is incorrect');
  }

  // 2. Re-encrypt all accounts
  const updatedAccounts = await Promise.all((data.accounts || []).map(async (acc) => {
    if (!acc.data) return acc;
    // Decrypt with old PIN
    const decryptedData = await decryptAccountData(acc.data, oldPin);
    // Re-encrypt with new PIN
    const reEncryptedData = await encryptAccountData(decryptedData, newPin);
    return { ...acc, data: reEncryptedData };
  }));

  // 3. Update data object
  data.accounts = updatedAccounts;
  data[MASTER_CHECK_KEY] = await encrypt('OK', newPin); // New canary
  
  // 4. Save to localStorage
  save(data);
  localStorage.setItem('app_pin', newPin);
  
  return true;
}

// =================== IMPORT / EXPORT ===================
// NOTE: Exported data contains ENCRYPTED sensitive fields.
// The file is safe to store/share — fields can only be decrypted with the correct PIN.
export async function exportAllData() {
  // Always load fresh data from localStorage to ensure we get the encrypted state
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    throw new Error('No data found to export');
  }
  
  const response = await fetch('/api/export-telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: raw,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send backup to Telegram');
  }

  return await response.json();
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.platforms && !imported.accounts && !imported.finance_segments) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        // Save the imported data directly. 
        // If it was encrypted, it stays encrypted. 
        // Decryption will happen via getAccountsDecrypted() using the current PIN.
        save(imported);
        resolve(imported);
      } catch (err) { reject(new Error('Failed to parse backup file')); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Seed default platforms
export function seedPlatforms(platformTemplates) {
  const data = load();
  for (const [, plat] of Object.entries(platformTemplates)) {
    if (!data.platforms.find(p => p.slug === plat.slug)) {
      data.platforms.push({
        id: uuidv4(), name: plat.name, slug: plat.slug,
        color: plat.color, icon: plat.icon, field_schema: plat.fieldSchema,
        created_at: new Date().toISOString(),
      });
    }
  }
  save(data);
  return data.platforms;
}
