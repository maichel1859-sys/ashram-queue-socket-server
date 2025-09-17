# Production Deployment Guide

## Environment Variables for Production

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=7077
HOST=0.0.0.0

# CORS Configuration (MUST be your production domain)
CORS_ORIGIN=https://yourdomain.com

# Socket.IO Configuration
SOCKET_PATH=/socket.io

# Main Application URL (MUST be your production domain)
APP_URL=https://yourdomain.com

# Logging (use warn or error in production)
LOG_LEVEL=warn

# Socket.IO Admin Authentication (REQUIRED for production)
ADMIN_AUTH=true
ADMIN_MODE=production
ADMIN_USERNAME=your_secure_admin_username
ADMIN_PASSWORD=your_very_secure_password
```

### Security Checklist

- [ ] **Never commit `.env` files** to version control
- [ ] **Use strong passwords** for admin authentication
- [ ] **Restrict CORS origins** to only your production domains
- [ ] **Use HTTPS** in production
- [ ] **Set proper firewall rules** to limit access to port 7077
- [ ] **Monitor logs** for suspicious activity
- [ ] **Regularly rotate** admin credentials

### Production Server Setup

#### 1. Create Production Environment File

```bash
# Create production .env file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

#### 2. Install PM2 for Process Management

```bash
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name "ashram-queue" --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 3. Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:7077;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Socket.IO specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
    
    location /admin {
        proxy_pass http://127.0.0.1:7077;
        proxy_set_header Host $host;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:7077;
        proxy_set_header Host $host;
    }
}
```

### Monitoring and Health Checks

#### Health Check Endpoint
```bash
curl https://yourdomain.com/health
```

#### Socket.IO Admin Dashboard
- **URL**: `https://yourdomain.com/admin`
- **Username**: Your `ADMIN_USERNAME`
- **Password**: Your `ADMIN_PASSWORD`

### Performance Tuning

#### Node.js Optimizations
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection logging
export NODE_OPTIONS="--trace-gc"
```

#### System Optimizations
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize TCP settings
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

### Backup and Recovery

#### Environment Backup
```bash
# Backup environment files
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup
```

#### Process Recovery
```bash
# Restart PM2 processes
pm2 restart all

# Check status
pm2 status
pm2 logs ashram-queue
```

### Troubleshooting

#### Common Issues

1. **Admin UI Not Loading**
   - Check `ADMIN_AUTH=true`
   - Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set
   - Check firewall rules

2. **CORS Errors**
   - Verify `CORS_ORIGIN` matches your frontend domain exactly
   - Check for trailing slashes

3. **Connection Issues**
   - Verify port 7077 is open
   - Check Nginx configuration
   - Verify SSL certificates

#### Debug Commands
```bash
# Check server status
curl http://localhost:7077/health

# Monitor logs
pm2 logs ashram-queue --lines 100

# Check system resources
htop
nethogs
```

### Security Best Practices

1. **Network Security**
   - Use firewall to restrict access to port 7077
   - Consider VPN access for admin functions
   - Monitor access logs

2. **Authentication**
   - Use strong, unique passwords
   - Consider implementing rate limiting
   - Log all admin access attempts

3. **Monitoring**
   - Set up log monitoring
   - Monitor connection patterns
   - Set up alerts for unusual activity

### SSL/TLS Configuration

#### Let's Encrypt (Free SSL)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Load Balancing (Optional)

For high-traffic applications, consider using multiple instances:

```bash
# Start multiple instances
pm2 start dist/index.js --name "ashram-queue-1" --env production
pm2 start dist/index.js --name "ashram-queue-2" --env production
pm2 start dist/index.js --name "ashram-queue-3" --env production

# Load balance with Nginx
upstream socket_backend {
    server 127.0.0.1:7077;
    server 127.0.0.1:7078;
    server 127.0.0.1:7079;
}
```
