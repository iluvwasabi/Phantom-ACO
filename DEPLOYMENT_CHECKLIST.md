# Deployment Checklist

Use this checklist to ensure your ACO Service is production-ready.

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] All environment variables set in `.env`
- [ ] `NODE_ENV` set to `production`
- [ ] Strong encryption key generated (use `npm run generate-keys`)
- [ ] Strong session secret generated
- [ ] Production domain configured in `APP_URL`
- [ ] Discord OAuth callback URL updated with production domain
- [ ] Discord Server ID verified

### 2. Discord OAuth Configuration

- [ ] Discord Application OAuth2 redirects include production URL
- [ ] Discord Client ID and Secret configured in production .env
- [ ] Discord Server ID verified
- [ ] OAuth scopes configured (`identify`, `email`, `guilds`)

### 3. Google Forms

- [ ] Both forms created (Login Required, No Login)
- [ ] Form URLs configured in `.env`
- [ ] Entry IDs extracted and configured
- [ ] Forms tested with prefill
- [ ] Response collection working
- [ ] Google Sheets linked to forms
- [ ] Form permissions set (public access for authenticated users)

### 4. Database

- [ ] Database initialized (`npm run init-db`)
- [ ] Database backup strategy in place
- [ ] Database location secured (proper permissions)
- [ ] Migration plan for data (if needed)

### 5. Security

- [ ] All secrets removed from code
- [ ] `.env` file in `.gitignore`
- [ ] HTTPS enabled (SSL certificate)
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Session security configured
- [ ] Helmet middleware active
- [ ] Input validation in place

### 6. Testing

- [ ] User can login with Discord
- [ ] Server verification works
- [ ] Dashboard loads correctly
- [ ] Service selection works
- [ ] Forms open with prefilled data
- [ ] Form submissions link to Discord users
- [ ] Logout works correctly
- [ ] Mobile responsive design tested

### 7. Performance

- [ ] Static assets optimized
- [ ] Database indexes created
- [ ] Session store configured (SQLite)
- [ ] Proper caching headers set
- [ ] Compression enabled (gzip)

## Deployment Steps

### Option A: VPS Deployment (Ubuntu/Debian)

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools (for native modules)
sudo apt-get install -y build-essential

# Install Git
sudo apt-get install -y git
```

#### 2. Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone your-repo-url aco-service
cd aco-service

# Install dependencies
npm install --production

# Create .env file
sudo nano .env
# Paste your production environment variables

# Initialize database
npm run init-db

# Test run
npm start
```

#### 3. Process Management with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start web server only (no Discord bot needed)
pm2 start src/server.js --name "aco-web"

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
# Follow the command it gives you

# Monitor
pm2 status
pm2 logs
```

#### 4. Nginx Setup

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/aco-service
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/aco-service /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 5. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### 6. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Option B: Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npm run init-db

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

## Post-Deployment

### 1. Verify Everything Works

- [ ] Visit your domain in browser
- [ ] Test login flow
- [ ] Test service subscription
- [ ] Test form submission
- [ ] Check server logs for errors

### 2. Monitoring Setup

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs aco-web

# System resources
htop
```

### 3. Backup Strategy

```bash
# Create backup script
nano /home/user/backup-aco.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/aco-service/data/aco.db $BACKUP_DIR/aco_$DATE.db

# Backup .env
cp /var/www/aco-service/.env $BACKUP_DIR/env_$DATE.backup

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /home/user/backup-aco.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:
```
0 2 * * * /home/user/backup-aco.sh
```

### 4. Update Discord Settings

- [ ] Update Discord OAuth redirect URIs with production URL
- [ ] Update Discord Application settings with production domain

### 5. Documentation for Team

- [ ] Document production URLs
- [ ] Document login credentials (securely)
- [ ] Document backup procedures
- [ ] Document update procedures
- [ ] Create incident response plan

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Check PM2 status
- [ ] Review error logs
- [ ] Monitor form submissions

**Weekly:**
- [ ] Review server resources
- [ ] Check for failed logins
- [ ] Verify backups exist

**Monthly:**
- [ ] Update Node.js dependencies
- [ ] Review security updates
- [ ] Clean old session data
- [ ] Archive old form submissions

### Updating the Application

```bash
# Stop services
pm2 stop all

# Backup current version
cd /var/www
sudo cp -r aco-service aco-service-backup

# Pull updates
cd aco-service
sudo git pull

# Install new dependencies
npm install --production

# Restart services
pm2 restart all

# Check logs
pm2 logs
```

### Rollback Procedure

```bash
# Stop services
pm2 stop all

# Restore backup
cd /var/www
sudo rm -rf aco-service
sudo cp -r aco-service-backup aco-service

# Restart
cd aco-service
pm2 restart all
```

## Troubleshooting

### Service Won't Start

1. Check logs: `pm2 logs`
2. Verify .env file exists and is correct
3. Check database exists: `ls -l data/`
4. Verify Node.js version: `node -v`
5. Check port availability: `sudo netstat -tulpn | grep 3000`

### High Memory Usage

1. Check PM2 status: `pm2 monit`
2. Restart services: `pm2 restart all`
3. Clear old sessions: `rm data/sessions.db` (service will recreate)

### Database Issues

1. Stop services: `pm2 stop all`
2. Backup database: `cp data/aco.db data/aco.db.backup`
3. Reinitialize if corrupted: `npm run init-db`
4. Restart: `pm2 restart all`

## Security Incident Response

If you suspect a security breach:

1. **Immediately:**
   - [ ] Stop all services: `pm2 stop all`
   - [ ] Backup database: `cp data/aco.db data/aco.db.incident`
   - [ ] Review logs: `pm2 logs --lines 1000`

2. **Investigate:**
   - [ ] Check for unauthorized access in logs
   - [ ] Review recent database changes
   - [ ] Check for suspicious form submissions

3. **Remediate:**
   - [ ] Change all secrets (Discord tokens, encryption keys)
   - [ ] Update Discord OAuth secrets
   - [ ] Regenerate session secrets
   - [ ] Update .env with new values

4. **Communicate:**
   - [ ] Notify users via Discord
   - [ ] Recommend users change passwords if credentials were affected

5. **Restart:**
   - [ ] Start services with new secrets
   - [ ] Monitor closely for 24 hours

## Performance Optimization

### If experiencing slow performance:

1. **Database optimization:**
   ```bash
   # Vacuum database
   sqlite3 data/aco.db "VACUUM;"
   ```

2. **Session cleanup:**
   ```bash
   # Remove old sessions
   sqlite3 data/sessions.db "DELETE FROM sessions WHERE expired < datetime('now');"
   ```

3. **Nginx caching:**
   Add to Nginx config:
   ```nginx
   location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

4. **Enable gzip:**
   In Nginx config:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

## Success Criteria

Your deployment is successful when:

- [ ] Users can access the site via HTTPS
- [ ] Discord login works smoothly
- [ ] All services are accessible
- [ ] Forms submit successfully
- [ ] No errors in logs
- [ ] SSL certificate is valid
- [ ] Backups are running
- [ ] Monitoring is active

## Rollout Strategy

For production launch:

1. **Soft Launch:**
   - Invite 5-10 trusted users
   - Monitor for issues
   - Gather feedback

2. **Limited Launch:**
   - Open to 50-100 users
   - Monitor performance
   - Fix any issues

3. **Full Launch:**
   - Announce in Discord
   - Monitor closely first 24 hours
   - Be ready for scaling

Congratulations on deploying ACO Service! 🎉
