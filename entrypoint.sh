#!/bin/sh

if [ -f "/etc/letsencrypt/live/ailaopo.online/fullchain.pem" ]; then
    cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name ailaopo.online www.ailaopo.online;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ailaopo.online www.ailaopo.online;

    ssl_certificate /etc/letsencrypt/live/ailaopo.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ailaopo.online/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}
EOF
fi

exec nginx -g "daemon off;"