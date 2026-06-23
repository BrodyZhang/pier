import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message, err.stack);

  if (err instanceof AppError) {
    if (req.path.startsWith('/api/')) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
    } else {
      res.status(err.statusCode).send(err.message);
    }
    return;
  }

  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message;

  if (req.path.startsWith('/api/')) {
    res.status(statusCode).json({ error: message });
  } else {
    res.status(statusCode).send(message);
  }
}
