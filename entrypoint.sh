#!/bin/sh
set -e

# Create required directories
mkdir -p /var/www/html /app/data/agents

# If Let's Encrypt certs exist, configure SSL
if [ -f "/etc/letsencrypt/live/ailaopo.online/fullchain.pem" ]; then
    # Copy the static nginx config (already has SSL configured)
    cp /etc/nginx/http.d/default.conf /etc/nginx/http.d/default.conf
else
    # Use a simple HTTP-only config (for initial cert setup)
    cat > /etc/nginx/http.d/default.conf << 'EOF'
server {
    listen 80;
    server_name ailaopo.online www.ailaopo.online;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
fi

# Start Node.js app in background
node dist/server.js &

# Start nginx in foreground
exec nginx -g "daemon off;"
