import localtunnel from 'localtunnel';
import { tunnelOps, logOps, authProfileOps, statsOps } from '../models/database.js';

// Store active tunnel instances
const activeTunnels = new Map();

// Store paused tunnel configurations for resuming
const pausedTunnels = new Map();

/**
 * Create and start a new tunnel
 */
export async function createTunnel(tunnelId, port, subdomain = null, authProfileId = null) {
  try {
    // Log tunnel creation attempt
    logOps.create(tunnelId, 'creating', `Attempting to create tunnel on port ${port}`);

    // Configure tunnel options
    const options = {
      port: port,
    };

    if (subdomain) {
      options.subdomain = subdomain;
    }

    // Start the localtunnel
    const tunnel = await localtunnel(options);

    // Store tunnel instance
    activeTunnels.set(tunnelId, tunnel);

    // Update tunnel URL in database
    tunnelOps.updateUrl(tunnelId, tunnel.url);

    // Update auth profile last used time
    if (authProfileId) {
      authProfileOps.updateLastUsed(authProfileId);
    }

    // Log successful creation
    logOps.create(tunnelId, 'created', `Tunnel created successfully: ${tunnel.url}`);

    // Initialize stats for this tunnel
    statsOps.create(tunnelId);
    statsOps.incrementConnections(tunnelId);

    // Handle tunnel close event
    tunnel.on('close', () => {
      handleTunnelClose(tunnelId);
    });

    // Handle tunnel errors
    tunnel.on('error', (err) => {
      logOps.create(tunnelId, 'error', `Tunnel error: ${err.message}`);
      handleTunnelClose(tunnelId);
    });

    return {
      id: tunnelId,
      url: tunnel.url,
      port: port,
      subdomain: subdomain,
      authProfileId: authProfileId,
      status: 'active'
    };
  } catch (error) {
    logOps.create(tunnelId, 'error', `Failed to create tunnel: ${error.message}`);
    tunnelOps.updateStatus(tunnelId, 'error');
    throw error;
  }
}

/**
 * Close an active tunnel
 */
export async function closeTunnel(tunnelId) {
  const tunnel = activeTunnels.get(tunnelId);

  console.log(`[CLOSE] Attempting to close tunnel ${tunnelId}, exists: ${!!tunnel}`);

  if (!tunnel) {
    console.log(`[CLOSE] Tunnel ${tunnelId} not found in active tunnels`);
    throw new Error('Tunnel not found or already closed');
  }

  try {
    // Close the tunnel
    console.log(`[CLOSE] Calling tunnel.close() for ${tunnelId}`);
    tunnel.close();

    // Remove from active tunnels
    activeTunnels.delete(tunnelId);
    console.log(`[CLOSE] Removed ${tunnelId} from active tunnels. Remaining: ${activeTunnels.size}`);

    // Update database
    tunnelOps.updateStatus(tunnelId, 'closed');

    // Log closure
    logOps.create(tunnelId, 'closed', 'Tunnel closed by user');

    console.log(`[CLOSE] Successfully closed tunnel ${tunnelId}`);
    return { success: true };
  } catch (error) {
    console.error(`[CLOSE] Error closing tunnel ${tunnelId}:`, error);
    logOps.create(tunnelId, 'error', `Error closing tunnel: ${error.message}`);
    throw error;
  }
}

/**
 * Pause a tunnel temporarily
 */
