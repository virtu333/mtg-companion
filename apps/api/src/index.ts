import express from 'express';
import cors from 'cors';
import cardsRouter from './routes/cards.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/cards', cardsRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
