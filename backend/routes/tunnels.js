import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tunnelOps, logOps } from '../models/database.js';
import { tunnelValidation, idValidation } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/security.js';
import { createTunnel, closeTunnel, isTunnelActive } from '../utils/tunnel-manager.js';

const router = express.Router();

/**
 * Create a new tunnel
 * POST /api/tunnels
 */
router.post('/', tunnelValidation, asyncHandler(async (req, res) => {
  const { port, subdomain, authProfileId } = req.body;

  const tunnelId = uuidv4();

  // Create tunnel record in database
  tunnelOps.create(tunnelId, port, subdomain || null, authProfileId || null);

  // Start the actual tunnel
  const tunnel = await createTunnel(tunnelId, port, subdomain, authProfileId);

  res.status(201).json({
    success: true,
    tunnel: tunnel
  });
}));

/**
 * Get all active tunnels
 * GET /api/tunnels
 */
router.get('/', asyncHandler(async (req, res) => {
  const tunnels = tunnelOps.getActive();

  // Enhance with real-time status
  const enhancedTunnels = tunnels.map(tunnel => ({
    ...tunnel,
    isRunning: isTunnelActive(tunnel.id)
  }));

  res.json({
    success: true,
    tunnels: enhancedTunnels
  });
}));

/**
 * Get a specific tunnel
 * GET /api/tunnels/:id
 */
router.get('/:id', idValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tunnel = tunnelOps.get(id);

  if (!tunnel) {
    return res.status(404).json({
      success: false,
      error: 'Tunnel not found'
    });
  }

  res.json({
    success: true,
    tunnel: {
      ...tunnel,
      isRunning: isTunnelActive(tunnel.id)
    }
  });
}));

/**
 * Close a tunnel
 * DELETE /api/tunnels/:id
 */
router.delete('/:id', idValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tunnel = tunnelOps.get(id);
  if (!tunnel) {
    return res.status(404).json({
      success: false,
      error: 'Tunnel not found'
    });
  }

  await closeTunnel(id);

  res.json({
    success: true,
    message: 'Tunnel closed successfully'
  });
}));

/**
 * Get logs for a tunnel
 * GET /api/tunnels/:id/logs
 */
router.get('/:id/logs', idValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const tunnel = tunnelOps.get(id);
  if (!tunnel) {
    return res.status(404).json({
      success: false,
      error: 'Tunnel not found'
    });
  }

  const logs = logOps.getForTunnel(id, limit);

  res.json({
    success: true,
    logs: logs
  });
}));

export default router;
