#!/usr/bin/env bash
set -e

# Bundle serverless functions (inlines workspace dependencies)
# Use --allow-overwrite to replace .ts source with bundled output in-place
# Vercel pre-indexes function files before build, so they must still exist after
pnpm exec esbuild api/cards/resolve.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/cards/resolve.ts --allow-overwrite
pnpm exec esbuild api/health.ts --bundle --platform=node --target=node18 --format=esm --outfile=api/health.ts --allow-overwrite

# Build frontend
pnpm turbo build --filter=@mtg-companion/web
