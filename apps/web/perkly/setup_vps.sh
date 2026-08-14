#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a Debian/Ubuntu VPS for Perkly's existing PM2 deployment.
# The application itself is deployed from the repository root with deploy.sh.

if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this script as root (or with sudo)." >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "--- Updating system ---"
apt-get update
apt-get upgrade -y

echo "--- Installing Node.js 20 ---"
apt-get install -y ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "--- Installing Nginx and PM2 ---"
apt-get install -y nginx
npm install --global pm2

echo "--- Configuring Nginx ---"
cat > /etc/nginx/sites-available/perkly <<'NGINX_CONFIG'
server {
    listen 80;
    server_name perkly.uz www.perkly.uz;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONFIG

ln -sfn /etc/nginx/sites-available/perkly /etc/nginx/sites-enabled/perkly
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "--- Setup complete ---"
echo "Next steps:"
echo "1. Place the repository at /var/www/perkly."
echo "2. Configure backend/.env."
echo "3. Run deploy.sh from your workstation; it keeps the existing PM2 process names perkly-backend and frontend."
echo "4. Enable HTTPS with Certbot, then install nginx/perkly.conf as the production Nginx configuration."
