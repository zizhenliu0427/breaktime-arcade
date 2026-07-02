# Build & run the whole app (server serves the built client).
# Used for Cloud deployment (Render / Railway / VPS) and local `docker compose up`.
# For day-to-day development use `pnpm dev` natively — it is much faster to iterate.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile=false
COPY packages ./packages
RUN pnpm --filter @arcade/client build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@arcade/server", "start"]
