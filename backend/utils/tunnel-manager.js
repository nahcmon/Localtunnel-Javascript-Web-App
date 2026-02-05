import localtunnel from 'localtunnel';
import { tunnelOps, logOps, authProfileOps, statsOps } from '../models/database.js';
import { createProxyServer, closeProxyServer, closeAllProxies } from './proxy-manager.js';

// Store active tunnel instances
const activeTunnels = new Map();

// Store paused tunnel configurations for resuming
const pausedTunnels = new Map();

/**
 * Create and start a new tunnel
 */
export async function createTunnel(tunnelId, target, subdomain, authProfileId = null) {
  try {
    // Log tunnel creation attempt
    logOps.create(tunnelId, 'creating', `Attempting to create tunnel for target: ${target}`);

    // Create a proxy server that handles host header rewriting
    console.log(`[TUNNEL] Creating proxy for target: ${target}`);
    const proxyPort = await createProxyServer(tunnelId, target);

    // Configure tunnel options
    const options = {
      port: proxyPort, // Connect localtunnel to our proxy, not the original target
      subdomain: subdomain, // Subdomain is now required
    };

    // Use custom localtunnel server if configured
    const customHost = process.env.LOCALTUNNEL_HOST || process.env.LT_HOST;
    if (customHost) {
      options.host = customHost;
      console.log(`[TUNNEL] Using custom localtunnel host: ${customHost}`);
      logOps.create(tunnelId, 'info', `Using custom host: ${customHost}`);
    } else {
      console.log(`[TUNNEL] Using default localtunnel.me host`);
      logOps.create(tunnelId, 'info', 'Using public localtunnel.me host');
    }

    // Start the localtunnel (connects to our proxy)
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

    // Try to fetch tunnel password (if using loca.lt)
    if (tunnel.url.includes('loca.lt')) {
      try {
        const passwordUrl = 'https://loca.lt/mytunnelpassword';
        console.log(`[TUNNEL] Fetching password from ${passwordUrl}`);

        const response = await fetch(passwordUrl);
        if (response.ok) {
          const password = await response.text();
          if (password && password.trim()) {
            console.log(`[TUNNEL] Password for ${tunnel.url}: ${password}`);
            logOps.create(tunnelId, 'password', `Tunnel password: ${password.trim()}`);
          } else {
            logOps.create(tunnelId, 'info', 'No password required for this tunnel');
          }
        }
      } catch (err) {
        console.log(`[TUNNEL] Could not fetch password: ${err.message}`);
        logOps.create(tunnelId, 'info', 'Could not auto-fetch password. If prompted, visit https://loca.lt/mytunnelpassword');
      }
    }

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
      target: target,
      subdomain: subdomain,
      authProfileId: authProfileId,
      status: 'active'
    };
  } catch (error) {
    logOps.create(tunnelId, 'error', `Failed to create tunnel: ${error.message}`);
    tunnelOps.updateStatus(tunnelId, 'error');
    // Clean up proxy if tunnel creation failed
    closeProxyServer(tunnelId);
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

    // Close the proxy server
    closeProxyServer(tunnelId);

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
      target: tunnelData.target,
      subdomain: tunnelData.subdomain,
      authProfileId: tunnelData.auth_profile_id
    });
    console.log(`[PAUSE] Stored config for ${tunnelId}:`, pausedTunnels.get(tunnelId));

    // Close the localtunnel connection
    console.log(`[PAUSE] Calling tunnel.close() for ${tunnelId}`);
    tunnel.close();

    // Close the proxy server
    closeProxyServer(tunnelId);

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
    logOps.create(tunnelId, 'resuming', `Attempting to resume tunnel for target: ${config.target}`);

    // Create a proxy server for the target
    const proxyPort = await createProxyServer(tunnelId, config.target);

    // Configure tunnel options
    const options = {
      port: proxyPort,
      subdomain: config.subdomain,
    };

    // Use custom localtunnel server if configured
    const customHost = process.env.LOCALTUNNEL_HOST || process.env.LT_HOST;
    if (customHost) {
      options.host = customHost;
      console.log(`[RESUME] Using custom localtunnel host: ${customHost}`);
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

    // Try to fetch tunnel password (if using loca.lt)
    if (tunnel.url.includes('loca.lt')) {
      try {
        const passwordUrl = 'https://loca.lt/mytunnelpassword';
        const response = await fetch(passwordUrl);
        if (response.ok) {
          const password = await response.text();
          if (password && password.trim()) {
            console.log(`[RESUME] Password for ${tunnel.url}: ${password}`);
            logOps.create(tunnelId, 'password', `Tunnel password: ${password.trim()}`);
          }
        }
      } catch (err) {
        console.log(`[RESUME] Could not fetch password: ${err.message}`);
      }
    }

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
      target: config.target,
      subdomain: config.subdomain,
      status: 'active'
    };
  } catch (error) {
    logOps.create(tunnelId, 'error', `Failed to resume tunnel: ${error.message}`);
    tunnelOps.updateStatus(tunnelId, 'error');
    // Clean up proxy if resume failed
    closeProxyServer(tunnelId);
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
      closeProxyServer(tunnelId);
      tunnelOps.updateStatus(tunnelId, 'closed');
      logOps.create(tunnelId, 'closed', 'Tunnel closed due to server shutdown');
    } catch (error) {
      console.error(`Error closing tunnel ${tunnelId}:`, error);
    }
  }
  activeTunnels.clear();
  closeAllProxies();
}
