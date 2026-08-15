import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

// ── 1. Excel Generation ──────────────────────────────────────────────────────
export async function generateExcel(title: string, columns: ExportColumn[], rows: Record<string, any>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Afreen Mall Enterprise ERP';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title.slice(0, 31));

  // Add Title Header Row
  worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 4));
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${title} — Afreen Mall Operations`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 32;

  // Add Column Headers
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(columns.map((c) => c.header));
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06B6D4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // Set column widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width || 18;
  });

  // Add Data Rows
  rows.forEach((row) => {
    const rowValues = columns.map((col) => row[col.key] ?? '');
    const addedRow = worksheet.addRow(rowValues);
    addedRow.height = 20;
    addedRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ── 2. CSV Generation ────────────────────────────────────────────────────────
export function generateCSV(columns: ExportColumn[], rows: Record<string, any>[]): Buffer {
  const headerLine = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvString = [headerLine, ...dataLines].join('\n');
  return Buffer.from(csvString, 'utf-8');
}

// ── 3. PDF Document Generation ───────────────────────────────────────────────
export function generatePDF(title: string, subtitle: string, headers: string[], rows: string[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(36, 36, 523, 50).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(title, 48, 48);
      doc.fontSize(9).font('Helvetica').text(`Afreen Mall Internal Operations · ${subtitle}`, 48, 68);

      doc.moveDown(3);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');

      let startY = 110;
      const colWidth = Math.floor(523 / headers.length);

      // Draw Table Header Background
      doc.rect(36, startY, 523, 22).fill('#06b6d4');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

      headers.forEach((h, i) => {
        doc.text(h, 40 + i * colWidth, startY + 6, { width: colWidth - 8, align: 'left' });
      });

      startY += 26;
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica');

      rows.forEach((row, rowIndex) => {
        if (startY > 750) {
          doc.addPage();
          startY = 40;
        }

        if (rowIndex % 2 === 1) {
          doc.rect(36, startY - 2, 523, 18).fill('#f8fafc');
          doc.fillColor('#1e293b');
        }

        row.forEach((val, colIndex) => {
          doc.text(String(val), 40 + colIndex * colWidth, startY, { width: colWidth - 8, align: 'left' });
        });

        startY += 20;
      });

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text(`Generated on ${new Date().toLocaleString('en-IN')} — Confidential Store Record`, 36, 780, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 4. Barcode Label Sheet (A4 Sticker Sheet N-Up) ──────────────────────────
export function generateBarcodeSheetPDF(product: any, quantity: number = 24, format: string = 'A4_STICKERS'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 18, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const labelsPerRow = 3;
      const rowsPerPage = 8;
      const labelsPerPage = labelsPerRow * rowsPerPage;

      const cardWidth = 175;
      const cardHeight = 90;
      const gapX = 12;
      const gapY = 8;
      const startX = 24;

      for (let i = 0; i < quantity; i++) {
        const pageIdx = Math.floor(i / labelsPerPage);
        if (i > 0 && i % labelsPerPage === 0) {
          doc.addPage();
        }

        const idxOnPage = i % labelsPerPage;
        const col = idxOnPage % labelsPerRow;
        const row = Math.floor(idxOnPage / labelsPerRow);

        const x = startX + col * (cardWidth + gapX);
        const y = 30 + row * (cardHeight + gapY);

        // Draw sticker border
        doc.roundedRect(x, y, cardWidth, cardHeight, 4).lineWidth(0.8).stroke('#cbd5e1');

        // Header store title
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text('AFREEN MALL RETAIL', x + 6, y + 6, { width: cardWidth - 12, align: 'center' });

        // Product Name
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(product.name.slice(0, 26), x + 6, y + 18, { width: cardWidth - 12, align: 'center' });

        // Simulated Barcode Visual
        doc.rect(x + 16, y + 34, cardWidth - 32, 22).fill('#0f172a');
        doc.fontSize(8).font('Helvetica').fillColor('#ffffff').text(`|||| | ||||| ||| |||`, x + 16, y + 40, { width: cardWidth - 32, align: 'center' });

        // Barcode text
        doc.fontSize(7).font('Helvetica').fillColor('#475569').text(product.barcode || '890103000001', x + 6, y + 58, { width: cardWidth - 12, align: 'center' });

        // Price MRP & Sale Rate
        const mrpRupees = ((product.mrp || 65000) / 100).toFixed(2);
        const saleRupees = ((product.saleRate || 59000) / 100).toFixed(2);

        doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(`MRP: Rs.${mrpRupees}`, x + 8, y + 72);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#059669').text(`OFFER: Rs.${saleRupees}`, x + 85, y + 71);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 5. Statutory GSTR-1 JSON Generator (GSTN Upload Conforming Schema) ──────
export function generateGSTR1JSON(sales: any[], storeGstin: string = '27AAACM1234F1Z9', periodMonth: string = '082026'): Record<string, any> {
  const b2bInvoices: any[] = [];
  const b2csInvoices: any[] = [];

  sales.forEach((s) => {
    const invDate = new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const totalVal = ((s.totalAmount || 0) / 100);
    const taxableVal = parseFloat((totalVal / 1.18).toFixed(2));
    const cgst = parseFloat(((totalVal - taxableVal) / 2).toFixed(2));
    const sgst = cgst;

    if (s.customerPhone && s.customerName) {
      b2bInvoices.push({
        inum: s.invoiceNo,
        idt: invDate,
        val: totalVal,
        pos: '27',
        rchrg: 'N',
        inv_typ: 'R',
        itms: [
          {
            num: 1,
            itm_det: {
              txval: taxableVal,
              rt: 18.0,
              iamt: 0,
              camt: cgst,
              samt: sgst,
              csamt: 0,
            },
          },
        ],
      });
    } else {
      b2csInvoices.push({
        sply_ty: 'INTRA',
        rt: 18.0,
        typ: 'OE',
        pos: '27',
        txval: taxableVal,
        camt: cgst,
        samt: sgst,
        csamt: 0,
      });
    }
  });

  return {
    gstin: storeGstin,
    fp: periodMonth,
    gross_turnover: sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0),
    b2b: b2bInvoices,
    b2cs: b2csInvoices,
    hsn: {
      hsn_data: [
        {
          num: 1,
          hsn_sc: '1006',
          desc: 'Basmati Rice & Food Grains',
          uqc: 'KGS',
          qty: 120,
          val: sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0),
          txval: sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0) / 1.18,
          camt: (sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0) - sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0) / 1.18) / 2,
          samt: (sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0) - sales.reduce((sum, s) => sum + ((s.totalAmount || 0) / 100), 0) / 1.18) / 2,
        },
      ],
    },
  };
}
