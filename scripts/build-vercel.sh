#!/usr/bin/env bash
set -e

# Bundle serverless functions (inlines workspace dependencies)
# Use --allow-overwrite to replace .ts source with bundled output in-place
# Vercel pre-indexes function files before build, so they must still exist after

ESBUILD_OPTS="--bundle --platform=node --target=node18 --format=esm --allow-overwrite"

pnpm exec esbuild api/cards/resolve.ts $ESBUILD_OPTS --outfile=api/cards/resolve.ts
pnpm exec esbuild api/health.ts $ESBUILD_OPTS --outfile=api/health.ts
pnpm exec esbuild api/decks/index.ts $ESBUILD_OPTS --outfile=api/decks/index.ts
pnpm exec esbuild "api/decks/[id].ts" $ESBUILD_OPTS --outfile="api/decks/[id].ts"
pnpm exec esbuild api/decisions/index.ts $ESBUILD_OPTS --outfile=api/decisions/index.ts
pnpm exec esbuild api/decisions/clear.ts $ESBUILD_OPTS --outfile=api/decisions/clear.ts
pnpm exec esbuild api/migrate.ts $ESBUILD_OPTS --outfile=api/migrate.ts

# Build frontend
pnpm turbo build --filter=@mtg-companion/web
