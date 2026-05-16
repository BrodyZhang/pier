FROM nginx:alpine

RUN apk add --no-cache certbot

RUN mkdir -p /etc/nginx/ssl /etc/letsencrypt

COPY src/index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["sh", "-c", "nginx && sleep infinity"]