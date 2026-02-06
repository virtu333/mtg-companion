import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cardsRouter from './routes/cards.js';

const app: Express = express();

app.use(helmet());
app.use(morgan('dev'));

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }));
app.use(express.json({ limit: '50kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/cards', cardsRouter);

export default app;
