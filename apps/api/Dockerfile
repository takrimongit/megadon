# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /repo

# Copy root + workspace manifests for cache-friendly install
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN npm install --include-workspace-root --workspaces

# Copy source
COPY packages/types packages/types
COPY apps/api apps/api

# Build types first (api imports compiled JS at runtime), then API.
RUN npm run build -w @megadon/types && \
    npm run build -w @megadon/api

# ---- runtime stage ----
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app

COPY --from=build /repo/node_modules /app/node_modules
COPY --from=build /repo/packages/types /app/packages/types
COPY --from=build /repo/apps/api/dist /app/dist
COPY --from=build /repo/apps/api/package.json /app/package.json

ENV NODE_ENV=production
EXPOSE 8080
USER nonroot

CMD ["dist/server.js"]
