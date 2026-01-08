import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';

// Routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import eventRoutes from './routes/events.js';
import actionRoutes from './routes/actions.js';
import responsibilityRoutes from './routes/responsibilities.js';
import gamificationRoutes from './routes/gamification.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/uploads.js';
import workAreaRoutes from './routes/workAreas.js';
import teamRoutes from './routes/teams.js';
import playbookRoutes from './routes/playbook.js';
import calendarRoutes from './routes/calendar.js';
// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/responsibilities', responsibilityRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/work-areas', workAreaRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/playbook', playbookRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   Leadership Assistant API Server                         ║
  ║   Running on http://localhost:${PORT}                       ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export { prisma };

