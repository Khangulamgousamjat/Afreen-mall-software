import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/catalog/products - List products
router.get('/products', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        unit: true,
        taxRate: true,
        hsnCode: true,
        inventory: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ products });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// GET /api/v1/catalog/categories - List categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

import { generateBarcodeSheetPDF } from '../../services/exportService.js';

// POST /api/v1/catalog/barcodes/pdf - Generate Downloadable Barcode Label Sheet PDF (A4 / Thermal)
router.post('/barcodes/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, quantity = 24, labelFormat = 'A4_STICKERS' } = req.body;

    let product: any = null;
    if (productId) {
      product = await prisma.product.findUnique({ where: { id: productId } });
    }

    if (!product) {
      product = {
        name: 'Afreen Premium Basmati Rice 5kg',
        barcode: '890103000001',
        mrp: 65000,
        saleRate: 59000,
      };
    }

    const pdfBuffer = await generateBarcodeSheetPDF(product, parseInt(String(quantity), 10) || 24, labelFormat);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="barcode_labels_${product.barcode || 'sheet'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Barcode PDF error:', err);
    return res.status(500).json({ error: 'Failed to generate barcode label PDF' });
  }
});

export default router;
