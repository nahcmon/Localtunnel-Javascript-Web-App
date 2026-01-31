# Troubleshooting Guide

## "This host is not allowed" Error

### The Problem

When you tunnel to a local development server (Vite, Create React App, Next.js, etc.), you may see:

```
Blocked request. This host ("your-tunnel.loca.lt") is not allowed.
To allow this host, add "your-tunnel.loca.lt" to `server.allowedHosts` in vite.config.js.
```

or similar errors like:
```
Invalid Host header
```

### Why This Happens

Modern development servers check the `Host` HTTP header for security reasons. When a request comes through a tunnel:

1. Browser requests: `https://your-tunnel.loca.lt/`
2. Tunnel forwards to: `http://localhost:3000/`
3. Dev server sees Host header: `your-tunnel.loca.lt`
4. Dev server expects: `localhost:3000`
5. ❌ **Request rejected!**

### Solutions by Framework

#### Vite (Vue, React, Svelte, etc.)

**Option 1: Allow All Hosts (Development Only)**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    allowedHosts: 'all' // Allow all hosts (Vite 5+)
  }
})
```

**Option 2: Allow Specific Pattern**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      '.loca.lt', // Allow all loca.lt subdomains
      '.localhost.run',
      '.ngrok.io'
    ]
  }
})
```

**Option 3: Disable Host Check (Less Secure)**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 443 // For HTTPS tunnels
    },
    strictPort: false,
    allowedHosts: 'all'
  }
})
```

#### Create React App (Webpack Dev Server)

**Option 1: Environment Variable**
```bash
# .env.local
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

**Option 2: Webpack Configuration**
```javascript
// config-overrides.js (with react-app-rewired)
module.exports = {
  devServer: {
    allowedHosts: 'all'
  }
}
```

**Option 3: Package.json Script**
```json
{
  "scripts": {
    "start": "DANGEROUSLY_DISABLE_HOST_CHECK=true react-scripts start"
  }
}
```

#### Next.js

**Option 1: Allow All (next.config.js)**
```javascript
// next.config.js
module.exports = {
  experimental: {
    allowedHosts: 'all'
  }
}
```

**Option 2: Disable Host Check**
```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.devServer = {
        ...config.devServer,
        allowedHosts: 'all'
      }
    }
    return config
  }
}
```

**Option 3: Environment Variable**
```bash
# Start with:
npx next dev --hostname 0.0.0.0
```

#### Vue CLI

```javascript
// vue.config.js
module.exports = {
  devServer: {
    allowedHosts: 'all'
  }
}
```

#### Nuxt.js

```javascript
// nuxt.config.js
export default {
  devServer: {
    host: '0.0.0.0',
    allowedHosts: 'all'
  }
}
```

#### Angular

```json
// angular.json
{
  "projects": {
    "your-app": {
      "architect": {
        "serve": {
          "options": {
            "host": "0.0.0.0",
            "disableHostCheck": true
          }
        }
      }
    }
  }
}
```

#### SvelteKit

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: {
    adapter: adapter(),
    vite: {
      server: {
        allowedHosts: 'all'
      }
    }
  }
};
```

#### Express.js (No Framework)

If you're running a plain Express app, this error shouldn't occur unless you have middleware that checks the host. If you do:

```javascript
// app.js
app.use((req, res, next) => {
  // Remove or modify host checking middleware
  next();
});
```

#### Django

```python
# settings.py
ALLOWED_HOSTS = ['*']  # For development only!
```

#### Flask

Flask doesn't typically have this issue, but if using a proxy:

```python
# app.py
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

#### Rails

```ruby
# config/environments/development.rb
config.hosts.clear  # Allow all hosts
# OR
config.hosts << /.*\.loca\.lt/  # Allow loca.lt domains
```

### Universal Solution: nginx Reverse Proxy

If you can't modify your dev server config, use nginx:

```nginx
# nginx.conf
server {
    listen 8080;
    server_name localhost;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Then tunnel to port 8080 instead of 3000.

### Quick Fix Script

Create this script in your project root:

```bash
#!/bin/bash
# tunnel-fix.sh

# Detect framework and suggest fix
if [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
    echo "Detected: Vite"
    echo "Add to vite.config.js:"
    echo "  server: { allowedHosts: 'all' }"
elif [ -f "package.json" ] && grep -q "react-scripts" package.json; then
    echo "Detected: Create React App"
    echo "Set environment variable:"
    echo "  DANGEROUSLY_DISABLE_HOST_CHECK=true"
elif [ -f "next.config.js" ]; then
    echo "Detected: Next.js"
    echo "Add to next.config.js:"
    echo "  experimental: { allowedHosts: 'all' }"
elif [ -f "vue.config.js" ]; then
    echo "Detected: Vue CLI"
    echo "Add to vue.config.js:"
    echo "  devServer: { allowedHosts: 'all' }"
else
    echo "Framework not detected. Check TROUBLESHOOTING.md"
fi
```

Make it executable:
```bash
chmod +x tunnel-fix.sh
./tunnel-fix.sh
```

### Security Warning

**⚠️ NEVER deploy to production with `allowedHosts: 'all'` or disabled host checking!**

These settings are **ONLY** safe for local development. For production, use proper reverse proxy configuration with specific allowed hosts.

### Recommended Approach

1. **Development**: Use `allowedHosts: 'all'` or framework-specific solution
2. **Testing**: Use specific domain patterns (`.loca.lt`, `.ngrok.io`)
3. **Production**: Use proper reverse proxy with restricted hosts

### Environment-Specific Configuration

```javascript
// vite.config.js
export default defineConfig({
  server: {
    allowedHosts: process.env.NODE_ENV === 'development' ? 'all' : [
      'yourdomain.com',
      'www.yourdomain.com'
    ]
  }
})
```

### Testing If It Worked

1. Start your dev server with the fix
2. Create a tunnel pointing to your dev server port
3. Open the tunnel URL in your browser
4. You should see your app instead of the error!

### Alternative: Use Different Tunneling Service

Some services handle host headers better:
- **ngrok**: Automatically handles host headers
- **Cloudflare Tunnel**: Works seamlessly with most frameworks
- **Tailscale Funnel**: No host header issues

### Still Having Issues?

1. Check your framework's specific documentation
2. Look for proxy or webpack configuration
3. Try running the dev server on `0.0.0.0` instead of `localhost`
4. Check for custom middleware that validates hosts
5. Test with a simple static file server to isolate the issue

---

## Other Common Issues

### Tunnel Password Required

See [LOCALTUNNEL_KNOWN_ISSUES.md](./LOCALTUNNEL_KNOWN_ISSUES.md) for information about localtunnel's random password protection.

### Tunnel Not Closing

Localtunnel servers may take 10-30 seconds to actually close a tunnel after calling `close()`. Check the server console logs for `[CLOSE]` messages to confirm the close was called.

### Port Already in Use

```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### Database Locked

```bash
# Close all connections to SQLite database
pkill -9 node
rm data/*.db-wal data/*.db-shm
```

### Cannot Connect to Local Server

Make sure your local app is running:
```bash
# Check if something is listening on the port
netstat -an | grep LISTEN | grep 3000

# Or on macOS:
lsof -i :3000
```
