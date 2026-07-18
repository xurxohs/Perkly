FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID=$NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S perkly && adduser -S perkly -G perkly
COPY --from=build --chown=perkly:perkly /app/node_modules ./node_modules
COPY --from=build --chown=perkly:perkly /app/.next ./.next
COPY --from=build --chown=perkly:perkly /app/public ./public
COPY --from=build --chown=perkly:perkly /app/package.json ./package.json
USER perkly
EXPOSE 3000
CMD ["npm", "start"]
