import { Request, Response, NextFunction } from 'express';

type Role = 'user' | 'admin';

export function authorize(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
