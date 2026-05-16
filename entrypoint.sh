#!/bin/sh

if [ -f "/etc/letsencrypt/live/ailaopo.online/fullchain.pem" ]; then
    exec nginx -g "daemon off;"
else
    # Generate self-signed cert for initial startup
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/server.key \
        -out /etc/nginx/ssl/server.crt \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=MySite/CN=localhost"

    # Use non-SSL config
    sed -i 's/listen 443 ssl;/listen 443;/' /etc/nginx/conf.d/default.conf
    sed -i '/ssl_certificate/d' /etc/nginx/conf.d/default.conf
    exec nginx -g "daemon off;"
fi