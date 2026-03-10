import { Router, Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';

const router = Router();

// Public — active categories only (used by CategorySelect, CategoryFilter)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await categoryService.getAll();
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin — all categories including soft-deleted
router.get('/all', authenticate, authorize('admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await categoryService.getAllIncludingDeleted();
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin — create category
router.post('/', authenticate, authorize('admin'), validate(createCategorySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json(category);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' });
  }
});

// Admin — update category
router.put('/:id', authenticate, authorize('admin'), validate(updateCategorySchema), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' });
    return;
  }
  try {
    const category = await categoryService.update(id, req.body);
    res.json(category);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' });
  }
});

// Admin — soft delete category
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' });
    return;
  }
  try {
    await categoryService.remove(id);
    res.status(204).send();
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' });
  }
});

// Admin — restore soft-deleted category
router.post('/:id/restore', authenticate, authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' });
    return;
  }
  try {
    const category = await categoryService.restore(id);
    res.json(category);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' });
  }
});

export default router;
