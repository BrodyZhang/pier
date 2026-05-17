import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.redirect('/auth/login');
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session.role !== 'admin') {
    res.status(403).send('Forbidden');
    return;
  }
  next();
}

export function requireDevApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.DEV_API_KEY;
  if (!expectedKey) {
    res.status(500).json({ error: 'DEV_API_KEY not configured' });
    return;
  }
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
