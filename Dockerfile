# Build & run the whole app (server serves the built client).
# Used for Cloud deployment (Render / Railway / VPS) and local `docker compose up`.
# For day-to-day development use `pnpm dev` natively — it is much faster to iterate.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── dependency layer (cache-friendly) ──────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile=false

# ── build layer ─────────────────────────────────────────────────────────────
FROM deps AS build
COPY packages ./packages
# Build shared (needed by server at runtime via tsc)
RUN pnpm --filter @arcade/shared build 2>/dev/null || true
# Build client (Vite → dist/)
RUN pnpm --filter @arcade/client build

# ── slim runtime image ──────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

# Only copy what the server actually needs at runtime:
#  • workspace manifests (pnpm needs them to resolve the monorepo)
#  • shared package (server imports it)
#  • server source + its node_modules
#  • built client dist (served as static files)
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/server ./packages/server
COPY --from=build /app/packages/client/dist ./packages/client/dist
# Production node_modules only
RUN pnpm install --prod --frozen-lockfile=false

EXPOSE 3000
CMD ["pnpm", "--filter", "@arcade/server", "start"]
