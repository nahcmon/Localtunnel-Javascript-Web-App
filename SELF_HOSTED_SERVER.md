# Self-Hosted Localtunnel Server Guide

This guide explains how to run your own localtunnel server to avoid the limitations of the public localtunnel.me service (random passwords, rate limits, reliability issues).

## Why Self-Host?

✅ **Benefits:**
- No random password protection
- Better reliability and uptime
- Full control over subdomains
- No rate limiting
- Custom domain names
- Better performance (closer to you)
- Privacy - traffic doesn't go through third-party servers

❌ **Drawbacks:**
- Requires a server with public IP
- Need to manage SSL certificates
- Responsible for uptime and maintenance
- Requires domain name (optional but recommended)

## Quick Start (Docker - Recommended)

### Prerequisites
- Docker and Docker Compose installed
- A domain name (optional, can use IP)
- Port 80 and 443 open on your server

### 1. Create docker-compose.yml

```yaml
version: '3'
services:
  localtunnel:
    image: defunctzombie/localtunnel-server
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DOMAIN=tunnel.yourdomain.com
    restart: unless-stopped
```

### 2. Start the Server

```bash
docker-compose up -d
```

### 3. Configure Your App

Update `.env`:
```bash
LOCALTUNNEL_HOST=https://tunnel.yourdomain.com
```

Restart your app:
```bash
npm start
```

Done! Your tunnels will now use your own server.

## Manual Installation

### Prerequisites
- Node.js 18+ installed
- A server with public IP address
- Domain name pointing to your server

### 1. Install localtunnel-server

```bash
npm install -g localtunnel-server
```

### 2. Basic Start

```bash
lt-server --port 8080
```

Test it:
```bash
# On your local machine
lt --host http://your-server-ip:8080 --port 3000
```

### 3. Production Setup with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start lt-server -- --port 8080

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Add SSL with nginx

Create `/etc/nginx/sites-available/localtunnel`:

```nginx
server {
    listen 80;
    server_name tunnel.yourdomain.com *.tunnel.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/localtunnel /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5. Add SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get wildcard certificate
sudo certbot --nginx -d tunnel.yourdomain.com -d *.tunnel.yourdomain.com
```

## Advanced Configuration

### Custom Port Range

```bash
lt-server --port 8080 --min-port 10000 --max-port 20000
```

### Environment Variables

Create `.env` for the server:
```bash
PORT=8080
DOMAIN=tunnel.yourdomain.com
MIN_PORT=10000
MAX_PORT=20000
```

Start with:
```bash
lt-server
```

### Systemd Service

Create `/etc/systemd/system/localtunnel.service`:

```ini
[Unit]
Description=Localtunnel Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/localtunnel
Environment="PORT=8080"
Environment="DOMAIN=tunnel.yourdomain.com"
ExecStart=/usr/bin/node /usr/local/bin/lt-server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable localtunnel
systemctl start localtunnel
systemctl status localtunnel
```

## Cloud Deployment

### DigitalOcean

1. Create a Droplet (Ubuntu 22.04, $6/month)
2. Point your domain to the droplet's IP
3. SSH into the droplet
4. Run the Docker setup above

### AWS EC2

1. Launch t2.micro instance (free tier eligible)
2. Open ports 80, 443 in Security Group
3. Point domain to instance IP
4. Follow manual installation steps

### Google Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: localtunnel
spec:
  template:
    spec:
      containers:
      - image: defunctzombie/localtunnel-server
        ports:
        - containerPort: 8080
        env:
        - name: DOMAIN
          value: tunnel.yourdomain.com
```

Deploy:
```bash
gcloud run services replace cloudrun.yaml
```

### Fly.io (Easy & Free)

Create `fly.toml`:
```toml
app = "my-localtunnel"
primary_region = "iad"

[http_service]
  internal_port = 8080
  force_https = true

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

Deploy:
```bash
fly launch
fly deploy
```

## DNS Configuration

For wildcard subdomains to work, you need:

```
A     tunnel.yourdomain.com    → your-server-ip
A     *.tunnel.yourdomain.com  → your-server-ip
```

