import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authProfileOps } from '../models/database.js';
import { authProfileValidation, idValidation } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/security.js';

const router = express.Router();

/**
 * Create a new auth profile
 * POST /api/auth-profiles
 */
router.post('/', authProfileValidation, asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;

  const id = uuidv4();
  const profile = await authProfileOps.create(id, name, username, password);

  res.status(201).json({
    success: true,
    profile: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      created_at: profile.created_at
    }
  });
}));

/**
 * Get all auth profiles
 * GET /api/auth-profiles
 */
router.get('/', asyncHandler(async (req, res) => {
  const profiles = authProfileOps.getAll();

  res.json({
    success: true,
    profiles: profiles
  });
}));

/**
 * Get a specific auth profile
 * GET /api/auth-profiles/:id
 */
router.get('/:id', idValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = authProfileOps.get(id);

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'Auth profile not found'
    });
  }

  res.json({
    success: true,
    profile: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      created_at: profile.created_at,
      last_used: profile.last_used
    }
  });
}));

/**
 * Delete an auth profile
 * DELETE /api/auth-profiles/:id
 */
router.delete('/:id', idValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = authProfileOps.delete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Auth profile not found'
    });
  }

  res.json({
    success: true,
    message: 'Auth profile deleted successfully'
  });
}));

export default router;
