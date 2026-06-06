# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /workspace

# Copy manifests for cache-friendly install
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/

# Install all workspace deps (npm 10 handles this hoisting).
RUN npm install --include-workspace-root --workspaces

# Copy source + build both packages.
COPY packages/types packages/types
COPY apps/api apps/api
RUN npm run build -w @megadon/types && \
    npm run build -w @megadon/api

# Drop dev-only stuff to shrink the runtime image.
RUN npm prune --omit=dev --include-workspace-root --workspaces

# ---- runtime stage ----
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /workspace

# Copy the entire built workspace (preserves workspace symlinks + locations).
COPY --from=build /workspace /workspace

ENV NODE_ENV=production
EXPOSE 8080
USER nonroot

# Run from the api workspace so Node walks up:
#   /workspace/apps/api/node_modules → /workspace/node_modules
WORKDIR /workspace/apps/api
CMD ["dist/server.js"]
