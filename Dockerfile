FROM nginx:alpine

RUN apk add --no-cache openssl

COPY src/index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]