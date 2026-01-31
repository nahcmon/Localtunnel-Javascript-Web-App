# LocalTunnel Web App

A secure, user-friendly web application for exposing local ports to the internet using [localtunnel](https://localtunnel.me). Perfect for testing webhooks, sharing local development servers, and temporary public access to local services.

## Features

- **Easy Port Tunneling**: Expose any local port to the internet with a single click
- **Custom Subdomains**: Request custom subdomains for your tunnels (subject to availability)
- **Authentication Profiles**: Create reusable authentication profiles to protect your tunnels
- **Secure by Design**: Built with security best practices including:
  - Password hashing with bcrypt (12 rounds)
  - Rate limiting to prevent abuse
  - Input validation and sanitization
  - Security headers (Helmet.js)
  - HTTPS-only tunnels (provided by localtunnel)
  - Protection against XSS, CSRF, and injection attacks
- **Real-time Monitoring**: Track active tunnels with live status updates
- **Modern UI**: Beautiful, intuitive interface with dark theme
- **Persistent Storage**: SQLite database for tunnel history and auth profiles
- **Comprehensive Logging**: Track tunnel events for debugging

## Security Features

This application implements multiple layers of security:

### Backend Security
- **Bcrypt Password Hashing**: All passwords are hashed with 12 rounds
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All user inputs are validated using express-validator
- **Input Sanitization**: Protection against null bytes and control characters
- **Helmet.js**: Security headers including CSP, HSTS, X-XSS-Protection
- **Body Size Limits**: Prevents DoS attacks via large payloads
- **Secure Session Management**: HttpOnly cookies support (ready for JWT implementation)

### Frontend Security
- **XSS Prevention**: All user-generated content is escaped before rendering
- **Content Security Policy**: Strict CSP headers to prevent unauthorized scripts
- **HTTPS Only**: All tunnels use HTTPS by default (provided by localtunnel)

### Database Security
- **WAL Mode**: Better concurrency and crash recovery
- **Prepared Statements**: Protection against SQL injection
- **Foreign Key Constraints**: Data integrity enforcement

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd Localtunnel-Javascript-Web-App
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file and set your configuration:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

**IMPORTANT**: Change the `JWT_SECRET` and `SESSION_SECRET` to strong random values in production!

5. Start the application:
```bash
npm start
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## Usage

### Creating an Auth Profile

1. Navigate to the "Auth Profiles" tab
2. Fill in the form:
   - **Profile Name**: Unique identifier for this profile (letters, numbers, hyphens, underscores)
   - **Username**: Username for HTTP basic authentication
   - **Password**: Strong password (min 8 characters, must include uppercase, lowercase, and number)
3. Click "Create Profile"

The profile will be saved and can be reused across multiple tunnels.

### Creating a Tunnel

1. Navigate to the "Tunnels" tab
2. Fill in the form:
   - **Local Port**: The port number on your local machine (e.g., 3000)
   - **Custom Subdomain** (Optional): Request a specific subdomain (e.g., "my-app")
   - **Authentication Profile** (Optional): Select a saved profile to protect the tunnel
3. Click "Create Tunnel"

The tunnel will be created and the public URL will be displayed. You can:
- Click the URL to open it in a new tab
- Click "Copy" to copy the URL to clipboard
- Click "Close Tunnel" to terminate the tunnel

### Managing Tunnels

- **View Active Tunnels**: See all currently active tunnels with their status
- **Auto-Refresh**: Tunnel list automatically refreshes every 10 seconds
- **Manual Refresh**: Click the "Refresh" button to update immediately
- **Close Tunnel**: Click "Close Tunnel" to terminate any active tunnel

## API Documentation

### Auth Profiles

#### Create Auth Profile
```http
POST /api/auth-profiles
Content-Type: application/json

{
  "name": "my-profile",
  "username": "admin",
  "password": "SecurePass123"
}
```

#### Get All Auth Profiles
```http
GET /api/auth-profiles
```

#### Get Specific Auth Profile
```http
GET /api/auth-profiles/:id
```

#### Delete Auth Profile
```http
DELETE /api/auth-profiles/:id
```

### Tunnels

#### Create Tunnel
```http
POST /api/tunnels
Content-Type: application/json

{
  "port": 3000,
  "subdomain": "my-app",
  "authProfileId": "uuid-here"
}
```

#### Get All Active Tunnels
```http
GET /api/tunnels
```

#### Get Specific Tunnel
```http
GET /api/tunnels/:id
```

#### Close Tunnel
```http
DELETE /api/tunnels/:id
```

#### Get Tunnel Logs
```http
GET /api/tunnels/:id/logs?limit=50
```

#### Health Check
```http
GET /api/health
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `JWT_SECRET` | (required) | Secret for JWT signing |
| `SESSION_SECRET` | (required) | Secret for session management |
| `DB_PATH` | ./data/tunnels.db | SQLite database path |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `MAX_TUNNELS_PER_USER` | 5 | Max concurrent tunnels |

## Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (SPA)                │
│  - HTML/CSS/JavaScript                  │
│  - Real-time UI updates                 │
│  - Input validation                     │
└──────────────┬──────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│         Express.js Server               │
│  ┌────────────────────────────────────┐ │
│  │  Security Middleware               │ │
│  │  - Helmet, Rate Limiting           │ │
│  │  - Input Sanitization              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  API Routes                        │ │
│  │  - /api/tunnels                    │ │
│  │  - /api/auth-profiles              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Tunnel Manager                    │ │
│  │  - Localtunnel integration         │ │
│  │  - Tunnel lifecycle management     │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Database (SQLite)                 │ │
│  │  - Auth profiles                   │ │
│  │  - Tunnel records                  │ │
│  │  - Event logs                      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
               │
               ▼
        Localtunnel Server
          (localtunnel.me)
```

## Security Considerations

### Production Deployment

1. **Environment Variables**: Always use strong, random secrets for `JWT_SECRET` and `SESSION_SECRET`
2. **HTTPS**: Deploy behind a reverse proxy (nginx, Caddy) with HTTPS
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **Database Backups**: Regularly backup the SQLite database
5. **Monitoring**: Monitor tunnel usage and logs for suspicious activity
6. **Updates**: Keep dependencies updated to patch security vulnerabilities

### Known Limitations

- **Localtunnel Reliability**: Localtunnel is designed for development/testing, not production use
- **No User Authentication**: The app itself doesn't require login (add if needed for multi-user scenarios)
- **Public URLs**: Anyone with the tunnel URL can access it
- **Tunnel Persistence**: Tunnels are closed when the server restarts
- **⚠️ Authentication Not Yet Implemented**: Auth profiles can be created and stored, but are not yet applied to tunnels. This feature requires implementing a local HTTP proxy that handles basic authentication before forwarding to localtunnel. Currently in development.

### Security Best Practices

1. **Use Authentication**: Always enable authentication for sensitive services
2. **Rotate Passwords**: Regularly update auth profile passwords
3. **Monitor Access**: Check tunnel logs regularly
4. **Limit Exposure**: Only expose services when needed
5. **Use Strong Passwords**: Follow the password requirements (8+ chars, mixed case, numbers)

## Troubleshooting

### Tunnel Creation Fails

**Problem**: Tunnel creation returns an error

**Solutions**:
- Check if the local port is accessible
- Verify the subdomain isn't already in use
- Check network connectivity
- Review server logs for detailed error messages

### Can't Access Tunnel URL

**Problem**: Tunnel URL returns timeout or connection error

**Solutions**:
- Verify the local service is running on the specified port
- Check if authentication is configured correctly
- Ensure no firewall is blocking the localtunnel connection
- Try without custom subdomain

### Database Errors

**Problem**: Database-related errors on startup

**Solutions**:
- Ensure the `data` directory exists and is writable
- Check database file permissions
- Delete the database file to recreate it (will lose data)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Localtunnel](https://localtunnel.me) - The tunneling service that powers this app
- Security best practices from [OWASP](https://owasp.org)
- Node.js security guidelines from the [Node.js Security Working Group](https://nodejs.org/en/security/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Disclaimer

This application is designed for development and testing purposes. While security best practices have been implemented, use caution when exposing local services to the internet. Always use authentication for sensitive services and monitor access logs regularly.
