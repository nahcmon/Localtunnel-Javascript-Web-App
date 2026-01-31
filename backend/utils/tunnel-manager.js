import localtunnel from 'localtunnel';
import { tunnelOps, logOps, authProfileOps } from '../models/database.js';

// Store active tunnel instances
const activeTunnels = new Map();

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

  if (!tunnel) {
    throw new Error('Tunnel not found or already closed');
  }

  try {
    // Close the tunnel
    tunnel.close();

    // Remove from active tunnels
    activeTunnels.delete(tunnelId);

    // Update database
    tunnelOps.updateStatus(tunnelId, 'closed');

    // Log closure
    logOps.create(tunnelId, 'closed', 'Tunnel closed by user');

    return { success: true };
  } catch (error) {
    logOps.create(tunnelId, 'error', `Error closing tunnel: ${error.message}`);
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
