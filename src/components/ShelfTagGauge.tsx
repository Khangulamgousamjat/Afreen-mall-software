import React from 'react';

interface ShelfTagGaugeProps {
  currentStock: number;
  minStockLevel: number;
  serverGaugeColor?: string;
  serverStockRatio?: number;
}

export const ShelfTagGauge: React.FC<ShelfTagGaugeProps> = ({
  currentStock,
  minStockLevel,
  serverGaugeColor,
  serverStockRatio,
}) => {
  const percentage = serverStockRatio ?? Math.min(100, Math.round((currentStock / (minStockLevel || 10)) * 100));

  let colorClass = serverGaugeColor;
  if (!colorClass) {
    if (percentage < 50) colorClass = 'red';
    else if (percentage < 100) colorClass = 'amber';
    else colorClass = 'green';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Stock: {currentStock}</span>
        <span>Min: {minStockLevel}</span>
      </div>
      <div className="shelf-tag-gauge">
        <div className={`shelf-tag-fill ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
};
