import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import { helmetConfig, apiLimiter, sanitizeInput, errorHandler } from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import tunnelRoutes from './routes/tunnels.js';

// Import utilities
import { closeAllTunnels } from './utils/tunnel-manager.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmetConfig);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:' + PORT,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// Rate limiting for API routes
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth-profiles', authRoutes);
app.use('/api/tunnels', tunnelRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Catch-all route to serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🚇 LocalTunnel Web App - Secure Port Tunneling       ║
║                                                           ║
║     Server running on: http://localhost:${PORT}           ║
║                                                           ║
║     Features:                                             ║
║     ✓ Secure tunnel creation                              ║
║     ✓ Authentication profiles                             ║
║     ✓ Rate limiting & input validation                    ║
║     ✓ Comprehensive logging                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');

  // Close all active tunnels
  closeAllTunnels();

  // Close server
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
