/**
 * Health Check Routes
 * Simplified version for initial deployment
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @route GET /health
 * @desc Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    message: 'Email Validation API is running'
  });
});

/**
 * @route GET /health/ready
 * @desc Readiness probe
 */
router.get('/ready', (req: Request, res: Response) => {
  res.json({ ready: true });
});

/**
 * @route GET /health/live
 * @desc Liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({ alive: true });
});

export default router;
