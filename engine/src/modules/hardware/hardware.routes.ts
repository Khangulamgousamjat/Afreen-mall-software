import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/hardware/status - Peripheral devices status
router.get('/status', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    status: {
      barcodeScannerConnected: true,
      edcTerminalConnected: true,
      edcStatus: 'IDLE',
      thermalPrinterConnected: true,
      upiProviderReady: true,
    },
  });
});

// POST /api/v1/hardware/upi-qr - Generate dynamic UPI QR string for bill amount
router.post('/upi-qr', (req: AuthenticatedRequest, res: Response) => {
  const { amountInPaise, invoiceNo } = req.body;
  const amountInRupees = ((amountInPaise || 1000) / 100).toFixed(2);
  const upiString = `upi://pay?pa=afreenmall@upi&pn=Afreen%20Mall&am=${amountInRupees}&cu=INR&tn=Invoice%20${invoiceNo || 'INV-001'}`;

  return res.json({
    upiString,
    qrCodeDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`,
    amountInRupees,
  });
});

export default router;
