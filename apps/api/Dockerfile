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
# Debian slim (not distroless) so we can apt-install a real ffmpeg — the video
# intro/outro composer shells out to it, and a bundled static binary is not
# guaranteed to run in a distroless image.
FROM node:20-bookworm-slim AS runtime
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Copy the entire built workspace (preserves workspace symlinks + locations).
COPY --from=build /workspace /workspace

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
EXPOSE 8080
USER node

# Run from the api workspace so Node walks up:
#   /workspace/apps/api/node_modules → /workspace/node_modules
WORKDIR /workspace/apps/api
CMD ["node", "dist/server.js"]