Or with Cloudflare:
1. Add A record: `tunnel` → `your-server-ip`
2. Add A record: `*` → `your-server-ip`
3. Enable "Proxied" (orange cloud) for DDoS protection

## Testing Your Server

### 1. Test Server is Running

```bash
curl http://tunnel.yourdomain.com
```

Should return localtunnel server info.

### 2. Test Tunnel Creation

```bash
# On your local machine
lt --host https://tunnel.yourdomain.com --port 3000
```

### 3. Test in Your App

Update `.env`:
```bash
LOCALTUNNEL_HOST=https://tunnel.yourdomain.com
```

Create a tunnel through the web UI and verify it uses your domain.

## Monitoring & Maintenance

### Health Check

```bash
# Check if server is responding
curl -f https://tunnel.yourdomain.com/health || echo "Server down!"
```

### View Logs

```bash
# Docker
docker-compose logs -f

# PM2
pm2 logs lt-server

# Systemd
journalctl -u localtunnel -f
```

### Monitor Resources

```bash
# Check memory and CPU
docker stats

# Or for native install
htop
```

### Backup Configuration

```bash
# Backup your configuration files
tar -czf localtunnel-backup.tar.gz \
  /etc/nginx/sites-available/localtunnel \
  /etc/systemd/system/localtunnel.service \
  .env
```

## Troubleshooting

### Tunnels Not Working

1. Check server is running:
   ```bash
   curl https://tunnel.yourdomain.com
   ```

2. Check ports are open:
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

3. Check logs for errors:
   ```bash
   pm2 logs
   # or
   docker-compose logs
   ```

### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### DNS Not Resolving

```bash
# Test DNS resolution
dig tunnel.yourdomain.com
dig random-subdomain.tunnel.yourdomain.com

# Should both point to your server IP
```

### High Memory Usage

Localtunnel server can use significant memory with many active tunnels. Consider:

1. Upgrade server RAM
2. Set max tunnels limit
3. Add memory monitoring and auto-restart

## Security Considerations

### 1. Rate Limiting

Add to nginx config:
```nginx
limit_req_zone $binary_remote_addr zone=tunnel:10m rate=10r/s;

server {
    location / {
        limit_req zone=tunnel burst=20;
        # ... rest of config
    }
}
```

### 2. Firewall Rules

```bash
# Only allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 3. Fail2ban

Protect against brute force:
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade

# Update Node.js packages
npm update -g
```

## Cost Estimates

| Provider | Monthly Cost | Notes |
|----------|-------------|-------|
| DigitalOcean | $6 | Basic Droplet |
| AWS EC2 | $0-10 | Free tier or t2.micro |
| Google Cloud | $5-10 | f1-micro |
| Fly.io | $0-5 | Free tier available |
| Cloudflare Pages | $0 | With Workers |

## Comparison: Self-Hosted vs Public

| Feature | Self-Hosted | localtunnel.me |
|---------|------------|----------------|
| Cost | $5-10/month | Free |
| Setup | Medium effort | Zero setup |
| Reliability | You control | Variable |
| Passwords | None | Random |
| Custom domains | Yes | No |
| Privacy | Full | Shared service |
| Speed | Depends on location | Variable |
| Rate limits | Your choice | Yes |

## Recommended Setup

For most users, we recommend:

1. **Development**: Use public localtunnel.me (despite issues)
2. **Team/Demo**: Self-host on DigitalOcean ($6/month)
3. **Production**: Use Cloudflare Tunnel or ngrok paid

## Getting Help

- Localtunnel Server GitHub: https://github.com/localtunnel/server
- Community Support: https://github.com/localtunnel/localtunnel/discussions
- Your Server Issues: Check server logs first!

## Next Steps

After setting up your self-hosted server:

1. Configure your LocalTunnel Web App to use it (update `.env`)
2. Test tunnel creation and stability
3. Set up monitoring and alerts
4. Configure automatic SSL renewal
5. Add backup and disaster recovery

Your self-hosted tunnel server is now ready to use! All tunnels created through your LocalTunnel Web App will now use your own infrastructure.
