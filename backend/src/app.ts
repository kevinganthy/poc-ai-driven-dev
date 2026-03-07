import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/tickets', ticketsRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`Backend running on port ${env.PORT}`);
  });
}

export default app;
