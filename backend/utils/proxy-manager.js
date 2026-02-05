import httpProxy from 'http-proxy';
import http from 'http';
import { logOps } from '../models/database.js';

// Store active proxy servers
const activeProxies = new Map();

/**
 * Create an HTTP proxy server for a tunnel target
 * This proxy rewrites the Host header to fix "host not allowed" errors
 */
export function createProxyServer(tunnelId, target) {
  // Clean up any existing proxy
  if (activeProxies.has(tunnelId)) {
    closeProxyServer(tunnelId);
  }

  // Parse target to determine if it's a URL or port
  let targetUrl;

  if (typeof target === 'number' || /^\d+$/.test(target)) {
    // It's a port number
    targetUrl = `http://localhost:${target}`;
  } else if (target.startsWith('http://') || target.startsWith('https://')) {
    // It's already a full URL
    targetUrl = target;
  } else if (target.includes(':')) {
    // It's host:port format
    targetUrl = `http://${target}`;
  } else {
    // Assume it's a hostname/URL without protocol
    targetUrl = `http://${target}`;
  }

  console.log(`[PROXY] Creating proxy for tunnel ${tunnelId} -> ${targetUrl}`);

  // Create proxy instance
  const proxy = httpProxy.createProxyServer({
    target: targetUrl,
    changeOrigin: true, // Changes the origin of the host header to the target URL
    xfwd: true, // Add X-Forwarded-* headers
    ws: true, // Enable WebSocket proxying
  });

  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    console.error(`[PROXY] Error for tunnel ${tunnelId}:`, err.message);
    logOps.create(tunnelId, 'error', `Proxy error: ${err.message}`);

    if (res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Proxy Error: Unable to connect to ${targetUrl}\n\n${err.message}`);
    }
  });

  // Handle successful proxying
  proxy.on('proxyReq', (proxyReq, req) => {
    // Log proxied requests (optional, for debugging)
    console.log(`[PROXY] ${tunnelId}: ${req.method} ${req.url} -> ${targetUrl}`);
  });

  // Create HTTP server for the proxy
  const server = http.createServer((req, res) => {
    // Rewrite Host header to match target
    const targetHost = new URL(targetUrl).host;
    req.headers.host = targetHost;

    proxy.web(req, res);
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req, socket, head) => {
    const targetHost = new URL(targetUrl).host;
    req.headers.host = targetHost;

    proxy.ws(req, socket, head);
  });

  // Start server on a random port
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const proxyPort = server.address().port;
      console.log(`[PROXY] Proxy server for ${tunnelId} listening on port ${proxyPort}`);

      activeProxies.set(tunnelId, {
        server,
        proxy,
        port: proxyPort,
        target: targetUrl
      });

      logOps.create(tunnelId, 'info', `Proxy created: localhost:${proxyPort} -> ${targetUrl}`);

      resolve(proxyPort);
    });

    server.on('error', (err) => {
      console.error(`[PROXY] Failed to start proxy for ${tunnelId}:`, err);
      reject(err);
    });
  });
}

/**
 * Close a proxy server
 */
export function closeProxyServer(tunnelId) {
  const proxyInfo = activeProxies.get(tunnelId);

  if (!proxyInfo) {
    console.log(`[PROXY] No proxy found for tunnel ${tunnelId}`);
    return;
  }

  console.log(`[PROXY] Closing proxy for tunnel ${tunnelId}`);

  try {
    // Close the proxy
    proxyInfo.proxy.close();

    // Close the HTTP server
    proxyInfo.server.close();

    // Remove from active proxies
    activeProxies.delete(tunnelId);

    logOps.create(tunnelId, 'info', 'Proxy server closed');
    console.log(`[PROXY] Proxy closed for tunnel ${tunnelId}`);
  } catch (error) {
    console.error(`[PROXY] Error closing proxy for ${tunnelId}:`, error);
  }
}

/**
 * Close all proxy servers
 */
export function closeAllProxies() {
  console.log(`[PROXY] Closing all ${activeProxies.size} proxy servers`);

  for (const [tunnelId] of activeProxies.entries()) {
    closeProxyServer(tunnelId);
  }
}

/**
 * Get proxy information
 */
export function getProxyInfo(tunnelId) {
  return activeProxies.get(tunnelId);
}
