FROM node:20-alpine AS builder
WORKDIR /app
COPY app/package.json app/tsconfig.json ./
RUN npm install
COPY app/src ./src
RUN npx tsc

FROM node:20-alpine
RUN apk add --no-cache nginx
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY app/views ./views
COPY app/package.json ./
COPY nginx/nginx.conf /etc/nginx/http.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
