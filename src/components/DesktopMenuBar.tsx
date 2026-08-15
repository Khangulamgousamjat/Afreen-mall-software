import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundService } from '../services/soundService';
import { printReceiptNatively } from '../services/desktopService';

interface DesktopMenuBarProps {
  onNavigate?: (screen: string) => void;
  onOpenModal?: (modalName: string) => void;
}

export const DesktopMenuBar: React.FC<DesktopMenuBarProps> = ({ onNavigate, onOpenModal }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleAction = (callback: () => void) => {
    setActiveMenu(null);
    callback();
  };

  const testHardware = (type: 'beep' | 'drawer' | 'printer') => {
    if (type === 'beep') {
      soundService.playScannerBeep();
    } else if (type === 'drawer') {
      soundService.playCashDrawerChime();
    } else if (type === 'printer') {
      printReceiptNatively(
        '========================================\n' +
        '       AFREEN MALL ENTERPRISE v1.0      \n' +
        '         HARDWARE TEST PRINT            \n' +
        '========================================\n' +
        'Printer: 80mm ESC/POS Thermal Interface \n' +
        `Date: ${new Date().toLocaleString()}    \n` +
        'Status: OPERATIONAL                     \n' +
        '========================================\n' +
        '    *** TEST COMPLETED SUCCESSFULLY *** \n' +
        '========================================\n\n\n\n'
      );
    }
  };

  return (
    <div
      ref={menuBarRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--surface-color)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '12px',
        fontWeight: '500',
        padding: '0 8px',
        height: '28px',
        userSelect: 'none',
        position: 'relative',
        zIndex: 9999,
      }}
    >
      {/* File Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('file')}
          style={{
            background: activeMenu === 'file' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>F</span>ile
        </button>
        {activeMenu === 'file' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('pos'))}>
              <span>New POS Sale</span>
              <span style={shortcutStyle}>Ctrl+1</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('backup'))}>
              <span>Database Backup & Restore</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => toggleTheme())}>
              <span>Toggle Theme ({theme === 'dark' ? 'Light' : 'Dark'})</span>
            </div>
            <div style={dividerStyle} />
            <div style={menuItemStyle} onClick={() => handleAction(() => logout())}>
              <span>Lock Terminal / Logout</span>
              <span style={shortcutStyle}>Ctrl+L</span>
            </div>
          </div>
        )}
      </div>

      {/* POS Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('pos')}
          style={{
            background: activeMenu === 'pos' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>P</span>OS Counter
        </button>
        {activeMenu === 'pos' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('pos'))}>
              <span>Open Billing Register</span>
              <span style={shortcutStyle}>Ctrl+1</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('heldBills'))}>
              <span>Held Bills / Cross-Counter Recall</span>
              <span style={shortcutStyle}>F4</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('priceChecker'))}>
              <span>Instant Price Checker</span>
              <span style={shortcutStyle}>F2</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('customerLookup'))}>
              <span>Customer Loyalty Lookup</span>
              <span style={shortcutStyle}>F3</span>
            </div>
            <div style={dividerStyle} />
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('reprint'))}>
              <span>Duplicate Bill Reprint</span>
              <span style={shortcutStyle}>F8</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('voidBill'))}>
              <span>Void Invoice (Manager PIN)</span>
              <span style={shortcutStyle}>F9</span>
            </div>
            <div style={dividerStyle} />
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('cash'))}>
              <span>Cashier Day Close / Handover</span>
              <span style={shortcutStyle}>F12</span>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('inv')}
          style={{
            background: activeMenu === 'inv' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>I</span>nventory
        </button>
        {activeMenu === 'inv' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('inventory'))}>
              <span>Product Master & Stock Gauges</span>
              <span style={shortcutStyle}>Ctrl+3</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('addProduct'))}>
              <span>Add New Catalog SKU</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('transferStock'))}>
              <span>Inter-Warehouse Stock Transfer</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('repack'))}>
              <span>Bulk-to-Retail Repacking Assembly</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('warehouse'))}>
              <span>Warehouse Layout (Racks & Bins)</span>
            </div>
          </div>
        )}
      </div>

      {/* Purchasing Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('pur')}
          style={{
            background: activeMenu === 'pur' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>P</span>urchasing
        </button>
        {activeMenu === 'pur' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('purchasing'))}>
              <span>Purchase Orders & GRN Receiving</span>
              <span style={shortcutStyle}>Ctrl+4</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('createPO'))}>
              <span>Create Purchase Order</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('suppliers'))}>
              <span>Vendor Directory & AP Payables</span>
            </div>
          </div>
        )}
      </div>

      {/* Accounts Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('acc')}
          style={{
            background: activeMenu === 'acc' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>A</span>ccounts
        </button>
        {activeMenu === 'acc' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('accounting'))}>
              <span>General Ledger & Financial Statements</span>
              <span style={shortcutStyle}>Ctrl+5</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('postJournal'))}>
              <span>Post Double-Entry Journal</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('gst'))}>
              <span>GST Compliance & GSTR-1 Portal</span>
            </div>
          </div>
        )}
      </div>

      {/* HRMS Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('hrms')}
          style={{
            background: activeMenu === 'hrms' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>H</span>RMS
        </button>
        {activeMenu === 'hrms' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('hrms'))}>
              <span>Employee Directory & Payroll</span>
              <span style={shortcutStyle}>Ctrl+6</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('punchAttendance'))}>
              <span>Punch Biometric / PIN Attendance</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('runPayroll'))}>
              <span>Run Monthly Payroll Batch</span>
            </div>
          </div>
        )}
      </div>

      {/* Hardware Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('hw')}
          style={{
            background: activeMenu === 'hw' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>H</span>ardware
        </button>
        {activeMenu === 'hw' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => testHardware('beep'))}>
              <span>Test Scanner Audio Beep</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => testHardware('drawer'))}>
              <span>Test Cash Drawer Kick Bell</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => testHardware('printer'))}>
              <span>Test Thermal POS Receipt Print</span>
            </div>
          </div>
        )}
      </div>

      {/* Reports Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('rep')}
          style={{
            background: activeMenu === 'rep' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>R</span>eports
        </button>
        {activeMenu === 'rep' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('reports'))}>
              <span>Store Intelligence & KPI Exports</span>
              <span style={shortcutStyle}>Ctrl+8</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('dashboard'))}>
              <span>Executive Dashboard</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('adm')}
          style={{
            background: activeMenu === 'adm' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>T</span>ools & Admin
        </button>
        {activeMenu === 'adm' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onNavigate?.('admin'))}>
              <span>Security & User Access Control</span>
              <span style={shortcutStyle}>Ctrl+9</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('rolePerms'))}>
              <span>20-Role Permission Matrix</span>
            </div>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('backup'))}>
              <span>Database Backup & RESTORE</span>
            </div>
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleMenuClick('help')}
          style={{
            background: activeMenu === 'help' ? 'var(--bg-color)' : 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '3px',
          }}
        >
          <span style={{ textDecoration: 'underline' }}>H</span>elp
        </button>
        {activeMenu === 'help' && (
          <div style={dropdownStyle}>
            <div style={menuItemStyle} onClick={() => handleAction(() => onOpenModal?.('shortcuts'))}>
              <span>Keyboard Shortcuts Reference</span>
              <span style={shortcutStyle}>F1</span>
            </div>
            <div style={dividerStyle} />
            <div style={menuItemStyle} onClick={() => handleAction(() => alert('AFREEN MALL — Internal Operations Platform\nVersion: 1.0.0 (Enterprise Desktop Edition)\nEnvironment: Windows Native Runtime\nDB: PostgreSQL + Prisma ORM'))}>
              <span>About Afreen Mall Software</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  backgroundColor: 'var(--surface-color)',
  border: '1px solid var(--border-color)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  borderRadius: '4px',
  minWidth: '240px',
  padding: '4px 0',
  zIndex: 10000,
};

const menuItemStyle: React.CSSProperties = {
  padding: '6px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  color: 'var(--text-main)',
  fontSize: '12px',
  transition: 'background-color 0.1s',
};

const shortcutStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
  fontFamily: 'monospace',
  marginLeft: '16px',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: 'var(--border-color)',
  margin: '4px 0',
};
