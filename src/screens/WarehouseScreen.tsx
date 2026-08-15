import React from 'react';
import { Warehouse as WarehouseIcon, Layers, PackageCheck, ArrowRightLeft } from 'lucide-react';

export const WarehouseScreen: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Warehouse Rack & Bin Location Control
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Rack & Bin assignments, internal stock transfer orders, pick lists, and dispatches
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <WarehouseIcon size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>Main Warehouse (WH-MAIN)</h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Active Racks: <strong>12 Racks</strong> | Total Bins: <strong>48 Bins</strong>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Layers size={20} style={{ color: 'var(--status-green)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>Rack A1 — Fast Moving Goods</h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Bin BIN-A1-01 Capacity: <strong>500 Pcs</strong> (Occupied: 380 Pcs)
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <ArrowRightLeft size={20} style={{ color: 'var(--status-amber)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>Stock Transfer Orders</h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Transfer Order #TO-004: Warehouse Rack-A1 → POS Backroom Shelf-2
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>
          Rack & Bin Inventory Assignments
        </h3>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Bin Code</th>
                <th>Rack Number</th>
                <th>Assigned Product</th>
                <th>Bin Capacity</th>
                <th>Current Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="tabular-nums" style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>BIN-A1-01</td>
                <td>Rack-A1</td>
                <td>Afreen Premium Basmati Rice 5kg</td>
                <td className="tabular-nums">500 PCS</td>
                <td className="tabular-nums">80 PCS</td>
                <td><span style={{ fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-color)', color: 'var(--status-green)' }}>ACTIVE</span></td>
              </tr>
              <tr>
                <td className="tabular-nums" style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>BIN-A1-02</td>
                <td>Rack-A1</td>
                <td>Britannia Good Day Biscuits 200g</td>
                <td className="tabular-nums">1000 PCS</td>
                <td className="tabular-nums">12 PCS</td>
                <td><span style={{ fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-color)', color: 'var(--status-red)' }}>REFILL NEEDED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
