FROM node:20-alpine AS builder
WORKDIR /app
COPY app/package.json app/tsconfig.json ./
RUN npm install
COPY app/src ./src
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY app/views ./views
COPY app/public ./public
COPY app/package.json ./
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
