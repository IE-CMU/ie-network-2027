FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10

# Copy package manifests first to leverage layer cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Copy source and build
COPY . .

RUN pnpm run build 
# RUN pnpm exec astro --version && pnpm exec astro build

# --- Runtime stage ---
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts=false

# Copy built SSR server from builder
COPY --from=builder /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
