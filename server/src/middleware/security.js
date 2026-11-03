import { config } from '../config.js';

export function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  // Non-browser clients may omit Origin; browser requests must match the configured origin.
  if (origin && !config.clientOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }
  next();
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error(err);
  const status = Number(err.status) || 500;
  res.status(status).json({
    error: status >= 500 ? 'An unexpected server error occurred.' : err.message
  });
}
