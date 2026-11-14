import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app: Application = express();

// Security & Utility Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Nexus-V API is active' });
});

// Global Error Handler
// Note: The 4 parameters (err, req, res, next) are strictly required by Express. 
// Do not remove `next` even if your linter complains it is unused.
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

export default app;