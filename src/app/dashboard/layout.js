'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import Sidebar from '@/components/ui/Sidebar';
import { migrateEncryptAccounts, fixTransactionMonths } from '@/lib/store';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem('auth') !== 'true') {
      router.replace('/');
      return;
    }
    // Run encryption migration once per session
    if (!sessionStorage.getItem('encryption_migrated')) {
      migrateEncryptAccounts().then(() => {
        sessionStorage.setItem('encryption_migrated', 'true');
      });
    }
    // Fix any transactions saved under wrong month records
    if (!sessionStorage.getItem('tx_months_fixed')) {
      fixTransactionMonths();
      sessionStorage.setItem('tx_months_fixed', 'true');
    }
  }, [router, pathname]);

  if (!mounted) return null;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          {children}
        </main>
      </ConfirmProvider>
    </ToastProvider>
  );
}
