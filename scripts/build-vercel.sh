#!/usr/bin/env bash
set -e

# Bundle serverless functions (inlines workspace dependencies)
# Use pnpm exec to resolve esbuild from node_modules
pnpm exec esbuild api/cards/resolve.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/cards/resolve.js
rm api/cards/resolve.ts
pnpm exec esbuild api/health.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/health.js
rm api/health.ts

# Build frontend
pnpm turbo build --filter=@mtg-companion/web
