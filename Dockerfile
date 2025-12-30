# Multi-stage build to keep runtime image small
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

FROM base AS deps
COPY package*.json ./
# Install all dependencies including devDependencies for build
RUN npm ci --include=dev

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY drizzle.config.ts ./drizzle.config.ts
COPY drizzle ./drizzle
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 5000
CMD ["node", "dist/index.js"]
