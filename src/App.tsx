import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DesktopMenuBar } from './components/DesktopMenuBar';
import { DesktopStatusBar } from './components/DesktopStatusBar';
import { PasswordChangeModal } from './components/PasswordChangeModal';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { POSScreen } from './screens/POSScreen';
import { DayCloseScreen } from './screens/DayCloseScreen';
import { CashReconciliationScreen } from './screens/CashReconciliationScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { PurchasingScreen } from './screens/PurchasingScreen';
import { WarehouseScreen } from './screens/WarehouseScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SalesScreen } from './screens/SalesScreen';
import { SupplierScreen } from './screens/SupplierScreen';
import { AccountingScreen } from './screens/AccountingScreen';
import { HRMSScreen } from './screens/HRMSScreen';
import { SystemAdminScreen } from './screens/SystemAdminScreen';
import { BusinessIntelligenceScreen } from './screens/BusinessIntelligenceScreen';

import { SecurityGuard } from './components/SecurityGuard';
import { ErrorBoundary } from './components/ErrorBoundary';

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [authView, setAuthView] = useState<'WELCOME' | 'LOGIN'>('WELCOME');
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  // Global Desktop Keyboard Shortcuts (Ctrl+1..9, Ctrl+S, etc.)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setCurrentScreen('pos'); }
        else if (e.key === '2') { e.preventDefault(); setCurrentScreen('cash'); }
        else if (e.key === '3') { e.preventDefault(); setCurrentScreen('inventory'); }
        else if (e.key === '4') { e.preventDefault(); setCurrentScreen('purchasing'); }
        else if (e.key === '5') { e.preventDefault(); setCurrentScreen('accounting'); }
        else if (e.key === '6') { e.preventDefault(); setCurrentScreen('hrms'); }
        else if (e.key === '7') { e.preventDefault(); setCurrentScreen('customers'); }
        else if (e.key === '8') { e.preventDefault(); setCurrentScreen('reports'); }
        else if (e.key === '9') { e.preventDefault(); setCurrentScreen('admin'); }
        else if (e.key === '0') { e.preventDefault(); setCurrentScreen('dashboard'); }
        else if (e.key === 's' || e.key === 'S') { e.preventDefault(); setCurrentScreen('settings'); }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  if (!user) {
    if (authView === 'LOGIN') {
      return (
        <SecurityGuard>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <DesktopMenuBar onNavigate={setCurrentScreen} />
            <div style={{ flex: 1, overflow: 'auto' }}>
              <LoginScreen
                onBackToWelcome={() => setAuthView('WELCOME')}
                onLoginSuccess={() => setCurrentScreen('dashboard')}
              />
            </div>
            <DesktopStatusBar />
          </div>
        </SecurityGuard>
      );
    }
    return (
      <SecurityGuard>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          <DesktopMenuBar onNavigate={setCurrentScreen} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <WelcomeScreen onGoToLogin={() => setAuthView('LOGIN')} />
          </div>
          <DesktopStatusBar />
        </div>
      </SecurityGuard>
    );
  }

  return (
    <SecurityGuard>
      <ErrorBoundary fallbackTitle="Application Layout Error">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {/* Windows Desktop Enterprise Menu Bar */}
          <DesktopMenuBar onNavigate={setCurrentScreen} />

          {/* Main App Workspace */}
          <div className="app-container" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />

            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Topbar />
              <main className="page-content" style={{ flex: 1, overflow: 'auto' }}>
                <ErrorBoundary fallbackTitle="Screen Component Error">
                  {currentScreen === 'dashboard' && <DashboardScreen onNavigate={setCurrentScreen} />}
                  {currentScreen === 'pos' && <POSScreen initialReturnMode={false} />}
                  {currentScreen === 'pos-return' && <POSScreen initialReturnMode={true} />}
                  {currentScreen === 'dayclose' && <DayCloseScreen />}
                  {currentScreen === 'cash' && <CashReconciliationScreen />}
                  {currentScreen === 'inventory' && <InventoryScreen />}
                  {currentScreen === 'purchasing' && <PurchasingScreen />}
                  {currentScreen === 'suppliers' && <SupplierScreen />}
                  {currentScreen === 'accounting' && <AccountingScreen />}
                  {currentScreen === 'hrms' && <HRMSScreen />}
                  {currentScreen === 'sales' && <SalesScreen />}
                  {currentScreen === 'warehouse' && <WarehouseScreen />}
                  {currentScreen === 'customers' && <CustomersScreen />}
                  {currentScreen === 'reports' && <ReportsScreen />}
                  {currentScreen === 'bi' && <BusinessIntelligenceScreen />}
                  {currentScreen === 'settings' && <SettingsScreen />}
                  {currentScreen === 'admin' && <SystemAdminScreen />}
                </ErrorBoundary>
              </main>
            </div>

            {/* Force Password Change Modal on first login */}
            <PasswordChangeModal />
          </div>

          {/* Windows Desktop Bottom Status Bar */}
          <DesktopStatusBar />
        </div>
      </ErrorBoundary>
    </SecurityGuard>
  );
};
