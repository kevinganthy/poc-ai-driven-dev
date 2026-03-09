import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createTicketSchema, updateTicketSchema } from '../validators/ticket.validator';
import * as ticketService from '../services/ticket.service';
import { AuthUser } from '../types/express';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await ticketService.getAll(
      req.user as AuthUser,
      req.query.status as string | undefined,
      req.query.categories as string | undefined
    );
    res.json(tickets);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.getOne(String(req.params.id), req.user as AuthUser);
    res.json(ticket);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
  }
});

router.post('/', validate(createTicketSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.create(req.body, req.user as AuthUser);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
  }
});

router.put('/:id', validate(updateTicketSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.update(String(req.params.id), req.body, req.user as AuthUser);
    res.json(ticket);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await ticketService.remove(String(req.params.id), req.user as AuthUser);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
  }
});

export default router;
