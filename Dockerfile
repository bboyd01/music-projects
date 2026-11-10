# syntax=docker/dockerfile:1

# ── Build ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Native modules (better-sqlite3, sharp, argon2) ship prebuilt binaries for
# linux x64/arm64, so install scripts — and a compiler toolchain — aren't needed.
RUN npm ci --ignore-scripts
COPY . .
RUN npx svelte-kit sync && npm run build && npm prune --omit=dev --ignore-scripts

# ── Runtime ──────────────────────────────────────────────
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    MIGRATIONS_DIR=/app/drizzle \
    BODY_SIZE_LIMIT=600M
WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./

RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build"]