export async function pauseTunnel(tunnelId) {
  const tunnel = activeTunnels.get(tunnelId);

  console.log(`[PAUSE] Attempting to pause tunnel ${tunnelId}, exists: ${!!tunnel}`);

  if (!tunnel) {
    console.log(`[PAUSE] Tunnel ${tunnelId} not found in active tunnels`);
    throw new Error('Tunnel not found or already paused');
  }

  try {
    // Store tunnel configuration for resuming
    const tunnelData = tunnelOps.get(tunnelId);
    pausedTunnels.set(tunnelId, {
      port: tunnelData.port,
      subdomain: tunnelData.subdomain,
      authProfileId: tunnelData.auth_profile_id
    });
    console.log(`[PAUSE] Stored config for ${tunnelId}:`, pausedTunnels.get(tunnelId));

    // Close the localtunnel connection
    console.log(`[PAUSE] Calling tunnel.close() for ${tunnelId}`);
    tunnel.close();

    // Remove from active tunnels
    activeTunnels.delete(tunnelId);
    console.log(`[PAUSE] Removed ${tunnelId} from active tunnels. Remaining: ${activeTunnels.size}`);

    // Update database status
    tunnelOps.updateStatus(tunnelId, 'paused');

    // Log pause
    logOps.create(tunnelId, 'paused', 'Tunnel paused by user');

    console.log(`[PAUSE] Successfully paused tunnel ${tunnelId}`);
    return { success: true };
  } catch (error) {
    console.error(`[PAUSE] Error pausing tunnel ${tunnelId}:`, error);
    logOps.create(tunnelId, 'error', `Error pausing tunnel: ${error.message}`);
    throw error;
  }
}

/**
 * Resume a paused tunnel
 */
export async function resumeTunnel(tunnelId) {
  const config = pausedTunnels.get(tunnelId);

  if (!config) {
    throw new Error('Tunnel configuration not found. Cannot resume.');
  }

  try {
    // Log resume attempt
    logOps.create(tunnelId, 'resuming', `Attempting to resume tunnel on port ${config.port}`);

    // Configure tunnel options
    const options = {
      port: config.port,
    };

    if (config.subdomain) {
      options.subdomain = config.subdomain;
    }

    // Start the localtunnel
    const tunnel = await localtunnel(options);

    // Store tunnel instance
    activeTunnels.set(tunnelId, tunnel);

    // Update tunnel URL in database (may be different after resume)
    tunnelOps.updateUrl(tunnelId, tunnel.url);
    tunnelOps.updateStatus(tunnelId, 'active');

    // Update stats
    statsOps.incrementConnections(tunnelId);

    // Log successful resume
    logOps.create(tunnelId, 'resumed', `Tunnel resumed successfully: ${tunnel.url}`);

    // Handle tunnel events
    tunnel.on('close', () => {
      handleTunnelClose(tunnelId);
    });

    tunnel.on('error', (err) => {
      logOps.create(tunnelId, 'error', `Tunnel error: ${err.message}`);
      handleTunnelClose(tunnelId);
    });

    // Remove from paused tunnels
    pausedTunnels.delete(tunnelId);

    return {
      id: tunnelId,
      url: tunnel.url,
      port: config.port,
      subdomain: config.subdomain,
      status: 'active'
    };
  } catch (error) {
    logOps.create(tunnelId, 'error', `Failed to resume tunnel: ${error.message}`);
    tunnelOps.updateStatus(tunnelId, 'error');
    throw error;
  }
}

/**
 * Handle tunnel close event
 */
function handleTunnelClose(tunnelId) {
  activeTunnels.delete(tunnelId);
  tunnelOps.updateStatus(tunnelId, 'closed');
  logOps.create(tunnelId, 'closed', 'Tunnel closed');
}

/**
 * Get all active tunnels
 */
export function getActiveTunnels() {
  return Array.from(activeTunnels.keys());
}

/**
 * Check if a tunnel is active
 */
export function isTunnelActive(tunnelId) {
  return activeTunnels.has(tunnelId);
}

/**
 * Close all active tunnels (cleanup on server shutdown)
 */
export function closeAllTunnels() {
  for (const [tunnelId, tunnel] of activeTunnels.entries()) {
    try {
      tunnel.close();
      tunnelOps.updateStatus(tunnelId, 'closed');
      logOps.create(tunnelId, 'closed', 'Tunnel closed due to server shutdown');
    } catch (error) {
      console.error(`Error closing tunnel ${tunnelId}:`, error);
    }
  }
  activeTunnels.clear();
}
