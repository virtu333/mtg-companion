#!/usr/bin/env bash
set -e

# Bundle serverless functions (inlines workspace dependencies)
npx esbuild api/cards/resolve.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/cards/resolve.js
rm api/cards/resolve.ts
npx esbuild api/health.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/health.js
rm api/health.ts

# Build frontend
pnpm turbo build --filter=@mtg-companion/web
