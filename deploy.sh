#!/bin/bash

echo "=== 生成自签名SSL证书 ==="
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=MySite/CN=your-domain.com"

echo "=== 构建Docker镜像 ==="
docker build -t my-website .

echo "=== 启动容器 ==="
docker-compose up -d

echo "=== 部署完成 ==="
echo "访问 https://你的服务器IP 或域名"