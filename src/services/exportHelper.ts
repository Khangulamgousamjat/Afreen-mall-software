/**
 * Universal Zero-Fail Export & Web Print Utility for Afreen Mall Platform
 * Supports: Excel (.xlsx), PDF (.pdf), CSV (.csv), and Web Direct Print window.
 */

export interface ReportExportData {
  title: string;
  subtitle: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

// ── 1. Web Direct Print Preview Window (Opens in Web without download & prints) ──
export function printWebReport(data: ReportExportData): void {
  const printWindow = window.open('', '_blank', 'width=950,height=750');
  if (!printWindow) {
    alert('Popup blocked! Please allow popups for this site to enable printing.');
    return;
  }

  const tableHeadersHtml = data.headers
    .map(
      (h) =>
        `<th style="border: 1px solid #cbd5e1; padding: 10px 12px; background: #0f172a; color: #ffffff; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${h}</th>`
    )
    .join('');

  const tableRowsHtml = data.rows
    .map(
      (row, idx) =>
        `<tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
          ${row
            .map(
              (cell) =>
                `<td style="padding: 9px 12px; font-size: 11px; color: #1e293b; font-family: 'Segoe UI', Tahoma, sans-serif;">${cell}</td>`
            )
            .join('')}
        </tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${data.title} — Afreen Mall Operations</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #ffffff; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
          .brand-title { font-size: 22px; font-weight: bold; color: #0f172a; letter-spacing: 1px; }
          .brand-sub { font-size: 11px; color: #10b981; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
          .meta-box { font-size: 11px; color: #475569; text-align: right; line-height: 1.5; }
          .action-bar { display: flex; gap: 10px; margin-bottom: 20px; }
          .btn-print { background: #10b981; color: #ffffff; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
          .btn-close { background: #64748b; color: #ffffff; border: none; padding: 10px 16px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer-note { margin-top: 36px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="action-bar no-print">
          <button class="btn-print" onclick="window.print()">🖨️ PRINT REPORT NOW</button>
          <button class="btn-close" onclick="window.close()">Close Window</button>
        </div>

        <div class="header-container">
          <div>
            <div class="brand-title">AFREEN MALL</div>
            <div class="brand-sub">Internal Operations Platform · ${data.subtitle}</div>
          </div>
          <div class="meta-box">
            <div><strong>Report Title:</strong> ${data.title}</div>
            <div><strong>Generated Date:</strong> ${new Date().toLocaleString('en-IN')}</div>
            <div><strong>Store ID:</strong> AFREEN-001 (Main Commercial Hub)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-note">
          <span>Strictly Internal Confidential Record · Afreen Mall ERP Platform</span>
          <span>Software Architect: Gous Khan (+91 8625076618)</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

// ── 2. Download Excel (.xlsx / .xls spreadsheet format) ──────────────────────
export function downloadExcelReport(data: ReportExportData): void {
  const tableHeadersHtml = data.headers
    .map((h) => `<th style="background-color: #06b6d4; color: #ffffff; font-weight: bold; border: 1px solid #cccccc; padding: 6px;">${h}</th>`)
    .join('');

  const tableRowsHtml = data.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="border: 1px solid #cccccc; padding: 5px;">${cell}</td>`).join('')}</tr>`
    )
    .join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${data.title.slice(0, 30)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>${data.title} — Afreen Mall Operations</h2>
        <h4>${data.subtitle} | Date: ${new Date().toLocaleString('en-IN')}</h4>
        <table border="1">
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + excelTemplate], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', data.filename.endsWith('.xlsx') ? data.filename : `${data.filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ── 3. Download PDF Report Document ──────────────────────────────────────────
export function downloadPDFReport(data: ReportExportData): void {
  // Generate structured HTML-PDF blob
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 20px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 9pt; color: #64748b; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #0f172a; color: white; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 9pt; }
          td { border: 1px solid #cbd5e1; padding: 7px; font-size: 8.5pt; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 20px; font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">AFREEN MALL — ${data.title}</div>
          <div class="subtitle">${data.subtitle} · Date: ${new Date().toLocaleString('en-IN')}</div>
        </div>
        <table>
          <thead>
            <tr>${data.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">Confidential Internal Store Report · Afreen Mall Platform</div>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', data.filename.endsWith('.pdf') ? data.filename : `${data.filename}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ── 4. Download CSV Data File ────────────────────────────────────────────────
export function downloadCSVReport(data: ReportExportData): void {
  const headerLine = data.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
  const rowLines = data.rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );

  const csvString = [headerLine, ...rowLines].join('\n');
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', data.filename.endsWith('.csv') ? data.filename : `${data.filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
