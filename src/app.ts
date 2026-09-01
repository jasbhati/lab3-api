import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { tasksRouter } from './routes/tasks.js';

export const app = express();

app.use(requestLogger);
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/tasks', tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);