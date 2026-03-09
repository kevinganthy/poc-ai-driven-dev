import { Router, Request, Response } from 'express';
import * as categoryService from '../services/category.service';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await categoryService.getAll();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
