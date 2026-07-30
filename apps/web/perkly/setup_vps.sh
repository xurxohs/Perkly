#!/ :1: b:1: a:1: s:1: h:1: 
2: 
3: # === Perky VPS Setup Script (Eskiz.uz) ===
4: # This script installs Node.js, Nginx, PM2, and configures everything for perkly.uz
5: 
6: set -e
7: 
8: echo "--- Updating system ---"
9: apt update && apt upgrade -y
10: 
11: echo "--- Installing Node.js 20 ---"
12: curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
13: apt install -y nodejs
14: 
15: echo "--- Installing Nginx and PM2 ---"
16: apt install -y nginx
17: npm install -g pm2
18: 
19: echo "--- Configuring Nginx ---"
20: cat > /etc/nginx/sites-available/perkly <<EOF
21: server {
22:     listen 80;
23:     server_name perkly.uz www.perkly.uz;
24: 
25:     # Backend API
26:     location /api/ {
27:         proxy_pass http://localhost:3001/;
28:         proxy_http_version 1.1;
29:         proxy_set_header Upgrade \$http_upgrade;
30:         proxy_set_header Connection 'upgrade';
31:         proxy_set_header Host \$host;
32:         proxy_cache_bypass \$http_upgrade;
33:         proxy_set_header X-Real-IP \$remote_addr;
34:         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
35:         proxy_set_header X-Forwarded-Proto \$scheme;
36:     }
37: 
38:     # Frontend (Next.js)
39:     location / {
40:         proxy_pass http://localhost:3000;
41:         proxy_http_version 1.1;
42:         proxy_set_header Upgrade \$http_upgrade;
43:         proxy_set_header Connection 'upgrade';
44:         proxy_set_header Host \$host;
45:         proxy_cache_bypass \$http_upgrade;
46:         proxy_set_header X-Real-IP \$remote_addr;
47:         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
48:         proxy_set_header X-Forwarded-Proto \$scheme;
49:     }
50: }
51: EOF
52: 
53: ln -sf /etc/nginx/sites-available/perkly /etc/nginx/sites-enabled/
54: rm -f /etc/nginx/sites-enabled/default
55: nginx -t
56: systemctl restart nginx
57: 
58: echo "--- Setup complete! ---"
59: echo "Next steps (run from your app folder):"
60: echo "1. scp your code to the server"
61: echo "2. cd backend && npm install && npm run build && pm2 start dist/src/main.js --name perkly-backend"
62: echo "3. cd ../frontend && npm install && npm run build && pm2 start npm --name perkly-frontend -- start"
63: echo "4. Optional: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d perkly.uz -d www.perkly.uz"
