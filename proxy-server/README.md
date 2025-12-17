# FatSecret Proxy Server (Static IP Version)

This is a Node.js proxy server that you deploy on a VPS (DigitalOcean, AWS EC2, etc.) with a static IP address. This solves the Supabase Edge Function IP restriction problem.

## Why This Exists

Supabase Edge Functions don't have static IP addresses, so FatSecret can't whitelist them. This proxy server:
- ✅ Runs on a VPS with a static IP
- ✅ Can be whitelisted in FatSecret
- ✅ Proxies requests from Supabase Edge Functions to FatSecret
- ✅ Handles OAuth token management

## Architecture

```
Mobile App → Supabase Edge Function → Your Proxy Server (Static IP) → FatSecret API
```

## Quick Setup (DigitalOcean)

### 1. Create Droplet

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Create → Droplet
3. Choose:
   - **Image**: Ubuntu 22.04
   - **Plan**: Basic $6/month
   - **Region**: Choose closest to you
   - **Authentication**: SSH keys (recommended) or password
4. Click **Create Droplet**

### 2. Get Your Static IP

After creation, you'll see your droplet's IP address (e.g., `157.230.123.45`). **This is your static IP!**

### 3. Deploy the Proxy

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Then run:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Clone or upload this directory
# (You can use scp or git to transfer files)

# Navigate to proxy directory
cd proxy-server

# Install dependencies
npm install

# Create .env file
nano .env
```

Add to `.env`:
```
FATSECRET_CLIENT_ID=your_client_id
FATSECRET_CLIENT_SECRET=your_client_secret
FATSECRET_SCOPE=premier
PORT=3000
```

Save and exit (Ctrl+X, then Y, then Enter)

### 4. Run with PM2 (Keeps it running)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
pm2 start server.js --name fatsecret-proxy

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

### 5. Configure Firewall

```bash
# Allow port 3000
sudo ufw allow 3000/tcp
sudo ufw enable
```

### 6. Whitelist IP in FatSecret

1. Go to FatSecret Developer Portal
2. API Keys → Your Key → IP Restrictions
3. Add: `YOUR_DROPLET_IP/32` (e.g., `157.230.123.45/32`)
4. Save

### 7. Update Supabase Edge Function

Modify `supabase/functions/fatsecret-proxy/index.ts` to call your proxy instead of FatSecret directly:

```typescript
// Instead of calling FatSecret directly, call your proxy
const response = await fetch(`http://YOUR_DROPLET_IP:3000/search`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: searchQuery,
    limit: limit,
    offset: offset,
  }),
});
```

Or better: Use your domain name if you set one up:
```typescript
const response = await fetch(`https://fatsecret-proxy.yourdomain.com/search`, {
  // ...
});
```

## Using a Domain Name (Optional)

### Set up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/fatsecret-proxy
```

Add:
```nginx
server {
    listen 80;
    server_name fatsecret-proxy.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fatsecret-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL with Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fatsecret-proxy.yourdomain.com
```

## Testing

Test your proxy:
```bash
curl -X POST http://YOUR_DROPLET_IP:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query":"chicken","limit":5}'
```

Should return FatSecret search results!

## Monitoring

```bash
# View logs
pm2 logs fatsecret-proxy

# View status
pm2 status

# Restart
pm2 restart fatsecret-proxy
```

## Security Notes

1. ✅ **Use HTTPS** in production (set up SSL with Let's Encrypt)
2. ✅ **Add authentication** to your proxy (API key, JWT, etc.)
3. ✅ **Use firewall** to restrict access
4. ✅ **Keep Node.js updated**
5. ✅ **Monitor logs** for suspicious activity

## Cost

- **DigitalOcean Droplet**: $6/month
- **Domain name**: $10-15/year (optional)
- **Total**: ~$7/month

## Alternative: Keep Supabase Edge Function

If you want to keep using Supabase Edge Functions:

1. **Contact FatSecret support** - Ask if they can:
   - Remove IP restrictions for your API key
   - Use OAuth 2.0 authentication only
   - Allow dynamic IPs for serverless functions

2. **Use the proxy server** (this solution) - More reliable, has static IP

## Troubleshooting

**Proxy not responding:**
- Check if PM2 is running: `pm2 status`
- Check logs: `pm2 logs fatsecret-proxy`
- Check firewall: `sudo ufw status`

**FatSecret API errors:**
- Verify credentials in `.env`
- Check IP is whitelisted in FatSecret
- Wait 10 minutes after adding IP (propagation delay)

**Connection refused:**
- Verify port 3000 is open: `sudo ufw allow 3000`
- Check server is running: `pm2 status`
- Check server logs: `pm2 logs`

