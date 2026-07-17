FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat && addgroup -S perkly && adduser -S perkly -G perkly
COPY --from=build --chown=perkly:perkly /app/node_modules ./node_modules
COPY --from=build --chown=perkly:perkly /app/dist ./dist
COPY --from=build --chown=perkly:perkly /app/prisma ./prisma
RUN mkdir -p uploads && chown perkly:perkly uploads
USER perkly
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
