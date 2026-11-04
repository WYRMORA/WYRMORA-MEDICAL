import { config } from '../config.js';

export function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  // This API authenticates browser mutations with an HttpOnly session cookie.
  // Require an explicit allowlisted Origin on every state-changing request so
  // requests with a missing Origin cannot bypass the browser-origin check.
  if (!origin || !config.clientOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Request origin is missing or not allowed.' });
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
