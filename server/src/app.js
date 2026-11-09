import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import accountRecoveryRoutes from './routes/account-recovery.js';
import uploadRoutes from './routes/uploads.js';
import paymentRoutes from './routes/payments.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import sellerRoutes from './routes/seller.js';
import adminRoutes from './routes/admin.js';
import reviewRoutes from './routes/reviews.js';
import supportRoutes from './routes/support.js';
import medicineRoutes from './routes/medicines.js';
import medicineCatalogueRoutes from './routes/medicine-catalogue.js';
import pharmacistRoutes from './routes/pharmacist.js';
import { originGuard, notFound, errorHandler } from './middleware/security.js';

export function createApp() {
  const app = express();
  // Render runs the app behind one trusted reverse proxy.
  // Trust only that proxy hop so express-rate-limit can read the client IP safely.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originGuard);

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
  // Liveness: confirms that the Node.js process is responding.
  app.get('/api/health', (req,res) => res.json({ status: 'ok', service: 'wyrmora-api' }));
  // Readiness: confirms that the API can reach PostgreSQL before it receives traffic.
  app.get('/api/health/ready', async (req,res) => {
    try {
      await pool.query('SELECT 1');
      return res.json({ status: 'ok', service: 'wyrmora-api', database: 'ok' });
    } catch {
      return res.status(503).json({ status: 'unavailable', service: 'wyrmora-api', database: 'unavailable' });
    }
  });
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/account', authLimiter, accountRecoveryRoutes);
  app.use('/api/uploads', authLimiter, uploadRoutes);
  app.use('/api/payments', authLimiter, paymentRoutes);
  app.use('/api/medicines', medicineRoutes);
  app.use('/api/medicine-catalogue', medicineCatalogueRoutes);
  app.use('/api/pharmacist', pharmacistRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api/support', supportRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
